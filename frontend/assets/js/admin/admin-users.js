/**
 * USER MANAGEMENT MODULE
 * Handles fetching and managing system users via API
 */

// State
let users = [];

// DOM Elements
const usersTableBody = document.querySelector('#usersTable tbody');
const searchInput = document.getElementById('searchInput');
const addModal = document.getElementById('addModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    setupEventListeners();
});

async function fetchUsers() {
    try {
        const [userList, adminList] = await Promise.all([
            API.users.getAll(),
            API.admins.getAll()
        ]);

        users = [
            ...(Array.isArray(userList) ? userList.map(user => ({ ...user, is_admin_record: false })) : []),
            ...(Array.isArray(adminList) ? adminList.map(admin => ({ ...admin, role_id: 1, is_admin_record: true })) : [])
        ];
        renderUsers(users);
        updateRoleStats(users);
        fetchActivity();
    } catch (error) {
        console.error('Failed to fetch users:', error);
        showNotification('Failed to load users from server', 'error');
    }
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            const filtered = users.filter(u => 
                u.name.toLowerCase().includes(q) || 
                u.email.toLowerCase().includes(q)
            );
            renderUsers(filtered);
        });
    }

    const roleSelect = document.getElementById('roleSelect');
    if (roleSelect) {
        roleSelect.addEventListener('change', () => {
            const isEditing = !!document.getElementById('editUserId').value;
            const modalIdLabel = document.getElementById('modalIdLabel');
            const val = roleSelect.value;
            if ((val === '1' || val === 'admin') && modalIdLabel && !isEditing) {
                modalIdLabel.textContent = 'Admin ID';
            } else if (modalIdLabel && !isEditing) {
                modalIdLabel.textContent = 'User ID';
            }
        });
    }

    const branchSelect = document.getElementById('branch');
    if (branchSelect) {
        branchSelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                const newBranch = prompt("Enter custom engineering branch name:");
                if (newBranch && newBranch.trim()) {
                    const cleaned = newBranch.trim();
                    let code = cleaned.substring(0, 3).toUpperCase();
                    const customCode = prompt(`Enter branch code for "${cleaned}":`, code);
                    if (customCode && customCode.trim()) {
                        code = customCode.trim().toUpperCase();
                    }
                    
                    const option = document.createElement('option');
                    option.value = cleaned;
                    option.textContent = cleaned;
                    option.dataset.code = code;
                    this.insertBefore(option, this.lastElementChild);
                    this.value = cleaned;
                    document.getElementById('branchCode').value = code;
                } else {
                    this.value = 'General';
                    document.getElementById('branchCode').value = 'GEN';
                }
            } else {
                const selectedOption = this.options[this.selectedIndex];
                document.getElementById('branchCode').value = selectedOption.dataset.code || '';
            }
        });
    }

    if (addModal) {
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) closeModal();
        });
    }
}

// ── Avatar Helpers ──
const AVATAR_COLORS = [
    'linear-gradient(135deg, #7c3aed, #a855f7)',  // Purple
    'linear-gradient(135deg, #0ea5e9, #38bdf8)',  // Sky
    'linear-gradient(135deg, #0f766e, #14b8a6)',  // Teal
    'linear-gradient(135deg, #e11d48, #fb7185)',  // Rose
    'linear-gradient(135deg, #ea580c, #fb923c)',  // Orange
    'linear-gradient(135deg, #2563eb, #60a5fa)',  // Blue
    'linear-gradient(135deg, #16a34a, #4ade80)',  // Green
    'linear-gradient(135deg, #9333ea, #c084fc)',  // Violet
    'linear-gradient(135deg, #0891b2, #22d3ee)',  // Cyan
    'linear-gradient(135deg, #b91c1c, #f87171)',  // Red
    'linear-gradient(135deg, #ca8a04, #facc15)',  // Amber
    'linear-gradient(135deg, #4f46e5, #818cf8)',  // Indigo
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

let currentPage = 1;
const itemsPerPage = 10;

function renderUsers(data, page = 1) {
    if (!usersTableBody) return;
    currentPage = page;

    if (data.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: #64748b;">No users found.</td></tr>`;
        updateTableInfo(0, 0, 0);
        renderPagination(0, 1, data);
        return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, data.length);
    const paginatedData = data.slice(startIndex, endIndex);

    updateTableInfo(startIndex + 1, endIndex, data.length);

    usersTableBody.innerHTML = paginatedData.map(u => {
        const esc = (window.Sanitizer && window.Sanitizer.escapeHTML) ? window.Sanitizer.escapeHTML : (s => s || '');
        const origin = u.is_admin_record ? 'admin' : 'user';
        const displayId = u.is_admin_record ? `ADM${String(u.id).padStart(4, '0')}` : `PCO${String(u.id).padStart(4, '0')}`;
        const initials = getInitials(u.name);
        const bgGradient = getAvatarColor(u.name || u.email || '');
        const avatarHtml = u.avatar 
            ? `<img src="${esc(u.avatar)}" alt="${esc(initials)}" class="user-av-img" style="width:40px;height:40px;min-width:40px;border-radius:50%;object-fit:cover;">`
            : `<div class="user-av" style="background: ${bgGradient};">${esc(initials)}</div>`;
        return `
        <tr data-search="${esc((u.name || '').toLowerCase())} ${esc((u.email||'').toLowerCase())} ${origin}${String(u.id).padStart(3, '0')}" data-origin="${origin}" data-id="${u.id}">
            <td>
                <div class="user-cell">
                    ${avatarHtml}
                    <div>
                        <div class="user-display-name">${esc(u.name)}</div>
                        <div class="user-id">${displayId}</div>
                    </div>
                </div>
            </td>
            <td><div class="email-cell">${esc(u.email)}</div></td>
            <td>${esc(u.branch || 'General')}</td>
            <td><span class="role-badge ${u.is_admin_record ? 'admin' : 'user'}">${u.is_admin_record ? 'Admin' : 'User'}</span></td>
            <td><span class="status-badge ${esc((u.status||'').toLowerCase())}">${esc(u.status || '')}</span></td>
            <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
            <td>
                <button class="actions-btn" data-user-id="${u.id}" data-origin="${origin}" id="user-actions-${origin}-${u.id}">⋮</button>
            </td>
        </tr>
    `}).join('');
    
    renderPagination(data.length, page, data);
}

/**
 * Handle User Status Update (Functional API Call)
 */
async function handleUserStatusUpdate(btnId, newStatus) {
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    const userId = btn.dataset.userId;
    const origin = btn.dataset.origin || 'user';
    if (!userId) return;

    try {
        if (origin === 'admin') {
            await API.admins.update(userId, { status: newStatus });
        } else {
            await API.users.update(userId, { status: newStatus });
        }
        showNotification(`User status updated to ${newStatus}`, 'success');
        fetchUsers();
        if (window.closeAllPopovers) window.closeAllPopovers();
    } catch (error) {
        showNotification(`Failed to update status: ${error.message}`, 'error');
    }
}

/**
 * Handle User Edit (Open Modal)
 */
async function handleUserEdit(btnId) {
    const btn = typeof btnId === 'string' ? document.getElementById(btnId) : btnId;
    const userId = btn.dataset.userId;
    const origin = btn.dataset.origin || 'user';
    if (!userId) return;

    try {
        const user = users.find(u => u.id == userId && ((u.is_admin_record && origin === 'admin') || (!u.is_admin_record && origin === 'user')));
        if (!user) return;

        // Fill modal
        document.getElementById('editUserId').value = user.id;
        // store origin for submit
        let editOriginInput = document.getElementById('editUserOrigin');
        if (!editOriginInput) {
            editOriginInput = document.createElement('input');
            editOriginInput.type = 'hidden';
            editOriginInput.id = 'editUserOrigin';
            document.querySelector('.modal-body').appendChild(editOriginInput);
        }
        editOriginInput.value = origin;
        document.getElementById('modalTitle').textContent = 'Edit User Details';
        document.getElementById('modalDesc').textContent = 'Modify the user information or reassign their system role.';
        
        const roleSelect = document.getElementById('roleSelect');
        if (roleSelect) {
            roleSelect.value = origin === 'admin' ? '1' : '2';
            roleSelect.disabled = true; // Role type cannot be switched during edit
        }

        // Populate User/Admin ID
        const modalUserIdInput = document.getElementById('modalUserId');
        const modalIdLabel = document.getElementById('modalIdLabel');
        if (modalUserIdInput && modalIdLabel) {
            if (origin === 'admin') {
                modalIdLabel.textContent = 'Admin ID';
                modalUserIdInput.value = `ADM${String(user.id).padStart(4, '0')}`;
            } else {
                modalIdLabel.textContent = 'User ID';
                modalUserIdInput.value = `PCO${String(user.id).padStart(4, '0')}`;
            }
        }

        const names = user.name.split(' ');
        const fnInput = document.getElementById('firstName');
        const lnInput = document.getElementById('lastName');
        const emailInput = document.getElementById('email');

        if (fnInput) fnInput.value = names[0] || '';
        if (lnInput) lnInput.value = names.slice(1).join(' ') || '';
        if (emailInput) emailInput.value = user.email || '';

        // Make Name and Email read-only during edit
        [fnInput, lnInput, emailInput].forEach(el => {
            if (el) {
                el.readOnly = true;
                el.style.background = '#f8fafc';
                el.style.color = '#64748b';
                el.style.cursor = 'not-allowed';
            }
        });
        
        // Handle branch select & custom additions
        const branchSelect = document.getElementById('branch');
        if (branchSelect) {
            const branchVal = user.branch || 'General';
            const branchCodeVal = user.branch_code || 'GEN';
            
            let optionExists = false;
            for (let i = 0; i < branchSelect.options.length; i++) {
                if (branchSelect.options[i].value === branchVal) {
                    optionExists = true;
                    break;
                }
            }
            
            if (!optionExists) {
                const option = document.createElement('option');
                option.value = branchVal;
                option.textContent = branchVal;
                option.dataset.code = branchCodeVal;
                branchSelect.insertBefore(option, branchSelect.lastElementChild);
            }
            
            branchSelect.value = branchVal;
            document.getElementById('branchCode').value = branchCodeVal;
        }

        document.getElementById('saveUserBtn').textContent = 'Update User';
        addModal.classList.add('open');

        if (window.closeAllPopovers) window.closeAllPopovers();
    } catch (error) {
        showNotification('Error loading user data', 'error');
    }
}

/**
 * Unified Submit Handler (Add or Update)
 */
async function handleUserSubmit() {
    const editId = document.getElementById('editUserId').value;
    const editOriginInput = document.getElementById('editUserOrigin');
    const editOrigin = editOriginInput ? editOriginInput.value : 'user';
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const branchVal = document.getElementById('branch').value;
    const branchCodeVal = document.getElementById('branchCode').value;

    const roleVal = document.getElementById('roleSelect') ? document.getElementById('roleSelect').value : '2';
    const accountType = editId ? editOrigin : ((roleVal === '1' || roleVal === 'admin') ? 'admin' : 'user');

    if (!firstName || !lastName || !email) {
        showNotification('Please fill in all basic fields (First Name, Last Name, and Email)', 'error');
        return;
    }

    const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        branch: branchVal,
        branch_code: branchCodeVal
    };

    if (accountType === 'admin') {
        const jobTitleInput = document.getElementById('jobTitle');
        const jobTitle = jobTitleInput ? jobTitleInput.value.trim() : '';
        payload.job_title = jobTitle || 'System Administrator';
    } else {
        payload.role_id = 2; // User role
    }

    try {
        if (editId) {
            // UPDATE
            if (accountType === 'admin') {
                await API.admins.update(editId, payload);
            } else {
                await API.users.update(editId, payload);
            }
            showNotification('Account updated successfully', 'success');
        } else {
            // CREATE - Formula: "@" + FirstName + DateCreatedDay (e.g. @Steph02)
            const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '') || 'User';
            const formattedFirstName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1);
            const now = new Date();
            const dayDD = String(now.getDate()).padStart(2, '0');
            const defaultPassword = `@${formattedFirstName}${dayDD}`;

            payload.password = defaultPassword;
            if (accountType === 'admin') {
                await API.admins.create(payload);
            } else {
                await API.users.create(payload);
            }
            
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({
                    type: 'info',
                    title: 'Account Created Successfully',
                    message: `Account created for ${firstName} ${lastName}.\n\nDefault Generated Password: ${defaultPassword}\n(Formula: @ + First Name + Date Created Day)`
                });
            } else {
                showNotification(`Account created! Default Password: ${defaultPassword}`, 'success');
            }
        }
        
        closeModal();
        fetchUsers();
    } catch (error) {
        showNotification(`Operation failed: ${error.message}`, 'error');
    }
}

/**
 * Open Modal in Add Mode
 */
function openAddModal() {
    // Reset modal
    document.getElementById('editUserId').value = '';
    document.getElementById('modalTitle').textContent = 'Add New Account';
    document.getElementById('modalDesc').textContent = 'Fill in the details to create a new user or admin account.';
    
    // Reset User/Admin ID input & label
    const modalUserIdInput = document.getElementById('modalUserId');
    const modalIdLabel = document.getElementById('modalIdLabel');
    if (modalUserIdInput && modalIdLabel) {
        modalIdLabel.textContent = 'User ID';
        modalUserIdInput.value = '';
        modalUserIdInput.placeholder = 'Auto-generated';
    }

    const fnInput = document.getElementById('firstName');
    const lnInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');

    if (fnInput) fnInput.value = '';
    if (lnInput) lnInput.value = '';
    if (emailInput) emailInput.value = '';

    // Re-enable Name and Email inputs for new account creation
    [fnInput, lnInput, emailInput].forEach(el => {
        if (el) {
            el.readOnly = false;
            el.style.background = '#ffffff';
            el.style.color = '#0f172a';
            el.style.cursor = 'text';
        }
    });
    
    // Reset branch select to General
    const branchSelect = document.getElementById('branch');
    if (branchSelect) {
        branchSelect.value = 'General';
    }
    document.getElementById('branchCode').value = 'GEN';
    
    const roleSelect = document.getElementById('roleSelect');
    if (roleSelect) {
        roleSelect.value = '2';
        roleSelect.disabled = false;
    }
    
    document.getElementById('saveUserBtn').textContent = 'Create User';
    addModal.classList.add('open');
}

/**
 * Handle User View Details Modal
 */
function handleUserView(param1, param2) {
    let userId = null;
    let origin = 'user';

    if (typeof param1 === 'object' && param1 !== null) {
        userId = param1.dataset ? param1.dataset.userId : null;
        origin = param1.dataset ? (param1.dataset.origin || 'user') : 'user';
    } else if (typeof param1 === 'string' && document.getElementById(param1)) {
        const btn = document.getElementById(param1);
        userId = btn.dataset ? btn.dataset.userId : null;
        origin = btn.dataset ? (btn.dataset.origin || 'user') : 'user';
    } else {
        userId = param1;
        origin = param2 || 'user';
    }

    if (!userId) return;

    let user = users.find(u => 
        String(u.id) === String(userId) && 
        ((u.is_admin_record && origin === 'admin') || (!u.is_admin_record && origin !== 'admin'))
    );

    if (!user) {
        user = users.find(u => String(u.id) === String(userId));
    }

    if (!user) return;

    const esc = (window.Sanitizer && window.Sanitizer.escapeHTML) ? window.Sanitizer.escapeHTML : (s => s || '');

    const displayId = origin === 'admin' ? `ADM${String(user.id).padStart(4, '0')}` : `PCO${String(user.id).padStart(4, '0')}`;
    const initials = getInitials(user.name);
    const bgGradient = getAvatarColor(user.name || user.email || '');

    const avatarEl = document.getElementById('viewUserAvatar');
    if (avatarEl) {
        if (user.avatar) {
            avatarEl.innerHTML = `<img src="${esc(user.avatar)}" alt="${esc(initials)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
            avatarEl.style.background = 'transparent';
        } else {
            avatarEl.textContent = initials;
            avatarEl.style.background = bgGradient;
        }
    }

    const nameEl = document.getElementById('viewUserName');
    if (nameEl) nameEl.textContent = user.name || 'Unnamed User';

    const emailEl = document.getElementById('viewUserEmail');
    if (emailEl) emailEl.textContent = user.email || 'No email provided';

    const statusBadge = document.getElementById('viewUserStatusBadge');
    if (statusBadge) {
        const st = user.status || 'Active';
        statusBadge.textContent = st;
        statusBadge.className = `badge ${st.toLowerCase()}`;
    }

    const idEl = document.getElementById('viewUserId');
    if (idEl) idEl.textContent = displayId;

    const typeEl = document.getElementById('viewUserAccountType');
    if (typeEl) typeEl.textContent = origin === 'admin' ? 'Administrator' : 'User (Operator)';

    const branchEl = document.getElementById('viewUserBranch');
    if (branchEl) branchEl.textContent = `${user.branch || 'General'} (${user.branch_code || 'GEN'})`;

    const roleEl = document.getElementById('viewUserRole');
    if (roleEl) roleEl.textContent = user.job_title || user.role_name || (origin === 'admin' ? 'System Administrator' : 'System Operator');

    const phoneEl = document.getElementById('viewUserPhone');
    if (phoneEl) {
        const rawP = user.phone || '';
        phoneEl.textContent = rawP ? (rawP.startsWith('+63') ? '0' + rawP.slice(3) : rawP) : 'Not specified';
    }

    const lastActiveEl = document.getElementById('viewUserLastActive');
    if (lastActiveEl) {
        lastActiveEl.textContent = user.last_login ? new Date(user.last_login).toLocaleString() : 'Never logged in';
    }

    const modal = document.getElementById('viewUserModal');
    if (modal) modal.classList.add('open');

    if (window.closeAllPopovers) window.closeAllPopovers();
}

function closeViewUserModal() {
    const modal = document.getElementById('viewUserModal');
    if (modal) modal.classList.remove('open');
}

// Map to global window
window.handleUserView = handleUserView;
window.closeViewUserModal = closeViewUserModal;
window.handleUserStatusUpdate = handleUserStatusUpdate;
window.handleUserEdit = handleUserEdit;
window.handleUserSubmit = handleUserSubmit;
window.openAddModal = openAddModal;

function updateRoleStats(data) {
    const admins = data.filter(u => u.is_admin_record || u.role_id === 1).length;
    const standardUsers = data.filter(u => !u.is_admin_record && u.role_id !== 1).length;
    const inactive = data.filter(u => {
        const status = (u.status || '').toLowerCase();
        return status === 'inactive' || status === 'suspended';
    }).length;
    
    const cards = document.querySelectorAll('.role-count');
    if (cards.length >= 3) {
        cards[0].textContent = admins;
        cards[1].textContent = standardUsers;
        cards[2].textContent = inactive;
    }
}

async function addUser() {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const roleSelect = document.querySelector('#addModal select');
    const roleId = roleSelect.value === 'Admin' ? 1 : 2;

    const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        password: 'Password123!', // Default password
        role_id: roleId
    };

    try {
        await API.users.create(payload);
        showNotification('User created successfully', 'success');
        closeModal();
        fetchUsers();
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

function closeModal() {
    if (addModal) addModal.classList.remove('open');
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    }
}

function updateTableInfo(start, end, total) {
    const info = document.querySelector('.table-info');
    if (info) {
        if (total === 0) {
            info.innerHTML = `Showing <span>0</span> to <span>0</span> of <span>0</span> entries`;
        } else {
            info.innerHTML = `Showing <span>${start}</span> to <span>${end}</span> of <span>${total}</span> entries`;
        }
    }
}

function renderPagination(totalItems, page, fullData) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    let html = '';

    html += `<button class="pg-btn ${page === 1 ? 'disabled' : ''}" onclick="window.goToUserPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
             </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pg-btn ${i === page ? 'active' : ''}" onclick="window.goToUserPage(${i})">${i}</button>`;
    }

    html += `<button class="pg-btn ${page === totalPages ? 'disabled' : ''}" onclick="window.goToUserPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </button>`;

    paginationContainer.innerHTML = html;

    window.goToUserPage = function(newPage) {
        if (newPage >= 1 && newPage <= totalPages) {
            renderUsers(fullData, newPage);
        }
    };
}

async function fetchActivity() {
    try {
        const logs = await API.users.getActivity();
        renderActivity(logs);
    } catch (error) {
        console.error('Failed to fetch activity:', error);
    }
}

function renderActivity(logs) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    if (logs.length === 0) {
        activityList.innerHTML = `<div style="padding: 24px; text-align: center; color: #94a3b8; font-size: 0.875rem;">No recent activity.</div>`;
        return;
    }

    activityList.innerHTML = logs.map(log => {
        const executor = log.executor_name || (log.user_id ? `User #${log.user_id}` : log.admin_id ? `Admin #${log.admin_id}` : 'System');
        const roleInfo = log.executor_role ? ` (${log.executor_role})` : '';
        return `
        <div class="activity-item">
            <div class="activity-icon ${getActivityColor(log.action)}">${getActivityIcon(log.action)}</div>
            <div class="activity-content">
                <div class="activity-title">${log.details || log.action || 'System Action'}</div>
                <div class="activity-meta">By ${executor}${roleInfo} • ${new Date(log.timestamp).toLocaleString()}</div>
            </div>
        </div>
        `;
    }).join('');
}

function getActivityColor(action) {
    if (action.includes('CREATE')) return 'blue';
    if (action.includes('UPDATE')) return 'orange';
    if (action.includes('DELETE')) return 'red';
    return 'green';
}

function getActivityIcon(action) {
    if (action.includes('CREATE')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>';
    if (action.includes('DELETE')) return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
}

window.addUser = addUser;
