from flask import Blueprint, request
from models import SessionLocal, User, Admin
from datetime import datetime
from .common import api_success, api_error

users_bp = Blueprint('users', __name__)

def get_db():
    return SessionLocal()

@users_bp.route('/', methods=['GET'])
def index():
    """List users; admins are returned separately via /admins."""
    try:
        db = get_db()
        users = db.query(User).all()
        result = [user.to_dict() for user in users]
        db.close()
        return api_success(result, 'Users retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@users_bp.route('/', methods=['POST'])
def store():
    """2. STORE: Create a new user"""
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role_id = data.get('role_id', 2)  # Default to Operator
        
        if not all([name, email, password]):
            return api_error('Missing required fields', 400)
        
        db = get_db()
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            db.close()
            return api_error('Email already exists', 400)
        
        # Create new user
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
def show(id):
    """3. SHOW: Get one specific user"""
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
def update(id):
    """4. UPDATE: Update a user"""
    try:
        data = request.get_json()
        db = get_db()
        
        user = db.query(User).filter(User.id == id).first()
        if not user:
            db.close()
            return api_error('User not found', 404)
        
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            user.email = data['email']
        if 'role_id' in data:
            user.role_id = data['role_id']
        if 'status' in data:
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
def destroy(id):
    """5. DESTROY: Delete a user"""
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
def get_activity():
    """6. ACTIVITY: Get recent system activity"""
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
def get_me():
    """7. ME: Get current authenticated user"""
    # In a real app with proper sessions/JWT, you'd get the ID from the token/session
    # For now, we'll simulate it by returning the first user (usually the admin)
    # or getting it from a query param if provided (for testing)
    user_id = request.args.get('id')
    try:
        db = get_db()
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        else:
            user = db.query(User).first()
        
        if not user:
            db.close()
            return api_error('No users found', 404)
            
        result = user.to_dict()
        db.close()
        return api_success(result, 'Current user retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)
