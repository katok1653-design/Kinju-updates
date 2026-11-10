// =====================================================================
//  render.js : reflections, drawing objects, the frame pipeline
//  Frame order:  shadows -> reflections -> sky -> world -> dust -> bloom/grading -> gizmo
// =====================================================================

const REFLECT_MAX = 4;
const CUBE_FACES = [
    { f: [1, 0, 0],  u: [0, -1, 0] }, { f: [-1, 0, 0], u: [0, -1, 0] },
    { f: [0, 1, 0],  u: [0, 0, 1] },  { f: [0, -1, 0], u: [0, 0, -1] },
    { f: [0, 0, 1],  u: [0, -1, 0] }, { f: [0, 0, -1], u: [0, -1, 0] }
];
const reflectProj = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,(5000+0.05)/(0.05-5000),-1, 0,0,(2*5000*0.05)/(0.05-5000),0]);
let envFBO = null, envDepthRB = null, envTargetSize = 0, reflectionsBroken = false;

const envDummyTex = (function () {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, t); gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.RGBA8, 1, 1);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null); return t;
})();

function faceViewMatrix(face, eye) {
    const f = face.f, s = v3norm(v3cross(f, face.u)), u = v3cross(s, f);
    return new Float32Array([ s[0], u[0], -f[0], 0, s[1], u[1], -f[1], 0, s[2], u[2], -f[2], 0, -v3dot(s, eye), -v3dot(u, eye), v3dot(f, eye), 1 ]);
}

function ensureEnv(entity, size) {
    if (entity.env && entity.env.size === size) return entity.env;
    if (entity.env) gl.deleteTexture(entity.env.tex);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
    gl.texStorage2D(gl.TEXTURE_CUBE_MAP, Math.floor(Math.log2(size)) + 1, gl.RGBA8, size, size);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    entity.env = { tex: tex, size: size, ready: false, sig: null };
    return entity.env;
}

function releaseEnv(entity) { if (entity.env) { gl.deleteTexture(entity.env.tex); entity.env = null; } }

function ensureEnvTarget(size) {
    if (envFBO && envTargetSize === size) return;
    if (!envFBO) { envFBO = gl.createFramebuffer(); envDepthRB = gl.createRenderbuffer(); }
    gl.bindRenderbuffer(gl.RENDERBUFFER, envDepthRB); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);
    gl.bindFramebuffer(gl.FRAMEBUFFER, envFBO); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, envDepthRB);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); envTargetSize = size;
}

function renderReflection(entity) {
    const size = window.reflectionSize || 256;
    const env = ensureEnv(entity, size); ensureEnvTarget(size);
    const eye = entityCenter(entity);
    gl.bindFramebuffer(gl.FRAMEBUFFER, envFBO); gl.viewport(0, 0, size, size);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
    for (let f = 0; f < 6; f++) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, env.tex, 0);
        if (f === 0 && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            reflectionsBroken = true; trace("Reflection buffer unsupported on this device; using sky reflections.", "error");
            gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); releaseEnv(entity); return;
        }
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawWorld(faceViewMatrix(CUBE_FACES[f], eye), reflectProj, entity, true, eye);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_CUBE_MAP, env.tex); gl.generateMipmap(gl.TEXTURE_CUBE_MAP); gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    env.ready = true;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

function bindEnvironment(pInfo, entity, noEnv) {
    const u = pInfo.lit; if (!u) return; const env = (!noEnv && entity.env && entity.env.ready) ? entity.env : null;
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_CUBE_MAP, env ? env.tex : envDummyTex);
    gl.uniform1i(u.envMap, 1); gl.uniform1f(u.envOn, env ? 1 : 0); gl.uniform1f(u.envMaxLod, env ? Math.floor(Math.log2(env.size)) : 0);
    gl.activeTexture(gl.TEXTURE0);
}

function drawTexturedNode(entity, matrix) {
    const pi = skinProgramInfo, nLoc = pi.attribLocations.normal, bLoc = pi.attribLocations.blend, ul = pi.uniformLocations, ss = window.skinSettings;
    const bendM = (entity.bend && ss && ss.bend === 'spring') ? computeBendMatrix(entity) : null;
    gl.uniform1f(ul.bendOn, bendM ? 1 : 0); if (bendM) gl.uniformMatrix4fv(ul.bend, false, bendM);
    const skinTex = (entity.textureHidden && typeof glbGetWhiteTexture === 'function') ? glbGetWhiteTexture() : entity.texture;
    gl.uniform1i(ul.texture, 0); gl.uniformMatrix4fv(ul.modelViewMatrix, false, matrix);
    gl.uniform1f(ul.inflate, 0);
    if (entity.normalBuffer && nLoc >= 0) { gl.uniform1f(pi.lit.useNormals, 1); gl.uniformMatrix3fv(ul.normalMatrix, false, normalMatrix3(matrix)); }
    else gl.uniform1f(pi.lit.useNormals, 0);
    const drawMesh = (mesh) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.posBuffer); gl.vertexAttribPointer(pi.attribLocations.position, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(pi.attribLocations.position);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uvBuffer); gl.vertexAttribPointer(pi.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(pi.attribLocations.texCoord);
        if (mesh.normalBuffer && nLoc >= 0) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer); gl.vertexAttribPointer(nLoc, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(nLoc); }
        else if (nLoc >= 0) { gl.disableVertexAttribArray(nLoc); gl.vertexAttrib3f(nLoc, 0, 1, 0); }
        if (mesh.blendBuffer && bLoc >= 0) { gl.bindBuffer(gl.ARRAY_BUFFER, mesh.blendBuffer); gl.vertexAttribPointer(bLoc, 1, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(bLoc); }
        else if (bLoc >= 0) { gl.disableVertexAttribArray(bLoc); gl.vertexAttrib1f(bLoc, 0); }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idxBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.triCount, mesh.indexType || gl.UNSIGNED_SHORT, 0);
    };
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, skinTex);
    drawMesh(entity);
    const P = window.PAINT;
    if (entity.layer3 && P && P.visible && P.hasContent && P.tex) {
        const wasBlend = gl.isEnabled(gl.BLEND), wasDepthWrite = gl.getParameter(gl.DEPTH_WRITEMASK);
        gl.bindTexture(gl.TEXTURE_2D, P.tex); gl.uniform1f(pi.lit.pixelClean, 0);
        gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
        drawMesh(entity.layer3);
        gl.disable(gl.POLYGON_OFFSET_FILL); gl.depthMask(wasDepthWrite); if (!wasBlend) gl.disable(gl.BLEND);
        gl.bindTexture(gl.TEXTURE_2D, skinTex); gl.uniform1f(pi.lit.pixelClean, (entity.material && entity.material.pixelClean) ? 1 : 0);
    }
    if (entity.layer2 && !(ss && ss.layer2 === false)) {
        gl.uniform1f(ul.inflate, ((ss && ss.layer2Extra) || 0) / 16);
        drawMesh(entity.layer2);
        gl.uniform1f(ul.inflate, 0);
    }
}

function drawSolidColorNode(entity, matrix) {
    gl.bindBuffer(gl.ARRAY_BUFFER, entity.posBuffer); gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entity.idxBuffer); gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, matrix);
    gl.uniform1f(programInfo.lit.useNormals, 0);
    gl.drawElements(gl.TRIANGLES, entity.triCount, gl.UNSIGNED_SHORT, 0);
}

function drawEntity(entity, cameraMatrix, projectionMatrix, opts, parentMatrix) {
    if (!entity.posBuffer || entity.triCount === 0) return; 
    opts = opts || {}; const glowAmount = opts.glowAmount || 0;
    let m = multiply(parentMatrix ? parentMatrix : IDENTITY, entityLocalMatrix(entity));
    if (glowAmount > 0) m = multiply(m, scaleMatrix(1.03, 1.03, 1.03));
    const modelViewMatrix = multiply(cameraMatrix, m);
    
    const pInfo = entity.isTextured ? skinProgramInfo : programInfo;
    gl.useProgram(pInfo.program);
    gl.uniformMatrix4fv(pInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    if (pInfo._pass !== window.__passId) { applyLight(pInfo, cameraMatrix); applyEnvUniforms(pInfo, cameraMatrix); pInfo._pass = window.__passId; }
    
    // --- VIEW MODE UNIFORMS ---
    if (pInfo.lit.viewMode) gl.uniform1i(pInfo.lit.viewMode, window.viewMode || 1); 
    if (pInfo.lit.objectType) {
        let objType = 0;
        if (entity.skinPart) objType = 2;
        else if (entity.isModel) objType = 1;
        gl.uniform1i(pInfo.lit.objectType, objType);
    }

    const u = pInfo.lit;
    if (glowAmount > 0) {
        gl.uniform1i(u.matType, 11); gl.uniform3f(u.tint, 0.2, 1.0, 0.2); gl.uniform1f(u.glow, glowAmount * 2.0); gl.uniform1f(u.opacity, glowAmount);
        gl.uniform1i(u.emitMode, 0); gl.uniform1f(u.pixelClean, 0);
    } else { applyMaterial(pInfo, entity); }
    bindEnvironment(pInfo, entity, opts.noEnv || glowAmount > 0);
    if (entity.isTextured) drawTexturedNode(entity, modelViewMatrix); else drawSolidColorNode(entity, modelViewMatrix);
}

function renderHierarchy(entity, parentMatrix, cameraMatrix, projectionMatrix, reflecting) {
    drawEntity(entity, cameraMatrix, projectionMatrix, { noEnv: reflecting }, parentMatrix);
    const localM = multiply(parentMatrix ? parentMatrix : IDENTITY, entityLocalMatrix(entity));
    if (entity.children) { for (const child of entity.children) { renderHierarchy(child, localM, cameraMatrix, projectionMatrix, reflecting); } }
}

function drawTransparentHierarchy(entity, pM, cameraMatrix, projectionMatrix, reflecting) {
    const glowing = ensureMaterial(entity).type === 'glow';
    window.currentEmitMode = glowing ? 2 : 0;
    gl.cullFace(gl.FRONT); drawEntity(entity, cameraMatrix, projectionMatrix, { noEnv: reflecting }, pM);
    gl.cullFace(gl.BACK);  drawEntity(entity, cameraMatrix, projectionMatrix, { noEnv: reflecting }, pM);
    if (glowing) {
        window.currentEmitMode = 1; gl.blendFunc(gl.ONE, gl.ONE); drawEntity(entity, cameraMatrix, projectionMatrix, { noEnv: true }, pM);
        if (reflecting) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }
    window.currentEmitMode = 0;
    const localM = multiply(pM ? pM : IDENTITY, entityLocalMatrix(entity));
    if (entity.children) { for (const child of entity.children) { drawTransparentHierarchy(child, localM, cameraMatrix, projectionMatrix, reflecting); } }
}

function drawWorld(cameraMatrix, projectionMatrix, exclude, reflecting, eyePos) {
    window.__passId = (window.__passId || 0) + 1;
    bindShadowTextures();
    
    const setBlend = () => {
        gl.enable(gl.BLEND);
        if (reflecting) gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    };

    let G = gridState();
    if (!G && window.exporting && ENV.shadows) { const keep = ENV.gridSize; ENV.gridSize = -1; G = gridState(); ENV.gridSize = keep; }
    if (G) {
        gl.useProgram(gridProgramInfo.program);
        const gu = gridProgramInfo.uniformLocations;
        gl.uniformMatrix4fv(gu.projectionMatrix, false, projectionMatrix); gl.uniformMatrix4fv(gu.modelViewMatrix, false, cameraMatrix);
        gl.uniform3fv(gu.fogColor, window.fogColor); gl.uniform1f(gu.fogDensity, window.fogDensity);
        gl.uniform1f(gu.showLines, window.exporting ? 0 : 1); gl.uniform2f(gu.gridOffset, G.ox, G.oz); gl.uniform1f(gu.gridHalf, G.half); gl.uniform1f(gu.gridLimit, G.limit);
        applyEnvUniforms(gridProgramInfo, cameraMatrix);
        
        if (gridProgramInfo.lit.viewMode) gl.uniform1i(gridProgramInfo.lit.viewMode, window.viewMode || 1); 

        gl.bindBuffer(gl.ARRAY_BUFFER, gridPosBuffer); gl.vertexAttribPointer(gridProgramInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(gridProgramInfo.attribLocations.position);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIdxBuffer);
        setBlend(); gl.depthMask(false);
        gl.drawElements(gl.TRIANGLES, gridTriCount, gl.UNSIGNED_SHORT, 0);
        gl.depthMask(true); gl.disable(gl.BLEND);
    }

    gl.useProgram(axisProgramInfo.program);
    gl.uniformMatrix4fv(axisProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix); gl.uniformMatrix4fv(axisProgramInfo.uniformLocations.modelViewMatrix, false, cameraMatrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, axisPosBuffer); gl.vertexAttribPointer(axisProgramInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(axisProgramInfo.attribLocations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer); gl.vertexAttribPointer(axisProgramInfo.attribLocations.color, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(axisProgramInfo.attribLocations.color);
    if (!window.exporting) gl.drawArrays(gl.LINES, 0, axisVertexCount);

    const opaqueList = [], clearList = [];
    for (const entity of sceneObjects) {
        if (entity === exclude || entity.isGroup) continue;
        (isTransparentMaterial(ensureMaterial(entity)) ? clearList : opaqueList).push(entity);
        if (!reflecting && entity.triCount) window.totalTriangles += (entity.triCount + (entity.layer2 ? entity.layer2.triCount : 0)) / 3;
    }
    
    window.currentEmitMode = 0;
    for (const entity of opaqueList) { if (!entity.parent) renderHierarchy(entity, IDENTITY, cameraMatrix, projectionMatrix, reflecting); }

    if (!reflecting && !window.exporting && window.selectionGlow > 0) {
        const sel = getSelection();
        if (sel.length) {
            setBlend(); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
            const targets = []; const addT = (e) => { if (e.posBuffer && e.triCount > 0) targets.push(e); else if (e.children) e.children.forEach(addT); }; sel.forEach(addT);
            for (const e of targets) drawEntity(e, cameraMatrix, projectionMatrix, { glowAmount: window.selectionGlow, noEnv: true }, e.parent ? entityWorldMatrix(e.parent) : IDENTITY);
            gl.depthMask(true); gl.disable(gl.BLEND);
        }
    }

    if (clearList.length) {
        const d2 = (en) => { const dx = en.pos.x - eyePos[0], dy = en.pos.y - eyePos[1], dz = en.pos.z - eyePos[2]; return dx*dx + dy*dy + dz*dz; };
        clearList.sort((p, q) => d2(q) - d2(p)); 
        setBlend(); gl.depthMask(false); gl.enable(gl.CULL_FACE);
        for (const entity of clearList) { if (!entity.parent) drawTransparentHierarchy(entity, IDENTITY, cameraMatrix, projectionMatrix, reflecting); }
        gl.disable(gl.CULL_FACE); gl.depthMask(true); gl.disable(gl.BLEND);
    }
}

function selectionBounds() {
    const sel = getSelection(); if (!sel.length) return null;
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const e of sel) {
        if (!e.pos) continue;
        const c = entityCenter(e), sMax = Math.max(e.scale.x, e.scale.y, e.scale.z);
        const r = e.pickRadius ? e.pickRadius * sMax : (e.isTextured ? 1.1 : 0.87) * sMax;
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], c[k] - r); mx[k] = Math.max(mx[k], c[k] + r); }
    }
    if (mn[0] === Infinity) return null;
    const center = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const radius = 0.5 * Math.sqrt((mx[0]-mn[0])*(mx[0]-mn[0]) + (mx[1]-mn[1])*(mx[1]-mn[1]) + (mx[2]-mn[2])*(mx[2]-mn[2]));
    return { center: center, radius: Math.max(0.05, radius) };
}

function locateSelection() {
    const b = selectionBounds();
    if (!b) { trace("Locate: select an object first", "warning"); return; }
    const fov = (window.fovValue || 60) * Math.PI / 180;
    const dist = Math.min(100000, Math.max(0.05, b.radius / Math.sin(fov / 2) * 1.15));
    window.cameraAnim = { t0: performance.now(), dur: 500, fromT: (window.cameraTarget || [0, 1, 0]).slice(), toT: b.center, fromR: window.cameraRadius || 5, toR: dist };
    trace("Locating selection", "success");
}

function updateCameraAnim() {
    const a = window.cameraAnim; if (!a) return;
    const k = Math.min(1, (performance.now() - a.t0) / a.dur), e = k * k * (3 - 2 * k);
    for (let i = 0; i < 3; i++) window.cameraTarget[i] = a.fromT[i] + (a.toT[i] - a.fromT[i]) * e;
    window.cameraRadius = Math.exp(Math.log(a.fromR) + (Math.log(a.toR) - Math.log(a.fromR)) * e);
    if (k >= 1) window.cameraAnim = null;
}

let firstFrameDone = false; let lastFrameTime = performance.now(); let frameCount = 0; let fps = 60; let fpsAccum = 0;
let gpuHealthCircle = document.getElementById('gpu-health');
let lastReflectHash = null;

function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || window.innerWidth, ch = canvas.clientHeight || window.innerHeight;
    const w = Math.max(1, Math.floor(cw * dpr)), h = Math.max(1, Math.floor(ch * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

// one complete picture of the scene (shadows, reflections, sky, world, dust, bloom, gizmo)
function renderScene() {
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);

    updateShadows();

    const fp = sceneFingerprint(); const sceneChanged = fp !== lastReflectHash; lastReflectHash = fp;
    let reflectorCount = 0;
    
    // EARLY EXIT: Only do reflections in Mode 1
    if (window.viewMode === 1 || window.viewMode === undefined) {
        for (const entity of sceneObjects) {
            if (entity.isGroup) continue;
            const mat = ensureMaterial(entity);
            if (!reflectionsBroken && mat.reflect > 0.02 && mat.type !== 'flat' && reflectorCount < REFLECT_MAX) {
                if (sceneChanged || !entity.env || !entity.env.ready || entity.env.sig !== fp) { renderReflection(entity); if (entity.env) entity.env.sig = fp; }
                reflectorCount++;
            } else if (entity.env) releaseEnv(entity);
        }
    }

    // EARLY EXIT: Bypass Post-Processing (Bloom/MSAA) in Modes 2, 3, 4
    let postActive = false;
    if ((window.viewMode === 1 || window.viewMode === undefined) && postNeeded()) {
        ensurePostTargets(canvas.width, canvas.height); 
        POST.active = true; 
        gl.bindFramebuffer(gl.FRAMEBUFFER, POST.msaaFBO || POST.scene.fbo);
        postActive = true;
    } else { 
        POST.active = false; 
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.09, 0.09, 0.09, 1.0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
    
    const projectionMatrix = buildProjectionMatrix();
    const cameraMatrix = buildCameraMatrix();
    drawSky(cameraMatrix);
    drawWorld(cameraMatrix, projectionMatrix, null, false, getCameraPos());
    drawDust(cameraMatrix, projectionMatrix);
    
    if (postActive) {
        endScene();
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!(window.PAINT && window.PAINT.enabled) && !window.exporting) drawGizmo(cameraMatrix, projectionMatrix);
}

function drawScene() {
    try {
        // --- FIX: Default to View Mode 1 so shadows always render on the first frame ---
        if (!window.viewMode) window.viewMode = 1; 
        
        resizeCanvas();
        updateCameraAnim();
        if (typeof flushPaint === 'function') flushPaint();
        window.totalTriangles = 0;
        if (window.selectionGlow > 0) { window.selectionGlow -= 0.02; if (window.selectionGlow < 0) window.selectionGlow = 0; }
        
        renderScene();

        const now = performance.now(); const delta = now - lastFrameTime; lastFrameTime = now; frameCount++; fpsAccum += delta;
        const triDisplay = document.getElementById('tri-count');
        if (triDisplay) triDisplay.textContent = `Tris: ${(window.totalTriangles / 1000).toFixed(1)}k`;
        if (frameCount >= 30) {
            fps = Math.round(1000 / (fpsAccum / frameCount)); frameCount = 0; fpsAccum = 0;
            let status = 'good'; if (fps < 30 || window.totalTriangles > 900000) status = 'bad'; else if (fps < 50 || window.totalTriangles > 450000) status = 'warn';
            if (gpuHealthCircle) {
                const col = status === 'good' ? '#00ff00' : (status === 'warn' ? '#ffcc00' : '#ff0000');
                gpuHealthCircle.style.backgroundColor = col; gpuHealthCircle.style.boxShadow = '0 0 5px ' + col;
            }
        }
        if (!firstFrameDone) { firstFrameDone = true; trace("First Frame Rendered", "success"); }
        requestAnimationFrame(drawScene);
    } catch (error) { trace(`RENDER CRASH: ${error.message}`, "error"); return; }
}

// ---------------------------------------------------------------------
//  Export a picture of the current view (same camera) at a fixed size. Grid lines are hidden but shadows stay.
// ---------------------------------------------------------------------
const EXPORT_SIZES = { youtube: [2560, 1440], thumbnail: [1280, 720], portrait: [1080, 1920], standard: [1600, 1200] };

function exportView(fmt) {
    try {
        if (typeof trace === 'function') trace("Starting export for " + fmt + "...", "success");
        
        let [W, H] = EXPORT_SIZES[fmt] || EXPORT_SIZES.thumbnail;
        const maxDim = Math.min(4096, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || 4096); 
        if (Math.max(W, H) > maxDim) { const s = maxDim / Math.max(W, H); W = Math.floor(W * s); H = Math.floor(H * s); }
        
        if (typeof flushPaint === 'function') flushPaint();
        
        const prev = { w: canvas.width, h: canvas.height, fov: window.fovValue };
        const aS = prev.w / prev.h, aE = W / H, tanOld = Math.tan(prev.fov * Math.PI / 360), tanNew = Math.max(tanOld, tanOld * aS / aE);
        const pixels = new Uint8Array(W * H * 4);
        
        window.fovValue = Math.atan(tanNew) * 360 / Math.PI; 
        canvas.width = W; canvas.height = H; 
        window.exporting = true;
        
        renderScene(); 
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
        gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels); 
        
        window.exporting = false; 
        window.fovValue = prev.fov; 
        canvas.width = prev.w; canvas.height = prev.h;
        
        const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; 
        const cx = c2.getContext('2d'), img = cx.createImageData(W, H);
        
        for (let y = 0; y < H; y++) img.data.set(pixels.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
        for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
        cx.putImageData(img, 0, 0);
        
        if (typeof trace === 'function') trace("Export rendered successfully.", "success");
        return { url: c2.toDataURL('image/png'), w: W, h: H };
        
    } catch(err) {
        window.exporting = false;
        if (typeof trace === 'function') trace("CRASH during exportView: " + err.message, "error");
        throw err;
    }
}

window.initRender = function() { requestAnimationFrame(drawScene); };