from flask import Blueprint, request, jsonify
from db_config import execute_query
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)

@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    """Returns all active or recent alerts"""
    query = """
        SELECT a.*, f.name as fountain_name 
        FROM alerts a 
        JOIN fountains f ON a.fountain_id = f.id 
        ORDER BY a.timestamp DESC
    """
    results = execute_query(query)
    return jsonify(results if results else [])

@alerts_bp.route('/active', methods=['GET'])
def get_active_alerts():
    """Returns only unresolved alerts"""
    query = "SELECT * FROM alerts WHERE status = 'Active' ORDER BY timestamp DESC"
    results = execute_query(query)
    return jsonify(results if results else [])

@alerts_bp.route('/resolve/<int:alert_id>', methods=['PUT'])
def resolve_alert(alert_id):
    """Marks an alert as resolved with a note from the technician"""
    data = request.get_json()
    note = data.get('note', 'Resolved by technician')
    
    query = "UPDATE alerts SET status = 'Resolved', resolution_note = %s, resolved_at = %s WHERE id = %s"
    execute_query(query, (note, datetime.now(), alert_id))
    return jsonify({"message": "Alert resolved successfully"}), 200

@alerts_bp.route('/create', methods=['POST'])
def create_alert():
    """Endpoint for system/sensors to trigger a new alert manually if needed"""
    data = request.get_json()
    fountain_id = data.get('fountain_id')
    parameter = data.get('parameter')
    value = data.get('value')
    message = data.get('message')
    
    query = """
        INSERT INTO alerts (fountain_id, parameter, value, message, status, timestamp)
        VALUES (%s, %s, %s, %s, 'Active', %s)
    """
    execute_query(query, (fountain_id, parameter, value, message, datetime.now()))
    return jsonify({"message": "Alert created successfully"}), 201
