function switchTab(btn, tabId) {
    document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

function togglePasswordVisibility(btn) {
    const container = btn.closest('.password-input-container');
    if (!container) return;
    const input = container.querySelector('input');
    const eyeIcon = btn.querySelector('.eye-icon');
    const eyeOffIcon = btn.querySelector('.eye-off-icon');
    
    if (input && eyeIcon && eyeOffIcon) {
        if (input.type === 'password') {
            input.type = 'text';
            eyeIcon.style.display = 'none';
            eyeOffIcon.style.display = 'block';
        } else {
            input.type = 'password';
            eyeIcon.style.display = 'block';
            eyeOffIcon.style.display = 'none';
        }
    }
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    const isSuccess = type === 'success';
    const strokeColor = isSuccess ? '#22c55e' : '#ef4444';
    const svgIcon = isSuccess 
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>`;
        
    toast.innerHTML = `
        ${svgIcon}
        <span>${message}</span>
    `;
    
    toast.style.borderLeft = `4px solid ${strokeColor}`;
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

let tempAvatarData = null;
let currentAdminPhone = '';

async function fetchProfile() {
    try {
        const sessionStr = localStorage.getItem('aqua_monitor_admin_session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        const adminId = session.id;

        const profilePreview = document.getElementById('profilePreview');

        const user = await API.admins.getOne(adminId);
        if (user) {
            const fields = {};
            document.querySelectorAll('.field-group').forEach(group => {
                const label = group.querySelector('.field-label');
                const input = group.querySelector('.field-input');
                if (label && input) {
                    fields[label.textContent.trim().toLowerCase()] = input;
                }
            });

            if (fields['full name']) fields['full name'].value = user.name || '';
            if (fields['email address']) fields['email address'].value = user.email || '';
            if (fields['job title']) fields['job title'].value = user.job_title || 'System Administrator';
            if (fields['phone number']) {
                const rawP = user.phone || '';
                const normP = (rawP.startsWith('+63') && rawP.length === 13) ? '0' + rawP.slice(3) : rawP;
                fields['phone number'].value = normP;
                currentAdminPhone = normP;
                if (typeof attachPhoneInputFilter === 'function') {
                    attachPhoneInputFilter(fields['phone number']);
                }
            }
            if (fields['admin id']) fields['admin id'].value = `ADM${String(user.id).padStart(4, '0')}`;
            if (fields['engineering branch']) fields['engineering branch'].value = user.branch || 'General';
            if (fields['branch code']) fields['branch code'].value = user.branch_code || 'GEN';
            if (fields['status']) fields['status'].value = user.status || 'Active';
            if (fields['account created']) fields['account created'].value = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

            // Avatar sync: server is source of truth
            if (user.avatar) {
                if (profilePreview) profilePreview.src = user.avatar;
                session.avatar = user.avatar;
                localStorage.setItem('aqua_monitor_admin_session', JSON.stringify(session));
            } else if (session.avatar) {
                if (profilePreview) profilePreview.src = session.avatar;
                try {
                    await API.admins.update(adminId, { avatar: session.avatar });
                } catch (e) {
                    console.warn('Failed to sync avatar to server:', e);
                }
            } else {
                if (profilePreview) profilePreview.src = '../assets/images/default-avatar.jpg';
            }
        }
    } catch (error) {
        console.error('Failed to fetch profile:', error);
    }
}

async function saveChanges() {
    const fields = {};
    document.querySelectorAll('.field-group').forEach(group => {
        const label = group.querySelector('.field-label');
        const input = group.querySelector('.field-input');
        if (label && input) {
            fields[label.textContent.trim().toLowerCase()] = input;
        }
    });

    const activeTab = document.querySelector('.stab.active');
    const tabName = activeTab ? activeTab.getAttribute('data-tab') : 'profile';

    const sessionStr = localStorage.getItem('aqua_monitor_admin_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const adminId = session.id;

    try {
        if (tabName === 'profile') {
            const nameInput = fields['full name'];
            const emailInput = fields['email address'];
            const jobTitleInput = fields['job title'];
            const phoneInput = fields['phone number'];
            if (!nameInput || !emailInput) return;

            const name = Sanitizer.cleanInput(nameInput.value);
            const email = Sanitizer.cleanInput(emailInput.value);
            const job_title = jobTitleInput ? Sanitizer.cleanInput(jobTitleInput.value) : 'System Administrator';
            const rawPhone = phoneInput ? Sanitizer.cleanInput(phoneInput.value) : '';

            if (!name || !email) {
                showFeedbackModal({ type: 'error', title: 'Validation Error', message: 'Name and Email are required.' });
                return;
            }

            // Phone Validation
            if (rawPhone) {
                const phoneValidation = validatePhoneNumber(rawPhone);
                if (!phoneValidation.valid) {
                    showFeedbackModal({
                        type: 'error',
                        title: 'Invalid Phone Number',
                        message: phoneValidation.message
                    });
                    return;
                }
            }

            const cleanPhone = rawPhone ? validatePhoneNumber(rawPhone).cleaned : '';
            const isPhoneChanged = cleanPhone !== currentAdminPhone && (cleanPhone !== '' || currentAdminPhone !== '');

            const updatePayload = { name, email, job_title, phone: cleanPhone };

            if (tempAvatarData === 'REMOVE') {
                updatePayload.avatar = null;
            } else if (tempAvatarData) {
                updatePayload.avatar = tempAvatarData;
            }

            const executeUpdate = async () => {
                try {
                    const updated = await API.admins.update(adminId, updatePayload);
                    
                    session.name = updated.name;
                    session.email = updated.email;
                    session.job_title = updated.job_title;
                    currentAdminPhone = updated.phone || '';
                    
                    if (tempAvatarData === 'REMOVE') {
                        delete session.avatar;
                    } else if (tempAvatarData) {
                        session.avatar = tempAvatarData;
                    }
                    
                    localStorage.setItem('aqua_monitor_admin_session', JSON.stringify(session));
                    tempAvatarData = null;

                    if (typeof initAuthFeatures === 'function') {
                        initAuthFeatures();
                    }

                    showToast('Settings saved successfully', 'success');
                } catch (error) {
                    showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'An error occurred while updating settings.' });
                }
            };

            const isEmailChanged = email && email.toLowerCase() !== (session.email || '').toLowerCase();

            // If email changed, trigger Email OTP verification modal first
            if (isEmailChanged) {
                showEmailOtpModal({
                    newEmail: email,
                    entityType: 'admin',
                    entityId: adminId,
                    onVerified: (updated) => {
                        session.email = updated.email || email;
                        localStorage.setItem('aqua_monitor_admin_session', JSON.stringify(session));

                        if (isPhoneChanged && cleanPhone) {
                            showPhoneOtpModal({
                                phone: cleanPhone,
                                entityType: 'admin',
                                entityId: adminId,
                                onVerified: () => executeUpdate(),
                                onCancel: () => showToast('Phone number update cancelled.', 'info')
                            });
                        } else {
                            executeUpdate();
                        }
                    },
                    onCancel: () => {
                        showToast('Email update cancelled.', 'info');
                    }
                });
            } else if (isPhoneChanged && cleanPhone) {
                showPhoneOtpModal({
                    phone: cleanPhone,
                    entityType: 'admin',
                    entityId: adminId,
                    onVerified: () => executeUpdate(),
                    onCancel: () => {
                        showToast('Phone number update cancelled.', 'info');
                    }
                });
            } else {
                // Standard confirmation modal
                showFeedbackModal({
                    type: 'confirm',
                    title: 'Confirm Profile Update',
                    message: 'Are you sure you want to update your profile information?',
                    confirmText: 'Save Changes',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        executeUpdate();
                    }
                });
            }

        } else if (tabName === 'security') {
            const toggle2FA = document.getElementById('toggle2FA');
            const toggleSessionTimeout = document.getElementById('toggleSessionTimeout');
            const toggleLoginLimit = document.getElementById('toggleLoginLimit');

            const securityPayload = {};
            if (toggle2FA) securityPayload.enable_2fa = toggle2FA.classList.contains('on') ? 'true' : 'false';
            if (toggleSessionTimeout) securityPayload.session_timeout_enabled = toggleSessionTimeout.classList.contains('on') ? 'true' : 'false';
            if (toggleLoginLimit) securityPayload.login_limit_enabled = toggleLoginLimit.classList.contains('on') ? 'true' : 'false';

            const currentPassInput = fields['current password'];
            const newPassInput = fields['new password'];
            const confirmPassInput = fields['confirm new password'];

            const currentPassword = currentPassInput ? currentPassInput.value : '';
            const newPassword = newPassInput ? newPassInput.value : '';
            const confirmPassword = confirmPassInput ? confirmPassInput.value : '';

            const isPasswordFormFilled = currentPassword || newPassword || confirmPassword;

            if (isPasswordFormFilled) {
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showFeedbackModal({ type: 'error', title: 'Validation Error', message: 'All password fields are required to change password.' });
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showFeedbackModal({ type: 'error', title: 'Validation Error', message: 'New Password and Confirm Password do not match.' });
                    return;
                }

                if (newPassword.length < 8) {
                    showFeedbackModal({ type: 'error', title: 'Validation Error', message: 'New Password must be at least 8 characters long.' });
                    return;
                }

                showFeedbackModal({
                    type: 'confirm',
                    title: 'Confirm Security & Password Update',
                    message: 'Are you sure you want to update your security preferences and change password?',
                    confirmText: 'Save Changes',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        try {
                            await API.settings.update(securityPayload);
                            await API.admins.update(adminId, { current_password: currentPassword, new_password: newPassword });

                            currentPassInput.value = '';
                            newPassInput.value = '';
                            confirmPassInput.value = '';

                            showToast('Security settings and password updated successfully', 'success');
                        } catch (error) {
                            showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'An error occurred while updating settings.' });
                        }
                    }
                });
            } else {
                showFeedbackModal({
                    type: 'confirm',
                    title: 'Save Security Preferences',
                    message: 'Are you sure you want to save these security toggle preferences?',
                    confirmText: 'Save Settings',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        try {
                            await API.settings.update(securityPayload);
                            showToast('Security settings saved successfully', 'success');
                        } catch (error) {
                            showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'An error occurred while updating settings.' });
                        }
                    }
                });
            }
        }
    } catch (error) {
        showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'An error occurred while updating settings.' });
    }
}

function initProfileUpload() {
    const profileUpload = document.getElementById('profileUpload');
    const profilePreview = document.getElementById('profilePreview');

    if (profileUpload && profilePreview) {
        profileUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profilePreview.src = event.target.result;
                    tempAvatarData = event.target.result; 
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function removeProfilePhoto() {
    const profilePreview = document.getElementById('profilePreview');
    if (profilePreview) {
        profilePreview.src = '../assets/images/default-avatar.jpg';
        const fileInput = document.getElementById('profileUpload');
        if (fileInput) fileInput.value = '';
        tempAvatarData = 'REMOVE'; 
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const phoneField = document.getElementById('adminPhoneInput') || document.querySelector('input[type="tel"]');
        if (phoneField && typeof attachPhoneInputFilter === 'function') attachPhoneInputFilter(phoneField);
        fetchProfile();
        initProfileUpload();
        fetchHardwareNodes();
        fetchSecuritySettings();
    });
} else {
    const phoneField = document.getElementById('adminPhoneInput') || document.querySelector('input[type="tel"]');
    if (phoneField && typeof attachPhoneInputFilter === 'function') attachPhoneInputFilter(phoneField);
    fetchProfile();
    initProfileUpload();
    fetchHardwareNodes();
    fetchSecuritySettings();
}

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

    showFeedbackModal({
        type: 'confirm',
        title: 'Confirm Calibration Update',
        message: `Are you sure you want to update calibration parameters for ${device.serial_number}?`,
        confirmText: 'Save Parameters',
        cancelText: 'Cancel',
        onConfirm: async () => {
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
                
                showToast(response.message || 'Calibration constants updated successfully', 'success');
            } catch (error) {
                showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'Failed to save calibration parameters.' });
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHTML;
            }
        }
    });
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

async function fetchSecuritySettings() {
    try {
        if (typeof API === 'undefined' || !API.settings) return;
        const settings = await API.settings.getAll();
        if (!settings) return;

        const toggle2FA = document.getElementById('toggle2FA');
        const toggleSessionTimeout = document.getElementById('toggleSessionTimeout');
        const toggleLoginLimit = document.getElementById('toggleLoginLimit');

        if (toggle2FA) {
            const is2FA = settings.enable_2fa !== 'false';
            toggle2FA.classList.toggle('on', is2FA);
        }
        if (toggleSessionTimeout) {
            const isTimeout = settings.session_timeout_enabled !== 'false';
            toggleSessionTimeout.classList.toggle('on', isTimeout);
        }
        if (toggleLoginLimit) {
            const isLimit = settings.login_limit_enabled !== 'false';
            toggleLoginLimit.classList.toggle('on', isLimit);
        }
    } catch (e) {
        console.error('Failed to fetch security settings:', e);
    }
}

async function toggleSecuritySetting(key, element) {
    if (!element) return;
    const currentState = element.classList.contains('on');
    const newState = !currentState;

    element.classList.toggle('on', newState);

    try {
        await API.settings.update({ [key]: newState ? 'true' : 'false' });
        const labelMap = {
            'enable_2fa': 'Two-Factor Authentication',
            'session_timeout_enabled': 'Session Timeout',
            'login_limit_enabled': 'Login Attempt Limiting'
        };
        const label = labelMap[key] || 'Security setting';
        showToast(`${label} ${newState ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
        element.classList.toggle('on', currentState);
        showToast(`Failed to update setting: ${err.message}`, 'error');
    }
}

window.toggleSecuritySetting = toggleSecuritySetting;

