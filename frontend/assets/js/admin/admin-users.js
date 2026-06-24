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

    if (addModal) {
        addModal.addEventListener('click', (e) => {
            if (e.target === addModal) closeModal();
        });
    }
}

function renderUsers(data) {
    if (!usersTableBody) return;

    if (data.length === 0) {
        usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 24px; color: #64748b;">No users found.</td></tr>`;
        updateTableInfo(0, 0);
        return;
    }

    updateTableInfo(data.length, users.length);

    usersTableBody.innerHTML = data.map(u => {
        const origin = u.is_admin_record ? 'admin' : 'user';
        const displayId = `U${String(u.id).padStart(3, '0')}`;
        return `
        <tr data-search="${(u.name || '').toLowerCase()} ${(u.email||'').toLowerCase()} ${origin}${String(u.id).padStart(3, '0')}" data-origin="${origin}" data-id="${u.id}">
            <td>
                <div class="user-cell">
                    <div class="user-av">${(u.name||'').substring(0, 2).toUpperCase()}</div>
                    <div>
                        <div class="user-display-name">${u.name || ''}</div>
                        <div class="user-id">${displayId}</div>
                    </div>
                </div>
            </td>
            <td><div class="email-cell">${u.email || ''}</div></td>
            <td>${u.branch || 'General'}</td>
            <td><span class="role-badge ${(u.role_name||'operator').toLowerCase()}">${u.role_name || 'Operator'}</span></td>
            <td><span class="status-badge ${(u.status||'').toLowerCase()}">${u.status || ''}</span></td>
            <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
            <td>
                <button class="actions-btn" data-user-id="${u.id}" data-origin="${origin}" id="user-actions-${origin}-${u.id}">⋮</button>
            </td>
        </tr>
    `}).join('');
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
        
        const names = user.name.split(' ');
        document.getElementById('firstName').value = names[0] || '';
        document.getElementById('lastName').value = names.slice(1).join(' ') || '';
        document.getElementById('email').value = user.email;
        document.getElementById('branch').value = user.branch || '';
        document.getElementById('branchCode').value = user.branch_code || '';
        document.getElementById('roleSelect').value = user.role_id;
        
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
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const roleId = document.getElementById('roleSelect').value;

    const payload = {
        name: `${firstName} ${lastName}`.trim(),
        email: email,
        role_id: parseInt(roleId)
    };

    try {
        if (editId) {
            // UPDATE
            if (editOrigin === 'admin') {
                await API.admins.update(editId, payload);
            } else {
                await API.users.update(editId, payload);
            }
            showNotification('User updated successfully', 'success');
        } else {
            // CREATE: choose admin vs user based on roleId
            payload.password = 'Password123!'; // Default for new users
            if (parseInt(roleId) === 1) {
                // create admin
                await API.admins.create(payload);
            } else {
                await API.users.create(payload);
            }
            showNotification('User created successfully', 'success');
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
    
    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('branch').value = '';
    document.getElementById('branchCode').value = '';
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
    
    const cards = document.querySelectorAll('.role-count');
    if (cards.length >= 2) {
        cards[0].textContent = admins;
        cards[1].textContent = operators;
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

function updateTableInfo(count, total) {
    const info = document.querySelector('.table-info');
    if (info) {
        info.innerHTML = `Showing <span>${count}</span> of <span>${total}</span> entries`;
    }
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

    activityList.innerHTML = logs.map(log => `
        <div class="activity-item">
            <div class="activity-icon ${getActivityColor(log.action)}">${getActivityIcon(log.action)}</div>
            <div class="activity-content">
                <div class="activity-title">${log.details}</div>
                <div class="activity-meta">By User #${log.user_id} • ${new Date(log.timestamp).toLocaleString()}</div>
            </div>
        </div>
    `).join('');
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
