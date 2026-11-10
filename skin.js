// =====================================================================
//  skin.js : Minecraft skin rig (joints, second layer, three bending styles) and the skin shader
// =====================================================================
window.skinSettings = { bend: 'fold', gap: 1.0, armDrop: 2, layer2: true, layer2Extra: 0 };   // layer2Extra = extra second-layer thickness in pixels   // bend: 'fold' | 'spring' | 'split'

// Vertex shader. "Spring" bending blends vertices near a joint toward the neighbouring piece (aBlend = how much, uBend = how it moved).
const skinVsSource = `#version 300 es
    in vec4 aPosition; in vec2 aTexCoord; in vec3 aNormal; in float aBlend;
    uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; uniform mat3 uNormalMatrix;
    uniform mat4 uBend; uniform float uBendOn; uniform float uInflate;
    out vec2 vTexCoord; out vec3 vViewPos; out vec3 vObjPos; out vec3 vNormal;
    void main() {
        vec3 p = aPosition.xyz;
        p.xz += sign(p.xz) * uInflate;   // thicker second layer: front/back faces move in Z, left/right faces move in X
        if (uBendOn > 0.5) { p = mix(p, (uBend * vec4(p, 1.0)).xyz, aBlend); }
        vec4 vp = uModelViewMatrix * vec4(p, 1.0);
        gl_Position = uProjectionMatrix * vp;
        vTexCoord = aTexCoord; vViewPos = vp.xyz; vObjPos = aPosition.xyz; vNormal = uNormalMatrix * aNormal;
    }
`;

// same lighting/material code as the solid shader (litCommonGLSL lives in shaders.js); the texture is the albedo.
// "Pixel clean" (uPixelClean) snaps the sampling to texel centres for crisp Minecraft-style pixels, otherwise textures are smoothly blended.
const skinFsSource = `#version 300 es
` + litCommonGLSL + `
in vec2 vTexCoord;
uniform sampler2D uTexture;
uniform float uPixelClean;
void main() {
    vec4 tex;
    if (uPixelClean > 0.5) {
        vec2 ts = vec2(textureSize(uTexture, 0));
        tex = textureLod(uTexture, (floor(vTexCoord * ts) + 0.5) / ts, 0.0);
    } else {
        tex = texture(uTexture, vTexCoord);
    }
    vec4 res = shade(tex.rgb, tex.a);
    if (tex.a < 0.05) discard;
    outColor = res;
}
`;
const skinFsSourceBasic = `#version 300 es
` + litCommonBasicGLSL + `
in vec2 vTexCoord;
uniform sampler2D uTexture;
void main() {
    vec4 tex = texture(uTexture, vTexCoord);
    vec4 res = shade(tex.rgb, tex.a);
    if (tex.a < 0.05) discard;
    outColor = res;
}
`;

const skinShaderProgram = buildProgram(skinVsSource, [skinFsSource, skinFsSourceBasic], "Skin", "Skin texture shader ready");
const skinProgramInfo = {
    program: skinShaderProgram,
    attribLocations: { position: gl.getAttribLocation(skinShaderProgram, 'aPosition'), texCoord: gl.getAttribLocation(skinShaderProgram, 'aTexCoord'), normal: gl.getAttribLocation(skinShaderProgram, 'aNormal'), blend: gl.getAttribLocation(skinShaderProgram, 'aBlend') },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(skinShaderProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(skinShaderProgram, 'uModelViewMatrix'),
        texture: gl.getUniformLocation(skinShaderProgram, 'uTexture'), normalMatrix: gl.getUniformLocation(skinShaderProgram, 'uNormalMatrix'),
        bend: gl.getUniformLocation(skinShaderProgram, 'uBend'), bendOn: gl.getUniformLocation(skinShaderProgram, 'uBendOn'), inflate: gl.getUniformLocation(skinShaderProgram, 'uInflate')
    },
    lit: getLitUniforms(skinShaderProgram)
};

// ---------------------------------------------------------------------
//  Mesh generation.
//  A "piece" is a horizontal slice (rows r0..r1, in pixels from the top) of one Minecraft box. Its origin sits on the JOINT, so rotating it
//  swings it around the shoulder / elbow / hip / knee / neck. Joints that cut a box in two get caps that COPY the opposite end of the piece,
//  so there is never a hole when the pieces are pulled apart or bent.
// ---------------------------------------------------------------------
function smooth01(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
const SKIN_BEND_RADIUS = 3;   // pixels each side of a joint that blend in "spring" mode

function buildPieceMesh(box, rows, originRow, inflate, jointRow) {
    const w = box.w, h = box.h, d = box.d, u = box.u, v = box.v, r0 = rows[0], r1 = rows[1];
    const hx = (w / 2 + inflate) / 16, hz = (d / 2 + inflate) / 16;
    const U = (x) => x / 64, V = (y) => y / 64;
    const yOf = (r) => ((originRow - r) + (r === 0 ? inflate : 0) - (r === h ? inflate : 0)) / 16;   // only the real ends of the box are inflated
    const wOf = (r) => jointRow === null ? 0 : 0.5 * (1 - smooth01(Math.abs(r - jointRow) / SKIN_BEND_RADIUS));
    const pos = [], uvs = [], blend = [], idx = [];
    const quad = (p, t, b) => { const o = pos.length / 3; for (let i = 0; i < 4; i++) { pos.push(p[i][0], p[i][1], p[i][2]); uvs.push(t[i][0], t[i][1]); blend.push(b[i]); } idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };

    for (let r = r0; r < r1; r++) {            // one 1-pixel band at a time (so "spring" has vertices to bend)
        const ra = r, rb = r + 1, yt = yOf(ra), yb = yOf(rb), vt = V(v + d + ra), vb = V(v + d + rb), wt = wOf(ra), wb = wOf(rb), bl = [wb, wb, wt, wt];
        let c0, c1;
        c0 = U(u + d); c1 = U(u + d + w);                       // front (+Z)
        quad([[-hx,yb,hz],[hx,yb,hz],[hx,yt,hz],[-hx,yt,hz]], [[c0,vb],[c1,vb],[c1,vt],[c0,vt]], bl);
        c0 = U(u + d + w + d); c1 = U(u + d + w + d + w);       // back (-Z)
        quad([[hx,yb,-hz],[-hx,yb,-hz],[-hx,yt,-hz],[hx,yt,-hz]], [[c0,vb],[c1,vb],[c1,vt],[c0,vt]], bl);
        c0 = U(u); c1 = U(u + d);                               // the character's RIGHT side (-X)
        quad([[-hx,yb,-hz],[-hx,yb,hz],[-hx,yt,hz],[-hx,yt,-hz]], [[c0,vb],[c1,vb],[c1,vt],[c0,vt]], bl);
        c0 = U(u + d + w); c1 = U(u + d + w + d);               // the character's LEFT side (+X)
        quad([[hx,yb,hz],[hx,yb,-hz],[hx,yt,-hz],[hx,yt,hz]], [[c0,vb],[c1,vb],[c1,vt],[c0,vt]], bl);
    }
    const tu0 = U(u + d), tu1 = U(u + d + w), tv0 = V(v), tv1 = V(v + d);         // top region
    const bu0 = U(u + d + w), bu1 = U(u + d + w + w), bv0 = V(v), bv1 = V(v + d); // bottom region
    // top cap (at row r0). Real top of the box, or a cut: then it copies the BOTTOM region
    const ytc = yOf(r0), wtc = wOf(r0);
    if (r0 === 0) quad([[-hx,ytc,hz],[hx,ytc,hz],[hx,ytc,-hz],[-hx,ytc,-hz]], [[tu0,tv1],[tu1,tv1],[tu1,tv0],[tu0,tv0]], [wtc,wtc,wtc,wtc]);
    else          quad([[-hx,ytc,hz],[hx,ytc,hz],[hx,ytc,-hz],[-hx,ytc,-hz]], [[bu0,bv0],[bu1,bv0],[bu1,bv1],[bu0,bv1]], [wtc,wtc,wtc,wtc]);
    // bottom cap (at row r1). Real bottom of the box, or a cut: then it copies the TOP region
    const ybc = yOf(r1), wbc = wOf(r1);
    if (r1 === h) quad([[-hx,ybc,-hz],[hx,ybc,-hz],[hx,ybc,hz],[-hx,ybc,hz]], [[bu0,bv1],[bu1,bv1],[bu1,bv0],[bu0,bv0]], [wbc,wbc,wbc,wbc]);
    else          quad([[-hx,ybc,-hz],[hx,ybc,-hz],[hx,ybc,hz],[-hx,ybc,hz]], [[tu0,tv0],[tu1,tv0],[tu1,tv1],[tu0,tv1]], [wbc,wbc,wbc,wbc]);
    return { pos: pos, uvs: uvs, blend: blend, idx: idx };
}
function uploadMesh(m, keepCpu) {
    const mk = (target, data) => { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, gl.STATIC_DRAW); return b; };
    return { posBuffer: mk(gl.ARRAY_BUFFER, new Float32Array(m.pos)), uvBuffer: mk(gl.ARRAY_BUFFER, new Float32Array(m.uvs)), blendBuffer: mk(gl.ARRAY_BUFFER, new Float32Array(m.blend)),
             idxBuffer: mk(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.idx)), triCount: m.idx.length, cpu: keepCpu ? m : null };
}

// ---------------------------------------------------------------------
//  The rig
// ---------------------------------------------------------------------
function createRigPart(spec) {
    const base = uploadMesh(buildPieceMesh(spec.box, spec.rows, spec.origin, 0, spec.joint));
    const infl = spec.layer2Inflate;
    const l2 = spec.layer2Box ? uploadMesh(buildPieceMesh(spec.layer2Box, spec.rows, spec.origin, infl, spec.joint)) : null;
    const l3 = uploadMesh(buildPieceMesh(spec.box, spec.rows, spec.origin, 0.125, spec.joint), true);   // the detail layer: just outside the skin, just inside the second layer
    const hw = spec.box.w / 2 / 16, hd = spec.box.d / 2 / 16, yA = (spec.origin - spec.rows[0]) / 16, yB = (spec.origin - spec.rows[1]) / 16;
    return Object.assign({
        name: spec.name, isTextured: true, skinPart: true, rigKey: spec.key,
        pos: { x: spec.pos[0] / 16, y: spec.pos[1] / 16, z: spec.pos[2] / 16 }, rot: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
        material: Object.assign(makeMaterial('matte', [1, 1, 1]), { pixelClean: true }),
        children: [], parent: null, layer2: l2, layer3: l3, restPos: { x: spec.pos[0] / 16, y: spec.pos[1] / 16, z: spec.pos[2] / 16 },
        centerLocal: [0, (yA + yB) / 2, 0], pickRadius: Math.sqrt(hw * hw * 4 + hd * hd * 4 + (yA - yB) * (yA - yB)) / 2,
        pickBox: { min: [-hw, Math.min(yA, yB), -hd], max: [hw, Math.max(yA, yB), hd] }
    }, base);
}
function createRigRoot() {
    return { name: "Skin Root", isTextured: true, skinPart: true, rigKey: 'root', pos: { x: 0, y: 0, z: 0 }, rot: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 },
             material: makeMaterial('matte', [1, 1, 1]), children: [], parent: null, triCount: 0, posBuffer: null, centerLocal: [0, 1, 0] };
}
function link(parent, child) { child.parent = parent; parent.children.push(child); }
// two pieces that meet at a joint bend together (spring), or are pulled apart (split)
function pairBend(parentPiece, childPiece, restOff, splitDir) {
    parentPiece.bend = { role: 'parent', partner: childPiece, restOff: restOff };
    childPiece.bend = { role: 'child', partner: parentPiece, restOff: restOff, splitDir: splitDir };
}

function buildMinecraftSkeleton(aw) {
    const torso = { w: 8, h: 12, d: 4, u: 16, v: 16 }, torso2 = { w: 8, h: 12, d: 4, u: 16, v: 32 };
    const rArm = { w: aw, h: 12, d: 4, u: 40, v: 16 }, rArm2 = { w: aw, h: 12, d: 4, u: 40, v: 32 }, lArm = { w: aw, h: 12, d: 4, u: 32, v: 48 }, lArm2 = { w: aw, h: 12, d: 4, u: 48, v: 48 };
    const rLeg = { w: 4, h: 12, d: 4, u: 0, v: 16 }, rLeg2 = { w: 4, h: 12, d: 4, u: 0, v: 32 }, lLeg = { w: 4, h: 12, d: 4, u: 16, v: 48 }, lLeg2 = { w: 4, h: 12, d: 4, u: 0, v: 48 };
    const sOff = 4 + aw / 2, drop = window.skinSettings.armDrop;
    const root = createRigRoot();
    // key, box, rows (px from the top of the box), origin row (the joint), joint row used for bending, position relative to the parent (px)
    const waist  = createRigPart({ key: 'waist', name: "Waist", box: torso, layer2Box: torso2, layer2Inflate: 0.25, rows: [6, 12], origin: 12, joint: 6, pos: [0, 12, 0] });
    const chest  = createRigPart({ key: 'chest', name: "Chest", box: torso, layer2Box: torso2, layer2Inflate: 0.25, rows: [0, 6],  origin: 6,  joint: 6, pos: [0, 6, 0] });
    const head   = createRigPart({ key: 'head', name: "Head", box: { w: 8, h: 8, d: 8, u: 0, v: 0 }, layer2Box: { w: 8, h: 8, d: 8, u: 32, v: 0 }, layer2Inflate: 0.5, rows: [0, 8], origin: 8, joint: null, pos: [0, 6, 0] });
    const rSh    = createRigPart({ key: 'rShoulder', name: "Right Shoulder", box: rArm, layer2Box: rArm2, layer2Inflate: 0.25, rows: [0, 6], origin: 0, joint: 6, pos: [-sOff, 6 - drop, 0] });
    const lSh    = createRigPart({ key: 'lShoulder', name: "Left Shoulder",  box: lArm, layer2Box: lArm2, layer2Inflate: 0.25, rows: [0, 6], origin: 0, joint: 6, pos: [sOff, 6 - drop, 0] });
    const rHand  = createRigPart({ key: 'rHand', name: "Right Hand", box: rArm, layer2Box: rArm2, layer2Inflate: 0.25, rows: [6, 12], origin: 6, joint: 6, pos: [0, -6, 0] });
    const lHand  = createRigPart({ key: 'lHand', name: "Left Hand",  box: lArm, layer2Box: lArm2, layer2Inflate: 0.25, rows: [6, 12], origin: 6, joint: 6, pos: [0, -6, 0] });
    const rThigh = createRigPart({ key: 'rThigh', name: "Right Thigh", box: rLeg, layer2Box: rLeg2, layer2Inflate: 0.25, rows: [0, 6], origin: 0, joint: 6, pos: [-2, 12, 0] });
    const lThigh = createRigPart({ key: 'lThigh', name: "Left Thigh",  box: lLeg, layer2Box: lLeg2, layer2Inflate: 0.25, rows: [0, 6], origin: 0, joint: 6, pos: [2, 12, 0] });
    const rLegP  = createRigPart({ key: 'rLeg', name: "Right Leg", box: rLeg, layer2Box: rLeg2, layer2Inflate: 0.25, rows: [6, 12], origin: 6, joint: 6, pos: [0, -6, 0] });
    const lLegP  = createRigPart({ key: 'lLeg', name: "Left Leg",  box: lLeg, layer2Box: lLeg2, layer2Inflate: 0.25, rows: [6, 12], origin: 6, joint: 6, pos: [0, -6, 0] });
    // hierarchy: the legs hang from the root (bending the waist must not tilt them), the arms and head hang from the chest
    link(root, waist); link(root, rThigh); link(root, lThigh);
    link(waist, chest); link(chest, head); link(chest, rSh); link(chest, lSh);
    link(rSh, rHand); link(lSh, lHand); link(rThigh, rLegP); link(lThigh, lLegP);
    pairBend(waist, chest, [0, 6 / 16, 0], +1);
    pairBend(rSh, rHand, [0, -6 / 16, 0], -1); pairBend(lSh, lHand, [0, -6 / 16, 0], -1);
    pairBend(rThigh, rLegP, [0, -6 / 16, 0], -1); pairBend(lThigh, lLegP, [0, -6 / 16, 0], -1);
    const allParts = [root, waist, chest, head, rSh, lSh, rHand, lHand, rThigh, lThigh, rLegP, lLegP];
    return { root: root, allParts: allParts };
}

// "Spring": how a piece's vertices should follow its neighbour. Returns the matrix for the shader, or null.
function computeBendMatrix(entity) {
    const b = entity.bend; if (!b) return null;
    const child = b.role === 'child' ? entity : b.partner;
    const M = entityLocalMatrix(child);                                     // where the child piece sits relative to the parent piece
    if (b.role === 'parent') return multiply(M, translationMatrix(-b.restOff[0], -b.restOff[1], -b.restOff[2]));
    const inv = invert4(M); if (!inv) return null;
    return multiply(inv, translationMatrix(b.restOff[0], b.restOff[1], b.restOff[2]));
}

// Skin settings panel: arm drop moves the shoulders; bending style and gap are read while drawing
// put every part back to its rest position and rotation (the skin itself stays where you placed it)
function resetSkinPose() {
    for (const e of sceneObjects) {
        if (!e.skinPart) continue;
        e.rot.x = 0; e.rot.y = 0; e.rot.z = 0; e.scale.x = 1; e.scale.y = 1; e.scale.z = 1;
        if (e.restPos && e.rigKey !== 'root') { e.pos.x = e.restPos.x; e.pos.y = e.restPos.y; e.pos.z = e.restPos.z; }
    }
    applySkinSettings();
    trace("Skin pose reset", "success");
}
function applySkinSettings() {
    for (const e of sceneObjects) { if (e.rigKey === 'rShoulder' || e.rigKey === 'lShoulder') e.pos.y = (6 - window.skinSettings.armDrop) / 16; }
}

// ---------------------------------------------------------------------
//  Smart Texture Processing
// ---------------------------------------------------------------------

function loadTextureFromImage(img) {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); 
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null); 
    return tex;
}

function drawRegion(ctx, img, sx, sy, w, h, dx, dy, flipX = false) {
    ctx.save();
    if (flipX) { ctx.translate(dx + w, dy); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h); } 
    else { ctx.drawImage(img, sx, sy, w, h, dx, dy, w, h); }
    ctx.restore();
}

function upgradeLegacySkin(img) {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, 64, 32, 0, 0, 64, 32);
    drawRegion(ctx, img, 0, 16, 4, 4, 24, 48, true); drawRegion(ctx, img, 4, 16, 4, 4, 28, 48, true);
    drawRegion(ctx, img, 0, 20, 4, 12, 24, 52, true); drawRegion(ctx, img, 4, 20, 4, 12, 20, 52, true);
    drawRegion(ctx, img, 8, 20, 4, 12, 16, 52, true); drawRegion(ctx, img, 12, 20, 4, 12, 28, 52, true);
    drawRegion(ctx, img, 40, 16, 4, 4, 36, 48, true); drawRegion(ctx, img, 44, 16, 4, 4, 40, 48, true);
    drawRegion(ctx, img, 40, 20, 4, 12, 40, 52, true); drawRegion(ctx, img, 44, 20, 4, 12, 36, 52, true);
    drawRegion(ctx, img, 48, 20, 4, 12, 32, 52, true); drawRegion(ctx, img, 52, 20, 4, 12, 44, 52, true);
    return canvas;
}

function detectSlim(ctx) {
    const probes = [[50, 16], [54, 20], [42, 48], [46, 52]];
    let transparent = 0;
    for (const [x, y] of probes) { if (ctx.getImageData(x, y, 1, 1).data[3] === 0) transparent += 1; }
    return transparent >= 2;
}

// ---------------------------------------------------------------------
//  UI Event Listener
// ---------------------------------------------------------------------

document.getElementById('skinFile').addEventListener('change', function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); 
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = function() {
            try {
                if (img.width !== 64 || (img.height !== 64 && img.height !== 32)) throw new Error("Skins must be 64x64 (or legacy 64x32) pixels.");
                let canvas;
                if (img.height === 32) { canvas = upgradeLegacySkin(img); trace("Legacy 64x32 skin upgraded to 64x64.", "success"); } 
                else { canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64; const ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 0, 0); }
                
                const ctx = canvas.getContext("2d");
                const isSlim = detectSlim(ctx);
                const armWidth = isSlim ? 3 : 4;
                trace(`Skin format detected: ${isSlim ? 'Slim (Alex)' : 'Classic (Steve)'}`, "success");

                const finalImg = new Image();
                finalImg.onload = function() {
                    const texture = loadTextureFromImage(finalImg); 
                    const skeleton = buildMinecraftSkeleton(armWidth);
                    skeleton.allParts.forEach(p => { p.texture = texture; sceneObjects.push(p); });
                    setSelection([skeleton.root], skeleton.root);
                    window.currentSkinImageData = finalImg.src; 
                    trace(`Skin skeleton loaded successfully!`, "success");
                    if(window.updateTreePanel) window.updateTreePanel(); 
                };
                finalImg.src = canvas.toDataURL("image/png");
            } catch (err) { trace(`Skin error: ${err.message}`, "error"); }
        };
        img.src = evt.target.result;
    }; reader.readAsDataURL(file); e.target.value = '';
});