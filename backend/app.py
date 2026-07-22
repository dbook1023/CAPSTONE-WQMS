from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Database Session
from models import SessionLocal, get_db
from api.v1.common import api_success, api_error

# Import Blueprints
from api.v1.auth import auth_bp
from api.v1.sensors import sensors_bp
from api.v1.users import users_bp
from api.v1.fountains import fountains_bp
from api.v1.alerts import alerts_bp
from api.v1.settings import settings_bp
from api.v1.reports import reports_bp
from api.v1.admins import admins_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'wqms_secret_key_2025')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max payload for avatar uploads

# Enable CORS for frontend integration
CORS(app, resources={r"/*": {"origins": "*"}})

# Register Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
app.register_blueprint(sensors_bp, url_prefix='/api/v1/sensors')
app.register_blueprint(users_bp, url_prefix='/api/v1/users')
app.register_blueprint(admins_bp, url_prefix='/api/v1/admins')
app.register_blueprint(fountains_bp, url_prefix='/api/v1/fountains')
app.register_blueprint(alerts_bp, url_prefix='/api/v1/alerts')
app.register_blueprint(settings_bp, url_prefix='/api/v1/settings')
app.register_blueprint(reports_bp, url_prefix='/api/v1/reports')

# Initialize SocketIO with threading (eventlet has issues on some Windows environments)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
app.socketio = socketio

@app.after_request
def apply_security_headers(response):
    """Attach security HTTP response headers to protect against XSS, MIME-sniffing & Clickjacking"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

@app.route('/')
def index():
    return send_from_directory('..', 'login.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('..', path)

# --- REST API V1 ROUTES ---

@app.route('/api/v1/status', methods=['GET'])
def get_status():
    """Returns the current status of the monitoring system"""
    try:
        db = SessionLocal()
        from models import Fountain, SensorLog
        
        active_sensors = db.query(Fountain).filter_by(status='Online').count()
        last_log = db.query(SensorLog).order_by(SensorLog.timestamp.desc()).first()
        last_sync = last_log.timestamp.isoformat() if last_log else None
        
        db.close()
        
        return api_success({
            "system": "online",
            "last_sync": last_sync,
            "active_sensors": active_sensors,
            "timestamp": os.popen('date /t').read().strip()
        }, 'System status retrieved successfully')
    except Exception as e:
        return api_error(str(e), 500)

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
    # Run the application
    print("Starting WQMS Backend Server...")
    api_host = os.getenv('API_HOST', '0.0.0.0')
    api_port = int(os.getenv('API_PORT', 5000))
    print(f"API running on {api_host}:{api_port}")
    print(f"Database: {os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'wqms_db')}")
    
    # Run the application with native WebSockets support
    # Debug/reloader disabled to avoid Werkzeug reloader child/FD issues when
    # launching from this integrated terminal environment.
    socketio.run(app, host=api_host, port=api_port, debug=False, allow_unsafe_werkzeug=True)

