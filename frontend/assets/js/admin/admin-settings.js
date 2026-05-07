function switchTab(btn, tabId) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

function saveChanges() {
    // Sanitize all inputs in the current view
    const inputs = document.querySelectorAll('.field-input');
    inputs.forEach(input => {
        if (input.type !== 'password') {
            input.value = Sanitizer.cleanInput(input.value);
        }
    });

    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── PROFILE IMAGE UPLOAD ──
document.addEventListener('DOMContentLoaded', function() {
    const profileUpload = document.getElementById('profileUpload');
    const profilePreview = document.getElementById('profilePreview');

    if (profileUpload && profilePreview) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profilePreview.src = event.target.result;
                    // In a real app, you would upload the file here via fetch/POST
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

function removeProfilePhoto() {
    const profilePreview = document.getElementById('profilePreview');
    if (profilePreview) {
        profilePreview.src = '../assets/images/default-avatar.png';
        document.getElementById('profileUpload').value = '';
    }
}

// ── HARDWARE CONFIGURATION ──
function generateConfig() {
    // In a real implementation, this would fetch current values and trigger a download of a .h file
    const toast = document.getElementById('toast');
    const originalText = toast.innerText;
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> config.h generated successfully`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.innerText = originalText; }, 300);
    }, 2800);
}

function syncHardware() {
    // Simulate OTA (Over-The-Air) update
    const toast = document.getElementById('toast');
    const originalText = toast.innerText;
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg> Syncing with all ESP32 nodes...`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> All nodes updated successfully`;
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.innerText = originalText; }, 300);
        }, 2000);
    }, 2500);
}
