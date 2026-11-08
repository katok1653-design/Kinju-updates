window.onload = function() {
    setTimeout(function() {
        trace("Page fully loaded. Setting up UI...", "success");
        
        const canvasElement = document.getElementById('glCanvas');
        window.fovValue = 60;
        window.fogColor = [0.8, 0.85, 0.9]; 
        window.fogDensity = 0.0; // ZERO FOG
        window.currentGizmoMode = 'move';

        // --- UI TOGGLE LOGIC ---
        const uiPanel = document.getElementById('ui-panel');
        const treePanel = document.getElementById('tree-panel');
        const debugPanel = document.getElementById('debug-panel');
        const debugBtn = document.getElementById('log-toggle-btn');
        
        document.getElementById('ui-toggle-btn').addEventListener('click', () => uiPanel.classList.toggle('open'));
        document.getElementById('tree-toggle-btn').addEventListener('click', () => treePanel.classList.toggle('open'));
        
        debugBtn.addEventListener('click', () => {
            debugPanel.classList.toggle('open');
            if (debugPanel.classList.contains('open')) { debugBtn.innerText = '❌'; debugBtn.style.color = '#ff3333'; } 
            else { debugBtn.innerText = '📜'; debugBtn.style.color = 'white'; }
        });

        document.getElementById('clear-log').addEventListener('click', () => {
            document.getElementById('log-content').innerHTML = '';
            trace('Log cleared', 'complied');
        });

        // --- ENVIRONMENT, COLOUR, BLOOM, DUST, SHADOWS ---
        const bindRange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => fn(parseFloat(el.value))); };
        const bindChange = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => fn(el)); };
        
        bindChange('env-select', (el) => applyLook(el.value));
        bindChange('env-autofog', (el) => { ENV.autoFog = el.checked; if (ENV.autoFog) applyLookFog(); });
        bindRange('env-vibrance', v => ENV.vibrance = v);
        bindRange('env-exposure', v => ENV.exposure = v);
        bindRange('env-contrast', v => ENV.contrast = v);
        bindRange('env-saturation', v => ENV.saturation = v);
        bindRange('env-bloom', v => ENV.bloom = v);
        bindRange('env-bloom-thr', v => ENV.bloomThreshold = v);
        bindRange('env-dust', v => ENV.dust = v);
        bindRange('env-dust-size', v => ENV.dustSize = v);
        bindRange('env-dust-bright', v => ENV.dustBright = v);
        bindChange('shadow-enabled', (el) => { ENV.shadows = el.checked; trace(`Shadows ${ENV.shadows ? 'ON' : 'OFF'}`, "success"); });
        bindRange('shadow-strength', v => ENV.shadowStrength = v);
        bindRange('shadow-soft', v => ENV.shadowSoft = v);
        bindChange('shadow-quality', (el) => { ENV.shadowQuality = parseInt(el.value); trace(`Shadow quality ${ENV.shadowQuality}px`, "success"); });
        bindRange('shadow-distance', v => ENV.shadowDistance = v);
        bindRange('shadow-bias', v => ENV.shadowBias = v);
        // --- SKIN: bending style, split gap, arm drop, second layer, reset ---
        bindChange('skin-bend', (el) => { window.skinSettings.bend = el.value; trace(`Skin bending: ${el.value}`, "success"); });
        bindRange('skin-gap', v => window.skinSettings.gap = v);
        bindRange('skin-armdrop', v => { window.skinSettings.armDrop = v; applySkinSettings(); });
        bindChange('skin-layer2', (el) => { window.skinSettings.layer2 = el.checked; });
        document.getElementById('skin-reset-pose').addEventListener('click', () => resetSkinPose());
        // --- SKIN: second layer thickness + the detail (paint) layer ---
        bindRange('skin-l2thick', v => window.skinSettings.layer2Extra = v);
        const PL = window.PAINT;
        const setPaintMode = (on) => {
            PL.enabled = on; document.getElementById('paint-enabled').checked = on; document.getElementById('paint-btn').classList.toggle('hud-active', on);
            trace(on ? 'Paint mode ON: one finger paints, two fingers move the camera' : 'Paint mode OFF', "success");
        };
        bindChange('paint-enabled', (el) => setPaintMode(el.checked));
        document.getElementById('paint-btn').addEventListener('click', () => setPaintMode(!PL.enabled));
        bindChange('paint-visible', (el) => { PL.visible = el.checked; });
        bindChange('paint-tool', (el) => { PL.tool = el.value; });
        bindRange('paint-size', v => PL.brushSize = v);
        bindRange('paint-opacity', v => PL.opacity = v);
        document.getElementById('paint-color').addEventListener('input', (e) => { PL.color = e.target.value; });
        document.getElementById('paint-undo').addEventListener('click', () => paintUndo());
        document.getElementById('paint-clear').addEventListener('click', () => paintClear());
        let painting = false;
        // --- EXPORT PICTURE ---
        const exportMenu = document.getElementById('export-menu'), exportPreview = document.getElementById('export-preview');
        const saveExportedImage = (res, name) => {
            const b64 = res.url.split(',')[1];
            if (window.AndroidBridge && window.AndroidBridge.savePng) { window.AndroidBridge.savePng(name, b64); trace('Saved ' + name, "success"); }   // native save (see the Java snippet)
            else { try { const a = document.createElement('a'); a.href = res.url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (err) {} }
            document.getElementById('export-img').src = res.url;
            document.getElementById('export-note').textContent = `${name}  (${res.w} x ${res.h}). If it was not saved, press and hold the picture to save it.`;
            exportPreview.style.display = 'flex';
        };
        document.getElementById('export-btn').addEventListener('click', () => { exportMenu.style.display = 'flex'; });
        document.getElementById('export-cancel').addEventListener('click', () => { exportMenu.style.display = 'none'; });
        document.getElementById('export-close').addEventListener('click', () => { exportPreview.style.display = 'none'; });
        exportMenu.querySelectorAll('button[data-fmt]').forEach(btn => btn.addEventListener('click', () => {
            const fmt = btn.dataset.fmt; exportMenu.style.display = 'none'; trace('Exporting picture...', "warning");
            setTimeout(() => {
                try { const res = exportView(fmt); saveExportedImage(res, `render_${fmt}_${Date.now()}.png`); trace(`Exported ${res.w}x${res.h} PNG`, "success"); }
                catch (err) { trace('Export failed: ' + err.message, "error"); }
            }, 60);
        }));
        // --- MODEL SIZE (whole imported model, all dimensions together) ---
        const sizeSlider = document.getElementById('mat-size');
        sizeSlider.addEventListener('pointerdown', () => { if (window.pushUndo) window.pushUndo(); });
        sizeSlider.addEventListener('input', () => {
            const g = window.selectedEntity && window.selectedEntity.group; if (!g) return;
            setModelSize(g, parseFloat(sizeSlider.value)); document.getElementById('mat-size-val').textContent = Math.round(g.sizeFactor * 100) + '%';
        });
        // --- MODE SWITCH (top middle): Space / Modeling / Animation ---
        const setMode = (mode) => {
            document.body.dataset.mode = mode;
            document.querySelectorAll('#mode-switch button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
            if (mode !== 'modeling' && PL.enabled) setPaintMode(false);   // painting belongs to Modeling
            trace(`Mode: ${mode}`, "success");
        };
        document.querySelectorAll('#mode-switch button').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
        bindChange('grid-size', (el) => { ENV.gridSize = parseInt(el.value); trace(ENV.gridSize === 0 ? 'Grid hidden' : (ENV.gridSize < 0 ? 'Grid: infinite' : 'Grid size: ' + ENV.gridSize), "success"); });
        document.getElementById('locate-btn').addEventListener('click', () => locateSelection());
        applyLook('afternoon');

        // --- REFLECTION SETTINGS ---
        window.reflectionSize = 256;
        document.getElementById('reflection-size').addEventListener('change', (e) => {
            window.reflectionSize = parseInt(e.target.value);
            trace(`Reflection quality set to ${window.reflectionSize}px`, "success");
        });
        document.getElementById('refresh-reflections').addEventListener('click', () => {
            for (const entity of sceneObjects) { if (entity.env) releaseEnv(entity); }
            trace("Reflections refreshed", "success");
        });

        // --- UNDO SYSTEM ---
        window.undoHistory = [];
        const MAX_UNDO = 7;
        window.pushUndo = function() {
            const sel = getSelection(); if (!sel.length) return;
            const states = sel.map(e => ({ entity: e, pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, rot: { x: e.rot.x, y: e.rot.y, z: e.rot.z }, scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z } }));
            window.undoHistory.push(states);
            if (window.undoHistory.length > MAX_UNDO) window.undoHistory.shift();
        };
        document.getElementById('undo-btn').addEventListener('click', () => {
            if (window.undoHistory.length === 0) return trace("Nothing to undo.", "warning");
            const states = window.undoHistory.pop();
            states.forEach(s => { s.entity.pos = { ...s.pos }; s.entity.rot = { ...s.rot }; s.entity.scale = { ...s.scale }; });
            trace("Undid last action", "success");
            if (window.onSelectionChanged) window.onSelectionChanged();
        });

        // --- LONG PRESS CONTEXT MENU ---
        const ctxMenu = document.getElementById('context-menu');
        let longPressTimer = null;
        let isDragging = false, previousX = 0, previousY = 0;
        window.cameraAngleY = 0; window.cameraAngleX = 0.2; window.cameraRadius = 5.0; 
        let initialPinchDistance = 0, initialRadius = 0, lastCX = 0, lastCY = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('#context-menu') || e.target.closest('button')) return;
            ctxMenu.style.display = 'none';
        }, { capture: true });

        document.getElementById('ctx-dup').addEventListener('click', () => {
            const sel = getSelection(); if (!sel.length) return;
            const made = [];
            for (const clone of sel) {
                const newObj = { ...clone, name: clone.name + ' copy', env: null, pos: { x: clone.pos.x + 1, y: clone.pos.y, z: clone.pos.z }, rot: { ...clone.rot }, scale: { ...clone.scale }, material: JSON.parse(JSON.stringify(clone.material)) };
                sceneObjects.push(newObj); if (clone.group) clone.group.parts.push(newObj); made.push(newObj);
            }
            setSelection(made, made[made.length - 1]); ctxMenu.style.display = 'none'; trace("Object Duplicated", "success");
        });
        document.getElementById('ctx-del').addEventListener('click', () => {
            const sel = getSelection(); if (!sel.length) return;
            for (const e of sel) {
                const idx = sceneObjects.indexOf(e); if (idx > -1) sceneObjects.splice(idx, 1);
                if (e.group) { const gi = e.group.parts.indexOf(e); if (gi > -1) e.group.parts.splice(gi, 1); }
                if (e.env) releaseEnv(e);
            }
            setSelection([], null); ctxMenu.style.display = 'none'; trace("Object Deleted", "success");
        });
        document.getElementById('ctx-reset').addEventListener('click', () => {
            const sel = getSelection(); if (!sel.length) return; window.pushUndo();
            for (const e of sel) { e.pos = { x: 0, y: 0.5, z: 0 }; e.rot = { x: 0, y: 0, z: 0 }; e.scale = { x: 1, y: 1, z: 1 }; }
            ctxMenu.style.display = 'none'; trace("Transform Reset", "success");
        });

        // --- SELECTION CHANGED ---
        const padGlyphs = { move: '\u279C', rotate: '\u21BB', scale: '\u25FC' };
        window.onSelectionChanged = function() {
            const sel = !!window.selectedEntity;
            document.getElementById('material-panel').style.display = sel ? 'block' : 'none';
            document.getElementById('gizmo-pad').classList.toggle('active', sel);
            const matSummary = document.querySelector('#material-panel summary');
            if (matSummary) matSummary.textContent = getSelection().length > 1 ? 'Material (' + getSelection().length + ' selected)' : 'Material';
            document.querySelectorAll('.pad-glyph').forEach(g => g.textContent = padGlyphs[window.currentGizmoMode] || '');
            if (sel && window.refreshMaterialPanel) window.refreshMaterialPanel();
        };

        // --- TREE PANEL LOGIC ---
        window.updateTreePanel = function() {
            const treeContent = document.getElementById('tree-content');
            const keepScroll = treeContent.scrollTop; treeContent.innerHTML = '';
            const sel = getSelection(); const isSel = (e) => sel.indexOf(e) >= 0;

            function row(o) {
                const item = document.createElement('div');
                item.className = 'tree-item' + (o.active ? ' active' : '') + (o.partial ? ' partial' : '');
                item.style.paddingLeft = (5 + o.indent * 14) + 'px';
                
                const tog = document.createElement('span'); tog.className = 'tree-toggle'; tog.textContent = o.toggle || '';
                if (o.toggle) tog.onclick = (ev) => { ev.stopPropagation(); o.onToggle(); }; item.appendChild(tog);
                
                if (o.entity) {
                    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'tree-cb'; cb.checked = isSel(o.entity);
                    cb.onchange = (ev) => { ev.stopPropagation(); toggleSelection([o.entity]); window.updateTreePanel(); }; item.appendChild(cb);
                }
                if (o.check !== undefined) { const ck = document.createElement('span'); ck.className = 'tree-check'; ck.textContent = o.check ? '☑️' : '⬜'; ck.onclick = (ev) => { ev.stopPropagation(); o.onCheck(); }; item.appendChild(ck); }
                if (o.thumb) { const im = document.createElement('img'); im.className = 'tree-thumb'; im.src = o.thumb; item.appendChild(im); }
                const lb = document.createElement('span'); lb.className = 'tree-label'; lb.textContent = o.label; item.appendChild(lb);
                
                if (o.entity && isSel(o.entity)) {
                    const actions = document.createElement('div'); actions.className = 'tree-actions';
                    const dup = document.createElement('span'); dup.textContent = '📄'; dup.onclick = (e) => { e.stopPropagation(); document.getElementById('ctx-dup').click(); };
                    const del = document.createElement('span'); del.textContent = '🗑️'; del.onclick = (e) => { e.stopPropagation(); document.getElementById('ctx-del').click(); };
                    const rst = document.createElement('span'); rst.textContent = '🔄'; rst.onclick = (e) => { e.stopPropagation(); document.getElementById('ctx-reset').click(); };
                    actions.appendChild(dup); actions.appendChild(del); actions.appendChild(rst); 
                    item.appendChild(actions);
                }
                
                if (o.onClick) item.onclick = o.onClick; 
                treeContent.appendChild(item);
            }
            
            const pick = (list, primary, label) => { trace(`Selected: ${label}`, "success"); if (window.multiSelectMode) toggleSelection(list); else setSelection(list, primary); };
            const doneGroups = new Set();
            
            sceneObjects.forEach((entity, index) => {
                const g = entity.group;
                if (!g) { row({ entity: entity, indent: 0, label: `📦 ${entity.name} (${index})`, active: isSel(entity), onClick: () => pick([entity], entity, entity.name) }); return; }
                if (doneGroups.has(g)) return; doneGroups.add(g);
                const n = g.parts.filter(isSel).length;
                row({ entity: g.parts[0], indent: 0, toggle: g.expanded ? '▼' : '▶', onToggle: () => { g.expanded = !g.expanded; window.updateTreePanel(); }, label: `📁 ${g.name} (${g.parts.length})`, active: n === g.parts.length, partial: n > 0 && n < g.parts.length, onClick: () => pick(g.parts, g.parts[0], g.name) });
                if (!g.expanded) return;
                g.parts.forEach(p => {
                    const info = p.imageInfo;
                    row({ entity: p, indent: 1, toggle: info ? (p.imageExpanded ? '▼' : '▶') : '', onToggle: () => { p.imageExpanded = !p.imageExpanded; window.updateTreePanel(); }, label: `🔒 ${p.name}`, active: isSel(p), onClick: () => pick([p], p, p.name) });
                    if (info && p.imageExpanded) { row({ indent: 2, check: !p.textureHidden, onCheck: () => { p.textureHidden = !p.textureHidden; window.updateTreePanel(); }, thumb: info.thumb, label: `${info.name} (${info.w}×${info.h})` }); }
                });
            });
            treeContent.scrollTop = keepScroll;
        };
        window.updateTreePanel();

        // --- MULTI-SELECT TOGGLE ---
        const multiBtn = document.getElementById('multi-toggle');
        multiBtn.addEventListener('click', () => {
            window.multiSelectMode = !window.multiSelectMode;
            multiBtn.classList.toggle('on', window.multiSelectMode);
            multiBtn.textContent = window.multiSelectMode ? '☑ Multi' : '☐ Multi';
            trace(`Multi-select ${window.multiSelectMode ? 'ON' : 'OFF'}`, "success");
        });

        // --- UI SLIDERS (Light & Camera) ---
        document.getElementById('light-strength').addEventListener('input', (e) => lightStrength = parseFloat(e.target.value));
        document.getElementById('light-color').addEventListener('input', (e) => { const hex = e.target.value; lightColor[0] = parseInt(hex.substr(1, 2), 16) / 255; lightColor[1] = parseInt(hex.substr(3, 2), 16) / 255; lightColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });
        document.getElementById('fov-slider').addEventListener('input', (e) => window.fovValue = parseFloat(e.target.value));
        document.getElementById('fog-color').addEventListener('input', (e) => { const hex = e.target.value; window.fogColor[0] = parseInt(hex.substr(1, 2), 16) / 255; window.fogColor[1] = parseInt(hex.substr(3, 2), 16) / 255; window.fogColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });
        document.getElementById('fog-density').addEventListener('input', (e) => window.fogDensity = parseFloat(e.target.value));
        document.getElementById('light-azimuth').addEventListener('input', (e) => { lightAzimuth = parseFloat(e.target.value); updateLightDir(); });
        document.getElementById('light-elevation').addEventListener('input', (e) => { lightElevation = parseFloat(e.target.value); updateLightDir(); });
        document.getElementById('light-ambient').addEventListener('input', (e) => lightAmbient = parseFloat(e.target.value));
        document.getElementById('light-ambient-color').addEventListener('input', (e) => { const hex = e.target.value; lightAmbientColor[0] = parseInt(hex.substr(1, 2), 16) / 255; lightAmbientColor[1] = parseInt(hex.substr(3, 2), 16) / 255; lightAmbientColor[2] = parseInt(hex.substr(5, 2), 16) / 255; });

        // --- GIZMOS & SPAWNING ---
        document.querySelectorAll('.gizmo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.gizmo-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
                window.currentGizmoMode = e.target.id.replace('gizmo-', ''); window.gizmoDrag = null; window.onSelectionChanged();
            });
        });

        const addBtn = document.getElementById('add-model-btn'); const addMenu = document.getElementById('add-model-menu');
        addBtn.addEventListener('click', () => { addMenu.style.display = addMenu.style.display === 'flex' ? 'none' : 'flex'; });
        
        document.getElementById('spawn-cube').addEventListener('click', () => {
            addMenu.style.display = 'none';
            const newCube = { name: "Cube", isTextured: false, pos: { x: (Math.random() - 0.5) * 2, y: 0.5, z: (Math.random() - 0.5) * 2 }, rot: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: [1.0, 0.5, 0.2, 1.0] };
            const mesh = buildCubeMesh(); newCube.posBuffer = mesh.posBuf; newCube.normalBuffer = mesh.normBuf; newCube.idxBuffer = mesh.idxBuf; newCube.triCount = mesh.triCount;
            newCube.material = makeMaterial('matte', [1.0, 0.5, 0.2]);
            sceneObjects.push(newCube); window.updateTreePanel(); 
        });

        const importGlbBtn = document.getElementById('import-glb-btn'); const glbInput = document.getElementById('glbUpload');
        importGlbBtn.addEventListener('click', () => { glbInput.click(); });
        glbInput.addEventListener('change', function(e) {
            const file = e.target.files[0]; if (!file) return;
            if (!/\.glb$/i.test(file.name)) { trace("Please pick a .glb file.", "error"); glbInput.value = ''; return; }
            addMenu.style.display = 'none'; if (typeof loadGLBFile === 'function') loadGLBFile(file);
        });

        // --- MATERIAL PANEL ---
        const matTypeSel = document.getElementById('mat-type');
        if (typeof MATERIAL_TYPES !== 'undefined') { Object.keys(MATERIAL_TYPES).forEach(key => { const opt = document.createElement('option'); opt.value = key; opt.textContent = MATERIAL_TYPES[key].label; matTypeSel.appendChild(opt); }); }
        const rgbToHex = (c) => '#' + c.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
        
        window.refreshMaterialPanel = function() {
            const sel = window.selectedEntity; if (!sel) return;
            const m = ensureMaterial(sel); matTypeSel.value = m.type;
            document.getElementById('model-color').value = rgbToHex(m.color);
            document.getElementById('mat-color-label').textContent = sel.isTextured ? 'Tint:' : 'Color:';
            document.getElementById('mat-filter').value = m.pixelClean ? 'NEAREST' : 'LINEAR';
            document.getElementById('mat-glow-radius').value = m.glowRadius || 5;
            const fr = document.getElementById('mat-filter-row'); if (fr) fr.style.display = sel.isTextured ? 'flex' : 'none';
            const gr = document.getElementById('mat-glow-row'); if (gr) gr.style.display = m.type === 'glow' ? 'flex' : 'none';
            const szRow = document.getElementById('mat-size-row'); if (szRow) { const g = sel.group; szRow.style.display = g ? 'flex' : 'none'; if (g) { document.getElementById('mat-size').value = g.sizeFactor || 1; document.getElementById('mat-size-val').textContent = Math.round((g.sizeFactor || 1) * 100) + '%'; } }
            const box = document.getElementById('mat-params'); box.innerHTML = '';
            MATERIAL_TYPES[m.type].params.forEach(key => {
                const def = MATERIAL_PARAM_DEFS[key]; const row = document.createElement('div'); row.className = 'control-row';
                const label = document.createElement('label'); label.textContent = def.label + ':';
                const input = document.createElement('input'); input.type = 'range'; input.min = def.min; input.max = def.max; input.step = def.step; input.value = m[key];
                input.addEventListener('input', () => { const v = parseFloat(input.value); getSelection().forEach(en => { ensureMaterial(en)[key] = v; }); });
                row.appendChild(label); row.appendChild(input); box.appendChild(row);
            });
        };
        matTypeSel.addEventListener('change', () => {
            if (!window.selectedEntity) return; getSelection().forEach(en => applyMaterialType(ensureMaterial(en), matTypeSel.value));
            window.refreshMaterialPanel();
        });
        document.getElementById('model-color').addEventListener('input', (e) => {
            if (!window.selectedEntity) return; const hex = e.target.value;
            const c = [parseInt(hex.substr(1, 2), 16) / 255, parseInt(hex.substr(3, 2), 16) / 255, parseInt(hex.substr(5, 2), 16) / 255];
            getSelection().forEach(en => { ensureMaterial(en).color = c.slice(); });
        });
        document.getElementById('mat-filter').addEventListener('change', (e) => {
            const pixel = e.target.value === 'NEAREST';
            for (const en of getSelection()) { if (en.isTextured && en.material) en.material.pixelClean = pixel; }
            trace(pixel ? 'Texture: Pixel clean (crisp pixels)' : 'Texture: Blend (smooth)', 'success');
        });
        document.getElementById('mat-glow-radius').addEventListener('input', (e) => {
            const sel = getSelection(); for (const en of sel) { if (en.material) en.material.glowRadius = parseFloat(e.target.value); }
        });

        // --- TOUCH CONTROLS ---
        document.querySelectorAll('.pad-handle').forEach(handle => {
            const axis = parseInt(handle.dataset.axis, 10); let active = false, lastX = 0;
            handle.addEventListener('pointerdown', (e) => { active = true; lastX = e.clientX; window.padAxis = axis; if (window.pushUndo) window.pushUndo(); handle.setPointerCapture(e.pointerId); e.preventDefault(); });
            handle.addEventListener('pointermove', (e) => { if (!active) return; applyPadDelta(axis, e.clientX - lastX); lastX = e.clientX; });
            const end = () => { active = false; window.padAxis = null; };
            handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
        });

        function getDistance(touches) { return Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2)); }

        canvasElement.addEventListener('touchstart', (e) => {
            window.cameraAnim = null;
            if (painting && e.touches.length > 1) { paintEnd(); painting = false; }           // a second finger = move the camera instead
            if (PL.enabled && e.touches.length === 1) { painting = true; paintBegin(e.touches[0].clientX, e.touches[0].clientY); return; }
            if (e.touches.length === 1) {
                const t = e.touches[0];
                if (window.selectedEntity && typeof pickGizmoAxis === 'function') {
                    const axis = pickGizmoAxis(t.clientX, t.clientY);
                    if (axis >= 0 && beginGizmoDrag(axis, t.clientX, t.clientY)) { if (window.pushUndo) window.pushUndo(); isDragging = false; return; }
                }
                longPressTimer = setTimeout(() => {
                    const hit = typeof pickEntityAt === 'function' ? pickEntityAt(t.clientX, t.clientY) : null;
                    if (hit) { setSelection([hit], hit); ctxMenu.style.display = 'flex'; ctxMenu.style.left = t.clientX + 'px'; ctxMenu.style.top = t.clientY + 'px'; isDragging = false; }
                }, 600);
                isDragging = true; previousX = t.pageX; previousY = t.pageY;
            } else if (e.touches.length === 2) {
                clearTimeout(longPressTimer); window.gizmoDrag = null; isDragging = false; initialPinchDistance = getDistance(e.touches); initialRadius = window.cameraRadius;
                lastCX = (e.touches[0].pageX + e.touches[1].pageX) / 2; lastCY = (e.touches[0].pageY + e.touches[1].pageY) / 2;
            }
        });

        canvasElement.addEventListener('touchmove', (e) => {
            if (painting) { if (e.touches.length === 1) paintMove(e.touches[0].clientX, e.touches[0].clientY); return; }
            clearTimeout(longPressTimer);
            if (window.gizmoDrag) { if (e.touches.length === 1) updateGizmoDrag(e.touches[0].clientX, e.touches[0].clientY); return; }
            if (e.touches.length === 1 && isDragging) {
                let deltaX = e.touches[0].pageX - previousX; let deltaY = e.touches[0].pageY - previousY;
                window.cameraAngleY -= deltaX * 0.01; window.cameraAngleX += deltaY * 0.01; 
                previousX = e.touches[0].pageX; previousY = e.touches[0].pageY;
            } else if (e.touches.length === 2) {
                const currentDistance = getDistance(e.touches);
                window.cameraRadius = initialRadius * (initialPinchDistance / currentDistance); 
                window.cameraRadius = Math.min(100000, Math.max(0.001, window.cameraRadius));
                const cx = (e.touches[0].pageX + e.touches[1].pageX) / 2, cy = (e.touches[0].pageY + e.touches[1].pageY) / 2;
                panCamera(cx - lastCX, cy - lastCY); lastCX = cx; lastCY = cy;
            }
        });

        canvasElement.addEventListener('touchend', (e) => {
            if (painting) { paintEnd(); painting = false; return; }
            clearTimeout(longPressTimer);
            if (window.gizmoDrag) { window.gizmoDrag = null; isDragging = false; return; }
            if (e.touches.length === 0) {
                if (isDragging && Math.abs(e.changedTouches[0].pageX - previousX) < 5 && Math.abs(e.changedTouches[0].pageY - previousY) < 5) {
                    if (typeof handleTapSelection === 'function') handleTapSelection(e.changedTouches[0].pageX, e.changedTouches[0].pageY);
                }
                isDragging = false;
            }
        });
        canvasElement.addEventListener('touchcancel', () => { clearTimeout(longPressTimer); window.gizmoDrag = null; isDragging = false; });

        // --- START ENGINE ---
        try {
            if (typeof drawScene === 'function') { drawScene(); } else { trace("ERROR: drawScene not found.", "error"); }
        } catch (e) {
            trace("ENGINE CRASH: " + e.message, "error");
        }
      // --- UPDATE SYSTEM ---
document.getElementById('update-btn').addEventListener('click', async () => {
    const url = document.getElementById('update-url').value.trim();
    if (!url) return trace("Please enter a valid URL.", "warning");
    
    trace("Checking for updates at " + url + "...", "success");
    
    // List of files to try and download
    const filesToUpdate = [
        "style.css", "debug.js", "shaders.js", "init.js", "engine.js", 
        "skin.js", "environment.js", "paint.js", "render.js", "glb-loader.js", "ui.js", "video.js"
    ];
    
    let successCount = 0;
    
    for (const file of filesToUpdate) {
        try {
            // Fetch the file from the URL
            const res = await fetch(url + "/" + file + "?t=" + Date.now());
            if (res.ok) {
                const text = await res.text();
                localStorage.setItem('update_' + file, text);
                successCount++;
                trace(`Downloaded: ${file}`, "complied");
            }
        } catch (e) {
            // Ignore missing files, just try the next one
        }
    }
    
    if (successCount > 0) {
        alert(`Successfully downloaded ${successCount} updated files.\nThe app will now reload to apply the update.`);
        window.location.reload();
    } else {
        trace("Update failed. No files found at that URL.", "error");
    }
});

document.getElementById('revert-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to revert to the original app version?")) {
        // Clear all cached updates
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('update_')) localStorage.removeItem(k);
        });
        window.location.reload();
    }
});
        // --- VIEW MODES ---
window.viewMode = 1;
const viewBtn = document.getElementById('view-btn');
const viewIcons = { 1: '👁️', 2: '📐', 3: '🎨', 4: '💎' };
viewBtn.addEventListener('click', () => {
    window.viewMode++;
    if (window.viewMode > 4) window.viewMode = 1;
    viewBtn.textContent = viewIcons[window.viewMode];
    viewBtn.classList.toggle('active', window.viewMode !== 1);
    trace(`View Mode: ${window.viewMode}`, "success");
});
    }, 100);
};