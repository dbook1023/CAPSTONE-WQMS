/**
 * AquaMonitor Component Loader
 * Dynamically loads Navbar and Footer components and handles global UI logic.
 */

document.addEventListener('DOMContentLoaded', function() {
    loadComponent('navbar-placeholder', 'components/navbar.html', initNavbar);
    loadComponent('footer-placeholder', 'components/footer.html', initFooter);
});

async function loadComponent(id, path, callback) {
    const placeholder = document.getElementById(id);
    if (!placeholder) return;

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}`);
        const html = await response.text();
        placeholder.innerHTML = html;
        if (callback) callback();
    } catch (error) {
        console.error('Error loading component:', error);
    }
}

function initNavbar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinksContainer = document.getElementById('navLinks');

    // Set active link
    navLinks.forEach(link => {
        const pageAttr = link.getAttribute('data-page');
        if (pageAttr === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Update Auth UI
    updateAuthUI();

    // Mobile menu toggle
    if (mobileMenuBtn && navLinksContainer) {
        mobileMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navLinksContainer.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.nav-content') && navLinksContainer.classList.contains('active')) {
                mobileMenuBtn.classList.remove('active');
                navLinksContainer.classList.remove('active');
            }
        });

        // Close menu when clicking on a nav link (important for mobile)
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                navLinksContainer.classList.remove('active');
            });
        });

        // Clean up display styles if window is resized
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768) {
                mobileMenuBtn.classList.remove('active');
                navLinksContainer.classList.remove('active');
                navLinksContainer.style.display = ''; // Reset inline styles
            }
        });
    }
}

function initFooter() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

/**
 * Update Auth UI in Navbar
 */
function updateAuthUI() {
    const navAuth = document.getElementById('navAuth');
    if (!navAuth) return;

    const session = localStorage.getItem('aqua_monitor_session');
    const isInSubdir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    const pathPrefix = isInSubdir ? '../' : '';

    if (session) {
        const user = JSON.parse(session);
        const dashboardPath = user.role === 'admin' ? 'admin/admin-dashboard.html' : 'user/user-dashboard.html';
        const finalDashboardPath = isInSubdir ? (window.location.pathname.includes(user.role) ? '#' : pathPrefix + dashboardPath) : dashboardPath;
        
        navAuth.innerHTML = `
            <a href="${finalDashboardPath}" class="nav-link" style="font-weight: 500;">Dashboard</a>
            <button onclick="handleGlobalLogout()" class="btn-login" style="background: rgba(239, 68, 68, 0.1); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.2);">Logout</button>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="${pathPrefix}login.html" class="btn-login">Sign In</a>
        `;
    }
}

/**
 * Global Logout Handler
 */
function handleGlobalLogout() {
    localStorage.removeItem('aqua_monitor_session');
    const isInSubdir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/user/');
    window.location.href = isInSubdir ? '../index.html' : 'index.html';
}
