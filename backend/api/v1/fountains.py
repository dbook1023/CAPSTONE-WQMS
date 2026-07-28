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
        data = request.get_json() or {}
        name = data.get('name', '').strip()
        location = data.get('location', '').strip()
        display_id = (data.get('displayId') or data.get('display_id') or '').strip()
        department_id = data.get('department_id', 1)
        model = data.get('model')
        status = data.get('status', 'Online')
        
        if not name or not location:
            return jsonify({"error": "Fountain name and location are required."}), 400
            
        db = get_db()

        # Check for duplicate Fountain Name
        dup_name = db.query(Fountain).filter(Fountain.name == name).first()
        if dup_name:
            db.close()
            return jsonify({"error": f"Fountain name '{name}' is already in use. Please enter a unique name."}), 400
        
        # Check for duplicate display_id if provided
        if display_id:
            dup_id = db.query(Fountain).filter(Fountain.display_id == display_id).first()
            if dup_id:
                db.close()
                return jsonify({"error": f"Fountain ID '{display_id}' is already in use. Please enter a unique ID."}), 400
        else:
            # Auto-generate next Fxxx ID
            all_fountains = db.query(Fountain).all()
            max_num = 0
            for f in all_fountains:
                fid = f.display_id or ''
                if fid.startswith('F'):
                    try:
                        num = int(fid[1:])
                        if num > max_num: max_num = num
                    except ValueError:
                        pass
                if f.id > max_num:
                    max_num = f.id
            display_id = f'F{str(max_num + 1).zfill(3)}'
        
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
        data = request.get_json() or {}
        db = get_db()
        fountain = db.query(Fountain).filter(Fountain.id == id).first()
        
        if not fountain:
            db.close()
            return jsonify({"error": "Fountain not found"}), 404
            
        new_name = data.get('name')
        if new_name and new_name != fountain.name:
            dup_name = db.query(Fountain).filter(Fountain.name == new_name, Fountain.id != id).first()
            if dup_name:
                db.close()
                return jsonify({"error": f"Fountain name '{new_name}' is already in use."}), 400

        new_display_id = data.get('displayId') or data.get('display_id')
        if new_display_id and new_display_id != fountain.display_id:
            dup_id = db.query(Fountain).filter(Fountain.display_id == new_display_id, Fountain.id != id).first()
            if dup_id:
                db.close()
                return jsonify({"error": f"Fountain ID '{new_display_id}' is already in use."}), 400

        if 'name' in data: fountain.name = data['name'].strip()
        if 'location' in data: fountain.location = data['location'].strip()
        if 'status' in data: fountain.status = data['status']
        if 'department_id' in data: fountain.department_id = data['department_id']
        if 'model' in data: fountain.model = data['model']
        if 'displayId' in data: fountain.display_id = data['displayId'].strip()
        if 'display_id' in data: fountain.display_id = data['display_id'].strip()
        
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
