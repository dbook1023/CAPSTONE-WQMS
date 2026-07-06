/**
 * Admin Shared JavaScript
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
    initActionsPopovers();
});

async function loadSidebarComponent() {
    const existingSidebar = document.getElementById('sidebar');
    if (existingSidebar) return;

    const mount = document.getElementById('sidebarMount');
    if (!mount) return;

    try {
        const pathPrefix = window.location.pathname.includes('/admin/') ? '../' : '';
        const response = await fetch(`${pathPrefix}components/admin-sidebar.html`, { cache: 'no-store' });
        if (!response.ok) return;
        
        mount.innerHTML = await response.text();
    } catch (error) {
        console.error('Failed to load admin sidebar:', error);
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

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 1024) closeFunc();
        });
    });
}

function initAuthFeatures() {
    const session = localStorage.getItem('aqua_monitor_admin_session');
    if (!session) {
        // No session - redirect to admin login page
        const pathPrefix = window.location.pathname.includes('/admin/') ? './' : 'frontend/admin/';
        window.location.href = pathPrefix + 'admin-login.html';
        return;
    }

    const user = JSON.parse(session);

    // Strict portal check: Non-admins cannot access the admin portal
    if (!user.role || user.role.toLowerCase() !== 'admin') {
        localStorage.removeItem('aqua_monitor_admin_session');
        const pathPrefix = window.location.pathname.includes('/admin/') ? '../../' : '';
        window.location.href = pathPrefix + 'frontend/user/user-dashboard.html';
        return;
    }
    const userNameEl = document.querySelector('.user-name');
    const userEmailEl = document.querySelector('.user-email');
    const userAvatarEl = document.querySelector('.user-avatar');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userAvatarEl) {
        if (user.avatar) {
            userAvatarEl.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            userAvatarEl.style.padding = '0';
            userAvatarEl.style.background = 'transparent';
        } else {
            userAvatarEl.textContent = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
            userAvatarEl.style.padding = '';
            userAvatarEl.style.background = '';
        }
    }

    const logoutBtn = document.querySelector('.logout-item');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('aqua_monitor_admin_session');
            window.location.href = './admin-login.html';
        });
    }
}

/**
 * Initialize Actions Popovers
 * Dynamically handles popover menus for .actions-btn elements
 */
function initActionsPopovers() {
    // We use event delegation to handle dynamically added rows
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.actions-btn');
        
        if (btn) {
            e.stopPropagation();
            
            // Ensure button has a unique ID for targeting
            if (!btn.id) {
                btn.id = 'action-btn-' + Math.random().toString(36).substr(2, 9);
            }
            
            // Toggle current popover
            togglePopover(null, btn);
        } else if (!e.target.closest('.actions-popover')) {
            // Clicked elsewhere (and not inside a popover), close all popovers
            closeAllPopovers();
        }
    });
}

function togglePopover(container, btn) {
    // Check for existing popover globally
    let popover = document.getElementById('global-actions-popover');
    const currentPage = window.location.pathname.split('/').pop();
    const isUsersPage = currentPage === 'admin-users.html';
    
    // Close if clicking the same button that's already open
    if (popover && popover.dataset.targetId === btn.id && popover.classList.contains('show')) {
        closeAllPopovers();
        return;
    }

    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'global-actions-popover';
        popover.className = 'actions-popover';
        document.body.appendChild(popover);
    }
    
    popover.dataset.targetId = btn.id;
    
    let actionsHTML = '';
    if (isUsersPage) {
        const row = btn.closest('tr');
        const currentStatus = row.querySelector('.status-badge')?.textContent.trim().toLowerCase();
        
        actionsHTML = `
            <button class="popover-item" onclick="handleUserEdit('${btn.id}')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit User</span>
            </button>
            <div class="popover-divider"></div>
        `;

        if (currentStatus === 'active') {
            actionsHTML += `
                <button class="popover-item danger" onclick="handleUserStatusUpdate('${btn.id}', 'Inactive')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                    <span>Mark as Inactive</span>
                </button>
            `;
        } else {
            actionsHTML += `
                <button class="popover-item success" onclick="handleUserStatusUpdate('${btn.id}', 'Active')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Mark as Active</span>
                </button>
            `;
        }
    } else {
        actionsHTML = `
            <button class="popover-item" onclick="handleAction('edit', document.getElementById('${btn.id}'))">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>Edit Fountain</span>
            </button>
            <button class="popover-item danger" onclick="handleAction('offline', document.getElementById('${btn.id}'))">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                <span>Mark Offline</span>
            </button>
            <div class="popover-divider"></div>
            <button class="popover-item" onclick="handleAction('archive', document.getElementById('${btn.id}'))">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                <span>Archive Item</span>
            </button>
        `;
    }
    
    popover.innerHTML = actionsHTML;
    
    // Positioning
    const rect = btn.getBoundingClientRect();
    const popoverWidth = 160;
    const popoverHeight = isUsersPage ? 90 : 90; // Adjust based on content
    
    let top = rect.bottom + window.scrollY + 8;
    let left = rect.right + window.scrollX - popoverWidth;
    
    // Check bottom overflow
    if (rect.bottom + popoverHeight > window.innerHeight) {
        top = rect.top + window.scrollY - popoverHeight - 8;
        popover.classList.add('popover-up');
    } else {
        popover.classList.remove('popover-up');
    }
    
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.position = 'absolute';
    popover.style.zIndex = '9999';

    // Show
    setTimeout(() => {
        popover.classList.add('show');
        btn.classList.add('active');
    }, 10);
}

function closeAllPopovers() {
    const popover = document.getElementById('global-actions-popover');
    if (popover) {
        popover.classList.remove('show');
    }
    document.querySelectorAll('.actions-btn').forEach(btn => btn.classList.remove('active'));
}

// Close on scroll for better UX with absolute positioning
window.addEventListener('scroll', closeAllPopovers, { passive: true });

/**
 * Handle Action Execution
 */
window.handleAction = function(action, element) {
    const row = element.closest('tr') || element.closest('.fountain-card') || element.closest('.report-row');
    const name = row ? (row.querySelector('.user-display-name')?.textContent || row.querySelector('.fc-title')?.textContent || row.querySelector('.report-name')?.textContent || 'this item') : 'this item';
    
    console.log(`Action: ${action} on ${name}`);
    
    if (action === 'inactive') {
        showFeedbackModal({
            type: 'confirm',
            title: 'Mark as Inactive?',
            message: `Are you sure you want to mark ${name} as inactive?`,
            confirmText: 'Yes, Deactivate',
            onConfirm: () => {
                const badge = row.querySelector('.status-badge');
                if (badge) {
                    badge.textContent = 'Inactive';
                    badge.className = 'status-badge inactive';
                }
                showFeedbackModal({ type: 'success', title: 'Status Updated', message: `${name} is now inactive.` });
            }
        });
    } else if (action === 'archive') {
        showFeedbackModal({
            type: 'confirm',
            title: 'Archive Item?',
            message: `Move ${name} to archives? This can be undone later.`,
            confirmText: 'Yes, Archive',
            onConfirm: () => {
                if (row) row.style.opacity = '0.5';
                showFeedbackModal({ type: 'success', title: 'Archived', message: `${name} has been archived successfully.` });
            }
        });
    } else if (action === 'offline') {
        showFeedbackModal({
            type: 'confirm',
            title: 'Mark as Offline?',
            message: `Are you sure you want to mark ${name} as Offline?`,
            confirmText: 'Yes, Go Offline',
            onConfirm: () => {
                const badge = row.querySelector('.status-badge');
                if (badge) {
                    badge.textContent = 'Offline';
                    badge.className = 'status-badge offline';
                }
                showFeedbackModal({ type: 'success', title: 'Status Updated', message: `${name} is now offline.` });
            }
        });
    } else if (action === 'view' || action === 'edit') {
        showNotification(`Opening details for ${name}...`, 'info');
    }
    
    closeAllPopovers();
};

/**
 * Utility for toast notifications (if not already present)
 */
function showNotification(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; top: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.style.cssText = `
        background: white;
        color: #1e293b;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateY(-20px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    toast.innerHTML = `
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    
    // Trigger entrance
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Global Water Standards Modal
 */
function initStandardsModal() {
    if (document.getElementById('globalStandardsModal')) return;
    
    const modalHTML = `
        <div class="modal-overlay" id="globalStandardsModal">
            <div class="modal" style="max-width: 850px; background: #f8fafc;">
                <div class="modal-header" style="background: white; border-bottom: 1px solid #e2e8f0; padding: 32px;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 48px; height: 48px; background: #14b8a615; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        </div>
                        <div>
                            <h2 style="font-size: 1.5rem; color: #1e293b; margin-bottom: 4px;">PNSDW Water Standards</h2>
                            <p style="font-size: 0.875rem; color: #64748b;">Philippine National Standards for Drinking Water (AO 2017-0010)</p>
                        </div>
                    </div>
                </div>
                <div class="modal-body" style="padding: 32px; background: #f8fafc;">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;">
                        
                        <!-- pH Level Card -->
                        <div style="background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                                    <span style="color: #14b8a6;">●</span> pH Level
                                </h3>
                                <span style="font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">Acidity/Basicity</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #166534;">Safe (Ideal)</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #15803d;">7.0 — 8.0</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fffbeb; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #92400e;">Warning</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b45309;">6.4 — 8.6</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fef2f2; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #991b1b;">Critical</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b91c1c;">&lt; 6.3 / &gt; 8.7</span>
                                </div>
                            </div>
                        </div>

                        <!-- Turbidity Card -->
                        <div style="background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                                    <span style="color: #38bdf8;">●</span> Turbidity
                                </h3>
                                <span style="font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">Water Clarity</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #166534;">Safe (Ideal)</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #15803d;">0 — 1 NTU</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fffbeb; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #92400e;">Warning</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b45309;">1 — 5 NTU</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fef2f2; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #991b1b;">Critical</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b91c1c;">&gt; 5 NTU</span>
                                </div>
                            </div>
                        </div>

                        <!-- Temperature Card -->
                        <div style="background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                                    <span style="color: #ef4444;">●</span> Temperature
                                </h3>
                                <span style="font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">Coolness</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #166534;">Safe (Ideal)</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #15803d;">25°C — 30°C</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fffbeb; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #92400e;">Warning</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b45309;">30°C — 32°C</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fef2f2; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #991b1b;">Critical</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b91c1c;">&gt; 32°C</span>
                                </div>
                            </div>
                        </div>

                        <!-- TDS Purity Card -->
                        <div style="background: white; border-radius: 20px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <h3 style="font-size: 1.1rem; color: #1e293b; display: flex; align-items: center; gap: 10px;">
                                    <span style="color: #f59e0b;">●</span> Total Dissolved Solids
                                </h3>
                                <span style="font-size: 0.75rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px;">Mineral Content</span>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0fdf4; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #166534;">Safe (Ideal)</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #15803d;">50 — 300 ppm</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fffbeb; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #92400e;">Warning</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b45309;">400 — 500 ppm</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #fef2f2; border-radius: 12px;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #991b1b;">Critical</span>
                                    <span style="font-family: 'Inter'; font-weight: 700; color: #b91c1c;">&gt; 500 ppm</span>
                                </div>
                            </div>
                        </div>

                    </div>
                    
                    <div style="margin-top: 32px; padding: 24px; background: white; border-radius: 20px; border: 1px dashed #cbd5e1; display: flex; gap: 16px; align-items: flex-start;">
                        <div style="width: 32px; height: 32px; background: #3b82f615; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        </div>
                        <p style="font-size: 0.875rem; color: #64748b; line-height: 1.6; margin: 0;">
                            <strong>Note on Compliance:</strong> Aqua Monitor thresholds are calibrated based on 
                            the <span style="color: #1e293b; font-weight: 600;">Department of Health (DOH)</span> requirements 
                            to ensure absolute safety for campus consumption.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="padding: 24px 32px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end;">
                    <button class="btn btn-primary" id="closeGlobalStandardsBtn" style="min-width: 140px; border-radius: 12px; height: 48px; font-weight: 600;">Close View</button>
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
 * ═══════════════════════════════════════════
 */
(function() {
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

    const icons = {
        success: { bg: '#ecfdf5', color: '#10b981', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
        error:   { bg: '#fef2f2', color: '#ef4444', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' },
        warning: { bg: '#fffbeb', color: '#f59e0b', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        confirm: { bg: '#eff6ff', color: '#3b82f6', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
        info:    { bg: '#f0f9ff', color: '#0ea5e9', svg: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' }
    };

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

        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
                if (opts.type === 'confirm' && opts.onCancel) opts.onCancel();
            }
        };
    };
})();
