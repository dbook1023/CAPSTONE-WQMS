/**
 * FOUNTAIN MANAGEMENT MODULE
 * Handles fetching, rendering, and CRUD operations for fountains via API
 */

// State
let fountains = [];
let sensorsMap = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchFountains();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const addFountainBtn = document.getElementById('addFountainBtn');
    const closeFountainModal = document.getElementById('closeFountainModal');
    const fountainModal = document.getElementById('fountainModal');
    const fountainForm = document.getElementById('fountainForm');
    const refreshBtn = document.getElementById('refreshBtn');
    const viewStandardsBtn = document.getElementById('viewStandardsBtn');

    if (searchInput) searchInput.addEventListener('input', filterFountains);
    if (addFountainBtn) addFountainBtn.addEventListener('click', () => openModal());
    if (closeFountainModal) closeFountainModal.addEventListener('click', closeModal);
    if (fountainModal) {
        fountainModal.addEventListener('click', (e) => {
            if (e.target === fountainModal) closeModal();
        });
    }
    if (fountainForm) fountainForm.addEventListener('submit', handleFormSubmit);
    if (refreshBtn) refreshBtn.addEventListener('click', fetchFountains);
    if (viewStandardsBtn) {
        viewStandardsBtn.addEventListener('click', () => {
            window.location.href = 'admin-settings.html';
        });
    }
}

/**
 * Fetch fountains and latest sensor readings from the backend API
 */
async function fetchFountains() {
    const fountainsGrid = document.getElementById('fountainsGrid');
    try {
        if (fountainsGrid) {
            fountainsGrid.innerHTML = `
                <div class="loading-state" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;">
                    <p>Loading fountains...</p>
                </div>
            `;
        }

        const [data, latestSensors] = await Promise.all([
            API.fountains.getAll(),
            API.sensors.getLatest().catch(() => [])
        ]);

        fountains = Array.isArray(data) ? data : [];

        sensorsMap = {};
        if (Array.isArray(latestSensors)) {
            latestSensors.forEach(s => {
                if (s && s.fountain_id) {
                    sensorsMap[s.fountain_id] = s;
                }
            });
        }

        renderFountains(fountains);
        updateStats(fountains);
        showNotification('Fountains loaded from server', 'success');
    } catch (error) {
        console.error('Failed to fetch fountains:', error);
        showNotification('Failed to load fountains from server', 'error');
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
    const fountainsGrid = document.getElementById('fountainsGrid');
    if (!fountainsGrid) return;
    
    const list = Array.isArray(data) ? data : [];

    if (list.length === 0) {
        fountainsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 48px; color: #64748b;">
                <p>No fountains found. Add one to get started!</p>
            </div>
        `;
        return;
    }

    const esc = (s) => (s !== undefined && s !== null) 
        ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') 
        : '';

    fountainsGrid.innerHTML = list.map(f => {
        const displayId = f.displayId || f.display_id || `F${String(f.id).padStart(3, '0')}`;
        const name = f.name || 'Unnamed Fountain';
        const location = f.location || 'Unknown Location';
        const status = f.status || 'Online';
        const sensor = sensorsMap[f.id] || {};

        const phVal = (sensor.ph !== undefined && sensor.ph !== null) ? parseFloat(sensor.ph).toFixed(1) : '--';
        const turbidityVal = (sensor.turbidity !== undefined && sensor.turbidity !== null) ? `${parseFloat(sensor.turbidity).toFixed(1)} NTU` : '-- NTU';
        const tempVal = (sensor.temperature !== undefined && sensor.temperature !== null) ? `${parseFloat(sensor.temperature).toFixed(1)}°C` : '--°C';
        const tdsVal = (sensor.tds !== undefined && sensor.tds !== null) ? `${Math.round(sensor.tds)} ppm` : '-- ppm';

        return `
        <div class="fountain-card" data-name="${esc(name)}" data-location="${esc(location)}" data-id="${esc(displayId)}">
            <div class="fc-top">
                <span class="fc-id">${esc(displayId)}</span>
                <span class="fc-badge ${status.toLowerCase()}">
                    ${getStatusIcon(status)}
                    ${esc(status)}
                </span>
            </div>
            <div class="fc-title">${esc(name)}</div>
            <div class="fc-location">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${esc(location)}
            </div>
            
            ${status === 'Offline' ? `
                <div class="fc-offline-banner">
                    This fountain is currently offline. No data available.
                </div>
            ` : `
                <div class="fc-metrics">
                    <div class="fc-metric">
                        <div class="fc-metric-label">pH Level</div>
                        <div class="fc-metric-value">${esc(phVal)}</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">Turbidity</div>
                        <div class="fc-metric-value teal">${esc(turbidityVal)}</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">Temp</div>
                        <div class="fc-metric-value teal">${esc(tempVal)}</div>
                    </div>
                    <div class="fc-metric">
                        <div class="fc-metric-label">TDS</div>
                        <div class="fc-metric-value teal">${esc(tdsVal)}</div>
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
                    <div class="toggle-wrap ${status === 'Offline' ? 'disabled' : 'on'}" onclick="toggleMonitoring(this, ${f.id})">
                        <div class="toggle-track"><div class="toggle-thumb"></div></div>
                    </div>
                    <span class="monitoring-status ${status === 'Offline' ? 'disabled' : 'enabled'}">
                        ${status === 'Offline' ? 'Disabled' : 'Enabled'}
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
        `;
    }).join('');
}

function getStatusIcon(status) {
    if (status === 'Online') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    if (status === 'Warning' || status === 'Maintenance') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
}

function updateStats(data) {
    const list = Array.isArray(data) ? data : [];
    const online = list.filter(f => f.status === 'Online').length;
    const warning = list.filter(f => f.status === 'Warning' || f.status === 'Maintenance').length;
    const offline = list.filter(f => f.status === 'Offline' || f.status === 'Inactive').length;

    const statOnline = document.getElementById('stat-online');
    const statWarning = document.getElementById('stat-warning');
    const statOffline = document.getElementById('stat-offline');

    if (statOnline) statOnline.textContent = online;
    if (statWarning) statWarning.textContent = warning;
    if (statOffline) statOffline.textContent = offline;
}

/**
 * Filter fountains based on search input
 */
function filterFountains() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const q = searchInput.value.toLowerCase().trim();
    const filtered = fountains.filter(f => 
        (f.name && f.name.toLowerCase().includes(q)) || 
        (f.location && f.location.toLowerCase().includes(q)) || 
        ((f.displayId || f.display_id) && (f.displayId || f.display_id).toLowerCase().includes(q))
    );
    renderFountains(filtered);
}

/**
 * Modal Management
 */
function openModal(id = null) {
    const modal = document.getElementById('fountainModal');
    const form = document.getElementById('fountainForm');
    if (!modal || !form) return;

    if (id !== null && id !== undefined) {
        const f = fountains.find(item => item.id == id);
        if (!f) return;
        document.getElementById('modalTitle').textContent = 'Edit Fountain';
        document.getElementById('internalId').value = f.id;
        document.getElementById('fountainId').value = f.displayId || f.display_id || '';
        document.getElementById('fountainName').value = f.name || '';
        document.getElementById('fountainLocation').value = f.location || '';
        document.getElementById('fountainStatus').value = f.status || 'Online';
        document.getElementById('saveFountainBtn').textContent = 'Update Fountain';
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Fountain';
        form.reset();
        document.getElementById('internalId').value = '';
        document.getElementById('saveFountainBtn').textContent = 'Save Fountain';
    }
    modal.classList.add('open');
}

function closeModal() {
    const modal = document.getElementById('fountainModal');
    if (modal) modal.classList.remove('open');
}

/**
 * Form Submission (Add/Edit) — calls backend API
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('internalId').value;
    const payload = {
        displayId: document.getElementById('fountainId').value.trim(),
        name: document.getElementById('fountainName').value.trim(),
        location: document.getElementById('fountainLocation').value.trim(),
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
 * Toggle Monitoring / Status
 */
async function toggleMonitoring(el, id) {
    if (el.classList.contains('disabled')) return;
    const isOn = el.classList.contains('on');
    const newStatus = isOn ? 'Offline' : 'Online';
    try {
        await API.fountains.patchStatus(id, newStatus);
        showNotification(`Fountain status updated to ${newStatus}`, 'info');
        await fetchFountains();
    } catch (err) {
        showNotification(`Failed to update status: ${err.message}`, 'error');
    }
}

/**
 * Dropdown Toggle
 */
function toggleDropdown(event, btn) {
    event.stopPropagation();
    const dropdown = btn.nextElementSibling;
    if (!dropdown) return;
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

// Expose functions to global window object for inline event handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.deleteFountain = deleteFountain;
window.toggleMonitoring = toggleMonitoring;
window.toggleDropdown = toggleDropdown;
window.fetchFountains = fetchFountains;
