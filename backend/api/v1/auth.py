from flask import Blueprint, request
from models import SessionLocal, User
from datetime import datetime
from .common import api_success, api_error

auth_bp = Blueprint('auth', __name__)

def get_db():
    return SessionLocal()

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user/admin and return session data"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    portal_type = data.get('portal_type', 'user')
    
    if not email or not password:
        return api_error('Email and password are required', 400)

    try:
        db = get_db()
        if portal_type == 'admin':
            from models import Admin
            user = db.query(Admin).filter(Admin.email == email).first()
        else:
            user = db.query(User).filter(User.email == email).first()
        
        if user and user.check_password(password):
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            user_data = user.to_dict()
            db.close()
            
            return api_success(user_data, 'Login successful')
        else:
            if db: db.close()
            return api_error('Invalid credentials', 401)
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
