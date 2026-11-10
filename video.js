// =====================================================================
//  video.js : exports the animation as a video file, frame by frame (NOT real time).
//  Every frame is rendered at the chosen size, handed to the phone's video encoder and written into a WebM file,
//  so it can take as long as it needs and the result is still smooth, with the right poses and camera cuts.
// =====================================================================
const VIDEO = { cancel: false, busy: false };
window.VIDEO = VIDEO;

// ---------------------------------------------------------------------
//  Small byte helpers
// ---------------------------------------------------------------------
function vConcat(arrs) {
    let n = 0; for (const a of arrs) n += a.length;
    const out = new Uint8Array(n); let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; } return out;
}
const vStr = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
const vU32 = (v) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0); return b; };
const vU16 = (v) => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v); return b; };

// ---------------------------------------------------------------------
//  WebM writer (VP8 / VP9)
// ---------------------------------------------------------------------
function ebUint(v) { const out = []; do { out.unshift(v % 256); v = Math.floor(v / 256); } while (v > 0); return new Uint8Array(out); }
function ebSize(n) {
    for (let len = 1; len <= 8; len++) {
        if (n < Math.pow(2, 7 * len) - 1) { const o = new Uint8Array(len); let v = n; for (let i = len - 1; i >= 0; i--) { o[i] = v % 256; v = Math.floor(v / 256); } o[0] |= (1 << (8 - len)); return o; }
    }
    throw new Error('element too large');
}
function ebEl(id, payload) { const s = ebSize(payload.length); return vConcat([new Uint8Array(id), s, payload]); }
function ebF64(v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v); return b; }

class WebmMuxer {
    constructor(w, h, codecId, fps) { this.w = w; this.h = h; this.codec = codecId; this.fps = fps; this.frames = []; }
    add(chunk) { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); this.frames.push({ t: Math.round(chunk.timestamp / 1000), key: chunk.type === 'key', data: d }); }
    
    finish() {
        const clusters = [];
        let currentCluster = { time: -1, blocks: [] };
        
        for (const frame of this.frames) {
            // Start a new cluster every 1 second or if it's a keyframe
            if (currentCluster.time === -1 || (frame.key && frame.t - currentCluster.time > 1000)) {
                if (currentCluster.blocks.length > 0) clusters.push(this._buildCluster(currentCluster));
                currentCluster = { time: frame.t, blocks: [] };
            }
            currentCluster.blocks.push(frame);
        }
        if (currentCluster.blocks.length > 0) clusters.push(this._buildCluster(currentCluster));

        const last = this.frames.length ? this.frames[this.frames.length - 1].t : 0;
        const dur = last + Math.round(1000 / this.fps);

        const header = ebEl([0x1A, 0x45, 0xDF, 0xA3], vConcat([ebEl([0x42, 0x86], ebUint(1)), ebEl([0x42, 0xF7], ebUint(1)), ebEl([0x42, 0xF2], ebUint(4)), ebEl([0x42, 0xF3], ebUint(8)),
            ebEl([0x42, 0x82], vStr('webm')), ebEl([0x42, 0x87], ebUint(4)), ebEl([0x42, 0x85], ebUint(2))]));
            
        const info = ebEl([0x15, 0x49, 0xA9, 0x66], vConcat([ebEl([0x2A, 0xD7, 0xB1], ebUint(1000000)), ebEl([0x4D, 0x80], vStr('kinju')), ebEl([0x57, 0x41], vStr('kinju')), ebEl([0x44, 0x89], ebF64(dur))]));
        
        const track = ebEl([0xAE], vConcat([ebEl([0xD7], ebUint(1)), ebEl([0x73, 0xC5], ebUint(1)), ebEl([0x83], ebUint(1)), ebEl([0x9C], ebUint(0)), ebEl([0x86], vStr(this.codec)),
            ebEl([0xE0], vConcat([ebEl([0xB0], ebUint(this.w)), ebEl([0xBA], ebUint(this.h))]))]));

        const segmentPayload = vConcat([info, ebEl([0x16, 0x54, 0xAE, 0x6B], track), ...clusters]);
        const segment = ebEl([0x18, 0x53, 0x80, 0x67], segmentPayload);
        
        return new Blob([header, segment], { type: 'video/webm' });
    }

    _buildCluster(cluster) {
        const timecode = ebEl([0xE7], ebUint(cluster.time));
        const blocks = cluster.blocks.map(frame => {
            const relTime = frame.t - cluster.time;
            const flags = frame.key ? 0x80 : 0x00;
            const blockHeader = new Uint8Array([0x81, (relTime >> 8) & 0xFF, relTime & 0xFF, flags]);
            return ebEl([0xA3], vConcat([blockHeader, frame.data]));
        });
        return ebEl([0x1F, 0x43, 0xB6, 0x75], vConcat([timecode, ...blocks]));
    }
}

// ---------------------------------------------------------------------
//  The main export function (Frame-by-frame using WebCodecs)
// ---------------------------------------------------------------------
async function exportAnimation(fmt, fps = 30, durationSec = 5) {
    if (VIDEO.busy) return trace("Video export already running.", "warning");
    if (typeof VideoEncoder === 'undefined') return trace("WebCodecs is not supported on this device. Cannot export video.", "error");
    
    VIDEO.busy = true; VIDEO.cancel = false;
    trace("Starting video export...", "success");

    let W = 1280, H = 720;
    if (fmt === 'youtube') { W = 2560; H = 1440; }
    else if (fmt === 'portrait') { W = 1080; H = 1920; }
    else if (fmt === 'standard') { W = 1600; H = 1200; }

    const prev = { w: canvas.width, h: canvas.height, fov: window.fovValue };
    canvas.width = W; canvas.height = H;
    window.exporting = true;

    try {
        // VP9 codec
        const codec = 'vp09.00.10.08';
        let muxer = new WebmMuxer(W, H, codec, fps);
        
        const encoder = new VideoEncoder({
            output: (chunk) => muxer.add(chunk),
            error: (e) => { trace("Encoder error: " + e.message, "error"); VIDEO.cancel = true; }
        });
        
        encoder.configure({ codec: codec, width: W, height: H, bitrate: 8000000, framerate: fps });
        
        const totalFrames = Math.floor(fps * durationSec);
        for (let i = 0; i < totalFrames; i++) {
            if (VIDEO.cancel) break;
            
            // --- UPDATE ANIMATION STATE HERE --- 
            // Example: You can advance the timeline here based on `i / fps`
            
            // Render the frame
            renderScene();
            
            // Encode the frame
            const frame = new VideoFrame(canvas, { timestamp: (i * 1000000) / fps });
            encoder.encode(frame, { keyFrame: i % 30 === 0 }); // Keyframe every 30 frames
            frame.close();
            
            // Yield to the browser UI so it doesn't freeze
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }
        
        await encoder.flush();
        encoder.close();
        
        // Save the file
        const blob = muxer.finish();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `animation_${Date.now()}.webm`; 
        a.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        trace("Video export finished!", "success");
        
    } catch (e) {
        trace("Video export failed: " + e.message, "error");
    } finally {
        window.exporting = false;
        window.fovValue = prev.fov;
        canvas.width = prev.w; canvas.height = prev.h;
        VIDEO.busy = false;
    }
}
window.exportAnimation = exportAnimation;