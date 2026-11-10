function multiply(a, b) { const out = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { out[i * 4 + j] = a[0 * 4 + j] * b[i * 4 + 0] + a[1 * 4 + j] * b[i * 4 + 1] + a[2 * 4 + j] * b[i * 4 + 2] + a[3 * 4 + j] * b[i * 4 + 3]; } return out; }
function translationMatrix(x, y, z) { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]); }
function scaleMatrix(x, y, z) { return new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]); }
function rotationYMatrix(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
function rotationXMatrix(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
function rotationZMatrix(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); }
const IDENTITY = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

function v3add(a, b) { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function v3sub(a, b) { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function v3mul(a, s) { return [a[0]*s, a[1]*s, a[2]*s]; }
function v3dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function v3len(a) { return Math.sqrt(v3dot(a, a)); }
function v3cross(a, b) { return [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]]; }
function v3norm(a) { const l = v3len(a); return [a[0]/l, a[1]/l, a[2]/l]; }

window.cameraTarget = window.cameraTarget || [0, 1, 0];
function buildCameraMatrix() { const radius = window.cameraRadius || 4.0, T = window.cameraTarget; const sa = Math.sin(window.cameraAngleY), ca = Math.cos(window.cameraAngleY), se = Math.sin(window.cameraAngleX), ce = Math.cos(window.cameraAngleX); const zAxis = [sa * ce, se, ca * ce], xAxis = [ca, 0, -sa], yAxis = [-sa * se, ce, -ca * se]; const camX = T[0] + radius * zAxis[0], camY = T[1] + radius * zAxis[1], camZ = T[2] + radius * zAxis[2]; return new Float32Array([ xAxis[0], yAxis[0], zAxis[0], 0, xAxis[1], yAxis[1], zAxis[1], 0, xAxis[2], yAxis[2], zAxis[2], 0, -(xAxis[0]*camX + xAxis[1]*camY + xAxis[2]*camZ), -(yAxis[0]*camX + yAxis[1]*camY + yAxis[2]*camZ), -(zAxis[0]*camX + zAxis[1]*camY + zAxis[2]*camZ), 1 ]); }
function panCamera(dx, dy) { const sa = Math.sin(window.cameraAngleY), ca = Math.cos(window.cameraAngleY), se = Math.sin(window.cameraAngleX), ce = Math.cos(window.cameraAngleX); const x = [ca, 0, -sa], y = [-sa * se, ce, -ca * se]; const perPx = 2 * (window.cameraRadius || 4.0) * Math.tan((window.fovValue || 60) * Math.PI / 360) / (canvas.clientHeight || 740); const T = window.cameraTarget; for (let i = 0; i < 3; i++) T[i] += (-dx * x[i] + dy * y[i]) * perPx; }
function buildProjectionMatrix() { const fov = (window.fovValue || 60) * Math.PI / 180; const f = 1.0 / Math.tan(fov / 2); const radius = window.cameraRadius || 4.0; const near = Math.min(50, Math.max(0.0005, radius * 0.02)), far = Math.max(2000, radius * 2000); return new Float32Array([f/(gl.canvas.width/gl.canvas.height), 0, 0, 0, 0, f, 0, 0, 0, 0, (far+near)/(near-far), -1, 0, 0, (2*far*near)/(near-far), 0]); }
function getCameraPos() { const radius = window.cameraRadius || 4.0, T = window.cameraTarget; const sa = Math.sin(window.cameraAngleY), ca = Math.cos(window.cameraAngleY), se = Math.sin(window.cameraAngleX), ce = Math.cos(window.cameraAngleX); return [T[0] + radius * sa * ce, T[1] + radius * se, T[2] + radius * ca * ce]; }
function screenRay(clientX, clientY) { const rect = canvas.getBoundingClientRect(); const x = ((clientX - rect.left) / rect.width) * 2 - 1; const y = -((clientY - rect.top) / rect.height) * 2 + 1; const tanHalf = Math.tan((window.fovValue || 60) * Math.PI / 360); const aspect = canvas.width / canvas.height; const vx = x * tanHalf * aspect, vy = y * tanHalf, vz = -1; const m = buildCameraMatrix(); const d = [ m[0]*vx + m[1]*vy + m[2]*vz, m[4]*vx + m[5]*vy + m[6]*vz, m[8]*vx + m[9]*vy + m[10]*vz ]; const l = v3len(d); return { o: getCameraPos(), d: [d[0]/l, d[1]/l, d[2]/l] }; }
function worldToScreen(p) { const vp = multiply(buildProjectionMatrix(), buildCameraMatrix()); const cx = vp[0]*p[0] + vp[4]*p[1] + vp[8]*p[2] + vp[12], cy = vp[1]*p[0] + vp[5]*p[1] + vp[9]*p[2] + vp[13], cw = vp[3]*p[0] + vp[7]*p[1] + vp[11]*p[2] + vp[15]; if (cw <= 0.0001) return null; const rect = canvas.getBoundingClientRect(); return [ rect.left + (cx / cw * 0.5 + 0.5) * rect.width, rect.top + (1 - (cy / cw * 0.5 + 0.5)) * rect.height ]; }
function normalMatrix3(m) { const a00 = m[0], a01 = m[4], a02 = m[8], a10 = m[1], a11 = m[5], a12 = m[9], a20 = m[2], a21 = m[6], a22 = m[10]; const c00 = a11*a22 - a12*a21, c01 = a12*a20 - a10*a22, c02 = a10*a21 - a11*a20; const c10 = a02*a21 - a01*a22, c11 = a00*a22 - a02*a20, c12 = a01*a20 - a00*a21; const c20 = a01*a12 - a02*a11, c21 = a02*a10 - a00*a12, c22 = a00*a11 - a01*a10; const det = a00*c00 + a01*c01 + a02*c02; const id = Math.abs(det) > 1e-12 ? 1 / det : 0; return new Float32Array([c00*id, c10*id, c20*id, c01*id, c11*id, c21*id, c02*id, c12*id, c22*id]); }

const MATERIAL_BASE = { opacity: 1.0, gloss: 0.5, shine: 0.5, metal: 0.0, reflect: 0.0, detail: 0.5, scale: 12, glow: 0.0, steps: 4, soft: 0.5, lightPower: 1.5 };
const MATERIAL_PARAM_DEFS = { opacity: { label: 'Opacity', min: 0, max: 1, step: 0.05 }, gloss: { label: 'Glossiness', min: 0, max: 1, step: 0.05 }, shine: { label: 'Shine', min: 0, max: 2, step: 0.05 }, metal: { label: 'Metalness', min: 0, max: 1, step: 0.05 }, reflect: { label: 'Reflection', min: 0, max: 1, step: 0.05 }, detail: { label: 'Detail', min: 0, max: 1, step: 0.05 }, scale: { label: 'Detail size', min: 2, max: 60, step: 1 }, glow: { label: 'Glow', min: 0, max: 3, step: 0.05 }, steps: { label: 'Toon bands', min: 2, max: 8, step: 1 }, soft: { label: 'Softness', min: 0, max: 1, step: 0.05 }, lightPower: { label: 'Light power', min: 0, max: 6, step: 0.1 } };
const MATERIAL_TYPES = { matte: { label: 'Matte', index: 0, params: ['opacity'], values: { gloss: 0.1, shine: 0.0 } }, glossy: { label: 'Glossy', index: 1, params: ['opacity', 'gloss', 'shine', 'reflect'], values: { gloss: 0.75, shine: 0.9, reflect: 0.25 } }, soft: { label: 'Soft', index: 2, params: ['opacity', 'soft'], values: { soft: 0.6, shine: 0.0 } }, toon: { label: 'Toon', index: 3, params: ['opacity', 'steps', 'gloss'], values: { steps: 3, gloss: 0.5, shine: 0.8 } }, metal: { label: 'Metal', index: 4, params: ['opacity', 'gloss', 'metal', 'reflect'], values: { metal: 0.9, gloss: 0.6, shine: 1.0, reflect: 0.6 } }, reflective: { label: 'Mirror', index: 5, params: ['opacity', 'gloss', 'reflect', 'metal'], values: { metal: 1.0, gloss: 0.95, shine: 1.0, reflect: 1.0 } }, glass: { label: 'Glass', index: 6, params: ['opacity', 'gloss', 'reflect'], values: { gloss: 0.9, shine: 1.0, reflect: 0.6 } }, sand: { label: 'Sand', index: 7, params: ['opacity', 'detail', 'scale'], values: { detail: 0.7, scale: 14, shine: 0.0, gloss: 0.1 } }, mold: { label: 'Mold', index: 8, params: ['opacity', 'detail', 'scale'], values: { detail: 0.7, scale: 6, shine: 0.15, gloss: 0.3 } }, rubber: { label: 'Rubber', index: 9, params: ['opacity', 'gloss'], values: { gloss: 0.2, shine: 0.2 } }, stone: { label: 'Stone', index: 10, params: ['opacity', 'detail', 'scale', 'gloss'], values: { detail: 0.6, scale: 8, shine: 0.1, gloss: 0.3 } }, glow: { label: 'Glow', index: 11, params: ['opacity', 'glow', 'lightPower'], values: { glow: 1.2, shine: 0.0 } }, flat: { label: 'Flat', index: 12, params: ['opacity', 'glow'], values: { glow: 0.0 } } };
function applyMaterialType(m, type) { const t = MATERIAL_TYPES[type]; if (!t) return m; const prev = m.type, keepColor = m.color, keepOpacity = m.opacity, keepPixel = m.pixelClean, keepRadius = m.glowRadius; Object.assign(m, MATERIAL_BASE, t.values); m.type = type; m.color = keepColor; m.opacity = keepOpacity; m.pixelClean = !!keepPixel; if (keepRadius !== undefined) m.glowRadius = keepRadius; if (type === 'glass' && keepOpacity >= 1) m.opacity = 0.35; else if (prev === 'glass' && type !== 'glass' && Math.abs(keepOpacity - 0.35) < 1e-6) m.opacity = 1; return m; }
function makeMaterial(type, color) { const m = { type: 'matte', color: (color || [1, 1, 1]).slice(0, 3), opacity: 1 }; return applyMaterialType(m, type || 'matte'); }
function ensureMaterial(entity) { if (!entity.material) entity.material = makeMaterial('matte', entity.isTextured ? [1, 1, 1] : (entity.color || [1.0, 0.5, 0.2])); return entity.material; }
function isTransparentMaterial(m) { return m.opacity < 0.999 || m.type === 'glass' || m.blend === true; }
function applyMaterial(pInfo, entity) { const m = ensureMaterial(entity), u = pInfo.lit; if(!u) return; if (u.matType) gl.uniform1i(u.matType, MATERIAL_TYPES[m.type].index); if (u.tint) gl.uniform3fv(u.tint, m.color); if (u.opacity) gl.uniform1f(u.opacity, m.opacity); if (u.gloss) gl.uniform1f(u.gloss, m.gloss); if (u.shine) gl.uniform1f(u.shine, m.shine); if (u.metal) gl.uniform1f(u.metal, m.metal); if (u.reflect) gl.uniform1f(u.reflect, m.reflect); if (u.detail) gl.uniform1f(u.detail, m.detail); if (u.scale) gl.uniform1f(u.scale, m.scale); if (u.glow) gl.uniform1f(u.glow, m.glow); if (u.steps) gl.uniform1f(u.steps, m.steps); if (u.soft) gl.uniform1f(u.soft, m.soft); if (u.emitMode) gl.uniform1i(u.emitMode, window.currentEmitMode || 0); if (u.pixelClean) gl.uniform1f(u.pixelClean, m.pixelClean ? 1 : 0); }

window.selectedEntities = []; window.multiSelectMode = false;
function getSelection() { if (window.selectedEntities && window.selectedEntities.length) return window.selectedEntities; return window.selectedEntity ? [window.selectedEntity] : []; }
function setSelection(list, primary) { window.selectedEntities = list.slice(); window.selectedEntity = primary || list[list.length - 1] || null; window.gizmoDrag = null; window.selectionGlow = 1.0; if (window.onSelectionChanged) window.onSelectionChanged(); if (window.updateTreePanel) window.updateTreePanel(); }
function toggleSelection(list) { const cur = getSelection().slice(); const allIn = list.every(e => cur.indexOf(e) >= 0); if (allIn) { setSelection(cur.filter(e => list.indexOf(e) < 0), null); return; } setSelection(cur.concat(list.filter(e => cur.indexOf(e) < 0)), list[list.length - 1]); }

// =====================================================================
//  HIERARCHY: objects can have a parent (the Minecraft skin rig does). Positions are local to the parent.
// =====================================================================
function invert4(m) {
    const a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7],a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
    const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
    let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06; if (!det) return null; det = 1.0 / det;
    return new Float32Array([(a11*b11-a12*b10+a13*b09)*det,(a02*b10-a01*b11-a03*b09)*det,(a31*b05-a32*b04+a33*b03)*det,(a22*b04-a21*b05-a23*b03)*det,
        (a12*b08-a10*b11-a13*b07)*det,(a00*b11-a02*b08+a03*b07)*det,(a32*b02-a30*b05-a33*b01)*det,(a20*b05-a22*b02+a23*b01)*det,
        (a10*b10-a11*b08+a13*b06)*det,(a01*b08-a00*b10-a03*b06)*det,(a30*b04-a31*b02+a33*b00)*det,(a21*b02-a20*b04-a23*b00)*det,
        (a11*b07-a10*b09-a12*b06)*det,(a00*b09-a01*b07+a02*b06)*det,(a31*b01-a30*b03-a32*b00)*det,(a20*b03-a21*b01+a22*b00)*det]);
}
// the object's own transform (relative to its parent). "Split" bending pulls the lower piece away along its own axis.
function entityLocalMatrix(e) {
    let m = translationMatrix(e.pos.x, e.pos.y, e.pos.z);
    m = multiply(m, rotationYMatrix(e.rot.y)); m = multiply(m, rotationXMatrix(e.rot.x)); m = multiply(m, rotationZMatrix(e.rot.z));
    const ss = window.skinSettings;
    if (e.bend && e.bend.role === 'child' && ss && ss.bend === 'split') m = multiply(m, translationMatrix(0, e.bend.splitDir * ss.gap / 16, 0));
    return multiply(m, scaleMatrix(e.scale.x, e.scale.y, e.scale.z));
}
function entityWorldMatrix(e) { const l = entityLocalMatrix(e); return e.parent ? multiply(entityWorldMatrix(e.parent), l) : l; }
function worldPosOf(e) { const m = entityWorldMatrix(e); return [m[12], m[13], m[14]]; }
// rotation part of a world matrix (unit scale assumed), row-major 3x3
function rotM3Of(e) {
    const m = entityWorldMatrix(e); const out = new Array(9);
    for (let c = 0; c < 3; c++) { const l = Math.sqrt(m[c*4]*m[c*4] + m[c*4+1]*m[c*4+1] + m[c*4+2]*m[c*4+2]) || 1; out[0*3+c] = m[c*4]/l; out[1*3+c] = m[c*4+1]/l; out[2*3+c] = m[c*4+2]/l; }
    return out;
}
function m3T(a) { return [a[0], a[3], a[6], a[1], a[4], a[7], a[2], a[5], a[8]]; }
function m3ToM4(a) { return new Float32Array([a[0], a[3], a[6], 0, a[1], a[4], a[7], 0, a[2], a[5], a[8], 0, 0, 0, 0, 1]); }
function topmostOf(sel) { return sel.filter(function (e) { let p = e.parent; while (p) { if (sel.indexOf(p) >= 0) return false; p = p.parent; } return true; }); }
function mulPoint4(m, p) { return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]; }
function mulDir4(m, p) { return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2], m[1]*p[0]+m[5]*p[1]+m[9]*p[2], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]]; }

// distance along the ray to the object, or null. Rig parts use their exact box; other objects use a sphere around their centre.
function pickHit(entity, ray) {
    if (!entity.posBuffer || entity.triCount === 0) return null;
    if (entity.pickBox) {
        const inv = invert4(entityWorldMatrix(entity)); if (!inv) return null;
        const o = mulPoint4(inv, ray.o), d = mulDir4(inv, ray.d), mn = entity.pickBox.min, mx = entity.pickBox.max;
        let tmin = 0, tmax = Infinity;
        for (let k = 0; k < 3; k++) {
            if (Math.abs(d[k]) < 1e-9) { if (o[k] < mn[k] || o[k] > mx[k]) return null; }
            else { let t1 = (mn[k] - o[k]) / d[k], t2 = (mx[k] - o[k]) / d[k]; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; }
        }
        return tmin;
    }
    const c = entityCenter(entity); const dx = c[0] - ray.o[0], dy = c[1] - ray.o[1], dz = c[2] - ray.o[2];
    const t = dx*ray.d[0] + dy*ray.d[1] + dz*ray.d[2]; if (t <= 0) return null;
    const cx = dx - t*ray.d[0], cy = dy - t*ray.d[1], cz = dz - t*ray.d[2];
    const rad = entity.pickRadius ? entity.pickRadius * Math.max(entity.scale.x, entity.scale.y, entity.scale.z) : 1.2247;
    return (cx*cx + cy*cy + cz*cz < rad * rad) ? t : null;
}
function pickClosest(ray) {
    let best = null, bestT = Infinity;
    for (const entity of sceneObjects) { const t = pickHit(entity, ray); if (t !== null && t < bestT) { best = entity; bestT = t; } }
    return best;
}

function gizmoSubject() {
    const sel = getSelection(); if (!sel.length) return null;
    if (sel.length === 1) {
        const e = sel[0]; if (!e.parent) return e;
        const wp = worldPosOf(e); // a child: show the gizmo where it really is (its joint), with its parent's rotation
        return { pos: { x: wp[0], y: wp[1], z: wp[2] }, rot: e.rot, scale: e.scale, _entity: e, _parentRot: m3ToM4(rotM3Of(e.parent)) };
    }
    let x = 0, y = 0, z = 0; sel.forEach(e => { const w = worldPosOf(e); x += w[0]; y += w[1]; z += w[2]; });
    return { pos: { x: x / sel.length, y: y / sel.length, z: z / sel.length }, rot: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, _multi: true };
}
function handleTapSelection(touchX, touchY) {
    const closestEntity = pickClosest(screenRay(touchX, touchY));
    if (closestEntity) {
        const set = (closestEntity.group && !closestEntity.group.expanded) ? closestEntity.group.parts : [closestEntity];
        trace(`Selected: ${closestEntity.group && !closestEntity.group.expanded ? closestEntity.group.name : closestEntity.name}`, "success");
        if (window.multiSelectMode) toggleSelection(set); else setSelection(set, closestEntity);
    } else if (!window.multiSelectMode) { setSelection([], null); }
}

function m3mul(a, b) { const o = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r*3 + c] = a[r*3]*b[c] + a[r*3+1]*b[3+c] + a[r*3+2]*b[6+c]; return o; }
function m3vec(a, v) { return [a[0]*v[0] + a[1]*v[1] + a[2]*v[2], a[3]*v[0] + a[4]*v[1] + a[5]*v[2], a[6]*v[0] + a[7]*v[1] + a[8]*v[2]]; }
function axisRotM3(axis, a) { const c = Math.cos(a), s = Math.sin(a); if (axis === 0) return [1,0,0, 0,c,-s, 0,s,c]; if (axis === 1) return [c,0,s, 0,1,0, -s,0,c]; return [c,-s,0, s,c,0, 0,0,1]; }
function eulerToM3(r) { const cx = Math.cos(r.x), sx = Math.sin(r.x), cy = Math.cos(r.y), sy = Math.sin(r.y), cz = Math.cos(r.z), sz = Math.sin(r.z); return [cy*cz + sy*sx*sz, -cy*sz + sy*sx*cz, sy*cx,  cx*sz, cx*cz, -sx,  -sy*cz + cy*sx*sz, sy*sz + cy*sx*cz, cy*cx]; }
function m3ToEuler(R) { const x = -Math.asin(Math.max(-1, Math.min(1, R[5]))); if (Math.abs(R[5]) < 0.999999) return { x: x, y: Math.atan2(R[2], R[8]), z: Math.atan2(R[3], R[4]) }; return { x: x, y: Math.atan2(-R[6], R[0]), z: 0 }; }
function snapEntity(e) {
    const s = { pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, rot: { x: e.rot.x, y: e.rot.y, z: e.rot.z }, scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z } };
    s.wp = worldPosOf(e);
    if (e.parent) { s.pp = worldPosOf(e.parent); s.pr = rotM3Of(e.parent); }
    return s;
}
// amount: move = distance, rotate = radians, scale = factor. Measured from the snapshots; works in WORLD space and converts back to each object's local values.
function applyGroupTransform(set, snaps, mode, axis, amount, pivot) {
    const keys = ['x', 'y', 'z'];
    const Rw = (mode === 'rotate') ? axisRotM3(axis, amount) : null;
    set.forEach(function (e, i) {
        const s = snaps[i]; const P = s.pr || null; const wp0 = s.wp || [s.pos.x, s.pos.y, s.pos.z];
        const rel = [wp0[0] - pivot[0], wp0[1] - pivot[1], wp0[2] - pivot[2]];
        let wp1;
        if (mode === 'move') wp1 = [wp0[0] + (axis === 0 ? amount : 0), wp0[1] + (axis === 1 ? amount : 0), wp0[2] + (axis === 2 ? amount : 0)];
        else if (mode === 'rotate') { const rr = m3vec(Rw, rel); wp1 = [pivot[0] + rr[0], pivot[1] + rr[1], pivot[2] + rr[2]]; }
        else { const f = Math.max(0.05, amount); rel[axis] *= f; wp1 = [pivot[0] + rel[0], pivot[1] + rel[1], pivot[2] + rel[2]]; }
        if (s.pp) { const l = m3vec(m3T(P), [wp1[0] - s.pp[0], wp1[1] - s.pp[1], wp1[2] - s.pp[2]]); e.pos.x = l[0]; e.pos.y = l[1]; e.pos.z = l[2]; }
        else { e.pos.x = wp1[0]; e.pos.y = wp1[1]; e.pos.z = wp1[2]; }
        const R0w = P ? m3mul(P, eulerToM3(s.rot)) : eulerToM3(s.rot);
        if (mode === 'rotate') {
            const R1w = m3mul(Rw, R0w); const eu = m3ToEuler(P ? m3mul(m3T(P), R1w) : R1w);
            e.rot.x = eu.x; e.rot.y = eu.y; e.rot.z = eu.z;
        } else if (mode === 'scale') {
            let best = 0, bestV = -1; for (let j = 0; j < 3; j++) { const v = Math.abs(R0w[axis*3 + j]); if (v > bestV) { bestV = v; best = j; } }
            e.scale.x = s.scale.x; e.scale.y = s.scale.y; e.scale.z = s.scale.z; e.scale[keys[best]] = Math.max(0.01, s.scale[keys[best]] * Math.max(0.05, amount));
        }
    });
}

const GIZMO_COLORS = [[1.0, 0.25, 0.25], [0.3, 1.0, 0.3], [0.3, 0.5, 1.0]];
const GIZMO_ACTIVE = [1.0, 0.9, 0.2];
const gizmoMeshes = { move: [], rotate: [], scale: [] };
function gizmoPermute(axis, u, v, w) { if (axis === 0) return [u, v, w]; if (axis === 1) return [w, u, v]; return [v, w, u]; }
function gizmoTri(arr, a, b, c) { arr.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]); }
function gizmoAddBox(arr, axis, u0, u1, hv, hw) { const c = []; for (const u of [u0, u1]) for (const v of [-hv, hv]) for (const w of [-hw, hw]) c.push(gizmoPermute(axis, u, v, w)); const quad = (a, b, cc, d) => { gizmoTri(arr, c[a], c[b], c[cc]); gizmoTri(arr, c[a], c[cc], c[d]); }; quad(0,1,3,2); quad(4,5,7,6); quad(0,1,5,4); quad(2,3,7,6); quad(0,2,6,4); quad(1,3,7,5); }
function gizmoAddCone(arr, axis, u0, u1, r, seg) { const tip = gizmoPermute(axis, u1, 0, 0); const base = gizmoPermute(axis, u0, 0, 0); for (let i = 0; i < seg; i++) { const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2; const p0 = gizmoPermute(axis, u0, r * Math.cos(a0), r * Math.sin(a0)); const p1 = gizmoPermute(axis, u0, r * Math.cos(a1), r * Math.sin(a1)); gizmoTri(arr, p0, p1, tip); gizmoTri(arr, p0, base, p1); } }
function gizmoAddRing(arr, axis, R, tube, seg, sides) { const pt = (i, j) => { const t = i / seg * Math.PI * 2, p = j / sides * Math.PI * 2; const rr = R + tube * Math.cos(p); return gizmoPermute(axis, tube * Math.sin(p), rr * Math.cos(t), rr * Math.sin(t)); }; for (let i = 0; i < seg; i++) for (let j = 0; j < sides; j++) { const a = pt(i, j), b = pt(i + 1, j), c = pt(i + 1, j + 1), d = pt(i, j + 1); gizmoTri(arr, a, b, c); gizmoTri(arr, a, c, d); } }
(function buildGizmoMeshes() { for (const mode of ['move', 'rotate', 'scale']) { for (let axis = 0; axis < 3; axis++) { const arr = []; if (mode === 'move') { gizmoAddBox(arr, axis, 0.12, 0.82, 0.022, 0.022); gizmoAddCone(arr, axis, 0.82, 1.1, 0.075, 12); } else if (mode === 'scale') { gizmoAddBox(arr, axis, 0.12, 0.84, 0.022, 0.022); gizmoAddBox(arr, axis, 0.84, 1.0, 0.07, 0.07); } else { gizmoAddRing(arr, axis, 0.9, 0.03, 48, 6); } const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW); gizmoMeshes[mode][axis] = { buf: buf, count: arr.length / 3 }; } } })();
function entityRotationMatrix(e) { return multiply(multiply(rotationYMatrix(e.rot.y), rotationXMatrix(e.rot.x)), rotationZMatrix(e.rot.z)); }
function gizmoFrame(mode, axis, e) {
    const P = e._parentRot || null; let F;
    if (mode === 'scale') F = entityRotationMatrix(e);
    else if (mode === 'rotate') { if (axis === 0) F = rotationYMatrix(e.rot.y); else if (axis === 1) F = IDENTITY; else F = multiply(rotationYMatrix(e.rot.y), rotationXMatrix(e.rot.x)); }
    else return IDENTITY;
    return P ? multiply(P, F) : F;
}
function gizmoAxisDir(frame, axis) { return [frame[axis*4], frame[axis*4+1], frame[axis*4+2]]; }
function gizmoWorldScale(e) { const c = getCameraPos(); const dist = v3len([e.pos.x - c[0], e.pos.y - c[1], e.pos.z - c[2]]); return dist * Math.tan((window.fovValue || 60) * Math.PI / 360) * 0.3; }
function drawGizmo(cameraMatrix, projectionMatrix) { const e = gizmoSubject(); if (!e) return; const mode = window.currentGizmoMode || 'move'; const s = gizmoWorldScale(e); const posLoc = axisProgramInfo.attribLocations.position; const colorLoc = axisProgramInfo.attribLocations.color; gl.clear(gl.DEPTH_BUFFER_BIT); gl.useProgram(axisProgramInfo.program); gl.uniformMatrix4fv(axisProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix); gl.disableVertexAttribArray(colorLoc); for (let a = 0; a < 3; a++) { let m = multiply(cameraMatrix, translationMatrix(e.pos.x, e.pos.y, e.pos.z)); m = multiply(m, gizmoFrame(mode, a, e)); m = multiply(m, scaleMatrix(s, s, s)); gl.uniformMatrix4fv(axisProgramInfo.uniformLocations.modelViewMatrix, false, m); const active = (window.gizmoDrag && window.gizmoDrag.axis === a) || window.padAxis === a; const c = active ? GIZMO_ACTIVE : GIZMO_COLORS[a]; gl.vertexAttrib3f(colorLoc, c[0], c[1], c[2]); const mesh = gizmoMeshes[mode][a]; gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(posLoc); gl.drawArrays(gl.TRIANGLES, 0, mesh.count); } gl.enableVertexAttribArray(colorLoc); }
function rayToSegmentDist(ray, p0, p1) { const u = ray.d, v = v3sub(p1, p0), w = v3sub(ray.o, p0); const a = v3dot(u,u), b = v3dot(u,v), c = v3dot(v,v), d = v3dot(u,w), e = v3dot(v,w); const D = a*c - b*b; let tc = (D < 1e-8) ? e / c : (a*e - b*d) / D; tc = Math.min(1, Math.max(0, tc)); let sc = (b*tc - d) / a; if (sc < 0) sc = 0; return v3len(v3sub(v3add(ray.o, v3mul(u, sc)), v3add(p0, v3mul(v, tc)))); }
function rayAxisParam(ray, origin, A) { const u = ray.d, v = A, w = v3sub(ray.o, origin); const a = v3dot(u,u), b = v3dot(u,v), c = v3dot(v,v), d = v3dot(u,w), e = v3dot(v,w); const D = a*c - b*b; if (D < 1e-4) return null; return (a*e - b*d) / D; }
function pickGizmoAxis(clientX, clientY) { const e = gizmoSubject(); if (!e) return -1; const mode = window.currentGizmoMode || 'move'; const ray = screenRay(clientX, clientY); const s = gizmoWorldScale(e); const origin = [e.pos.x, e.pos.y, e.pos.z]; let best = -1, bestScore = Infinity; for (let a = 0; a < 3; a++) { const A = gizmoAxisDir(gizmoFrame(mode, a, e), a); let dist, tol; if (mode === 'rotate') { const denom = v3dot(ray.d, A); if (Math.abs(denom) < 1e-4) continue; const t = v3dot(v3sub(origin, ray.o), A) / denom; if (t <= 0) continue; const hit = v3add(ray.o, v3mul(ray.d, t)); dist = Math.abs(v3len(v3sub(hit, origin)) - 0.9 * s); tol = 0.15 * s; } else { dist = rayToSegmentDist(ray, v3add(origin, v3mul(A, 0.12 * s)), v3add(origin, v3mul(A, 1.08 * s))); tol = 0.13 * s; } if (dist < tol && dist / tol < bestScore) { bestScore = dist / tol; best = a; } } return best; }
window.gizmoDrag = null; window.padAxis = null;
function beginGizmoDrag(axis, clientX, clientY) {
    const e = gizmoSubject(); if (!e) return false;
    const mode = window.currentGizmoMode || 'move'; const ent = e._entity || e;
    const A = gizmoAxisDir(gizmoFrame(mode, axis, e), axis); const origin = [e.pos.x, e.pos.y, e.pos.z];
    const d = { axis: axis, mode: mode, A: A, origin: origin, startPos: { x: ent.pos.x, y: ent.pos.y, z: ent.pos.z }, startScale: { x: ent.scale.x, y: ent.scale.y, z: ent.scale.z }, s: gizmoWorldScale(e) };
    if (e._parentRot) d.parentInv = m3T([e._parentRot[0], e._parentRot[4], e._parentRot[8], e._parentRot[1], e._parentRot[5], e._parentRot[9], e._parentRot[2], e._parentRot[6], e._parentRot[10]]);
    if (e._multi) { d.multi = true; d.set = topmostOf(getSelection()); d.snaps = d.set.map(snapEntity); d.pivot = origin; d.total = 0; }
    if (mode === 'rotate') {
        const sp = worldToScreen(origin); if (!sp) return false;
        d.center = sp; d.lastAngle = Math.atan2(clientY - sp[1], clientX - sp[0]); // "knob" style: circle the object's screen position
    } else {
        d.t0 = rayAxisParam(screenRay(clientX, clientY), origin, A); if (d.t0 === null) return false;
    }
    window.gizmoDrag = d; return true;
}
function updateGizmoDrag(clientX, clientY) {
    const d = window.gizmoDrag; if (!d) return;
    const e = d.multi ? null : getSelection()[0]; if (!d.multi && !e) return;
    const key = ['x', 'y', 'z'][d.axis];
    if (d.mode === 'rotate') {
        const ang = Math.atan2(clientY - d.center[1], clientX - d.center[0]);
        let delta = ang - d.lastAngle; while (delta > Math.PI) delta -= Math.PI * 2; while (delta < -Math.PI) delta += Math.PI * 2;
        const c = getCameraPos(); const viewSign = v3dot(d.A, v3sub(c, d.origin)) >= 0 ? 1 : -1; d.lastAngle = ang;
        if (d.multi) { d.total += -viewSign * delta; applyGroupTransform(d.set, d.snaps, 'rotate', d.axis, d.total, d.pivot); }
        else e.rot[key] += -viewSign * delta;
    } else {
        const t = rayAxisParam(screenRay(clientX, clientY), d.origin, d.A); if (t === null) return; const delta = t - d.t0;
        if (d.multi) { applyGroupTransform(d.set, d.snaps, d.mode, d.axis, d.mode === 'move' ? delta : 1 + delta / (0.9 * d.s), d.pivot); return; }
        if (d.mode === 'move') {
            let l = [d.A[0] * delta, d.A[1] * delta, d.A[2] * delta]; if (d.parentInv) l = m3vec(d.parentInv, l); // world movement -> the parent's local space
            e.pos.x = d.startPos.x + l[0]; e.pos.y = d.startPos.y + l[1]; e.pos.z = d.startPos.z + l[2];
        } else { e.scale[key] = Math.max(0.05, d.startScale[key] * (1 + delta / (0.9 * d.s))); }
    }
}
function applyPadDelta(axis, dx) {
    const sel = getSelection(); if (!sel.length) return;
    const mode = window.currentGizmoMode || 'move';
    if (sel.length > 1) {
        const c = gizmoSubject(); const pivot = [c.pos.x, c.pos.y, c.pos.z]; const set = topmostOf(sel);
        applyGroupTransform(set, set.map(snapEntity), mode, axis, mode === 'scale' ? Math.exp(dx * 0.01) : dx * 0.01, pivot);
        return;
    }
    const e = sel[0]; const key = ['x', 'y', 'z'][axis];
    if (mode === 'move') {
        let l = [0, 0, 0]; l[axis] = dx * 0.01;
        if (e.parent) l = m3vec(m3T(rotM3Of(e.parent)), l); // along the WORLD axis, expressed in the parent's space
        e.pos.x += l[0]; e.pos.y += l[1]; e.pos.z += l[2];
    } else if (mode === 'rotate') e.rot[key] += dx * 0.01;
    else e.scale[key] = Math.max(0.05, e.scale[key] * Math.exp(dx * 0.01));
}
function buildCubeMesh() { const positions = [-0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5, -0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5, 0.5,-0.5,-0.5, -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5, -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5]; const indices = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23]; const posBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); const idxBuf = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); return { posBuf, idxBuf, triCount: indices.length }; }
function pickEntityAt(touchX, touchY) { return pickClosest(screenRay(touchX, touchY)); }


// Resize a whole imported model (every part together, all three dimensions the same) around the middle of its base.
// size is relative to the size it was imported at (1 = original).
function setModelSize(group, size) {
    const cur = group.sizeFactor || 1, ratio = size / cur; if (!group.parts.length || Math.abs(ratio - 1) < 1e-9) return;
    let sx = 0, sz = 0, minY = Infinity;
    for (const p of group.parts) { sx += p.pos.x; sz += p.pos.z; minY = Math.min(minY, p.pos.y - (p.halfSize ? p.halfSize[1] * p.scale.y : 0)); }
    const pv = [sx / group.parts.length, minY, sz / group.parts.length];
    for (const p of group.parts) {
        p.pos.x = pv[0] + (p.pos.x - pv[0]) * ratio; p.pos.y = pv[1] + (p.pos.y - pv[1]) * ratio; p.pos.z = pv[2] + (p.pos.z - pv[2]) * ratio;
        p.scale.x *= ratio; p.scale.y *= ratio; p.scale.z *= ratio;
    }
    group.sizeFactor = size;
}
function getProjectJSON() {
    const saveData = {
        version: "0.0.7",
        projectName: window.currentProjectName || "Project 1",
        environment: { 
            look: ENV.look, 
            fogColor: window.fogColor, 
            fogDensity: window.fogDensity,
            lightStrength: lightStrength,
            lightColor: lightColor,
            lightAzimuth: lightAzimuth,
            lightElevation: lightElevation,
            lightAmbient: lightAmbient
        },
        skinSettings: JSON.parse(JSON.stringify(window.skinSettings)), // Save bending styles, gap, arm drop
        skinImageData: window.currentSkinImageData || null,
        skinPose: [], // NEW: Save the pose of every joint
        objects: []
    };
    
    sceneObjects.forEach(e => {
        if (e.isGroup === true) return; 
        
        // Save the pose of skin parts
        if (e.skinPart) {
            if (e.rigKey) {
                saveData.skinPose.push({
                    rigKey: e.rigKey,
                    rot: { x: e.rot.x, y: e.rot.y, z: e.rot.z },
                    pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }
                });
            }
            return; // Don't add to the general objects array
        }

        let type = 'cube';
        if (e.isModel) type = 'glb';

        saveData.objects.push({
            name: e.name,
            type: type,
            pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, 
            rot: { x: e.rot.x, y: e.rot.y, z: e.rot.z }, 
            scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z },
            material: { type: ensureMaterial(e).type, color: ensureMaterial(e).color }
        });
    });
    return JSON.stringify(saveData);
}
function loadProjectData(data) {
    // 1. Clear current scene
    sceneObjects.length = 0;
    setSelection([], null);
    window.currentProjectName = data.projectName || "Project";

    // 2. Restore Environment & Lights
    if (data.environment) {
        applyLook(data.environment.look || 'afternoon');
        window.fogColor = data.environment.fogColor || [0.8, 0.85, 0.9];
        window.fogDensity = data.environment.fogDensity || 0;
        lightStrength = data.environment.lightStrength || 1.5;
        lightColor = data.environment.lightColor || [1,1,1];
        lightAzimuth = data.environment.lightAzimuth || 45;
        lightElevation = data.environment.lightElevation || 55;
        lightAmbient = data.environment.lightAmbient || 0.3;
        updateLightDir();
        if (typeof syncEnvUI === 'function') syncEnvUI();
    }

    // 3. Restore Skin Settings
    if (data.skinSettings && window.skinSettings) {
        Object.assign(window.skinSettings, data.skinSettings);
        
        // Update the UI sliders to match the loaded settings
        const bendSel = document.getElementById('skin-bend'); if(bendSel) bendSel.value = window.skinSettings.bend;
        const gapSl = document.getElementById('skin-gap'); if(gapSl) gapSl.value = window.skinSettings.gap;
        const dropSl = document.getElementById('skin-armdrop'); if(dropSl) dropSl.value = window.skinSettings.armDrop;
        const l2Chk = document.getElementById('skin-layer2'); if(l2Chk) l2Chk.checked = window.skinSettings.layer2;
        const l2Thick = document.getElementById('skin-l2thick'); if(l2Thick) l2Thick.value = window.skinSettings.layer2Extra;
    }

    // 4. Restore Skin (If the project had one)
    if (data.skinImageData) {
        window.currentSkinImageData = data.skinImageData;
        const img = new Image();
        img.onload = function() {
            const texture = loadTextureFromImage(img); 
            const skeleton = buildMinecraftSkeleton(window.skinSettings.armDrop === 3 ? 3 : 4); 
            
            skeleton.allParts.forEach(p => { 
                p.texture = texture; 
                sceneObjects.push(p); 
                
                // APPLY SAVED POSE TO THIS PART
                if (data.skinPose) {
                    const savedPart = data.skinPose.find(sp => sp.rigKey === p.rigKey);
                    if (savedPart) {
                        p.rot = { ...savedPart.rot };
                        // Only apply position if it's not the root, to preserve the arm drop logic
                        if (p.rigKey !== 'root') {
                            p.pos = { ...savedPart.pos }; 
                        }
                    }
                }
            });
            
            if(window.updateTreePanel) window.updateTreePanel();
        };
        img.src = data.skinImageData;
    }

    // 5. Restore Cubes
    if (data.objects) {
        data.objects.forEach(obj => {
            if (obj.type === 'cube') {
                const newCube = {
                    name: obj.name || "Cube", 
                    isTextured: false,
                    pos: { ...obj.pos }, rot: { ...obj.rot }, scale: { ...obj.scale },
                    color: obj.material ? [...obj.material.color, 1.0] : [1.0, 0.5, 0.2, 1.0]
                };
                
                const mesh = buildCubeMesh();
                newCube.posBuffer = mesh.posBuf; 
                newCube.idxBuffer = mesh.idxBuf; 
                newCube.triCount = mesh.triCount;
                newCube.material = obj.material ? makeMaterial(obj.material.type, obj.material.color) : makeMaterial('matte', [1.0, 0.5, 0.2]);
                
                sceneObjects.push(newCube);
            }
        });
    }
    
    if (window.updateTreePanel) window.updateTreePanel();
    if (typeof trace === 'function') trace("Project loaded successfully.", "success");
}