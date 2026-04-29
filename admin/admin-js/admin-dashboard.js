/* ── LAST UPDATED ───────────────────────────── */
document.getElementById('refreshBtn').addEventListener('click', () => {
    document.getElementById('lastUpdated').textContent =
        'Last updated: ' + new Date().toLocaleString();
});

/* ── CHART DEFAULTS ─────────────────────────── */
const labels = ['00:00','04:00','08:00','12:00','16:00','20:00'];
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#94a3b8';
const grid  = { color: '#f1f5f9', drawBorder: false };
const ticks = { color: '#94a3b8', font: { size: 11 } };
const noLegend = { legend: { display: false }, tooltip: { mode: 'index', intersect: false } };
const noBorder = { display: false };

/* ── pH LEVEL TREND (area line) ─────────────── */
const phCtx = document.getElementById('phChart').getContext('2d');
const phGrad = phCtx.createLinearGradient(0, 0, 0, 210);
phGrad.addColorStop(0, 'rgba(20,184,166,0.28)');
phGrad.addColorStop(1, 'rgba(20,184,166,0.01)');
new Chart(phCtx, {
    type: 'line',
    data: {
        labels,
        datasets: [{
            data: [7.05, 6.98, 7.18, 7.28, 7.22, 7.2],
            borderColor: '#14B8A6',
            backgroundColor: phGrad,
            borderWidth: 2.5, fill: true, tension: 0.45,
            pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: '#14B8A6',
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: noLegend,
        scales: {
            x: { grid, ticks, border: noBorder },
            y: { grid, ticks, border: noBorder, min: 6.5, max: 8,
                 ticks: { ...ticks, stepSize: 0.4 } }
        }
    }
});

/* ── TURBIDITY LEVELS (bar) ─────────────────── */
new Chart(document.getElementById('turbidityChart'), {
    type: 'bar',
    data: {
        labels,
        datasets: [{
            data: [1.9, 2.1, 2.5, 2.45, 1.92, 2.1],
            backgroundColor: '#38bdf8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.52,
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: noLegend,
        scales: {
            x: { grid: { display: false }, ticks, border: noBorder },
            y: { grid, ticks, border: noBorder, min: 0, max: 2.6,
                 ticks: { ...ticks, stepSize: 0.65 } }
        }
    }
});

/* ── TEMPERATURE MONITORING (dotted line) ───── */
new Chart(document.getElementById('tempChart'), {
    type: 'line',
    data: {
        labels,
        datasets: [{
            data: [23.2, 23.5, 24.0, 25.1, 24.7, 24.2],
            borderColor: '#14B8A6',
            backgroundColor: 'transparent',
            borderWidth: 2.5, tension: 0.35,
            pointRadius: 5,
            pointBackgroundColor: '#14B8A6',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 7,
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: noLegend,
        scales: {
            x: { grid, ticks, border: noBorder },
            y: { grid, ticks, border: noBorder, min: 20, max: 30,
                 ticks: { ...ticks, stepSize: 3 } }
        }
    }
});

/* ── TDS LEVELS TREND (area line) ────────────── */
const tdsCtx = document.getElementById('tdsChart').getContext('2d');
const tdsGrad = tdsCtx.createLinearGradient(0, 0, 0, 210);
tdsGrad.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
tdsGrad.addColorStop(1, 'rgba(245, 158, 11, 0.01)');
new Chart(tdsCtx, {
    type: 'line',
    data: {
        labels,
        datasets: [{
            data: [120, 125, 130, 128, 122, 125],
            borderColor: '#f59e0b',
            backgroundColor: tdsGrad,
            borderWidth: 2.5, fill: true, tension: 0.45,
            pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: '#f59e0b',
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: noLegend,
        scales: {
            x: { grid, ticks, border: noBorder },
            y: { grid, ticks, border: noBorder, min: 0, max: 200,
                 ticks: { ...ticks, stepSize: 50 } }
        }
    }
});

/* ── MULTI-PARAMETER OVERVIEW ───────────────── */
new Chart(document.getElementById('multiChart'), {
    type: 'line',
    data: {
        labels,
        datasets: [
            {
                label: 'pH',
                data: [7.1, 7.0, 7.2, 7.3, 7.25, 7.2],
                borderColor: '#14B8A6', backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.3,
                pointRadius: 4, pointBackgroundColor: '#fff',
                pointBorderColor: '#14B8A6', pointBorderWidth: 2,
            },
            {
                label: 'turbidity',
                data: [1.9, 2.1, 2.5, 2.4, 1.9, 2.1],
                borderColor: '#38bdf8', backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.3,
                pointRadius: 4, pointBackgroundColor: '#fff',
                pointBorderColor: '#38bdf8', pointBorderWidth: 2,
            },
            {
                label: 'tds',
                data: [12, 12.5, 13, 12.8, 12.2, 12.5], // scaled for visibility
                borderColor: '#f59e0b', backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.3,
                pointRadius: 4, pointBackgroundColor: '#fff',
                pointBorderColor: '#f59e0b', pointBorderWidth: 2,
            },
            {
                label: 'temp',
                data: [7, 7, 7, 7, 7, 7],
                borderColor: '#1e293b', backgroundColor: 'transparent',
                borderWidth: 2, tension: 0,
                pointRadius: 4, pointBackgroundColor: '#fff',
                pointBorderColor: '#1e293b', pointBorderWidth: 2,
            }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: noLegend,
        scales: {
            x: { grid, ticks, border: noBorder },
            y: { grid, ticks, border: noBorder, min: 0, max: 28,
                 ticks: { ...ticks, stepSize: 7 } }
        }
    }
});