/**
 * REPORTS & ANALYTICS MODULE
 * Handles report generation and data visualization
 */

// Initialize
let globalReports = [];

function formatPhilippineDateTime(value, options = {}) {
    const date = parseBackendDate(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        ...options
    }).format(date);
}

function parseBackendDate(value) {
    if (value instanceof Date) {
        return value;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
        const isIsoLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed);

        if (isIsoLocal && !hasTimezone) {
            return new Date(`${trimmed}Z`);
        }

        return new Date(trimmed);
    }

    return new Date(value);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchReportStats();
});

async function fetchReportStats() {
    try {
        const reports = await API.reports.getAll();
        globalReports = reports;
        
        // Update Stats
        const stats = document.querySelectorAll('.stat-val');
        if (stats.length >= 4) {
            const compliantReports = reports.filter(r => r.overall_status === 'PASS').length;
            const complianceRate = reports.length > 0 ? Math.round((compliantReports / reports.length) * 100) : 0;
            const totalDataPoints = reports.reduce((acc, r) => acc + (r.readings_count || 0), 0);
            
            stats[0].textContent = reports.length.toString(); // Total Reports
            stats[1].textContent = `${complianceRate}%`; // Compliance Rate
            stats[2].textContent = totalDataPoints.toString(); // Data Points
            
            if (reports.length > 0) {
                const latestDate = parseBackendDate(reports[0].created_at);
                stats[3].textContent = formatPhilippineDateTime(latestDate, { month: 'short', day: 'numeric' });
            } else {
                stats[3].textContent = '--';
            }
        }

        // Render Reports List
        const recentSection = document.getElementById('reportsList');
        if (recentSection) {
            // Keep the header
            const headerHTML = `<div class="recent-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0;">Recent Reports</h3>
                <button class="btn btn-ghost" onclick="openArchivedReportsModal()" style="font-size: 12px; padding: 6px 12px; display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    View Archived
                </button>
            </div>`;
            
            if (reports.length === 0) {
                recentSection.innerHTML = headerHTML + `
                    <div style="text-align: center; padding: 48px; color: #64748b;">
                        No reports generated yet. Use the Live Monitoring page to generate compliance reports.
                    </div>`;
                return;
            }
            
            const rowsHTML = reports.map(r => {
                const date = parseBackendDate(r.created_at);
                const createdAt = formatPhilippineDateTime(date, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                const isPass = r.overall_status === 'PASS';
                const isWarning = r.overall_status === 'WARNING';
                const statusColor = isPass ? '#14b8a6' : isWarning ? '#d97706' : '#dc2626';
                const statusBg = isPass ? 'rgba(20,184,166,0.1)' : isWarning ? 'rgba(217,119,6,0.1)' : 'rgba(220,38,38,0.1)';
                
                return `
                <div class="report-row" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #e2e8f0; background: white; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1 1 200px;">
                        <div style="width: 40px; height: 40px; border-radius: 8px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                        </div>
                        <div style="min-width: 0;">
                            <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Compliance Report #${r.id}: ${r.fountain_name}</h4>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Generated by ${r.generated_by_name || 'Admin'} • ${r.readings_count} Samples</p>
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 500; color: #64748b;">${createdAt}</span>
                        <button onclick="viewReport(${r.id})" style="background: none; border: none; cursor: pointer; color: #3b82f6; transition: color 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px;" onmouseover="this.style.background='rgba(59, 130, 246, 0.1)'" onmouseout="this.style.background='none'" title="View Report">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                        <div class="premium-dl-container">
                            <label class="dl-btn-label">
                                <input type="checkbox" class="input" onchange="triggerReportDownload(${r.id}, this)" />
                                <span class="circle">
                                    <svg class="icon arrow" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19V5m0 14-4-4m4 4 4-4"></path>
                                    </svg>
                                    <div class="square"></div>
                                    <svg class="icon check" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </span>
                                <p class="title">Download</p>
                                <p class="title">Saved</p>
                            </label>
                        </div>
                        <button onclick="triggerReportArchive(${r.id})" style="background: none; border: none; cursor: pointer; color: #94a3b8; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'" title="Archive Report">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
            
            recentSection.innerHTML = headerHTML + rowsHTML;
        }
    } catch (error) {
        console.error('Failed to fetch reports:', error);
    }
}

let reportToArchive = null;

window.triggerReportArchive = function(reportId) {
    reportToArchive = reportId;
    openModal('confirmArchiveModal');
}

document.getElementById('confirmArchiveBtn').addEventListener('click', async () => {
    if (!reportToArchive) return;
    
    closeModal('confirmArchiveModal');
    
    try {
        await API.reports.archive(reportToArchive);
        showStatusModal('Success', 'Report archived successfully', 'success');
        fetchReportStats();
    } catch (error) {
        console.error('Failed to archive report:', error);
        showStatusModal('Error', 'Failed to archive report', 'error');
    } finally {
        reportToArchive = null;
    }
});

// Modal Helpers
window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

window.showStatusModal = function(title, message, type) {
    document.getElementById('statusModalTitle').textContent = title;
    document.getElementById('statusModalMessage').textContent = message;
    
    const iconContainer = document.getElementById('statusModalIcon');
    if (type === 'success') {
        iconContainer.innerHTML = `<div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(20, 184, 166, 0.1); color: #14b8a6; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>`;
    } else {
        iconContainer.innerHTML = `<div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: #ef4444; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        </div>`;
    }
    
    openModal('statusModal');
}

window.openArchivedReportsModal = async function() {
    openModal('archivedReportsModal');
    const container = document.getElementById('archivedReportsList');
    container.innerHTML = `<div style="text-align: center; padding: 24px; color: #64748b;">Loading archived reports...</div>`;
    
    try {
        const allReports = await API.reports.getAll(true);
        const archivedReports = allReports.filter(r => r.is_archived);
        
        if (archivedReports.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 24px; color: #64748b;">No archived reports found.</div>`;
            return;
        }
        
        container.innerHTML = archivedReports.map(r => {
            const date = formatPhilippineDateTime(r.created_at, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; flex-wrap: wrap; gap: 8px;">
                <div style="flex: 1 1 180px; min-width: 0;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 500; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.fountain_name}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Generated: ${date} • ${r.readings_count} Samples</p>
                </div>
                <button onclick="unarchiveReport(${r.id})" class="btn btn-ghost" style="padding: 6px 12px; font-size: 12px; color: #3b82f6; flex-shrink: 0;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;"><path d="M21 8v13H3V8"></path><polyline points="1 3 23 3 23 8 1 8 1 3"></polyline><path d="M10 12l2-2 2 2"></path><path d="M12 10v6"></path></svg>
                    Unarchive
                </button>
            </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to load archived reports:', error);
        container.innerHTML = `<div style="text-align: center; padding: 24px; color: #ef4444;">Failed to load archived reports.</div>`;
    }
}

window.unarchiveReport = async function(reportId) {
    try {
        // Send the unarchive request (set is_archived: false)
        await API.request(`/reports/${reportId}/archive`, {
            method: 'PATCH',
            body: JSON.stringify({ is_archived: false })
        });
        showStatusModal('Success', 'Report unarchived successfully', 'success');
        // Refresh both lists
        fetchReportStats();
        openArchivedReportsModal();
    } catch (error) {
        console.error('Failed to unarchive report:', error);
        showStatusModal('Error', 'Failed to unarchive report', 'error');
    }
}

function getCertificateHTML(report) {
    const formatVal = (val, decimals) => (val !== null && val !== undefined && !Number.isNaN(Number(val))) ? Number(val).toFixed(decimals) : '--';

    const avgPhRaw = report.ph_avg;
    const avgTurbRaw = report.turbidity_avg;
    const avgTempRaw = report.temperature_avg;
    const avgTdsRaw = report.tds_avg;
    
    const avgPh = formatVal(avgPhRaw, 2);
    const avgTurb = formatVal(avgTurbRaw, 1);
    const avgTemp = formatVal(avgTempRaw, 1);
    const hasTds = avgTdsRaw !== null && avgTdsRaw !== undefined && !Number.isNaN(Number(avgTdsRaw));
    const avgTdsText = hasTds ? Number(avgTdsRaw).toFixed(0) : 'N/A';

    // Match the dashboard color bands: ideal = teal, warning = amber, critical = red
    // Treat pH up to 9.0 as WARNING (not CRITICAL)
    const phStatus = avgPhRaw >= 6.5 && avgPhRaw <= 8.5 ? 'IDEAL' : ((avgPhRaw >= 6.35 && avgPhRaw < 6.5) || (avgPhRaw > 8.5 && avgPhRaw <= 9.0) ? 'WARNING' : 'CRITICAL');
    const turbStatus = avgTurbRaw >= 0.0 && avgTurbRaw <= 5.0 ? 'IDEAL' : (avgTurbRaw > 5.0 && avgTurbRaw <= 5.5 ? 'WARNING' : 'CRITICAL');
    const tempStatus = avgTempRaw >= 15.0 && avgTempRaw <= 30.0 ? 'IDEAL' : (((avgTempRaw >= 13.5 && avgTempRaw < 15.0) || (avgTempRaw > 30.0 && avgTempRaw <= 33.0)) ? 'WARNING' : 'CRITICAL');
    const tdsStatus = hasTds ? (avgTdsRaw >= 0.0 && avgTdsRaw <= 500.0 ? 'IDEAL' : (avgTdsRaw > 500.0 && avgTdsRaw <= 550.0 ? 'WARNING' : 'CRITICAL')) : 'MISSING';

    const isPhSafe = phStatus !== 'CRITICAL';
    const isTurbSafe = turbStatus !== 'CRITICAL';
    const isTempSafe = tempStatus !== 'CRITICAL';
    const isTdsSafe = tdsStatus !== 'CRITICAL' && tdsStatus !== 'MISSING';
    const isTurbIdeal = turbStatus === 'IDEAL';
    const isTempIdeal = tempStatus === 'IDEAL';
    const isTdsIdeal = tdsStatus === 'IDEAL';

    // Color helper: green=safe, orange=warning, red=fail
    const phColor = phStatus === 'IDEAL' ? '#14b8a6' : (phStatus === 'WARNING' ? '#d97706' : '#dc2626');
    const turbColor = turbStatus === 'IDEAL' ? '#14b8a6' : (turbStatus === 'WARNING' ? '#d97706' : '#dc2626');
    const tempColor = tempStatus === 'IDEAL' ? '#14b8a6' : (tempStatus === 'WARNING' ? '#d97706' : '#dc2626');
    const tdsColor = !hasTds ? '#64748b' : (tdsStatus === 'IDEAL' ? '#14b8a6' : (tdsStatus === 'WARNING' ? '#d97706' : '#dc2626'));

    const hasCritical = phStatus === 'CRITICAL' || turbStatus === 'CRITICAL' || tempStatus === 'CRITICAL' || tdsStatus === 'CRITICAL';
    const hasWarning = phStatus === 'WARNING' || turbStatus === 'WARNING' || tempStatus === 'WARNING' || tdsStatus === 'WARNING';
    const overallCompliance = hasCritical ? 'NON-COMPLIANT (CRITICAL)' : (hasWarning ? 'COMPLIANT WITH WARNINGS' : 'COMPLIANT (PASS)');
    const overallColor = hasCritical ? '#dc2626' : (hasWarning ? '#d97706' : '#14b8a6');
    const actionPlan = window.WQMSActionGuidance?.buildReportActionPlan?.({
        ph: avgPhRaw,
        turbidity: avgTurbRaw,
        temperature: avgTempRaw,
        tds: avgTdsRaw
    });

    return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700&display=swap');
            .certificate-container {
                border: 4px double #cbd5e1;
                padding: 28px 30px;
                border-radius: 12px;
                background: #ffffff;
                font-family: 'Inter', sans-serif;
                color: #1e293b;
                box-sizing: border-box;
                width: 100%;
                max-width: 850px;
                flex-shrink: 0;
                overflow-x: auto;
            }
            @media (max-width: 640px) {
                .certificate-container {
                    padding: 16px 12px;
                    border-width: 2px;
                }
                .meta-grid {
                    grid-template-columns: 1fr;
                }
                .cert-table th, .cert-table td {
                    padding: 6px;
                    font-size: 9px;
                }
                .header h1 {
                    font-size: 14px;
                }
                .compliance-banner {
                    font-size: 12px;
                    padding: 8px;
                }
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 16px;
                margin-bottom: 20px;
            }
            .header h1 {
                font-family: 'Poppins', sans-serif;
                font-size: 18px;
                font-weight: 700;
                color: #0f172a;
                margin: 0 0 4px 0;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }
            .header p {
                font-size: 10px;
                color: #64748b;
                margin: 0;
                font-weight: 600;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }
            .meta-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
                background: #f8fafc;
                padding: 16px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            }
            .meta-item {
                display: flex;
                flex-direction: column;
            }
            .meta-label {
                font-size: 9px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 2px;
            }
            .meta-value {
                font-size: 12px;
                font-weight: 600;
                color: #0f172a;
            }
            .compliance-banner {
                background: ${overallColor}10;
                border: 1.5px solid ${overallColor};
                color: ${overallColor};
                padding: 12px;
                border-radius: 8px;
                text-align: center;
                font-size: 15px;
                font-weight: 800;
                letter-spacing: 0.05em;
                margin-bottom: 20px;
                text-transform: uppercase;
            }
            .section-title {
                font-family: 'Poppins', sans-serif;
                font-size: 13px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .cert-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                background: transparent;
            }
            .cert-table th {
                background: #f1f5f9;
                color: #475569;
                font-weight: 700;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                text-align: left;
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
            }
            .cert-table td {
                padding: 8px 10px;
                font-size: 11px;
                border: 1px solid #e2e8f0;
                color: #1e293b;
                text-align: left;
            }
            .action-plan {
                margin-bottom: 20px;
                border: 1.5px solid #cbd5e1;
                border-radius: 10px;
                background: #f8fafc;
                padding: 14px;
            }
            .action-plan-title {
                font-family: 'Poppins', sans-serif;
                font-size: 12px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            .action-plan-headline {
                font-size: 12px;
                font-weight: 700;
                margin-bottom: 10px;
            }
            .action-plan-list {
                display: grid;
                gap: 8px;
            }
            .action-plan-item {
                background: white;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px 12px;
                font-size: 11px;
                line-height: 1.45;
                color: #334155;
            }
            .status-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
            }
            .status-pass {
                background: rgba(20, 184, 166, 0.1);
                color: #14b8a6;
            }
            .status-warn {
                background: rgba(217, 119, 6, 0.1);
                color: #d97706;
            }
            .status-fail {
                background: rgba(220, 38, 38, 0.1);
                color: #dc2626;
            }
            .footer {
                margin-top: 24px;
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #64748b;
                border-top: 1px solid #e2e8f0;
                padding-top: 16px;
            }
            .signature-line {
                width: 180px;
                border-top: 1.5px solid #94a3b8;
                margin-top: 24px;
                text-align: center;
                padding-top: 6px;
                font-weight: 600;
            }
        </style>
        <div class="certificate-container">
            <div class="header">
                <div style="margin-bottom: 16px;">
                    <div style="font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase;">Our Lady of Fatima University - Antipolo Campus</div>
                    <div style="font-size: 10px; color: #64748b;">Km. 23 Sumulong Highway, Brgy. Sta. Cruz, Antipolo City, Rizal</div>
                </div>
                <h1>Water Quality Compliance Certificate</h1>
                <p>AquaMonitor WQMS Real-time Certification Platform</p>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <span class="meta-label">Facility Selected</span>
                    <span class="meta-value">${report.fountain_name} (ID: ${report.fountain_id})</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Fountain Location</span>
                    <span class="meta-value">${report.location}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Certification Date</span>
                    <span class="meta-value">${formatPhilippineDateTime(report.created_at, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true
                    })}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Samples Logged</span>
                    <span class="meta-value">${report.readings_count} Official Telemetry Snapshots</span>
                </div>
            </div>

            <div class="compliance-banner">
                Overall Safety Class: ${overallCompliance}
            </div>

            ${actionPlan ? `
                <div class="action-plan">
                    <div class="action-plan-title">Recommended Action Plan</div>
                    <div class="action-plan-headline" style="color: ${actionPlan.severity === 'critical' ? '#dc2626' : actionPlan.severity === 'warning' ? '#d97706' : '#14b8a6'};">${actionPlan.headline}</div>
                    <div class="action-plan-list">
                        ${actionPlan.actions.map(action => `<div class="action-plan-item">${action}</div>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="section-title">Telemetry Parameter Analytics</div>
            <table class="cert-table">
                <thead>
                    <tr>
                        <th>Parameter</th>
                        <th>Calculated Average</th>
                        <th>Standard Range (DOH)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="font-weight: 600;">pH Level</td>
                        <td style="font-weight: 700; color: ${phColor};">${avgPh}</td>
                        <td>6.5 - 8.5 pH</td>
                        <td><span class="status-badge ${phStatus === 'CRITICAL' ? 'status-fail' : (phStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${phStatus === 'CRITICAL' ? 'FAIL' : (phStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">Turbidity</td>
                        <td style="font-weight: 700; color: ${turbColor};">${avgTurb} NTU</td>
                        <td>0.0 - 5.0 NTU</td>
                        <td><span class="status-badge ${turbStatus === 'CRITICAL' ? 'status-fail' : (turbStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${turbStatus === 'CRITICAL' ? 'FAIL' : (turbStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">Temperature</td>
                        <td style="font-weight: 700; color: ${tempColor};">${avgTemp}&deg;C</td>
                        <td>15.0 - 30.0&deg;C</td>
                        <td><span class="status-badge ${tempStatus === 'CRITICAL' ? 'status-fail' : (tempStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${tempStatus === 'CRITICAL' ? 'FAIL' : (tempStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                    </tr>
                    <tr>
                        <td style="font-weight: 600;">TDS</td>
                        <td style="font-weight: 700; color: ${tdsColor};">${avgTdsText}${hasTds ? ' ppm' : ''}</td>
                        <td>0.0 - 500.0 ppm</td>
                        <td><span class="status-badge ${!hasTds ? 'status-fail' : (tdsStatus === 'CRITICAL' ? 'status-fail' : (tdsStatus === 'WARNING' ? 'status-warn' : 'status-pass'))}">${!hasTds ? 'N/A' : (tdsStatus === 'CRITICAL' ? 'FAIL' : (tdsStatus === 'WARNING' ? 'WARNING' : 'PASS'))}</span></td>
                    </tr>
                </tbody>
            </table>

            <div style="font-size: 10px; color: #64748b; line-height: 1.6; margin-bottom: 20px; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px;">
                <strong>Compliance Note:</strong> This certificate guarantees that the drinking water fountain was continuously analyzed under the WQMS automated sensor telemetry stream. Parameter criteria references the DOH Philippine National Standards for Drinking Water (PNSDW) Administrative Order No. 2017-0010.
            </div>

            <div class="footer">
                <div>
                    <strong>Platform ID:</strong> WQMS-CERT-${report.id}-${Date.now().toString().slice(-6)}<br>
                    Generated Autonomously by AquaMonitor WQMS
                </div>
                <div class="signature-line">
                    Authorized WQMS Signature
                </div>
            </div>
        </div>
    `;
}

window.triggerReportDownload = async function(reportId, checkbox) {
    if (!checkbox.checked) return;
    
    const report = globalReports.find(r => r.id === reportId);
    if (!report) return;

    try {
        if (typeof showNotification === 'function') {
            showNotification(`Preparing official compliance certificate for ${report.fountain_name}...`, 'info');
        }

        // Create temporary off-screen container for PDF rendering
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '0';
        tempDiv.style.top = '0';
        tempDiv.style.width = '850px';
        tempDiv.style.zIndex = '-99999';
        tempDiv.style.opacity = '0.01';
        tempDiv.style.pointerEvents = 'none';

        tempDiv.innerHTML = getCertificateHTML(report);
        document.body.appendChild(tempDiv);
        const container = tempDiv.querySelector('.certificate-container');
        const width = container.offsetWidth || 850;
        const height = container.offsetHeight || 1100;

        const opt = {
            margin:       0,
            filename:     `WQMS-Certificate-${report.fountain_name.replace(/\s+/g, '_')}-${Date.now().toString().slice(-6)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2.5, useCORS: true, logging: false, scrollY: 0 },
            jsPDF:        { unit: 'px', format: [width, height], orientation: 'portrait' }
        };

        html2pdf().set(opt).from(tempDiv.querySelector('.certificate-container')).save().then(() => {
            document.body.removeChild(tempDiv);
            if (typeof showNotification === 'function') {
                showNotification('Compliance PDF downloaded successfully!', 'success');
            }
            const sessionStr = localStorage.getItem('aqua_monitor_admin_session');
            let adminId = null;
            if (sessionStr) {
                try {
                    const session = JSON.parse(sessionStr);
                    const parsedId = Number(session?.id);
                    if (Number.isFinite(parsedId) && parsedId > 0) {
                        adminId = parsedId;
                    }
                } catch (e) {
                    console.warn('Failed to parse admin session for download log', e);
                }
            }
            API.reports.logDownload(report.id, adminId ? { admin_id: adminId } : {}).catch(err => {
                console.warn('Failed to log report download:', err);
            });
        }).catch(err => {
            console.error("PDF generation failed:", err);
            document.body.removeChild(tempDiv);
            if (typeof showNotification === 'function') {
                showNotification('Failed to save PDF.', 'error');
            }
        });

        // Reset checkbox checkmark
        setTimeout(() => {
            checkbox.checked = false;
        }, 1500);
    } catch (error) {
        console.error('Failed to generate compliance report:', error);
        checkbox.checked = false;
    }
};

window.viewReport = function(reportId) {
    const report = globalReports.find(r => r.id === reportId);
    if (!report) return;
    
    const contentDiv = document.getElementById('viewReportContent');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = getCertificateHTML(report);
    openModal('viewReportModal');
}
