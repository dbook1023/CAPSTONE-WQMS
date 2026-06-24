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
    initStandardsModal(); // New global modal init
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
    const session = localStorage.getItem('aqua_monitor_user_session');
    if (!session) {
        // No session - redirect to operator/viewer login page
        const pathPrefix = window.location.pathname.includes('/user/') ? '../../' : '';
        window.location.href = pathPrefix + 'login.html';
        return;
    }

    let user;
    try {
        user = JSON.parse(session);
    } catch (error) {
        localStorage.removeItem('aqua_monitor_user_session');
        const pathPrefix = window.location.pathname.includes('/user/') ? '../../' : '';
        window.location.href = pathPrefix + 'login.html';
        return;
    }

    // Strict portal check: Admins cannot access the operator/viewer portal
    if (user.role && user.role.toLowerCase() === 'admin') {
        localStorage.removeItem('aqua_monitor_user_session');
        const pathPrefix = window.location.pathname.includes('/user/') ? '../../' : '';
        window.location.href = pathPrefix + 'frontend/admin/admin-dashboard.html';
        return;
    }
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
            localStorage.removeItem('aqua_monitor_user_session');
            window.location.href = '../../login.html';
        });
    }
}

/**
 * Global Water Standards Modal
 */
function initStandardsModal() {
    if (document.getElementById('globalStandardsModal')) return;

    const modalHTML = `
        <div class="modal-overlay" id="globalStandardsModal">
            <div class="modal" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>PNSDW Water Standards</h2>
                    <p>Philippine National Standards for Drinking Water (AO 2017-0010)</p>
                </div>
                <div class="modal-body">
                    <table class="premium-table">
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Ideal Range</th>
                                <th>Warning Limit</th>
                                <th>Critical Threshold</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>pH Level</strong></td>
                                <td><span class="status-indicator status-ideal">7.0 - 8.0</span></td>
                                <td><span class="status-indicator status-warning">6.4 - 8.6</span></td>
                                <td><span class="status-indicator status-critical">&lt; 6.3 / &gt; 8.7</span></td>
                            </tr>
                            <tr>
                                <td><strong>Turbidity</strong></td>
                                <td><span class="status-indicator status-ideal">0 - 1 NTU</span></td>
                                <td><span class="status-indicator status-warning">3 - 5 NTU</span></td>
                                <td><span class="status-indicator status-critical">&gt; 5 NTU</span></td>
                            </tr>
                            <tr>
                                <td><strong>TDS</strong></td>
                                <td><span class="status-indicator status-ideal">50 - 300 ppm</span></td>
                                <td><span class="status-indicator status-warning">400 - 500 ppm</span></td>
                                <td><span class="status-indicator status-critical">&gt; 500 ppm</span></td>
                            </tr>
                            <tr>
                                <td><strong>Temperature</strong></td>
                                <td><span class="status-indicator status-ideal">25 - 30°C</span></td>
                                <td><span class="status-indicator status-warning">30 - 32°C</span></td>
                                <td><span class="status-indicator status-critical">&gt; 32°C</span></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(15, 23, 42, 0.05); border-radius: 1rem;">
                        <h4 style="margin-bottom: 0.5rem; color: #14B8A6;">Note on Standards</h4>
                        <p style="font-size: 0.875rem; color: #64748b; margin: 0;">Aqua Monitor follows the latest Philippine National Standards for Drinking Water to ensure the safety of all OLFU campus drinking fountains.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="closeGlobalStandardsBtn" style="min-width: 120px;">Got it</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('globalStandardsModal');
    const closeBtn = document.getElementById('closeGlobalStandardsBtn');

    const openModal = (e) => {
        if (e) e.preventDefault();
        modal.classList.add('open');
    };
    
    const closeModal = () => modal.classList.remove('open');

    // Use MutationObserver or wait for sidebar
    const observer = new MutationObserver(() => {
        const btns = document.querySelectorAll('#viewStandardsBtn, #sidebarStandardsBtn');
        if (btns.length > 0) {
            btns.forEach(btn => btn.addEventListener('click', openModal));
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

/**
 * ═══════════════════════════════════════════
 * GLOBAL FEEDBACK MODAL SYSTEM
 * Provides success, error, warning, confirm,
 * and info modals across all pages.
 * ═══════════════════════════════════════════
 *
 * Usage:
 *   showFeedbackModal({ type: 'success', title: 'Done!', message: 'Saved.' })
 *   showFeedbackModal({ type: 'confirm', title: 'Delete?', message: 'Sure?', onConfirm: () => { ... } })
 */
(function() {
    // Inject modal HTML once
    const feedbackHTML = `
        <div class="modal-overlay" id="feedbackModal" style="z-index: 3000;">
            <div class="modal" id="feedbackModalInner" style="max-width: 420px; text-align: center; border-radius: 24px; overflow: visible;">
                <div style="padding: 32px 28px 24px;">
                    <div id="feedbackIcon" style="width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; transition: all 0.3s ease;"></div>
                    <h3 id="feedbackTitle" style="font-family: 'Poppins', sans-serif; font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0 0 8px;"></h3>
                    <p id="feedbackMessage" style="font-size: 0.875rem; color: #64748b; line-height: 1.5; margin: 0;"></p>
                </div>
                <div id="feedbackFooter" style="padding: 16px 28px 24px; display: flex; justify-content: center; gap: 12px;"></div>
            </div>
        </div>
    `;

    const inject = () => {
        if (document.getElementById('feedbackModal')) return;
        document.body.insertAdjacentHTML('beforeend', feedbackHTML);
    };

    if (document.body) inject();
    else document.addEventListener('DOMContentLoaded', inject);

    // Icon SVGs per type
    const icons = {
        success: { bg: '#ecfdf5', color: '#10b981', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
        error:   { bg: '#fef2f2', color: '#ef4444', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' },
        warning: { bg: '#fffbeb', color: '#f59e0b', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        confirm: { bg: '#eff6ff', color: '#3b82f6', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        info:    { bg: '#f0f9ff', color: '#0ea5e9', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' }
    };

    /**
     * Show a feedback modal.
     * @param {Object} opts
     * @param {'success'|'error'|'warning'|'confirm'|'info'} opts.type
     * @param {string} opts.title
     * @param {string} opts.message
     * @param {Function} [opts.onConfirm] - For confirm type
     * @param {Function} [opts.onCancel]  - For confirm type
     * @param {string} [opts.confirmText='Confirm']
     * @param {string} [opts.cancelText='Cancel']
     */
    window.showFeedbackModal = function(opts) {
        const modal = document.getElementById('feedbackModal');
        const iconEl = document.getElementById('feedbackIcon');
        const titleEl = document.getElementById('feedbackTitle');
        const msgEl = document.getElementById('feedbackMessage');
        const footerEl = document.getElementById('feedbackFooter');
        if (!modal) return;

        const cfg = icons[opts.type] || icons.info;
        iconEl.style.background = cfg.bg;
        iconEl.innerHTML = cfg.svg;
        titleEl.textContent = opts.title || '';
        msgEl.textContent = opts.message || '';

        const closeModal = () => modal.classList.remove('open');

        if (opts.type === 'confirm') {
            footerEl.innerHTML = `
                <button class="btn btn-ghost" id="feedbackCancelBtn" style="min-width: 100px;">${opts.cancelText || 'Cancel'}</button>
                <button class="btn btn-primary" id="feedbackConfirmBtn" style="min-width: 100px; background: ${cfg.color};">${opts.confirmText || 'Confirm'}</button>
            `;
            document.getElementById('feedbackCancelBtn').onclick = () => {
                closeModal();
                if (opts.onCancel) opts.onCancel();
            };
            document.getElementById('feedbackConfirmBtn').onclick = () => {
                closeModal();
                if (opts.onConfirm) opts.onConfirm();
            };
        } else {
            footerEl.innerHTML = `
                <button class="btn btn-primary" id="feedbackOkBtn" style="min-width: 120px; background: ${cfg.color};">OK</button>
            `;
            document.getElementById('feedbackOkBtn').onclick = closeModal;
        }

        modal.classList.add('open');

        // Allow closing by clicking overlay
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
                if (opts.type === 'confirm' && opts.onCancel) opts.onCancel();
            }
        };
    };
})();
