// =====================================================================
//  view.js : View modes and top-center mode switches
// =====================================================================

window.initViewModes = function() {
    // --- MODE SWITCH (Space, Modeling, Animation) ---
    document.querySelectorAll('#mode-switch button').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            document.body.dataset.mode = mode;
            document.querySelectorAll('#mode-switch button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (typeof trace === 'function') trace(`Mode: ${mode}`, "success");
        });
    });

    // --- VIEW MODE (Eye Icon) ---
    window.viewMode = 1;
    const viewBtn = document.getElementById('view-btn');
    const viewIcons = { 1: '👁️', 2: '📐', 3: '🎨', 4: '💎' };
    
    if (viewBtn) {
        viewBtn.addEventListener('click', () => {
            window.viewMode++;
            if (window.viewMode > 4) window.viewMode = 1;
            viewBtn.textContent = viewIcons[window.viewMode];
            viewBtn.classList.toggle('active', window.viewMode !== 1);
            if (typeof trace === 'function') trace(`View Mode: ${window.viewMode}`, "success");
        });
    }
};