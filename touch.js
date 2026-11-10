// =====================================================================
//  touch.js : Canvas touch events, camera movement, and gizmo handles
// =====================================================================

window.initTouch = function() {
    const canvasElement = document.getElementById('glCanvas');
    const PL = window.PAINT || { enabled: false, visible: true, tool: 'pen', brushSize: 0.5, opacity: 1, color: '#000000' };
    let painting = false;
    let isDragging = false, previousX = 0, previousY = 0;
    window.cameraAngleY = 0; window.cameraAngleX = 0.2; window.cameraRadius = 5.0; 
    let initialPinchDistance = 0, initialRadius = 0, lastCX = 0, lastCY = 0;
    let longPressTimer = null;
    const ctxMenuEl = document.getElementById('context-menu');

    function getDistance(touches) { return Math.sqrt(Math.pow(touches[0].pageX - touches[1].pageX, 2) + Math.pow(touches[0].pageY - touches[1].pageY, 2)); }

    // --- PAD HANDLES ---
    document.querySelectorAll('.pad-handle').forEach(handle => {
        const axis = parseInt(handle.dataset.axis, 10); let active = false, lastX = 0;
        handle.addEventListener('pointerdown', (e) => { active = true; lastX = e.clientX; window.padAxis = axis; if (window.pushUndo) window.pushUndo(); handle.setPointerCapture(e.pointerId); e.preventDefault(); });
        handle.addEventListener('pointermove', (e) => { if (!active) return; applyPadDelta(axis, e.clientX - lastX); lastX = e.clientX; });
        const end = () => { active = false; window.padAxis = null; };
        handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
    });

    // --- CANVAS TOUCH ---
    if (canvasElement) {
        canvasElement.addEventListener('touchstart', (e) => {
            window.cameraAnim = null;
            if (painting && e.touches.length > 1) { paintEnd(); painting = false; }
            if (PL.enabled && e.touches.length === 1) { painting = true; paintBegin(e.touches[0].clientX, e.touches[0].clientY); return; }
            if (e.touches.length === 1) {
                const t = e.touches[0];
                if (window.selectedEntity && typeof pickGizmoAxis === 'function') {
                    const axis = pickGizmoAxis(t.clientX, t.clientY);
                    if (axis >= 0 && beginGizmoDrag(axis, t.clientX, t.clientY)) { if (window.pushUndo) window.pushUndo(); isDragging = false; return; }
                }
                longPressTimer = setTimeout(() => {
                    const hit = typeof pickEntityAt === 'function' ? pickEntityAt(t.clientX, t.clientY) : null;
                    if (hit) { setSelection([hit], hit); if(ctxMenuEl) { ctxMenuEl.style.display = 'flex'; ctxMenuEl.style.left = t.clientX + 'px'; ctxMenuEl.style.top = t.clientY + 'px'; } isDragging = false; }
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
    }
};