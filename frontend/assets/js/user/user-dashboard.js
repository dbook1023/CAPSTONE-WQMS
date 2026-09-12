/**
 * USER DASHBOARD MODULE
 * Handles personal monitoring data, multi-fountain scope switching,
 * and real-time telemetry visualization across campus drinking fountains.
 */

// State
let charts = {};
let availableFountains = [];
let selectedFountainIndex = 0; // Starts at 0 (First Fountain). Last index (N) is All Fountains (Average)
let latestReadingsList = [];
let userHasSwitched = false; // Flag to track if user manually cycled fountain scope

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
    if (refreshBtn) {
        refreshBtn.addEventListener('click', cycleFountainScope);
    }
});

async function fetchDashboardData() {
    try {
        // Fetch registered fountains list and latest sensor telemetry
        const [fountainsRes, latestRes] = await Promise.allSettled([
            API.fountains.getAll(),
            API.sensors.getLatest()
        ]);

        let dbFountains = [];
        if (fountainsRes.status === 'fulfilled') {
            const val = fountainsRes.value;
            if (Array.isArray(val)) {
                dbFountains = val;
            } else if (val && Array.isArray(val.fountains)) {
                dbFountains = val.fountains;
            } else if (val && Array.isArray(val.data)) {
                dbFountains = val.data;
            }
        } else {
            console.warn('API.fountains.getAll() was rejected:', fountainsRes.reason);
        }

        latestReadingsList = latestRes.status === 'fulfilled' && Array.isArray(latestRes.value) ? latestRes.value : [];

        // Build comprehensive map of all database fountains + active telemetry sources
        const fountainMap = new Map();

        dbFountains.forEach(f => {
            if (f && f.id !== undefined && f.id !== null) {
                fountainMap.set(String(f.id), {
                    id: f.id,
                    name: f.name || f.displayId || f.display_id || `Fountain #${f.id}`
                });
            }
        });

        latestReadingsList.forEach(r => {
            if (r && r.fountain_id !== undefined && r.fountain_id !== null && !fountainMap.has(String(r.fountain_id))) {
                fountainMap.set(String(r.fountain_id), {
                    id: r.fountain_id,
                    name: r.fountain_name || `Fountain #${r.fountain_id}`
                });
            }
        });

        availableFountains = Array.from(fountainMap.values());
        availableFountains.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

        // Default Selection: If user has NOT manually switched yet, select the first fountain with active readings
        if (!userHasSwitched && availableFountains.length > 0) {
            const activeIndex = availableFountains.findIndex(f => {
                const reading = latestReadingsList.find(r => String(r.fountain_id) === String(f.id));
                return reading && (reading.ph !== null || reading.turbidity !== null || reading.temperature !== null || reading.tds !== null);
            });

            if (activeIndex !== -1) {
                selectedFountainIndex = activeIndex;
            } else {
                selectedFountainIndex = 0;
            }
        } else if (availableFountains.length > 0 && selectedFountainIndex >= availableFountains.length) {
            // Keep index bounded to available fountains
            selectedFountainIndex = 0;
        }

        await renderCurrentScope();
    } catch (error) {
        console.error('User Dashboard data fetch error:', error);
    }
}

function cycleFountainScope() {
    if (availableFountains.length === 0) {
        fetchDashboardData();
        return;
    }

    userHasSwitched = true;
    selectedFountainIndex++;
    // Sequence: 0..N-1 (cycles strictly through registered database fountains)
    if (selectedFountainIndex >= availableFountains.length) {
        selectedFountainIndex = 0;
    }

    renderCurrentScope();
}

window.cycleFountainScope = cycleFountainScope;

async function renderCurrentScope() {
    const headerTitle = document.querySelector('.header-title');
    const refreshBtnText = document.getElementById('refreshBtnText');
    const lastUpdated = document.getElementById('lastUpdatedBar');

    const totalFountains = availableFountains.length;

    if (totalFountains === 0) {
        if (headerTitle) headerTitle.innerHTML = `Monitoring: <span style="color: #14B8A6;">No Fountains Available</span>`;
        if (refreshBtnText) refreshBtnText.textContent = `Viewing: None`;
        setEmptyState('No current readings from any campus fountains.');
        return;
    }

    // --- INDIVIDUAL FOUNTAIN VIEW ---
    const fountain = availableFountains[selectedFountainIndex] || availableFountains[0];
    const fountainName = fountain ? (fountain.name || `Fountain #${fountain.id}`) : 'Selected Fountain';

    if (headerTitle) {
        headerTitle.innerHTML = `Monitoring: <span style="color: #14B8A6;">${fountainName}</span>`;
    }
    if (refreshBtnText) {
        refreshBtnText.textContent = `Viewing: ${fountainName}`;
    }

    const fountainData = fountain ? latestReadingsList.find(r => String(r.fountain_id) === String(fountain.id)) : null;

    if (!fountainData || (fountainData.ph === null && fountainData.turbidity === null && fountainData.temperature === null && fountainData.tds === null)) {
        updateMetrics({ ph: null, turbidity: null, temperature: null, tds: null, fountain_name: fountainName });
        renderDashboardCharts([]);
        updateTrendInsights([], fountainName);
        if (lastUpdated) {
            lastUpdated.textContent = `Viewing ${fountainName} • No current readings from this fountain`;
        }
        return;
    }

    updateMetrics(fountainData);

    try {
        const history = await API.sensors.getHistory(fountain.id, 10);
        if (history && Array.isArray(history) && history.length > 0) {
            renderDashboardCharts(history);
            updateTrendInsights(history, fountainName);
        } else {
            renderDashboardCharts([]);
            updateTrendInsights([], fountainName);
        }
        if (lastUpdated) {
            lastUpdated.textContent = `Viewing ${fountainName} • Last updated: ${new Date().toLocaleTimeString()}`;
        }
    } catch (err) {
        renderDashboardCharts([]);
        updateTrendInsights([], fountainName);
        if (lastUpdated) {
            lastUpdated.textContent = `Viewing ${fountainName} • Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }
}

function calculateMean(array, key) {
    if (!array || array.length === 0) return null;
    const valid = array
        .map(item => parseFloat(item[key]))
        .filter(val => !Number.isNaN(val) && val !== null && val !== undefined);
    if (valid.length === 0) return null;
    return valid.reduce((sum, val) => sum + val, 0) / valid.length;
}

function buildAveragedHistory(historiesList) {
    if (historiesList.length === 0) return [];
    
    const maxLen = Math.max(...historiesList.map(h => h.length));
    const averagedHistory = [];

    for (let i = 0; i < maxLen; i++) {
        const sliceAtI = historiesList.map(h => h[i]).filter(Boolean);
        if (sliceAtI.length === 0) continue;

        const avgPh = calculateMean(sliceAtI, 'ph');
        const avgTurb = calculateMean(sliceAtI, 'turbidity');
        const avgTemp = calculateMean(sliceAtI, 'temperature');
        const avgTds = calculateMean(sliceAtI, 'tds');
        const timestamp = sliceAtI[0].timestamp || new Date().toISOString();

        averagedHistory.push({
            ph: avgPh,
            turbidity: avgTurb,
            temperature: avgTemp,
            tds: avgTds,
            timestamp
        });
    }

    return averagedHistory;
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

    if (sPh) sPh.textContent = phSafe === null ? 'No current readings' : (phSafe ? 'Within safe limits' : 'Out of range');
    if (sTurb) sTurb.textContent = turbSafe === null ? 'No current readings' : (turbSafe ? 'Excellent clarity' : 'Turbid / Needs check');
    if (sTemp) sTemp.textContent = tempSafe === null ? 'No current readings' : (tempSafe ? 'Optimal' : 'Needs adjustment');
    if (sTds) sTds.textContent = tdsSafe === null ? 'No current readings' : (tdsSafe ? 'Excellent purity' : 'High mineral content');
}

function updateBadge(card, value, min, max) {
    if (!card) return null;
    const badge = card.querySelector('.safe-badge');
    const valText = card.querySelector('.metric-value');
    const trendEl = card.querySelector('.metric-trend');
    const labelText = card.querySelector('.metric-label');
    const unitTexts = card.querySelectorAll('.metric-unit');

    if (value === null || value === undefined || Number.isNaN(parseFloat(value))) {
        card.style.transition = 'all 0.4s ease';
        card.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
        card.style.borderColor = '#1e293b';
        [valText, labelText, ...unitTexts].forEach(el => { if (el) el.style.color = 'white'; });

        if (badge) {
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> No Readings`;
        }
        if (trendEl) {
            trendEl.innerHTML = `
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                <span style="font-weight: 500; margin-left: 4px;">No current readings from this fountain</span>
            `;
            trendEl.style.color = 'rgba(255, 255, 255, 0.85)';
        }
        return null;
    }

    const val = parseFloat(value);
    const isSafe = val >= min && val <= max;
    const isWarning = (val >= min - (min * 0.1) && val < min) || (val > max && val <= max + (max * 0.1));
    const isUnsafe = val < min - (min * 0.1) || val > max + (max * 0.1);

    let status = 'safe';
    if (isUnsafe) status = 'unsafe';
    else if (isWarning) status = 'warning';

    if (badge) {
        card.style.transition = 'all 0.4s ease';
        [valText, labelText, ...unitTexts].forEach(el => { if (el) el.style.color = 'white'; });

        if (status === 'safe') {
            card.style.background = '#14b8a6';
            card.style.borderColor = '#0d9488';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Safe`;
        } else if (status === 'warning') {
            card.style.background = '#f59e0b';
            card.style.borderColor = '#d97706';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Warning`;
        } else {
            card.style.background = '#dc2626';
            card.style.borderColor = '#b91c1c';
            badge.style.background = 'rgba(255,255,255,0.2)';
            badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Unsafe`;
        }
    }

    if (trendEl && valText) {
        let paramName = '';
        const idVal = valText.id || '';
        if (idVal.includes('ph')) paramName = 'ph';
        else if (idVal.includes('turbidity')) paramName = 'turb';
        else if (idVal.includes('temp')) paramName = 'temp';
        else if (idVal.includes('tds')) paramName = 'tds';

        let finding = 'Normal';
        if (paramName === 'ph') {
            if (val < 6.5) finding = 'Acidic (Danger)';
            else if (val > 8.5) finding = 'Alkaline (Danger)';
            else if (val < 6.8) finding = 'Mildly Acidic';
            else if (val > 7.6) finding = 'Mildly Alkaline';
            else finding = 'Optimal pH (Safe)';
        } else if (paramName === 'turb') {
            if (val > 5.0) finding = 'Turbid (Danger)';
            else if (val > 3.5) finding = 'Cloudy (Warning)';
            else finding = 'Clear (Safe)';
        } else if (paramName === 'temp') {
            if (val < 19.8) finding = 'Overcooled Chiller';
            else if (val > 30.8) finding = 'Overheated';
            else if (val < 22.0) finding = 'Cool (Safe)';
            else if (val > 28.0) finding = 'Warm (Safe)';
            else finding = 'Optimal Temp (Safe)';
        } else if (paramName === 'tds') {
            if (val > 500) finding = 'Contaminated (Danger)';
            else if (val > 150) finding = 'Elevated Minerals';
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

function updateTrendInsights(history, fountainName = '') {
    if (trendInsights.period) {
        trendInsights.period.textContent = `Real-time analytics for ${fountainName || 'Current Session'}`;
    }

    if (!history || history.length === 0 || !history[0] || history[0].ph === null) {
        if (trendInsights.status) trendInsights.status.textContent = 'No Readings';
        if (trendInsights.statusDesc) trendInsights.statusDesc.textContent = `No current readings from ${fountainName || 'this fountain'}.`;
        if (trendInsights.purity) trendInsights.purity.textContent = 'N/A';
        if (trendInsights.purityDesc) trendInsights.purityDesc.textContent = `No current readings from ${fountainName || 'this fountain'}.`;
        if (trendInsights.health) trendInsights.health.textContent = 'N/A';
        if (trendInsights.healthDesc) trendInsights.healthDesc.textContent = `No current readings from ${fountainName || 'this fountain'}.`;
        return;
    }

    const latest = history[0];

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

function setEmptyState(msg = 'No sensor data found.') {
    Object.values(metricValues).forEach(el => { if (el) el.textContent = '--'; });
    
    if (trendInsights.status) trendInsights.status.textContent = 'No Readings';
    if (trendInsights.statusDesc) trendInsights.statusDesc.textContent = msg;
    if (trendInsights.purity) trendInsights.purity.textContent = 'N/A';
    if (trendInsights.purityDesc) trendInsights.purityDesc.textContent = msg;
    if (trendInsights.health) trendInsights.health.textContent = 'N/A';
    if (trendInsights.healthDesc) trendInsights.healthDesc.textContent = msg;
    if (trendInsights.period) trendInsights.period.textContent = 'No active session';

    const lastUpdated = document.getElementById('lastUpdatedBar');
    if (lastUpdated) lastUpdated.textContent = msg;
}

function renderDashboardCharts(history) {
    if (!window.Chart) return;
    const logs = [...(history || [])].reverse();
    const labels = logs.map(log => {
        if (!log.timestamp) return '--';
        const d = new Date(log.timestamp);
        return Number.isNaN(d.getTime()) ? '--' : d.getHours() + ":" + String(d.getMinutes()).padStart(2, '0');
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
            if (charts[cfg.id]) {
                charts[cfg.id].destroy();
                charts[cfg.id] = null;
            }
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

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
