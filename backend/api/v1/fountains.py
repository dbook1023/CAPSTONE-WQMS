from flask import Blueprint, request, jsonify
from models import SessionLocal, Fountain

fountains_bp = Blueprint('fountains', __name__)

def get_db():
    return SessionLocal()

@fountains_bp.route('/', methods=['GET'])
def index():
    """1. INDEX: List all fountains"""
    try:
        db = get_db()
        fountains = db.query(Fountain).all()
        result = [f.to_dict() for f in fountains]
        db.close()
        return jsonify(result if result else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fountains_bp.route('/', methods=['POST'])
def store():
    """2. STORE: Create a new fountain"""
    try:
        data = request.get_json()
        name = data.get('name')
        location = data.get('location')
        display_id = data.get('displayId') or data.get('display_id')
        department_id = data.get('department_id', 1)
        model = data.get('model')
        status = data.get('status', 'Online')
        
        if not name or not location:
            return jsonify({"error": "Name and location are required"}), 400
            
        db = get_db()
        
        # Auto-generate display_id if not provided
        if not display_id:
            last = db.query(Fountain).order_by(Fountain.id.desc()).first()
            next_num = (last.id + 1) if last else 1
            display_id = f'F{str(next_num).zfill(3)}'
        
        fountain = Fountain(
            display_id=display_id,
            name=name,
            location=location,
            department_id=department_id,
            model=model,
            status=status
        )
        db.add(fountain)
        db.commit()
        db.refresh(fountain)
        
        result = fountain.to_dict()
        db.close()
        return jsonify({"message": f"Fountain {name} added successfully", "fountain": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fountains_bp.route('/<int:id>', methods=['GET'])
def show(id):
    """3. SHOW: Get details for one fountain"""
    try:
        db = get_db()
        fountain = db.query(Fountain).filter(Fountain.id == id).first()
        if not fountain:
            db.close()
            return jsonify({"error": "Fountain not found"}), 404
        
        result = fountain.to_dict()
        db.close()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fountains_bp.route('/<int:id>', methods=['PUT'])
def update(id):
    """4. UPDATE: Update a fountain"""
    try:
        data = request.get_json()
        db = get_db()
        fountain = db.query(Fountain).filter(Fountain.id == id).first()
        
        if not fountain:
            db.close()
            return jsonify({"error": "Fountain not found"}), 404
            
        if 'name' in data: fountain.name = data['name']
        if 'location' in data: fountain.location = data['location']
        if 'status' in data: fountain.status = data['status']
        if 'department_id' in data: fountain.department_id = data['department_id']
        if 'model' in data: fountain.model = data['model']
        if 'displayId' in data: fountain.display_id = data['displayId']
        if 'display_id' in data: fountain.display_id = data['display_id']
        
        db.commit()
        db.refresh(fountain)
        result = fountain.to_dict()
        db.close()
        return jsonify({"message": "Fountain updated successfully", "fountain": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fountains_bp.route('/<int:id>/status', methods=['PATCH'])
def update_status(id):
    """5. PATCH STATUS: Quick status toggle (for user portal)"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['Online', 'Offline', 'Maintenance', 'Inactive']:
            return jsonify({"error": "Invalid status"}), 400
        
        db = get_db()
        fountain = db.query(Fountain).filter(Fountain.id == id).first()
        if not fountain:
            db.close()
            return jsonify({"error": "Fountain not found"}), 404
        
        fountain.status = new_status
        db.commit()
        db.refresh(fountain)
        result = fountain.to_dict()
        db.close()
        return jsonify({"message": f"Status updated to {new_status}", "fountain": result}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@fountains_bp.route('/<int:id>', methods=['DELETE'])
def destroy(id):
    """6. DESTROY: Delete a fountain"""
    try:
        db = get_db()
        fountain = db.query(Fountain).filter(Fountain.id == id).first()
        if not fountain:
            db.close()
            return jsonify({"error": "Fountain not found"}), 404
            
        db.delete(fountain)
        db.commit()
        db.close()
        return jsonify({"message": "Fountain deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
