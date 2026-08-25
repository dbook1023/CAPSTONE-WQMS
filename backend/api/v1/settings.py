from flask import Blueprint, request, jsonify
from models import SessionLocal, SystemSetting

settings_bp = Blueprint('settings', __name__)

def get_db():
    return SessionLocal()

@settings_bp.route('/', methods=['GET'])
def get_settings():
    """Returns all system-wide settings including security controls"""
    try:
        db = get_db()
        settings = db.query(SystemSetting).all()
        settings_dict = {item.setting_key: item.setting_value for item in settings} if settings else {}
        
        # Ensure default security toggle settings are initialized
        defaults = {
            'enable_2fa': 'true',
            'session_timeout_enabled': 'true',
            'login_limit_enabled': 'true'
        }
        for k, v in defaults.items():
            if k not in settings_dict:
                settings_dict[k] = v
                new_s = SystemSetting(setting_key=k, setting_value=v)
                db.add(new_s)
        
        try:
            db.commit()
        except Exception:
            db.rollback()

        db.close()
        return jsonify(settings_dict)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@settings_bp.route('/update', methods=['PUT'])
def update_setting():
    """Updates specific settings (thresholds or security toggles)"""
    try:
        data = request.get_json() or {}
        
        db = get_db()
        for key, value in data.items():
            setting = db.query(SystemSetting).filter(SystemSetting.setting_key == key).first()
            if setting:
                setting.setting_value = str(value).lower() if isinstance(value, bool) else str(value)
            else:
                str_val = str(value).lower() if isinstance(value, bool) else str(value)
                new_setting = SystemSetting(setting_key=key, setting_value=str_val)
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
