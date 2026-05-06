function switchTab(btn, tabId) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

function saveChanges() {
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