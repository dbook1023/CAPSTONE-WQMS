/**
 * ALERT MANAGEMENT MODULE
 * Handles fetching, filtering, and resolving alerts via API
 */

// State
let alerts = [];
let currentFilter = 'all';

// DOM Elements
const alertsList = document.getElementById('alertsList');
const searchInput = document.getElementById('searchInput');
const filterTabs = document.querySelectorAll('.tab-btn');
const alertsSummary = document.getElementById('alertsActionSummary');
const alertsFilterBtn = document.getElementById('alertsFilterBtn');
const alertsExportBtn = document.getElementById('alertsExportBtn');
const statValues = {
    active: document.querySelector('.stat-card.teal .stat-value'),
    critical: document.querySelector('.stat-card.red .stat-value'),
    warning: document.querySelector('.stat-card.orange .stat-value')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchAlerts();
    setupEventListeners();
    setInterval(fetchAlerts, 15000);
});

async function fetchAlerts() {
    try {
        const data = await API.alerts.getAll();
        alerts = data;
        renderAlerts();
        updateStats();
    } catch (error) {
        console.error('Failed to fetch alerts:', error);
        showNotification('Failed to load alerts from server', 'error');
    }
}

function setupEventListeners() {
    if (searchInput) {
        searchInput.addEventListener('input', renderAlerts);
    }

    if (alertsFilterBtn) {
        alertsFilterBtn.addEventListener('click', () => {
            currentFilter = 'all';
            filterTabs.forEach(tab => tab.classList.remove('active'));
            const defaultTab = document.querySelector('.tab-btn[data-filter="all"]');
            if (defaultTab) defaultTab.classList.add('active');
            if (searchInput) searchInput.value = '';
            renderAlerts();
        });
    }

    if (alertsExportBtn) {
        alertsExportBtn.addEventListener('click', exportVisibleAlertsCsv);
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderAlerts();
        });
    });
}

function renderAlerts() {
    if (!alertsList) return;

    const filtered = getVisibleAlerts();
    updateActionSummary(filtered);

    if (filtered.length === 0) {
        alertsList.innerHTML = `<div style="text-align:center; padding: 48px; color: #64748b;">No alerts found for this criteria.</div>`;
        return;
    }

    alertsList.innerHTML = filtered.map(a => `
        <div class="alert-card ${getAlertCssClass(a)}" data-status="${(a.status || '').toLowerCase()}">
            <div class="alert-icon-wrap ${getAlertCssClass(a)}">
                ${getAlertIcon(getAlertCategory(a))}
            </div>
            <div class="alert-body">
                <div class="alert-title-row">
                    <span class="alert-id-badge">#${a.id}</span>
                    <span class="alert-title">${a.parameter} Alert</span>
                    <span class="badge ${getAlertCssClass(a)}">${getAlertLabel(a)}</span>
                    ${a.status === 'Resolved' ? `
                        <span class="badge resolved">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Resolved
                        </span>
                    ` : ''}
                </div>
                <div class="alert-desc">${a.message}</div>
                <div class="alert-action">
                    <strong>Recommended action</strong>
                    ${getAlertRecommendation(a)}
                </div>
                <div class="alert-meta">
                    <span><strong>Fountain:</strong> ${a.fountain_name || 'System'}</span>
                    <span><strong>Value:</strong> ${a.value}</span>
                    <span class="meta-time">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${new Date(a.timestamp).toLocaleString()}
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
    `).join('');
}

function getVisibleAlerts() {
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
    const category = getAlertCategory(alert);
    return category === 'safe' ? 'info' : category;
}

function getAlertLabel(alert) {
    const category = getAlertCategory(alert);
    if (category === 'critical') return 'Critical';
    if (category === 'warning') return 'Warning';
    return 'Safe';
}

function updateActionSummary(visibleAlerts) {
    if (!alertsSummary) return;

    if (!visibleAlerts.length) {
        alertsSummary.innerHTML = `
            <h3>No matching alerts</h3>
            <p>Adjust the search or filter tabs to inspect a different alert set.</p>
        `;
        return;
    }

    const criticalCount = visibleAlerts.filter(a => getAlertCategory(a) === 'critical').length;
    const warningCount = visibleAlerts.filter(a => getAlertCategory(a) === 'warning').length;
    const safeCount = visibleAlerts.filter(a => getAlertCategory(a) === 'safe').length;

    const summary = criticalCount > 0
        ? 'Critical alerts need immediate attention before the fountain returns to service.'
        : warningCount > 0
            ? 'Warnings are active. Inspect the affected fountain and retest after corrective action.'
            : 'The current set is informational or safe. Continue routine monitoring and documentation.';

    const topActions = [];
    if (criticalCount > 0) {
        topActions.push('Stop use, notify maintenance, and verify the readings manually.');
    } else if (warningCount > 0) {
        topActions.push('Flush the line, inspect the affected component, and retest soon.');
    } else {
        topActions.push('Archive the alerts and continue standard checks.');
    }

    const highlightAction = visibleAlerts.slice(0, 3).map(alert => {
        const guidance = window.WQMSActionGuidance?.buildAlertRecommendation?.(alert);
        return `<div class="alerts-summary-item"><strong>#${alert.id} · ${alert.parameter}</strong>${guidance ? guidance.headline : 'Review the alert details and follow the maintenance procedure.'}</div>`;
    }).join('');

    alertsSummary.innerHTML = `
        <h3>Action Summary</h3>
        <p>${summary}</p>
        <div class="alerts-summary-list">
            <div class="alerts-summary-item"><strong>Critical</strong>${criticalCount} alert${criticalCount === 1 ? '' : 's'}</div>
            <div class="alerts-summary-item"><strong>Warning</strong>${warningCount} alert${warningCount === 1 ? '' : 's'}</div>
            <div class="alerts-summary-item"><strong>Safe / Info</strong>${safeCount} alert${safeCount === 1 ? '' : 's'}</div>
            <div class="alerts-summary-item"><strong>Next step</strong>${topActions[0]}</div>
        </div>
        ${highlightAction ? `<div class="alerts-summary-list">${highlightAction}</div>` : ''}
    `;
}

function exportVisibleAlertsCsv() {
    const rows = getVisibleAlerts();
    if (!rows.length) {
        showNotification('No alerts available to export for the current filter.', 'warning');
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
    const s = severity?.toLowerCase();
    if (s === 'critical') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    if (s === 'warning') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
}

function updateStats() {
    if (statValues.active) statValues.active.textContent = alerts.filter(a => (a.status || '').toLowerCase() === 'active').length;
    if (statValues.critical) statValues.critical.textContent = alerts.filter(a => getAlertCategory(a) === 'critical' && (a.status || '').toLowerCase() === 'active').length;
    if (statValues.warning) statValues.warning.textContent = alerts.filter(a => getAlertCategory(a) === 'warning' && (a.status || '').toLowerCase() === 'active').length;
}

async function handleResolve(id) {
    try {
        await API.alerts.resolve(id, 'Resolved via Admin Dashboard');
        showNotification('Alert marked as resolved', 'success');
        fetchAlerts();
    } catch (error) {
        showNotification(`Failed to resolve: ${error.message}`, 'error');
    }
}

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type}] ${message}`);
    }
}

window.handleResolve = handleResolve;
