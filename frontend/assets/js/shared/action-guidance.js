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
            return { status: 'IDEAL', label: 'Safe', value: numericValue };
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

    window.WQMSActionGuidance = {
        classifyValue,
        normalizeAlertSeverity,
        buildReportActionPlan,
        buildAlertRecommendation
    };
})();