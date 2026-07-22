/**
 * ALERT MANAGEMENT MODULE
 * Handles fetching, filtering, and resolving alerts via API
 */

// State
let alerts = [];
let currentFilter = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchAlerts();
    setupEventListeners();
    setInterval(fetchAlerts, 15000);
});

async function fetchAlerts() {
    try {
        const data = await API.alerts.getAll();
        alerts = Array.isArray(data) ? data : [];
        renderAlerts();
        updateStats();
    } catch (error) {
        console.error('Failed to fetch alerts:', error);
        _notify('Failed to load alerts from server', 'error');
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const alertsFilterBtn = document.getElementById('alertsFilterBtn');
    const alertsExportBtn = document.getElementById('alertsExportBtn');
    const filterTabs = document.querySelectorAll('.tab-btn');

    if (searchInput) {
        searchInput.addEventListener('input', renderAlerts);
    }

    if (alertsFilterBtn) {
        alertsFilterBtn.addEventListener('click', () => {
            currentFilter = 'all';
            document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
            const defaultTab = document.querySelector('.tab-btn[data-filter="all"]');
            if (defaultTab) defaultTab.classList.add('active');
            const si = document.getElementById('searchInput');
            if (si) si.value = '';
            renderAlerts();
        });
    }

    if (alertsExportBtn) {
        alertsExportBtn.addEventListener('click', exportVisibleAlertsCsv);
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderAlerts();
        });
    });
}

function renderAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;

    const filtered = getVisibleAlerts();
    updateActionSummary(filtered);

    if (filtered.length === 0) {
        alertsList.innerHTML = `<div style="text-align:center; padding: 48px; color: #64748b;">No alerts found for this criteria.</div>`;
        return;
    }

    alertsList.innerHTML = filtered.map(a => {
        const esc = (s) => (s !== undefined && s !== null)
            ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            : '';

        return `
        <div class="alert-card ${getAlertCssClass(a)}" data-status="${esc(a.status)}">
            <div class="alert-icon-wrap ${getAlertCssClass(a)}">
                ${getAlertIcon(getAlertCategory(a))}
            </div>
            <div class="alert-body">
                <div class="alert-title-row">
                    <span class="alert-id-badge">#${a.id}</span>
                    <span class="alert-title">${esc(a.parameter)} Alert</span>
                    <span class="badge ${getAlertCssClass(a)}">${getAlertLabel(a)}</span>
                    ${a.status === 'Resolved' ? `
                        <span class="badge resolved">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Resolved
                        </span>
                    ` : ''}
                </div>
                <div class="alert-desc">${esc(a.message)}</div>
                <div class="alert-action">
                    <strong>Recommended action</strong>
                    ${getAlertRecommendation(a)}
                </div>
                <div class="alert-meta">
                    <span><strong>Fountain:</strong> ${esc(a.fountain_name || 'System')}</span>
                    <span><strong>Value:</strong> ${esc(a.value)}</span>
                    <span class="meta-time">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${a.timestamp ? new Date(a.timestamp).toLocaleString() : '--'}
                    </span>
                </div>
            </div>
            <button class="resolve-btn ${a.status === 'Resolved' ? 'resolved-state' : ''}" 
                    ${a.status === 'Resolved' ? 'disabled' : ''} 
                    onclick="handleResolve(${a.id})">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                ${a.status === 'Resolved' ? 'Resolved' : 'Resolve'}
            </button>
        </div>
    `}).join('');
}

function getVisibleAlerts() {
    const searchInput = document.getElementById('searchInput');
    const q = (searchInput?.value || '').trim().toLowerCase();

    return alerts.filter(a => {
        const message = (a.message || '').toLowerCase();
        const fountain = (a.fountain_name || '').toLowerCase();
        const parameter = (a.parameter || '').toLowerCase();
        const severity = getAlertCategory(a);
        const status = (a.status || '').toLowerCase();

        const matchesSearch = !q || message.includes(q) || fountain.includes(q) || parameter.includes(q) || severity.includes(q) || String(a.id).includes(q);

        let matchesFilter = true;
        if (currentFilter === 'active') matchesFilter = status === 'active';
        if (currentFilter === 'resolved') matchesFilter = status === 'resolved';
        if (currentFilter === 'critical') matchesFilter = severity === 'critical';
        if (currentFilter === 'warning') matchesFilter = severity === 'warning';
        if (currentFilter === 'safe') matchesFilter = severity === 'safe';

        return matchesSearch && matchesFilter;
    });
}

function getAlertRecommendation(alert) {
    const guidance = window.WQMSActionGuidance?.buildAlertRecommendation?.(alert);
    if (!guidance) {
        return 'Review the reading, document the finding, and follow the standard maintenance procedure.';
    }

    const actions = guidance.actions.map(action => `<div>• ${action}</div>`).join('');
    return `<div style="margin-bottom: 6px; font-weight: 600; color: ${guidance.severity === 'critical' ? '#dc2626' : guidance.severity === 'warning' ? '#d97706' : '#16a34a'};">${guidance.headline}</div>${actions}`;
}

function getAlertCategory(alert) {
    return window.WQMSActionGuidance?.normalizeAlertSeverity?.(alert?.severity || alert?.severity_category || 'info') || 'safe';
}

function getAlertCssClass(alert) {
    return getAlertCategory(alert);
}

function getAlertLabel(alert) {
    const category = getAlertCategory(alert);
    if (category === 'critical') return 'Critical';
    if (category === 'warning') return 'Warning';
    return 'Safe';
}

function updateActionSummary(visibleAlerts) {
    const alertsSummary = document.getElementById('alertsActionSummary');
    if (!alertsSummary) return;

    if (!visibleAlerts.length) {
        alertsSummary.className = 'action-summary-panel empty-state';
        alertsSummary.innerHTML = `
            <div class="summary-empty-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <span>No matching alerts found for the current search or filter criteria.</span>
            </div>
        `;
        return;
    }

    // Filter active critical & warning alerts for direct action guidance
    const criticalAlerts = visibleAlerts.filter(a => getAlertCategory(a) === 'critical' && (a.status || '').toLowerCase() !== 'resolved');
    const warningAlerts = visibleAlerts.filter(a => getAlertCategory(a) === 'warning' && (a.status || '').toLowerCase() !== 'resolved');
    const activeActionItems = [...criticalAlerts, ...warningAlerts];

    let overallSeverity = 'safe';
    let statusPillText = 'System Optimal';
    let statusSummaryText = 'All monitored parameters are within safe PNSDW guidelines. Continue routine monitoring.';
    let protocolText = 'Maintain standard schedule and log periodic inspection checks.';

    if (criticalAlerts.length > 0) {
        overallSeverity = 'critical';
        statusPillText = 'Action Required';
        statusSummaryText = 'Critical water quality parameters exceeded. Immediate maintenance intervention required.';
        protocolText = 'Stop fountain use immediately, notify technical staff, and verify sensor readings manually.';
    } else if (warningAlerts.length > 0) {
        overallSeverity = 'warning';
        statusPillText = 'Attention Needed';
        statusSummaryText = 'Water quality warning parameters detected. Preventive maintenance recommended.';
        protocolText = 'Flush water lines, inspect physical filtration units, and re-calibrate sensors.';
    }

    alertsSummary.className = `action-summary-panel severity-${overallSeverity}`;

    // Generate priority action items (top 3 active critical/warning alerts)
    const priorityItemsHTML = activeActionItems.slice(0, 3).map(alert => {
        const cat = getAlertCategory(alert);
        const guidance = window.WQMSActionGuidance?.buildAlertRecommendation?.(alert);
        const headline = guidance ? guidance.headline : (alert.message || 'Review sensor reading.');
        const fountain = alert.fountain_name || 'Campus Fountain';

        return `
            <div class="action-item-card ${cat}">
                <div class="action-item-left">
                    <div class="action-item-badge-wrap">
                        <span class="action-id">#${alert.id}</span>
                        <span class="action-param-tag">${alert.parameter || 'Sensor'}</span>
                        <span class="action-severity-pill ${cat}">${cat === 'critical' ? 'Critical' : 'Warning'}</span>
                    </div>
                    <div class="action-location">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                        <strong>${fountain}</strong> &bull; Reading: <span>${alert.value}</span>
                    </div>
                    <div class="action-headline">${headline}</div>
                </div>
                <div class="action-item-right">
                    <button class="action-resolve-btn" onclick="handleResolve(${alert.id})">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span>Resolve</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    alertsSummary.innerHTML = `
        <div class="action-summary-container">
            <!-- TOP HERO BAR -->
            <div class="action-hero-bar">
                <div class="action-hero-info">
                    <div class="action-title-row">
                        <h3 class="action-main-title">Action Summary</h3>
                        <span class="action-status-pill ${overallSeverity}">
                            <span class="pulse-indicator"></span>
                            ${statusPillText}
                        </span>
                    </div>
                    <p class="action-main-desc">${statusSummaryText}</p>
                </div>

                <div class="action-protocol-card ${overallSeverity}">
                    <div class="protocol-header">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>Required Maintenance Protocol</span>
                    </div>
                    <div class="protocol-body">${protocolText}</div>
                </div>
            </div>

            <!-- PRIORITY ACTIONS STREAM -->
            ${activeActionItems.length > 0 ? `
                <div class="action-stream-section">
                    <div class="action-stream-header">
                        <span class="stream-title">Priority Incident Guidance</span>
                        <span class="stream-subtitle">${activeActionItems.length} active alert${activeActionItems.length === 1 ? '' : 's'} requiring intervention</span>
                    </div>
                    <div class="action-items-list">
                        ${priorityItemsHTML}
                    </div>
                </div>
            ` : `
                <div class="action-stream-empty">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span>No active critical or warning incidents. All monitored fountains operating within normal parameters.</span>
                </div>
            `}
        </div>
    `;
}

function getOverallSeverityIcon(severity) {
    if (severity === 'critical') {
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }
    if (severity === 'warning') {
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
}

function exportVisibleAlertsCsv() {
    const rows = getVisibleAlerts();
    if (!rows.length) {
        _notify('No alerts available to export for the current filter.', 'warning');
        return;
    }

    const csvRows = [
        ['ID', 'Fountain', 'Parameter', 'Value', 'Severity', 'Status', 'Message', 'Timestamp'],
        ...rows.map(a => [
            a.id,
            a.fountain_name || 'System',
            a.parameter || '',
            a.value ?? '',
            a.severity || '',
            a.status || '',
            (a.message || '').replace(/\r?\n/g, ' '),
            a.timestamp ? new Date(a.timestamp).toLocaleString() : ''
        ])
    ];

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wqms-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getAlertIcon(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    if (s === 'warning') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
}

function updateStats() {
    const statActive = document.querySelector('.stat-card.teal .stat-value');
    const statCritical = document.querySelector('.stat-card.red .stat-value');
    const statWarning = document.querySelector('.stat-card.orange .stat-value');

    if (statActive) statActive.textContent = alerts.filter(a => (a.status || '').toLowerCase() === 'active').length;
    if (statCritical) statCritical.textContent = alerts.filter(a => getAlertCategory(a) === 'critical' && (a.status || '').toLowerCase() === 'active').length;
    if (statWarning) statWarning.textContent = alerts.filter(a => getAlertCategory(a) === 'warning' && (a.status || '').toLowerCase() === 'active').length;
}

async function handleResolve(id) {
    try {
        await API.alerts.resolve(id, 'Resolved via Admin Dashboard');
        _notify('Alert marked as resolved', 'success');
        await fetchAlerts();
    } catch (error) {
        _notify(`Failed to resolve: ${error.message}`, 'error');
    }
}

/**
 * Internal notification helper — avoids infinite recursion with window.showNotification
 */
function _notify(message, type = 'info') {
    // admin-shared.js sets window.showNotification after it loads
    if (window._adminSharedNotify) {
        window._adminSharedNotify(message, type);
    } else if (typeof window.showNotification === 'function' && window.showNotification !== _notify) {
        window.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

// Expose functions to global window for inline onclick handlers
window.handleResolve = handleResolve;
window.fetchAlerts = fetchAlerts;
