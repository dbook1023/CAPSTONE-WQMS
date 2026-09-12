from flask import Blueprint, request, jsonify
from models import SessionLocal, Alert, Fountain
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)

def get_db():
    return SessionLocal()

@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """Returns all active or recent alerts"""
    try:
        db = get_db()
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).all()
        result = []
        for alert in alerts:
            alert_dict = alert.to_dict()
            alert_dict['fountain_name'] = alert.fountain.name if alert.fountain else "Unknown"
            result.append(alert_dict)
        db.close()
        return jsonify(result if result else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@alerts_bp.route('/active', methods=['GET'])
def get_active_alerts():
    """Returns only unresolved alerts"""
    try:
        db = get_db()
        alerts = db.query(Alert).filter(Alert.status == 'Active').order_by(Alert.timestamp.desc()).all()
        result = [a.to_dict() for a in alerts]
        db.close()
        return jsonify(result if result else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@alerts_bp.route('/resolve/<int:alert_id>', methods=['PUT'])
def resolve_alert(alert_id):
    """Marks an alert as resolved with a note from the technician"""
    try:
        data = request.get_json()
        note = data.get('note', 'Resolved by technician')
        user_id = data.get('user_id') # Optional: who resolved it
        
        db = get_db()
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            db.close()
            return jsonify({"error": "Alert not found"}), 404
            
        alert.status = 'Resolved'
        alert.resolution_note = note
        alert.resolved_at = datetime.utcnow()
        if user_id:
            alert.resolved_by = user_id
            
        db.commit()
        db.close()
        return jsonify({"message": "Alert resolved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@alerts_bp.route('/create', methods=['POST'])
def create_alert():
    """Endpoint for system/sensors to trigger a new alert manually if needed"""
    try:
        data = request.get_json()
        fountain_id = data.get('fountain_id')
        parameter = data.get('parameter')
        value = data.get('value')
        message = data.get('message')
        severity_id = data.get('severity_id', 1) # Default severity
        
        if not all([fountain_id, parameter, value, message]):
            return jsonify({"error": "Missing required fields"}), 400
            
        db = get_db()
        alert = Alert(
            fountain_id=fountain_id,
            parameter=parameter,
            value=value,
            message=message,
            severity_id=severity_id,
            status='Active',
            timestamp=datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        
        result = alert.to_dict()
        db.close()
        return jsonify({"message": "Alert created successfully", "alert": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
