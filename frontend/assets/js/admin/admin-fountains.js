/**
 * FOUNTAIN MANAGEMENT MODULE
 * Handles fetching, rendering, and CRUD operations for fountains via API
 */

// State
let fountains = [];

// DOM Elements
const fountainsGrid = document.getElementById('fountainsGrid');
const searchInput = document.getElementById('searchInput');
const fountainModal = document.getElementById('fountainModal');
const fountainForm = document.getElementById('fountainForm');
const addFountainBtn = document.getElementById('addFountainBtn');
const closeFountainModal = document.getElementById('closeFountainModal');
const refreshBtn = document.getElementById('refreshBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchFountains();
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) searchInput.addEventListener('input', filterFountains);
    if (addFountainBtn) addFountainBtn.addEventListener('click', () => openModal());
    if (closeFountainModal) closeFountainModal.addEventListener('click', closeModal);
    if (fountainModal) fountainModal.addEventListener('click', (e) => {
        if (e.target === fountainModal) closeModal();
    });
    if (fountainForm) fountainForm.addEventListener('submit', handleFormSubmit);
    if (refreshBtn) refreshBtn.addEventListener('click', fetchFountains);
}

/**
 * Fetch fountains from the backend API
 */
async function fetchFountains() {
    try {
        if (fountainsGrid) {
            fountainsGrid.innerHTML = `<div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;"><p>Loading fountains...</p></div>`;
        }

        const data = await API.fountains.getAll();
        fountains = data;
        renderFountains(fountains);
        updateStats(fountains);
        showNotification('Fountains loaded from server', 'success');
    } catch (error) {
        console.error('Failed to fetch fountains:', error);
        showNotification('Failed to load fountains from server', 'error');
        // Show error state
        if (fountainsGrid) {
            fountainsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #ef4444;">
                    <p>Could not connect to server. Make sure the backend is running on port 5000.</p>
                    <button class="btn btn-ghost" onclick="fetchFountains()" style="margin-top: 12px;">Retry</button>
                </div>
            `;
        }
    }
}

/**
 * Render fountain cards
 */
function renderFountains(data) {
    if (!fountainsGrid) return;
    
    if (data.length === 0) {
        fountainsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;">
                <p>No fountains found. Add one to get started!</p>
            </div>
        `;
        return;
    }

    fountainsGrid.innerHTML = data.map(f => {
        const esc = (window.Sanitizer && window.Sanitizer.escapeHTML) ? window.Sanitizer.escapeHTML : (s => s || '');
        return `
        <div class="fountain-card" data-name="${esc(f.name)}" data-location="${esc(f.location)}" data-id="${esc(f.displayId)}">
            <div class="fc-top">
                <span class="fc-id">${esc(f.displayId)}</span>
                <span class="fc-badge ${(f.status || '').toLowerCase()}">
                    ${getStatusIcon(f.status)}
                    ${esc(f.status)}
                </span>
            </div>
            <div class="fc-title">${esc(f.name)}</div>
            <div class="fc-location">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${esc(f.location)}
            </div>
            
            ${f.status === 'Offline' ? `
                <div class="fc-offline-banner">
                    This fountain is currently offline. No data available.
                </div>
            ` : `
                <div class="fc-metrics">
                    <div class="fc-metric">
                        <div class="fc-metric-label">pH Level</div>
                        <div class="fc-metric-value">--</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">Turbidity</div>
                        <div class="fc-metric-value teal">-- NTU</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">Temp</div>
                        <div class="fc-metric-value teal">--°C</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">TDS</div>
                        <div class="fc-metric-value teal">-- ppm</div>
                    </div>
                </div>
            `}
            
            <hr class="fc-divider">
            <div class="fc-updated">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Last updated: ${f.updated_at ? new Date(f.updated_at).toLocaleString() : 'Just now'}
            </div>
            <div class="fc-bottom">
                <div class="fc-monitoring">
                    Monitoring:
                    <div class="toggle-wrap ${f.status === 'Offline' ? 'disabled' : 'on'}" onclick="toggleMonitoring(this, ${f.id})">
                        <div class="toggle-track"><div class="toggle-thumb"></div></div>
                    </div>
                    <span class="monitoring-status ${f.status === 'Offline' ? 'disabled' : 'enabled'}">
                        ${f.status === 'Offline' ? 'Disabled' : 'Enabled'}
                    </span>
                </div>
                <button class="configure-btn" onclick="openModal(${f.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Configure</span>
                </button>
                <div class="actions-dropdown">
                    <button class="actions-btn" onclick="toggleDropdown(event, this)">⋮</button>
                    <div class="dropdown-content">
                        <button onclick="openModal(${f.id})">Edit</button>
                        <button class="delete-action" onclick="deleteFountain(${f.id})">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

}


function getStatusIcon(status) {
    if (status === 'Online') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    if (status === 'Warning' || status === 'Maintenance') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
}

function updateStats(data) {
    const online = data.filter(f => f.status === 'Online').length;
    const warning = data.filter(f => f.status === 'Warning' || f.status === 'Maintenance').length;
    const offline = data.filter(f => f.status === 'Offline' || f.status === 'Inactive').length;

    const stats = document.querySelectorAll('.stat-value');
    if (stats.length >= 3) {
        stats[0].textContent = online;
        stats[1].textContent = warning;
        stats[2].textContent = offline;
    }
}

/**
 * Filter fountains based on search input
 */
function filterFountains() {
    const q = searchInput.value.toLowerCase();
    const filtered = fountains.filter(f => 
        f.name.toLowerCase().includes(q) || 
        f.location.toLowerCase().includes(q) || 
        (f.displayId && f.displayId.toLowerCase().includes(q))
    );
    renderFountains(filtered);
}

/**
 * Modal Management
 */
function openModal(id = null) {
    if (id) {
        const f = fountains.find(item => item.id === id);
        if (!f) return;
        document.getElementById('modalTitle').textContent = 'Edit Fountain';
        document.getElementById('internalId').value = f.id;
        document.getElementById('fountainId').value = f.displayId;
        document.getElementById('fountainName').value = f.name;
        document.getElementById('fountainLocation').value = f.location;
        document.getElementById('fountainStatus').value = f.status;
        document.getElementById('saveFountainBtn').textContent = 'Update Fountain';
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Fountain';
        fountainForm.reset();
        document.getElementById('internalId').value = '';
        document.getElementById('saveFountainBtn').textContent = 'Save Fountain';
    }
    fountainModal.classList.add('open');
}

function closeModal() {
    fountainModal.classList.remove('open');
}

/**
 * Form Submission (Add/Edit) — calls backend API
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('internalId').value;
    const payload = {
        displayId: document.getElementById('fountainId').value,
        name: document.getElementById('fountainName').value,
        location: document.getElementById('fountainLocation').value,
        status: document.getElementById('fountainStatus').value
    };

    try {
        if (id) {
            // Edit existing via PUT
            await API.fountains.update(id, payload);
            showNotification('Fountain updated successfully', 'success');
        } else {
            // Add new via POST
            await API.fountains.create(payload);
            showNotification('New fountain added', 'success');
        }
        closeModal();
        await fetchFountains(); // Refresh from server
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Delete Fountain — calls backend API
 */
async function deleteFountain(id) {
    if (!confirm('Are you sure you want to delete this fountain?')) return;
    
    try {
        await API.fountains.delete(id);
        showNotification('Fountain deleted', 'info');
        await fetchFountains(); // Refresh from server
    } catch (error) {
        showNotification(`Delete failed: ${error.message}`, 'error');
    }
}

/**
 * Toggle Monitoring
 */
function toggleMonitoring(el, id) {
    if (el.classList.contains('disabled')) return;
    el.classList.toggle('on');
    const label = el.closest('.fc-monitoring').querySelector('.monitoring-status');
    const isOn = el.classList.contains('on');
    label.textContent = isOn ? 'Enabled' : 'Disabled';
    label.className = 'monitoring-status ' + (isOn ? 'enabled' : 'disabled');
}

/**
 * Dropdown Toggle
 */
function toggleDropdown(event, btn) {
    event.stopPropagation();
    const dropdown = btn.nextElementSibling;
    const isOpen = dropdown.classList.contains('show');
    document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
    if (!isOpen) dropdown.classList.add('show');
}

window.addEventListener('click', (e) => {
    if (!e.target.matches('.actions-btn')) {
        document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
    }
});

/**
 * Utility for toast notifications
 */
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}
