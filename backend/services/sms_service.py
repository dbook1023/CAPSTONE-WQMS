"""
TextBee SMS Notification Service
Sends SMS alerts to admins when users submit compliance reports.
"""

import os
import requests
import logging

logger = logging.getLogger(__name__)

# TextBee API Configuration
TEXTBEE_API_KEY = os.getenv('TEXTBEE_API_KEY', '')
TEXTBEE_BASE_URL = os.getenv('TEXTBEE_BASE_URL', 'https://api.textbee.dev/api/v1')
TEXTBEE_DEVICE_ID = os.getenv('TEXTBEE_DEVICE_ID', '')


def send_sms(recipients, message):
    """
    Send an SMS to one or more recipients via the TextBee API.

    Args:
        recipients (list[str]): Phone numbers in E.164 format (e.g. ['+639171234567'])
        message (str): The SMS body text

    Returns:
        dict: API response JSON on success, or error details on failure
    """
    if not TEXTBEE_API_KEY or not TEXTBEE_DEVICE_ID:
        logger.warning('TextBee SMS not configured – skipping notification')
        return {'status': 'skipped', 'reason': 'SMS not configured'}

    if not recipients:
        logger.warning('No recipients provided – skipping SMS')
        return {'status': 'skipped', 'reason': 'No recipients'}

    url = f'{TEXTBEE_BASE_URL}/gateway/send-sms'
    headers = {'x-api-key': TEXTBEE_API_KEY}
    payload = {
        'deviceId': TEXTBEE_DEVICE_ID,
        'recipients': recipients,
        'message': message,
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        result = response.json()
        logger.info(f'SMS sent successfully to {len(recipients)} recipient(s)')
        return {'status': 'sent', 'data': result}
    except requests.exceptions.Timeout:
        logger.error('TextBee API request timed out')
        return {'status': 'error', 'reason': 'Request timed out'}
    except requests.exceptions.RequestException as e:
        logger.error(f'TextBee SMS failed: {e}')
        return {'status': 'error', 'reason': str(e)}


def notify_admins_report_submitted(db, report, fountain, user):
    """
    Notify all active admins via SMS that a user has submitted a compliance report.

    Args:
        db: SQLAlchemy database session
        report: The Report model instance
        fountain: The Fountain model instance
        user: The User model instance who submitted the report
    """
    from models import Admin

    # Fetch all active admins with a phone number
    admins = db.query(Admin).filter(
        Admin.status == 'Active',
        Admin.phone.isnot(None),
        Admin.phone != ''
    ).all()

    if not admins:
        logger.info('No active admins with phone numbers found – skipping SMS')
        return {'status': 'skipped', 'reason': 'No admin recipients'}

    recipients = [admin.phone for admin in admins]

    # Build the notification message
    status_emoji = {
        'PASS': '✅',
        'WARNING': '⚠️',
        'FAIL': '🚨'
    }.get(report.overall_status, '📋')

    message = (
        f'{status_emoji} WQMS Report Submitted\n'
        f'Report: {report.get_report_code()}\n'
        f'Fountain: {fountain.name}\n'
        f'Location: {fountain.location}\n'
        f'Status: {report.overall_status}\n'
        f'Submitted by: {user.name}\n'
        f'---\n'
        f'Please review this report in the admin dashboard.'
    )

    return send_sms(recipients, message)


# ================================================================
# OTP Phone Verification Service
# ================================================================

import random
from datetime import datetime, timedelta

# In-memory store for active OTP codes: { phone_number: { 'code': str, 'expires_at': datetime, 'entity_type': str, 'entity_id': int } }
_otp_store = {}


def _normalize_phone(phone):
    if not phone:
        return ''
    cleaned = phone.strip()
    digits = ''.join(c for c in cleaned if c.isdigit())
    if len(digits) == 11 and digits.startswith('09'):
        return '+63' + digits[1:]
    if len(digits) == 12 and digits.startswith('63'):
        return '+' + digits
    if len(digits) == 10 and digits.startswith('9'):
        return '+63' + digits
    return cleaned


def generate_and_send_phone_otp(phone, entity_type='user', entity_id=None):
    """
    Generates a 6-digit verification code and sends it via SMS to the provided phone number.
    """
    clean_phone = _normalize_phone(phone)
    if not clean_phone:
        return {'status': 'error', 'message': 'Phone number is required'}

    # Generate 6-digit OTP code
    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=1)

    # Store OTP in memory
    _otp_store[clean_phone] = {
        'code': otp_code,
        'expires_at': expires_at,
        'entity_type': entity_type,
        'entity_id': entity_id
    }

    message = (
        f"🔐 WQMS Security Verification\n"
        f"Your verification code is: {otp_code}\n"
        f"Use this code to verify your account. Valid for 1 minute."
    )

    # Dispatch SMS
    sms_res = send_sms([clean_phone], message)
    
    if sms_res.get('status') in ['sent', 'skipped']:
        return {
            'status': 'success',
            'message': f'Verification code sent to {clean_phone}'
        }
    else:
        return {
            'status': 'error',
            'message': f"Failed to send SMS: {sms_res.get('reason', 'Unknown error')}"
        }


def verify_phone_otp(phone, code):
    """
    Verifies a user-submitted OTP code against active codes in the store.
    """
    clean_phone = _normalize_phone(phone)
    clean_code = str(code).strip()

    entry = _otp_store.get(clean_phone)
    if not entry:
        return False, "No active verification code found for this phone number."

    if datetime.utcnow() > entry['expires_at']:
        del _otp_store[clean_phone]
        return False, "Verification code has expired. Please request a new one."

    if entry['code'] != clean_code:
        return False, "Invalid verification code. Please check and try again."

    # Code is valid; clear it after consumption
    del _otp_store[clean_phone]
    return True, "Phone number verified successfully."


