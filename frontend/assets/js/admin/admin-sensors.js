/**
 * HARDWARE REGISTRY MODULE
 * Manages ESP32 device registration and fountain assignment
 */

// State
let sensors = [];
let fountains = [];

// DOM Elements
const tableBody = document.getElementById('devicesTableBody');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const deviceModal = document.getElementById('deviceModal');
const deviceForm = document.getElementById('deviceForm');
const fountainSelect = document.getElementById('fountainSelect');
const closeModalBtn = document.getElementById('closeModal');
const searchInput = document.getElementById('deviceSearch');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

async function fetchData() {
    try {
        // Fetch both sensors and fountains
        const [sensorData, fountainData] = await Promise.all([
            API.sensors.getAll(),
            API.fountains.getAll()
        ]);

        sensors = sensorData;
        fountains = fountainData;

        renderSensors(sensors);
        populateFountainSelect(fountains);

        document.getElementById('count').textContent = sensors.length;
    } catch (error) {
        console.error('Failed to fetch hardware data:', error);
        showNotification('Failed to load device data', 'error');
    }
}

function setupEventListeners() {
    if (addDeviceBtn) addDeviceBtn.addEventListener('click', () => openModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (deviceForm) deviceForm.addEventListener('submit', handleFormSubmit);
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = sensors.filter(s =>
                s.serial_number.toLowerCase().includes(q) ||
                (s.fountain_name && s.fountain_name.toLowerCase().includes(q))
            );
            renderSensors(filtered);
        });
    }

    // Close modal on click outside
    window.addEventListener('click', (e) => {
        if (e.target === deviceModal) closeModal();
    });
}

function renderSensors(data) {
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 48px; color: #64748b;">No devices registered.</td></tr>`;
        return;
    }

    tableBody.innerHTML = data.map(s => {
        // Find the fountain object to get its displayId (e.g., F001)
        const fountain = fountains.find(f => f.id === s.fountain_id);
        const displayId = fountain ? fountain.displayId : '--';

        return `
            <tr>
                <td data-label="Device Serial">
                    <div class="td-flex">
                        <div class="mobile-hide" style="width: 32px; height: 32px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
                        </div>
                        <div class="device-serial-col" style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                            <span style="font-weight: 600; font-family: 'Inter'; font-size: 13.5px; word-break: break-all;">${s.serial_number}</span>
                            ${s.firmware_version ?
                `<span class="status-badge" style="display: inline-block; font-size: 10px; padding: 1px 6px; background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe;">v${s.firmware_version}</span>` :
                `<span class="status-badge" style="display: inline-block; font-size: 10px; padding: 1px 6px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;">Unknown</span>`
            }
                        </div>
                    </div>
                </td>
                <td data-label="Assigned Fountain">${s.fountain_name || 'Unassigned'}</td>
                <td data-label="Fountain ID"><span class="status-badge" style="background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;">${displayId}</span></td>
                <td data-label="Status">
                    <span class="status-badge ${s.status?.toLowerCase() || 'active'}">${s.status || 'Active'}</span>
                </td>
                <td data-label="Last Seen" style="color: #64748b; font-size: 13px;">${s.updated_at ? new Date(s.updated_at).toLocaleString() : 'Never'}</td>
                <td data-label="Actions">
                    <div class="td-flex">
                        <button class="btn btn-ghost btn-sm" onclick="editSensor(${s.id})" title="Edit & Calibrate">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn btn-ghost btn-sm" style="color: #ef4444;" onclick="deleteSensor(${s.id})" title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function populateFountainSelect(data) {
    if (!fountainSelect) return;
    const options = data.map(f => `<option value="${f.id}">${f.displayId} - ${f.name}</option>`).join('');
    fountainSelect.innerHTML = '<option value="" disabled selected>Select a fountain...</option>' + options;
}

function openModal(id = null) {
    if (id) {
        const s = sensors.find(item => item.id === id);
        if (!s) return;
        document.getElementById('modalTitle').textContent = 'Reassign Device';
        document.getElementById('serialInput').value = s.serial_number;
        document.getElementById('serialInput').readOnly = true;
        document.getElementById('fountainSelect').value = s.fountain_id;
        document.getElementById('saveBtn').textContent = 'Update Configuration';
    } else {
        document.getElementById('modalTitle').textContent = 'Register New Device';
        deviceForm.reset();
        document.getElementById('serialInput').readOnly = false;
        document.getElementById('saveBtn').textContent = 'Register Device';
    }
    deviceModal.classList.add('open');
}

function closeModal() {
    deviceModal.classList.remove('open');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const payload = {
        serial_number: document.getElementById('serialInput').value,
        fountain_id: parseInt(document.getElementById('fountainSelect').value)
    };

    try {
        const response = await API.sensors.register(payload);

        showNotification(response.message, 'success');
        closeModal();
        fetchData(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

window.editSensor = (id) => openModal(id);

window.deleteSensor = async (id) => {
    if (!confirm('Are you sure you want to remove this device registration?')) return;

    try {
        const response = await API.sensors.delete(id);
        showNotification(response.message, 'success');
        fetchData();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showNotification(msg, type) {
    if (window.showNotification) {
        window.showNotification(msg, type);
    } else {
        alert(msg);
    }
}
