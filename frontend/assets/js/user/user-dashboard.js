/**
 * USER DASHBOARD MODULE
 * Handles personal monitoring data and trend visualization
 */

// State
let charts = {};

// DOM Elements
const metricCards = document.querySelectorAll('.metric-card');
const metricValues = {
    ph: document.querySelector('.metric-card:nth-child(1) .metric-value'),
    turbidity: document.querySelector('.metric-card:nth-child(2) .metric-value'),
    temperature: document.querySelector('.metric-card:nth-child(3) .metric-value'),
    tds: document.querySelector('.metric-card:nth-child(4) .metric-value')
};

const trendInsights = {
    status: document.getElementById('qualityValue'),
    statusDesc: document.getElementById('qualityDesc'),
    purity: document.getElementById('purityValue'),
    purityDesc: document.getElementById('purityDesc'),
    health: document.getElementById('healthValue'),
    healthDesc: document.getElementById('healthDesc'),
    period: document.getElementById('trendPeriod')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchDashboardData);
});

async function fetchDashboardData() {
    try {
        const latest = await API.sensors.getLatest();
        if (latest && latest.length > 0) {
            // Sort by ID or Timestamp descending to get the absolute latest update first
            latest.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            const data = latest[0];
            
            // Update the header title with the fountain name
            const headerTitle = document.querySelector('.header-title');
            if (headerTitle) {
                headerTitle.innerHTML = `Monitoring: <span style="color: #14B8A6;">${data.fountain_name || 'Live Device'}</span>`;
            }

            updateMetrics(data);
            
            const history = await API.sensors.getHistory(data.fountain_id, 10);
            if (history) {
                renderDashboardCharts(history);
                updateTrendInsights(history);
            }
            
            const lastUpdated = document.getElementById('lastUpdatedBar');
            if (lastUpdated) lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleString();
        } else {
            setEmptyState();
        }
    } catch (error) {
        console.error('User Dashboard error:', error);
    }
}

function updateMetrics(data) {
    function formatSensorDisplay(key, value) {
        if (value === null || value === undefined) return '--';
        const n = parseFloat(value);
        if (Number.isNaN(n)) return '--';
        if (key === 'tds') return Math.round(n) + '<span class="metric-unit">ppm</span>';
        if (key === 'temperature') return n.toFixed(2) + '<span class="metric-unit">°C</span>';
        if (key === 'turbidity') return n.toFixed(2) + '<span class="metric-unit">NTU</span>';
        if (key === 'ph') return n.toFixed(2) + '<span class="metric-unit">pH</span>';
        return n.toString();
    }

    if (metricValues.ph) metricValues.ph.innerHTML = formatSensorDisplay('ph', data.ph);
    if (metricValues.turbidity) metricValues.turbidity.innerHTML = formatSensorDisplay('turbidity', data.turbidity);
    if (metricValues.temperature) metricValues.temperature.innerHTML = formatSensorDisplay('temperature', data.temperature);
    if (metricValues.tds) metricValues.tds.innerHTML = formatSensorDisplay('tds', data.tds);

    // Update Badges & Status Spans
    const phSafe = updateBadge(metricCards[0], data.ph, 6.5, 8.5);
    const turbSafe = updateBadge(metricCards[1], data.turbidity, 0, 5);
    const tempSafe = updateBadge(metricCards[2], data.temperature, 15, 30);
    const tdsSafe = updateBadge(metricCards[3], data.tds, 0, 500);

    // Update Standards section status text
    const sPh = document.getElementById('status-ph');
    const sTurb = document.getElementById('status-turbidity');
    const sTemp = document.getElementById('status-temp');
    const sTds = document.getElementById('status-tds');

    if (sPh) sPh.textContent = phSafe ? 'Within safe limits' : 'Out of range';
    if (sTurb) sTurb.textContent = turbSafe ? 'Excellent clarity' : 'Turbid / Needs check';
    if (sTemp) sTemp.textContent = tempSafe ? 'Optimal' : 'Needs adjustment';
    if (sTds) sTds.textContent = tdsSafe ? 'Excellent purity' : 'High mineral content';
}

function updateBadge(card, value, min, max) {
    if (!card) return 'safe';
    const badge = card.querySelector('.safe-badge');
    const valText = card.querySelector('.metric-value');
    
    // Define thresholds
    const isSafe = value >= min && value <= max;
    const isWarning = (value >= min - (min * 0.1) && value < min) || (value > max && value <= max + (max * 0.1));
    const isUnsafe = value < min - (min * 0.1) || value > max + (max * 0.1);

    let status = 'safe';
    if (isUnsafe) status = 'unsafe';
    else if (isWarning) status = 'warning';

    if (badge) {
        const labelText = card.querySelector('.metric-label');
        const unitTexts = card.querySelectorAll('.metric-unit');
        const icon = card.querySelector('.metric-icon svg');

        // Reset colors first
        card.style.transition = 'all 0.4s ease';
        [valText, labelText, ...unitTexts].forEach(el => { if (el) el.style.color = 'white'; });

        if (status === 'safe') {
            card.style.background = '#14b8a6'; // Solid Teal
            card.style.borderColor = '#0d9488';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Safe`;
        } else if (status === 'warning') {
            card.style.background = '#f59e0b'; // Solid Amber
            card.style.borderColor = '#d97706';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Warning`;
        } else {
            card.style.background = '#dc2626'; // Solid Red
            card.style.borderColor = '#b91c1c';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Unsafe`;
        }
    }

    const trendEl = card.querySelector('.metric-trend');
    if (trendEl && valText) {
        // Let's identify which parameter this card is
        let paramName = '';
        const idVal = valText.id || '';
        if (idVal.includes('ph')) paramName = 'ph';
        else if (idVal.includes('turbidity')) paramName = 'turb';
        else if (idVal.includes('temp')) paramName = 'temp';
        else if (idVal.includes('tds')) paramName = 'tds';

        let finding = 'Normal';
        if (paramName === 'ph') {
            if (value < 6.5) finding = 'Acidic (Danger)';
            else if (value > 8.5) finding = 'Alkaline (Danger)';
            else if (value < 6.8) finding = 'Mildly Acidic';
            else if (value > 7.6) finding = 'Mildly Alkaline';
            else finding = 'Optimal pH (Safe)';
        } else if (paramName === 'turb') {
            if (value > 5.0) finding = 'Turbid (Danger)';
            else if (value > 3.5) finding = 'Cloudy (Warning)';
            else finding = 'Clear (Safe)';
        } else if (paramName === 'temp') {
            if (value < 19.8) finding = 'Overcooled Chiller';
            else if (value > 30.8) finding = 'Overheated';
            else if (value < 22.0) finding = 'Cool (Safe)';
            else if (value > 28.0) finding = 'Warm (Safe)';
            else finding = 'Optimal Temp (Safe)';
        } else if (paramName === 'tds') {
            if (value > 500) finding = 'Contaminated (Danger)';
            else if (value > 150) finding = 'Elevated Minerals';
            else finding = 'Pure Water (Safe)';
        }

        trendEl.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span style="font-weight: 500; margin-left: 4px;">${finding}</span>
        `;
        trendEl.style.color = 'rgba(255, 255, 255, 0.95)';
    }

    return isSafe;
}


function updateTrendInsights(history) {
    if (history.length === 0) return;
    const latest = history[0];
    
    if (trendInsights.period) {
        trendInsights.period.textContent = `Real-time analytics for ${new Date().toLocaleDateString()}`;
    }

    if (trendInsights.status) {
        const isSafe = latest.ph >= 6.5 && latest.ph <= 8.5 && latest.turbidity <= 5;
        trendInsights.status.textContent = isSafe ? 'Highly Safe' : 'Maintenance Needed';
        if (trendInsights.statusDesc) {
            trendInsights.statusDesc.textContent = isSafe ? 
                'All parameters are within PNSDW safe ranges.' : 
                'Warning: Some parameters exceed safe limits.';
        }
    }
    
    if (trendInsights.purity) {
        const purity = Math.max(0, 100 - (latest.turbidity * 5)).toFixed(1);
        trendInsights.purity.textContent = `${purity}%`;
        if (trendInsights.purityDesc) {
            const turb = parseFloat(latest.turbidity);
            const turbText = Number.isNaN(turb) ? '--' : turb.toFixed(2) + ' NTU';
            trendInsights.purityDesc.textContent = `Based on current turbidity (${turbText})`;
        }
    }

    if (trendInsights.health) {
        const isOptimal = latest.tds < 300 && latest.ph >= 7.0 && latest.ph <= 7.5;
        trendInsights.health.textContent = isOptimal ? 'Optimal' : 'Safe';
        if (trendInsights.healthDesc) {
            trendInsights.healthDesc.textContent = isOptimal ? 
                'Ideal mineral balance for hydration.' : 
                'Water is safe for consumption.';
        }
    }
}

function setEmptyState() {
    Object.values(metricValues).forEach(el => { if (el) el.textContent = '--'; });
    
    // Clear trend insights
    if (trendInsights.status) trendInsights.status.textContent = '--';
    if (trendInsights.statusDesc) trendInsights.statusDesc.textContent = 'No sensor data found.';
    if (trendInsights.purity) trendInsights.purity.textContent = '--';
    if (trendInsights.purityDesc) trendInsights.purityDesc.textContent = 'N/A';
    if (trendInsights.health) trendInsights.health.textContent = '--';
    if (trendInsights.healthDesc) trendInsights.healthDesc.textContent = 'N/A';
    if (trendInsights.period) trendInsights.period.textContent = 'No active session';

    const lastUpdated = document.getElementById('lastUpdatedBar');
    if (lastUpdated) lastUpdated.textContent = 'No sensor data available. Connect a fountain to start.';
}

function renderDashboardCharts(history) {
    if (!window.Chart) return;
    const logs = [...history].reverse();
    const labels = logs.map(log => {
        const d = new Date(log.timestamp);
        return d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
    });

    const configs = [
        { id: 'phChart', data: logs.map(l => l.ph), color: '#14B8A6' },
        { id: 'turbidityChart', data: logs.map(l => l.turbidity), color: '#38bdf8' },
        { id: 'tempChart', data: logs.map(l => l.temperature), color: '#ef4444' },
        { id: 'tdsChart', data: logs.map(l => l.tds), color: '#f59e0b' }
    ];

    configs.forEach(cfg => {
        const canvas = document.getElementById(cfg.id);
        if (canvas) {
            if (charts[cfg.id]) charts[cfg.id].destroy();
            const ctx = canvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 0, 180);
            grad.addColorStop(0, `${cfg.color}25`);
            grad.addColorStop(1, `${cfg.color}01`);

            charts[cfg.id] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        data: cfg.data,
                        borderColor: cfg.color,
                        backgroundColor: grad,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.45,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                        y: { grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8' } }
                    }
                }
            });
        }
    });
}
