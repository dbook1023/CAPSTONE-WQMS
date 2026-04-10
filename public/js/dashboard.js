// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Update last updated time
    updateLastUpdated();
    setInterval(updateLastUpdated, 60000); // Update every minute
    
    // Mobile menu
    setupMobileMenu();
    
    // Initialize charts
    initializeCharts();
});

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

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    mobileMenuBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        
        if (this.classList.contains('active')) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '4rem';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.backgroundColor = 'white';
            navLinks.style.padding = '1rem';
            navLinks.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            navLinks.style.zIndex = '999';
        } else {
            navLinks.style.display = 'none';
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-content')) {
            mobileMenuBtn.classList.remove('active');
            if (window.innerWidth < 768) {
                navLinks.style.display = 'none';
            }
        }
    });
    
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'row';
            navLinks.style.position = 'static';
            navLinks.style.padding = '0';
            navLinks.style.boxShadow = 'none';
        } else {
            if (!mobileMenuBtn.classList.contains('active')) {
                navLinks.style.display = 'none';
            }
        }
    });
}

function initializeCharts() {
    // pH Chart
    const phCanvas = document.getElementById('phChart');
    if (phCanvas) {
        drawLineChart(phCanvas, 
            ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            [7.1, 7.2, 7.3, 7.2, 7.1, 7.2],
            '#14B8A6',
            'pH Level'
        );
    }
    
    // Turbidity Chart
    const turbidityCanvas = document.getElementById('turbidityChart');
    if (turbidityCanvas) {
        drawBarChart(turbidityCanvas,
            ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            [2.1, 2.3, 2.5, 2.4, 2.2, 2.3],
            '#38BDF8',
            'Turbidity (NTU)'
        );
    }
    
    // Temperature Chart
    const tempCanvas = document.getElementById('temperatureChart');
    if (tempCanvas) {
        drawLineChart(tempCanvas,
            ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
            [23.5, 23.2, 24.1, 25.3, 24.8, 24.0],
            '#14B8A6',
            'Temperature (°C)'
        );
    }
    
    // Multi-parameter Chart
    const multiCanvas = document.getElementById('multiChart');
    if (multiCanvas) {
        drawMultiLineChart(multiCanvas);
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
    const valueRange = maxValue - minValue;
    const scaledMin = minValue - valueRange * 0.2;
    const scaledMax = maxValue + valueRange * 0.2;
    const scaledRange = scaledMax - scaledMin;
    
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
    gradient.addColorStop(0, color + '80');
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
    
    const maxValue = Math.max(...data);
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

function drawMultiLineChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
    const datasets = [
        { data: [7.1, 7.2, 7.3, 7.2, 7.1, 7.2], color: '#14B8A6', label: 'pH' },
        { data: [2.1, 2.3, 2.5, 2.4, 2.2, 2.3], color: '#38BDF8', label: 'Turbidity' },
        { data: [23.5, 23.2, 24.1, 25.3, 24.8, 24.0], color: '#0F172A', label: 'Temp' }
    ];
    
    ctx.clearRect(0, 0, width, height);
    
    // Normalize data
    const normalizedData = datasets.map(dataset => {
        const min = Math.min(...dataset.data);
        const max = Math.max(...dataset.data);
        const range = max - min;
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
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
}

// Handle window resize for charts
window.addEventListener('resize', function() {
    initializeCharts();
});