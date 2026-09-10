import os
from functools import wraps
from flask import jsonify, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

SECRET_KEY = os.getenv('SECRET_KEY', 'wqms_secret_key_2025')
serializer = URLSafeTimedSerializer(SECRET_KEY)


def api_success(data=None, message=None, status_code=200):
    payload = {
        'status': 'success'
    }
    if message is not None:
        payload['message'] = message
    if data is not None:
        payload['data'] = data
    return jsonify(payload), status_code


def api_error(message, status_code=400, **extra):
    payload = {
        'status': 'error',
        'message': message
    }
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code


def generate_auth_token(user_id, role_name='User', portal_type='user'):
    """Generate a signed token containing user_id, role_name, and portal_type"""
    return serializer.dumps({
        'user_id': user_id,
        'role_name': role_name,
        'portal_type': portal_type
    })


def verify_auth_token(token, max_age=86400 * 30):  # 30 days max age
    """Verify and decode a signed auth token"""
    try:
        data = serializer.loads(token, max_age=max_age)
        return data
    except (BadSignature, SignatureExpired):
        return None


def token_required(f):
    """Decorator to enforce valid Authorization: Bearer <token> on API endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        token = None
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return api_error('Authentication token is missing. Access denied.', 401)
        
        payload = verify_auth_token(token)
        if not payload:
            return api_error('Invalid or expired authentication token. Please log in again.', 401)
        
        request.current_user = payload
        return f(*args, **kwargs)
    return decorated