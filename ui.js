// =====================================================================
//  ui.js : Main UI setup, Tree Panel, Export, Spawning, and Context Menu
// =====================================================================

(function() {
    setTimeout(function() {
        try {
            if (typeof trace === 'function') trace("Page fully loaded. Setting up UI...", "success");
            
            window.fovValue = 60;
            window.fogColor = [0.8, 0.85, 0.9]; 
            window.fogDensity = 0.0; 
            window.currentGizmoMode = 'move';

            // --- UI TOGGLE LOGIC ---
            const uiPanel = document.getElementById('ui-panel');
            const treePanel = document.getElementById('tree-panel');
            const debugPanel = document.getElementById('debug-panel');
            const debugBtn = document.getElementById('log-toggle-btn');
            
            document.getElementById('ui-toggle-btn')?.addEventListener('click', () => uiPanel.classList.toggle('open'));
            document.getElementById('tree-toggle-btn')?.addEventListener('click', () => treePanel.classList.toggle('open'));
            
            if (debugBtn) {
                debugBtn.addEventListener('click', () => {
                    debugPanel.classList.toggle('open');
                    if (debugPanel.classList.contains('open')) { debugBtn.innerText = '❌'; debugBtn.style.color = '#ff3333'; } 
                    else { debugBtn.innerText = '📜'; debugBtn.style.color = 'white'; }
                });
            }

            document.getElementById('clear-log')?.addEventListener('click', () => {
                document.getElementById('log-content').innerHTML = '';
                if (typeof trace === 'function') trace('Log cleared', 'complied');
            });

            // =====================================================================
            //  TREE PANEL LOGIC (RESTORED)
            // =====================================================================
            window.updateTreePanel = function() {
                const treeContent = document.getElementById('tree-content');
                if (!treeContent) return;
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
                
                const pick = (list, primary, label) => { if (typeof trace === 'function') trace(`Selected: ${label}`, "success"); if (window.multiSelectMode) toggleSelection(list); else setSelection(list, primary); };
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
            document.getElementById('multi-toggle')?.addEventListener('click', () => {
                window.multiSelectMode = !window.multiSelectMode;
                document.getElementById('multi-toggle').classList.toggle('on', window.multiSelectMode);
                document.getElementById('multi-toggle').textContent = window.multiSelectMode ? '☑ Multi' : '☐ Multi';
                if (typeof trace === 'function') trace(`Multi-select ${window.multiSelectMode ? 'ON' : 'OFF'}`, "success");
            });

            // --- GIZMOS & SPAWNING ---
            document.querySelectorAll('.gizmo-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.gizmo-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
                    window.currentGizmoMode = e.target.id.replace('gizmo-', ''); window.gizmoDrag = null; if (window.onSelectionChanged) window.onSelectionChanged();
                });
            });

            const addBtn = document.getElementById('add-model-btn'); const addMenu = document.getElementById('add-model-menu');
            addBtn?.addEventListener('click', () => { addMenu.style.display = addMenu.style.display === 'flex' ? 'none' : 'flex'; });
            
            document.getElementById('spawn-cube')?.addEventListener('click', () => {
                addMenu.style.display = 'none';
                const newCube = { name: "Cube", isTextured: false, pos: { x: (Math.random() - 0.5) * 2, y: 0.5, z: (Math.random() - 0.5) * 2 }, rot: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, color: [1.0, 0.5, 0.2, 1.0] };
                const mesh = buildCubeMesh(); newCube.posBuffer = mesh.posBuf; newCube.normalBuffer = mesh.normBuf; newCube.idxBuffer = mesh.idxBuf; newCube.triCount = mesh.triCount;
                newCube.material = makeMaterial('matte', [1.0, 0.5, 0.2]);
                sceneObjects.push(newCube); if(window.updateTreePanel) window.updateTreePanel(); 
            });

            const importGlbBtn = document.getElementById('import-glb-btn'); const glbInput = document.getElementById('glbUpload');
            importGlbBtn?.addEventListener('click', () => { glbInput.click(); });
            glbInput?.addEventListener('change', function(e) {
                const file = e.target.files[0]; if (!file) return;
                if (!/\.glb$/i.test(file.name)) { if (typeof trace === 'function') trace("Please pick a .glb file.", "error"); glbInput.value = ''; return; }
                addMenu.style.display = 'none'; if (typeof loadGLBFile === 'function') loadGLBFile(file);
            });

            // --- UNDO SYSTEM ---
            window.undoHistory = [];
            window.pushUndo = function() {
                const sel = (typeof getSelection === 'function') ? getSelection() : []; 
                if (!sel.length) return;
                const states = sel.map(e => ({ entity: e, pos: { x: e.pos.x, y: e.pos.y, z: e.pos.z }, rot: { x: e.rot.x, y: e.rot.y, z: e.rot.z }, scale: { x: e.scale.x, y: e.scale.y, z: e.scale.z } }));
                window.undoHistory.push(states);
                if (window.undoHistory.length > 20) window.undoHistory.shift();
            };
            
            document.getElementById('undo-btn')?.addEventListener('click', () => {
                if (window.undoHistory.length === 0) return;
                const states = window.undoHistory.pop();
                states.forEach(s => { s.entity.pos = { ...s.pos }; s.entity.rot = { ...s.rot }; s.entity.scale = { ...s.scale }; });
                if (typeof trace === 'function') trace("Undid last action", "success");
                if (window.onSelectionChanged) window.onSelectionChanged();
            });

            // --- CONTEXT MENU ---
            const ctxMenu = document.getElementById('context-menu');
            document.getElementById('ctx-dup')?.addEventListener('click', () => {
                const sel = getSelection(); if (!sel.length) return;
                const made = [];
                for (const clone of sel) {
                    const newObj = { ...clone, name: clone.name + ' copy', env: null, pos: { x: clone.pos.x + 1, y: clone.pos.y, z: clone.pos.z }, rot: { ...clone.rot }, scale: { ...clone.scale }, material: JSON.parse(JSON.stringify(clone.material)) };
                    sceneObjects.push(newObj); if (clone.group) clone.group.parts.push(newObj); made.push(newObj);
                }
                setSelection(made, made[made.length - 1]); if(ctxMenu) ctxMenu.style.display = 'none'; if (typeof trace === 'function') trace("Object Duplicated", "success");
            });
            document.getElementById('ctx-del')?.addEventListener('click', () => {
                const sel = getSelection(); if (!sel.length) return;
                for (const e of sel) {
                    const idx = sceneObjects.indexOf(e); if (idx > -1) sceneObjects.splice(idx, 1);
                    if (e.group) { const gi = e.group.parts.indexOf(e); if (gi > -1) e.group.parts.splice(gi, 1); }
                    if (e.env) releaseEnv(e);
                }
                setSelection([], null); if(ctxMenu) ctxMenu.style.display = 'none'; if (typeof trace === 'function') trace("Object Deleted", "success");
            });
            document.getElementById('ctx-reset')?.addEventListener('click', () => {
                const sel = getSelection(); if (!sel.length) return; window.pushUndo();
                for (const e of sel) { e.pos = { x: 0, y: 0.5, z: 0 }; e.rot = { x: 0, y: 0, z: 0 }; e.scale = { x: 1, y: 1, z: 1 }; }
                if(ctxMenu) ctxMenu.style.display = 'none'; if (typeof trace === 'function') trace("Transform Reset", "success");
            });

            // =====================================================================
            //  EXPORT PICTURE (RESTORED)
            // =====================================================================
            const exportMenu = document.getElementById('export-menu'), exportPreview = document.getElementById('export-preview');
            const saveExportedImage = (res, name) => {
    if (typeof trace === 'function') trace("Attempting to save image...", "warning");
    const b64 = res.url.split(',')[1];
    
    if (window.Android && window.Android.savePng) { 
        try {
            if (typeof trace === 'function') trace("Calling Android.savePng...", "success");
            window.Android.savePng(name, b64); 
        } catch(e) {
            if (typeof trace === 'function') trace("Java crashed: " + e.message, "error");
        }
    } else { 
        if (typeof trace === 'function') trace("Android.savePng NOT FOUND in WebView.", "error");
        try { 
            const a = document.createElement('a'); a.href = res.url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); 
            if (typeof trace === 'function') trace('Downloaded ' + name, "success");
        } catch (err) { 
            if (typeof trace === 'function') trace('Export failed: ' + err.message, "error"); 
        } 
    }
    
    if(document.getElementById('export-img')) document.getElementById('export-img').src = res.url;
    if(document.getElementById('export-note')) document.getElementById('export-note').textContent = `${name} (${res.w} x ${res.h})`;
    if(exportPreview) exportPreview.style.display = 'flex';
};
            
            document.getElementById('export-btn')?.addEventListener('click', () => { if(exportMenu) exportMenu.style.display = 'flex'; });
            document.getElementById('export-cancel')?.addEventListener('click', () => { if(exportMenu) exportMenu.style.display = 'none'; });
            document.getElementById('export-close')?.addEventListener('click', () => { if(exportPreview) exportPreview.style.display = 'none'; });
            
            if (exportMenu) {
                exportMenu.querySelectorAll('button[data-fmt]').forEach(btn => btn.addEventListener('click', () => {
                    const fmt = btn.dataset.fmt; 
                    exportMenu.style.display = 'none'; 
                    if (typeof trace === 'function') trace('Exporting picture...', "warning");
                    
                    setTimeout(() => {
                        try { 
                            if (typeof exportView !== 'function') throw new Error("exportView function not found in render.js");
                            const res = exportView(fmt); 
                            saveExportedImage(res, `render_${fmt}_${Date.now()}.png`); 
                        } catch (err) { 
                            if (typeof trace === 'function') trace('Export failed: ' + err.message, "error"); 
                        }
                    }, 60);
                }));
            }

            // --- SAVE BUTTON & CUSTOM MODAL ---
const saveModal = document.getElementById('save-modal');
const saveNameInput = document.getElementById('save-project-name');
let isSavingFromBackButton = false;

// This is called by MainActivity.java
window.handleAndroidBackButton = function() {
    if (window.isEditorOpen) {
        // We are in the editor. Ask to save.
        isSavingFromBackButton = true;
        saveNameInput.value = window.currentProjectName || "Project 1";
        saveModal.classList.add('open');
    } else {
        // We are on the home screen. Close the app.
        if (typeof Android !== 'undefined' && Android.exitApp) {
            Android.exitApp();
        }
    }
};

document.getElementById('save-btn')?.addEventListener('click', () => {
    if (typeof Android === 'undefined') return alert("Saving requires the APK version.");
    isSavingFromBackButton = false; // Opened manually, not via back button
    saveNameInput.value = window.currentProjectName || "Project 1";
    saveModal.classList.add('open');
});

document.getElementById('save-cancel-btn')?.addEventListener('click', () => {
    saveModal.classList.remove('open');
    
    // If they clicked back, but canceled the save, just take them home anyway
    if (isSavingFromBackButton) {
        isSavingFromBackButton = false;
        if (typeof window.goHome === 'function') window.goHome();
    }
});

document.getElementById('save-confirm-btn')?.addEventListener('click', () => {
    const name = saveNameInput.value.trim();
    if (!name) return alert("Please enter a project name.");
    
    window.currentProjectName = name;
    saveModal.classList.remove('open');
    
    if (typeof trace === 'function') trace("Saving project...", "success");
    
    if (typeof getProjectJSON === 'function' && typeof exportView === 'function') {
        const json = getProjectJSON();
        const thumb = exportView('thumbnail').url; 
        
        Android.saveProject(name + ".kinju", json, thumb);
        
        // If they pressed back, take them to the home screen after saving
        if (isSavingFromBackButton) {
            isSavingFromBackButton = false;
            setTimeout(() => {
                if (typeof window.goHome === 'function') window.goHome();
            }, 500); // Small delay to ensure the save finishes
        }
    }
});

// =====================================================================
//  UPDATE SYSTEM (GOLDEN NOTICE)
// =====================================================================
const updateNoticeModal = document.getElementById('update-notice-modal');
const updateNoticeText = document.getElementById('update-notice-text');

document.getElementById('update-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('update-url').value.trim();
    if (!url) return trace("Please enter a valid URL.", "warning");
    
    trace("Checking for updates at " + url + "...", "success");
    const filesToUpdate = ["style.css", "debug.js", "shaders.js", "init.js", "engine.js", "skin.js", "environment.js", "paint.js", "render.js", "glb-loader.js", "ui.js", "home.js", "view.js", "settings.js", "touch.js"];
    let successCount = 0;
    
    for (const file of filesToUpdate) {
        try {
            const res = await fetch(url + "/" + file + "?t=" + Date.now());
            if (res.ok) {
                const text = await res.text();
                localStorage.setItem('update_' + file, text);
                successCount++;
                trace(`Downloaded: ${file}`, "complied");
            }
        } catch (e) {}
    }
    
    if (successCount > 0) {
        // Show the GOLDEN border notice
        updateNoticeText.textContent = `Successfully downloaded ${successCount} updated files.`;
        updateNoticeModal.classList.add('open');
    } else {
        trace("Update failed. No files found at that URL.", "error");
    }
});

document.getElementById('update-notice-ok')?.addEventListener('click', () => {
    window.location.reload();
});

document.getElementById('revert-btn')?.addEventListener('click', () => {
    if (confirm("Are you sure you want to revert to the original app version?")) {
        const keys = Object.keys(localStorage);
        keys.forEach(k => { if (k.startsWith('update_')) localStorage.removeItem(k); });
        window.location.reload();
    }
});

            // =====================================================================
            //  INITIALIZE SUB-MODULES
            // =====================================================================
            if (typeof initHome === 'function') initHome();
            if (typeof initViewModes === 'function') initViewModes();
            if (typeof initSettings === 'function') initSettings();
            if (typeof initTouch === 'function') initTouch();

        } catch(e) {
            console.error("Kinju: UI setup failed:", e);
            if (typeof trace === 'function') trace("UI setup failed: " + e.message, "error");
            if (typeof window.showBootError === 'function') window.showBootError("UI setup failed: " + e.message);
        }
    }, 100);
})();