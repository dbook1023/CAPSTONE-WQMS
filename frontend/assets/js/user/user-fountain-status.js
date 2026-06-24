/**
 * USER FOUNTAIN STATUS MODULE
 * Handles fetching and displaying fountain status for the user portal
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchFountainStatus();
});

async function fetchFountainStatus() {
    try {
        const fountains = await API.fountains.getAll();
        const latestSensors = await API.sensors.getLatest();
        renderFountainStats(fountains, latestSensors);
        renderFountainTable(fountains, latestSensors);
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

function renderFountainTable(fountains, sensors) {
    const tbody = document.querySelector('.premium-table tbody');
    if (!tbody) return;

    if (fountains.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px;">No fountains registered yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = fountains.map(f => {
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

    updateTableInfo(fountains.length, fountains.length);
}

function updateTableInfo(count, total) {
    const info = document.querySelector('.table-info');
    if (info) {
        info.innerHTML = `Showing <span>1</span> to <span>${count}</span> of <span>${total}</span> units`;
    }
}
