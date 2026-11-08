// =====================================================================
//  paint.js : the "detail layer" - a high-resolution paint layer that sits between the skin and its second layer.
//  It uses the same box layout as a skin (64x64 grid) but at 2048x2048, so one Minecraft pixel = 32x32 paint pixels.
//  Tools: pen, airbrush (soft, builds up, good for blush), eraser.
// =====================================================================
const PAINT = {
    size: 2048, canvas: null, ctx: null, tex: null,
    enabled: false, visible: true, hasContent: false,
    tool: 'pen', brushSize: 0.5, opacity: 1, color: '#000000',   // brushSize is in Minecraft pixels
    strokes: [], current: null, last: null, holding: false, dirty: null
};
window.PAINT = PAINT;

function initPaintLayer() {
    if (PAINT.canvas) return;
    let size = 2048;
    try { const mx = gl.getParameter(gl.MAX_TEXTURE_SIZE); if (mx) size = Math.min(2048, Math.max(512, mx)); } catch (e) {}
    PAINT.size = size;
    PAINT.canvas = document.createElement('canvas'); PAINT.canvas.width = size; PAINT.canvas.height = size;
    PAINT.ctx = PAINT.canvas.getContext('2d', { willReadFrequently: true });
    PAINT.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, PAINT.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);   // starts fully transparent
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    trace("Detail layer ready (" + size + "x" + size + ")", "success");
}

// ---------------------------------------------------------------------
//  Which spot of the model is under the finger? (ray against the detail-layer meshes, bent poses included)
// ---------------------------------------------------------------------
function paintPick(clientX, clientY) {
    const ray = screenRay(clientX, clientY); let best = null, bestT = Infinity;
    for (const e of sceneObjects) {
        if (!e.layer3 || !e.layer3.cpu) continue;
        const inv = invert4(entityWorldMatrix(e)); if (!inv) continue;
        const o = mulPoint4(inv, ray.o), d = mulDir4(inv, ray.d), cpu = e.layer3.cpu;
        const spring = (e.bend && window.skinSettings && window.skinSettings.bend === 'spring') ? computeBendMatrix(e) : null;
        const vert = (i) => {
            let p = [cpu.pos[i*3], cpu.pos[i*3+1], cpu.pos[i*3+2]];
            if (spring) { const q = mulPoint4(spring, p), w = cpu.blend[i]; p = [p[0] + (q[0]-p[0])*w, p[1] + (q[1]-p[1])*w, p[2] + (q[2]-p[2])*w]; }
            return p;
        };
        for (let t = 0; t < cpu.idx.length; t += 3) {
            const ia = cpu.idx[t], ib = cpu.idx[t+1], ic = cpu.idx[t+2], A = vert(ia), B = vert(ib), C = vert(ic);
            const e1 = [B[0]-A[0], B[1]-A[1], B[2]-A[2]], e2 = [C[0]-A[0], C[1]-A[1], C[2]-A[2]];
            const pv = [d[1]*e2[2]-d[2]*e2[1], d[2]*e2[0]-d[0]*e2[2], d[0]*e2[1]-d[1]*e2[0]];   // Moller-Trumbore ray / triangle
            const det = e1[0]*pv[0] + e1[1]*pv[1] + e1[2]*pv[2]; if (Math.abs(det) < 1e-12) continue;
            const s = [o[0]-A[0], o[1]-A[1], o[2]-A[2]], u = (s[0]*pv[0] + s[1]*pv[1] + s[2]*pv[2]) / det; if (u < 0 || u > 1) continue;
            const q = [s[1]*e1[2]-s[2]*e1[1], s[2]*e1[0]-s[0]*e1[2], s[0]*e1[1]-s[1]*e1[0]], v = (d[0]*q[0] + d[1]*q[1] + d[2]*q[2]) / det; if (v < 0 || u + v > 1) continue;
            const tt = (e2[0]*q[0] + e2[1]*q[1] + e2[2]*q[2]) / det; if (tt <= 0 || tt >= bestT) continue;
            bestT = tt; const w0 = 1 - u - v;
            const nx = Math.abs(e1[1]*e2[2]-e1[2]*e2[1]), ny = Math.abs(e1[2]*e2[0]-e1[0]*e2[2]), nz = Math.abs(e1[0]*e2[1]-e1[1]*e2[0]);
            let ax; if (nx >= ny && nx >= nz) ax = 'x' + (A[0] >= 0 ? '+' : '-'); else if (ny >= nz) ax = 'y' + (A[1] >= 0 ? '+' : '-'); else ax = 'z' + (A[2] >= 0 ? '+' : '-');
            best = { u: cpu.uvs[ia*2]*w0 + cpu.uvs[ib*2]*u + cpu.uvs[ic*2]*v, v: cpu.uvs[ia*2+1]*w0 + cpu.uvs[ib*2+1]*u + cpu.uvs[ic*2+1]*v, f: e.rigKey + ':' + ax };
        }
    }
    return best;
}

// ---------------------------------------------------------------------
//  Brushes
// ---------------------------------------------------------------------
function rgbaOf(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function markDirty(x, y, r) {
    const x0 = Math.max(0, Math.floor(x - r - 2)), y0 = Math.max(0, Math.floor(y - r - 2)), x1 = Math.min(PAINT.size, Math.ceil(x + r + 2)), y1 = Math.min(PAINT.size, Math.ceil(y + r + 2));
    const d = PAINT.dirty; PAINT.dirty = d ? { x0: Math.min(d.x0, x0), y0: Math.min(d.y0, y0), x1: Math.max(d.x1, x1), y1: Math.max(d.y1, y1) } : { x0: x0, y0: y0, x1: x1, y1: y1 };
}
// draw one step of a stroke: from the previous point (or none) to this one
function drawStep(stroke, p0, p1) {
    const ctx = PAINT.ctx, S = PAINT.size, r = Math.max(0.6, stroke.size * S / 64 / 2);
    const x1 = p1.u * S, y1 = p1.v * S; const connect = p0 && p0.f === p1.f; const x0 = connect ? p0.u * S : x1, y0 = connect ? p0.v * S : y1;
    ctx.save();
    if (stroke.tool === 'airbrush') {
        const R = r * 1.6, flow = Math.max(0.01, stroke.opacity * 0.18), dist = Math.hypot(x1 - x0, y1 - y0), step = Math.max(1, R * 0.25), n = Math.max(1, Math.ceil(dist / step));
        for (let i = 1; i <= n; i++) {
            const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, g = ctx.createRadialGradient(x, y, 0, x, y, R);
            g.addColorStop(0, rgbaOf(stroke.color, flow)); g.addColorStop(1, rgbaOf(stroke.color, 0));
            ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        }
        markDirty((x0 + x1) / 2, (y0 + y1) / 2, R + Math.hypot(x1 - x0, y1 - y0) / 2);
    } else {
        ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        const col = stroke.tool === 'eraser' ? rgbaOf('#000000', stroke.opacity) : rgbaOf(stroke.color, stroke.opacity);
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = r * 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        if (connect) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); } else { ctx.arc(x1, y1, r, 0, Math.PI * 2); ctx.fill(); }
        markDirty((x0 + x1) / 2, (y0 + y1) / 2, r + Math.hypot(x1 - x0, y1 - y0) / 2);
    }
    ctx.restore();
}
function addPaintPoint(hit) {
    const s = PAINT.current; if (!s) return;
    s.pts.push(hit); drawStep(s, PAINT.last, hit); PAINT.last = hit; PAINT.hasContent = true;
}

// ---------------------------------------------------------------------
//  Stroke handling (called from the touch code while paint mode is on)
// ---------------------------------------------------------------------
function paintBegin(x, y) {
    initPaintLayer();
    PAINT.current = { tool: PAINT.tool, color: PAINT.color, size: PAINT.brushSize, opacity: PAINT.opacity, pts: [] }; PAINT.last = null; PAINT.holding = true;
    const hit = paintPick(x, y); if (hit) addPaintPoint(hit);
}
function paintMove(x, y) { const hit = paintPick(x, y); if (hit) addPaintPoint(hit); else PAINT.last = null; }
function paintEnd() {
    PAINT.holding = false;
    if (PAINT.current && PAINT.current.pts.length) PAINT.strokes.push(PAINT.current);
    PAINT.current = null; PAINT.last = null;
}
function replayStrokes() {
    PAINT.ctx.clearRect(0, 0, PAINT.size, PAINT.size);
    for (const s of PAINT.strokes) { let prev = null; for (const p of s.pts) { drawStep(s, prev, p); prev = p; } }
    PAINT.dirty = { x0: 0, y0: 0, x1: PAINT.size, y1: PAINT.size }; PAINT.hasContent = PAINT.strokes.length > 0;
}
function paintUndo() { if (!PAINT.canvas || !PAINT.strokes.length) return; PAINT.strokes.pop(); replayStrokes(); trace("Detail layer: undid last stroke", "success"); }
function paintClear() { if (!PAINT.canvas) return; PAINT.strokes = []; replayStrokes(); trace("Detail layer cleared", "success"); }

// once per frame: keep the airbrush spraying while the finger rests, and send changed pixels to the graphics card
function flushPaint() {
    if (!PAINT.canvas) return;
    if (PAINT.holding && PAINT.current && PAINT.tool === 'airbrush' && PAINT.last) drawStep(PAINT.current, PAINT.last, PAINT.last);
    const d = PAINT.dirty; if (!d) return; PAINT.dirty = null;
    const w = d.x1 - d.x0, h = d.y1 - d.y0; if (w <= 0 || h <= 0) return;
    const img = PAINT.ctx.getImageData(d.x0, d.y0, w, h);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, PAINT.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, d.x0, d.y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, img);
}
