from flask import Blueprint, request
from models import SessionLocal, User, Admin
from datetime import datetime
from .common import api_success, api_error, token_required, admin_required

users_bp = Blueprint('users', __name__)

def get_db():
    return SessionLocal()

@users_bp.route('/', methods=['GET'])
@admin_required
def index():
    """List users; admins only."""
    try:
        db = get_db()
        users = db.query(User).all()
        result = [user.to_dict() for user in users]
        db.close()
        return api_success(result, 'Users retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/', methods=['POST'])
@admin_required
def store():
    """Create a new user (admins only)"""
    try:
        data = request.get_json() or {}
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role_id = data.get('role_id', 2)

        if not name or not email:
            return api_error('Name and email are required', 400)
        
        if not password:
            first_name = name.split()[0] if name else 'User'
            clean_fn = ''.join(c for c in first_name if c.isalpha()).title() or 'User'
            day_dd = datetime.utcnow().strftime('%d')
            password = f"@{clean_fn}{day_dd}"
        
        db = get_db()
        
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            db.close()
            return api_error('Email already exists', 400)
        
        user = User(
            name=name,
            email=email,
            role_id=role_id,
            status='Active',
            branch=data.get('branch', 'General'),
            branch_code=data.get('branch_code', 'GEN')
        )
        user.set_password(password)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        result = user.to_dict()
        db.close()
        
        return api_success(result, 'User created successfully', 201)
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/<int:id>', methods=['GET'])
@token_required
def show(id):
    """Get specific user (with IDOR ownership check)"""
    current_user = getattr(request, 'current_user', {})
    current_id = current_user.get('user_id')
    portal_type = current_user.get('portal_type')

    if current_id != id and portal_type != 'admin':
        return api_error('Access denied. You cannot view another user\'s profile.', 403)

    try:
        db = get_db()
        user = db.query(User).filter(User.id == id).first()
        
        if not user:
            db.close()
            return api_error('User not found', 404)
        
        result = user.to_dict()
        db.close()
        return api_success(result, 'User retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update(id):
    """Update a user (with IDOR ownership check)"""
    current_user = getattr(request, 'current_user', {})
    current_id = current_user.get('user_id')
    portal_type = current_user.get('portal_type')

    if current_id != id and portal_type != 'admin':
        return api_error('Access denied. You cannot modify another user\'s profile.', 403)

    try:
        data = request.get_json() or {}
        db = get_db()
        
        user = db.query(User).filter(User.id == id).first()
        if not user:
            db.close()
            return api_error('User not found', 404)
        
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'role_id' in data and portal_type == 'admin':
            user.role_id = data['role_id']
        if 'status' in data and portal_type == 'admin':
            user.status = data['status']
        if 'phone' in data:
            user.phone = data['phone']
        if 'branch' in data:
            user.branch = data['branch']
        if 'branch_code' in data:
            user.branch_code = data['branch_code']
        if 'avatar' in data:
            user.avatar = data['avatar'] if data['avatar'] else None
            
        if 'current_password' in data and 'new_password' in data:
            if not user.check_password(data['current_password']):
                db.close()
                return api_error('Incorrect current password', 400)
            user.set_password(data['new_password'])
        
        db.commit()
        db.refresh(user)
        
        result = user.to_dict()
        db.close()
        
        return api_success(result, 'User updated successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def destroy(id):
    """Delete a user (admins only)"""
    try:
        db = get_db()
        user = db.query(User).filter(User.id == id).first()
        
        if not user:
            db.close()
            return api_error('User not found', 404)
        
        db.delete(user)
        db.commit()
        db.close()
        
        return api_success(None, 'User deleted successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/activity', methods=['GET'])
@token_required
def get_user_activity():
    """Get recent system activity"""
    try:
        from models import AuditLog
        db = get_db()
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()
        result = [log.to_dict() for log in logs]
        db.close()
        return api_success(result, 'Activity retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile():
    """Get current authenticated user profile using token user_id"""
    current_user = getattr(request, 'current_user', {})
    user_id = current_user.get('user_id')
    portal_type = current_user.get('portal_type', 'user')

    try:
        db = get_db()
        if portal_type == 'admin':
            user = db.query(Admin).filter(Admin.id == user_id).first()
        else:
            user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            return api_error('Authenticated user profile not found', 404)

        result = user.to_dict()
        db.close()
        return api_success(result, 'Current user retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)
