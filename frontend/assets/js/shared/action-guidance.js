(() => {
    const WATER_STANDARDS = {
        ph: {
            label: 'pH',
            unit: '',
            idealMin: 6.5,
            idealMax: 8.5,
            warningMin: 6.35,
            warningMax: 9.0
        },
        turbidity: {
            label: 'Turbidity',
            unit: 'NTU',
            idealMin: 0.0,
            idealMax: 5.0,
            warningMin: 0.0,
            warningMax: 5.5
        },
        temperature: {
            label: 'Temperature',
            unit: '°C',
            idealMin: 15.0,
            idealMax: 30.0,
            warningMin: 13.5,
            warningMax: 33.0
        },
        tds: {
            label: 'TDS',
            unit: 'ppm',
            idealMin: 0.0,
            idealMax: 500.0,
            warningMin: 0.0,
            warningMax: 550.0
        }
    };

    const ALERT_ACTIONS = {
        ph: {
            critical: 'Stop use immediately, check source water chemistry, sanitize the line, and retest before reopening.',
            warning: 'Flush the fountain, verify the source water balance, and retest the pH before the next shift.'
        },
        turbidity: {
            critical: 'Suspend dispensing, inspect or replace filters, flush the line, and verify the water has cleared.',
            warning: 'Inspect the filter, flush the fountain, and confirm the turbidity returns to the safe band.'
        },
        temperature: {
            critical: '<strong>Check the cooling or storage conditions, keep the fountain offline if needed, and retest after correction.</strong>',
            warning: 'Monitor temperature closely, verify ambient conditions, and retest after a short interval.'
        },
        tds: {
            critical: 'Do not allow normal use, inspect the filtration system, and retest after maintenance.',
            warning: 'Check filter saturation and mineral buildup, then retest once the system has stabilized.'
        }
    };

    function classifyValue(key, value) {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
            return { status: 'CRITICAL', label: 'Invalid value', value: value };
        }

        const standard = WATER_STANDARDS[key];
        if (!standard) {
            return { status: 'IDEAL', label: 'No rule available', value: numericValue };
        }

        if (numericValue >= standard.idealMin && numericValue <= standard.idealMax) {
            return { status: 'IDEAL', label: 'Drinkable', value: numericValue };
        }

        if (numericValue >= standard.warningMin && numericValue <= standard.warningMax) {
            return { status: 'WARNING', label: 'Warning', value: numericValue };
        }

        return { status: 'CRITICAL', label: 'Critical', value: numericValue };
    }

    function normalizeAlertSeverity(severity) {
        const value = String(severity || '').trim().toLowerCase();

        if (value === 'critical' || value === 'high') {
            return 'critical';
        }

        if (value === 'warning' || value === 'medium') {
            return 'warning';
        }

        if (value === 'safe' || value === 'low' || value === 'info') {
            return 'safe';
        }

        return value || 'safe';
    }

    function getParameterAction(key, status) {
        const fallback = status === 'CRITICAL'
            ? 'Hold the fountain offline until a technician confirms the reading is back in range.'
            : 'Continue routine monitoring and retest if the reading drifts.';

        const parameterActions = ALERT_ACTIONS[key];
        if (!parameterActions) {
            return fallback;
        }

        if (status === 'CRITICAL') {
            return parameterActions.critical;
        }

        if (status === 'WARNING') {
            return parameterActions.warning;
        }

        return 'No immediate corrective action required.';
    }

    function buildReportActionPlan(readings) {
        const items = [
            { key: 'ph', label: 'pH', value: readings.ph },
            { key: 'turbidity', label: 'Turbidity', value: readings.turbidity },
            { key: 'temperature', label: 'Temperature', value: readings.temperature },
            { key: 'tds', label: 'TDS', value: readings.tds }
        ].map(item => ({
            ...item,
            classification: classifyValue(item.key, item.value)
        }));

        items.forEach(item => {
            item.action = getParameterAction(item.key, item.classification.status);
        });

        const criticalItems = items.filter(item => item.classification.status === 'CRITICAL');
        const warningItems = items.filter(item => item.classification.status === 'WARNING');

        let headline = 'All readings are within safe limits. Proceed with the report and keep routine monitoring active.';
        let severity = 'safe';
        const actions = ['Submit the report and continue standard monitoring.'];

        if (criticalItems.length > 0) {
            severity = 'critical';
            headline = `Critical findings detected in ${criticalItems.map(item => item.label).join(', ')}. Do not treat this report as PASS.`;
            actions.length = 0;
            actions.push('Mark the report as non-compliant and escalate immediately.');
            actions.push('Isolate the fountain, notify maintenance, and verify the sensor readings manually.');
            criticalItems.forEach(item => actions.push(`${item.label}: ${item.action}`));
            if (warningItems.length > 0) {
                actions.push(`Warnings also detected in ${warningItems.map(item => item.label).join(', ')}. Retest after corrective action.`);
            }
        } else if (warningItems.length > 0) {
            severity = 'warning';
            headline = `Warnings detected in ${warningItems.map(item => item.label).join(', ')}. The water is not failing, but it needs follow-up.`;
            actions.length = 0;
            actions.push('Proceed only with documented follow-up and retesting.');
            actions.push('Inspect the fountain, flush the line if needed, and schedule a quick retest.');
            warningItems.forEach(item => actions.push(`${item.label}: ${item.action}`));
        }

        return {
            severity,
            headline,
            actions,
            items,
            criticalCount: criticalItems.length,
            warningCount: warningItems.length,
            safeCount: items.length - criticalItems.length - warningItems.length
        };
    }

    function buildAlertRecommendation(alert) {
        const severity = normalizeAlertSeverity(alert?.severity || alert?.severity_category || 'info');
        const parameter = (alert?.parameter || '').toString().toLowerCase();
        const classification = severity;
        const parameterActions = ALERT_ACTIONS[parameter];

        let headline = 'No immediate corrective action required.';
        let actions = ['Archive the alert for record keeping.'];

        if (classification === 'critical') {
            headline = 'Immediate action required.';
            actions = [
                'Suspend fountain use until the condition is cleared.',
                'Notify maintenance and verify the reading manually.',
                'Retest after corrective action before reopening.'
            ];
        } else if (classification === 'warning') {
            headline = 'Follow-up needed soon.';
            actions = [
                'Inspect the fountain and schedule maintenance.',
                'Flush the line or replace the affected component if needed.',
                'Retest to confirm the reading is back in range.'
            ];
        }

        if (parameterActions?.critical && classification === 'critical') {
            actions.push(parameterActions.critical);
        } else if (parameterActions?.warning && classification === 'warning') {
            actions.push(parameterActions.warning);
        }

        return {
            severity: classification,
            headline,
            actions,
            label: WATER_STANDARDS[parameter]?.label || alert?.parameter || 'Sensor reading'
        };
    }

    function getSpikeAction(key, value, status) {
        const num = Number(value);
        if (key === 'ph') {
            return num < 6.5
                ? 'Acidity Spike: Dispensing halted. Buffer flush and source line neutralization initiated.'
                : 'Alkalinity Spike: Dispensing halted. Carbon filtration cycle and chemical balance check initiated.';
        }
        if (key === 'turbidity') {
            return 'Turbidity Spike: Dispensing halted. Line backwash, sediment flush, and filter cartridge replacement initiated.';
        }
        if (key === 'tds') {
            return 'High Dissolved Solids Spike: Dispensing halted. Membrane filtration check and reverse osmosis inspection logged.';
        }
        if (key === 'temperature' || key === 'temp') {
            return num < 15.0
                ? 'Overcooling Spike: Chiller thermostat regulated and thermal heating elements inspected.'
                : 'Thermal Spike: Chiller cooling unit serviced, compressor cycled, and ambient airflow restored.';
        }
        return 'Threshold Excursion: System inspection logged and corrective intervention initiated.';
    }

    function getNormalizationAction(key, value) {
        if (key === 'ph') {
            return 'pH Normalization: Potable chemical equilibrium re-established (6.5–8.5). Safe operation confirmed and continuous monitoring resumed.';
        }
        if (key === 'turbidity') {
            return 'Clarity Normalization: Water clarity returned to safe standard (<=5.0 NTU). Filtration line verified clear and normal dispensing restored.';
        }
        if (key === 'tds') {
            return 'TDS Normalization: Dissolved solids stabilized within permissible standard (<=500 ppm). Ion balance confirmed; normal dispensing restored.';
        }
        if (key === 'temperature' || key === 'temp') {
            return 'Temperature Normalization: Water temperature returned to standard drinking range (15.0–30.0°C). System operation validated.';
        }
        return 'Stabilization: Telemetry returned to standard compliance band. Continuous monitoring active.';
    }

    function computeSpikeEvents(logs) {
        if (!Array.isArray(logs) || logs.length === 0) return [];
        const sorted = [...logs].sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return ta - tb;
        });

        const events = [];
        const prevStatus = { ph: 'IDEAL', turbidity: 'IDEAL', temperature: 'IDEAL', tds: 'IDEAL' };

        const paramConfigs = [
            { key: 'ph', name: 'pH', unit: ' pH' },
            { key: 'turbidity', name: 'Turbidity', unit: ' NTU' },
            { key: 'temperature', name: 'Temperature', unit: '°C' },
            { key: 'tds', name: 'TDS', unit: ' ppm' }
        ];

        sorted.forEach(log => {
            const rawTs = log.timestamp || log.created_at;
            const dt = rawTs ? new Date(rawTs) : new Date();
            const timeStr = !isNaN(dt.getTime())
                ? dt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                : '--:--';

            paramConfigs.forEach(cfg => {
                let rawVal = log[cfg.key];
                if (rawVal === undefined || rawVal === null) {
                    if (cfg.key === 'turbidity' && log.ntu !== undefined) rawVal = log.ntu;
                    if (cfg.key === 'temperature' && log.temp !== undefined) rawVal = log.temp;
                }
                const num = parseFloat(rawVal);
                if (isNaN(num)) return;

                const classification = classifyValue(cfg.key, num);
                const curStatus = classification.status;
                const lastStatus = prevStatus[cfg.key] || 'IDEAL';

                if (lastStatus === 'IDEAL' && (curStatus === 'WARNING' || curStatus === 'CRITICAL')) {
                    events.push({
                        time: timeStr,
                        paramKey: cfg.key,
                        paramName: cfg.name,
                        type: 'SPIKE',
                        status: curStatus,
                        valFormatted: (cfg.key === 'tds' ? Math.round(num) : num.toFixed(2)) + cfg.unit,
                        action: getSpikeAction(cfg.key, num, curStatus)
                    });
                } else if ((lastStatus === 'WARNING' || lastStatus === 'CRITICAL') && curStatus === 'IDEAL') {
                    events.push({
                        time: timeStr,
                        paramKey: cfg.key,
                        paramName: cfg.name,
                        type: 'NORMALIZED',
                        status: 'IDEAL',
                        valFormatted: (cfg.key === 'tds' ? Math.round(num) : num.toFixed(2)) + cfg.unit,
                        action: getNormalizationAction(cfg.key, num)
                    });
                }
                prevStatus[cfg.key] = curStatus;
            });
        });

        return events;
    }

    function renderEventTimelineHtml(events) {
        if (!events || events.length === 0) {
            return `
                <div style="border: 1px dashed #10b981; background: #ecfdf5; border-radius: 4px; padding: 4px 8px; margin-bottom: 5px; display: flex; align-items: center; gap: 7px;">
                    <span style="font-size: 11px;">🛡️</span>
                    <div>
                        <div style="font-size: 7.5px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.04em;">Zero Threshold Excursions Recorded</div>
                        <div style="font-size: 7px; color: #047857; line-height: 1.25;">All monitored readings remained strictly within DOH PNSDW safe tolerances throughout this period. No abnormal spikes or corrective interventions were triggered.</div>
                    </div>
                </div>
            `;
        }

        const displayed = events.slice(-6);
        const rows = displayed.map(e => {
            const isSpike = e.type === 'SPIKE';
            const badgeBg = isSpike ? (e.status === 'CRITICAL' ? 'rgba(220, 38, 38, 0.12)' : 'rgba(217, 119, 6, 0.12)') : 'rgba(16, 185, 129, 0.12)';
            const badgeColor = isSpike ? (e.status === 'CRITICAL' ? '#dc2626' : '#d97706') : '#059669';
            const badgeText = isSpike ? '⚠️ SPIKE' : '✅ NORMALIZED';

            return `
                <tr>
                    <td style="padding: 2px 4px; font-size: 7px; border: 1px solid #e2e8f0; font-weight: 600; color: #334155; white-space: nowrap;">${e.time}</td>
                    <td style="padding: 2px 4px; font-size: 7px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${e.paramName}</td>
                    <td style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #e2e8f0; text-align: center; white-space: nowrap;">
                        <span style="display: inline-block; padding: 1px 3px; border-radius: 2px; font-weight: 700; background: ${badgeBg}; color: ${badgeColor};">${badgeText}</span>
                    </td>
                    <td style="padding: 2px 4px; font-size: 7px; border: 1px solid #e2e8f0; font-weight: 700; text-align: right; color: ${badgeColor}; white-space: nowrap;">${e.valFormatted}</td>
                    <td style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #e2e8f0; color: #334155; line-height: 1.2;">${e.action}</td>
                </tr>
            `;
        }).join('');

        return `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; background: #ffffff;">
                <thead>
                    <tr style="background: #f1f5f9;">
                        <th style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; text-align: left; width: 62px;">Event Time</th>
                        <th style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; text-align: left; width: 55px;">Parameter</th>
                        <th style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; text-align: center; width: 75px;">Event Type</th>
                        <th style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; text-align: right; width: 50px;">Reading</th>
                        <th style="padding: 2px 4px; font-size: 6.5px; border: 1px solid #cbd5e1; color: #475569; text-transform: uppercase; text-align: left;">Action Taken / Corrective Maintenance Log</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    window.WQMSActionGuidance = {
        classifyValue,
        normalizeAlertSeverity,
        buildReportActionPlan,
        buildAlertRecommendation,
        getSpikeAction,
        getNormalizationAction,
        computeSpikeEvents,
        renderEventTimelineHtml
    };
})();