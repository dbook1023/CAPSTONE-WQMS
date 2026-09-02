"""
Resend Email Notification Service
Handles sending emails via the Resend REST API for:
1. Password Reset OTP codes
2. Admin notifications when users submit compliance reports
"""

import os
import random
import string
import secrets
import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Resend API Configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
RESEND_FROM_EMAIL = os.getenv('RESEND_FROM_EMAIL', 'Aqua Monitor <onboarding@resend.dev>')

# In-memory store for Password Reset Tokens: { token_str: { 'email': '...', 'portal_type': 'user', 'expires_at': datetime } }
_reset_tokens = {}

# In-memory store for Email Change OTPs: { "user_1": { 'new_email': '...', 'code': '123456', 'expires_at': datetime } }
_email_change_otps = {}


def send_email(to_addresses, subject, html_content):
    """
    Send an email via Resend API.

    Args:
        to_addresses (list[str] | str): Single email address or list of email addresses
        subject (str): Email subject line
        html_content (str): HTML body of the email

    Returns:
        dict: Resend API response JSON or error dictionary
    """
    if isinstance(to_addresses, str):
        to_addresses = [to_addresses]

    if not RESEND_API_KEY:
        logger.warning('RESEND_API_KEY not configured in environment. Skipping email dispatch.')
        print(f"[Resend Email Mock] To: {to_addresses} | Subject: {subject}")
        return {'status': 'skipped', 'reason': 'RESEND_API_KEY not set'}

    url = 'https://api.resend.com/emails'
    headers = {
        'Authorization': f'Bearer {RESEND_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'from': RESEND_FROM_EMAIL,
        'to': to_addresses,
        'subject': subject,
        'html': html_content
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        logger.info(f"Email sent successfully via Resend to {to_addresses}")
        return {'status': 'sent', 'data': data}
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            try:
                err_json = e.response.json()
                if 'message' in err_json:
                    error_msg = err_json['message']
            except Exception:
                pass
        logger.error(f"Failed to send email via Resend: {error_msg}")
        return {'status': 'error', 'reason': error_msg}


def generate_password_reset_token(email, portal_type='user'):
    """Generate a secure url-safe token valid for 30 minutes"""
    token = secrets.token_urlsafe(32)
    _reset_tokens[token] = {
        'email': email.lower(),
        'portal_type': portal_type,
        'expires_at': datetime.utcnow() + timedelta(minutes=30)
    }
    return token


def verify_password_reset_token(token):
    """Verify if the token exists and is not expired"""
    if not token:
        return False, "Reset token is required."

    record = _reset_tokens.get(token)
    if not record:
        return False, "This password reset link is invalid or has already been used."

    if datetime.utcnow() > record['expires_at']:
        _reset_tokens.pop(token, None)
        return False, "This password reset link has expired. Please request a new link."

    return True, record


def consume_password_reset_token(token):
    """Validate and consume the token so it cannot be re-used"""
    is_valid, res = verify_password_reset_token(token)
    if not is_valid:
        return False, res, None

    record = _reset_tokens.pop(token, None)
    return True, "Token valid.", record


def generate_email_change_otp(entity_type, entity_id, new_email):
    """Generate a 6-digit numeric OTP code valid for 15 minutes for changing email address"""
    code = ''.join(random.choices(string.digits, k=6))
    key = f"{entity_type}_{entity_id}"
    _email_change_otps[key] = {
        'new_email': new_email.lower(),
        'code': code,
        'expires_at': datetime.utcnow() + timedelta(minutes=15)
    }
    return code


def verify_email_change_otp(entity_type, entity_id, new_email, code):
    """Verify if the email change OTP code is valid and not expired"""
    key = f"{entity_type}_{entity_id}"
    record = _email_change_otps.get(key)
    if not record:
        return False, "No email change verification requested or request has expired."

    if record['new_email'] != new_email.lower():
        return False, "The email address does not match the pending verification request."

    if datetime.utcnow() > record['expires_at']:
        _email_change_otps.pop(key, None)
        return False, "Verification code has expired. Please request a new code."

    if record['code'] != code.strip():
        return False, "Invalid verification code. Please check your inbox and try again."

    # OTP is valid — consume it
    _email_change_otps.pop(key, None)
    return True, "Email verification successful."


def send_email_change_otp(new_email, code):
    """Send a stylized email change OTP verification email to the new email address"""
    subject = "Aqua Monitor - Verify Your New Email Address"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }}
            .title {{ font-size: 22px; font-weight: 700; color: #0f172a; margin: 12px 0 4px; }}
            .otp-box {{ background: #f0fdf4; border: 2px dashed #14b8a6; border-radius: 12px; text-align: center; padding: 20px; margin: 24px 0; }}
            .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0d9488; font-family: monospace; }}
            .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="color: #14b8a6; margin:0;">💧 Aqua Monitor WQMS</h2>
                <div class="title">Verify New Email Address</div>
            </div>
            <p>You requested to update your primary email address for your Aqua Monitor account to <strong>{new_email}</strong>.</p>
            <p>Use the 6-digit verification code below to complete your email address update:</p>
            <div class="otp-box">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; font-weight: 600;">Verification Code</div>
                <div class="otp-code">{code}</div>
            </div>
            <p style="font-size: 13px; color: #64748b;">This code will expire in <strong>15 minutes</strong>. If you did not initiate this request, please secure your account immediately.</p>
            <div class="footer">
                &copy; 2026 Aqua Monitor - Water Quality Monitoring System. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(new_email, subject, html_content)



def send_password_reset_email(email, reset_token, portal_type='user', origin_url=None):
    """Send a stylized email containing a secure password reset link"""
    subject = "Aqua Monitor - Reset Your Password"
    
    # Determine base portal page
    page = "admin-login.html" if portal_type == 'admin' else "login.html"
    base = origin_url.rstrip('/') if origin_url else "https://wqms.tech"
    if portal_type == 'admin' and not base.endswith('/frontend/admin'):
        reset_link = f"{base}/frontend/admin/{page}?reset_token={reset_token}"
    else:
        reset_link = f"{base}/{page}?reset_token={reset_token}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ text-align: center; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }}
            .title {{ font-size: 22px; font-weight: 700; color: #0f172a; margin: 12px 0 4px; }}
            .btn-box {{ text-align: center; margin: 28px 0; }}
            .reset-btn {{ display: inline-block; background: #14b8a6; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(20, 184, 166, 0.3); }}
            .link-sub {{ font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; line-height: 1.5; }}
            .footer {{ font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="color: #14b8a6; margin:0;">💧 Aqua Monitor WQMS</h2>
                <div class="title">Password Reset Request</div>
            </div>
            <p>A password reset was requested for your Aqua Monitor account (<strong>{email}</strong>).</p>
            <p>Click the button below to open the secure password reset page and create a new password:</p>
            
            <div class="btn-box">
                <a href="{reset_link}" target="_blank" class="reset-btn">Reset My Password</a>
            </div>

            <div class="link-sub">
                If the button above does not work, copy and paste this link into your web browser:<br>
                <a href="{reset_link}" style="color: #14b8a6;">{reset_link}</a>
            </div>

            <p style="font-size: 13px; color: #64748b; margin-top: 20px;">This secure link is valid for <strong>30 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
            <div class="footer">
                &copy; 2026 Aqua Monitor - Water Quality Monitoring System. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(email, subject, html_content)


def notify_admins_report_submitted_email(db, report, fountain, user):
    """
    Send an email notification to all System Administrators when a compliance report is submitted.
    """
    try:
        from models import Admin
        admins = db.query(Admin).all()
        admin_emails = [a.email for a in admins if a.email]

        if not admin_emails:
            logger.warning("No admin emails found to send report submission email notification.")
            return {'status': 'skipped', 'reason': 'No admin emails'}

        fountain_name = fountain.name if fountain else f"Fountain #{report.fountain_id}"
        fountain_loc = fountain.location if fountain else "Main Campus"
        user_name = user.name if user else f"User #{report.user_id}"

        status_color = "#14b8a6" if report.compliance_status in ["PASS", "Safe", "Compliant"] else "#dc2626"

        subject = f"[WQMS Alert] New Compliance Report - {fountain_name} ({report.compliance_status})"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; }}
                .header {{ border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; }}
                .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: 700; font-size: 12px; background: {status_color}; }}
                .metrics-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; background: #f8fafc; padding: 16px; border-radius: 12px; }}
                .metric-item {{ font-size: 13px; }}
                .metric-label {{ color: #64748b; font-size: 11px; text-transform: uppercase; }}
                .metric-val {{ font-weight: 700; color: #0f172a; font-size: 15px; }}
                .footer {{ font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="color: #0f172a; margin: 0 0 6px;">💧 New Water Quality Compliance Report</h2>
                    <span class="badge">{report.compliance_status}</span>
                </div>
                <p>A new water quality monitoring compliance report has been submitted to the WQMS system.</p>

                <div style="margin-bottom: 16px; font-size: 14px; line-height: 1.6;">
                    <strong>Fountain:</strong> {fountain_name} ({fountain_loc})<br>
                    <strong>Submitted By:</strong> {user_name}<br>
                    <strong>Report Code:</strong> <code>{report.report_code or f"REP-{report.id}"}</code><br>
                    <strong>Date & Time:</strong> {report.created_at.strftime('%B %d, %Y at %I:%M %p') if report.created_at else 'Just now'}
                </div>

                <div class="metrics-grid">
                    <div class="metric-item">
                        <div class="metric-label">Average pH</div>
                        <div class="metric-val">{report.ph_level or '--'}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Turbidity (NTU)</div>
                        <div class="metric-val">{report.turbidity or '--'}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">Temperature (&deg;C)</div>
                        <div class="metric-val">{report.temperature or '--'}</div>
                    </div>
                    <div class="metric-item">
                        <div class="metric-label">TDS (ppm)</div>
                        <div class="metric-val">{report.tds_level or '--'}</div>
                    </div>
                </div>

                <p style="font-size: 13px; color: #475569;">Log in to the Admin Dashboard to view full analytics and historical compliance trends.</p>

                <div class="footer">
                    Aqua Monitor Automated Notification System &bull; Resend API Integration
                </div>
            </div>
        </body>
        </html>
        """
        return send_email(admin_emails, subject, html_content)
    except Exception as e:
        logger.error(f"Error sending admin email notification for report: {e}")
        return {'status': 'error', 'reason': str(e)}
