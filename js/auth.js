/**
 * AquaMonitor Authentication Logic
 * Handles login, session management, and role-based redirection
 */

document.addEventListener('DOMContentLoaded', function() {
    // Portals call handleLogin directly from onsubmit, but we keep this for consistency if needed
    // Check if user is already logged in and on the login page
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('login.html') || currentPath.endsWith('admin-login.html')) {
        const user = getCurrentUser();
        if (user) {
            redirectUser(user.role);
        }
    }
});

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

    const email = emailEl.value;
    const password = passwordEl.value;
    
    // Show loading state
    setLoading(true, portalType);
    
    // Mock user database
    const users = [
        { email: 'admin@olfu.edu.ph', password: 'password123', role: 'admin', name: 'Admin User' },
        { email: 'john.doe@olfu.edu.ph', password: 'password123', role: 'operator', name: 'John Doe' },
        { email: 'bob.wilson@olfu.edu.ph', password: 'password123', role: 'operator', name: 'Bob Wilson' }
    ];

    // Simulating network delay
    setTimeout(() => {
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // STRICT PORTAL CHECK
            if (portalType === 'admin' && user.role !== 'admin') {
                showMessage('Access denied. This portal is for administrators only.', 'error');
                setLoading(false, portalType);
                return;
            }
            if (portalType === 'user' && user.role === 'admin') {
                showMessage('Administrators must use the admin portal to sign in.', 'error');
                setLoading(false, portalType);
                return;
            }

            // Success
            showMessage('Login successful! Redirecting...', 'success');
            
            // Save session
            const sessionData = {
                email: user.email,
                role: user.role,
                name: user.name,
                loginTime: new Date().toISOString()
            };
            localStorage.setItem('aqua_monitor_session', JSON.stringify(sessionData));
            
            // Redirect
            setTimeout(() => {
                redirectUser(user.role);
            }, 1000);
        } else {
            // Failure
            showMessage('Invalid email or password. Please try again.', 'error');
            setLoading(false, portalType);
        }
    }, 1000);
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
 * Redirect user based on role
 */
function redirectUser(role) {
    const isInsideSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    const prefix = isInsideSubfolder ? '../' : '';
    
    if (role === 'admin') {
        window.location.href = prefix + 'admin/admin-dashboard.html';
    } else {
        window.location.href = prefix + 'user/user-dashboard.html';
    }
}

/**
 * Get current logged in user
 */
function getCurrentUser() {
    const session = localStorage.getItem('aqua_monitor_session');
    return session ? JSON.parse(session) : null;
}

/**
 * Logout function
 */
function logout() {
    localStorage.removeItem('aqua_monitor_session');
    const isInsideSubfolder = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    window.location.href = (isInsideSubfolder ? '../' : '') + 'login.html';
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
