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
window.gl = window.canvas.getContext('webgl2', { antialias: true, alpha: false }) || window.canvas.getContext('webgl', { antialias: true });
if (!gl) { trace("FATAL: WebGL not supported", "error"); } else { trace("WebGL Context Created", "success"); }

function loadShader(gl, type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { trace(`SHADER FAILED: ${gl.getShaderInfoLog(s)}`, "error"); return null; }
    return s;
}

function buildProgram(vsSrc, fsList, label, okMsg) {
    for (let i = 0; i < fsList.length; i++) {
        const vs = loadShader(gl, gl.VERTEX_SHADER, vsSrc), fs = loadShader(gl, gl.FRAGMENT_SHADER, fsList[i]);
        if (vs && fs) {
            const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
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
        viewMode: 'uViewMode', objectType: 'uObjectType' // <--- ADDED THIS
    };
    const out = {}; for (const k in names) out[k] = gl.getUniformLocation(prog, names[k]); return out;
}

const shaderProgram = buildProgram(vsSource, [fsSource, fsSourceBasic], "Main", "Main Shaders Compiled");
const programInfo = {
    program: shaderProgram,
    attribLocations: { position: gl.getAttribLocation(shaderProgram, 'aPosition') },
    uniformLocations: { projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix') },
    lit: getLitUniforms(shaderProgram)
};

const gridProgram = buildProgram(gridVsSource, [gridFsSource, gridFsSourceBasic], "Grid", "Grid Shader Ready");
const gridProgramInfo = {
    program: gridProgram, attribLocations: { position: gl.getAttribLocation(gridProgram, 'aPosition') },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(gridProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(gridProgram, 'uModelViewMatrix'),
        fogColor: gl.getUniformLocation(gridProgram, 'uFogColor'), fogDensity: gl.getUniformLocation(gridProgram, 'uFogDensity'),
        gridOffset: gl.getUniformLocation(gridProgram, 'uGridOffset'), gridHalf: gl.getUniformLocation(gridProgram, 'uGridHalf'), gridLimit: gl.getUniformLocation(gridProgram, 'uGridLimit'), showLines: gl.getUniformLocation(gridProgram, 'uShowLines')
    },
    lit: getLitUniforms(gridProgram)
};

const axisProgram = buildProgram(axisVsSource, [axisFsSource], "Axis", "Axis Shader Ready");
const axisProgramInfo = {
    program: axisProgram,
    attribLocations: { position: gl.getAttribLocation(axisProgram, 'aPosition'), color: gl.getAttribLocation(axisProgram, 'aColor') },
    uniformLocations: { projectionMatrix: gl.getUniformLocation(axisProgram, 'uProjectionMatrix'), modelViewMatrix: gl.getUniformLocation(axisProgram, 'uModelViewMatrix') }
};

function createSolidColorBuffer(color, vertexCount) {
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const colors = new Float32Array(vertexCount * 4);
    for (let i = 0; i < vertexCount; i++) { colors[i*4+0] = color[0]; colors[i*4+1] = color[1]; colors[i*4+2] = color[2]; colors[i*4+3] = color[3]; }
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW); return buf;
}

const gridPosBuffer = gl.createBuffer(); const gridIdxBuffer = gl.createBuffer(); let gridTriCount = 0;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, gridPosBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridIdxBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW); gridTriCount = indices.length;
})();
const axisPosBuffer = gl.createBuffer(); const axisColorBuffer = gl.createBuffer(); let axisVertexCount = 0;
(function buildAxisLines() {
    const length = 3.0; const positions = [0,0.01,0, 0,length,0, 0,0.01,0, length,0.01,0, 0,0.01,0, 0,0.01,length]; const colors = [1,1,0, 1,0,0, 0,1,1, 0,0,1, 0.5,1,0, 0,0.8,0];
    gl.bindBuffer(gl.ARRAY_BUFFER, axisPosBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, axisColorBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW); axisVertexCount = positions.length / 3;
})();

function applyLight(pInfo, cameraMatrix) {
    const u = pInfo.lit, m = cameraMatrix; if (!u) return;
    gl.uniform3fv(u.sunDir, lightDir); gl.uniform3fv(u.lightColor, lightColor); gl.uniform1f(u.lightStrength, lightStrength);
    gl.uniform3fv(u.ambientColor, lightAmbientColor); gl.uniform1f(u.ambient, lightAmbient);
    gl.uniformMatrix3fv(u.camRot, false, new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]));
    gl.uniform3fv(u.fogColor, window.fogColor); gl.uniform1f(u.fogDensity, window.fogDensity);
}
// --- TRIAL SYSTEM (SET TO 2 MINUTES FOR TESTING) ---
(function checkTrial() {
    const TRIAL_MINUTES = 2; 
    const trialKey = 'kinju_trial_start';
    let start = localStorage.getItem(trialKey);
    
    // FOR TESTING: If the URL has "?reset" at the end, wipe the timer
    if (window.location.search.includes('reset')) {
        localStorage.removeItem(trialKey);
        start = null;
        alert("Trial timer reset!");
    }

    if (!start) {
        // First time opening
        localStorage.setItem(trialKey, Date.now().toString());
    } else {
        const elapsed = Date.now() - parseInt(start, 10);
        const limit = TRIAL_MINUTES * 60 * 1000; // 2 minutes in milliseconds
        
        if (elapsed > limit) {
            // Trial expired! Lock the screen.
            document.body.innerHTML = `
                <div style="color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #111; text-align: center; padding: 20px;">
                    <h1 style="color: #ff3333;">Trial Expired</h1>
                    <p style="color: #aaa;">Your ${TRIAL_MINUTES}-minute trial of Kinju has ended.</p>
                    <p style="color: #555; font-size: 12px; margin-top: 20px;">Thank you for testing!</p>
                </div>
            `;
            throw new Error("Trial expired"); // Stops the rest of the engine from loading
        } else {
            console.log(`Trial active. You have ${Math.round((limit - elapsed)/1000)} seconds left.`);
        }
    }
})();