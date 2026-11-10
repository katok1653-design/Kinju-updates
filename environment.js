// =====================================================================
//  environment.js : looks (sky + sun + fog), shadows, glow lights, bloom / colour grading and dust
// =====================================================================
const ENV = {
    look: 'afternoon', autoFog: true,
    sky: { zenith: [0.20, 0.45, 0.90], horizon: [0.70, 0.82, 0.95], ground: [0.28, 0.27, 0.24] },
    vibrance: 0, exposure: 1, contrast: 1, saturation: 1,
    bloom: 0, bloomThreshold: 0.8,
    shadows: true, shadowStrength: 0.7, shadowSoft: 0.4, shadowQuality: 1024, shadowDistance: 12, shadowBias: 0.05,
    dust: 0, dustSize: 1, dustBright: 0.6,
    gridSize: 200
};
window.ENV = ENV;

const LOOKS = {
    morning:   { label: 'Morning',    zenith: [0.30,0.55,0.95], horizon: [0.80,0.88,1.00], ground: [0.30,0.32,0.30], sun: { color: [1.00,0.95,0.85], intensity: 1.6, az: 70,  el: 32 }, ambient: { color: [0.80,0.90,1.00], amount: 0.35 }, fog: { color: [0.80,0.88,0.98], density: 0.012 }, shadow: { strength: 0.6,  soft: 0.5 }, grade: { vibrance: 0.00, exposure: 1.00, contrast: 1.00, saturation: 1.00 }, bloom: { amount: 0.00, threshold: 0.85 }, dust: 0.0 },
    afternoon: { label: 'Afternoon',  zenith: [0.20,0.45,0.90], horizon: [0.70,0.82,0.95], ground: [0.28,0.27,0.24], sun: { color: [1.00,0.97,0.90], intensity: 1.9, az: 135, el: 58 }, ambient: { color: [0.90,0.95,1.00], amount: 0.30 }, fog: { color: [0.72,0.82,0.95], density: 0.008 }, shadow: { strength: 0.7,  soft: 0.4 }, grade: { vibrance: 0.00, exposure: 1.00, contrast: 1.00, saturation: 1.00 }, bloom: { amount: 0.00, threshold: 0.90 }, dust: 0.0 },
    sunset:    { label: 'Sunset',     zenith: [0.15,0.12,0.38], horizon: [1.00,0.48,0.18], ground: [0.18,0.09,0.07], sun: { color: [1.00,0.52,0.22], intensity: 1.7, az: 250, el: 7  }, ambient: { color: [1.00,0.60,0.50], amount: 0.25 }, fog: { color: [0.95,0.50,0.30], density: 0.020 }, shadow: { strength: 0.85, soft: 0.5 }, grade: { vibrance: 0.30, exposure: 1.00, contrast: 1.05, saturation: 1.10 }, bloom: { amount: 0.35, threshold: 0.75 }, dust: 0.25 },
    dawn:      { label: 'Dawn',       zenith: [0.28,0.33,0.60], horizon: [1.00,0.70,0.60], ground: [0.20,0.16,0.18], sun: { color: [1.00,0.75,0.55], intensity: 1.3, az: 80,  el: 6  }, ambient: { color: [0.90,0.75,0.85], amount: 0.30 }, fog: { color: [0.90,0.70,0.65], density: 0.020 }, shadow: { strength: 0.7,  soft: 0.5 }, grade: { vibrance: 0.20, exposure: 1.00, contrast: 1.00, saturation: 1.05 }, bloom: { amount: 0.25, threshold: 0.80 }, dust: 0.20 },
    twilight:  { label: 'Twilight',   zenith: [0.07,0.09,0.27], horizon: [0.55,0.35,0.55], ground: [0.07,0.06,0.09], sun: { color: [0.55,0.55,0.95], intensity: 0.7, az: 300, el: 10 }, ambient: { color: [0.50,0.50,0.85], amount: 0.30 }, fog: { color: [0.30,0.25,0.42], density: 0.025 }, shadow: { strength: 0.6,  soft: 0.5 }, grade: { vibrance: 0.20, exposure: 1.00, contrast: 1.05, saturation: 1.10 }, bloom: { amount: 0.35, threshold: 0.70 }, dust: 0.15 },
    midnight:  { label: 'Midnight',   zenith: [0.01,0.02,0.07], horizon: [0.05,0.08,0.18], ground: [0.02,0.02,0.04], sun: { color: [0.60,0.70,1.00], intensity: 0.6, az: 200, el: 45 }, ambient: { color: [0.30,0.40,0.70], amount: 0.22 }, fog: { color: [0.03,0.05,0.12], density: 0.020 }, shadow: { strength: 0.8,  soft: 0.4 }, grade: { vibrance: 0.10, exposure: 1.10, contrast: 1.05, saturation: 1.00 }, bloom: { amount: 0.45, threshold: 0.65 }, dust: 0.10 },
    bloodmoon: { label: 'Blood Moon', zenith: [0.12,0.00,0.02], horizon: [0.55,0.05,0.05], ground: [0.08,0.00,0.00], sun: { color: [1.00,0.15,0.10], intensity: 1.1, az: 150, el: 28 }, ambient: { color: [0.70,0.10,0.10], amount: 0.22 }, fog: { color: [0.30,0.03,0.03], density: 0.030 }, shadow: { strength: 0.9,  soft: 0.4 }, grade: { vibrance: 0.20, exposure: 1.00, contrast: 1.15, saturation: 1.10 }, bloom: { amount: 0.40, threshold: 0.70 }, dust: 0.20 },
    space:     { label: 'Space Gray', zenith: [0.02,0.02,0.03], horizon: [0.12,0.12,0.14], ground: [0.05,0.05,0.06], sun: { color: [1.00,1.00,1.00], intensity: 2.4, az: 40,  el: 30 }, ambient: { color: [0.60,0.60,0.70], amount: 0.08 }, fog: { color: [0.10,0.10,0.11], density: 0.008 }, shadow: { strength: 1.0,  soft: 0.2 }, grade: { vibrance: 0.00, exposure: 1.00, contrast: 1.20, saturation: 0.85 }, bloom: { amount: 0.15, threshold: 0.90 }, dust: 0.0 }
};

function setArr(dst, src) { for (let i = 0; i < src.length; i++) dst[i] = src[i]; }
function applyLookFog() { const L = LOOKS[ENV.look]; if (!L) return; if (!window.fogColor) window.fogColor = [0.8, 0.85, 0.9]; setArr(window.fogColor, L.fog.color); window.fogDensity = L.fog.density; syncEnvUI(); }
function applyLook(name) {
    const L = LOOKS[name]; if (!L) return;
    ENV.look = name;
    ENV.sky = { zenith: L.zenith.slice(), horizon: L.horizon.slice(), ground: L.ground.slice() };
    setArr(lightColor, L.sun.color); lightStrength = L.sun.intensity; lightAzimuth = L.sun.az; lightElevation = L.sun.el; updateLightDir();
    setArr(lightAmbientColor, L.ambient.color); lightAmbient = L.ambient.amount;
    if (ENV.autoFog) { if (!window.fogColor) window.fogColor = [0.8, 0.85, 0.9]; setArr(window.fogColor, L.fog.color); window.fogDensity = L.fog.density; }
    ENV.shadowStrength = L.shadow.strength; ENV.shadowSoft = L.shadow.soft;
    ENV.vibrance = L.grade.vibrance; ENV.exposure = L.grade.exposure; ENV.contrast = L.grade.contrast; ENV.saturation = L.grade.saturation;
    ENV.bloom = L.bloom.amount; ENV.bloomThreshold = L.bloom.threshold; ENV.dust = L.dust;
    syncEnvUI();
    trace("Environment look: " + L.label, "success");
}

function syncEnvUI() {
    if (typeof document === 'undefined') return;
    const hex = (c) => '#' + [0, 1, 2].map(i => Math.round(Math.min(1, Math.max(0, c[i])) * 255).toString(16).padStart(2, '0')).join('');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    const chk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
    set('env-select', ENV.look); chk('env-autofog', ENV.autoFog);
    set('env-vibrance', ENV.vibrance); set('env-exposure', ENV.exposure); set('env-contrast', ENV.contrast); set('env-saturation', ENV.saturation);
    set('env-bloom', ENV.bloom); set('env-bloom-thr', ENV.bloomThreshold);
    set('grid-size', ENV.gridSize); set('env-dust', ENV.dust); set('env-dust-size', ENV.dustSize); set('env-dust-bright', ENV.dustBright);
    chk('shadow-enabled', ENV.shadows); set('shadow-strength', ENV.shadowStrength); set('shadow-soft', ENV.shadowSoft);
    set('shadow-quality', ENV.shadowQuality); set('shadow-distance', ENV.shadowDistance); set('shadow-bias', ENV.shadowBias);
    set('light-strength', lightStrength); set('light-color', hex(lightColor)); set('light-azimuth', lightAzimuth); set('light-elevation', lightElevation);
    set('light-ambient', lightAmbient); set('light-ambient-color', hex(lightAmbientColor));
    if (window.fogColor) set('fog-color', hex(window.fogColor));
    set('fog-density', window.fogDensity || 0);
}

function gridState() {
    const s = ENV.gridSize; if (s === 0) return null;
    const T = window.cameraTarget || [0, 0, 0], radius = window.cameraRadius || 5;
    let half = Math.min(20000, Math.max(100, radius * 60)), limit = 0;
    if (s > 0) { limit = s / 2; half = Math.min(half, limit + 20); }
    return { half: half, limit: limit, ox: Math.round(T[0] / 10) * 10, oz: Math.round(T[2] / 10) * 10 };
}

function orthoMatrix(l, r, b, t, n, f) { return new Float32Array([2/(r-l),0,0,0, 0,2/(t-b),0,0, 0,0,-2/(f-n),0, -(r+l)/(r-l), -(t+b)/(t-b), -(f+n)/(f-n), 1]); }
function perspective90(n, f) { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,(f+n)/(n-f),-1, 0,0,(2*f*n)/(n-f),0]); }
function entityCenter(e) { const m = entityWorldMatrix(e); if (e.centerLocal) { const c = e.centerLocal; return [m[0]*c[0] + m[4]*c[1] + m[8]*c[2] + m[12], m[1]*c[0] + m[5]*c[1] + m[9]*c[2] + m[13], m[2]*c[0] + m[6]*c[1] + m[10]*c[2] + m[14]]; } const off = e.reflectOffsetY !== undefined ? e.reflectOffsetY : (e.isTextured ? e.scale.y : 0); return [m[12], m[13] + off, m[14]]; }
function isGlowLight(e) { const m = e.material; return !!(m && m.type === 'glow' && m.glow > 0.01 && (m.lightPower === undefined || m.lightPower > 0)); }
function modelMatrix(e) { return entityWorldMatrix(e); }
let envHashAcc = 0;
function hnum(v) { envHashAcc = (Math.imul(envHashAcc, 31) + Math.round(v * 1000)) | 0; }

const SH = {
    prog: null, u: {}, a: {},
    dummy2D: null, dummyCube: null,
    sunTex: null, sunFBO: null, sunDepth: null, sunSize: 0, sunVP: new Float32Array(16), sunRange: 1, sunValid: false, sunSig: '',
    cubeFBO: null, cubeDepth: null, cubeSize: 0, cubes: [null, null, null, null], cubeSigs: ['', '', '', ''], cubeValid: [false, false, false, false],
    lights: [], posArr: new Float32Array(12), colArr: new Float32Array(12), rangeArr: new Float32Array(4)
};
(function initShadows() {
    SH.prog = buildProgram(shadowVsSource, [shadowFsSource], "Shadow", "Shadow shader ready");
    SH.u = { mv: gl.getUniformLocation(SH.prog, 'uModelViewMatrix'), proj: gl.getUniformLocation(SH.prog, 'uProjectionMatrix'), mode: gl.getUniformLocation(SH.prog, 'uMode'), range: gl.getUniformLocation(SH.prog, 'uRange') };
    SH.a = { pos: gl.getAttribLocation(SH.prog, 'aPosition'), blend: gl.getAttribLocation(SH.prog, 'aBlend') };
    SH.u.bend = gl.getUniformLocation(SH.prog, 'uBend'); SH.u.bendOn = gl.getUniformLocation(SH.prog, 'uBendOn');
    SH.dummy2D = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, SH.dummy2D);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    SH.dummyCube = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, SH.dummyCube);
    gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.RGBA8, 1, 1);
    for (let f = 0; f < 6; f++) gl.texSubImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, 0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
})();

function getCasters() { const list = []; for (const e of sceneObjects) { if (e.isGroup || !e.posBuffer || !e.idxBuffer || isGlowLight(e)) continue; const m = e.material; if (m && m.opacity < 0.3) continue; list.push(e); } return list; }
function getGlowLights() { const T = window.cameraTarget || [0, 0, 0]; const cands = []; for (const e of sceneObjects) { if (!isGlowLight(e)) continue; const c = entityCenter(e); const d = (c[0]-T[0])*(c[0]-T[0]) + (c[1]-T[1])*(c[1]-T[1]) + (c[2]-T[2])*(c[2]-T[2]); cands.push({ e: e, c: c, d: d }); } cands.sort((a, b) => a.d - b.d); const lights = []; for (let i = 0; i < cands.length && i < 4; i++) { const m = cands[i].e.material; const p = m.lightPower === undefined ? 1.5 : m.lightPower; lights.push({ entity: cands[i].e, pos: cands[i].c, color: [m.color[0] * p, m.color[1] * p, m.color[2] * p], range: Math.max(0.5, m.glowRadius || 5.0) }); } return lights; }
function casterHash(casters) { envHashAcc = sceneObjects.length; const ss = window.skinSettings; if (ss) { hnum(ss.bend === 'fold' ? 0 : ss.bend === 'spring' ? 1 : 2); hnum(ss.gap); hnum(ss.armDrop); } for (const e of sceneObjects) { hnum(e.pos.x); hnum(e.pos.y); hnum(e.pos.z); hnum(e.rot.x); hnum(e.rot.y); hnum(e.rot.z); hnum(e.scale.x); hnum(e.scale.y); hnum(e.scale.z); hnum(e.triCount || 0); } return envHashAcc; }

function ensureSunMap(size) { if (SH.sunTex && SH.sunSize === size) return; if (SH.sunTex) { gl.deleteTexture(SH.sunTex); gl.deleteFramebuffer(SH.sunFBO); gl.deleteRenderbuffer(SH.sunDepth); } SH.sunTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, SH.sunTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_2D, null); SH.sunDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, SH.sunDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size); SH.sunFBO = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, SH.sunFBO); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, SH.sunTex, 0); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, SH.sunDepth); gl.bindFramebuffer(gl.FRAMEBUFFER, null); SH.sunSize = size; SH.sunSig = ''; }
function ensureCubes(size) { if (SH.cubeSize !== size) { for (let i = 0; i < 4; i++) { if (SH.cubes[i]) { gl.deleteTexture(SH.cubes[i]); SH.cubes[i] = null; SH.cubeSigs[i] = ''; SH.cubeValid[i] = false; } } if (SH.cubeFBO) { gl.deleteFramebuffer(SH.cubeFBO); gl.deleteRenderbuffer(SH.cubeDepth); } SH.cubeDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, SH.cubeDepth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size); SH.cubeFBO = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, SH.cubeFBO); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, SH.cubeDepth); gl.bindFramebuffer(gl.FRAMEBUFFER, null); SH.cubeSize = size; } }
function makeCube(size) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, t); gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.RGBA8, size, size); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE); gl.bindTexture(gl.TEXTURE_CUBE_MAP, null); return t; }
function drawCasterDepth(entity, viewMatrix) { gl.uniformMatrix4fv(SH.u.mv, false, multiply(viewMatrix, modelMatrix(entity))); const bendM = (entity.bend && window.skinSettings && window.skinSettings.bend === 'spring') ? computeBendMatrix(entity) : null; gl.uniform1f(SH.u.bendOn, bendM ? 1 : 0); if (bendM) gl.uniformMatrix4fv(SH.u.bend, false, bendM); gl.bindBuffer(gl.ARRAY_BUFFER, entity.posBuffer); gl.vertexAttribPointer(SH.a.pos, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(SH.a.pos); if (SH.a.blend >= 0) { if (entity.blendBuffer) { gl.bindBuffer(gl.ARRAY_BUFFER, entity.blendBuffer); gl.vertexAttribPointer(SH.a.blend, 1, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(SH.a.blend); } else { gl.disableVertexAttribArray(SH.a.blend); gl.vertexAttrib1f(SH.a.blend, 0); } } gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entity.idxBuffer); gl.drawElements(gl.TRIANGLES, entity.triCount, entity.indexType || gl.UNSIGNED_SHORT, 0); }
function depthPassState() { gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.clearColor(1, 1, 1, 1); }
function renderSunMap(casters, view, proj) { gl.bindFramebuffer(gl.FRAMEBUFFER, SH.sunFBO); gl.viewport(0, 0, SH.sunSize, SH.sunSize); depthPassState(); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(SH.prog); gl.uniformMatrix4fv(SH.u.proj, false, proj); gl.uniform1f(SH.u.mode, 0); gl.uniform1f(SH.u.range, 1); for (const e of casters) drawCasterDepth(e, view); }
function renderCubeMap(i, light, casters) { if (!SH.cubes[i]) SH.cubes[i] = makeCube(SH.cubeSize); gl.bindFramebuffer(gl.FRAMEBUFFER, SH.cubeFBO); gl.viewport(0, 0, SH.cubeSize, SH.cubeSize); depthPassState(); gl.useProgram(SH.prog); gl.uniformMatrix4fv(SH.u.proj, false, perspective90(0.05, light.range)); gl.uniform1f(SH.u.mode, 1); gl.uniform1f(SH.u.range, light.range); for (let f = 0; f < 6; f++) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, SH.cubes[i], 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); const view = faceViewMatrix(CUBE_FACES[f], light.pos); for (const e of casters) drawCasterDepth(e, view); } }
function updateShadows() {
    SH.lights = getGlowLights(); for (let i = 0; i < 4; i++) SH.cubeValid[i] = false; SH.sunValid = false;
    SH.posArr.fill(0); SH.colArr.fill(0); SH.rangeArr.fill(1); SH.lights.forEach((l, i) => { SH.posArr.set(l.pos, i * 3); SH.colArr.set(l.color, i * 3); SH.rangeArr[i] = l.range; });
    if (!ENV.shadows || (window.viewMode && window.viewMode !== 1 && window.viewMode !== 3)) return;
     const casters = getCasters(); const ch = casterHash(casters);
     // ...
    if (lightElevation > 0.5) { ensureSunMap(ENV.shadowQuality); const E = ENV.shadowDistance; const dir = v3norm(lightDir), f = [-dir[0], -dir[1], -dir[2]]; const up = Math.abs(dir[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0]; const s = v3norm(v3cross(f, up)), u = v3cross(s, f); const T = window.cameraTarget || [0, 0, 0]; const texel = 2 * E / SH.sunSize; const cs = Math.round(v3dot(T, s) / texel) * texel, cu = Math.round(v3dot(T, u) / texel) * texel, cf = v3dot(T, f); const center = v3add(v3add(v3mul(s, cs), v3mul(u, cu)), v3mul(f, cf)); const eye = v3sub(center, v3mul(f, 2 * E)); const view = faceViewMatrix({ f: f, u: up }, eye), proj = orthoMatrix(-E, E, -E, E, 0.1, 4 * E); SH.sunVP = multiply(proj, view); SH.sunRange = 4 * E - 0.1; const sig = ch + '|' + SH.sunSize + '|' + E + '|' + lightAzimuth + ',' + lightElevation + '|' + cs.toFixed(3) + ',' + cu.toFixed(3); if (sig !== SH.sunSig) { renderSunMap(casters, view, proj); SH.sunSig = sig; } SH.sunValid = true; }
    if (SH.lights.length) { ensureCubes(Math.max(256, Math.min(1024, ENV.shadowQuality / 2))); SH.lights.forEach((l, i) => { const sig = ch + '|' + SH.cubeSize + '|' + l.range + '|' + Math.round(l.pos[0] * 1000) + ',' + Math.round(l.pos[1] * 1000) + ',' + Math.round(l.pos[2] * 1000); if (sig !== SH.cubeSigs[i] || !SH.cubes[i]) { renderCubeMap(i, l, casters); SH.cubeSigs[i] = sig; } SH.cubeValid[i] = true; }); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function bindShadowTextures() { gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, SH.sunValid ? SH.sunTex : SH.dummy2D); for (let i = 0; i < 4; i++) { gl.activeTexture(gl.TEXTURE3 + i); gl.bindTexture(gl.TEXTURE_CUBE_MAP, (SH.cubeValid[i] && SH.cubes[i]) ? SH.cubes[i] : SH.dummyCube); } gl.activeTexture(gl.TEXTURE0); }
function applyEnvUniforms(pInfo, cameraMatrix) { const u = pInfo.lit; if (!u) return; const m = cameraMatrix; const tx = m[12], ty = m[13], tz = m[14]; gl.uniform3f(u.camPos, -(m[0]*tx + m[1]*ty + m[2]*tz), -(m[4]*tx + m[5]*ty + m[6]*tz), -(m[8]*tx + m[9]*ty + m[10]*tz)); gl.uniform3fv(u.skyZenith, ENV.sky.zenith); gl.uniform3fv(u.skyHorizon, ENV.sky.horizon); gl.uniform3fv(u.skyGround, ENV.sky.ground); gl.uniform1f(u.shadowOn, ENV.shadows ? 1 : 0); gl.uniform1f(u.shadowStrength, ENV.shadowStrength); gl.uniform1f(u.shadowSoft, ENV.shadowSoft); gl.uniform1f(u.shadowBias, ENV.shadowBias); gl.uniform1f(u.sunShadowOn, SH.sunValid ? 1 : 0); gl.uniformMatrix4fv(u.sunVP, false, SH.sunVP); gl.uniform1f(u.sunRange, SH.sunRange); gl.uniform1i(u.sunShadow, 2); gl.uniform1i(u.ps0, 3); gl.uniform1i(u.ps1, 4); gl.uniform1i(u.ps2, 5); gl.uniform1i(u.ps3, 6); gl.uniform1i(u.plCount, SH.lights.length); gl.uniform3fv(u.plPos, SH.posArr); gl.uniform3fv(u.plColor, SH.colArr); gl.uniform1fv(u.plRange, SH.rangeArr); }

const SKY = {};
(function initSky() {
    SKY.prog = buildProgram(fullscreenVsSource, [skyFsSource], "Sky", "Sky shader ready");
    const names = ['uCamRot', 'uTanHalf', 'uAspect', 'uSkyZenith', 'uSkyHorizon', 'uSkyGround', 'uSunDir', 'uLightColor', 'uLightStrength', 'uViewMode']; // <--- ADDED uViewMode
    SKY.u = {}; names.forEach(n => SKY.u[n] = gl.getUniformLocation(SKY.prog, n));
})();
function drawSky(cameraMatrix) {
    const m = cameraMatrix, u = SKY.u;
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND);
    gl.useProgram(SKY.prog);
    gl.uniformMatrix3fv(u.uCamRot, false, new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]));
    gl.uniform1f(u.uTanHalf, Math.tan((window.fovValue || 60) * Math.PI / 360)); gl.uniform1f(u.uAspect, canvas.width / canvas.height);
    gl.uniform3fv(u.uSkyZenith, ENV.sky.zenith); gl.uniform3fv(u.uSkyHorizon, ENV.sky.horizon); gl.uniform3fv(u.uSkyGround, ENV.sky.ground);
    gl.uniform3fv(u.uSunDir, lightDir); gl.uniform3fv(u.uLightColor, lightColor); gl.uniform1f(u.uLightStrength, lightStrength);
    if (u.uViewMode) gl.uniform1i(u.uViewMode, window.viewMode || 1); // <--- ADDED THIS
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
}

const DUST = { max: 2500 };
(function initDust() { DUST.prog = buildProgram(dustVsSource, [dustFsSource], "Dust", "Dust shader ready"); const names = ['uView', 'uProj', 'uCenter', 'uBox', 'uTime', 'uSize', 'uMaxSize', 'uFogDensity', 'uColor', 'uOpacity']; DUST.u = {}; names.forEach(n => DUST.u[n] = gl.getUniformLocation(DUST.prog, n)); DUST.a = gl.getAttribLocation(DUST.prog, 'aSeed'); const seeds = new Float32Array(DUST.max * 4); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random(); DUST.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, DUST.buf); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW); const r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); DUST.maxSize = Math.max(2, Math.min(28, r ? r[1] : 8)); })();
function drawDust(cameraMatrix, projectionMatrix) { if (ENV.dust <= 0.001 || DUST.a < 0) return; const n = Math.max(1, Math.floor(DUST.max * ENV.dust)); const u = DUST.u; gl.useProgram(DUST.prog); gl.uniformMatrix4fv(u.uView, false, cameraMatrix); gl.uniformMatrix4fv(u.uProj, false, projectionMatrix); gl.uniform3fv(u.uCenter, window.cameraTarget || [0, 1, 0]); gl.uniform1f(u.uBox, Math.max(8, (window.cameraRadius || 5) * 3)); gl.uniform1f(u.uTime, performance.now() / 1000); gl.uniform1f(u.uSize, ENV.dustSize); gl.uniform1f(u.uMaxSize, DUST.maxSize); gl.uniform1f(u.uFogDensity, window.fogDensity || 0); gl.uniform3f(u.uColor, 0.5 + 0.5 * lightColor[0], 0.5 + 0.5 * lightColor[1], 0.5 + 0.5 * lightColor[2]); gl.uniform1f(u.uOpacity, ENV.dustBright); gl.bindBuffer(gl.ARRAY_BUFFER, DUST.buf); gl.vertexAttribPointer(DUST.a, 4, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(DUST.a); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false); gl.drawArrays(gl.POINTS, 0, n); gl.depthMask(true); gl.disable(gl.BLEND); gl.disableVertexAttribArray(DUST.a); }

const POST = { w: 0, h: 0, active: false, msaaFBO: null, msaaColor: null, msaaDepth: null, scene: null, half: [null, null], quarter: [null, null], progs: {} };
(function initPost() { POST.progs.bright = buildProgram(fullscreenVsSource, [brightFsSource], "Bloom", "Bloom shader ready"); POST.progs.blur = buildProgram(fullscreenVsSource, [blurFsSource], "Blur", null); POST.progs.comp = buildProgram(fullscreenVsSource, [compositeFsSource], "Grade", "Colour grading shader ready"); const U = (p, names) => { const o = {}; names.forEach(n => o[n] = gl.getUniformLocation(p, n)); return o; }; POST.u = { bright: U(POST.progs.bright, ['uScene', 'uThreshold']), blur: U(POST.progs.blur, ['uTex', 'uDir']), comp: U(POST.progs.comp, ['uScene', 'uBloomA', 'uBloomB', 'uBloom', 'uExposure', 'uContrast', 'uSaturation', 'uVibrance']) }; })();
function postNeeded() { return ENV.bloom > 0.001 || Math.abs(ENV.exposure - 1) > 0.001 || Math.abs(ENV.contrast - 1) > 0.001 || Math.abs(ENV.saturation - 1) > 0.001 || Math.abs(ENV.vibrance) > 0.001; }
function makeTarget(w, h, withDepth) { const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); const fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); let depth = null; if (withDepth) { depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth); } gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null); return { tex: tex, fbo: fbo, depth: depth, w: w, h: h }; }
function freeTarget(t) { if (!t) return; gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); if (t.depth) gl.deleteRenderbuffer(t.depth); }
function ensurePostTargets(w, h) { if (POST.w === w && POST.h === h && POST.scene) return; freeTarget(POST.scene); POST.half.forEach(freeTarget); POST.quarter.forEach(freeTarget); if (POST.msaaFBO) { gl.deleteFramebuffer(POST.msaaFBO); gl.deleteRenderbuffer(POST.msaaColor); gl.deleteRenderbuffer(POST.msaaDepth); POST.msaaFBO = null; } POST.scene = makeTarget(w, h, true); const hw = Math.max(1, Math.ceil(w / 2)), hh = Math.max(1, Math.ceil(h / 2)), qw = Math.max(1, Math.ceil(w / 4)), qh = Math.max(1, Math.ceil(h / 4)); POST.half = [makeTarget(hw, hh, false), makeTarget(hw, hh, false)]; POST.quarter = [makeTarget(qw, qh, false), makeTarget(qw, qh, false)]; const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) || 0); if (samples > 1) { POST.msaaColor = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, POST.msaaColor); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, w, h); POST.msaaDepth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, POST.msaaDepth); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h); POST.msaaFBO = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, POST.msaaFBO); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, POST.msaaColor); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, POST.msaaDepth); if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) { gl.deleteFramebuffer(POST.msaaFBO); gl.deleteRenderbuffer(POST.msaaColor); gl.deleteRenderbuffer(POST.msaaDepth); POST.msaaFBO = null; trace("Anti-aliased post buffer unavailable, using a plain one.", "warning"); } gl.bindFramebuffer(gl.FRAMEBUFFER, null); } POST.w = w; POST.h = h; }
function beginScene() { const w = canvas.width, h = canvas.height; if (postNeeded()) { ensurePostTargets(w, h); POST.active = true; gl.bindFramebuffer(gl.FRAMEBUFFER, POST.msaaFBO || POST.scene.fbo); } else { POST.active = false; gl.bindFramebuffer(gl.FRAMEBUFFER, null); } gl.viewport(0, 0, w, h); return POST.active; }
function fullscreenPass(target, w, h) { gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null); gl.viewport(0, 0, w, h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function texUnit(unit, tex) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); }
function endScene() { const w = canvas.width, h = canvas.height; if (!POST.active) { gl.viewport(0, 0, w, h); return; } gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(true); if (POST.msaaFBO) { gl.bindFramebuffer(gl.READ_FRAMEBUFFER, POST.msaaFBO); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, POST.scene.fbo); gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST); gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null); } const bloomOn = ENV.bloom > 0.001; const hA = POST.half[0], hB = POST.half[1], qA = POST.quarter[0], qB = POST.quarter[1]; if (bloomOn) { gl.useProgram(POST.progs.bright); texUnit(0, POST.scene.tex); gl.uniform1i(POST.u.bright.uScene, 0); gl.uniform1f(POST.u.bright.uThreshold, ENV.bloomThreshold); fullscreenPass(hA, hA.w, hA.h); gl.useProgram(POST.progs.blur); gl.uniform1i(POST.u.blur.uTex, 0); texUnit(0, hA.tex); gl.uniform2f(POST.u.blur.uDir, 1 / hA.w, 0); fullscreenPass(hB, hB.w, hB.h); texUnit(0, hB.tex); gl.uniform2f(POST.u.blur.uDir, 0, 1 / hB.h); fullscreenPass(hA, hA.w, hA.h); texUnit(0, hA.tex); gl.uniform2f(POST.u.blur.uDir, 1 / hA.w, 0); fullscreenPass(qA, qA.w, qA.h); texUnit(0, qA.tex); gl.uniform2f(POST.u.blur.uDir, 0, 1 / qA.h); fullscreenPass(qB, qB.w, qB.h); texUnit(0, qB.tex); gl.uniform2f(POST.u.blur.uDir, 1 / qB.w, 0); fullscreenPass(qA, qA.w, qA.h); texUnit(0, qA.tex); gl.uniform2f(POST.u.blur.uDir, 0, 1 / qA.h); fullscreenPass(qB, qB.w, qB.h); } gl.useProgram(POST.progs.comp); texUnit(0, POST.scene.tex); texUnit(1, hA.tex); texUnit(2, qB.tex); gl.uniform1i(POST.u.comp.uScene, 0); gl.uniform1i(POST.u.comp.uBloomA, 1); gl.uniform1i(POST.u.comp.uBloomB, 2); gl.uniform1f(POST.u.comp.uBloom, bloomOn ? ENV.bloom : 0); gl.uniform1f(POST.u.comp.uExposure, ENV.exposure); gl.uniform1f(POST.u.comp.uContrast, ENV.contrast); gl.uniform1f(POST.u.comp.uSaturation, ENV.saturation); gl.uniform1f(POST.u.comp.uVibrance, ENV.vibrance); fullscreenPass(null, w, h); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null); gl.enable(gl.DEPTH_TEST); }

function sceneFingerprint() {
    envHashAcc = sceneObjects.length;
    for (const e of sceneObjects) { hnum(e.pos.x); hnum(e.pos.y); hnum(e.pos.z); hnum(e.rot.x); hnum(e.rot.y); hnum(e.rot.z); hnum(e.scale.x); hnum(e.scale.y); hnum(e.scale.z); const m = e.material; if (m) { hnum(m.color[0]); hnum(m.color[1]); hnum(m.color[2]); hnum(m.opacity); hnum(m.glow); hnum(m.gloss); hnum(m.metal); hnum(m.reflect); hnum(MATERIAL_TYPES[m.type].index); } hnum(e.textureHidden ? 1 : 0); }
    { const ss = window.skinSettings; if (ss) { hnum(ss.bend === 'fold' ? 0 : ss.bend === 'spring' ? 1 : 2); hnum(ss.gap); hnum(ss.layer2 ? 1 : 0); } }
    hnum(lightStrength); hnum(lightAzimuth); hnum(lightElevation); hnum(lightAmbient); hnum(lightColor[0]); hnum(lightColor[1]); hnum(lightColor[2]);
    hnum(ENV.sky.zenith[0] + ENV.sky.horizon[1] + ENV.sky.ground[2]); hnum(ENV.shadows ? ENV.shadowStrength : -1); hnum(window.fogDensity || 0); hnum(SH.lights.length);
    return envHashAcc;
}
window.applyEnvironment = applyLook;