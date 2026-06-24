from flask import Blueprint, request, jsonify
from models import SessionLocal, SystemSetting

settings_bp = Blueprint('settings', __name__)

def get_db():
    return SessionLocal()

@settings_bp.route('/', methods=['GET'])
def get_settings():
    """Returns all system-wide threshold settings"""
    try:
        db = get_db()
        settings = db.query(SystemSetting).all()
        # Convert list of settings to a dictionary for easier frontend use
        settings_dict = {item.setting_key: item.setting_value for item in settings} if settings else {}
        db.close()
        return jsonify(settings_dict)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@settings_bp.route('/update', methods=['PUT'])
def update_setting():
    """Updates specific threshold settings"""
    try:
        data = request.get_json()
        # Expecting { "ph_min": 6.5, "ph_max": 8.5, ... }
        
        db = get_db()
        for key, value in data.items():
            setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
            if setting:
                setting.setting_value = str(value)
            else:
                # Optionally create if doesn't exist
                new_setting = SystemSetting(setting_key=key, setting_value=str(value))
                db.add(new_setting)
        
        db.commit()
        db.close()
        return jsonify({"message": "Settings updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@settings_bp.route('/thresholds', methods=['GET'])
def get_thresholds():
    """Specific helper to return just the PNSDW thresholds"""
    # This can remain static or be fetched from DB if we have a specific structure for it
    return jsonify({
        "ph": {"min": 6.5, "max": 8.5, "unit": "pH"},
        "turbidity": {"min": 0, "max": 5.0, "unit": "NTU"},
        "temperature": {"min": 15, "max": 30, "unit": "°C"},
        "tds": {"min": 0, "max": 500, "unit": "ppm"}
    })
