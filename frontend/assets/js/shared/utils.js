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

/**
 * Validate 11-digit Philippine Mobile Phone Numbers (Numbers Only)
 * @param {string} phone 
 * @returns {{ valid: boolean, message?: string, cleaned?: string }}
 */
function validatePhoneNumber(phone) {
    if (!phone || !phone.trim()) {
        return { valid: true, cleaned: '' };
    }

    const digitsOnly = phone.trim().replace(/\D/g, '');

    if (!digitsOnly.startsWith('09')) {
        return {
            valid: false,
            message: 'Phone number must start with 09 (e.g. 09171234567).'
        };
    }

    if (digitsOnly.length !== 11) {
        return {
            valid: false,
            message: 'Phone number must be exactly 11 digits (e.g. 09171234567).'
        };
    }

    return { valid: true, cleaned: digitsOnly, rawDigits: digitsOnly };
}

window.validatePhoneNumber = validatePhoneNumber;

/**
 * Restrict telephone input elements to 11 digits NUMBERS ONLY
 * @param {HTMLInputElement} input 
 */
function attachPhoneInputFilter(input) {
    if (!input) return;
    input.setAttribute('maxlength', '11');
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('input', function(e) {
        let val = e.target.value;
        // Strip everything except numbers (0-9)
        let digits = val.replace(/\D/g, '');
        if (digits.length > 11) {
            digits = digits.slice(0, 11);
        }
        e.target.value = digits;
    });
}

window.attachPhoneInputFilter = attachPhoneInputFilter;

/**
 * SMS OTP Verification Modal
 * Prompts user for a 6-digit SMS verification code sent via TextBee
 */
function showPhoneOtpModal(options) {
    const { phone, entityType, entityId, onVerified, onCancel, customVerify } = options;

    const existing = document.getElementById('phoneOtpModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div class="modal-overlay open" id="phoneOtpModal" style="z-index: 3100; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px;">
            <div class="modal" style="max-width: 440px; width: 100%; background: #ffffff; border-radius: 24px; padding: 32px 28px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                <div style="width: 56px; height: 56px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                        <line x1="12" y1="18" x2="12.01" y2="18"></line>
                    </svg>
                </div>
                <h3 style="font-family: 'Poppins', sans-serif; font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0 0 8px;">SMS Verification Required</h3>
                <p style="font-size: 0.875rem; color: #64748b; line-height: 1.5; margin: 0 0 20px;">
                    We sent a 6-digit verification code to <strong id="otpPhoneDisplay" style="color: #0284c7;">${Sanitizer.escapeHTML(phone)}</strong>. Enter it below to confirm your phone number change.
                </p>

                <div style="margin: 20px 0;">
                    <input type="text" id="otpCodeInput" maxlength="6" placeholder="123456" autocomplete="off"
                           style="font-family: 'Inter', monospace; font-size: 1.6rem; font-weight: 700; letter-spacing: 8px; text-align: center; width: 100%; padding: 12px; border: 2px solid #cbd5e1; border-radius: 12px; outline: none; transition: border-color 0.2s;" />
                    <div id="otpErrorText" style="color: #ef4444; font-size: 0.825rem; font-weight: 500; margin-top: 8px; min-height: 18px; display: none;"></div>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="button" class="btn btn-ghost" id="otpCancelBtn" style="flex: 1; border-radius: 12px; padding: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; text-align: center;">Cancel</button>
                    <button type="button" class="btn btn-primary" id="otpVerifyBtn" style="flex: 1; background: #0284c7; border-radius: 12px; padding: 12px; font-weight: 600; color: white; border: none; display: flex; align-items: center; justify-content: center; text-align: center;">Verify</button>
                </div>

                <div style="margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <button type="button" id="otpResendBtn" style="background: none; border: none; font-size: 0.8rem; color: #0284c7; font-weight: 600; cursor: pointer; text-decoration: underline;">
                        Resend Code
                    </button>
                    <span id="otpTimerText" style="font-size: 0.8rem; color: #94a3b8;"></span>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('phoneOtpModal');
    const input = document.getElementById('otpCodeInput');
    const errorText = document.getElementById('otpErrorText');
    const verifyBtn = document.getElementById('otpVerifyBtn');
    const cancelBtn = document.getElementById('otpCancelBtn');
    const resendBtn = document.getElementById('otpResendBtn');
    const timerText = document.getElementById('otpTimerText');

    let cooldown = 30;
    let timerInterval = null;

    const startTimer = () => {
        cooldown = 30;
        resendBtn.style.pointerEvents = 'none';
        resendBtn.style.opacity = '0.5';
        timerText.textContent = `(${cooldown}s)`;

        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            cooldown--;
            if (cooldown <= 0) {
                clearInterval(timerInterval);
                timerText.textContent = '';
                resendBtn.style.pointerEvents = 'auto';
                resendBtn.style.opacity = '1';
            } else {
                timerText.textContent = `(${cooldown}s)`;
            }
        }, 1000);
    };

    startTimer();

    input.focus();
    input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        errorText.style.display = 'none';
    });

    API.auth.sendPhoneOtp({ phone, entity_type: entityType, entity_id: entityId }).catch(err => {
        errorText.textContent = err.message || 'Failed to send SMS code.';
        errorText.style.display = 'block';
    });

    const closeModal = () => {
        if (timerInterval) clearInterval(timerInterval);
        modal.remove();
    };

    cancelBtn.onclick = () => {
        closeModal();
        if (onCancel) onCancel();
    };

    resendBtn.onclick = async () => {
        errorText.style.display = 'none';
        resendBtn.textContent = 'Sending...';
        try {
            await API.auth.sendPhoneOtp({ phone, entity_type: entityType, entity_id: entityId });
            resendBtn.textContent = 'Resend Code';
            startTimer();
            if (typeof showToast === 'function') showToast('New code sent via SMS!', 'success');
        } catch (err) {
            resendBtn.textContent = 'Resend Code';
            errorText.textContent = err.message || 'Failed to resend code.';
            errorText.style.display = 'block';
        }
    };

    verifyBtn.onclick = async () => {
        const code = input.value.trim();
        if (code.length !== 6) {
            errorText.textContent = 'Please enter the 6-digit verification code.';
            errorText.style.display = 'block';
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying...';

        try {
            if (typeof customVerify === 'function') {
                await customVerify(code);
            } else {
                await API.auth.verifyPhoneOtp({ phone, code });
            }
            closeModal();
            if (onVerified) onVerified(code);
        } catch (err) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
            errorText.textContent = err.message || 'Invalid code. Please try again.';
            errorText.style.display = 'block';
        }
    };
}

window.showPhoneOtpModal = showPhoneOtpModal;

/**
 * Safely parse a date string from server (handles UTC ISO strings without Z)
 * @param {string|Date} dateStr 
 * @returns {Date|null}
 */
function parseServerDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const trimmed = String(dateStr).trim();
    if (!trimmed) return null;
    const hasTimezone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
    const isIsoLocal = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(trimmed);
    const isoString = (isIsoLocal && !hasTimezone) ? `${trimmed.replace(' ', 'T')}Z` : trimmed;
    const dt = new Date(isoString);
    return Number.isNaN(dt.getTime()) ? null : dt;
}

/**
 * Format date string to local locale string with date and time
 * @param {string|Date} dateStr 
 * @returns {string}
 */
function formatDateTime(dateStr) {
    const dt = parseServerDate(dateStr);
    if (!dt) return 'Never logged in';
    return dt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

window.parseServerDate = parseServerDate;
window.formatDateTime = formatDateTime;


