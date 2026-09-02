from flask import Blueprint, request
from models import SessionLocal, User
from datetime import datetime
from .common import api_success, api_error

auth_bp = Blueprint('auth', __name__)

def get_db():
    return SessionLocal()

from datetime import timedelta
from models import SystemSetting

# Failed login attempt tracking: { email: { 'count': int, 'locked_until': datetime } }
_failed_attempts = {}


def _get_setting_bool(db, key, default=True):
    setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
    if not setting:
        return default
    return setting.setting_value.lower() in ['true', '1', 'yes', 'on']


def _mask_phone(phone):
    if not phone or len(phone) < 7:
        return '***'
    return phone[:4] + '***' + phone[-4:]


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user/admin with 2FA and Login Attempt Limiting"""
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    portal_type = data.get('portal_type', 'user')
    
    if not email or not password:
        return api_error('Email and password are required', 400)

    try:
        db = get_db()
        login_limit_enabled = _get_setting_bool(db, 'login_limit_enabled', True)
        enable_2fa = _get_setting_bool(db, 'enable_2fa', True)

        # 1. Check Account Lockout if Login Attempt Limiting is enabled
        if login_limit_enabled:
            record = _failed_attempts.get(email)
            if record and record.get('locked_until'):
                if datetime.utcnow() < record['locked_until']:
                    db.close()
                    remaining = int((record['locked_until'] - datetime.utcnow()).total_seconds() / 60) + 1
                    return api_error(f'Account locked due to 5 consecutive failed login attempts. Please try again after {remaining} minute(s).', 403)
                else:
                    # Lock expired, reset
                    _failed_attempts.pop(email, None)

        from models import Admin
        if portal_type == 'admin':
            user = db.query(Admin).filter(Admin.email == email).first()
            if not user:
                # Check if this email exists in User table
                regular_user = db.query(User).filter(User.email == email).first()
                if regular_user:
                    db.close()
                    return api_error('Access denied. This portal is for administrators only.', 403)
        else:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                # Check if this email exists in Admin table
                admin_user = db.query(Admin).filter(Admin.email == email).first()
                if admin_user:
                    db.close()
                    return api_error('Administrators must use the admin portal to sign in.', 403)

        if user and user.check_password(password):
            # Password correct -> Reset failed attempts
            _failed_attempts.pop(email, None)

            # 2. Check Two-Factor Authentication (2FA) - Admin Accounts Only
            if enable_2fa and portal_type == 'admin' and user.phone:
                from services.sms_service import generate_and_send_phone_otp
                otp_res = generate_and_send_phone_otp(user.phone, entity_type=portal_type, entity_id=user.id)
                db.close()

                if otp_res['status'] == 'success':
                    return api_success({
                        'require_2fa': True,
                        'phone': user.phone,
                        'phone_masked': _mask_phone(user.phone),
                        'user_id': user.id,
                        'email': user.email,
                        'portal_type': portal_type
                    }, f'2FA code sent via SMS to {_mask_phone(user.phone)}')
                else:
                    return api_error(f'Failed to send 2FA SMS code: {otp_res.get("message")}', 500)

            # 2FA disabled or no phone number -> Direct login
            user.last_login = datetime.utcnow()
            db.commit()
            
            user_data = user.to_dict()
            db.close()
            return api_success(user_data, 'Login successful')

        else:
            # Invalid credentials
            if login_limit_enabled:
                record = _failed_attempts.get(email, {'count': 0, 'locked_until': None})
                record['count'] += 1
                if record['count'] >= 5:
                    record['locked_until'] = datetime.utcnow() + timedelta(minutes=1)
                    _failed_attempts[email] = record
                    if db: db.close()
                    return api_error('Account locked due to 5 consecutive failed login attempts. Please try again in 1 minute.', 403)
                else:
                    _failed_attempts[email] = record
                    remaining_attempts = 5 - record['count']
                    if db: db.close()
                    return api_error(f'Invalid credentials. {remaining_attempts} attempt(s) remaining before account lockout.', 401)
            else:
                if db: db.close()
                return api_error('Invalid credentials', 401)

    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/verify-2fa-login', methods=['POST'])
def verify_2fa_login():
    """Verify 2FA SMS OTP code to complete user/admin login"""
    try:
        data = request.get_json() or {}
        phone = data.get('phone', '').strip()
        code = data.get('code', '').strip()
        user_id = data.get('user_id')
        portal_type = data.get('portal_type', 'user')

        if not phone or not code or not user_id:
            return api_error('Phone number, user ID, and verification code are required', 400)

        from services.sms_service import verify_phone_otp
        is_valid, msg = verify_phone_otp(phone, code)

        if not is_valid:
            return api_error(msg, 400)

        db = get_db()
        if portal_type == 'admin':
            from models import Admin
            user = db.query(Admin).filter(Admin.id == user_id).first()
        else:
            user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            return api_error('User account not found', 404)

        user.last_login = datetime.utcnow()
        db.commit()

        user_data = user.to_dict()
        db.close()

        return api_success(user_data, '2FA verification successful. Welcome!')
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/logout', methods=['POST'])
def logout():
    return api_success(None, 'Successfully logged out')

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (for the signup page)"""
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not all([name, email, password]):
            return api_error('Name, email and password are required', 400)
        
        db = get_db()
        
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.close()
            return api_error('Email already registered', 400)
        
        user = User(
            name=name,
            email=email,
            role_id=4,  # Default: Viewer role
            status='Active'
        )
        user.set_password(password)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        result = user.to_dict()
        db.close()
        
        return api_success(result, 'Registration successful', 201)
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/send-phone-otp', methods=['POST'])
def send_phone_otp():
    """Send an SMS OTP code to verify a phone number change"""
    try:
        data = request.get_json() or {}
        phone = data.get('phone', '').strip()
        entity_type = data.get('entity_type', 'user')
        entity_id = data.get('entity_id')

        if not phone:
            return api_error('Phone number is required', 400)

        # Basic phone normalization check
        clean_num = ''.join(c for c in phone if c.isdigit() or c == '+')
        if len(clean_num.replace('+', '')) < 10 or len(clean_num.replace('+', '')) > 12:
            return api_error('Invalid phone number. Must be a valid 11-digit number (e.g., 09171234567 or +639171234567).', 400)

        from services.sms_service import generate_and_send_phone_otp
        res = generate_and_send_phone_otp(phone, entity_type=entity_type, entity_id=entity_id)

        if res['status'] == 'success':
            return api_success(res, res['message'])
        else:
            return api_error(res['message'], 400)
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/verify-phone-otp', methods=['POST'])
def verify_phone_otp_route():
    """Verify an SMS OTP code for a phone number change"""
    try:
        data = request.get_json() or {}
        phone = data.get('phone', '').strip()
        code = data.get('code', '').strip()

        if not phone or not code:
            return api_error('Phone number and verification code are required', 400)

        from services.sms_service import verify_phone_otp
        is_valid, msg = verify_phone_otp(phone, code)

        if is_valid:
            return api_success({'verified': True}, msg)
        else:
            return api_error(msg, 400)
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Generate and send a 6-digit OTP code to the requested email address via Resend API"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        portal_type = (data.get('portal_type') or 'user').strip().lower()

        if not email:
            return api_error('Email address is required', 400)

        db = get_db()
        if portal_type == 'admin':
            from models import Admin
            account = db.query(Admin).filter(Admin.email == email).first()
        else:
            account = db.query(User).filter(User.email == email).first()

        if not account:
            # Check the other table to see if user is on wrong portal
            from models import Admin
            alt_account = db.query(User if portal_type == 'admin' else Admin).filter((User if portal_type == 'admin' else Admin).email == email).first()
            db.close()
            if alt_account:
                return api_error("This account belongs to the other portal. Please use the appropriate login page.", 400)
            return api_error('No account found with this email address.', 404)

        from services.email_service import generate_password_reset_otp, send_password_reset_email
        otp_code = generate_password_reset_otp(email, portal_type=portal_type)
        res = send_password_reset_email(email, otp_code)
        db.close()

        masked = email[:3] + '***@' + email.split('@')[-1] if '@' in email else email
        return api_success({
            'email': email,
            'masked_email': masked,
            'status': res.get('status')
        }, f"A 6-digit verification code has been sent to {masked}. Please check your email inbox.")
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Verify the 6-digit OTP code and set a new password"""
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        code = (data.get('code') or '').strip()
        new_password = (data.get('new_password') or '').strip()
        portal_type = (data.get('portal_type') or 'user').strip().lower()

        if not email or not code or not new_password:
            return api_error('Email, verification code, and new password are required.', 400)

        if len(new_password) < 6:
            return api_error('New password must be at least 6 characters long.', 400)

        from services.email_service import verify_password_reset_otp
        is_valid, msg = verify_password_reset_otp(email, code)
        if not is_valid:
            return api_error(msg, 400)

        db = get_db()
        if portal_type == 'admin':
            from models import Admin
            account = db.query(Admin).filter(Admin.email == email).first()
        else:
            account = db.query(User).filter(User.email == email).first()

        if not account:
            db.close()
            return api_error('Account not found.', 404)

        account.set_password(new_password)
        db.commit()
        db.close()

        return api_success({'reset': True}, 'Password reset successful! You can now log in with your new password.')
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/send-email-otp', methods=['POST'])
def send_email_otp_route():
    """Send an Email OTP verification code to a new email address before updating account email"""
    try:
        data = request.get_json() or {}
        new_email = (data.get('new_email') or '').strip().lower()
        entity_type = (data.get('entity_type') or 'user').strip().lower()
        entity_id = data.get('entity_id')

        if not new_email or not entity_id:
            return api_error('New email address and account ID are required.', 400)

        if '@' not in new_email or '.' not in new_email.split('@')[-1]:
            return api_error('Invalid email address format.', 400)

        db = get_db()
        from models import User, Admin
        
        # Check if email is already taken by another user or admin
        user_exists = db.query(User).filter(User.email == new_email, User.id != (entity_id if entity_type == 'user' else 0)).first()
        admin_exists = db.query(Admin).filter(Admin.email == new_email, Admin.id != (entity_id if entity_type == 'admin' else 0)).first()
        db.close()

        if user_exists or admin_exists:
            return api_error('This email address is already registered to another account.', 400)

        from services.email_service import generate_email_change_otp, send_email_change_otp
        code = generate_email_change_otp(entity_type, entity_id, new_email)
        res = send_email_change_otp(new_email, code)

        masked = new_email[:3] + '***@' + new_email.split('@')[-1] if '@' in new_email else new_email
        return api_success(res, f"A 6-digit verification code has been sent to {masked}. Please check your email inbox.")
    except Exception as e:
        return api_error(str(e), 500)


@auth_bp.route('/verify-email-otp', methods=['POST'])
def verify_email_otp_route():
    """Verify Email OTP and update the user or admin email address in the database"""
    try:
        data = request.get_json() or {}
        new_email = (data.get('new_email') or '').strip().lower()
        code = (data.get('code') or '').strip()
        entity_type = (data.get('entity_type') or 'user').strip().lower()
        entity_id = data.get('entity_id')

        if not new_email or not code or not entity_id:
            return api_error('New email address, verification code, and account ID are required.', 400)

        from services.email_service import verify_email_change_otp
        is_valid, msg = verify_email_change_otp(entity_type, entity_id, new_email, code)
        if not is_valid:
            return api_error(msg, 400)

        db = get_db()
        from models import User, Admin
        if entity_type == 'admin':
            account = db.query(Admin).filter(Admin.id == entity_id).first()
        else:
            account = db.query(User).filter(User.id == entity_id).first()

        if not account:
            db.close()
            return api_error('Account not found.', 404)

        account.email = new_email
        db.commit()
        updated_dict = account.to_dict()
        db.close()

        return api_success(updated_dict, 'Email address updated successfully!')
    except Exception as e:
        return api_error(str(e), 500)



