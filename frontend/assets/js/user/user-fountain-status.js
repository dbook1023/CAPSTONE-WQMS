/**
 * USER FOUNTAIN STATUS MODULE
 * Handles fetching and displaying fountain status for the user portal
 */

let globalFountains = [];
let globalSensors = [];
let currentPage = 1;
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    fetchFountainStatus();
});

async function fetchFountainStatus() {
    try {
        const fountains = await API.fountains.getAll();
        const latestSensors = await API.sensors.getLatest();
        
        globalFountains = fountains;
        globalSensors = latestSensors;

        renderFountainStats(fountains, latestSensors);
        renderFountainTable(fountains, latestSensors, 1);
    } catch (error) {
        console.error('Failed to fetch fountain status:', error);
    }
}

function renderFountainStats(fountains, sensors) {
    const totalUnits = fountains.length;
    const maintenanceUnits = fountains.filter(f => f.status === 'Offline' || f.status === 'Maintenance').length;
    
    // Calculate Avg pH from latest sensor readings
    let avgPh = 0;
    if (sensors && sensors.length > 0) {
        const sum = sensors.reduce((acc, s) => acc + parseFloat(s.ph || 0), 0);
        avgPh = (sum / sensors.length).toFixed(1);
    }

    const totalVal = document.querySelector('.stat-card:nth-child(1) .stat-value');
    const phVal = document.querySelector('.stat-card:nth-child(2) .stat-value');
    const serviceVal = document.querySelector('.stat-card:nth-child(3) .stat-value');

    if (totalVal) totalVal.textContent = totalUnits;
    if (phVal) phVal.textContent = avgPh > 0 ? avgPh : '--';
    if (serviceVal) serviceVal.textContent = maintenanceUnits;
}

window.goToFountainPage = function(page) {
    if (page >= 1) {
        renderFountainTable(globalFountains, globalSensors, page);
    }
};

function renderFountainTable(fountains, sensors, page = 1) {
    const tbody = document.querySelector('.premium-table tbody');
    if (!tbody) return;
    
    currentPage = page;

    if (fountains.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">No fountains registered yet.</td></tr>`;
        updateTableInfo(0, 0, 0);
        renderPagination(0, 1);
        return;
    }
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, fountains.length);
    const paginatedData = fountains.slice(startIndex, endIndex);

    updateTableInfo(startIndex + 1, endIndex, fountains.length);

    tbody.innerHTML = paginatedData.map(f => {
        // Find latest sensor data for this fountain
        const sensor = sensors.find(s => s.fountain_id === f.id);
        const ph = sensor ? parseFloat(sensor.ph).toFixed(1) : '--';
        
        return `
            <tr>
                <td style="font-weight: 600; color: #1e293b;">${f.displayId}</td>
                <td>${f.name}</td>
                <td style="color: #64748b;">${f.location}</td>
                <td style="color: #14B8A6; font-weight: 600;">${ph} pH</td>
                <td>
                    <span class="status-badge ${f.status.toLowerCase()}">${f.status}</span>
                </td>
                <td style="color: #64748b;">${f.last_maintained ? new Date(f.last_maintained).toLocaleDateString() : 'None'}</td>
            </tr>
        `;
    }).join('');
    
    renderPagination(fountains.length, page);
}

function updateTableInfo(start, end, total) {
    const info = document.querySelector('.table-info');
    if (info) {
        if (total === 0) {
            info.innerHTML = `Showing <span>0</span> to <span>0</span> of <span>0</span> units`;
        } else {
            info.innerHTML = `Showing <span>${start}</span> to <span>${end}</span> of <span>${total}</span> units`;
        }
    }
}

function renderPagination(totalItems, page) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    let html = '';

    html += `<button class="pg-btn ${page === 1 ? 'disabled' : ''}" onclick="window.goToFountainPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
             </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pg-btn ${i === page ? 'active' : ''}" onclick="window.goToFountainPage(${i})">${i}</button>`;
    }

    html += `<button class="pg-btn ${page === totalPages ? 'disabled' : ''}" onclick="window.goToFountainPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </button>`;

    paginationContainer.innerHTML = html;
}
