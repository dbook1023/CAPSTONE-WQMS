// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Update last updated time
    updateLastUpdated();
    setInterval(updateLastUpdated, 60000); // Update every minute
    
    // Initialize charts
    initializeCharts();

    // Start Real-time simulation
    startSimulation();
});

// Global state for simulation
let currentData = {
    ph: 7.2,
    turbidity: 2.3,
    temp: 24.5,
    tds: 125
};

function updateLastUpdated() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const dateString = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `${dateString} at ${timeString}`;
    }
}

function startSimulation() {
    setInterval(() => {
        // Fluctuating values within safe ranges
        currentData.ph = +(currentData.ph + (Math.random() - 0.5) * 0.1).toFixed(1);
        currentData.turbidity = +(currentData.turbidity + (Math.random() - 0.5) * 0.2).toFixed(1);
        currentData.temp = +(currentData.temp + (Math.random() - 0.5) * 0.2).toFixed(1);
        currentData.tds = Math.floor(currentData.tds + (Math.random() - 0.5) * 5);

        // Clamping values to sensible ranges
        if (currentData.ph < 6.5) currentData.ph = 6.6;
        if (currentData.ph > 8.5) currentData.ph = 8.4;
        if (currentData.turbidity < 0.5) currentData.turbidity = 1.0;
        if (currentData.turbidity > 4.5) currentData.turbidity = 4.0;
        if (currentData.temp < 20) currentData.temp = 22;
        if (currentData.temp > 30) currentData.temp = 28;
        if (currentData.tds < 50) currentData.tds = 100;
        if (currentData.tds > 400) currentData.tds = 350;

        // Update UI
        updateUIDisplay();
        
        // Refresh charts with updated "last" data point
        initializeCharts();
    }, 5000); // Update every 5 seconds
}

function updateUIDisplay() {
    const phEl = document.getElementById('val-ph');
    const turbEl = document.getElementById('val-ntu');
    const tempEl = document.getElementById('val-temp');
    const tdsEl = document.getElementById('val-tds');

    if (phEl) phEl.textContent = currentData.ph;
    if (turbEl) turbEl.textContent = currentData.turbidity;
    if (tempEl) tempEl.textContent = currentData.temp;
    if (tdsEl) tdsEl.textContent = currentData.tds;
}

function initializeCharts() {
    // Labels for the last 6 data points
    const labels = ['12:00', '14:00', '16:00', '18:00', '20:00', 'Now'];
    
    // Mock historical data + current simulated data
    const phData = [7.1, 7.2, 7.3, 7.2, 7.1, currentData.ph];
    const turbData = [2.1, 2.3, 2.5, 2.4, 2.2, currentData.turbidity];
    const tempData = [23.5, 23.2, 24.1, 25.3, 24.8, currentData.temp];
    const tdsData = [120, 125, 115, 130, 122, currentData.tds];

    // pH Chart
    const phCanvas = document.getElementById('phChart');
    if (phCanvas) {
        drawLineChart(phCanvas, labels, phData, '#14B8A6', 'pH Level');
    }
    
    // Turbidity Chart
    const turbidityCanvas = document.getElementById('turbidityChart');
    if (turbidityCanvas) {
        drawBarChart(turbidityCanvas, labels, turbData, '#38BDF8', 'Turbidity (NTU)');
    }
    
    // Temperature Chart
    const tempCanvas = document.getElementById('temperatureChart');
    if (tempCanvas) {
        drawLineChart(tempCanvas, labels, tempData, '#F59E0B', 'Temperature (°C)');
    }
    
    // TDS Chart
    const tdsCanvas = document.getElementById('tdsChart');
    if (tdsCanvas) {
        drawLineChart(tdsCanvas, labels, tdsData, '#8B5CF6', 'TDS (ppm)');
    }
    
    // Multi-parameter Chart
    const multiCanvas = document.getElementById('multiChart');
    if (multiCanvas) {
        drawMultiLineChart(multiCanvas, labels, [
            { data: phData, color: '#14B8A6', label: 'pH' },
            { data: turbData, color: '#38BDF8', label: 'Turbidity' },
            { data: tempData, color: '#F59E0B', label: 'Temp' },
            { data: tdsData, color: '#8B5CF6', label: 'TDS' }
        ]);
    }
}

function drawLineChart(canvas, labels, data, color, label) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = Math.max(maxValue - minValue, 0.1);
    const scaledMin = minValue - valueRange * 0.2;
    const scaledMax = maxValue + valueRange * 0.2;
    const scaledRange = Math.max(scaledMax - scaledMin, 0.1);
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    
    labels.forEach((label, i) => {
        const x = padding + (chartWidth / (labels.length - 1)) * i;
        ctx.fillText(label, x, height - padding + 20);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = scaledMax - (scaledRange / 5) * i;
        const y = padding + (chartHeight / 5) * i;
        ctx.fillText(value.toFixed(1), padding - 10, y + 5);
    }
    
    // Draw area gradient
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(1, color + '00');
    
    // Draw area
    ctx.beginPath();
    data.forEach((value, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = height - padding - ((value - scaledMin) / scaledRange) * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((value, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = height - padding - ((value - scaledMin) / scaledRange) * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = color;
    data.forEach((value, i) => {
        const x = padding + (chartWidth / (data.length - 1)) * i;
        const y = height - padding - ((value - scaledMin) / scaledRange) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBarChart(canvas, labels, data, color, label) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxValue = Math.max(...data, 1);
    const barWidth = chartWidth / data.length * 0.7;
    const barSpacing = chartWidth / data.length;
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    
    labels.forEach((label, i) => {
        const x = padding + barSpacing * i + barSpacing / 2;
        ctx.fillText(label, x, height - padding + 20);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = maxValue - (maxValue / 5) * i;
        const y = padding + (chartHeight / 5) * i;
        ctx.fillText(value.toFixed(1), padding - 10, y + 5);
    }
    
    // Draw bars
    data.forEach((value, i) => {
        const x = padding + barSpacing * i + (barSpacing - barWidth) / 2;
        const barHeight = (value / maxValue) * chartHeight;
        const y = height - padding - barHeight;
        
        // Rounded rectangle
        ctx.fillStyle = color;
        ctx.beginPath();
        roundRect(ctx, x, y, barWidth, barHeight, 8);
        ctx.fill();
    });
}

function drawMultiLineChart(canvas, labels, datasets) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.clearRect(0, 0, width, height);
    
    // Normalize data
    const normalizedData = datasets.map(dataset => {
        const min = Math.min(...dataset.data);
        const max = Math.max(...dataset.data);
        const range = Math.max(max - min, 0.1);
        return {
            ...dataset,
            normalized: dataset.data.map(v => (v - min) / range)
        };
    });
    
    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    
    labels.forEach((label, i) => {
        const x = padding + (chartWidth / (labels.length - 1)) * i;
        ctx.fillText(label, x, height - padding + 20);
    });
    
    // Draw lines
    normalizedData.forEach(dataset => {
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        dataset.normalized.forEach((value, i) => {
            const x = padding + (chartWidth / (dataset.normalized.length - 1)) * i;
            const y = height - padding - value * chartHeight;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
    });
    
    // Draw legend
    const legendY = padding - 20;
    let legendX = padding;
    datasets.forEach((dataset, i) => {
        ctx.fillStyle = dataset.color;
        ctx.fillRect(legendX, legendY, 20, 3);
        
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(dataset.label, legendX + 25, legendY + 3);
        
        legendX += 80;
    });
}

function roundRect(ctx, x, y, width, height, radius) {
    if (height < 0) return; // Prevent negative heights
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Handle window resize for charts
window.addEventListener('resize', function() {
    initializeCharts();
});
;