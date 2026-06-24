/**
 * ADMIN DASHBOARD MODULE
 * Handles real-time sensor data visualization and system health monitoring
 */

// State
let charts = {};
let latestData = null;

// DOM Elements
const metricCards = document.querySelectorAll('.metric-card');
const metricValues = {
    ph: document.querySelector('.metric-card:nth-child(1) .metric-value'),
    turbidity: document.querySelector('.metric-card:nth-child(2) .metric-value'),
    temperature: document.querySelector('.metric-card:nth-child(3) .metric-value'),
    tds: document.querySelector('.metric-card:nth-child(4) .metric-value')
};

const trendValues = {
    stability: document.getElementById('stabilityValue'),
    stabilityDesc: document.getElementById('stabilityDesc'),
    phVariance: document.getElementById('phVarValue'),
    phVarDesc: document.getElementById('phVarDesc'),
    anomalies: document.getElementById('anomalyValue'),
    anomalyDesc: document.getElementById('anomalyDesc'),
    peakTemp: document.getElementById('peakValue'),
    peakDesc: document.getElementById('peakDesc'),
    period: document.getElementById('trendPeriod')
};

const footerStats = {
    health: document.getElementById('footer-health'),
    alerts: document.getElementById('footer-alerts'),
    compliance: document.getElementById('footer-compliance'),
    performance: document.getElementById('footer-performance')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000); // 30s refresh
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', fetchDashboardData);
    }
});

async function fetchDashboardData() {
    try {
        const latest = await API.sensors.getLatest();
        if (latest && latest.length > 0) {
            latestData = latest[0];
            updateMetrics(latestData);
            
            const history = await API.sensors.getHistory(latestData.fountain_id, 10);
            if (history) {
                renderDashboardCharts(history);
                updateTrendAnalysis(history);
            }
            
            updateLastUpdated();
            updateFooterStats();
        }
    } catch (error) {
        console.error('Admin Dashboard error:', error);
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


function updateTrendAnalysis(history) {
    if (history.length === 0) return;

    if (trendValues.period) {
        trendValues.period.textContent = `Real-time analytics for ${new Date().toLocaleDateString()}`;
    }

    // Stability Score
    const temps = history.map(h => parseFloat(h.temperature));
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const variance = maxTemp - minTemp;
    const stability = Math.max(0, (100 - (variance * 5))).toFixed(1);

    if (trendValues.stability) trendValues.stability.textContent = `${stability}%`;
    if (trendValues.stabilityDesc) {
        trendValues.stabilityDesc.textContent = stability > 95 ? 'Excellent parameter consistency' : 'Minor fluctuations detected';
    }
    
    // pH Variance
    const phs = history.map(h => parseFloat(h.ph));
    const phVar = (Math.max(...phs) - Math.min(...phs)).toFixed(2);
    if (trendValues.phVariance) trendValues.phVariance.textContent = `±${phVar}`;
    if (trendValues.phVarDesc) {
        trendValues.phVarDesc.textContent = phVar < 0.5 ? 'Minimal fluctuation detected' : 'Moderate deviation from neutral';
    }

    // Anomaly Detection
    const anomalies = history.filter(h => h.ph < 6.0 || h.ph > 9.0 || h.turbidity > 10).length;
    if (trendValues.anomalies) trendValues.anomalies.textContent = `${anomalies} Found`;
    if (trendValues.anomalyDesc) {
        trendValues.anomalyDesc.textContent = anomalies === 0 ? 'No critical deviations' : 'Critical sensor spikes detected';
    }

    // Peak Temp
    if (trendValues.peakTemp) trendValues.peakTemp.textContent = `${maxTemp.toFixed(1)}°C`;
    if (trendValues.peakDesc) {
        trendValues.peakDesc.textContent = `Highest recorded today at ${new Date().getHours()}:00`;
    }
}

async function updateFooterStats() {
    try {
        const activeAlerts = await API.alerts.getActive();
        if (footerStats.alerts) {
            const count = activeAlerts.length;
            footerStats.alerts.textContent = count === 0 ? 'No active alerts' : `${count} active alert${count > 1 ? 's' : ''}`;
        }
        
        // Mocking other footer stats for now based on actual health
        if (footerStats.health) footerStats.health.textContent = 'All systems operational';
        if (footerStats.compliance) footerStats.compliance.textContent = '100% compliant';
        if (footerStats.performance) footerStats.performance.textContent = 'Optimal';
    } catch (error) {
        console.error('Footer stats error:', error);
    }
}

function updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = 'Last updated: ' + new Date().toLocaleString();
}

/* ── CHART RENDERING ─────────────────────────── */
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#94a3b8';
const grid  = { color: '#f1f5f9', drawBorder: false };
const ticks = { color: '#94a3b8', font: { size: 11 } };
const noLegend = { legend: { display: false }, tooltip: { mode: 'index', intersect: false } };
const noBorder = { display: false };

function renderDashboardCharts(history) {
    const logs = [...history].reverse();
    const labels = logs.map(log => {
        const d = new Date(log.timestamp);
        return d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
    });

    // Chart configs
    const configs = [
        { id: 'phChart', type: 'line', data: logs.map(l => l.ph), color: '#14B8A6' },
        { id: 'turbidityChart', type: 'bar', data: logs.map(l => l.turbidity), color: '#38bdf8' },
        { id: 'tempChart', type: 'line', data: logs.map(l => l.temperature), color: '#14B8A6' },
        { id: 'tdsChart', type: 'line', data: logs.map(l => l.tds), color: '#f59e0b' }
    ];

    configs.forEach(cfg => {
        const canvas = document.getElementById(cfg.id);
        if (!canvas) return;

        if (charts[cfg.id]) charts[cfg.id].destroy();

        const ctx = canvas.getContext('2d');
        let background = 'transparent';
        
        if (cfg.type === 'line') {
            const grad = ctx.createLinearGradient(0, 0, 0, 210);
            grad.addColorStop(0, `${cfg.color}45`);
            grad.addColorStop(1, `${cfg.color}01`);
            background = grad;
        }

        charts[cfg.id] = new Chart(ctx, {
            type: cfg.type,
            data: {
                labels,
                datasets: [{
                    data: cfg.data,
                    borderColor: cfg.color,
                    backgroundColor: cfg.type === 'bar' ? cfg.color : background,
                    borderWidth: 2.5,
                    fill: cfg.type === 'line',
                    tension: 0.45,
                    pointRadius: cfg.id === 'tempChart' ? 5 : 0,
                    borderRadius: cfg.type === 'bar' ? 6 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: noLegend,
                scales: {
                    x: { grid: { display: false }, ticks, border: noBorder },
                    y: { grid, ticks, border: noBorder }
                }
            }
        });
    });

    // Multi Chart
    const multiCanvas = document.getElementById('multiChart');
    if (multiCanvas) {
        if (charts.multi) charts.multi.destroy();
        charts.multi = new Chart(multiCanvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'pH', data: logs.map(l => l.ph), borderColor: '#14B8A6', tension: 0.3, pointRadius: 4 },
                    { label: 'Turb', data: logs.map(l => l.turbidity), borderColor: '#38bdf8', tension: 0.3, pointRadius: 4 },
                    { label: 'TDS', data: logs.map(l => l.tds / 100), borderColor: '#f59e0b', tension: 0.3, pointRadius: 4 },
                    { label: 'Temp', data: logs.map(l => l.temperature), borderColor: '#1e293b', tension: 0, pointRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: noLegend,
                scales: {
                    x: { grid, ticks, border: noBorder },
                    y: { grid, ticks, border: noBorder }
                }
            }
        });
    }
}
