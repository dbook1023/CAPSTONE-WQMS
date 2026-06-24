function switchTab(btn, tabId) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

async function fetchProfile() {
    try {
        // Use the global API service from api.js
        // If api.js is not loaded, we need to make sure it is in the HTML
        if (typeof API !== 'undefined' && API.users && API.users.getMe) {
            const user = await API.users.getMe();
            if (user) {
                const nameInput = document.querySelector('input[value="John Doe"]');
                const emailInput = document.querySelector('input[value="john.doe@olfu.edu.ph"]');
                const staffIdInput = document.querySelector('input[value="2024-0001"]');
                
                if (nameInput) nameInput.value = user.name;
                if (emailInput) emailInput.value = user.email;
                if (staffIdInput) staffIdInput.value = `USR-${String(user.id).padStart(4, '0')}`;
            }
        }
    } catch (error) {
        console.error('Failed to fetch profile:', error);
    }
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
    fetchProfile();
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
