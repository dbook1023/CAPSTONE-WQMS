/**
 * AquaMonitor Component Loader
 * Dynamically loads Navbar and Footer components and handles global UI logic.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Ensure legal modals script is loaded
    if (!window.openPrivacyPolicyModal) {
        const script = document.createElement('script');
        script.src = '/frontend/assets/js/shared/legal-modals.js';
        document.head.appendChild(script);
    }

    loadComponent('navbar-placeholder', '/frontend/components/navbar.html', initNavbar);
    loadComponent('footer-placeholder', '/frontend/components/footer.html', initFooter);
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
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinksContainer = document.getElementById('navLinks');

    // Set active link based on clean URL path
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const isHome = (href === '/' && (currentPath === '/' || currentPath === '' || currentPath === '/index.html'));
        const isMatch = href && (href === currentPath || href === currentPath.replace('.html', ''));
        if (isHome || isMatch) {
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

    const session = localStorage.getItem('aqua_monitor_admin_session') || localStorage.getItem('aqua_monitor_user_session');

    if (session) {
        const user = JSON.parse(session);
        const role = user.role ? user.role.toLowerCase() : '';
        const dashboardPath = role === 'admin' ? '/admin/dashboard' : '/user/dashboard';
        
        navAuth.innerHTML = `
            <a href="${dashboardPath}" class="nav-link" style="font-weight: 500;">Dashboard</a>
            <button onclick="handleGlobalLogout()" class="btn-logout">Logout</button>
        `;
    } else {
        navAuth.innerHTML = `
            <a href="/login" class="btn-login">Sign In</a>
        `;
    }
}

/**
 * Global Logout Handler
 */
function handleGlobalLogout() {
    localStorage.removeItem('aqua_monitor_admin_session');
    localStorage.removeItem('aqua_monitor_user_session');
    window.location.href = '/';
}

