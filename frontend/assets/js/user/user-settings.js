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
let currentUserPhone = '';

async function fetchProfile() {
    try {
        const sessionStr = localStorage.getItem('aqua_monitor_user_session');
        if (!sessionStr) return;
        const session = JSON.parse(sessionStr);
        const userId = session.id;

        const profilePreview = document.getElementById('profilePreview');

        if (typeof API !== 'undefined' && API.users) {
            const user = await API.users.getOne(userId);
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
                if (fields['user id']) fields['user id'].value = `PCO${String(user.id).padStart(4, '0')}`;
                if (fields['phone number']) {
                    const rawP = user.phone || '';
                    const normP = (rawP.startsWith('+63') && rawP.length === 13) ? '0' + rawP.slice(3) : rawP;
                    fields['phone number'].value = normP;
                    currentUserPhone = normP;
                    if (typeof attachPhoneInputFilter === 'function') {
                        attachPhoneInputFilter(fields['phone number']);
                    }
                }
                if (fields['system role']) fields['system role'].value = user.role_name || '';
                if (fields['engineering branch']) fields['engineering branch'].value = user.branch || 'General';
                if (fields['branch code']) fields['branch code'].value = user.branch_code || 'GEN';
                if (fields['status']) fields['status'].value = user.status || 'Active';
                if (fields['account created']) fields['account created'].value = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

                // Avatar sync: server is source of truth
                if (user.avatar) {
                    if (profilePreview) profilePreview.src = user.avatar;
                    session.avatar = user.avatar;
                    localStorage.setItem('aqua_monitor_user_session', JSON.stringify(session));
                } else if (session.avatar) {
                    if (profilePreview) profilePreview.src = session.avatar;
                    try {
                        await API.users.update(userId, { avatar: session.avatar });
                    } catch (e) {
                        console.warn('Failed to sync avatar to server:', e);
                    }
                } else {
                    if (profilePreview) profilePreview.src = '../assets/images/default-avatar.jpg';
                }
            }
        } else {
            if (profilePreview && session.avatar) {
                profilePreview.src = session.avatar;
            } else if (profilePreview) {
                profilePreview.src = '../assets/images/default-avatar.jpg';
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

    const sessionStr = localStorage.getItem('aqua_monitor_user_session');
    if (!sessionStr) return;
    const session = JSON.parse(sessionStr);
    const userId = session.id;

    try {
        if (tabName === 'profile') {
            const nameInput = fields['full name'];
            const phoneInput = fields['phone number'];
            if (!nameInput) return;

            const name = Sanitizer.cleanInput(nameInput.value);
            const rawPhone = phoneInput ? Sanitizer.cleanInput(phoneInput.value) : '';

            if (!name) {
                showFeedbackModal({ type: 'error', title: 'Validation Error', message: 'Name is required.' });
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
            const isPhoneChanged = cleanPhone !== currentUserPhone && (cleanPhone !== '' || currentUserPhone !== '');

            const updatePayload = { name, phone: cleanPhone };

            if (tempAvatarData === 'REMOVE') {
                updatePayload.avatar = null;
            } else if (tempAvatarData) {
                updatePayload.avatar = tempAvatarData;
            }

            const executeUpdate = async () => {
                try {
                    const updated = await API.users.update(userId, updatePayload);
                    
                    session.name = updated.name;
                    currentUserPhone = updated.phone || '';
                    
                    if (tempAvatarData === 'REMOVE') {
                        delete session.avatar;
                    } else if (tempAvatarData) {
                        session.avatar = tempAvatarData;
                    }
                    
                    localStorage.setItem('aqua_monitor_user_session', JSON.stringify(session));
                    tempAvatarData = null; 

                    if (typeof initAuthFeatures === 'function') {
                        initAuthFeatures();
                    }

                    showToast('Settings saved successfully', 'success');
                } catch (error) {
                    showFeedbackModal({ type: 'error', title: 'Update Failed', message: error.message || 'An error occurred while updating settings.' });
                }
            };

            const emailInput = document.getElementById('userEmailInput');
            const newEmail = emailInput ? emailInput.value.trim() : (session.email || '');
            const isEmailChanged = newEmail && newEmail.toLowerCase() !== (session.email || '').toLowerCase();

            // If email changed, trigger Email OTP verification modal first
            if (isEmailChanged) {
                showEmailOtpModal({
                    newEmail: newEmail,
                    entityType: 'user',
                    entityId: userId,
                    onVerified: (updated) => {
                        session.email = updated.email || newEmail;
                        localStorage.setItem('aqua_monitor_user_session', JSON.stringify(session));
                        
                        if (isPhoneChanged && cleanPhone) {
                            showPhoneOtpModal({
                                phone: cleanPhone,
                                entityType: 'user',
                                entityId: userId,
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
                    entityType: 'user',
                    entityId: userId,
                    onVerified: () => {
                        executeUpdate();
                    },
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
                    onConfirm: executeUpdate
                });
            }

        } else if (tabName === 'security') {
            const currentPassInput = fields['current password'];
            const newPassInput = fields['new password'];
            const confirmPassInput = fields['confirm new password'];

            if (!currentPassInput || !newPassInput || !confirmPassInput) return;

            const currentPassword = currentPassInput.value;
            const newPassword = newPassInput.value;
            const confirmPassword = confirmPassInput.value;

            if (currentPassword || newPassword || confirmPassword) {
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

                // Prompt confirmation modal before changing password
                showFeedbackModal({
                    type: 'confirm',
                    title: 'Confirm Password Change',
                    message: 'Are you sure you want to change your account password?',
                    confirmText: 'Change Password',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        try {
                            await API.users.update(userId, { current_password: currentPassword, new_password: newPassword });

                            currentPassInput.value = '';
                            newPassInput.value = '';
                            confirmPassInput.value = '';

                            showToast('Password changed successfully', 'success');
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
        const phoneField = document.getElementById('userPhoneInput') || document.querySelector('input[type="tel"]');
        if (phoneField && typeof attachPhoneInputFilter === 'function') attachPhoneInputFilter(phoneField);
        fetchProfile();
        initProfileUpload();
    });
} else {
    const phoneField = document.getElementById('userPhoneInput') || document.querySelector('input[type="tel"]');
    if (phoneField && typeof attachPhoneInputFilter === 'function') attachPhoneInputFilter(phoneField);
    fetchProfile();
    initProfileUpload();
}
