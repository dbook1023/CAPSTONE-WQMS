function switchTab(btn, tabId) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    fetchProfile();
});

async function fetchProfile() {
    try {
        const user = await API.users.getMe();
        if (user) {
            // Update profile fields
            const nameInput = document.querySelector('input[value="Admin User"]');
            const emailInput = document.querySelector('input[value="admin@olfu.edu.ph"]');
            const jobTitleInput = document.querySelector('input[value="System Administrator"]');
            
            if (nameInput) nameInput.value = user.name;
            if (emailInput) emailInput.value = user.email;
            // Job title is mock-ish since it's not in DB yet, but we'll set it based on role
            if (jobTitleInput) jobTitleInput.value = user.role_name || 'System Administrator';
            
            // Update Employee ID if possible
            const empIdInput = document.querySelector('input[value="OLFU-ADM-2025"]');
            if (empIdInput) empIdInput.value = `OLFU-USR-${user.id}`;
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
let registeredDevices = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchHardwareNodes();
});

async function fetchHardwareNodes() {
    try {
        const devices = await API.sensors.getAll();
        registeredDevices = devices;
        populateCalibrationSelect(devices);
    } catch (error) {
        console.error('Failed to fetch hardware for settings:', error);
    }
}

function populateCalibrationSelect(devices) {
    const select = document.getElementById('calibrationDeviceSelect');
    if (!select) return;
    
    // Clear existing dynamic options
    select.innerHTML = '<option value="" disabled selected>Select a physical device...</option>';
    
    devices.forEach(d => {
        const option = document.createElement('option');
        option.value = d.serial_number;
        option.textContent = `${d.serial_number} (${d.fountain_name})`;
        select.appendChild(option);
    });
}

function loadDeviceCalibration() {
    const select = document.getElementById('calibrationDeviceSelect');
    const container = document.getElementById('calibrationFieldsContainer');
    if (!select || !container) return;
    
    const serial = select.value;
    const device = registeredDevices.find(d => d.serial_number === serial);
    if (!device) return;
    
    // Show fields
    container.style.display = 'block';
    
    // Extract parameters
    let cal = {};
    if (typeof device.calibration_params === 'string') {
        try {
            cal = JSON.parse(device.calibration_params);
        } catch (e) {
            cal = {};
        }
    } else {
        cal = device.calibration_params || {};
    }
    
    // Pre-populate fields with default fallbacks
    document.getElementById('phSlopeInput').value = cal.ph_slope ?? -5.70;
    document.getElementById('phOffsetInput').value = cal.ph_offset ?? 21.34;
    document.getElementById('tdsKInput').value = cal.tds_k_value ?? 0.2;
    document.getElementById('turbAInput').value = cal.turb_a ?? -1120.4;
    document.getElementById('turbBInput').value = cal.turb_b ?? 5742.3;
    document.getElementById('turbCInput').value = cal.turb_c ?? -4352.9;
}

async function saveDeviceCalibration() {
    const select = document.getElementById('calibrationDeviceSelect');
    if (!select || !select.value) return;
    
    const serial = select.value;
    const device = registeredDevices.find(d => d.serial_number === serial);
    if (!device) return;
    
    const saveBtn = document.getElementById('saveCalBtn');
    const originalBtnHTML = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving Constants...';
    
    const payload = {
        serial_number: device.serial_number,
        fountain_id: device.fountain_id,
        calibration_params: {
            ph_slope: parseFloat(document.getElementById('phSlopeInput').value),
            ph_offset: parseFloat(document.getElementById('phOffsetInput').value),
            tds_k_value: parseFloat(document.getElementById('tdsKInput').value),
            turb_a: parseFloat(document.getElementById('turbAInput').value),
            turb_b: parseFloat(document.getElementById('turbBInput').value),
            turb_c: parseFloat(document.getElementById('turbCInput').value)
        }
    };
    
    try {
        const response = await API.sensors.register(payload);
        
        // Refresh local cache
        await fetchHardwareNodes();
        
        // Reselect and trigger refresh of fields
        select.value = serial;
        loadDeviceCalibration();
        
        // Show success toast
        const toast = document.getElementById('toast');
        const originalText = toast.innerText;
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${response.message}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { toast.innerText = originalText; }, 300);
        }, 2800);
        
    } catch (error) {
        alert('Failed to save calibration parameters: ' + error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHTML;
    }
}

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
