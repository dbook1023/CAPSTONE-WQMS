/**
 * USER MONITORING MODULE
 * Handles real-time sensor data visualization and fountain management
 */

// State
let fountains = [];
let selectedFountain = null;
let isReading = false;
let socket = null;
const activeCharts = {};
let sessionData = { ph: [], turbidity: [], temperature: [], tds: [] };
let scannedFountains = [];
let sessionSnapshots = [];
let sessionReadingCount = 0;
let lastProcessedTimestamp = null;
const MAX_SESSION_READINGS = 3;
let latestTelemetry = { ph: null, turbidity: null, temperature: null, tds: null };
let chartFlowInterval = null;
let restPollInterval = null;
let lastProcessedTimeMs = Date.now();
let sessionStartTimeMs = Date.now();
let currentVirtualTimeMs = Date.now();

function getOrdinalIndicator(n) {
    if (!n) return '0 Readings';
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]) + " Reading";
}

function formatPhilippineDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(date);
}

// DOM Elements
const fountainsGrid = document.getElementById('fountainsGrid');
const searchInput = document.getElementById('searchInput');
const startReadingBtn = document.getElementById('startReadingBtn');
const saveReadingBtn = document.getElementById('saveReadingBtn');
const saveReadingBtnMobile = document.getElementById('saveReadingBtnMobile');
const generateReportBtn = document.getElementById('generateReportBtn');
const selectionModal = document.getElementById('selectionModal');
const reportModal = document.getElementById('reportModal');
const fountainSelect = document.getElementById('fountainSelect');
const fountainIdInput = document.getElementById('fountainIdInput');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');
const closeSelectionBtn = document.getElementById('closeSelectionBtn');
const closeReportBtn = document.getElementById('closeReportBtn');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const submitReportBtn = document.getElementById('submitReportBtn');
const selectedFountainInfo = document.getElementById('selectedFountainInfo');
const selName = document.getElementById('selName');
const selLoc = document.getElementById('selLoc');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchFountains();
    initMonitoringCharts();
    setupEventListeners();
    initWebSocket();

    // Auto-display help guide if not opted-out
    const guideModal = document.getElementById('guideModal');
    if (guideModal && localStorage.getItem('wqms_hide_monitoring_guide') !== 'true') {
        setTimeout(() => {
            guideModal.classList.add('open');
        }, 800); // Small natural delay after load
    }
});

async function fetchFountains() {
    try {
        const data = await API.fountains.getAll();
        fountains = data;
        updateFountainDropdown();
        renderFountainGrid(fountains);
    } catch (error) {
        console.error('Failed to fetch fountains:', error);
        showNotification('Failed to load fountains from server', 'error');
    }
}

function initWebSocket() {
    // Connect dynamically to the Flask-SocketIO backend based on the current origin
    // Enforce websocket transport for native high-performance, non-polling data stream
    socket = io(window.location.origin);

    
    socket.on('connect', () => {
        console.log('Successfully connected to WQMS Real-time WebSocket stream!');
        setConnectionStatus(true, 'Live Connection: Connected via WebSocket');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from WQMS Real-time WebSocket.');
        setConnectionStatus(false, 'Connection lost. Reconnecting...');
    });
    
    socket.on('new_reading', (latest) => {
        // Handle incoming sensor telemetry in real-time
        processLiveReading(latest);
    });
}

function getParameterSafetyStatus(key, val) {
    const v = parseFloat(val);
    if (isNaN(v)) return 'CRITICAL';

    if (key === 'ph') {
        if (v >= 6.5 && v <= 8.5) return 'IDEAL';
        // Treat pH readings slightly above the normal upper bound as WARNING up to 9.0
        if ((v >= 6.35 && v < 6.5) || (v > 8.5 && v <= 9.0)) return 'WARNING';
        return 'CRITICAL';
    }
    if (key === 'turbidity') {
        if (v >= 0.0 && v <= 5.0) return 'IDEAL';
        if (v > 5.0 && v <= 5.5) return 'WARNING';
        return 'CRITICAL';
    }
    if (key === 'tds') {
        if (v >= 0.0 && v <= 500.0) return 'IDEAL';
        if (v > 500.0 && v <= 550.0) return 'WARNING';
        return 'CRITICAL';
    }
    if (key === 'temp' || key === 'temperature') {
        if (v >= 15.0 && v <= 30.0) return 'IDEAL';
        if ((v >= 13.5 && v < 15.0) || (v > 30.0 && v <= 33.0)) return 'WARNING';
        return 'CRITICAL';
    }
    return 'IDEAL';
}

function updateSingleMetricCard(fountainId, domKey, val, suffix) {
    const cardValId = `val-${domKey}-${fountainId}`;
    const cardEl = document.getElementById(cardValId);
    if (!cardEl) return;

    const newVal = parseFloat(val);
    if (isNaN(newVal)) return;

    // Format display values consistently per parameter
    function formatSensorDisplay(key, number, suffixText) {
        if (number === null || number === undefined || Number.isNaN(number)) return '--';
        // TDS shown as integer ppm
        if (key === 'tds' || /ppm/i.test(suffixText)) {
            return Math.round(number) + suffixText;
        }
        // Temperature and turbidity show two decimal places
        if (key === 'temp' || key === 'temperature' || /°C/.test(suffixText) || /ntu/i.test(suffixText)) {
            return number.toFixed(2) + suffixText;
        }
        // pH - two decimal places
        if (key === 'ph') return number.toFixed(2) + suffixText;

        // Fallback
        return number.toString() + suffixText;
    }

    cardEl.textContent = formatSensorDisplay(domKey, newVal, suffix);

    const parent = cardEl.closest('.fc-metric');
    if (parent) {
        parent.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        
        const safety = getParameterSafetyStatus(domKey, newVal);

        // --- Admin-style color system ---
        let bg = '#14b8a6';
        let border = '#0d9488';
        let badgeIcon = '';
        let badgeLabel = '';
        let finding = '';

        // SVG Icons (matching admin dashboard exactly)
        const safeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        const warnIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        const critIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

        // --- Contextual finding text per parameter (inspired by admin dashboard) ---
        if (domKey === 'ph') {
            if (safety === 'CRITICAL') {
                finding = newVal < 6.4 ? 'Acidic (Danger)' : 'Alkaline (Danger)';
            } else if (safety === 'WARNING') {
                finding = newVal < 7.0 ? 'Mildly Acidic' : 'Mildly Alkaline';
            } else {
                finding = 'Optimal pH (Safe)';
            }
        } else if (domKey === 'turbidity') {
            if (safety === 'CRITICAL') finding = 'Turbid (Danger)';
            else if (safety === 'WARNING') finding = newVal > 3.5 ? 'Cloudy (Warning)' : 'Slightly Cloudy';
            else finding = 'Clear (Safe)';
        } else if (domKey === 'temp') {
            if (safety === 'CRITICAL') finding = newVal > 33 ? 'Overheated' : 'Overcooled';
            else if (safety === 'WARNING') finding = newVal < 15 ? 'Cool (Warning)' : 'Warm (Warning)';
            else finding = 'Optimal Temp (Safe)';
        } else if (domKey === 'tds') {
            if (safety === 'CRITICAL') finding = 'Contaminated (Danger)';
            else if (safety === 'WARNING') finding = 'Elevated Minerals';
            else finding = 'Pure Water (Safe)';
        }

        if (safety === 'WARNING') {
            bg = '#f59e0b';
            border = '#d97706';
            badgeIcon = warnIcon;
            badgeLabel = 'Warning';
        } else if (safety === 'CRITICAL') {
            bg = '#dc2626';
            border = '#b91c1c';
            badgeIcon = critIcon;
            badgeLabel = 'Unsafe';
        } else {
            badgeIcon = safeIcon;
            badgeLabel = 'Safe';
        }

        // Update the status element with badge icon + label (admin style)
        const statusEl = document.getElementById(`status-${domKey}-${fountainId}`);
        if (statusEl) {
            statusEl.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 600;">${badgeIcon} ${badgeLabel}</span> <span style="display: block; margin-top: 3px; font-size: 8.5px; font-weight: 500; opacity: 0.9;">${finding}</span>`;
            statusEl.style.color = 'white';
        }

        const labelEl = parent.querySelector('.fc-metric-label');
        if (labelEl) labelEl.style.color = 'rgba(255, 255, 255, 0.85)';

        parent.style.background = bg;
        parent.style.borderColor = border;
        parent.style.color = 'white';
        cardEl.style.color = 'white';
    }
}

function processLiveReading(latest) {
    // 1. If we are actively reading, and this reading is from our selected fountain:
    if (isReading && selectedFountain && String(latest.fountain_id) === String(selectedFountain.id)) {
        // Reset watchdog timer immediately
        lastProcessedTimeMs = Date.now();
        setConnectionStatus(true);

        // Store latest telemetry values for our continuous smooth flowing chart
        latestTelemetry.ph = parseFloat(latest.ph);
        latestTelemetry.turbidity = parseFloat(latest.turbidity);
        latestTelemetry.temperature = parseFloat(latest.temperature);
        latestTelemetry.tds = parseFloat(latest.tds);

        const timestampStr = latest.timestamp || new Date().toISOString();
        if (lastProcessedTimestamp !== timestampStr) {
            lastProcessedTimestamp = timestampStr;
        }
        // Update the detailed selected fountain card's last-updated timestamp
        try {
            updateFountainCardMetrics(latest);
        } catch (e) {
            // Fail silently - non-critical UI update
            console.warn('Failed to update fountain card metrics:', e);
        }
    }

    // 2. Always sync metrics on the grid cards dynamically for all active fountains!
    sensorConfigs.forEach(cfg => {
        let key = cfg.id.replace('Chart', '').toLowerCase();
        if (key === 'temp') key = 'temperature';
        const newVal = parseFloat(latest[key]);
        if (isNaN(newVal)) return;

        const domKey = cfg.id.replace('Chart', '').toLowerCase();
        updateSingleMetricCard(latest.fountain_id, domKey, newVal, cfg.suffix);
    });
}

/**
 * REST API Polling Fallback
 * Guarantees fresh data even when the WebSocket long-polling transport drops.
 * With async_mode='threading', Flask-SocketIO uses HTTP long-polling (NOT real WebSocket),
 * which can silently stall under Werkzeug's limited thread pool.
 * This function polls /sensors/latest every 10 seconds as a safety net.
 */
async function pollLatestReading() {
    if (!isReading || !selectedFountain) return;
    try {
        const latestArr = await API.sensors.getLatest();
        if (!latestArr || latestArr.length === 0) return;
        // Find the entry matching our selected fountain
        const match = latestArr.find(r => r.fountain_id == selectedFountain.id);
        if (match) {
            console.log('[REST Fallback] Polled latest reading for fountain', selectedFountain.id);
            processLiveReading(match);
        }
    } catch (err) {
        // Silent fail — WebSocket may still be working fine
        console.warn('[REST Fallback] Poll failed:', err.message);
    }
}

function updateFountainDropdown() {
    if (fountainSelect) {
        fountainSelect.innerHTML = '<option value="" disabled selected>Select a fountain...</option>' + 
            fountains.map(f => {
                const isOffline = f.status === 'Offline';
                return `<option value="${f.id}" ${isOffline ? 'disabled' : ''}>${f.displayId} - ${f.name} ${isOffline ? '(Offline)' : ''}</option>`;
            }).join('');
    }
}

function setupEventListeners() {
    // Search functionality for the main grid
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = this.value.toLowerCase();
            document.querySelectorAll('.fountain-card').forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                const location = (card.dataset.location || '').toLowerCase();
                const id = (card.dataset.id || '').toLowerCase();
                card.style.display = (name.includes(q) || location.includes(q) || id.includes(q)) ? '' : 'none';
            });
        });
    }

    // Start Reading / Selection Modal
    if (startReadingBtn) {
        startReadingBtn.addEventListener('click', () => {
            if (isReading) {
                if (typeof showFeedbackModal === 'function') {
                    showFeedbackModal({
                        type: 'confirm',
                        title: 'Stop Reading?',
                        message: 'Are you sure you want to pause the live telemetry stream?',
                        confirmText: 'Yes, stop reading',
                        cancelText: 'Cancel',
                        onConfirm: () => {
                            stopReading();
                        }
                    });
                } else {
                    if (confirm('Are you sure you want to pause the live telemetry stream?')) stopReading();
                }
            } else {
                openSelectionModal();
            }
        });
    }

    // Generate Report
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', openReportModal);
    }

    if (closeReportBtn) closeReportBtn.addEventListener('click', closeReportModal);
    
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', () => {
            if (!selectedFountain || !sessionData.ph || sessionData.ph.length === 0) {
                showNotification('No session data available to generate certificate.', 'warning');
                return;
            }

            const actionPlan = window.WQMSActionGuidance?.buildReportActionPlan?.({
                ph: sessionData.ph.reduce((a, b) => a + b) / sessionData.ph.length,
                turbidity: sessionData.turbidity.reduce((a, b) => a + b) / sessionData.turbidity.length,
                temperature: sessionData.temperature.reduce((a, b) => a + b) / sessionData.temperature.length,
                tds: sessionData.tds.reduce((a, b) => a + b) / sessionData.tds.length
            });

            const actionMessage = actionPlan
                ? `${actionPlan.headline} Recommended action: ${actionPlan.actions[0] || 'Review the readings.'}`
                : 'Review the readings before submitting the report.';

            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({
                    type: 'confirm',
                    title: 'Submit Report?',
                    message: `${actionMessage} Are you sure you want to submit and save this compliance report to the database?`,
                    confirmText: 'Yes, submit report',
                    cancelText: 'Cancel',
                    onConfirm: async () => {
                        await processReportSubmission();
                    }
                });
            } else {
                if (confirm('Are you sure you want to submit and save this compliance report?')) {
                    processReportSubmission();
                }
            }
        });
    }

    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', () => {
            if (!selectedFountain || !sessionData.ph || sessionData.ph.length === 0) {
                showNotification('No session data available to generate certificate.', 'warning');
                return;
            }

            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({
                    type: 'confirm',
                    title: 'Download PDF Certificate?',
                    message: 'Do you want to compile and download the official PDF water certificate locally?',
                    confirmText: 'Yes, download',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                        triggerPdfDownload();
                    }
                });
            } else {
                if (confirm('Download PDF Certificate locally?')) {
                    triggerPdfDownload();
                }
            }
        });
    }

    async function processReportSubmission() {
        showNotification('Saving report to WQMS Database...', 'success');
        
        const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b) / arr.length).toFixed(2) : '--';

        const avgPh = parseFloat(avg(sessionData.ph));
        const avgTurb = parseFloat(avg(sessionData.turbidity));
        const avgTemp = parseFloat(avg(sessionData.temperature));
        const avgTds = parseFloat(avg(sessionData.tds));

        const actionPlan = window.WQMSActionGuidance?.buildReportActionPlan?.({
            ph: avgPh,
            turbidity: avgTurb,
            temperature: avgTemp,
            tds: avgTds
        });

        const isPhSafe = avgPh >= 6.5 && avgPh <= 8.5;
        const isTurbSafe = avgTurb >= 0.0 && avgTurb <= 5.0;
        const isTempSafe = avgTemp >= 15.0 && avgTemp <= 32.0;
        const isTdsSafe = avgTds >= 0.0 && avgTds <= 500.0;

        const overallCompliance = (isPhSafe && isTurbSafe && isTempSafe && isTdsSafe) ? 'COMPLIANT (PASS)' : 'NON-COMPLIANT (FAIL)';
        const hasCritical = actionPlan?.severity === 'critical';
        const hasWarning = actionPlan?.severity === 'warning';
        const overallStatus = hasCritical ? 'FAIL' : (hasWarning ? 'WARNING' : 'PASS');

        const sessionStr = localStorage.getItem('aqua_monitor_user_session');
        let userId = null;
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                const parsedId = Number(session?.id);
                if (Number.isFinite(parsedId) && parsedId > 0) {
                    userId = parsedId;
                }
            } catch (e) {
                console.error('Failed to parse session', e);
            }
        }

        if (!userId) {
            showNotification('Please sign in again before submitting a report.', 'error');
            return;
        }

        try {
            const payload = {
                fountain_id: selectedFountain.id,
                user_id: userId,
                ph_avg: avgPh,
                turbidity_avg: avgTurb,
                temperature_avg: avgTemp,
                tds_avg: avgTds,
                overall_status: overallStatus,
                readings_count: sessionData.ph.length
            };
            
            await API.reports.create(payload);
            
            // Automatically download PDF certificate upon successful database submission
            triggerPdfDownload();
            
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({
                    type: 'success',
                    title: 'Reports Submitted Successfully!',
                    message: `${actionPlan ? actionPlan.headline : 'The compliance report has been saved to the database.'} Your PDF certificate is now downloading.`,
                });
            } else {
                showNotification('Official compliance report saved and PDF certificate generated!', 'success');
            }
            closeReportModal();
        } catch (err) {
            console.error("Failed to save report to database:", err);
            showNotification(err?.message || 'Error saving report to database.', 'error');
        }
    }

    function triggerPdfDownload() {
        showNotification('Generating official Water Quality Certificate PDF...', 'success');
        
        const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b) / arr.length).toFixed(2) : '--';
        const min = (arr) => arr.length ? Math.min(...arr).toFixed(2) : '--';
        const max = (arr) => arr.length ? Math.max(...arr).toFixed(2) : '--';
        const currentReading = buildCurrentReadingSnapshot();

        const avgPhRaw = parseFloat(avg(sessionData.ph));
        const avgTurbRaw = parseFloat(avg(sessionData.turbidity));
        const avgTempRaw = parseFloat(avg(sessionData.temperature));
        const avgTdsRaw = parseFloat(avg(sessionData.tds));
        
        const avgPhText = !isNaN(avgPhRaw) ? avgPhRaw.toFixed(2) : '--';
        const avgTurbText = !isNaN(avgTurbRaw) ? avgTurbRaw.toFixed(1) : '--';
        const avgTempText = !isNaN(avgTempRaw) ? avgTempRaw.toFixed(1) : '--';
        const avgTdsText = !isNaN(avgTdsRaw) ? avgTdsRaw.toFixed(0) : 'N/A';

        const actionPlan = window.WQMSActionGuidance?.buildReportActionPlan?.({
            ph: avgPhRaw,
            turbidity: avgTurbRaw,
            temperature: avgTempRaw,
            tds: avgTdsRaw
        });

        // Match the live dashboard color bands: ideal = teal, warning = amber, critical = red
        // Treat pH up to 9.0 as WARNING (not CRITICAL)
        const phStatus = avgPhRaw >= 6.5 && avgPhRaw <= 8.5 ? 'IDEAL' : ((avgPhRaw >= 6.35 && avgPhRaw < 6.5) || (avgPhRaw > 8.5 && avgPhRaw <= 9.0) ? 'WARNING' : 'CRITICAL');
        const turbStatus = avgTurbRaw >= 0.0 && avgTurbRaw <= 5.0 ? 'IDEAL' : (avgTurbRaw > 5.0 && avgTurbRaw <= 5.5 ? 'WARNING' : 'CRITICAL');
        const tempStatus = avgTempRaw >= 15.0 && avgTempRaw <= 30.0 ? 'IDEAL' : (((avgTempRaw >= 13.5 && avgTempRaw < 15.0) || (avgTempRaw > 30.0 && avgTempRaw <= 33.0)) ? 'WARNING' : 'CRITICAL');
        const tdsStatus = avgTdsRaw >= 0.0 && avgTdsRaw <= 500.0 ? 'IDEAL' : (avgTdsRaw > 500.0 && avgTdsRaw <= 550.0 ? 'WARNING' : 'CRITICAL');

        const isPhSafe = phStatus !== 'CRITICAL';
        const isTurbSafe = turbStatus !== 'CRITICAL';
        const isTempSafe = tempStatus !== 'CRITICAL';
        const isTdsSafe = tdsStatus !== 'CRITICAL';
        const isTurbIdeal = turbStatus === 'IDEAL';
        const isTempIdeal = tempStatus === 'IDEAL';
        const isTdsIdeal = tdsStatus === 'IDEAL';

        // Color helper: green=safe, orange=warning, red=fail
        const phColor = phStatus === 'IDEAL' ? '#14b8a6' : (phStatus === 'WARNING' ? '#d97706' : '#dc2626');
        const turbColor = turbStatus === 'IDEAL' ? '#14b8a6' : (turbStatus === 'WARNING' ? '#d97706' : '#dc2626');
        const tempColor = tempStatus === 'IDEAL' ? '#14b8a6' : (tempStatus === 'WARNING' ? '#d97706' : '#dc2626');
        const tdsColor = tdsStatus === 'IDEAL' ? '#14b8a6' : (tdsStatus === 'WARNING' ? '#d97706' : '#dc2626');

        const hasCritical = phStatus === 'CRITICAL' || turbStatus === 'CRITICAL' || tempStatus === 'CRITICAL' || tdsStatus === 'CRITICAL';
        const hasWarning = phStatus === 'WARNING' || turbStatus === 'WARNING' || tempStatus === 'WARNING' || tdsStatus === 'WARNING';
        const overallCompliance = hasCritical ? 'NON-COMPLIANT (CRITICAL)' : (hasWarning ? 'COMPLIANT WITH WARNINGS' : 'COMPLIANT (PASS)');
        const overallColor = hasCritical ? '#dc2626' : (hasWarning ? '#d97706' : '#14b8a6');

        // Create temporary off-screen container for PDF rendering
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '0';
        tempDiv.style.top = '0';
        tempDiv.style.width = '850px';
        tempDiv.style.zIndex = '-99999';
        tempDiv.style.opacity = '0.01';
        tempDiv.style.pointerEvents = 'none';

        const htmlContent = `
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
                        <span class="meta-value">${selectedFountain.name} (ID: ${selectedFountain.id})</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Fountain Location</span>
                        <span class="meta-value">${selectedFountain.location}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Certification Date</span>
                        <span class="meta-value">${formatPhilippineDateTime(new Date())}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Samples Logged</span>
                        <span class="meta-value">${sessionData.ph.length} Official Telemetry Snapshots</span>
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
                            <td style="font-weight: 700; color: ${phColor};">${avgPhText}</td>
                            <td>6.5 - 8.5 pH</td>
                            <td><span class="status-badge ${phStatus === 'CRITICAL' ? 'status-fail' : (phStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${phStatus === 'CRITICAL' ? 'FAIL' : (phStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600;">Turbidity</td>
                            <td style="font-weight: 700; color: ${turbColor};">${avgTurbText} NTU</td>
                            <td>0.0 - 5.0 NTU</td>
                            <td><span class="status-badge ${turbStatus === 'CRITICAL' ? 'status-fail' : (turbStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${turbStatus === 'CRITICAL' ? 'FAIL' : (turbStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600;">Temperature</td>
                            <td style="font-weight: 700; color: ${tempColor};">${avgTempText}&deg;C</td>
                            <td>15.0 - 30.0&deg;C</td>
                            <td><span class="status-badge ${tempStatus === 'CRITICAL' ? 'status-fail' : (tempStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${tempStatus === 'CRITICAL' ? 'FAIL' : (tempStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                        </tr>
                        <tr>
                            <td style="font-weight: 600;">TDS</td>
                            <td style="font-weight: 700; color: ${tdsColor};">${avgTdsText} ppm</td>
                            <td>0.0 - 500.0 ppm</td>
                            <td><span class="status-badge ${tdsStatus === 'CRITICAL' ? 'status-fail' : (tdsStatus === 'WARNING' ? 'status-warn' : 'status-pass')}">${tdsStatus === 'CRITICAL' ? 'FAIL' : (tdsStatus === 'WARNING' ? 'WARNING' : 'PASS')}</span></td>
                        </tr>
                    </tbody>
                </table>

                <div style="font-size: 10px; color: #64748b; line-height: 1.6; margin-bottom: 20px; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px;">
                    <strong>Compliance Note:</strong> This certificate guarantees that the drinking water fountain was continuously analyzed under the WQMS automated sensor telemetry stream. Parameter criteria references the DOH Philippine National Standards for Drinking Water (PNSDW) Administrative Order No. 2017-0010.
                </div>

                <div class="footer">
                    <div>
                        <strong>Platform ID:</strong> WQMS-CERT-${selectedFountain.id}-${Date.now().toString().slice(-6)}<br>
                        Generated Autonomously by AquaMonitor WQMS
                    </div>
                    <div class="signature-line">
                        Authorized WQMS Signature
                    </div>
                </div>
            </div>
        `;

        tempDiv.innerHTML = htmlContent;
        document.body.appendChild(tempDiv);
        const container = tempDiv.querySelector('.certificate-container');
        const width = container.offsetWidth || 850;
        const height = (container.offsetHeight || 1100) + 12;

        const opt = {
            margin:       0,
            filename:     `WQMS-Certificate-${selectedFountain.name.replace(/\s+/g, '_')}-${Date.now().toString().slice(-6)}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2.5, useCORS: true, logging: false, scrollY: 0 },
            jsPDF:        { unit: 'px', format: [width, height], orientation: 'portrait' }
        };

        html2pdf().set(opt).from(tempDiv.querySelector('.certificate-container')).save().then(() => {
            document.body.removeChild(tempDiv);
            showNotification('Compliance PDF saved directly to downloads successfully!', 'success');
        }).catch(err => {
            console.error("PDF generation failed:", err);
            document.body.removeChild(tempDiv);
            showNotification('Failed to compile PDF certificate.', 'error');
        });
    }

    // Scan New
    const scanNewBtn = document.getElementById('scanNewBtn');
    if (scanNewBtn) {
        scanNewBtn.addEventListener('click', () => {
            stopReading();
            openSelectionModal();
        });
    }

    // Quick Lookup by ID
    if (fountainIdInput) {
        fountainIdInput.addEventListener('input', function() {
            const id = this.value.trim().toUpperCase();
            const f = fountains.find(item => item.displayId.toUpperCase() === id);
            if (f) {
                if (f.status === 'Offline') {
                    this.style.borderColor = '#ef4444';
                    selectedFountainInfo.style.display = 'block';
                    if (selName) selName.textContent = f.name;
                    if (selLoc) {
                        selLoc.textContent = `${f.displayId} • Offline`;
                        selLoc.style.color = '#ef4444';
                    }
                    confirmSelectionBtn.disabled = true;
                    selectedFountain = null;
                } else {
                    this.style.borderColor = '#14B8A6';
                    if (selLoc) selLoc.style.color = '#64748b';
                    updateSelectedFountainUI(f);
                    if (fountainSelect) fountainSelect.value = f.id;
                }
            } else {
                this.style.borderColor = '#e2e8f0';
                if (!fountainSelect.value) {
                    selectedFountainInfo.style.display = 'none';
                    confirmSelectionBtn.disabled = true;
                    selectedFountain = null;
                }
            }
        });
    }

    // Selection Dropdown
    if (fountainSelect) {
        fountainSelect.addEventListener('change', () => {
            const id = fountainSelect.value;
            const f = fountains.find(item => item.id == id);
            if (f) {
                if (selLoc) selLoc.style.color = '#64748b';
                updateSelectedFountainUI(f);
                if (fountainIdInput) {
                    fountainIdInput.value = f.displayId;
                    fountainIdInput.style.borderColor = '#14B8A6';
                }
            }
        });
    }

    if (confirmSelectionBtn) {
        confirmSelectionBtn.addEventListener('click', () => {
            closeSelectionModal();
            startReading();
        });
    }

    if (closeSelectionBtn) {
        closeSelectionBtn.addEventListener('click', closeSelectionModal);
    }

    const saveReadingBtn = document.getElementById('saveReadingBtn');
    if (saveReadingBtn) {
        saveReadingBtn.addEventListener('click', saveCurrentReading);
    }

    const clearComparisonBtn = document.getElementById('clearComparisonBtn');
    if (clearComparisonBtn) {
        clearComparisonBtn.addEventListener('click', () => {
            sessionSnapshots = [];
            updateComparisonTable();
            showNotification('Session readings history cleared.', 'info');
        });
    }

    // Help Guide Modal
    const openGuideBtn = document.getElementById('openGuideBtn');
    const guideModal = document.getElementById('guideModal');
    const closeGuideBtn = document.getElementById('closeGuideBtn');
    const dontShowAgainCheck = document.getElementById('dontShowAgainCheck');

    if (openGuideBtn && guideModal) {
        openGuideBtn.addEventListener('click', () => {
            if (dontShowAgainCheck) dontShowAgainCheck.checked = false;
            guideModal.classList.add('open');
        });
    }

    if (closeGuideBtn && guideModal) {
        closeGuideBtn.addEventListener('click', () => {
            if (dontShowAgainCheck && dontShowAgainCheck.checked) {
                localStorage.setItem('wqms_hide_monitoring_guide', 'true');
            } else {
                localStorage.removeItem('wqms_hide_monitoring_guide');
            }
            guideModal.classList.remove('open');
        });
    }

    // Responsive More Actions Dropdown Toggle
    const moreActionsBtn = document.getElementById('moreActionsBtn');
    const moreActionsDropdown = document.getElementById('moreActionsDropdown');
    
    if (moreActionsBtn && moreActionsDropdown) {
        moreActionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moreActionsDropdown.classList.toggle('open');
        });
        
        document.addEventListener('click', () => {
            moreActionsDropdown.classList.remove('open');
        });
    }

    // Map Mobile Dropdown buttons to execute same actions as desktop
    const openGuideBtnMobile = document.getElementById('openGuideBtnMobile');
    if (openGuideBtnMobile && openGuideBtn) {
        openGuideBtnMobile.addEventListener('click', () => {
            openGuideBtn.click();
            if (moreActionsDropdown) moreActionsDropdown.classList.remove('open');
        });
    }

    const viewStandardsBtnMobile = document.getElementById('viewStandardsBtnMobile');
    const viewStandardsBtn = document.getElementById('viewStandardsBtn');
    if (viewStandardsBtnMobile && viewStandardsBtn) {
        viewStandardsBtnMobile.addEventListener('click', () => {
            viewStandardsBtn.click();
            if (moreActionsDropdown) moreActionsDropdown.classList.remove('open');
        });
    }

    const scanNewBtnMobile = document.getElementById('scanNewBtnMobile');
    if (scanNewBtnMobile && scanNewBtn) {
        scanNewBtnMobile.addEventListener('click', () => {
            scanNewBtn.click();
            if (moreActionsDropdown) moreActionsDropdown.classList.remove('open');
        });
    }

    const saveReadingBtnMobile = document.getElementById('saveReadingBtnMobile');
    if (saveReadingBtnMobile) {
        saveReadingBtnMobile.addEventListener('click', () => {
            saveCurrentReading();
            if (moreActionsDropdown) moreActionsDropdown.classList.remove('open');
        });
    }

    const generateReportBtnMobile = document.getElementById('generateReportBtnMobile');
    if (generateReportBtnMobile && generateReportBtn) {
        generateReportBtnMobile.addEventListener('click', () => {
            generateReportBtn.click();
            if (moreActionsDropdown) moreActionsDropdown.classList.remove('open');
        });
    }

    if (saveReadingBtn) {
        saveReadingBtn.addEventListener('click', saveCurrentReading);
    }
}

async function saveCurrentReading() {
    if (!selectedFountain) return;

    // Grab the exact current moment from the live flowing chart
    const ph = latestTelemetry.ph;
    const turbidity = latestTelemetry.turbidity;
    const temperature = latestTelemetry.temperature;
    const tds = latestTelemetry.tds;

    if (ph === null || ph === undefined) {
        showNotification('No data flowing yet. Wait for a reading.', 'warning');
        return;
    }

    sessionReadingCount++;

    // Add to session data for report mathematical averages
    sessionData.ph.push(ph);
    sessionData.turbidity.push(turbidity);
    sessionData.temperature.push(temperature);
    sessionData.tds.push(tds);

    // Compute status on the fly to match the backend PNSDW logic exactly
    const ph_status = (ph >= 6.5 && ph <= 8.5) ? 'PASS' : 'FAIL';
    const turb_status = turbidity <= 5.0 ? 'PASS' : 'FAIL';
    const temp_status = (temperature >= 15.0 && temperature <= 30.0) ? 'PASS' : 'FAIL';
    const tds_status = tds <= 500.0 ? 'PASS' : 'FAIL';
    const overall_status = (ph_status === 'PASS' && turb_status === 'PASS' && temp_status === 'PASS' && tds_status === 'PASS') ? 'PASS' : 'FAIL';

    // Record snapshot manually
    const snapshotData = {
        index: sessionReadingCount,
        timestamp: new Date().toLocaleTimeString(),
        ph,
        ph_status,
        turbidity,
        turbidity_status: turb_status,
        temperature,
        temperature_status: temp_status,
        tds,
        tds_status,
        overall_status
    };
    
    // Put at top of table
    sessionSnapshots.unshift(snapshotData); 
    updateComparisonTable();

    // Persist snapshot to server so it becomes part of official sensor_logs
    // only if the backend is configured to accept persisted snapshots.
    // We send pre-calibrated values and request persistence with `persist: true`.
    (async () => {
        try {
            await API.sensors.update({
                fountain_id: selectedFountain.id,
                ph: ph,
                ntu: turbidity,
                tds: tds,
                temperature: temperature,
                timestamp: new Date().toISOString(),
                persist: true,
                source: 'user_snapshot'
            });
            // Optionally show a small persisted indicator
            showNotification('Snapshot persisted to server', 'success');
        } catch (err) {
            console.warn('Failed to persist snapshot:', err);
            showNotification('Could not persist snapshot to server', 'warning');
        }
    })();

    const badge = document.getElementById('sessionCounterBadge');
    if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = `${sessionReadingCount} Snapshots`;
    }

    if (generateReportBtn) {
        generateReportBtn.disabled = false;
        generateReportBtn.style.display = 'inline-flex';
    }
    const generateReportBtnMobile = document.getElementById('generateReportBtnMobile');
    if (generateReportBtnMobile) {
        generateReportBtnMobile.style.display = 'flex';
        generateReportBtnMobile.disabled = false;
    }

    if (typeof showFeedbackModal === 'function') {
        showFeedbackModal({
            type: 'success',
            title: 'Snapshot Saved Successfully!',
            message: `Manual snapshot #${sessionReadingCount} recorded securely. You can now generate the final report.`
        });
    } else {
        showNotification(`Manual snapshot #${sessionReadingCount} recorded securely.`, 'success');
    }
}

function updateComparisonTable() {
    const section = document.getElementById('comparisonSection');
    const tbody = document.getElementById('comparisonTableBody');
    if (!section || !tbody) return;

    if (sessionSnapshots.length === 0) {
        section.style.display = 'none';
        tbody.innerHTML = '';
        return;
    }

    section.style.display = 'block';
    
    tbody.innerHTML = sessionSnapshots.map(snap => {
        const phSafety = getParameterSafetyStatus('ph', snap.ph);
        const turbSafety = getParameterSafetyStatus('turbidity', snap.turbidity);
        const tempSafety = getParameterSafetyStatus('temperature', snap.temperature);
        const tdsSafety = getParameterSafetyStatus('tds', snap.tds);

        const getBadgeStyle = (safety, defaultIdealBg, defaultIdealColor) => {
            if (safety === 'CRITICAL') return { bg: 'rgba(220,38,38,0.1)', color: '#dc2626' };
            if (safety === 'WARNING') return { bg: 'rgba(245,158,11,0.1)', color: '#d97706' };
            return { bg: defaultIdealBg, color: defaultIdealColor }; // IDEAL
        };

        const phStyle = getBadgeStyle(phSafety, 'rgba(20,184,166,0.1)', '#14b8a6');
        const turbStyle = getBadgeStyle(turbSafety, 'rgba(56,189,248,0.1)', '#0369a1');
        const tempStyle = getBadgeStyle(tempSafety, 'rgba(20,184,166,0.1)', '#14b8a6');
        const tdsStyle = getBadgeStyle(tdsSafety, 'rgba(245,158,11,0.1)', '#b45309');
        
        const isOverallSafe = phSafety !== 'CRITICAL' && turbSafety !== 'CRITICAL' && tempSafety !== 'CRITICAL' && tdsSafety !== 'CRITICAL';
        let diagnosis = isOverallSafe ? 'Safe (Optimal)' : 'Danger (Critical)';
        let diagnosisColor = isOverallSafe ? '#14b8a6' : '#dc2626';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 16px; font-weight: 600; color: #1e293b;">${getOrdinalIndicator(snap.index)}</td>
                <td style="padding: 12px 16px; color: #64748b;">${snap.timestamp}</td>
                <td style="padding: 12px 16px; font-weight: 500;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: ${phStyle.bg}; color: ${phStyle.color}; font-size: 0.8rem;">
                        ${snap.ph.toFixed(2)} pH
                    </span>
                </td>
                <td style="padding: 12px 16px; font-weight: 500;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: ${turbStyle.bg}; color: ${turbStyle.color}; font-size: 0.8rem;">
                        ${snap.turbidity.toFixed(1)} NTU
                    </span>
                </td>
                <td style="padding: 12px 16px; font-weight: 500;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: ${tempStyle.bg}; color: ${tempStyle.color}; font-size: 0.8rem;">
                        ${snap.temperature.toFixed(1)}°C
                    </span>
                </td>
                <td style="padding: 12px 16px; font-weight: 500;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; background: ${tdsStyle.bg}; color: ${tdsStyle.color}; font-size: 0.8rem;">
                        ${snap.tds.toFixed(0)} ppm
                    </span>
                </td>
                <td style="padding: 12px 16px; font-weight: 600;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; background: ${diagnosisColor === '#dc2626' ? 'rgba(220,38,38,0.1)' : 'rgba(20,184,166,0.1)'}; color: ${diagnosisColor};">
                        ${diagnosis}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function updateSelectedFountainUI(f) {
    if (selName) selName.textContent = f.name;
    if (selLoc) selLoc.textContent = `${f.displayId} • ${f.location}`;
    if (selectedFountainInfo) selectedFountainInfo.style.display = 'block';
    if (confirmSelectionBtn) confirmSelectionBtn.disabled = false;
    selectedFountain = f;
}

/**
 * Quick Select from Grid
 */
window.quickSelectFountain = function(id) {
    const f = fountains.find(item => item.id === id);
    if (f) {
        if (f.status === 'Offline') {
            showNotification(`${f.displayId} is currently Offline and cannot be monitored.`, 'warning');
            return;
        }
        stopReading();
        updateSelectedFountainUI(f);
        startReading();
        showNotification(`Now monitoring ${f.name}`, 'success');
    }
};

window.setConnectionStatus = function(online, message = '') {
    const container = document.getElementById('connectionStatus');
    if (!container) return;
    
    const dot = container.querySelector('.status-dot');
    const text = container.querySelector('span');
    const chartGrid = document.querySelector('.charts-grid');

    if (online) {
        dot.style.background = '#22c55e';
        dot.style.boxShadow = '0 0 8px #22c55e';
        text.textContent = 'Live Connection: Connected';
        text.style.color = '#15803d';
        if (chartGrid) chartGrid.style.opacity = '1';
    } else {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 8px #ef4444';
        text.textContent = message || 'Device Offline: Check ESP32 Connection';
        text.style.color = '#b91c1c';
        if (chartGrid) chartGrid.style.opacity = '0.6';
    }
};

/**
 * Render fountain cards in the grid
 */
function renderFountainGrid(data) {
    if (!fountainsGrid) return;
    
    if (data.length === 0) {
        fountainsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.5); border: 2px dashed #e2e8f0; border-radius: 20px;">
                <div style="width: 48px; height: 48px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <h3 style="font-size: 1rem; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Ready to Scan</h3>
                <p style="font-size: 0.875rem; color: #64748b; max-width: 300px; margin: 0 auto;">Select a fountain using the button above to start monitoring live water quality data.</p>
            </div>
        `;
        return;
    }

    fountainsGrid.innerHTML = data.map(f => {
        const isOffline = f.status === 'Offline';
        const offlineStyle = isOffline ? 'opacity: 0.65; cursor: not-allowed; filter: grayscale(1);' : 'cursor: pointer;';
        
        return `
        <div class="fountain-card" style="${offlineStyle}" data-name="${f.name}" data-location="${f.location}" data-id="${f.displayId}" onclick="${isOffline ? '' : `quickSelectFountain(${f.id})`}">
            <div class="fc-top">
                <span class="fc-id">${f.displayId}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button class="status-toggle-btn ${f.status.toLowerCase()}" onclick="toggleFountainStatus(${f.id}, event)" title="Click to toggle Online/Offline">
                        <span class="fc-badge ${f.status.toLowerCase()}">
                            ${getStatusIcon(f.status)}
                            ${f.status}
                        </span>
                    </button>
                </div>
            </div>
            <div class="fc-title">${f.name}</div>
            <div class="fc-location">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${f.location}
            </div>
            <div class="fc-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
                <div class="fc-metric" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; min-height: 85px;">
                    <div class="fc-metric-label" style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">pH Level</div>
                    <div class="fc-metric-value" id="val-ph-${f.id}" style="font-size: 16px; font-weight: 700; color: #1e293b;">--</div>
                    <div class="fc-metric-status" id="status-ph-${f.id}" style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 4px;">Pending</div>
                </div>
                <div class="fc-metric" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; min-height: 85px;">
                    <div class="fc-metric-label" style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Turbidity</div>
                    <div class="fc-metric-value" id="val-turbidity-${f.id}" style="font-size: 16px; font-weight: 700; color: #1e293b;">--</div>
                    <div class="fc-metric-status" id="status-turbidity-${f.id}" style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 4px;">Pending</div>
                </div>
                <div class="fc-metric" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; min-height: 85px;">
                    <div class="fc-metric-label" style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">Temp</div>
                    <div class="fc-metric-value" id="val-temp-${f.id}" style="font-size: 16px; font-weight: 700; color: #1e293b;">--</div>
                    <div class="fc-metric-status" id="status-temp-${f.id}" style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 4px;">Pending</div>
                </div>
                <div class="fc-metric" style="display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; min-height: 85px;">
                    <div class="fc-metric-label" style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 4px;">TDS</div>
                    <div class="fc-metric-value" id="val-tds-${f.id}" style="font-size: 16px; font-weight: 700; color: #1e293b;">--</div>
                    <div class="fc-metric-status" id="status-tds-${f.id}" style="font-size: 9px; font-weight: 600; color: #64748b; margin-top: 4px;">Pending</div>
                </div>
            </div>
        </div>
    `}).join('');

}

function getStatusIcon(status) {
    if (status === 'Online') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    if (status === 'Warning' || status === 'Maintenance') return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
}

window.toggleFountainStatus = async function(id, event) {
    if (event) event.stopPropagation();
    
    const f = fountains.find(item => item.id === id);
    if (!f) return;

    const newStatus = f.status === 'Online' ? 'Offline' : 'Online';
    
    const doToggle = async () => {
        try {
            await API.fountains.patchStatus(id, newStatus);
            f.status = newStatus;
            
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({ type: 'success', title: 'Status Updated', message: `Fountain ${f.displayId} is now ${newStatus}.` });
            } else {
                showNotification(`Fountain ${f.displayId} is now ${newStatus}`, 'info');
            }
            
            if (isReading) {
                renderFountainGrid(scannedFountains);
            } else {
                renderFountainGrid(fountains);
            }
        } catch (error) {
            if (typeof showFeedbackModal === 'function') {
                showFeedbackModal({ type: 'error', title: 'Update Failed', message: `Could not update status: ${error.message}` });
            } else {
                showNotification(`Failed to update status: ${error.message}`, 'error');
            }
        }
    };

    if (typeof showFeedbackModal === 'function') {
        showFeedbackModal({
            type: 'confirm',
            title: `Mark ${f.displayId} as ${newStatus}?`,
            message: `This will change the fountain status to ${newStatus}.`,
            confirmText: `Yes, ${newStatus}`,
            onConfirm: doToggle
        });
    } else {
        doToggle();
    }
};

/**
 * Chart Management
 */
const sensorConfigs = [
    { id: 'phChart', label: 'pH Level', color: '#14B8A6', min: 6.5, max: 8.5, step: 0.05, suffix: '' },
    { id: 'turbidityChart', label: 'Turbidity (NTU)', color: '#38bdf8', min: 0, max: 5.0, step: 0.2, suffix: ' NTU' },
    { id: 'tempChart', label: 'Temperature (°C)', color: '#ef4444', min: 15, max: 30, step: 0.3, suffix: '°C' },
    { id: 'tdsChart', label: 'TDS (ppm)', color: '#f59e0b', min: 0, max: 500, step: 2, suffix: ' ppm' }
];

function initMonitoringCharts() {
    if (!window.Chart) return;

    const grid = { color: '#f1f5f9', drawBorder: false };
    const ticks = { color: '#94a3b8', font: { size: 10 } };

    sensorConfigs.forEach(cfg => {
        const el = document.getElementById(cfg.id);
        if (el) {
            const ctx = el.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 0, 180);
            grad.addColorStop(0, `${cfg.color}35`);
            grad.addColorStop(1, `${cfg.color}00`);

            activeCharts[cfg.id] = new Chart(el, {
                type: 'line',
                data: {
                    datasets: [{
                        label: cfg.label,
                        data: [],
                        borderColor: cfg.color,
                        backgroundColor: grad,
                        borderWidth: 3,
                        pointRadius: 4, 
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.4, // Beautiful organic curve transition
                        spanGaps: true // Span any data gaps seamlessly
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        x: {
                            type: 'linear',
                            bounds: 'data',
                            grid,
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 10 },
                                autoSkip: true,
                                maxTicksLimit: 6,
                                callback: function(val) {
                                    const absoluteTime = sessionStartTimeMs + (val * 1000);
                                    return new Date(absoluteTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                }
                            }
                        }, 
                        y: { 
                            grid, 
                            ticks,
                            suggestedMin: cfg.min,
                            suggestedMax: cfg.max 
                        } 
                    },
                    animation: {
                        duration: 1000, // Duration matching our tick interval for organic flowing illusion
                        easing: 'linear' // Continuous linear progression
                    }
                }
            });
        }
    });
}

/**
 * Reading Logic
 */
function updateChartFlow() {
    if (!isReading || !selectedFountain) return;

    // Connection watchdog check (60 seconds threshold to accommodate ESP32 transmission cycles & network jitter)
    const idleSeconds = (Date.now() - lastProcessedTimeMs) / 1000;
    if (idleSeconds > 60) {
        setConnectionStatus(false, `Device Offline: No signal for ${Math.floor(idleSeconds)}s`);
        return; // Freeze chart flow timeline animation immediately!
    } else {
        setConnectionStatus(true);
    }

    const now = Date.now();
    const elapsedSec = (now - sessionStartTimeMs) / 1000;

    sensorConfigs.forEach(cfg => {
        const chart = activeCharts[cfg.id];
        if (chart) {
            let key = cfg.id.replace('Chart', '').toLowerCase();
            if (key === 'temp') key = 'temperature';
            
            // Extract the latest telemetry slice (carrying last known value forward for continuity)
            let newVal = latestTelemetry[key];
            if (newVal !== null && newVal !== undefined) {
                newVal = parseFloat(newVal);
            }

            const dataArr = chart.data.datasets[0].data;

            // Push new coordinate object using relative elapsed seconds!
            dataArr.push({
                x: elapsedSec,
                y: newVal !== null ? newVal : null
            });

            // Maintain rolling window (keep last 20 seconds of coordinates to avoid visual clipping on scroll)
            chart.data.datasets[0].data = dataArr.filter(pt => pt.x >= elapsedSec - 20);

            // Shift horizontal viewport boundaries smoothly using relative seconds!
            chart.options.scales.x.min = elapsedSec - 15;
            chart.options.scales.x.max = elapsedSec + 1;

            // Draw sliding update
            chart.update();
        }
    });
}

async function fetchInitialFountainData() {
    try {
        const history = await API.sensors.getHistory(selectedFountain.id, 15);
        
        if (history && history.length > 0) {
            // Sort to chronological order (oldest to newest)
            const chronological = [...history].reverse();
            
            // The absolute latest is the last one in chronological (first in original history)
            const latest = history[0];
            
            // Do NOT pre-populate metric cards with historical readings.
            // Metric cards should only display live/current readings arriving via socket events.
            // Reset watchdog timer upon successful prefill load so charts can initialize gracefully.
            lastProcessedTimeMs = Date.now();
            
            // Pre-populate charts with the historical data points
            sensorConfigs.forEach(cfg => {
                const chart = activeCharts[cfg.id];
                if (chart) {
                    chart.data.datasets[0].data = [];
                    
                    let key = cfg.id.replace('Chart', '').toLowerCase();
                    if (key === 'temp') key = 'temperature';
                    
                    // Fill up to 15 slots
                    const padLength = 15 - chronological.length;
                    
                    // Pad start with null values if history has fewer than 15 items
                    for (let i = padLength; i > 0; i--) {
                        chart.data.datasets[0].data.push({
                            x: -14 + (padLength - i),
                            y: null
                        });
                    }
                    
                    // Add actual database history mapped perfectly to end at relative position 0
                    chronological.forEach((log, idx) => {
                        const relativePos = -14 + padLength + idx;
                        chart.data.datasets[0].data.push({
                            x: relativePos,
                            y: parseFloat(log[key])
                        });
                        
                        // Keep historical points in the chart only; report averages should come from current-session snapshots.
                    });
                    
                    chart.options.scales.x.min = -15;
                    chart.options.scales.x.max = 1;
                    chart.update();
                }
            });
            
            console.log("Pre-populated real-time charts with cached database history successfully!");
        } else {
            console.log("No previous telemetry history found in database for this fountain. Starting fresh.");
        }
    } catch (err) {
        console.error("Failed to fetch initial fountain data:", err);
    }
}

function updateFountainCardMetrics(latest) {
    sensorConfigs.forEach(cfg => {
        let key = cfg.id.replace('Chart', '').toLowerCase();
        if (key === 'temp') key = 'temperature';
        const newVal = parseFloat(latest[key]);
        if (isNaN(newVal)) return;

        const domKey = cfg.id.replace('Chart', '').toLowerCase();
        updateSingleMetricCard(latest.fountain_id, domKey, newVal, cfg.suffix);
    });

    const cardElement = document.querySelector(`.fountain-card[data-name="${selectedFountain.name}"]`);
    if (cardElement) {
        const lastUpdatedEl = cardElement.querySelector('.fc-updated');
        if (lastUpdatedEl) {
            // Hide last-updated UI; only current readings are shown per user preference
            lastUpdatedEl.style.display = 'none';
        }
    }
}

function startReading() {
    if (!selectedFountain) return;

    isReading = true;
    sessionSnapshots = [];
    sessionReadingCount = 0;
    lastProcessedTimestamp = null;
    lastProcessedTimeMs = Date.now();
    sessionStartTimeMs = Date.now();
    currentVirtualTimeMs = Date.now();
    updateComparisonTable();

    // Reset latest telemetry
    latestTelemetry = { ph: null, turbidity: null, temperature: null, tds: null };

    // Immediately update selected fountain card to reflect live session
    try {
        const cardElement = document.querySelector(`.fountain-card[data-name="${selectedFountain.name}"]`);
        if (cardElement) {
            sensorConfigs.forEach(cfg => {
                let domKey = cfg.id.replace('Chart', '').toLowerCase();
                if (domKey === 'temp') domKey = 'temp'; // Just to be safe, matches the id val-temp-
                
                const valEl = cardElement.querySelector(`#val-${domKey}-${selectedFountain.id}`);
                if (valEl) valEl.textContent = '--';
                
                const statusEl = cardElement.querySelector(`#status-${domKey}-${selectedFountain.id}`);
                if (statusEl) {
                    statusEl.innerHTML = 'Pending';
                    statusEl.style.color = '#64748b';
                }
                
                const parent = valEl ? valEl.closest('.fc-metric') : null;
                if (parent) {
                    parent.style.background = '#f8fafc';
                    parent.style.borderColor = '#e2e8f0';
                    parent.style.color = 'inherit';
                    if (valEl) valEl.style.color = '#1e293b';
                    
                    const labelEl = parent.querySelector('.fc-metric-label');
                    if (labelEl) labelEl.style.color = '#64748b';
                }
            });
        }
    } catch (e) { /* ignore */ }

    const badge = document.getElementById('sessionCounterBadge');
    if (badge) {
        badge.style.display = 'none'; // Only show when snapshots exist
    }

    sessionData = { ph: [], turbidity: [], temperature: [], tds: [] };
    startReadingBtn.classList.add('btn-danger');
    startReadingBtn.classList.remove('btn-primary');
    startReadingBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
        <span>Stop Reading</span>
    `;

    if (generateReportBtn) generateReportBtn.disabled = true; // Wait for at least one snapshot
    if (saveReadingBtn) {
        saveReadingBtn.style.display = 'none';
    }
    const generateReportBtnMobile = document.getElementById('generateReportBtnMobile');
    if (generateReportBtnMobile) {
        generateReportBtnMobile.style.display = 'flex';
        generateReportBtnMobile.disabled = true;
    }
    if (saveReadingBtnMobile) {
        saveReadingBtnMobile.style.display = 'none';
        saveReadingBtnMobile.disabled = true;
    }

    // Add to scanned list if not already there
    if (!scannedFountains.find(f => f.id === selectedFountain.id)) {
        scannedFountains.push(selectedFountain);
    }

    // Show only scanned fountains
    renderFountainGrid(scannedFountains);

    // Pre-populate charts for new session
    sensorConfigs.forEach(cfg => {
        const chart = activeCharts[cfg.id];
        if (chart) {
            chart.data.datasets[0].data = [];
            // Pre-fill chart with 15 starting coordinates to initialize the flow beautifully
            for (let i = 14; i >= 0; i--) {
                chart.data.datasets[0].data.push({
                    x: -i,
                    y: null
                });
            }
            chart.options.scales.x.min = -15;
            chart.options.scales.x.max = 1;
            chart.update();
        }
    });

    // Instantly load active fountain history from DB
    fetchInitialFountainData();

    console.log(`WebSocket Monitoring Session started for fountain: ${selectedFountain.name}`);

    // Clear any existing intervals
    if (chartFlowInterval) clearInterval(chartFlowInterval);
    if (restPollInterval) clearInterval(restPollInterval);

    // Start the ultra-smooth flowing animation loop every 1 second
    chartFlowInterval = setInterval(updateChartFlow, 1000);

    // Start REST API polling fallback every 10 seconds
    // This guarantees the watchdog stays alive even when the WebSocket transport drops
    restPollInterval = setInterval(pollLatestReading, 10000);
    // Also poll immediately to get the very first reading fast
    pollLatestReading();
}

function stopReading() {
    isReading = false;
    if (chartFlowInterval) {
        clearInterval(chartFlowInterval);
        chartFlowInterval = null;
    }
    if (restPollInterval) {
        clearInterval(restPollInterval);
        restPollInterval = null;
    }

    startReadingBtn.classList.remove('btn-danger');
    startReadingBtn.classList.add('btn-primary');
    startReadingBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        <span>Start Reading</span>
    `;

    if (saveReadingBtn) {
        saveReadingBtn.style.display = 'inline-flex';
        saveReadingBtn.disabled = false;
        saveReadingBtn.style.opacity = '1';
    }
    if (saveReadingBtnMobile) {
        saveReadingBtnMobile.style.display = 'inline-flex';
        saveReadingBtnMobile.disabled = false;
        saveReadingBtnMobile.style.opacity = '1';
    }
    const generateReportBtnMobile = document.getElementById('generateReportBtnMobile');
    if (generateReportBtnMobile) {
        generateReportBtnMobile.style.display = 'flex';
        generateReportBtnMobile.disabled = sessionData.ph.length === 0;
    }
    
    showNotification('Live stream paused. You may now capture a snapshot of these values.', 'info');

    renderFountainGrid(scannedFountains);
    console.log("WebSocket Monitoring Session stopped.");
}

/**
 * Modal Management
 */
function openSelectionModal() {
    if (fountainIdInput) {
        fountainIdInput.value = '';
        fountainIdInput.style.borderColor = '#e2e8f0';
    }
    selectionModal.classList.add('open');
}

function closeSelectionModal() {
    selectionModal.classList.remove('open');
}

function buildCurrentReadingSnapshot() {
    if (sessionSnapshots.length > 0) {
        return sessionSnapshots[0];
    }

    if (
        latestTelemetry.ph === null ||
        latestTelemetry.turbidity === null ||
        latestTelemetry.temperature === null ||
        latestTelemetry.tds === null
    ) {
        return null;
    }

    const phStatus = getParameterSafetyStatus('ph', latestTelemetry.ph);
    const turbidityStatus = getParameterSafetyStatus('turbidity', latestTelemetry.turbidity);
    const temperatureStatus = getParameterSafetyStatus('temperature', latestTelemetry.temperature);
    const tdsStatus = getParameterSafetyStatus('tds', latestTelemetry.tds);
    const overall_status = [phStatus, turbidityStatus, temperatureStatus, tdsStatus].includes('CRITICAL')
        ? 'FAIL'
        : [phStatus, turbidityStatus, temperatureStatus, tdsStatus].includes('WARNING')
            ? 'WARNING'
            : 'PASS';

    return {
        timestamp: formatPhilippineDateTime(new Date()),
        ph: latestTelemetry.ph,
        ph_status: phStatus,
        turbidity: latestTelemetry.turbidity,
        turbidity_status: turbidityStatus,
        temperature: latestTelemetry.temperature,
        temperature_status: temperatureStatus,
        tds: latestTelemetry.tds,
        tds_status: tdsStatus,
        overall_status
    };
}

function formatReadingValue(value, digits, suffix = '') {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '--';
    }

    return `${Number(value).toFixed(digits)}${suffix}`;
}

function applyStatusBadge(element, status) {
    if (!element) return;

    const normalized = String(status || '').toUpperCase();
    const labelMap = {
        PASS: 'SAFE (PASS)',
        WARNING: 'WARNING',
        FAIL: 'CRITICAL (FAIL)'
    };
    const colorMap = {
        PASS: { bg: 'rgba(20, 184, 166, 0.1)', fg: '#14b8a6', border: 'rgba(20, 184, 166, 0.2)' },
        WARNING: { bg: 'rgba(217, 119, 6, 0.1)', fg: '#d97706', border: 'rgba(217, 119, 6, 0.2)' },
        FAIL: { bg: 'rgba(239, 68, 68, 0.1)', fg: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' }
    };
    const styles = colorMap[normalized] || { bg: 'rgba(148, 163, 184, 0.1)', fg: '#64748b', border: 'rgba(148, 163, 184, 0.2)' };

    element.textContent = labelMap[normalized] || '--';
    element.style.background = styles.bg;
    element.style.color = styles.fg;
    element.style.border = `1px solid ${styles.border}`;
}

function openReportModal() {
    if (!selectedFountain) return;

    const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b) / arr.length).toFixed(2) : '--';
    const currentReading = buildCurrentReadingSnapshot();
    
    const avgPhVal = avg(sessionData.ph);
    const avgTurbVal = avg(sessionData.turbidity);
    const avgTempVal = avg(sessionData.temperature);
    const avgTdsVal = avg(sessionData.tds);

    document.getElementById('reportFountainName').textContent = `${selectedFountain.displayId} - ${selectedFountain.name}`;
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('reportAvgPh').textContent = avgPhVal;
    document.getElementById('reportAvgTurb').textContent = avgTurbVal === '--' ? '--' : avgTurbVal + ' NTU';
    document.getElementById('reportAvgTemp').textContent = avgTempVal === '--' ? '--' : avgTempVal + '°C';
    document.getElementById('reportAvgTds').textContent = avgTdsVal === '--' ? '--' : avgTdsVal + ' ppm';

    const currentTimestampEl = document.getElementById('reportCurrentTimestamp');
    if (currentTimestampEl) {
        currentTimestampEl.textContent = currentReading ? currentReading.timestamp : '--';
    }
    applyStatusBadge(document.getElementById('reportCurrentStatus'), currentReading?.overall_status);
    const reportCurrentPh = document.getElementById('reportCurrentPh');
    if (reportCurrentPh) reportCurrentPh.textContent = formatReadingValue(currentReading?.ph, 2, ' pH');
    const reportCurrentTurb = document.getElementById('reportCurrentTurb');
    if (reportCurrentTurb) reportCurrentTurb.textContent = formatReadingValue(currentReading?.turbidity, 1, ' NTU');
    const reportCurrentTemp = document.getElementById('reportCurrentTemp');
    if (reportCurrentTemp) reportCurrentTemp.textContent = formatReadingValue(currentReading?.temperature, 1, '°C');
    const reportCurrentTds = document.getElementById('reportCurrentTds');
    if (reportCurrentTds) reportCurrentTds.textContent = formatReadingValue(currentReading?.tds, 0, ' ppm');

    const actionPlan = window.WQMSActionGuidance?.buildReportActionPlan?.({
        ph: avgPhVal,
        turbidity: avgTurbVal,
        temperature: avgTempVal,
        tds: avgTdsVal
    });
    
    // Calculate dynamic DOH safety badge
    const count = sessionData.ph.length;
    const isPhSafe = count > 0 && parseFloat(avgPhVal) >= 7.0 && parseFloat(avgPhVal) <= 8.0;
    const isTurbSafe = count > 0 && parseFloat(avgTurbVal) <= 5.0; // Warning threshold
    const isTempSafe = count > 0 && parseFloat(avgTempVal) <= 32.0; // Warning threshold
    const isTdsSafe = count > 0 && parseFloat(avgTdsVal) <= 500.0; // Warning threshold
    const hasCritical = actionPlan?.severity === 'critical';
    const hasWarning = actionPlan?.severity === 'warning';

    const isOverallSafe = count > 0 && !hasCritical && !hasWarning;
    const statusEl = document.getElementById('reportStatus');
    if (statusEl) {
        statusEl.textContent = isOverallSafe ? 'SAFE (PASS)' : hasWarning ? 'WARNING' : 'CRITICAL (FAIL)';
        statusEl.className = 'status-badge';
        statusEl.style.fontSize = '10px';
        statusEl.style.padding = '4px 10px';
        statusEl.style.borderRadius = '12px';
        statusEl.style.fontWeight = '700';
        statusEl.style.display = 'inline-block';
        statusEl.style.background = isOverallSafe ? 'rgba(20, 184, 166, 0.1)' : hasWarning ? 'rgba(217, 119, 6, 0.1)' : 'rgba(239, 68, 68, 0.1)';
        statusEl.style.color = isOverallSafe ? '#14b8a6' : hasWarning ? '#d97706' : '#ef4444';
        statusEl.style.border = isOverallSafe ? '1px solid rgba(20, 184, 166, 0.2)' : hasWarning ? '1px solid rgba(217, 119, 6, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
    }

    const desc = document.getElementById('reportSummaryText');
    if (desc) {
        const complianceText = actionPlan ? actionPlan.headline : `Report ready for export. This summary includes ${count} data points logged in real-time during the session.`;
        desc.textContent = `${complianceText} This summary includes ${count} data points logged in real-time during the session.`;
    }

    const actionSummary = document.getElementById('reportActionSummary');
    if (actionSummary && actionPlan) {
        actionSummary.style.display = 'block';
        actionSummary.innerHTML = `
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; font-weight: 700;">Recommended action plan</div>
            <div style="font-size: 14px; font-weight: 600; color: ${actionPlan.severity === 'critical' ? '#dc2626' : actionPlan.severity === 'warning' ? '#d97706' : '#14b8a6'}; margin-bottom: 8px;">${actionPlan.headline}</div>
            <div style="display: grid; gap: 8px;">
                ${actionPlan.actions.map(action => `<div style="padding: 10px 12px; border-radius: 10px; background: white; border: 1px solid #e2e8f0; color: #334155; font-size: 13px; line-height: 1.45;">${action}</div>`).join('')}
            </div>
        `;
    }
    
    reportModal.classList.add('open');
}

function closeReportModal() {
    reportModal.classList.remove('open');
}

/**
 * Utility for toast notifications
 */
function showNotification(message, type = 'info') {
    // Create a beautiful toast notification directly in the DOM
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.top = '24px';
        container.style.right = '24px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.zIndex = '99999';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? '#14b8a6' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#1e293b';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
    toast.style.fontFamily = 'Inter, sans-serif';
    toast.style.fontSize = '0.875rem';
    toast.style.fontWeight = '500';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 50);

    // Animate out
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);
    }, 3000);
}
