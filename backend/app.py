try:
    import eventlet
    eventlet.monkey_patch()
except (ImportError, AttributeError, ModuleNotFoundError):
    pass

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
from datetime import datetime
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

# Initialize Flask-Limiter for API rate limiting with fail-safe fallback
try:
    # pyrefly: ignore [missing-import]
    from flask_limiter import Limiter
    # pyrefly: ignore [missing-import]
    from flask_limiter.util import get_remote_address

    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["600 per hour", "120 per minute"],
        storage_uri="memory://"
    )
    app.limiter = limiter
except Exception as err:
    print(f"Warning: Flask-Limiter disabled or unavailable ({err}). Server continuing normally.")
    app.limiter = None

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

# Base & Project Root Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))

@app.errorhandler(429)
def ratelimit_handler(e):
    return api_error(f"Rate limit exceeded: {e.description}. Please slow down and try again.", 429)

@app.after_request
def apply_security_headers(response):
    """Attach security HTTP response headers to protect against XSS, MIME-sniffing & Clickjacking"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
    
    # Hardened Content Security Policy
    csp = (
        "default-src 'self'; "
        "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        "script-src-elem 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        "img-src 'self' data: blob: https:; "
        "media-src 'self' data: blob: https:; "
        "connect-src 'self' https: wss: ws:; "
        "frame-ancestors 'self';"
    )
    response.headers['Content-Security-Policy'] = csp
    return response

# --- CLEAN URL ROUTES ---
# Public pages
@app.route('/')
def index():
    return send_from_directory(PROJECT_ROOT, 'index.html')

@app.route('/about')
def about():
    return send_from_directory(PROJECT_ROOT, 'about.html')

@app.route('/research')
def research():
    return send_from_directory(PROJECT_ROOT, 'research.html')

@app.route('/contact')
def contact():
    return send_from_directory(PROJECT_ROOT, 'contact.html')

@app.route('/login')
def login():
    return send_from_directory(PROJECT_ROOT, 'login.html')

# Admin portal routes
@app.route('/admin/login')
def admin_login():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-login.html')

@app.route('/admin/dashboard')
def admin_dashboard():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-dashboard.html')

@app.route('/admin/fountains')
def admin_fountains():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-fountains.html')

@app.route('/admin/sensors')
def admin_sensors():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-sensors.html')

@app.route('/admin/alerts')
def admin_alerts():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-alerts.html')

@app.route('/admin/users')
def admin_users():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-users.html')

@app.route('/admin/reports')
def admin_reports():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-reports.html')

@app.route('/admin/settings')
def admin_settings():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-settings.html')

@app.route('/admin/help')
def admin_help():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'admin'), 'admin-help.html')

# User (Operator) portal routes
@app.route('/user/dashboard')
def user_dashboard():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-dashboard.html')

@app.route('/user/monitoring')
def user_monitoring():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-monitoring.html')

@app.route('/user/fountain-status')
def user_fountain_status():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-fountain-status.html')

@app.route('/user/reports')
def user_reports():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-reports.html')

@app.route('/user/settings')
def user_settings():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-settings.html')

@app.route('/user/help')
def user_help():
    return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend', 'user'), 'user-help.html')

# Static file catch-all (serves CSS, JS, images, and legacy .html URLs)
@app.route('/<path:path>')
def serve_static(path):
    # 1. Direct check in PROJECT_ROOT
    full_path = os.path.join(PROJECT_ROOT, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(PROJECT_ROOT, path)
    
    # 2. Check inside frontend/ directory (e.g., assets, components)
    frontend_path = os.path.join(PROJECT_ROOT, 'frontend', path)
    if os.path.exists(frontend_path) and os.path.isfile(frontend_path):
        return send_from_directory(os.path.join(PROJECT_ROOT, 'frontend'), path)
        
    # 3. If a missing CSS/JS/image asset is requested, return 404 instead of index.html
    if path.startswith('assets/') or path.endswith(('.css', '.js', '.ico', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.map')):
        return "Asset not found", 404

    return send_from_directory(PROJECT_ROOT, 'index.html')


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
            "timestamp": datetime.utcnow().isoformat()
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
    api_port = int(os.getenv('PORT', os.getenv('API_PORT', 5000)))
    print(f"API running on {api_host}:{api_port}")
    print(f"Database: {os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'wqms_db')}")
    
    # Run the application with native WebSockets support
    # Debug/reloader disabled to avoid Werkzeug reloader child/FD issues when
    # launching from this integrated terminal environment.
    socketio.run(app, host=api_host, port=api_port, debug=False, allow_unsafe_werkzeug=True)

