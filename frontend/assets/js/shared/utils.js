/**
 * Form Sanitation Utilities
 * Prevents XSS and cleans user input
 */

const Sanitizer = {
    /**
     * Escape HTML special characters
     * @param {string} str 
     * @returns {string}
     */
    escapeHTML: function(str) {
        if (str === null || str === undefined) return '';
        if (typeof str !== 'string') str = String(str);
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Trim and clean basic text input
     * @param {string} str 
     * @returns {string}
     */
    cleanInput: function(str) {
        if (typeof str !== 'string') return str;
        return str.trim();
    },

    /**
     * Sanitize an entire object (usually from form data)
     * @param {Object} data 
     * @returns {Object}
     */
    sanitizeObject: function(data) {
        const sanitized = {};
        for (const key in data) {
            if (typeof data[key] === 'string') {
                sanitized[key] = this.cleanInput(this.escapeHTML(data[key]));
            } else {
                sanitized[key] = data[key];
            }
        }
        return sanitized;
    }
};

// Export for global use
window.Sanitizer = Sanitizer;

/**
 * Format report ID to standard WQMS format: WQMS + YEAR + MONTH + DAY + REPORT_NUMBER
 * Example: WQMS202607280001
 * @param {number|string} id 
 * @param {string|Date} [createdAt] 
 * @returns {string}
 */
function formatReportId(id, createdAt) {
    if (id === null || id === undefined || id === '') return '';
    const strId = String(id).trim();
    if (strId.startsWith('WQMS')) return strId;
    
    let dt;
    if (createdAt) {
        if (createdAt instanceof Date) {
            dt = createdAt;
        } else if (typeof createdAt === 'string') {
            const trimmed = createdAt.trim();
            const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
            const isIsoLocal = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed);
            dt = new Date(isIsoLocal && !hasTimezone ? `${trimmed}Z` : trimmed);
        } else {
            dt = new Date(createdAt);
        }
    } else {
        dt = new Date();
    }

    if (Number.isNaN(dt.getTime())) dt = new Date();
    
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const reportNum = strId.padStart(4, '0');
    
    return `WQMS${year}${month}${day}${reportNum}`;
}

window.formatReportId = formatReportId;

