/**
 * User Sidebar Component
 * Injects the reusable sidebar into the #sidebarMount element
 */

function mountUserSidebar() {
    const mountPoint = document.getElementById('sidebarMount');
    if (!mountPoint) return;

    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes('user-dashboard.html');
    const isMonitoring = currentPath.includes('user-monitoring.html');
    const isFountainStatus = currentPath.includes('user-fountain-status.html');
    const isReports = currentPath.includes('user-reports.html');
    const isSettings = currentPath.includes('user-settings.html');

    const sidebarHTML = `
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <div class="logo-container">
                    <div class="logo-box">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                        </svg>
                    </div>
                    <div class="logo-text">
                        <span class="brand-name">Engineering Panel</span>
                        <span class="brand-subtitle">Aqua Monitor</span>
                    </div>
                </div>
                <button class="sidebar-close-btn" id="closeSidebar" aria-label="Close sidebar">×</button>
            </div>

            <nav class="sidebar-nav">
                <a href="user-dashboard.html" class="nav-item ${isDashboard ? 'active' : ''}" data-label="Dashboard">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    </div>
                    <span class="nav-label">Dashboard</span>
                </a>
                <a href="user-monitoring.html" class="nav-item ${isMonitoring ? 'active' : ''}" data-label="Live Monitoring">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                    </div>
                    <span class="nav-label">Live Monitoring</span>
                </a>
                <a href="user-fountain-status.html" class="nav-item ${isFountainStatus ? 'active' : ''}" data-label="Fountain Status">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <span class="nav-label">Fountain Status</span>
                </a>
                <a href="user-reports.html" class="nav-item ${isReports ? 'active' : ''}" data-label="Reports">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <span class="nav-label">Reports</span>
                </a>
                <a href="user-settings.html" class="nav-item ${isSettings ? 'active' : ''}" data-label="Settings">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    </div>
                    <span class="nav-label">Account Settings</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <div class="user-profile-card">
                    <div class="user-avatar">JD</div>
                    <div class="user-info">
                        <span class="user-name">John Doe</span>
                        <span class="user-email">john.doe@olfu.edu.ph</span>
                    </div>
                </div>
                <a href="#" class="nav-item logout-item" data-label="Logout">
                    <div class="nav-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    </div>
                    <span class="nav-label">Logout</span>
                </a>
            </div>
        </aside>
    `;

    mountPoint.innerHTML = sidebarHTML;
    initSidebarLogic();
}

function initSidebarLogic() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarToggle.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (sidebarToggle) sidebarToggle.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            if (sidebarToggle) sidebarToggle.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Auth features
    initAuthFeatures();
}

function initAuthFeatures() {
    const session = localStorage.getItem('aqua_monitor_session');
    if (!session) {
        window.location.href = '../../login.html';
        return;
    }

    const user = JSON.parse(session);
    
    // Update user info in sidebar if elements exist
    const userNameEl = document.querySelector('.user-name');
    const userEmailEl = document.querySelector('.user-email');
    const userAvatarEl = document.querySelector('.user-avatar');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl) userAvatarEl.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    // Handle logout
    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('aqua_monitor_session');
            window.location.href = '../../login.html';
        });
    }
}

// Auto-mount when script is loaded
document.addEventListener('DOMContentLoaded', mountUserSidebar);
