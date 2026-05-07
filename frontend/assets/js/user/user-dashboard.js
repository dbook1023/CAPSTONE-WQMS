/* ── LAST UPDATED ───────────────────────────── */
const refreshBtn = document.getElementById('refreshBtn');
const lastUpdated = document.getElementById('lastUpdatedBar');

if (refreshBtn && lastUpdated) {
    refreshBtn.addEventListener('click', () => {
        lastUpdated.textContent = 'Last updated: ' + new Date().toLocaleString();
    });
}

/* ── CHART DEFAULTS ─────────────────────────── */
const labels = ['00:00','04:00','08:00','12:00','16:00','20:00'];
const grid  = { color: '#f1f5f9', drawBorder: false };
const ticks = { color: '#94a3b8', font: { size: 11 } };
const noLegend = { legend: { display: false }, tooltip: { mode: 'index', intersect: false } };
const noBorder = { display: false };

function initDashboardCharts(retries = 0) {
    if (!window.Chart) {
        if (retries < 10) {
            setTimeout(() => initDashboardCharts(retries + 1), 200);
        }
        return;
    }

    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.color       = '#94a3b8';

    const sensorConfigs = [
        { id: 'phChart', label: 'pH Level', data: [7.05, 6.98, 7.18, 7.28, 7.22, 7.2], color: '#14B8A6' },
        { id: 'turbidityChart', label: 'Turbidity (NTU)', data: [1.9, 2.1, 2.5, 2.45, 1.92, 2.1], color: '#38bdf8' },
        { id: 'tempChart', label: 'Temperature (°C)', data: [23.5, 24, 24.5, 24.2, 23.8, 24], color: '#ef4444' },
        { id: 'tdsChart', label: 'TDS (ppm)', data: [120, 125, 130, 128, 124, 125], color: '#f59e0b' }
    ];

    sensorConfigs.forEach(cfg => {
        const canvas = document.getElementById(cfg.id);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 0, 180);
            grad.addColorStop(0, `${cfg.color}25`);
            grad.addColorStop(1, `${cfg.color}01`);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: cfg.label,
                        data: cfg.data,
                        borderColor: cfg.color,
                        backgroundColor: grad,
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.45,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: cfg.color,
                    }]
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
    });
}

// Use a safer initialization timing
if (document.readyState === 'complete') {
    initDashboardCharts();
} else {
    window.addEventListener('load', initDashboardCharts);
}
