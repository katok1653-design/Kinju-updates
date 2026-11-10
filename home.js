// =====================================================================
//  home.js : Home screen, about modal, and project list
// =====================================================================

window.isEditorOpen = false;
window.enterEditor = function() {
    window.isEditorOpen = true; // Mark editor as open
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.add('hidden');
    
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.style.display = 'flex'; 
    
    if (typeof drawScene === 'function') drawScene(); 
    if (typeof trace === 'function') trace("Entered Editor Mode", "success");
};

// ADD THIS NEW FUNCTION:
window.goHome = function() {
    window.isEditorOpen = false; // Mark editor as closed
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) homeScreen.classList.remove('hidden');
    
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.style.display = 'none'; 
    
    // Clear the scene so the next project starts fresh
    if (typeof sceneObjects !== 'undefined') {
        sceneObjects.length = 0;
        if (typeof setSelection === 'function') setSelection([], null);
    }
    if(window.updateTreePanel) window.updateTreePanel();
};

const HOME_ACTIONS = {
    "btn-start": function() {
        if (typeof sceneObjects !== 'undefined') {
            sceneObjects.length = 0;
            if (typeof setSelection === 'function') setSelection([], null);
        }
        window.enterEditor();
    },
    
    "btn-open": function() {
        const modal = document.getElementById('project-modal');
        const listDiv = document.getElementById('project-list');
        if (!modal || !listDiv) return;
        
        listDiv.innerHTML = ''; 
        
        if (typeof Android !== 'undefined' && Android.getProjects) {
            try {
                const projectsStr = Android.getProjects();
                const projects = JSON.parse(projectsStr);
                
                if (projects.length === 0) {
                    listDiv.innerHTML = '<p style="color:#aaa; text-align:center;">No saved projects found.</p>';
                } else {
                    projects.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'project-item';
                        
                        let thumbHtml = '<div style="width:60px;height:60px;background:#444;border-radius:4px;margin-right:15px;display:flex;align-items:center;justify-content:center;font-size:24px;">📁</div>';
                        if (p.thumbPath) {
                            thumbHtml = `<img src="file://${p.thumbPath}" style="width:60px;height:60px;object-fit:cover;border-radius:4px;margin-right:15px;background:#111;">`;
                        }
                        
                        const projectName = p.filename.replace('.json', '');
                        item.innerHTML = `${thumbHtml}<span>${projectName}</span>`;
                        
                        item.onclick = () => {
    if (typeof Android === 'undefined' || !Android.readProject) return alert("Requires APK.");
    
    const projectJson = Android.readProject(p.filename);
    if (!projectJson) return alert("Failed to read project file.");
    
    try {
        const data = JSON.parse(projectJson);
        if (typeof loadProjectData === 'function') {
            loadProjectData(data);
            modal.style.display = 'none';
            window.enterEditor();
        }
    } catch (err) {
        alert("Error parsing project: " + err.message);
    }
};
                        listDiv.appendChild(item);
                    });
                }
            } catch (e) {
                listDiv.innerHTML = '<p style="color:red; text-align:center;">Error reading projects.</p>';
                console.error(e);
            }
        } else {
            listDiv.innerHTML = '<p style="color:#aaa; text-align:center;">Project loading requires the APK version.</p>';
        }
        
        modal.style.display = 'flex';
    },

    "btn-settings": function() {
        alert("Settings menu is coming soon in a future update!");
    },

    "btn-about": function() {
        const modal = document.getElementById('about-modal');
        if (modal) modal.style.display = 'flex';
    },

    "close-project-modal": function() {
        const modal = document.getElementById('project-modal');
        if (modal) modal.style.display = 'none';
    },

    "close-about-modal": function() {
        const modal = document.getElementById('about-modal');
        if (modal) modal.style.display = 'none';
    },

    "btn-email": function() {
        window.location.href = "mailto:Katok1653@gmail.com?subject=Kinju Feedback (v0.0.7)";
    }
};

window.initHome = function() {
    const home = document.getElementById('home-screen');
    if (!home) return;

    let lastHandled = 0;
    
    function handleTarget(target) {
        if (!target || !target.closest) return false;
        const btn = target.closest('button');
        if (!btn || !btn.id) return false;
        
        const action = HOME_ACTIONS[btn.id];
        if (!action) return false;
        
        const now = Date.now();
        if (now - lastHandled < 400) return true;
        lastHandled = now;
        
        try { action(); } catch(e) { console.error("Action failed:", e); }
        return true;
    }

    home.addEventListener('click', (e) => handleTarget(e.target), false);
    home.addEventListener('touchend', (e) => {
        if (handleTarget(e.target)) e.preventDefault();
    }, { passive: false });

    ['project-modal', 'about-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) modal.addEventListener('click', (e) => handleTarget(e.target), false);
    });
};