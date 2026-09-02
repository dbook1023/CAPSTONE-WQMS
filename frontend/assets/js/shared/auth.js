/**
 * AquaMonitor Authentication Logic
 * Handles login, session management, and role-based redirection
 */

/**
 * Check if user or admin is logged in, and redirect them away from login pages.
 * Handles normal page loads, direct navigation, and browser Back/Forward (bfcache).
 */
function checkSessionAndRedirect() {
    const currentPath = window.location.pathname;
    
    // Extract the exact filename from the path (e.g. "login.html", "admin-login.html")
    const pageName = (currentPath.split('/').pop() || '').toLowerCase();
    
    // Determine page type using filename match or root path
    const isUserLoginPage = (pageName === 'login.html') || (currentPath === '/') || (pageName === '');
    const isAdminLoginPage = (pageName === 'admin-login.html');
    
    // If we're not on any login page, skip redirect logic entirely
    if (!isUserLoginPage && !isAdminLoginPage) return;
    
    // Check specific sessions from localStorage
    const adminSessionRaw = localStorage.getItem('aqua_monitor_admin_session');
    const userSessionRaw = localStorage.getItem('aqua_monitor_user_session');
    
    let validAdmin = false;
    let validUser = false;
    
    if (adminSessionRaw) {
        try {
            const parsed = JSON.parse(adminSessionRaw);
            if (parsed && parsed.id && parsed.role && parsed.role.toLowerCase() === 'admin') {
                validAdmin = true;
            } else {
                localStorage.removeItem('aqua_monitor_admin_session');
            }
        } catch (e) {
            localStorage.removeItem('aqua_monitor_admin_session');
        }
    }
    
    if (userSessionRaw) {
        try {
            const parsed = JSON.parse(userSessionRaw);
            if (parsed && parsed.id) {
                validUser = true;
            } else {
                localStorage.removeItem('aqua_monitor_user_session');
            }
        } catch (e) {
            localStorage.removeItem('aqua_monitor_user_session');
        }
    }
    
    
    
    // If any active session exists, prevent accessing login pages and redirect to dashboard
    if (validAdmin) {
        redirectUser('admin');
    } else if (validUser) {
        redirectUser('user');
    }
}

// Execute check immediately on script execution
checkSessionAndRedirect();

// Execute check on DOMContentLoaded
document.addEventListener('DOMContentLoaded', checkSessionAndRedirect);

// Execute check on pageshow (handles browser Back/Forward button bfcache restoration)
window.addEventListener('pageshow', checkSessionAndRedirect);

/**
 * Handle the login logic
 * @param {Event} event - The form submission event
 * @param {string} portalType - 'user' or 'admin'
 */
function handleLogin(event, portalType) {
    if (event) event.preventDefault();
    
    const emailEl = document.getElementById(portalType === 'admin' ? 'adminEmail' : 'email');
    const passwordEl = document.getElementById(portalType === 'admin' ? 'adminPassword' : 'password');
    
    if (!emailEl || !passwordEl) return;

    const email = Sanitizer.cleanInput(emailEl.value);
    const password = Sanitizer.cleanInput(passwordEl.value);
    
    // Show loading state
    setLoading(true, portalType);
    
    const completeLogin = (user) => {
        const role = (user.role_name || '').toLowerCase();
        
        if (portalType === 'admin' && !role.includes('admin')) {
            showMessage('Access denied. This portal is for administrators only.', 'error');
            setLoading(false, portalType);
            return;
        }
        if (portalType === 'user' && role.includes('admin')) {
            showMessage('Administrators must use the admin portal to sign in.', 'error');
            setLoading(false, portalType);
            return;
        }

        showMessage('Login successful! Redirecting...', 'success');
        
        const sessionData = {
            id: user.id,
            email: user.email,
            role: user.role_name || 'User',
            name: user.name,
            avatar: user.avatar,
            loginTime: new Date().toISOString()
        };
        const isAdmin = role.includes('admin');
        const sessionKey = isAdmin ? 'aqua_monitor_admin_session' : 'aqua_monitor_user_session';
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        
        setTimeout(() => {
            redirectUser(isAdmin ? 'admin' : 'user');
        }, 1000);
    };

    // Call backend API
    API.auth.login({ email, password, portal_type: portalType })
        .then(response => {
            // Check if 2FA is required
            if (response && response.require_2fa) {
                setLoading(false, portalType);
                showMessage(`2FA required. Code sent to ${response.phone_masked}`, 'info');

                if (typeof showPhoneOtpModal === 'function') {
                    showPhoneOtpModal({
                        phone: response.phone,
                        entityType: portalType,
                        entityId: response.user_id,
                        customVerify: async (code) => {
                            const fullUser = await API.auth.verify2faLogin({
                                phone: response.phone,
                                code: code,
                                user_id: response.user_id,
                                portal_type: portalType
                            });
                            completeLogin(fullUser);
                        },
                        onCancel: () => {
                            showMessage('Login cancelled.', 'error');
                        }
                    });
                } else {
                    showMessage('OTP Modal not loaded.', 'error');
                }
                return;
            }

            const user = (response && response.user) ? response.user : response;
            if (!user) {
                showMessage('Unexpected server response. Please try again.', 'error');
                setLoading(false, portalType);
                return;
            }

            completeLogin(user);
        })
        .catch(error => {
            showMessage(error.message || 'Invalid email or password. Please try again.', 'error');
            setLoading(false, portalType);
        });
}

/**
 * Set loading state for the submit button
 */
function setLoading(isLoading, portalType) {
    const loginBtn = document.querySelector(portalType === 'admin' ? '.admin-btn' : '.btn-auth');
    if (!loginBtn) return;

    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `
            <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
            </svg>
            <span>Signing In...</span>
        `;
    } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `
            <span>Sign In</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
}

/**
 * Show authentication message
 */
function showMessage(text, type) {
    const authMessage = document.getElementById('authMessage');
    if (!authMessage) return;

    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
}

/**
 * Redirect user based on role using location.replace to prevent back-button looping
 */
function redirectUser(role) {
    if (!role) return;
    
    const isInsideSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    const prefix = isInsideSubfolder ? '../../' : '';
    
    // Normalize role to lowercase for comparison
    const normalizedRole = role.toLowerCase();
    const targetUrl = (normalizedRole === 'admin') 
        ? prefix + 'frontend/admin/admin-dashboard.html'
        : prefix + 'frontend/user/user-dashboard.html';
        
    // Prevent redundant redirects if already on target URL
    const targetFilename = targetUrl.split('/').pop();
    if (window.location.pathname.endsWith(targetFilename)) {
        return;
    }
    
    window.location.replace(targetUrl);
}

/**
 * Get current logged in user from decoupled sessions
 */
function getCurrentUser() {
    const session = localStorage.getItem('aqua_monitor_admin_session') || localStorage.getItem('aqua_monitor_user_session');
    return session ? JSON.parse(session) : null;
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('aqua_monitor_admin_session');
    localStorage.removeItem('aqua_monitor_user_session');
    const isInsideSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    const prefix = isInsideSubfolder ? '../../' : '';
    window.location.href = prefix + 'login.html';
}

/**
 * Toggle password visibility
 * @param {string} inputId - The ID of the password input
 */
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleBtn = passwordInput.nextElementSibling;
    if (!passwordInput || !toggleBtn) return;

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
    } else {
        passwordInput.type = 'password';
        toggleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
}

// Add animation styles for spinner and forgot password modal
const style = document.createElement('style');
style.textContent = `
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .forgot-modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 99999;
        opacity: 0; visibility: hidden; transition: all 0.25s ease;
    }
    .forgot-modal-overlay.open { opacity: 1; visibility: visible; }
    .forgot-modal-card {
        background: #ffffff; border-radius: 20px; width: 90%; max-width: 440px;
        padding: 32px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        position: relative; font-family: 'Inter', sans-serif;
    }
`;
document.head.appendChild(style);

/**
 * Open Forgot Password Modal (Sends reset link to user's email)
 */
function showForgotPasswordModal(portalType = 'user') {
    let overlay = document.getElementById('forgotPasswordModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'forgotPasswordModalOverlay';
        overlay.className = 'forgot-modal-overlay';
        overlay.innerHTML = `
            <div class="forgot-modal-card">
                <button type="button" onclick="closeForgotPasswordModal()" style="position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>

                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 48px; height: 48px; background: rgba(20, 184, 166, 0.1); color: #14b8a6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Reset Your Password</h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;">Enter your account email. We will send a secure password reset link directly to your email inbox.</p>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Account Email Address</label>
                    <input type="email" id="forgotEmailInput" placeholder="name@olfu.edu.ph" style="width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;">
                </div>

                <div id="forgotStep1Msg" style="margin-bottom: 14px; font-size: 13px; display: none;"></div>

                <button type="button" id="sendForgotCodeBtn" onclick="submitForgotPasswordLink('${portalType}')" style="width: 100%; padding: 12px; background: #14b8a6; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                    Send Reset Link via Email
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // Pre-fill email from login form if filled
    const currentEmailInput = document.getElementById(portalType === 'admin' ? 'adminEmail' : 'email');
    const forgotEmailInput = document.getElementById('forgotEmailInput');
    if (forgotEmailInput && currentEmailInput && currentEmailInput.value) {
        forgotEmailInput.value = currentEmailInput.value.trim();
    }

    const msg = document.getElementById('forgotStep1Msg');
    if (msg) msg.style.display = 'none';

    overlay.classList.add('open');
}

function closeForgotPasswordModal() {
    const overlay = document.getElementById('forgotPasswordModalOverlay');
    if (overlay) overlay.classList.remove('open');
}

async function submitForgotPasswordLink(portalType) {
    const emailInput = document.getElementById('forgotEmailInput');
    const btn = document.getElementById('sendForgotCodeBtn');
    const msg = document.getElementById('forgotStep1Msg');

    if (!emailInput || !emailInput.value.trim()) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = 'Please enter your account email address.';
        }
        return;
    }

    const email = emailInput.value.trim();

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending Reset Link...';
    }

    try {
        const forgotFn = (window.API && window.API.auth && typeof window.API.auth.forgotPassword === 'function')
            ? window.API.auth.forgotPassword
            : (data) => window.API.request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) });

        const response = await forgotFn({ email, portal_type: portalType });
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#14b8a6';
            msg.textContent = response.message || 'Password reset link sent to your email!';
        }
    } catch (err) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = err.message || 'Failed to send password reset link.';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Send Reset Link via Email';
        }
    }
}

/**
 * Open Reset Password Modal when user opens a valid reset_token link from email
 */
function showResetPasswordTokenModal(token, maskedEmail) {
    let overlay = document.getElementById('resetTokenModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'resetTokenModalOverlay';
        overlay.className = 'forgot-modal-overlay';
        overlay.innerHTML = `
            <div class="forgot-modal-card">
                <button type="button" onclick="closeResetTokenModal()" style="position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>

                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 48px; height: 48px; background: rgba(20, 184, 166, 0.1); color: #14b8a6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Set New Password</h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;" id="tokenSubtitle">Reset password for ${maskedEmail || 'your account'}</p>
                </div>

                <div style="margin-bottom: 14px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">New Password</label>
                    <input type="password" id="tokenNewPassword" placeholder="Minimum 6 characters" style="width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">Confirm New Password</label>
                    <input type="password" id="tokenConfirmPassword" placeholder="Re-enter new password" style="width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box;">
                </div>

                <div id="tokenResetMsg" style="margin-bottom: 14px; font-size: 13px; display: none;"></div>

                <button type="button" id="submitTokenResetBtn" onclick="submitTokenPasswordReset('${token}')" style="width: 100%; padding: 12px; background: #14b8a6; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer;">
                    Save New Password
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.add('open');
}

function closeResetTokenModal() {
    const overlay = document.getElementById('resetTokenModalOverlay');
    if (overlay) overlay.classList.remove('open');
    if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, document.title, url.pathname);
    }
}

async function submitTokenPasswordReset(token) {
    const newPassInput = document.getElementById('tokenNewPassword');
    const confirmPassInput = document.getElementById('tokenConfirmPassword');
    const btn = document.getElementById('submitTokenResetBtn');
    const msg = document.getElementById('tokenResetMsg');

    const newPassword = newPassInput ? newPassInput.value.trim() : '';
    const confirmPassword = confirmPassInput ? confirmPassInput.value.trim() : '';

    if (!newPassword || !confirmPassword) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = 'Please fill in both password fields.';
        }
        return;
    }

    if (newPassword !== confirmPassword) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = 'New passwords do not match.';
        }
        return;
    }

    if (newPassword.length < 6) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = 'Password must be at least 6 characters long.';
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving Password...';
    }

    try {
        const resetFn = (window.API && window.API.auth && typeof window.API.auth.resetPassword === 'function')
            ? window.API.auth.resetPassword
            : (data) => window.API.request('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) });

        const response = await resetFn({ token, new_password: newPassword });

        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#14b8a6';
            msg.textContent = response.message || 'Password reset successfully!';
        }

        setTimeout(() => {
            closeResetTokenModal();
            showMessage('Password reset successful! Please sign in with your new password.', 'success');
        }, 1500);
    } catch (err) {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#ef4444';
            msg.textContent = err.message || 'Failed to reset password.';
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save New Password';
        }
    }
}

// Bind click event listeners and check URL reset_token on load
document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.forgot-password').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const isAdminPage = window.location.pathname.includes('admin');
            showForgotPasswordModal(isAdminPage ? 'admin' : 'user');
        });
    });

    // Check if user/admin opened page via email reset link (login.html?reset_token=xyz)
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset_token');
    if (resetToken) {
        try {
            const verifyFn = (window.API && window.API.auth && typeof window.API.auth.verifyResetToken === 'function')
                ? window.API.auth.verifyResetToken
                : (tok) => window.API.request('/auth/verify-reset-token', { method: 'POST', body: JSON.stringify({ token: tok }) });

            const res = await verifyFn(resetToken);
            showResetPasswordTokenModal(resetToken, res.masked_email);
        } catch (err) {
            showMessage(err.message || 'Invalid or expired password reset link. Please request a new link.', 'error');
        }
    }
});

/**
 * Show Email Change OTP Verification Modal
 * @param {Object} options - { newEmail, entityType, entityId, onVerified, onCancel }
 */
function showEmailOtpModal(options) {
    const { newEmail, entityType = 'user', entityId, onVerified, onCancel } = options;

    let overlay = document.getElementById('emailOtpModalOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'emailOtpModalOverlay';
        overlay.className = 'forgot-modal-overlay';
        overlay.innerHTML = `
            <div class="forgot-modal-card">
                <button type="button" onclick="closeEmailOtpModal()" style="position: absolute; top: 20px; right: 20px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>

                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 48px; height: 48px; background: rgba(20, 184, 166, 0.1); color: #14b8a6; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Verify New Email Address</h3>
                    <p style="font-size: 13px; color: #64748b; margin: 0;" id="emailOtpSubtitle">Sending verification code...</p>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 600; color: #475569; margin-bottom: 6px;">6-Digit Email OTP Code</label>
                    <input type="text" id="emailOtpCodeInput" maxlength="6" placeholder="e.g. 123456" style="width: 100%; padding: 12px; border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 4px; text-align: center; outline: none; box-sizing: border-box;">
                </div>

                <div id="emailOtpMsg" style="margin-bottom: 14px; font-size: 13px; display: none;"></div>

                <button type="button" id="confirmEmailOtpBtn" style="width: 100%; padding: 12px; background: #14b8a6; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; margin-bottom: 8px;">
                    Verify & Update Email
                </button>

                <div style="text-align: center;">
                    <button type="button" id="resendEmailOtpBtn" style="background: none; border: none; font-size: 12px; color: #14b8a6; cursor: pointer; text-decoration: underline;">
                        Resend Verification Code
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const subtitle = document.getElementById('emailOtpSubtitle');
    const msg = document.getElementById('emailOtpMsg');
    const codeInput = document.getElementById('emailOtpCodeInput');
    const confirmBtn = document.getElementById('confirmEmailOtpBtn');
    const resendBtn = document.getElementById('resendEmailOtpBtn');

    if (codeInput) codeInput.value = '';
    if (msg) msg.style.display = 'none';

    const sendCode = async () => {
        if (msg) {
            msg.style.display = 'block';
            msg.style.color = '#14b8a6';
            msg.textContent = 'Sending verification code...';
        }
        try {
            const res = await API.auth.sendEmailOtp({ new_email: newEmail, entity_type: entityType, entity_id: entityId });
            if (subtitle) subtitle.textContent = `A 6-digit code was sent to ${newEmail}`;
            if (msg) {
                msg.style.display = 'block';
                msg.style.color = '#14b8a6';
                msg.textContent = res.message || 'Verification code sent to your inbox!';
            }
        } catch (err) {
            if (msg) {
                msg.style.display = 'block';
                msg.style.color = '#ef4444';
                msg.textContent = err.message || 'Failed to send verification code.';
            }
        }
    };

    confirmBtn.onclick = async () => {
        const code = codeInput ? codeInput.value.trim() : '';
        if (!code || code.length !== 6) {
            if (msg) {
                msg.style.display = 'block';
                msg.style.color = '#ef4444';
                msg.textContent = 'Please enter the valid 6-digit code.';
            }
            return;
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Verifying...';

        try {
            const updatedUser = await API.auth.verifyEmailOtp({
                new_email: newEmail,
                code: code,
                entity_type: entityType,
                entity_id: entityId
            });

            if (msg) {
                msg.style.display = 'block';
                msg.style.color = '#14b8a6';
                msg.textContent = 'Email verified successfully!';
            }

            setTimeout(() => {
                closeEmailOtpModal();
                if (typeof onVerified === 'function') onVerified(updatedUser);
            }, 1000);
        } catch (err) {
            if (msg) {
                msg.style.display = 'block';
                msg.style.color = '#ef4444';
                msg.textContent = err.message || 'Verification failed.';
            }
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Verify & Update Email';
        }
    };

    resendBtn.onclick = sendCode;
    window._currentEmailOtpCancel = onCancel;

    overlay.classList.add('open');
    sendCode();
}

function closeEmailOtpModal() {
    const overlay = document.getElementById('emailOtpModalOverlay');
    if (overlay) overlay.classList.remove('open');
    if (typeof window._currentEmailOtpCancel === 'function') {
        window._currentEmailOtpCancel();
        window._currentEmailOtpCancel = null;
    }
}


