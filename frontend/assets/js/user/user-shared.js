/**
 * User Shared JavaScript
 * Handles responsive sidebar toggle, overlay management, and global preloader
 */

// Global Preloader Injection
(function() {
    const preloaderHTML = `
        <div id="preloader">
            <div class="loader">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>
    `;

    const inject = () => {
        if (document.getElementById('preloader')) return;
        document.body.insertAdjacentHTML('afterbegin', preloaderHTML);
        
        const preloader = document.getElementById('preloader');
        
        // ONLY show if it takes more than 300ms (prevents flicker on fast/localhost)
        const showTimer = setTimeout(() => {
            if (preloader) preloader.classList.add('show');
        }, 300);

        window.addEventListener('load', () => {
            clearTimeout(showTimer);
            if (preloader && preloader.classList.contains('show')) {
                setTimeout(() => {
                    preloader.classList.remove('show');
                    setTimeout(() => preloader.remove(), 500);
                }, 400);
            } else if (preloader) {
                preloader.remove(); // Remove immediately if it never showed
            }
        });
    };

    if (document.body) {
        inject();
    } else {
        document.addEventListener('DOMContentLoaded', inject);
    }
})();

document.addEventListener('DOMContentLoaded', async function() {
    await loadSidebarComponent();
    setActiveSidebarLink();
    initSidebarToggle();
    initAuthFeatures();
});

async function loadSidebarComponent() {
    const existingSidebar = document.getElementById('sidebar');
    if (existingSidebar) return;

    const mount = document.getElementById('sidebarMount');
    if (!mount) return;

    try {
        // Path resolution: find components folder regardless of subfolder depth
        const pathPrefix = window.location.pathname.includes('/user/') ? '../' : '';
        const response = await fetch(`${pathPrefix}components/user-sidebar.html`, { cache: 'no-store' });
        if (!response.ok) return;
        
        mount.innerHTML = await response.text();
    } catch (error) {
        console.error('Failed to load user sidebar:', error);
    }
}

function setActiveSidebarLink() {
    const navItems = document.querySelectorAll('.sidebar .nav-item[href]');
    if (!navItems.length) return;

    const currentPage = window.location.pathname.split('/').pop();
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href === currentPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function initSidebarToggle() {
    // We use event delegation or a slight delay because sidebar is loaded via fetch
    const observer = new MutationObserver((mutations, obs) => {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        const overlay = document.querySelector('.sidebar-overlay');
        const closeBtn = document.getElementById('closeSidebar');

        if (sidebar && toggleBtn && overlay) {
            attachListeners(sidebar, toggleBtn, overlay, closeBtn);
            obs.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function attachListeners(sidebar, toggleBtn, overlay, closeBtn) {
    const toggleFunc = () => {
        sidebar.classList.toggle('open');
        toggleBtn.classList.toggle('active');
        overlay.classList.toggle('active');
        
        if (sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    };

    const closeFunc = () => {
        sidebar.classList.remove('open');
        toggleBtn.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFunc();
    });

    if (closeBtn) closeBtn.addEventListener('click', closeFunc);
    overlay.addEventListener('click', closeFunc);

    // Close on nav item click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeFunc();
        });
    });
}

function initAuthFeatures() {
    const session = localStorage.getItem('aqua_monitor_session');
    if (!session) return;

    const user = JSON.parse(session);
    const userNameEl = document.querySelector('.user-name');
    const userEmailEl = document.querySelector('.user-email');
    const userAvatarEl = document.querySelector('.user-avatar');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl) userAvatarEl.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('aqua_monitor_session');
            window.location.href = '../../login.html';
        });
    }
}
