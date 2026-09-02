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
        redirectUser('operator');
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

// Add animation styles for spinner
const style = document.createElement('style');
style.textContent = `
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
