from flask import Blueprint, request, jsonify
from models import SessionLocal, SensorLog, Fountain, Sensor
from datetime import datetime
from sqlalchemy import func

sensors_bp = Blueprint('sensors', __name__)

def get_db():
    return SessionLocal()

@sensors_bp.route('/', methods=['GET'])
def list_sensors():
    """List all registered hardware devices"""
    try:
        db = get_db()
        sensors = db.query(Sensor).all()
        result = []
        for s in sensors:
            d = s.to_dict()
            d['fountain_name'] = s.fountain.name if s.fountain else "Unassigned"
            result.append(d)
        db.close()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/register', methods=['POST'])
def register_sensor():
    """Register a new hardware device or update its configuration"""
    try:
        data = request.get_json()
        print("Received JSON:", data)
        serial = data.get('serial_number')
        fountain_id = data.get('fountain_id')
        calibration_params = data.get('calibration_params')
        
        if not serial or not fountain_id:
            return jsonify({"error": "Serial number and Fountain ID are required"}), 400
            
        db = get_db()
        # Check if already exists
        existing = db.query(Sensor).filter(Sensor.serial_number == serial).first()
        if existing:
            existing.fountain_id = fountain_id
            if calibration_params is not None:
                existing.calibration_params = calibration_params
            db.commit()
            res = existing.to_dict()
            db.close()
            return jsonify({"message": "Device successfully reassigned to the new fountain!", "sensor": res}), 200
            
        new_sensor = Sensor(
            serial_number=serial,
            fountain_id=fountain_id,
            sensor_type_id=1, # Default general type
            status='Active',
            calibration_params=calibration_params
        )
        db.add(new_sensor)
        db.commit()
        db.refresh(new_sensor)
        res = new_sensor.to_dict()
        db.close()
        return jsonify({"message": "Device registered successfully", "sensor": res}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/<int:id>', methods=['DELETE'])
def delete_sensor(id):
    """Remove a hardware device"""
    try:
        db = get_db()
        sensor = db.query(Sensor).filter(Sensor.id == id).first()
        if not sensor:
            db.close()
            return jsonify({"error": "Sensor not found"}), 404
        db.delete(sensor)
        db.commit()
        db.close()
        return jsonify({"message": "Device removed"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- DATA INGESTION ENDPOINTS ---

@sensors_bp.route('/latest', methods=['GET'])
# ... (rest of the file)
def get_latest_data():
    """Returns the most recent sensor readings for all active fountains"""
    try:
        db = get_db()
        # Subquery to get the max ID for each fountain_id
        subquery = db.query(func.max(SensorLog.id)).group_by(SensorLog.fountain_id).subquery()
        
        # Query sensor logs that match those IDs
        latest_logs = db.query(SensorLog).filter(SensorLog.id.in_(subquery)).all()
        
        result = []
        for log in latest_logs:
            log_dict = log.to_dict()
            log_dict['fountain_name'] = log.fountain.name if log.fountain else "Unknown"
            result.append(log_dict)
            
        db.close()
        return jsonify(result if result else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/history', methods=['GET'])
def get_sensor_history():
    """Returns historical data for charts, filtered by fountain_id and limit"""
    try:
        fountain_id = request.args.get('fountain_id')
        limit = request.args.get('limit', 50)
        
        if not fountain_id:
            return jsonify({"error": "fountain_id is required"}), 400
            
        db = get_db()
        logs = db.query(SensorLog)\
            .filter(SensorLog.fountain_id == fountain_id)\
            .order_by(SensorLog.timestamp.desc())\
            .limit(int(limit))\
            .all()
            
        result = [log.to_dict() for log in logs]
        db.close()
        return jsonify(result if result else [])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/update', methods=['POST'])
def update_sensor_data():
    """
    ENDPOINT FOR ESP32
    Receives telemetry from devices and returns calibrated values.

    Contract:
    - Prefer raw voltages + serial + diagnostics
    - Pre-calibrated values (ph, tds, ntu, etc.) are also accepted
      when a device already performs calibration upstream
    """
    try:
        data = request.get_json()

        # Accept either raw voltages (backend calibration) or pre-calibrated values.
        # Pre-calibrated values take precedence when present.

        fountain_id = data.get('fountain_id')
        serial_number = data.get('serial') or data.get('serial_number')

        ph_voltage = data.get('ph_voltage')
        turb_voltage = data.get('turbidity_voltage')
        tds_voltage = data.get('tds_voltage')
        temperature = data.get('temperature')
        timestamp_str = data.get('timestamp')
        firmware_version = data.get('firmware_version')

        # Pre-calibrated fields (if provided by ESP32)
        pre_ph = data.get('ph')
        pre_turbidity = data.get('ntu') or data.get('turbidity')
        pre_tds = data.get('tds')

        db = get_db()
        fountain = None
        sensor_record = None

        # 1. Lookup by Serial Number (Preferred for portable devices)
        if serial_number:
            from models import Sensor
            sensor_record = db.query(Sensor).filter(Sensor.serial_number == serial_number).first()
            if sensor_record:
                fountain = sensor_record.fountain
                fountain_id = sensor_record.fountain_id
            else:
                db.close()
                return jsonify({"error": f"Device with serial {serial_number} not registered"}), 404

        # 2. Fallback to direct Fountain ID
        elif fountain_id:
            fountain = db.query(Fountain).filter(Fountain.id == fountain_id).first()
            if not fountain:
                db.close()
                return jsonify({"error": "Fountain not found"}), 404

        if not fountain:
            db.close()
            return jsonify({"error": "No fountain or device identified"}), 400

        if pre_ph is not None and pre_turbidity is not None and pre_tds is not None and temperature is not None:
            # Bypass backend calibration if ESP32 sends calibrated data
            ph = float(pre_ph)
            turbidity = float(pre_turbidity)
            tds = float(pre_tds)
        else:
            # Fallback to backend calibration if raw voltages are sent
            if any(v is None for v in [ph_voltage, turb_voltage, tds_voltage, temperature]):
                db.close()
                return jsonify({"error": "Missing sensor data: either provide pre-calibrated values (ph, ntu, tds) or raw voltages"}), 400
                
            # ==============================================
            # PER-DEVICE CALIBRATION COEFFICIENTS
            # Falls back to global defaults if not set
            # ==============================================
            if sensor_record:
                cal = sensor_record.get_calibration()
            else:
                from models import Sensor as SensorModel
                cal = SensorModel.DEFAULT_CALIBRATION
    
            # ==============================================
            # SENSOR CALIBRATION & MATH LAYER
            # ==============================================
    
            # 1. pH Calculation (linear model)
            ph_slope = cal.get('ph_slope', -5.70)
            ph_offset = cal.get('ph_offset', 21.34)
            ph = (ph_slope * float(ph_voltage)) + ph_offset
            ph = max(0.0, min(14.0, ph))  # Clamp to 0-14 physical limits
    
            # 2. Turbidity Calculation (quadratic polynomial)
            turb_a = cal.get('turb_a', -1120.4)
            turb_b = cal.get('turb_b', 5742.3)
            turb_c = cal.get('turb_c', -4352.9)
            tv = float(turb_voltage) * 2.0
            turbidity = (turb_a * (tv ** 2)) + (turb_b * tv) + turb_c
            turbidity = max(0.0, turbidity)  # Prevent negative
    
            # 3. TDS Calculation (with Temp Compensation and 3.3V Scaling)
            temp_c = float(temperature)
            compensation = 1.0 + 0.02 * (temp_c - 25.0)
            comp_voltage = float(tds_voltage) / compensation if compensation != 0 else float(tds_voltage)
            kValue = cal.get('tds_k_value', 0.2)
    
            tds = (
                (133.42 * (comp_voltage ** 3))
                - (255.86 * (comp_voltage ** 2))
                + (857.39 * comp_voltage)
            ) * 0.5 * kValue
            tds = max(0.0, tds)

        # Use UTC time for emitted timestamps to avoid timezone mismatches on clients
        from datetime import timezone as _tz
        timestamp = datetime.utcnow()
        if timestamp_str:
            try:
                # Attempt to parse incoming ISO timestamp; if it contains offset, keep it
                parsed = datetime.fromisoformat(timestamp_str)
                timestamp = parsed
            except:
                # If parsing fails, keep UTC now
                pass

        log = SensorLog(
            fountain_id=fountain_id,
            ph=ph,
            turbidity=turbidity,
            temperature=temperature,
            tds=tds,
            # Preserve raw voltages if available (can be None now)
            ph_voltage=float(ph_voltage) if ph_voltage is not None else None,
            tds_voltage=float(tds_voltage) if tds_voltage is not None else None,
            turb_voltage=float(turb_voltage) if turb_voltage is not None else None,
            timestamp=timestamp
        )

        # Only persist readings to the `sensor_logs` table when the sender
        # explicitly requests persistence. This prevents the DB from being
        # flooded by continuous test/telemetry samples from devices.
        persist = bool(data.get('persist', False))
        if persist:
            db.add(log)
            db.commit()
            db.refresh(log)
            result = log.to_dict()
            result['_persisted'] = True
        else:
            # Do not persist; return the computed reading back to caller and
            # still emit it over websocket for live monitoring.
            result = {
                'fountain_id': fountain_id,
                'ph': ph,
                'turbidity': turbidity,
                'temperature': temperature,
                'tds': tds,
                'ph_voltage': float(ph_voltage) if ph_voltage is not None else None,
                'tds_voltage': float(tds_voltage) if tds_voltage is not None else None,
                'turb_voltage': float(turb_voltage) if turb_voltage is not None else None,
                # Emit ISO timestamp; if naive assume UTC and append 'Z'
                'timestamp': (timestamp.isoformat() + 'Z') if timestamp.tzinfo is None else timestamp.isoformat(),
                '_persisted': False
            }
        
        # ==============================================
        # REAL-TIME WEBSOCKET BROADCAST
        # ==============================================
        try:
            from flask import current_app
            if hasattr(current_app, 'socketio'):
                current_app.socketio.emit('new_reading', result)
            elif 'socketio' in current_app.extensions:
                current_app.extensions['socketio'].emit('new_reading', result)
            else:
                from app import socketio
                socketio.emit('new_reading', result)
        except Exception as se:
            print("Failed to emit new reading via Socket.IO:", se)

        db.close()

        return jsonify({"message": "Data logged successfully", "data": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

