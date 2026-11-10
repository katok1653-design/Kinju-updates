// =====================================================================
//  settings.js : Sliders, Material panel, and environment settings
// =====================================================================

window.initSettings = function() {
    const bindRange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => fn(parseFloat(el.value))); };
    const bindChange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => fn(el)); };
    
    // --- ENVIRONMENT & GRID ---
    bindChange('env-select', (el) => applyLook(el.value));
    bindChange('env-autofog', (el) => { ENV.autoFog = el.checked; if (ENV.autoFog) applyLookFog(); });
    
    // FIXED GRID SIZE
    bindChange('grid-size', (el) => { 
        ENV.gridSize = parseInt(el.value, 10); 
        if (typeof trace === 'function') trace(ENV.gridSize === 0 ? 'Grid hidden' : 'Grid: ' + ENV.gridSize, "success"); 
    });

    bindRange('env-vibrance', v => ENV.vibrance = v);
    bindRange('env-exposure', v => ENV.exposure = v);
    bindRange('env-contrast', v => ENV.contrast = v);
    bindRange('env-saturation', v => ENV.saturation = v);
    bindRange('env-bloom', v => ENV.bloom = v);
    bindRange('env-bloom-thr', v => ENV.bloomThreshold = v);
    bindRange('env-dust', v => ENV.dust = v);
    bindRange('env-dust-size', v => ENV.dustSize = v);
    bindRange('env-dust-bright', v => ENV.dustBright = v);
    
    // --- SHADOWS ---
    bindChange('shadow-enabled', (el) => { ENV.shadows = el.checked; if (typeof trace === 'function') trace(`Shadows ${ENV.shadows ? 'ON' : 'OFF'}`, "success"); });
    bindRange('shadow-strength', v => ENV.shadowStrength = v);
    bindRange('shadow-soft', v => ENV.shadowSoft = v);
    bindChange('shadow-quality', (el) => { ENV.shadowQuality = parseInt(el.value, 10); if (typeof trace === 'function') trace(`Shadow quality ${ENV.shadowQuality}px`, "success"); });
    bindRange('shadow-distance', v => ENV.shadowDistance = v);
    bindRange('shadow-bias', v => ENV.shadowBias = v);
    
    // --- SKIN ---
    bindChange('skin-bend', (el) => { window.skinSettings.bend = el.value; if (typeof trace === 'function') trace(`Skin bending: ${el.value}`, "success"); });
    bindRange('skin-gap', v => window.skinSettings.gap = v);
    bindRange('skin-armdrop', v => { window.skinSettings.armDrop = v; applySkinSettings(); });
    bindChange('skin-layer2', (el) => { window.skinSettings.layer2 = el.checked; });
    document.getElementById('skin-reset-pose')?.addEventListener('click', () => resetSkinPose());
    bindRange('skin-l2thick', v => window.skinSettings.layer2Extra = v);
    
    // --- LIGHT & CAMERA ---
    bindRange('light-strength', v => lightStrength = v);
    bindChange('light-color', (el) => { const hex = el.value; lightColor[0] = parseInt(hex.substr(1, 2), 16) / 255; lightColor[1] = parseInt(hex.substr(3, 2), 16) / 255; lightColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });
    bindRange('fov-slider', v => window.fovValue = v);
    bindChange('fog-color', (el) => { const hex = el.value; window.fogColor[0] = parseInt(hex.substr(1, 2), 16) / 255; window.fogColor[1] = parseInt(hex.substr(3, 2), 16) / 255; window.fogColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });
    bindRange('fog-density', v => window.fogDensity = v);
    bindRange('light-azimuth', v => { lightAzimuth = v; updateLightDir(); });
    bindRange('light-elevation', v => { lightElevation = v; updateLightDir(); });
    bindRange('light-ambient', v => lightAmbient = v);
    bindChange('light-ambient-color', (el) => { const hex = el.value; lightAmbientColor[0] = parseInt(hex.substr(1, 2), 16) / 255; lightAmbientColor[1] = parseInt(hex.substr(3, 2), 16) / 255; lightAmbientColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });

    // --- MATERIAL PANEL & SELECTION ---
    const matTypeSel = document.getElementById('mat-type');
    if (typeof MATERIAL_TYPES !== 'undefined' && matTypeSel) {
        Object.keys(MATERIAL_TYPES).forEach(key => { 
            const opt = document.createElement('option'); opt.value = key; opt.textContent = MATERIAL_TYPES[key].label; matTypeSel.appendChild(opt); 
        });
    }
    const rgbToHex = (c) => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
    
    window.onSelectionChanged = function() {
        const sel = !!window.selectedEntity;
        const matPanel = document.getElementById('material-panel');
        if (matPanel) matPanel.style.display = sel ? 'block' : 'none';
        
        const pad = document.getElementById('gizmo-pad');
        if (pad) pad.classList.toggle('active', sel);
        
        const matSummary = document.querySelector('#material-panel summary');
        if (matSummary) matSummary.textContent = getSelection().length > 1 ? 'Material (' + getSelection().length + ' selected)' : 'Material';
        
        const padGlyphs = { move: '\u279C', rotate: '\u21BB', scale: '\u25FC' };
        document.querySelectorAll('.pad-glyph').forEach(g => g.textContent = padGlyphs[window.currentGizmoMode] || '');
        
        if (sel && window.refreshMaterialPanel) window.refreshMaterialPanel();
    };

    window.refreshMaterialPanel = function() {
        const sel = window.selectedEntity; if (!sel) return;
        const m = ensureMaterial(sel); 
        if (matTypeSel) matTypeSel.value = m.type;
        document.getElementById('model-color').value = rgbToHex(m.color);
        document.getElementById('mat-color-label').textContent = sel.isTextured ? 'Tint:' : 'Color:';
        document.getElementById('mat-filter').value = m.pixelClean ? 'NEAREST' : 'LINEAR';
        document.getElementById('mat-glow-radius').value = m.glowRadius || 5;
        
        const fr = document.getElementById('mat-filter-row'); if (fr) fr.style.display = sel.isTextured ? 'flex' : 'none';
        const gr = document.getElementById('mat-glow-row'); if (gr) gr.style.display = m.type === 'glow' ? 'flex' : 'none';
        const szRow = document.getElementById('mat-size-row'); 
        if (szRow) { const g = sel.group; szRow.style.display = g ? 'flex' : 'none'; if (g) { document.getElementById('mat-size').value = g.sizeFactor || 1; document.getElementById('mat-size-val').textContent = Math.round((g.sizeFactor || 1) * 100) + '%'; } }
        
        const box = document.getElementById('mat-params'); if (!box) return; box.innerHTML = '';
        MATERIAL_TYPES[m.type].params.forEach(key => {
            const def = MATERIAL_PARAM_DEFS[key]; const row = document.createElement('div'); row.className = 'control-row';
            const label = document.createElement('label'); label.textContent = def.label + ':';
            const input = document.createElement('input'); input.type = 'range'; input.min = def.min; input.max = def.max; input.step = def.step; input.value = m[key];
            input.addEventListener('input', () => { const v = parseFloat(input.value); getSelection().forEach(en => { ensureMaterial(en)[key] = v; }); });
            row.appendChild(label); row.appendChild(input); box.appendChild(row);
        });
    };

    matTypeSel?.addEventListener('change', () => { if (!window.selectedEntity) return; getSelection().forEach(en => applyMaterialType(ensureMaterial(en), matTypeSel.value)); window.refreshMaterialPanel(); });
    document.getElementById('model-color')?.addEventListener('input', (e) => { if (!window.selectedEntity) return; const hex = e.target.value; const c = [parseInt(hex.substr(1, 2), 16) / 255, parseInt(hex.substr(3, 2), 16) / 255, parseInt(hex.substr(5, 2), 16) / 255]; getSelection().forEach(en => { ensureMaterial(en).color = c.slice(); }); });
    document.getElementById('mat-filter')?.addEventListener('change', (e) => { const pixel = e.target.value === 'NEAREST'; for (const en of getSelection()) { if (en.isTextured && en.material) en.material.pixelClean = pixel; } });
    document.getElementById('mat-glow-radius')?.addEventListener('input', (e) => { const sel = getSelection(); for (const en of sel) { if (en.material) en.material.glowRadius = parseFloat(e.target.value); } });
    document.getElementById('mat-size')?.addEventListener('input', () => { const g = window.selectedEntity && window.selectedEntity.group; if (!g) return; if (typeof setModelSize === 'function') { setModelSize(g, parseFloat(document.getElementById('mat-size').value)); document.getElementById('mat-size-val').textContent = Math.round(g.sizeFactor * 100) + '%'; } });
};