/* ── LIVE SEARCH ────────────────────────────── */
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function () {
        const q = this.value.toLowerCase();
        document.querySelectorAll('.fountain-card').forEach(card => {
            const name     = (card.dataset.name     || '').toLowerCase();
            const location = (card.dataset.location || '').toLowerCase();
            const id       = (card.dataset.id       || '').toLowerCase();
            card.style.display = (name.includes(q) || location.includes(q) || id.includes(q)) ? '' : 'none';
        });
    });
}

/* ── REFRESH ACTION ─────────────────────────── */
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        const originalContent = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<span>Refreshing...</span>';
        setTimeout(() => {
            refreshBtn.innerHTML = originalContent;
        }, 1000);
    });
}

/* ── LIVE CHARTS ────────────────────────────── */
function initMonitoringCharts() {
    if (!window.Chart) {
        console.error('Chart.js not found.');
        return;
    }

    const labels = ['12:00', '12:05', '12:10', '12:15', '12:20', '12:25'];
    const grid  = { color: '#f1f5f9', drawBorder: false };
    const ticks = { color: '#94a3b8', font: { size: 10 } };

    const activeCharts = {};
    let isReading = false;
    let readingInterval = null;

    const sensorConfigs = [
        { 
            id: 'phChart', 
            label: 'pH Level', 
            data: [7.2, 7.18, 7.22, 7.21, 7.19, 7.2], 
            color: '#14B8A6',
            min: 6.8, max: 7.6, step: 0.05
        },
        { 
            id: 'turbidityChart', 
            label: 'Turbidity (NTU)', 
            data: [2.1, 2.3, 2.2, 2.4, 2.3, 2.3], 
            color: '#38bdf8',
            min: 1.5, max: 3.5, step: 0.2
        },
        { 
            id: 'tempChart', 
            label: 'Temperature (°C)', 
            data: [24, 24.2, 24.1, 23.9, 24, 24.1], 
            color: '#ef4444',
            min: 22, max: 28, step: 0.3
        },
        { 
            id: 'tdsChart', 
            label: 'TDS (ppm)', 
            data: [125, 128, 126, 127, 125, 126], 
            color: '#f59e0b',
            min: 110, max: 150, step: 2
        }
    ];

    sensorConfigs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (el) {
            try {
                const ctx = el.getContext('2d');
                const grad = ctx.createLinearGradient(0, 0, 0, 180);
                grad.addColorStop(0, `${cfg.color}35`);
                grad.addColorStop(1, `${cfg.color}00`);

                activeCharts[cfg.id] = new Chart(el, {
                    type: 'line',
                    data: {
                        labels: [...labels],
                        datasets: [{
                            label: cfg.label,
                            data: [...cfg.data],
                            borderColor: cfg.color,
                            backgroundColor: grad,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.45,
                            pointRadius: 0,
                            pointHoverRadius: 6,
                            pointHoverBackgroundColor: cfg.color,
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                padding: 12,
                                titleFont: { size: 12, weight: '600' },
                                bodyFont: { size: 13 },
                                cornerRadius: 8,
                                displayColors: false
                            }
                        },
                        scales: {
                            x: { grid, ticks },
                            y: { grid, ticks }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        animation: {
                            duration: 1000,
                            easing: 'easeInOutQuart'
                        }
                    }
                });
            } catch (err) {
                console.error(`Error initializing ${cfg.id}:`, err);
            }
        }
    });

    // Toggle Button Logic
    const startBtn = document.getElementById('startReadingBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            isReading = !isReading;
            
            if (isReading) {
                startReading(startBtn);
            } else {
                stopReading(startBtn);
            }
        });
    }

    function startReading(btn) {
        btn.classList.add('btn-danger');
        btn.classList.remove('btn-primary');
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            <span>Stop Reading</span>
        `;

        readingInterval = setInterval(() => {
            const now = new Date();
            const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            sensorConfigs.forEach(cfg => {
                const chart = activeCharts[cfg.id];
                if (chart) {
                    chart.data.labels.push(timeLabel);
                    
                    const lastVal = chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1];
                    const change = (Math.random() - 0.5) * cfg.step * 2;
                    let newVal = parseFloat((lastVal + change).toFixed(2));
                    
                    if (newVal < cfg.min) newVal = cfg.min;
                    if (newVal > cfg.max) newVal = cfg.max;

                    chart.data.datasets[0].data.push(newVal);

                    if (chart.data.labels.length > 12) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }

                    chart.update('none');
                    updateCardValues(cfg.id, newVal);
                }
            });
        }, 2000);
    }

    function stopReading(btn) {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Start Reading</span>
        `;

        if (readingInterval) {
            clearInterval(readingInterval);
            readingInterval = null;
        }
    }
}

function updateCardValues(chartId, value) {
    const metricMap = {
        'phChart': 'pH Level',
        'turbidityChart': 'Turbidity',
        'tempChart': 'Temp',
        'tdsChart': 'TDS'
    };

    const metricLabel = metricMap[chartId];
    if (!metricLabel) return;

    document.querySelectorAll('.fountain-card').forEach(card => {
        const metrics = card.querySelectorAll('.fc-metric');
        metrics.forEach(metric => {
            const label = metric.querySelector('.fc-metric-label');
            const valueEl = metric.querySelector('.fc-metric-value');
            
            if (label && label.textContent.includes(metricLabel)) {
                if (valueEl) {
                    let displayVal = value;
                    if (metricLabel === 'Turbidity') displayVal += ' NTU';
                    if (metricLabel === 'Temp') displayVal += '°C';
                    if (metricLabel === 'TDS') displayVal += ' ppm';
                    valueEl.textContent = displayVal;
                }
            }
        });
    });
}

// Use a safer initialization timing
if (document.readyState === 'complete') {
    initMonitoringCharts();
} else {
    window.addEventListener('load', initMonitoringCharts);
}