from flask import Blueprint, request
from models import SessionLocal, Admin
from .common import api_success, api_error

admins_bp = Blueprint('admins', __name__)

def get_db():
    return SessionLocal()

@admins_bp.route('/', methods=['GET'])
def index():
    """List all admins"""
    try:
        db = get_db()
        admins = db.query(Admin).all()
        result = [admin.to_dict() for admin in admins]
        db.close()
        return api_success(result, 'Admins retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@admins_bp.route('/', methods=['POST'])
def store():
    """Create a new admin"""
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        if not all([name, email, password]):
            return api_error('Missing required fields', 400)

        db = get_db()
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            db.close()
            return api_error('Email already exists', 400)

        admin = Admin(
            name=name,
            email=email,
            status=data.get('status', 'Active'),
            branch=data.get('branch', 'General'),
            branch_code=data.get('branch_code', 'GEN'),
            job_title=data.get('job_title', 'System Administrator')
        )
        admin.set_password(password)

        db.add(admin)
        db.commit()
        db.refresh(admin)

        res = admin.to_dict()
        db.close()
        return api_success(res, 'Admin created successfully', 201)
    except Exception as e:
        return api_error(str(e), 500)

@admins_bp.route('/<int:id>', methods=['GET'])
def show(id):
    try:
        db = get_db()
        admin = db.query(Admin).filter(Admin.id == id).first()
        if not admin:
            db.close()
            return api_error('Admin not found', 404)
        res = admin.to_dict()
        db.close()
        return api_success(res, 'Admin retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

@admins_bp.route('/<int:id>', methods=['PUT'])
def update(id):
    try:
        data = request.get_json()
        db = get_db()
        admin = db.query(Admin).filter(Admin.id == id).first()
        if not admin:
            db.close()
            return api_error('Admin not found', 404)

        if 'name' in data:
            admin.name = data['name']
        if 'email' in data:
            admin.email = data['email']
        if 'status' in data:
            admin.status = data['status']
        if 'branch' in data:
            admin.branch = data['branch']
        if 'branch_code' in data:
            admin.branch_code = data['branch_code']
        if 'phone' in data:
            admin.phone = data['phone']
        if 'avatar' in data:
            admin.avatar = data['avatar'] if data['avatar'] else None
        if 'job_title' in data:
            admin.job_title = data['job_title']
            
        if 'current_password' in data and 'new_password' in data:
            if not admin.check_password(data['current_password']):
                db.close()
                return api_error('Incorrect current password', 400)
            admin.set_password(data['new_password'])

        db.commit()
        db.refresh(admin)
        res = admin.to_dict()
        db.close()
        return api_success(res, 'Admin updated successfully')
    except Exception as e:
        return api_error(str(e), 500)

@admins_bp.route('/<int:id>', methods=['DELETE'])
def destroy(id):
    try:
        db = get_db()
        admin = db.query(Admin).filter(Admin.id == id).first()
        if not admin:
            db.close()
            return api_error('Admin not found', 404)
        db.delete(admin)
        db.commit()
        db.close()
        return api_success(None, 'Admin deleted successfully')
    except Exception as e:
        return api_error(str(e), 500)
