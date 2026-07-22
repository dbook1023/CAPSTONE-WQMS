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

    const accountTypeSelect = document.getElementById('accountTypeSelect');
    if (accountTypeSelect) {
        accountTypeSelect.addEventListener('change', () => {
            const isEditing = !!document.getElementById('editUserId').value;
            const jobTitleGroup = document.getElementById('jobTitleGroup');
            const roleGroup = document.getElementById('roleGroup');
            const modalUserIdInput = document.getElementById('modalUserId');
            const modalIdLabel = document.getElementById('modalIdLabel');

            if (accountTypeSelect.value === 'admin') {
                if (jobTitleGroup) jobTitleGroup.style.display = 'block';
                if (roleGroup) roleGroup.style.display = 'none';
                if (modalIdLabel && !isEditing) modalIdLabel.textContent = 'Admin ID';
            } else {
                if (jobTitleGroup) jobTitleGroup.style.display = 'none';
                if (roleGroup) roleGroup.style.display = 'block';
                if (modalIdLabel && !isEditing) modalIdLabel.textContent = 'User ID';
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
            <td><span class="role-badge ${esc((u.role_name||'operator').toLowerCase())}">${esc(u.role_name || 'Operator')}</span></td>
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
        
        // Handle Account Type Select setup
        const accountTypeSelect = document.getElementById('accountTypeSelect');
        const jobTitleGroup = document.getElementById('jobTitleGroup');
        const roleGroup = document.getElementById('roleGroup');
        
        if (accountTypeSelect) {
            accountTypeSelect.value = origin;
            accountTypeSelect.disabled = true; // Cannot switch type on edit
        }

        // Show/hide based on account type
        if (origin === 'admin') {
            if (jobTitleGroup) jobTitleGroup.style.display = 'block';
            if (roleGroup) roleGroup.style.display = 'none';
            document.getElementById('jobTitle').value = user.job_title || 'System Administrator';
        } else {
            if (jobTitleGroup) jobTitleGroup.style.display = 'none';
            if (roleGroup) roleGroup.style.display = 'block';
            document.getElementById('roleSelect').value = user.role_id || '';
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
        document.getElementById('firstName').value = names[0] || '';
        document.getElementById('lastName').value = names.slice(1).join(' ') || '';
        document.getElementById('email').value = user.email;
        
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

    const accountType = editId ? editOrigin : document.getElementById('accountTypeSelect').value;

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
        const jobTitle = document.getElementById('jobTitle').value.trim();
        payload.job_title = jobTitle || 'System Administrator';
    } else {
        const roleId = document.getElementById('roleSelect').value;
        if (!roleId) {
            showNotification('Please select a system role for the user', 'error');
            return;
        }
        payload.role_id = parseInt(roleId);
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
            // CREATE
            payload.password = 'Password123!'; // Default for new accounts
            if (accountType === 'admin') {
                await API.admins.create(payload);
            } else {
                await API.users.create(payload);
            }
            showNotification('Account created successfully', 'success');
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
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('modalDesc').textContent = 'Fill in the details to create a new user account.';
    
    // Reset User/Admin ID input & label
    const modalUserIdInput = document.getElementById('modalUserId');
    const modalIdLabel = document.getElementById('modalIdLabel');
    if (modalUserIdInput && modalIdLabel) {
        modalIdLabel.textContent = 'User ID';
        modalUserIdInput.value = '';
        modalUserIdInput.placeholder = 'Auto-generated';
    }

    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('email').value = '';
    
    // Reset branch select to General
    const branchSelect = document.getElementById('branch');
    if (branchSelect) {
        branchSelect.value = 'General';
    }
    document.getElementById('branchCode').value = 'GEN';
    
    // Reset Account Type selection and enable it
    const accountTypeSelect = document.getElementById('accountTypeSelect');
    if (accountTypeSelect) {
        accountTypeSelect.value = 'user';
        accountTypeSelect.disabled = false;
    }
    
    // Reset toggle fields
    const jobTitleGroup = document.getElementById('jobTitleGroup');
    const roleGroup = document.getElementById('roleGroup');
    if (jobTitleGroup) jobTitleGroup.style.display = 'none';
    if (roleGroup) roleGroup.style.display = 'block';
    
    document.getElementById('jobTitle').value = '';
    document.getElementById('roleSelect').value = '';
    
    document.getElementById('saveUserBtn').textContent = 'Create User';
    addModal.classList.add('open');
}

// Map to global window
window.handleUserStatusUpdate = handleUserStatusUpdate;
window.handleUserEdit = handleUserEdit;
window.handleUserSubmit = handleUserSubmit;
window.openAddModal = openAddModal;

function updateRoleStats(data) {
    const admins = data.filter(u => u.role_id === 1).length;
    const operators = data.filter(u => u.role_id === 2).length;
    const inactive = data.filter(u => {
        const status = (u.status || '').toLowerCase();
        return status === 'inactive' || status === 'suspended';
    }).length;
    
    const cards = document.querySelectorAll('.role-count');
    if (cards.length >= 3) {
        cards[0].textContent = admins;
        cards[1].textContent = operators;
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
