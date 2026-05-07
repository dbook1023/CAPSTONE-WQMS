from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os

# Import Blueprints
from api.v1.auth import auth_bp
from api.v1.sensors import sensors_bp
from api.v1.users import users_bp
from api.v1.fountains import fountains_bp
from api.v1.alerts import alerts_bp
from api.v1.settings import settings_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'wqms_secret_key_2025' # Change this in production

# Enable CORS for frontend integration
CORS(app, resources={r"/*": {"origins": "*"}})

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
app.register_blueprint(sensors_bp, url_prefix='/api/v1/sensors')
app.register_blueprint(users_bp, url_prefix='/api/v1/users')
app.register_blueprint(fountains_bp, url_prefix='/api/v1/fountains')
app.register_blueprint(alerts_bp, url_prefix='/api/v1/alerts')
app.register_blueprint(settings_bp, url_prefix='/api/v1/settings')

# Initialize SocketIO with eventlet
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

@app.route('/')
def index():
    return jsonify({"status": "WQMS API is running", "version": "1.0.0"})

# --- REST API V1 ROUTES ---

@app.route('/api/v1/status', methods=['GET'])
def get_status():
    """Returns the current status of the monitoring system"""
    # Mock data - will be replaced with MySQL query later
    return jsonify({
        "system": "online",
        "last_sync": "2025-05-07T20:45:00Z",
        "active_sensors": 4
    })

# --- WEBSOCKET EVENTS ---

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status_response', {'data': 'Connected to WQMS Real-time Stream'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_monitoring_update')
def handle_monitoring_request(data):
    """
    ESP32 or Frontend can request an immediate update
    """
    print(f"Monitoring update requested: {data}")
    # In the future, this will query MySQL and emit the real-time values
    emit('sensor_update', {
        'ph': 7.2,
        'ntu': 2.3,
        'temp': 24.5,
        'tds': 125,
        'location': 'Main Building'
    })

if __name__ == '__main__':
    # Run the application with SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
