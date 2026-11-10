// =====================================================================
//  init.js : global state, the WebGL context, shader programs and the basic scene buffers
// =====================================================================

let lightStrength = 1.5;
let lightColor = [1.0, 1.0, 1.0];
let lightDir = [0.5, 1.0, 0.5];
let lightAmbient = 0.3;
let lightAmbientColor = [1.0, 1.0, 1.0];
let lightAzimuth = 45;
let lightElevation = 55;

function updateLightDir() {
    const az = lightAzimuth * Math.PI / 180, el = lightElevation * Math.PI / 180;
    lightDir = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}
updateLightDir();

let sceneObjects = [];
window.selectedEntity = null;
window.selectionGlow = 0;

window.canvas = document.getElementById('glCanvas');

// --- CRITICAL FIX: preserveDrawingBuffer is set to true so we can export images ---
window.gl = window.canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true }) || 
            window.canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true });

if (!gl) { 
    trace("FATAL: WebGL not supported", "error"); 
} else { 
    trace("WebGL Context Created", "success"); 
}

function loadShader(gl, type, source) {
    const s = gl.createShader(type); 
    gl.shaderSource(s, source); 
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { 
        trace(`SHADER FAILED: ${gl.getShaderInfoLog(s)}`, "error"); 
        return null; 
    }
    return s;
}

function buildProgram(vsSrc, fsList, label, okMsg) {
    for (let i = 0; i < fsList.length; i++) {
        const vs = loadShader(gl, gl.VERTEX_SHADER, vsSrc), fs = loadShader(gl, gl.FRAGMENT_SHADER, fsList[i]);
        if (vs && fs) {
            const p = gl.createProgram(); 
            gl.attachShader(p, vs); 
            gl.attachShader(p, fs); 
            gl.linkProgram(p);
            if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
                if (i > 0) trace(label + ": advanced shader failed, running the basic one (shadows / glow lights off)", "warning");
                else if (okMsg) trace(okMsg, "success");
                return p;
            }
            trace(label + " LINK FAILED: " + gl.getProgramInfoLog(p), "error");
        }
        if (i < fsList.length - 1) trace(label + ": advanced shader failed, trying the basic one...", "warning");
    }
    return gl.createProgram(); 
}

function getLitUniforms(prog) {
    const names = {
        sunDir: 'uSunDir', lightColor: 'uLightColor', lightStrength: 'uLightStrength', ambientColor: 'uAmbientColor', ambient: 'uAmbient',
        camRot: 'uCamRot', fogColor: 'uFogColor', fogDensity: 'uFogDensity', matType: 'uMatType', tint: 'uTint', opacity: 'uOpacity',
        gloss: 'uGloss', shine: 'uShine', metal: 'uMetal', reflect: 'uReflect', detail: 'uDetail', scale: 'uScale', glow: 'uGlow', steps: 'uSteps', soft: 'uSoft',
        envMap: 'uEnvMap', envOn: 'uEnvOn', envMaxLod: 'uEnvMaxLod', useNormals: 'uUseNormals',
        camPos: 'uCamPos', skyZenith: 'uSkyZenith', skyHorizon: 'uSkyHorizon', skyGround: 'uSkyGround', emitMode: 'uEmitMode', pixelClean: 'uPixelClean',
        shadowOn: 'uShadowOn', shadowStrength: 'uShadowStrength', shadowSoft: 'uShadowSoft', shadowBias: 'uShadowBias',
        sunShadowOn: 'uSunShadowOn', sunVP: 'uSunVP', sunRange: 'uSunRange', sunShadow: 'uSunShadow',
        plCount: 'uPLCount', plPos: 'uPLPos', plColor: 'uPLColor', plRange: 'uPLRange', ps0: 'uPS0', ps1: 'uPS1', ps2: 'uPS2', ps3: 'uPS3',
        viewMode: 'uViewMode', objectType: 'uObjectType'
    };
    const out = {}; 
    for (const k in names) out[k] = gl.getUniformLocation(prog, names[k]); 
    return out;
}

// ---- main (solid colour) program ----
const shaderProgram = buildProgram(vsSource, [fsSource, fsSourceBasic], "Main", "Main Shaders Compiled");
const programInfo = {
    program: shaderProgram,
    attribLocations: { position: gl.getAttribLocation(shaderProgram, 'aPosition') },
    uniformLocations: { projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix') },
    lit: getLitUniforms(shaderProgram)
};

// ---- floor grid (also receives shadows) ----
const gridProgram = buildProgram(gridVsSource, [gridFsSource, gridFsSourceBasic], "Grid", "Grid Shader Ready");
const gridProgramInfo = {
    program: gridProgram, 
    attribLocations: { position: gl.getAttribLocation(gridProgram, 'aPosition') },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(gridProgram, 'uProjectionMatrix'), 
        modelViewMatrix: gl.getUniformLocation(gridProgram, 'uModelViewMatrix'),
        fogColor: gl.getUniformLocation(gridProgram, 'uFogColor'), 
        fogDensity: gl.getUniformLocation(gridProgram, 'uFogDensity'),
        gridOffset: gl.getUniformLocation(gridProgram, 'uGridOffset'), 
        gridHalf: gl.getUniformLocation(gridProgram, 'uGridHalf'), 
        gridLimit: gl.getUniformLocation(gridProgram, 'uGridLimit'), 
        showLines: gl.getUniformLocation(gridProgram, 'uShowLines')
    },
    lit: getLitUniforms(gridProgram)
};

// ---- axis lines ----
const axisProgram = buildProgram(axisVsSource, [axisFsSource], "Axis", "Axis Shader Ready");
const axisProgramInfo = {
    program: axisProgram,
    attribLocations: { position: gl.getAttribLocation(axisProgram, 'aPosition'), color: gl.getAttribLocation(axisProgram, 'aColor') },
    uniformLocations: { projectionMatrix: gl.getUniformLocation(axisProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(axisProgram, 'uModelViewMatrix') }
};

// ---- floor plane: a finely cut mesh ----
const gridPosBuffer = gl.createBuffer(); 
const gridIdxBuffer = gl.createBuffer(); 
let gridTriCount = 0;

(function buildGridPlane() {
    const N = 64; const positions = []; const indices = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1, v = (j / N) * 2 - 1;
        positions.push(Math.sign(u) * u * u, 0, Math.sign(v) * v * v); 
    }
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + (N + 1), d = c + 1;
        indices.push(a, c, b, b, c, d);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gridPosBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIdxBuffer); 
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); 
    gridTriCount = indices.length;
})();

const axisPosBuffer = gl.createBuffer(); 
const axisColorBuffer = gl.createBuffer(); 
let axisVertexCount = 0;

(function buildAxisLines() {
    const length = 3.0; 
    const positions = [0,0.01,0, 0,length,0, 0,0.01,0, length,0.01,0, 0,0.01,0, 0,0.01,length]; 
    const colors = [1,1,0, 1,0,0, 0,1,1, 0,0,1, 0.5,1,0, 0,0.8,0];
    gl.bindBuffer(gl.ARRAY_BUFFER, axisPosBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); 
    axisVertexCount = positions.length / 3;
})();

function applyLight(pInfo, cameraMatrix) {
    const u = pInfo.lit, m = cameraMatrix; if (!u) return;
    gl.uniform3fv(u.sunDir, lightDir); gl.uniform3fv(u.lightColor, lightColor); gl.uniform1f(u.lightStrength, lightStrength);
    gl.uniform3fv(u.ambientColor, lightAmbientColor); gl.uniform1f(u.ambient, lightAmbient);
    gl.uniformMatrix3fv(u.camRot, false, new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]));
    gl.uniform3fv(u.fogColor, window.fogColor); gl.uniform1f(u.fogDensity, window.fogDensity);
}

// =====================================================================
//  TRIAL & CONFIG SYSTEM
// =====================================================================
(function checkTrial() {
    const config = window.KINJU_CONFIG || { IS_DEV_BUILD: false, TRIAL_MINUTES: 30 };
    
    if (config.IS_DEV_BUILD) {
        console.log("Kinju Developer Mode Active. Timer disabled.");
        document.title = "Kinju (DEV)";
        window.addEventListener('load', () => {
            const badge = document.createElement('div');
            badge.style.cssText = "position:absolute; top:5px; left:50%; transform:translateX(-50%); background:red; color:white; padding:2px 10px; border-radius:10px; font-size:10px; font-family:sans-serif; z-index:9999;";
            badge.innerText = "DEV BUILD - NO TIMER";
            document.body.appendChild(badge);
        });
        return; // Exit, no timer!
    }

    const store = window.KinjuStorage || { get: function() { return null; }, set: function() {}, remove: function() {} };
    const trialKey = 'kinju_trial_start';
    let start = store.get(trialKey);
    
    if (window.location.search.includes('reset')) {
        store.remove(trialKey);
        start = null;
        alert("Trial timer reset!");
    }

    if (!start) {
        start = Date.now().toString();
        store.set(trialKey, start);
    }

    const startTime = parseInt(start, 10);
    const limit = config.TRIAL_MINUTES * 60 * 1000; 
    const endTime = startTime + limit;

    function lockApp() {
        document.body.innerHTML = `
            <div style="color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #111; text-align: center; padding: 20px;">
                <h1 style="color: #ff3333;">Trial Expired</h1>
                <p style="color: #aaa;">Your ${config.TRIAL_MINUTES}-minute trial of Kinju has ended.</p>
                <p style="color: #555; font-size: 12px; margin-top: 20px;">Thank you for testing!</p>
            </div>
        `;
        throw new Error("Trial expired"); 
    }

    function updateTimer() {
        const remaining = endTime - Date.now();

        if (remaining <= 0) {
            lockApp();
            return;
        }

        if (remaining <= 10000) {
            let warningEl = document.getElementById('trial-warning');
            if (!warningEl) {
                warningEl = document.createElement('div');
                warningEl.id = 'trial-warning';
                warningEl.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(200, 0, 0, 0.95); color: white; padding: 20px 40px; border-radius: 12px; font-family: sans-serif; font-size: 28px; font-weight: bold; z-index: 99999; text-align: center; box-shadow: 0 0 30px rgba(255, 0, 0, 0.8); pointer-events: none; border: 2px solid #ff5555;";
                document.body.appendChild(warningEl);
            }
            warningEl.innerText = `Trial ends in ${Math.ceil(remaining / 1000)}s`;
        }
    }

    if (Date.now() > endTime) {
        lockApp();
    } else {
        setInterval(updateTimer, 1000);
    }
})();