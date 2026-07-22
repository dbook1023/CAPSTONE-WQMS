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
