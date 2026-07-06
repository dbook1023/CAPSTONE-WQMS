/**
 * REPORTS & ANALYTICS MODULE
 * Handles report generation and data visualization
 */

// Initialize
let globalReports = [];
let activeReports = [];

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
    setupFiltersAndGenerate();
    populateFountainsDropdown();
});

async function fetchReportStats() {
    try {
        const reports = await API.reports.getAll();
        globalReports = reports;
        activeReports = reports;
        
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
        renderReportsList(reports, 1);

    } catch (error) {
        console.error('Failed to fetch reports:', error);
    }
}

let currentPage = 1;
const itemsPerPage = 10;

window.goToReportPage = function(page) {
    if (page >= 1) {
        renderReportsList(activeReports, page);
    }
};

function renderReportsList(reports, page = 1) {
    const recentSection = document.getElementById('reportsList');
    if (!recentSection) return;
    
    currentPage = page;
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
        updateTableInfo(0, 0, 0);
        renderPagination(0, 1);
        return;
    }
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, reports.length);
    const paginatedData = reports.slice(startIndex, endIndex);

    updateTableInfo(startIndex + 1, endIndex, reports.length);
    
    const rowsHTML = paginatedData.map(r => {
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
        renderPagination(reports.length, page);
}

function updateTableInfo(start, end, total) {
    const info = document.querySelector('.table-info');
    if (info) {
        if (total === 0) {
            info.innerHTML = `Showing <span>0</span> to <span>0</span> of <span>0</span> reports`;
        } else {
            info.innerHTML = `Showing <span>${start}</span> to <span>${end}</span> of <span>${total}</span> reports`;
        }
    }
}

function renderPagination(totalItems, page) {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    let html = '';

    html += `<button class="pg-btn ${page === 1 ? 'disabled' : ''}" onclick="window.goToReportPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
             </button>`;

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pg-btn ${i === page ? 'active' : ''}" onclick="window.goToReportPage(${i})">${i}</button>`;
    }

    html += `<button class="pg-btn ${page === totalPages ? 'disabled' : ''}" onclick="window.goToReportPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
             </button>`;

    paginationContainer.innerHTML = html;
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
        const height = (container.offsetHeight || 1100) + 12;

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

let allFountains = [];

async function populateFountainsDropdown() {
    try {
        const fountains = await API.fountains.getAll();
        allFountains = fountains;
        const select = document.getElementById('reportFountainSelect');
        if (select) {
            select.innerHTML = '<option value="all">All Campus Fountains</option>' + 
                fountains.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        }
    } catch (e) {
        console.error('Failed to populate fountains list:', e);
    }
}

window.openGenerateReportModal = function(range) {
    const rangeSelect = document.getElementById('reportRangeSelect');
    if (rangeSelect) {
        rangeSelect.value = range;
    }
    openModal('generateReportModal');
};

function setupFiltersAndGenerate() {
    // FILTER BTN TOGGLE
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');
    const filterBar = document.getElementById('filterBar');
    if (toggleFilterBtn && filterBar) {
        toggleFilterBtn.addEventListener('click', () => {
            if (filterBar.style.display === 'none') {
                filterBar.style.display = 'block';
            } else {
                filterBar.style.display = 'none';
            }
        });
    }

    // APPLY FILTERS
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', () => {
            const query = (document.getElementById('filterSearchInput')?.value || '').trim().toLowerCase();
            const status = document.getElementById('filterStatusSelect')?.value || 'all';
            const startDateStr = document.getElementById('filterStartDate')?.value;
            const endDateStr = document.getElementById('filterEndDate')?.value;

            let filtered = globalReports;

            if (query) {
                filtered = filtered.filter(r => 
                    (r.fountain_name || '').toLowerCase().includes(query) ||
                    (r.generated_by_name || '').toLowerCase().includes(query) ||
                    String(r.id).includes(query) ||
                    (r.location || '').toLowerCase().includes(query)
                );
            }

            if (status !== 'all') {
                filtered = filtered.filter(r => r.overall_status === status);
            }

            if (startDateStr) {
                const start = new Date(startDateStr);
                start.setHours(0, 0, 0, 0);
                filtered = filtered.filter(r => parseBackendDate(r.created_at) >= start);
            }

            if (endDateStr) {
                const end = new Date(endDateStr);
                end.setHours(23, 59, 59, 999);
                filtered = filtered.filter(r => parseBackendDate(r.created_at) <= end);
            }

            activeReports = filtered;
            renderReportsList(activeReports, 1);
        });
    }

    // CLEAR FILTERS
    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (document.getElementById('filterSearchInput')) document.getElementById('filterSearchInput').value = '';
            if (document.getElementById('filterStatusSelect')) document.getElementById('filterStatusSelect').value = 'all';
            if (document.getElementById('filterStartDate')) document.getElementById('filterStartDate').value = '';
            if (document.getElementById('filterEndDate')) document.getElementById('filterEndDate').value = '';
            
            activeReports = globalReports;
            renderReportsList(activeReports, 1);
        });
    }

    // SUBMIT GENERATE REPORT
    const btnSubmitGenerateReport = document.getElementById('btnSubmitGenerateReport');
    if (btnSubmitGenerateReport) {
        btnSubmitGenerateReport.addEventListener('click', async () => {
            const range = document.getElementById('reportRangeSelect').value;
            const fountainVal = document.getElementById('reportFountainSelect').value;
            const format = document.querySelector('input[name="reportFormat"]:checked').value;
            
            closeModal('generateReportModal');
            
            if (typeof window.showNotification === 'function') {
                window.showNotification(`Generating and processing your ${range} report...`, 'info');
            }
            
            try {
                let url = `/reports/summary?range=${range}`;
                if (fountainVal !== 'all') {
                    url += `&fountain_id=${fountainVal}`;
                }
                
                const response = await API.request(url);
                const data = response.data || response;
                
                if (!data || data.length === 0) {
                    showStatusModal('No Data', 'No telemetry readings found for the selected range and parameters.', 'error');
                    return;
                }
                
                if (format === 'pdf') {
                    generateSummaryPdf(data, range, fountainVal);
                } else {
                    generateSummaryCsv(data, range, fountainVal);
                }
            } catch (err) {
                console.error('Failed to generate summary report:', err);
                showStatusModal('Error', 'Failed to generate summary report: ' + err.message, 'error');
            }
        });
    }
}

function generateSummaryPdf(data, range, fountainVal) {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '0';
    tempDiv.style.top = '0';
    tempDiv.style.width = '680px';
    tempDiv.style.zIndex = '-99999';
    tempDiv.style.opacity = '0.01';
    tempDiv.style.pointerEvents = 'none';

    const rangeLabel = range.charAt(0).toUpperCase() + range.slice(1);
    const scopeLabel = fountainVal === 'all' ? 'All Campus Fountains' : (data[0]?.fountain_name || 'Selected Fountain');

    // Calculate Summary Stats
    const totalFountains = data.length;
    const totalSamples = data.reduce((acc, d) => acc + (d.readings_count || 0), 0);
    const compliantCount = data.filter(d => d.overall_status === 'PASS').length;
    const complianceRate = totalFountains > 0 ? Math.round((compliantCount / totalFountains) * 100) : 0;
    const overallStatusText = data.some(d => d.overall_status === 'FAIL') ? 'NON-COMPLIANT' : (data.some(d => d.overall_status === 'WARNING') ? 'COMPLIANT WITH WARNINGS' : 'COMPLIANT (PASS)');
    const overallColor = overallStatusText === 'NON-COMPLIANT' ? '#dc2626' : (overallStatusText === 'COMPLIANT WITH WARNINGS' ? '#d97706' : '#14b8a6');

    function getParamTrend(trend, isNegativeBad = true) {
        if (!trend || trend.delta === undefined || trend.delta === null || Math.abs(trend.delta) < 0.01) return '';
        const arrow = trend.direction === 'up' ? '▲' : '▼';
        let color = '#64748b'; // default neutral
        if (isNegativeBad) {
            color = trend.direction === 'up' ? '#ef4444' : '#10b981';
        } else {
            color = '#3b82f6';
        }
        return `<span style="color: ${color}; font-size: 8px; margin-left: 2px; font-weight: bold;">${arrow}</span>`;
    }

    let rowsHTML = data.map(d => {
        const phVal = d.ph_avg !== null ? Number(d.ph_avg).toFixed(2) : '--';
        const turbVal = d.turbidity_avg !== null ? Number(d.turbidity_avg).toFixed(1) : '--';
        const tempVal = d.temperature_avg !== null ? Number(d.temperature_avg).toFixed(1) : '--';
        const tdsVal = d.tds_avg !== null ? Number(d.tds_avg).toFixed(0) : '--';

        const phStatus = d.ph_avg >= 6.5 && d.ph_avg <= 8.5 ? 'IDEAL' : ((d.ph_avg >= 6.35 && d.ph_avg < 6.5) || (d.ph_avg > 8.5 && d.ph_avg <= 9.0) ? 'WARNING' : 'CRITICAL');
        const turbStatus = d.turbidity_avg >= 0.0 && d.turbidity_avg <= 5.0 ? 'IDEAL' : (d.turbidity_avg > 5.0 && d.turbidity_avg <= 5.5 ? 'WARNING' : 'CRITICAL');
        const tempStatus = d.temperature_avg >= 15.0 && d.temperature_avg <= 30.0 ? 'IDEAL' : (((d.temperature_avg >= 13.5 && d.temperature_avg < 15.0) || (d.temperature_avg > 30.0 && d.temperature_avg <= 33.0)) ? 'WARNING' : 'CRITICAL');
        const tdsStatus = d.tds_avg !== null ? (d.tds_avg >= 0.0 && d.tds_avg <= 500.0 ? 'IDEAL' : (d.tds_avg > 500.0 && d.tds_avg <= 550.0 ? 'WARNING' : 'CRITICAL')) : 'N/A';

        const statusLabel = d.overall_status === 'FAIL' ? 'FAIL' : (d.overall_status === 'WARNING' ? 'WARNING' : 'PASS');
        const statusColor = d.overall_status === 'FAIL' ? '#dc2626' : (d.overall_status === 'WARNING' ? '#d97706' : '#14b8a6');
        const statusBg = d.overall_status === 'FAIL' ? 'rgba(220,38,38,0.1)' : (d.overall_status === 'WARNING' ? 'rgba(217,119,6,0.1)' : 'rgba(20,184,166,0.1)');

        const phTrendStr = getParamTrend(d.trend?.ph, false);
        const turbTrendStr = getParamTrend(d.trend?.turbidity, true);
        const tempTrendStr = getParamTrend(d.trend?.temperature, false);
        const tdsTrendStr = getParamTrend(d.trend?.tds, true);

        return `
            <tr>
                <td style="padding: 6px 8px; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1;">${d.fountain_name}<br><small style="color: #64748b; font-weight: normal; font-size: 8px;">${d.location || ''}</small></td>
                <td style="padding: 6px 4px; text-align: center; font-size: 10px; border: 1px solid #cbd5e1;">${d.readings_count}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1; color: ${phStatus === 'CRITICAL' ? '#dc2626' : phStatus === 'WARNING' ? '#d97706' : '#1e293b'}">${phVal}${phTrendStr}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1; color: ${turbStatus === 'CRITICAL' ? '#dc2626' : turbStatus === 'WARNING' ? '#d97706' : '#1e293b'}">${turbVal}${turbTrendStr}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1; color: ${tempStatus === 'CRITICAL' ? '#dc2626' : tempStatus === 'WARNING' ? '#d97706' : '#1e293b'}">${tempVal}°C${tempTrendStr}</td>
                <td style="padding: 6px 4px; text-align: center; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1; color: ${tdsStatus === 'CRITICAL' ? '#dc2626' : tdsStatus === 'WARNING' ? '#d97706' : '#1e293b'}">${tdsVal}${tdsTrendStr}</td>
                <td style="padding: 6px 4px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">${statusLabel}</span>
                </td>
            </tr>
        `;
    }).join('');

    // Generate Trend Insights and Suggestions
    let trendInsights = [];
    let recommendations = [];

    data.forEach(d => {
        const trendInfo = d.trend || {};
        const phT = trendInfo.ph || {};
        const turbT = trendInfo.turbidity || {};
        const tdsT = trendInfo.tds || {};
        
        let fountainInsights = [];
        
        if (phT.direction === 'down' && Math.abs(phT.delta) > 0.1) {
            fountainInsights.push(`pH levels decreased by ${Math.abs(phT.delta).toFixed(2)} units (becoming more acidic)`);
        } else if (phT.direction === 'up' && Math.abs(phT.delta) > 0.1) {
            fountainInsights.push(`pH levels increased by ${phT.delta.toFixed(2)} units`);
        }
        
        if (turbT.direction === 'up' && Math.abs(turbT.delta) > 0.1) {
            fountainInsights.push(`turbidity rose by ${turbT.delta.toFixed(2)} NTU (increased haziness)`);
        } else if (turbT.direction === 'down' && Math.abs(turbT.delta) > 0.1) {
            fountainInsights.push(`turbidity dropped by ${Math.abs(turbT.delta).toFixed(2)} NTU (clarity improved)`);
        }
        
        if (tdsT.direction === 'up' && Math.abs(tdsT.delta) > 5) {
            fountainInsights.push(`dissolved solids (TDS) grew by ${tdsT.delta.toFixed(0)} ppm`);
        } else if (tdsT.direction === 'down' && Math.abs(tdsT.delta) > 5) {
            fountainInsights.push(`dissolved solids (TDS) declined by ${Math.abs(tdsT.delta).toFixed(0)} ppm`);
        }
        
        if (fountainInsights.length > 0) {
            trendInsights.push(`<strong>${d.fountain_name}:</strong> ${fountainInsights.join(', ')} over the target timeframe.`);
        }

        // Recommendations
        if (d.overall_status === 'FAIL') {
            let recs = [];
            if (d.ph_avg < 6.5 || d.ph_avg > 8.5) recs.push("calibrate the pH electrode and replenish the alkaline neutralization media");
            if (d.turbidity_avg > 5.0) recs.push("immediately replace the sediment and carbon pre-filters to restore turbidity < 5 NTU");
            if (d.tds_avg > 500.0) recs.push("verify RO system performance, rinse mineral scale build-up, and clean TDS probes");
            if (d.temperature_avg > 30.0) recs.push("inspect water chiller operation and check pipeline insulation");
            if (recs.length === 0) recs.push("conduct a full system flush and sanitize the reservoir");
            recommendations.push(`<strong>${d.fountain_name} (CRITICAL ACTION):</strong> ${recs.join(', and ')}.`);
        } else if (d.overall_status === 'WARNING') {
            recommendations.push(`<strong>${d.fountain_name} (PREVENTATIVE):</strong> Parameter variance detected. Schedule a routine filter cleaning and recalibrate sensors within 48 hours.`);
        } else {
            recommendations.push(`<strong>${d.fountain_name} (OPTIMAL):</strong> Stable. Maintain standard preventive maintenance schedule (cleaning and calibration).`);
        }
    });

    if (trendInsights.length === 0) {
        trendInsights.push("All monitored metrics (pH, Turbidity, TDS, Temp) remain stable with no significant changes from the previous period.");
    }

    const trendInsightsHTML = trendInsights.map(ins => `<li style="margin-bottom: 4px; line-height: 1.3;">${ins}</li>`).join('');
    const recommendationsHTML = recommendations.map(rec => `<li style="margin-bottom: 5px; line-height: 1.3;">${rec}</li>`).join('');

    const htmlContent = `
        <div class="summary-pdf-root" style="border: 2px solid #94a3b8; padding: 24px; border-radius: 10px; background: white; font-family: 'Inter', Arial, sans-serif; color: #1e293b; width: 680px; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 2px;">Our Lady of Fatima University - Antipolo Campus</div>
                <div style="font-size: 9px; color: #64748b; margin-bottom: 6px;">Km. 23 Sumulong Highway, Brgy. Sta. Cruz, Antipolo City, Rizal</div>
                <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin: 6px 0 0 0;">Water Quality Operations Summary</div>
                <div style="font-size: 10px; color: #475569; margin: 3px 0 0 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${rangeLabel} Performance Audit Certificate</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                <tr>
                    <td style="padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; width: 50%;">
                        <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Scope of Audit</div>
                        <div style="font-size: 10px; font-weight: 600; color: #0f172a;">${scopeLabel}</div>
                    </td>
                    <td style="padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e8f0; width: 50%;">
                        <div style="font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">Audit Date</div>
                        <div style="font-size: 10px; font-weight: 600; color: #0f172a;">${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}</div>
                    </td>
                </tr>
            </table>

            <div style="border: 1px solid ${overallColor}; background: ${overallColor}10; color: ${overallColor}; padding: 8px; border-radius: 6px; text-align: center; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 14px; letter-spacing: 0.04em;">
                Overall Campus Water Safety: ${overallStatusText} (${complianceRate}%)
            </div>

            <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">Facility Telemetry Analytics</div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
                <thead>
                    <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 8px; font-weight: 700; color: #475569;">
                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">Fountain</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">N</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">pH</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">NTU</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">Temp</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">TDS</th>
                        <th style="padding: 6px 4px; border: 1px solid #cbd5e1; text-align: center;">Result</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; background: #f8fafc; border: 1px solid #cbd5e1;">
                <tr><td colspan="4" style="padding: 6px 8px 3px; font-family: 'Poppins', Arial, sans-serif; font-size: 9px; font-weight: 700; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Summary Statistics</td></tr>
                <tr style="text-align: center;">
                    <td style="padding: 6px 4px;"><div style="color: #64748b; font-size: 8px; text-transform: uppercase; font-weight: 600;">Total Fountains</div><div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">${totalFountains}</div></td>
                    <td style="padding: 6px 4px;"><div style="color: #64748b; font-size: 8px; text-transform: uppercase; font-weight: 600;">Logged Samples</div><div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px;">${totalSamples}</div></td>
                    <td style="padding: 6px 4px;"><div style="color: #64748b; font-size: 8px; text-transform: uppercase; font-weight: 600;">Compliant Units</div><div style="font-size: 12px; font-weight: 700; color: #16a34a; margin-top: 2px;">${compliantCount}</div></td>
                    <td style="padding: 6px 4px;"><div style="color: #64748b; font-size: 8px; text-transform: uppercase; font-weight: 600;">Compliance Rate</div><div style="font-size: 12px; font-weight: 700; color: ${overallColor}; margin-top: 2px;">${complianceRate}%</div></td>
                </tr>
            </table>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
                <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 9px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">
                    Trend Analysis & System Insights
                </div>
                <ul style="margin: 0; padding-left: 14px; font-size: 8px; color: #475569;">
                    ${trendInsightsHTML}
                </ul>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 12px;">
                <div style="font-family: 'Poppins', Arial, sans-serif; font-size: 9px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">
                    Suggestions & Operational Recommendations
                </div>
                <ul style="margin: 0; padding-left: 14px; font-size: 8px; color: #475569;">
                    ${recommendationsHTML}
                </ul>
            </div>

            <div style="font-size: 8px; color: #64748b; line-height: 1.4; margin-bottom: 14px; border: 1px dashed #cbd5e1; padding: 6px; border-radius: 4px;">
                <strong>Compliance Note:</strong> This operations summary report aggregates water quality measurements logged autonomously from active sensor streams. Reference values comply with the DOH Philippine National Standards for Drinking Water (PNSDW) Administrative Order No. 2017-0010.
            </div>

            <table style="width: 100%; font-size: 8px; color: #64748b; border-top: 1px solid #e2e8f0;">
                <tr>
                    <td style="padding-top: 8px; vertical-align: top;">
                        <strong>Report ID:</strong> WQMS-SUMM-${range.toUpperCase()}-${Date.now().toString().slice(-6)}<br>
                        Generated Autonomously by AquaMonitor WQMS Platform
                    </td>
                    <td style="padding-top: 8px; vertical-align: bottom; text-align: center; width: 150px;">
                        <div style="border-top: 1.5px solid #94a3b8; padding-top: 3px; font-weight: 600; margin-top: 10px;">Authorized WQMS Signature</div>
                    </td>
                </tr>
            </table>
        </div>
    `;

    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    const container = tempDiv.querySelector('.summary-pdf-root');
    const pxW = container.offsetWidth || 680;
    const pxH = (container.offsetHeight || 900) + 20;

    const opt = {
        margin:       [15, 15, 15, 15],
        filename:     `WQMS-${rangeLabel}_Summary_Report-${Date.now().toString().slice(-6)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        document.body.removeChild(tempDiv);
        if (typeof window.showNotification === 'function') {
            window.showNotification(`${rangeLabel} summary PDF downloaded successfully!`, 'success');
        }
    }).catch(err => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(tempDiv);
        if (typeof window.showNotification === 'function') {
            window.showNotification('Failed to generate summary PDF.', 'error');
        }
    });
}

function generateSummaryCsv(data, range, fountainVal) {
    const rangeLabel = range.charAt(0).toUpperCase() + range.slice(1);
    const csvRows = [
        ['OLFU Water Quality Operations Summary - ' + rangeLabel + ' Report'],
        ['Generated Date', new Date().toLocaleString()],
        [],
        ['Fountain ID', 'Fountain Name', 'Location', 'Samples Count', 'Avg pH', 'Avg Turbidity (NTU)', 'Avg Temperature (C)', 'Avg TDS (ppm)', 'Overall Status'],
        ...data.map(d => [
            d.fountain_id,
            d.fountain_name,
            d.location,
            d.readings_count,
            d.ph_avg !== null ? Number(d.ph_avg).toFixed(2) : '--',
            d.turbidity_avg !== null ? Number(d.turbidity_avg).toFixed(1) : '--',
            d.temperature_avg !== null ? Number(d.temperature_avg).toFixed(1) : '--',
            d.tds_avg !== null ? Number(d.tds_avg).toFixed(0) : '--',
            d.overall_status
        ])
    ];

    const csv = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wqms-${range}-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (typeof window.showNotification === 'function') {
        window.showNotification(`${rangeLabel} summary CSV downloaded successfully!`, 'success');
    }
}
