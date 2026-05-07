from flask import Blueprint, request, jsonify
from db_config import execute_query
from datetime import datetime

sensors_bp = Blueprint('sensors', __name__)

@sensors_bp.route('/latest', methods=['GET'])
def get_latest_data():
    """Returns the most recent sensor readings for all active fountains"""
    query = """
        SELECT f.name as fountain_name, s.ph, s.turbidity, s.temperature, s.tds, s.timestamp 
        FROM sensor_logs s
        JOIN fountains f ON s.fountain_id = f.id
        WHERE s.id IN (SELECT MAX(id) FROM sensor_logs GROUP BY fountain_id)
    """
    results = execute_query(query)
    return jsonify(results if results else [])

@sensors_bp.route('/history', methods=['GET'])
def get_sensor_history():
    """Returns historical data for charts, filtered by fountain_id and limit"""
    fountain_id = request.args.get('fountain_id')
    limit = request.args.get('limit', 50)
    
    if not fountain_id:
        return jsonify({"error": "fountain_id is required"}), 400
        
    query = "SELECT ph, turbidity, temperature, tds, timestamp FROM sensor_logs WHERE fountain_id = %s ORDER BY timestamp DESC LIMIT %s"
    results = execute_query(query, (fountain_id, int(limit)))
    return jsonify(results if results else [])

@sensors_bp.route('/update', methods=['POST'])
def update_sensor_data():
    """
    ENDPOINT FOR ESP32
    Receives JSON data from the ESP32 and logs it to MySQL
    """
    data = request.get_json()
    fountain_id = data.get('fountain_id')
    ph = data.get('ph')
    turbidity = data.get('turbidity')
    temperature = data.get('temperature')
    tds = data.get('tds')
    
    if not all([fountain_id, ph, turbidity, temperature, tds]):
        return jsonify({"error": "Missing sensor parameters"}), 400

    query = """
        INSERT INTO sensor_logs (fountain_id, ph, turbidity, temperature, tds, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (fountain_id, ph, turbidity, temperature, tds, datetime.now())
    
    # execute_query commit is inside the function
    execute_query(query, params)
    
    return jsonify({"message": "Data logged successfully", "timestamp": params[5]}), 201
