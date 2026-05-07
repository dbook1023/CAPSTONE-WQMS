from flask import Blueprint, request, jsonify
from db_config import execute_query

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/', methods=['GET'])
def get_settings():
    """Returns all system-wide threshold settings"""
    query = "SELECT * FROM system_settings"
    results = execute_query(query)
    # Convert list of settings to a dictionary for easier frontend use
    settings_dict = {item['setting_key']: item['setting_value'] for item in results} if results else {}
    return jsonify(settings_dict)

@settings_bp.route('/update', methods=['PUT'])
def update_setting():
    """Updates specific threshold settings"""
    data = request.get_json()
    # Expecting { "ph_min": 6.5, "ph_max": 8.5, ... }
    
    for key, value in data.items():
        query = "UPDATE system_settings SET setting_value = %s WHERE setting_key = %s"
        execute_query(query, (str(value), key))
        
    return jsonify({"message": "Settings updated successfully"}), 200

@settings_bp.route('/thresholds', methods=['GET'])
def get_thresholds():
    """Specific helper to return just the PNSDW thresholds"""
    return jsonify({
        "ph": {"min": 6.5, "max": 8.5, "unit": "pH"},
        "turbidity": {"min": 0, "max": 5.0, "unit": "NTU"},
        "temperature": {"min": 15, "max": 30, "unit": "°C"},
        "tds": {"min": 0, "max": 500, "unit": "ppm"}
    })
