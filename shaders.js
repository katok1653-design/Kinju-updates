// =====================================================================
//  SHADERS
// =====================================================================

const litCommonBasicGLSL = `
precision highp float;
in vec3 vViewPos; in vec3 vObjPos; in vec3 vNormal;
uniform vec3 uSunDir; uniform vec3 uLightColor; uniform float uLightStrength; uniform vec3 uAmbientColor; uniform float uAmbient;
uniform mat3 uCamRot; uniform vec3 uFogColor; uniform float uFogDensity;
uniform int uMatType; uniform vec3 uTint; uniform float uOpacity; uniform float uGloss; uniform float uShine; uniform float uMetal;
uniform float uReflect; uniform float uDetail; uniform float uScale; uniform float uGlow; uniform float uSteps; uniform float uSoft;
uniform samplerCube uEnvMap; uniform float uEnvOn; uniform float uEnvMaxLod; uniform float uUseNormals;
uniform int uViewMode; uniform int uObjectType;
out vec4 outColor;

vec4 shade(vec3 albedo, float baseAlpha) {
    vec3 N = normalize(cross(dFdx(vViewPos), dFdy(vViewPos))); if (uUseNormals > 0.5) { N = normalize(vNormal); if (!gl_FrontFacing) N = -N; }
    vec3 V = normalize(-vViewPos); vec3 L = normalize(uCamRot * uSunDir);
    float ndl = dot(N, L); float ndv = max(dot(N, V), 0.0);

    // --- FAST VIEW MODES (EARLY EXITS) ---
    if (uViewMode == 2) { 
        vec3 grid = abs(fract(vObjPos * 16.0 - 0.5) - 0.5) / fwidth(vObjPos * 16.0);
        float line = min(min(grid.x, grid.y), grid.z);
        float w = 1.0 - min(line, 1.0);
        vec3 outc = mix(vec3(0.0, 0.3, 0.8), vec3(1.0), w); 
        return vec4(outc, 1.0);
    } 
    if (uViewMode == 3) { 
        float simpleLight = max(ndl, 0.0) * 0.7 + 0.3;
        vec3 outc = vec3(simpleLight);
        if (uGlow > 0.01) outc = vec3(1.0, 0.8, 0.0); 
        return vec4(outc, 1.0);
    } 
    if (uViewMode == 4) { 
        float edge = pow(1.0 - ndv, 2.5);
        vec3 baseColor = vec3(0.0, 0.8, 1.0);
        if (uObjectType == 1) baseColor = vec3(1.0, 0.2, 0.2);
        else if (uObjectType == 2) baseColor = vec3(0.2, 1.0, 0.2);
        if (uGlow > 0.01) baseColor = vec3(1.0, 0.8, 0.0);
        return vec4(baseColor * edge + vec3(0.02), 1.0);
    }

    // --- NORMAL PBR MODE (MODE 1) ---
    int T = uMatType; float scl = max(uScale, 0.01);
    vec3 col = albedo * uTint; float alpha = baseAlpha * uOpacity;
    
    vec3 H = normalize(L + V); float ndh = max(dot(N, H), 0.0); float fres = pow(1.0 - ndv, 5.0);
    vec3 Nw = transpose(uCamRot) * N; float shin = exp2(1.0 + uGloss * 9.0); float diff = max(ndl, 0.0); float spec = (ndl > 0.0) ? pow(ndh, shin) : 0.0; float specK = uShine; vec3 sheen = vec3(0.0);
    vec3 env = vec3(0.78, 0.84, 0.92);

    if (T == 3) { float steps = max(uSteps, 2.0); diff = floor(clamp(ndl, 0.0, 0.999) * steps) / (steps - 1.0); spec = (ndl > 0.0) ? step(0.93 - 0.12 * (1.0 - uGloss), ndh) : 0.0; col *= mix(1.0, 0.2, step(0.8, 1.0 - ndv)); }
    else if (T == 2) { float w = clamp(uSoft, 0.0, 1.0); diff = clamp((ndl + w) / (1.0 + w), 0.0, 1.0); diff *= diff; specK = 0.0; sheen = mix(col, vec3(1.0), 0.4) * pow(1.0 - ndv, 3.0) * w * 0.5; }

    float F0 = mix(0.04 + 0.4 * uReflect, 0.9, uMetal); float Fr = mix(F0 + (1.0 - F0) * fres, 1.0, uMetal);
    vec3 refl = env * mix(vec3(1.0), col, uMetal) * Fr * uReflect;

    vec3 lightC = uLightColor * uLightStrength; vec3 ambient = uAmbientColor * uAmbient * (0.65 + 0.35 * (Nw.y * 0.5 + 0.5));
    vec3 specCol = mix(vec3(1.0), col, uMetal); vec3 diffCol = col * (1.0 - uMetal * 0.9);
    
    vec3 outc = diffCol * (ambient + lightC * diff) + specCol * lightC * (spec * specK) + refl + sheen * (ambient + lightC * 0.5);
    outc += col * uGlow; 
    
    float dist = length(vViewPos);
    outc = mix(outc, uFogColor, 1.0 - exp(-uFogDensity * dist));
    return vec4(outc, alpha);
}
`;

const litCommonGLSL = `
precision highp float;
in vec3 vViewPos; in vec3 vObjPos; in vec3 vNormal;
uniform vec3 uSunDir; uniform vec3 uLightColor; uniform float uLightStrength; uniform vec3 uAmbientColor; uniform float uAmbient;
uniform mat3 uCamRot; uniform vec3 uFogColor; uniform float uFogDensity; uniform int uMatType; uniform vec3 uTint;
uniform float uOpacity; uniform float uGloss; uniform float uShine; uniform float uMetal; uniform float uReflect; uniform float uDetail;
uniform float uScale; uniform float uGlow; uniform float uSteps; uniform float uSoft; uniform samplerCube uEnvMap; uniform float uEnvOn;
uniform float uEnvMaxLod; uniform float uUseNormals; uniform vec3 uCamPos; uniform vec3 uSkyZenith; uniform vec3 uSkyHorizon;
uniform vec3 uSkyGround; uniform int uEmitMode;
uniform int uViewMode; uniform int uObjectType;

uniform float uShadowOn; uniform float uShadowStrength; uniform float uShadowSoft; uniform float uShadowBias; uniform float uSunShadowOn;
uniform mat4 uSunVP; uniform float uSunRange; uniform sampler2D uSunShadow; uniform int uPLCount;
uniform vec3 uPLPos[4]; uniform vec3 uPLColor[4]; uniform float uPLRange[4];
uniform samplerCube uPS0; uniform samplerCube uPS1; uniform samplerCube uPS2; uniform samplerCube uPS3;

float unpackDepth(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
float sunLit(vec3 wp, vec3 Nw, float ndl) { if (uShadowOn < 0.5 || uSunShadowOn < 0.5) return 1.0; vec3 p = wp + Nw * (uShadowBias * 2.0); vec4 sc = uSunVP * vec4(p, 1.0); vec3 pr = sc.xyz / sc.w * 0.5 + 0.5; if (pr.x <= 0.0 || pr.x >= 1.0 || pr.y <= 0.0 || pr.y >= 1.0 || pr.z >= 1.0) return 1.0; float bias = uShadowBias * (1.0 + 2.0 * (1.0 - clamp(ndl, 0.0, 1.0))) / max(uSunRange, 0.001); vec2 texel = 1.0 / vec2(textureSize(uSunShadow, 0)); float rad = 0.6 + uShadowSoft * 3.0; float lit = 0.0; for (int ix = -1; ix <= 1; ix++) { for (int iy = -1; iy <= 1; iy++) { float st = unpackDepth(textureLod(uSunShadow, pr.xy + vec2(float(ix), float(iy)) * texel * rad, 0.0)); lit += (pr.z - bias > st) ? 0.0 : 1.0; } } lit /= 9.0; float edge = min(min(pr.x, 1.0 - pr.x), min(pr.y, 1.0 - pr.y)); return mix(1.0, lit, smoothstep(0.0, 0.06, edge)); }
float pointLit(samplerCube map, vec3 wp, vec3 lp, float range, vec3 Nw) { vec3 d = wp + Nw * (uShadowBias * 2.0) - lp; float dist = length(d); if (dist >= range || dist < 0.0001) return 1.0; float ref = (dist - uShadowBias * 2.0) / range; vec3 dn = d / dist; vec3 up = vec3(0.0, 1.0, 0.0); if (abs(dn.y) > 0.99) up = vec3(1.0, 0.0, 0.0); vec3 t1 = normalize(cross(dn, up)); vec3 t2 = cross(dn, t1); float o = 0.004 + uShadowSoft * 0.03; float lit = 0.0; lit += (ref > unpackDepth(textureLod(map, dn, 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn + t1 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn - t1 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn + t2 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn - t2 * o), 0.0))) ? 0.0 : 1.0; return lit / 5.0; }
float pointLitIdx(int i, vec3 wp, vec3 lp, float range, vec3 Nw) { if (i == 0) return pointLit(uPS0, wp, lp, range, Nw); if (i == 1) return pointLit(uPS1, wp, lp, range, Nw); if (i == 2) return pointLit(uPS2, wp, lp, range, Nw); return pointLit(uPS3, wp, lp, range, Nw); }
out vec4 outColor;

vec4 shade(vec3 albedo, float baseAlpha) {
    vec3 N = normalize(cross(dFdx(vViewPos), dFdy(vViewPos))); if (uUseNormals > 0.5) { N = normalize(vNormal); if (!gl_FrontFacing) N = -N; }
    vec3 V = normalize(-vViewPos); vec3 L = normalize(uCamRot * uSunDir);
    float ndl = dot(N, L); float ndv = max(dot(N, V), 0.0);
    
    vec3 Nw = transpose(uCamRot) * N; 
    vec3 wp = transpose(uCamRot) * vViewPos + uCamPos;

    // --- CALCULATE SHADOWS FOR MODE 1 AND 3 ---
    float sunSh = 1.0;
    if (uShadowOn > 0.5 && (uViewMode == 1 || uViewMode == 3)) { 
        sunSh = mix(1.0, sunLit(wp, Nw, ndl), uShadowStrength); 
    }

    // --- FAST VIEW MODES (EARLY EXITS) ---
    if (uViewMode == 2) { 
        vec3 grid = abs(fract(vObjPos * 16.0 - 0.5) - 0.5) / fwidth(vObjPos * 16.0);
        float line = min(min(grid.x, grid.y), grid.z);
        float w = 1.0 - min(line, 1.0);
        vec3 outc = mix(vec3(0.0, 0.3, 0.8), vec3(1.0), w); 
        return vec4(outc, 1.0);
    } 
    if (uViewMode == 3) { 
        // Apply the shadow to the simple grayscale light!
        float simpleLight = (max(ndl, 0.0) * 0.7 + 0.3) * sunSh; 
        vec3 outc = vec3(simpleLight);
        if (uGlow > 0.01) outc = vec3(1.0, 0.8, 0.0); 
        return vec4(outc, 1.0);
    } 
    if (uViewMode == 4) { 
        float edge = pow(1.0 - ndv, 2.5);
        vec3 baseColor = vec3(0.0, 0.8, 1.0);
        if (uObjectType == 1) baseColor = vec3(1.0, 0.2, 0.2);
        else if (uObjectType == 2) baseColor = vec3(0.2, 1.0, 0.2);
        if (uGlow > 0.01) baseColor = vec3(1.0, 0.8, 0.0);
        return vec4(baseColor * edge + vec3(0.02), 1.0);
    }

    // --- NORMAL PBR MODE (MODE 1) ---
    int T = uMatType; float scl = max(uScale, 0.01);
    vec3 col = albedo * uTint; float alpha = baseAlpha * uOpacity;
    
    vec3 H = normalize(L + V); float ndh = max(dot(N, H), 0.0); float fres = pow(1.0 - ndv, 5.0);
    float shin = exp2(1.0 + uGloss * 9.0); float diff = max(ndl, 0.0); float spec = (ndl > 0.0) ? pow(ndh, shin) : 0.0; float specK = uShine; vec3 sheen = vec3(0.0);
    
    if (T == 3) { float steps = max(uSteps, 2.0); diff = floor(clamp(ndl, 0.0, 0.999) * steps) / (steps - 1.0); spec = (ndl > 0.0) ? step(0.93 - 0.12 * (1.0 - uGloss), ndh) : 0.0; col *= mix(1.0, 0.2, step(0.8, 1.0 - ndv)); }
    else if (T == 2) { float w = clamp(uSoft, 0.0, 1.0); diff = clamp((ndl + w) / (1.0 + w), 0.0, 1.0); diff *= diff; specK = 0.0; sheen = mix(col, vec3(1.0), 0.4) * pow(1.0 - ndv, 3.0) * w * 0.5; }

    vec3 Rw = transpose(uCamRot) * reflect(-V, N); Rw = normalize(mix(Rw, Nw, (1.0 - uGloss) * 0.7));
    float F0 = mix(0.04 + 0.4 * uReflect, 0.9, uMetal); float Fr = mix(F0 + (1.0 - F0) * fres, 1.0, uMetal);
    vec3 env = mix(uSkyHorizon, uSkyZenith, 0.5);
    vec3 refl = env * mix(vec3(1.0), col, uMetal) * Fr * uReflect;

    vec3 lightC = uLightColor * uLightStrength; vec3 ambient = uAmbientColor * uAmbient * (0.65 + 0.35 * (Nw.y * 0.5 + 0.5));
    vec3 specCol = mix(vec3(1.0), col, uMetal); vec3 diffCol = col * (1.0 - uMetal * 0.9);
    
    vec3 pDiff = vec3(0.0); vec3 pSpec = vec3(0.0); vec3 Vw = normalize(uCamPos - wp);
    for (int i = 0; i < 4; i++) { 
        if (i >= uPLCount) break; 
        vec3 Lp = uPLPos[i] - wp; float dp = length(Lp); float rg = uPLRange[i]; 
        if (dp < rg) { 
            Lp /= max(dp, 0.0001); float fall = 1.0 - dp / rg; float att = fall * fall; float nl = max(dot(Nw, Lp), 0.0); 
            float sh = 1.0; 
            if (uShadowOn > 0.5) sh = mix(1.0, pointLitIdx(i, wp, uPLPos[i], rg, Nw), uShadowStrength); 
            pDiff += uPLColor[i] * (nl * att * sh); 
            vec3 Hp = normalize(Lp + Vw); float sp = (nl > 0.0) ? pow(max(dot(Nw, Hp), 0.0), shin) : 0.0; 
            pSpec += uPLColor[i] * (sp * att * sh); 
        } 
    }

    vec3 outc = diffCol * (ambient + lightC * diff * sunSh + pDiff) + specCol * (lightC * (spec * specK * sunSh) + pSpec * specK) + refl + sheen * (ambient + lightC * 0.5);
    outc += col * uGlow; 
    
    float dist = length(vViewPos);
    outc = mix(outc, uFogColor, 1.0 - exp(-uFogDensity * dist));
    return vec4(outc, alpha);
}
`;

const vsSource = `#version 300 es
    in vec4 aPosition;
    uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix;
    out vec3 vViewPos; out vec3 vObjPos; out vec3 vNormal;
    void main() { vec4 vp = uModelViewMatrix * aPosition; gl_Position = uProjectionMatrix * vp; vViewPos = vp.xyz; vObjPos = aPosition.xyz; vNormal = vec3(0.0, 1.0, 0.0); }
`;
const fsSource = `#version 300 es\n` + litCommonGLSL + `\nvoid main() { outColor = shade(vec3(1.0), 1.0); }`;
const fsSourceBasic = `#version 300 es\n` + litCommonBasicGLSL + `\nvoid main() { outColor = shade(vec3(1.0), 1.0); }`;

const gridVsSource = `#version 300 es
    in vec3 aPosition;
    uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix;
    uniform vec2 uGridOffset; uniform float uGridHalf;
    out highp vec2 vLocal; out highp vec3 vViewPosition;
    void main() { vec2 local = aPosition.xz * uGridHalf; vec4 vp = uModelViewMatrix * vec4(local.x + uGridOffset.x, 0.0, local.y + uGridOffset.y, 1.0); gl_Position = uProjectionMatrix * vp; vLocal = local; vViewPosition = vp.xyz; }
`;
const gridFsSourceBasic = `#version 300 es
    precision highp float;
    in highp vec2 vLocal; in highp vec3 vViewPosition; out vec4 outColor;
    uniform vec3 uFogColor; uniform float uFogDensity; uniform vec2 uGridOffset; uniform float uGridLimit;
    uniform int uViewMode;
    void main() {
        vec2 coord = vLocal; vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * 2.0);
        float alpha = 1.0 - smoothstep(0.0, 1.0, min(grid.x, grid.y)); vec3 lineColor = vec3(0.35, 0.35, 0.35);
        float fade1 = 1.0 - smoothstep(0.1, 0.4, max(fwidth(coord.x), fwidth(coord.y)));
        vec2 c2 = coord * 0.1; vec2 g2 = abs(fract(c2 - 0.5) - 0.5) / (fwidth(c2) * 2.0);
        float a2 = 1.0 - smoothstep(0.0, 1.0, min(g2.x, g2.y)); float fade2 = 1.0 - smoothstep(0.1, 0.4, max(fwidth(c2.x), fwidth(c2.y)));
        alpha = max(alpha * fade1, a2 * fade2);
        if (uGridLimit > 0.0) { vec2 w = vLocal + uGridOffset; alpha *= 1.0 - smoothstep(0.8, 1.0, max(abs(w.x), abs(w.y)) / uGridLimit); }
        float dist = length(vViewPosition); float fogFactor = 1.0 - exp(-uFogDensity * dist); lineColor = mix(lineColor, uFogColor, fogFactor);
        
        if (uViewMode == 2) { lineColor = vec3(0.0, 0.8, 1.0); } 
        else if (uViewMode == 3) { lineColor = vec3(0.5); }
        else if (uViewMode == 4) { lineColor = vec3(0.2, 0.8, 1.0); }

        outColor = vec4(lineColor, alpha);
    }
`;
const gridFsSource = `#version 300 es
    precision highp float;
    in highp vec2 vLocal; in highp vec3 vViewPosition; out vec4 outColor;
    uniform vec3 uFogColor; uniform float uFogDensity; uniform vec2 uGridOffset; uniform float uGridLimit; uniform float uShowLines;
    uniform int uViewMode;
    uniform float uShadowOn; uniform float uShadowStrength; uniform float uShadowSoft; uniform float uShadowBias; uniform float uSunShadowOn;
    uniform mat4 uSunVP; uniform float uSunRange; uniform sampler2D uSunShadow; uniform int uPLCount;
    uniform vec3 uPLPos[4]; uniform vec3 uPLColor[4]; uniform float uPLRange[4];
    uniform samplerCube uPS0; uniform samplerCube uPS1; uniform samplerCube uPS2; uniform samplerCube uPS3;

    float unpackDepth(vec4 c) { return dot(c, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)); }
    float sunLit(vec3 wp, vec3 Nw, float ndl) { if (uShadowOn < 0.5 || uSunShadowOn < 0.5) return 1.0; vec3 p = wp + Nw * (uShadowBias * 2.0); vec4 sc = uSunVP * vec4(p, 1.0); vec3 pr = sc.xyz / sc.w * 0.5 + 0.5; if (pr.x <= 0.0 || pr.x >= 1.0 || pr.y <= 0.0 || pr.y >= 1.0 || pr.z >= 1.0) return 1.0; float bias = uShadowBias * (1.0 + 2.0 * (1.0 - clamp(ndl, 0.0, 1.0))) / max(uSunRange, 0.001); vec2 texel = 1.0 / vec2(textureSize(uSunShadow, 0)); float rad = 0.6 + uShadowSoft * 3.0; float lit = 0.0; for (int ix = -1; ix <= 1; ix++) { for (int iy = -1; iy <= 1; iy++) { float st = unpackDepth(textureLod(uSunShadow, pr.xy + vec2(float(ix), float(iy)) * texel * rad, 0.0)); lit += (pr.z - bias > st) ? 0.0 : 1.0; } } lit /= 9.0; float edge = min(min(pr.x, 1.0 - pr.x), min(pr.y, 1.0 - pr.y)); return mix(1.0, lit, smoothstep(0.0, 0.06, edge)); }
    float pointLit(samplerCube map, vec3 wp, vec3 lp, float range, vec3 Nw) { vec3 d = wp + Nw * (uShadowBias * 2.0) - lp; float dist = length(d); if (dist >= range || dist < 0.0001) return 1.0; float ref = (dist - uShadowBias * 2.0) / range; vec3 dn = d / dist; vec3 up = vec3(0.0, 1.0, 0.0); if (abs(dn.y) > 0.99) up = vec3(1.0, 0.0, 0.0); vec3 t1 = normalize(cross(dn, up)); vec3 t2 = cross(dn, t1); float o = 0.004 + uShadowSoft * 0.03; float lit = 0.0; lit += (ref > unpackDepth(textureLod(map, dn, 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn + t1 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn - t1 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn + t2 * o), 0.0))) ? 0.0 : 1.0; lit += (ref > unpackDepth(textureLod(map, normalize(dn - t2 * o), 0.0))) ? 0.0 : 1.0; return lit / 5.0; }
    float pointLitIdx(int i, vec3 wp, vec3 lp, float range, vec3 Nw) { if (i == 0) return pointLit(uPS0, wp, lp, range, Nw); if (i == 1) return pointLit(uPS1, wp, lp, range, Nw); if (i == 2) return pointLit(uPS2, wp, lp, range, Nw); return pointLit(uPS3, wp, lp, range, Nw); }
    
    void main() {
        vec2 coord = vLocal; vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * 2.0);
        float alpha = 1.0 - smoothstep(0.0, 1.0, min(grid.x, grid.y)); vec3 lineColor = vec3(0.35, 0.35, 0.35);
        float fade1 = 1.0 - smoothstep(0.1, 0.4, max(fwidth(coord.x), fwidth(coord.y)));
        vec2 c2 = coord * 0.1; vec2 g2 = abs(fract(c2 - 0.5) - 0.5) / (fwidth(c2) * 2.0);
        float a2 = 1.0 - smoothstep(0.0, 1.0, min(g2.x, g2.y)); float fade2 = 1.0 - smoothstep(0.1, 0.4, max(fwidth(c2.x), fwidth(c2.y)));
        alpha = max(alpha * fade1, a2 * fade2) * uShowLines;
        vec2 w = vLocal + uGridOffset; float lim = 1.0;
        if (uGridLimit > 0.0) { lim = 1.0 - smoothstep(0.8, 1.0, max(abs(w.x), abs(w.y)) / uGridLimit); }
        alpha *= lim;
        float dist = length(vViewPosition); float fogFactor = 1.0 - exp(-uFogDensity * dist);
        
        vec3 localFogColor = uFogColor;
        if (uViewMode == 2) localFogColor = vec3(0.0);
        else if (uViewMode == 3) localFogColor = vec3(0.1);
        else if (uViewMode == 4) localFogColor = vec3(0.0);
        
        lineColor = mix(lineColor, localFogColor, fogFactor);

        float dark = 0.0;
        if (uShadowOn > 0.5) {
            vec3 wp = vec3(w.x, 0.0, w.y); vec3 up = vec3(0.0, 1.0, 0.0);
            dark = (1.0 - sunLit(wp, up, 1.0)) * uShadowStrength;
            for (int i = 0; i < 4; i++) { if (i >= uPLCount) break; float dp = length(uPLPos[i] - wp); float rg = uPLRange[i]; if (dp < rg) { float fall = 1.0 - dp / rg; float lit = pointLitIdx(i, wp, uPLPos[i], rg, up); dark = max(dark, (1.0 - lit) * uShadowStrength * fall); } }
        }
        float shadowA = clamp(dark, 0.0, 0.85) * (1.0 - fogFactor) * lim;
        float a = alpha + shadowA * (1.0 - alpha);
        vec3 c = lineColor * alpha / max(a, 0.0001);

        if (uViewMode == 2) { lineColor = vec3(0.0, 0.8, 1.0); c = lineColor * alpha / max(a, 0.0001); }
        else if (uViewMode == 3) { lineColor = vec3(0.5); c = lineColor * alpha / max(a, 0.0001); }
        else if (uViewMode == 4) { lineColor = vec3(0.2, 0.8, 1.0); c = lineColor * alpha / max(a, 0.0001); }

        outColor = vec4(c, a);
    }
`;

const axisVsSource = `attribute vec3 aPosition; attribute vec3 aColor; uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; varying vec3 vColor; void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0); vColor = aColor; }`;
const axisFsSource = `precision mediump float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;

const shadowVsSource = `#version 300 es
    in vec4 aPosition; in float aBlend;
    uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix; uniform mat4 uBend; uniform float uBendOn;
    out vec3 vViewPos;
    void main() { vec3 p = aPosition.xyz; if (uBendOn > 0.5) p = mix(p, (uBend * vec4(p, 1.0)).xyz, aBlend); vec4 vp = uModelViewMatrix * vec4(p, 1.0); gl_Position = uProjectionMatrix * vp; vViewPos = vp.xyz; }
`;
const shadowFsSource = `#version 300 es
    precision highp float;
    in vec3 vViewPos; uniform float uMode; uniform float uRange; out vec4 outColor;
    vec4 packDepth(float d) { vec4 enc = vec4(1.0, 255.0, 65025.0, 16581375.0) * d; enc = fract(enc); enc -= enc.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); return enc; }
    void main() { float d = (uMode < 0.5) ? gl_FragCoord.z : length(vViewPos) / uRange; outColor = packDepth(clamp(d, 0.0, 0.99999)); }
`;

const fullscreenVsSource = `#version 300 es
    out vec2 vUv;
    void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }
`;

const skyFsSource = `#version 300 es
    precision highp float;
    in vec2 vUv; out vec4 outColor;
    uniform mat3 uCamRot; uniform float uTanHalf; uniform float uAspect;
    uniform vec3 uSkyZenith; uniform vec3 uSkyHorizon; uniform vec3 uSkyGround;
    uniform vec3 uSunDir; uniform vec3 uLightColor; uniform float uLightStrength;
    uniform int uViewMode;
    void main() {
        if (uViewMode == 2) { outColor = vec4(0.0, 0.2, 0.6, 1.0); return; } 
        if (uViewMode == 4) { outColor = vec4(0.02, 0.02, 0.05, 1.0); return; } 

        vec2 ndc = vUv * 2.0 - 1.0;
        vec3 dv = normalize(vec3(ndc.x * uTanHalf * uAspect, ndc.y * uTanHalf, -1.0));
        vec3 d = transpose(uCamRot) * dv;
        float t = clamp(d.y, -1.0, 1.0);
        vec3 col;
        if (t >= 0.0) col = mix(uSkyHorizon, uSkyZenith, pow(t, 0.6));
        else col = mix(uSkyHorizon * 0.55, uSkyGround, clamp(-t * 2.0, 0.0, 1.0));
        float sd = max(dot(d, normalize(uSunDir)), 0.0);
        col += uLightColor * uLightStrength * (pow(sd, 6.0) * 0.12 + pow(sd, 40.0) * 0.12);
        
        if (uViewMode == 3) { float luma = dot(col, vec3(0.299, 0.587, 0.114)); col = vec3(luma); }

        outColor = vec4(col, 1.0);
    }
`;

const brightFsSource = `#version 300 es
    precision highp float; in vec2 vUv; out vec4 outColor;
    uniform sampler2D uScene; uniform float uThreshold;
    void main() { vec3 c = texture(uScene, vUv).rgb; float br = max(max(c.r, c.g), c.b); float w = clamp((br - uThreshold) / max(1.0 - uThreshold, 0.001), 0.0, 1.0); outColor = vec4(c * w, 1.0); }
`;
const blurFsSource = `#version 300 es
    precision highp float; in vec2 vUv; out vec4 outColor;
    uniform sampler2D uTex; uniform vec2 uDir;
    void main() { vec3 s = texture(uTex, vUv).rgb * 0.2270270270; s += texture(uTex, vUv + uDir * 1.3846153846).rgb * 0.3162162162; s += texture(uTex, vUv - uDir * 1.3846153846).rgb * 0.3162162162; s += texture(uTex, vUv + uDir * 3.2307692308).rgb * 0.0702702703; s += texture(uTex, vUv - uDir * 3.2307692308).rgb * 0.0702702703; outColor = vec4(s, 1.0); }
`;
const compositeFsSource = `#version 300 es
    precision highp float; in vec2 vUv; out vec4 outColor;
    uniform sampler2D uScene; uniform sampler2D uBloomA; uniform sampler2D uBloomB;
    uniform float uBloom; uniform float uExposure; uniform float uContrast; uniform float uSaturation; uniform float uVibrance;
    void main() { vec3 c = texture(uScene, vUv).rgb; c += (texture(uBloomA, vUv).rgb * 0.8 + texture(uBloomB, vUv).rgb) * uBloom; c *= uExposure; c = (c - 0.5) * uContrast + 0.5; float luma = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(luma), c, uSaturation); float mx = max(c.r, max(c.g, c.b)); float mn = min(c.r, min(c.g, c.b)); luma = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(luma), c, 1.0 + uVibrance * (1.0 - (mx - mn))); outColor = vec4(clamp(c, 0.0, 1.0), 1.0); }
`;

const dustVsSource = `#version 300 es
    in vec4 aSeed; uniform mat4 uView; uniform mat4 uProj; uniform vec3 uCenter; uniform float uBox; uniform float uTime; uniform float uSize; uniform float uMaxSize; uniform float uFogDensity;
    out float vAlpha;
    void main() { vec3 base = aSeed.xyz * uBox; base.y -= uTime * (0.04 + 0.05 * aSeed.w); base.x += sin(uTime * 0.3 + aSeed.w * 40.0) * 0.4 + uTime * 0.02; base.z += cos(uTime * 0.27 + aSeed.w * 25.0) * 0.4; vec3 rel = mod(base - uCenter + 0.5 * uBox, uBox) - 0.5 * uBox; vec4 vp = uView * vec4(uCenter + rel, 1.0); gl_Position = uProj * vp; float dist = max(length(vp.xyz), 0.01); gl_PointSize = clamp(uSize * (0.5 + aSeed.w) * 60.0 / dist, 1.5, uMaxSize); vAlpha = (1.0 - smoothstep(0.35 * uBox, 0.5 * uBox, length(rel))) * exp(-uFogDensity * dist); }
`;
const dustFsSource = `#version 300 es
    precision highp float; in float vAlpha; out vec4 outColor;
    uniform vec3 uColor; uniform float uOpacity;
    void main() { float d = length(gl_PointCoord - 0.5) * 2.0; outColor = vec4(uColor, smoothstep(1.0, 0.2, d) * uOpacity * vAlpha); }
`;