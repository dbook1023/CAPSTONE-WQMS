/**
 * Admin Shared JavaScript
 * Handles responsive sidebar toggle and overlay management
 */

document.addEventListener('DOMContentLoaded', async function() {
    await loadSidebarComponent();
    setActiveSidebarLink();
    initSidebarToggle();
    initAuthFeatures();
});

async function loadSidebarComponent() {
    const existingSidebar = document.getElementById('sidebar');
    if (existingSidebar) {
        return;
    }

    const mount = document.getElementById('sidebarMount');
    if (!mount) {
        return;
    }

    try {
        const response = await fetch('components/admin-sidebar.html', { cache: 'no-store' });
        if (!response.ok) {
            return;
        }
        mount.innerHTML = await response.text();
    } catch (error) {
        console.error('Failed to load sidebar component:', error);
    }
}

function setActiveSidebarLink() {
    const navItems = document.querySelectorAll('.sidebar .nav-item[href]');
    if (!navItems.length) {
        return;
    }

    const currentPage = window.location.pathname.split('/').pop();
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (!href || href === '#') {
            return;
        }
        item.classList.toggle('active', href === currentPage);
    });
}

function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.hamburger-btn');
    const overlay = document.querySelector('.sidebar-overlay');
    const navItems = document.querySelectorAll('.nav-item');

    if (!sidebar || !toggleBtn || !overlay) {
        return;
    }

    ensureSidebarCloseButton(sidebar);

    // Toggle sidebar on hamburger button click
    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleSidebar();
    });

    // Close sidebar when clicking on overlay
    overlay.addEventListener('click', function() {
        closeSidebar();
    });

    // Close sidebar when clicking on a navigation item
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth < 768) {
                closeSidebar();
            }
        });
    });

    // Close sidebar when window is resized to desktop size
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            closeSidebar();
        }
    });

    // Allow closing sidebar via Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Prevent body scroll when sidebar is open on mobile
    sidebar.addEventListener('click', function(e) {
        e.stopPropagation();
    });
}

function ensureSidebarCloseButton(sidebar) {
    const header = sidebar.querySelector('.sidebar-header');
    if (!header || header.querySelector('.sidebar-close-btn')) {
        return;
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'sidebar-close-btn';
    closeBtn.setAttribute('aria-label', 'Close sidebar');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeSidebar);
    header.appendChild(closeBtn);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.hamburger-btn');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.toggle('open');
    toggleBtn.classList.toggle('active');
    overlay.classList.toggle('active');

    // Prevent body scroll when sidebar is open
    if (sidebar.classList.contains('open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.hamburger-btn');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.remove('open');
    toggleBtn.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Export functions for use in other scripts
window.adminUI = {
    toggleSidebar: toggleSidebar,
    closeSidebar: closeSidebar,
    logout: () => {
        localStorage.removeItem('aqua_monitor_session');
        window.location.href = '../login.html';
    }
};

function initAuthFeatures() {
    const session = localStorage.getItem('aqua_monitor_session');
    if (!session) {
        window.location.href = '../login.html';
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
            window.location.href = '../login.html';
        });
    }
}
