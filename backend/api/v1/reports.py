from flask import Blueprint, jsonify, request
from models import get_db, Report, Fountain, User, Alert, AlertSeverity, AuditLog, SystemSetting
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta, timezone

reports_bp = Blueprint('reports_bp', __name__)


def classify_water_reading(parameter, value):
    numeric_value = float(value)

    if parameter == 'ph':
        if 6.5 <= numeric_value <= 8.5:
            return 'Low', 'Safe'
        if (6.35 <= numeric_value < 6.5) or (8.5 < numeric_value <= 9.0):
            return 'Medium', 'Warning'
        return 'Critical', 'Critical'

    if parameter == 'turbidity':
        if numeric_value <= 5.0:
            return 'Low', 'Safe'
        if numeric_value <= 5.5:
            return 'Medium', 'Warning'
        return 'Critical', 'Critical'

    if parameter == 'temperature':
        if 15.0 <= numeric_value <= 30.0:
            return 'Low', 'Safe'
        if (13.5 <= numeric_value < 15.0) or (30.0 < numeric_value <= 33.0):
            return 'Medium', 'Warning'
        return 'Critical', 'Critical'

    if parameter == 'tds':
        if numeric_value <= 500.0:
            return 'Low', 'Safe'
        if numeric_value <= 550.0:
            return 'Medium', 'Warning'
        return 'Critical', 'Critical'

    return 'Low', 'Safe'


def build_alert_message(parameter, value, category, level_label):
    display_name = {
        'ph': 'pH',
        'turbidity': 'Turbidity',
        'temperature': 'Temperature',
        'tds': 'TDS'
    }.get(parameter, parameter.title())

    if category == 'Critical':
        return f'{display_name} is critical at {value:.2f}. Immediate corrective action is required.'
    if category == 'Warning':
        return f'{display_name} is in a warning state at {value:.2f}. Follow up and retest soon.'
    return f'{display_name} is within the safe range at {value:.2f}.'


def get_alert_thresholds(parameter):
    return {
        'ph': (6.5, 8.5),
        'turbidity': (0.0, 5.0),
        'temperature': (15.0, 30.0),
        'tds': (0.0, 500.0)
    }.get(parameter, (None, None))


def create_report_alert(db, fountain_id, parameter, value):
    severity_level, category = classify_water_reading(parameter, value)
    severity = db.query(AlertSeverity).filter(AlertSeverity.severity_level == severity_level).first()

    if not severity:
        severity = db.query(AlertSeverity).order_by(AlertSeverity.priority_score.asc()).first()
        if not severity:
            raise RuntimeError('Alert severity levels are not seeded')

    threshold_min, threshold_max = get_alert_thresholds(parameter)
    message = build_alert_message(parameter, float(value), category, severity.severity_level)

    alert = Alert(
        fountain_id=fountain_id,
        parameter=parameter,
        value=float(value),
        threshold_min=threshold_min,
        threshold_max=threshold_max,
        severity_id=severity.id,
        status='Active',
        message=message,
        timestamp=datetime.utcnow()
    )
    db.add(alert)
    return alert


def get_next_audit_date(db):
    next_audit_setting = db.query(SystemSetting).filter(SystemSetting.setting_key == 'next_audit_date').first()
    if next_audit_setting and next_audit_setting.setting_value:
        return next_audit_setting.setting_value

    latest_report = db.query(Report).order_by(Report.created_at.desc()).first()
    if latest_report and latest_report.created_at:
        next_date = latest_report.created_at + timedelta(days=30)
        return next_date.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')

    return None


def derive_overall_report_status(data):
    statuses = []

    for parameter, field in (
        ('ph', 'ph_avg'),
        ('turbidity', 'turbidity_avg'),
        ('temperature', 'temperature_avg'),
        ('tds', 'tds_avg')
    ):
        value = data.get(field)
        if value is None:
            continue

        _, category = classify_water_reading(parameter, value)
        statuses.append(category)

    if any(status == 'Critical' for status in statuses):
        return 'FAIL'

    if any(status == 'Warning' for status in statuses):
        return 'WARNING'

    return 'PASS'

@reports_bp.route('/', methods=['GET'])
def get_reports():
    """Get all saved compliance reports"""
    db = next(get_db())
    try:
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        query = db.query(Report)
        
        if not include_archived:
            query = query.filter(Report.is_archived == False)
            
        reports = query.order_by(Report.created_at.desc()).all()
        return jsonify({
            'status': 'success',
            'data': [r.to_dict() for r in reports]
        })
    except SQLAlchemyError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@reports_bp.route('/analytics', methods=['GET'])
def get_report_analytics():
    db = next(get_db())
    try:
        total_reports = db.query(Report).filter(Report.is_archived == False).count()
        total_downloads = db.query(AuditLog).filter(AuditLog.action == 'DOWNLOAD_REPORT').count()
        next_audit_date = get_next_audit_date(db)

        return jsonify({
            'status': 'success',
            'data': {
                'available_reports': total_reports,
                'total_downloads': total_downloads,
                'next_audit_date': next_audit_date
            }
        })
    except SQLAlchemyError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@reports_bp.route('/', methods=['POST'])
def save_report():
    """Save a newly generated compliance report"""
    data = request.json
    fountain_id = data.get('fountain_id')
    user_id = data.get('user_id')  # In a production app, extract this from the JWT token
    
    if not fountain_id or not user_id:
        return jsonify({'status': 'error', 'message': 'fountain_id and user_id required'}), 400
        
    db = next(get_db())
    try:
        fountain = db.query(Fountain).filter(Fountain.id == fountain_id).first()
        if not fountain:
            return jsonify({'status': 'error', 'message': 'Fountain not found'}), 404

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({'status': 'error', 'message': 'User not found'}), 404

        overall_status = derive_overall_report_status(data)

        report = Report(
            fountain_id=fountain_id,
            generated_by=user_id,
            ph_avg=data.get('ph_avg'),
            turbidity_avg=data.get('turbidity_avg'),
            temperature_avg=data.get('temperature_avg'),
            tds_avg=data.get('tds_avg'),
            overall_status=overall_status,
            readings_count=data.get('readings_count', 0)
        )
        db.add(report)

        # Generate one alert per parameter so the admin alerts page reflects
        # safe, warning, and critical findings from the submitted report.
        if data.get('ph_avg') is not None:
            create_report_alert(db, fountain_id, 'ph', data.get('ph_avg'))
        if data.get('turbidity_avg') is not None:
            create_report_alert(db, fountain_id, 'turbidity', data.get('turbidity_avg'))
        if data.get('temperature_avg') is not None:
            create_report_alert(db, fountain_id, 'temperature', data.get('temperature_avg'))
        if data.get('tds_avg') is not None:
            create_report_alert(db, fountain_id, 'tds', data.get('tds_avg'))

        db.commit()
        db.refresh(report)
        
        return jsonify({
            'status': 'success',
            'data': report.to_dict()
        }), 201
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@reports_bp.route('/<int:report_id>/download', methods=['POST'])
def log_report_download(report_id):
    data = request.json or {}
    user_id = data.get('user_id')
    admin_id = data.get('admin_id')

    db = next(get_db())
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404

        log = AuditLog(
            user_id=user_id if user_id else None,
            admin_id=admin_id if admin_id else None,
            action='DOWNLOAD_REPORT',
            entity_type='Report',
            entity_id=report_id,
            new_values={
                'report_id': report_id,
                'fountain_id': report.fountain_id,
                'overall_status': report.overall_status
            },
            status='Success',
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()

        return jsonify({'status': 'success', 'data': {'download_logged': True}})
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    except Exception as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@reports_bp.route('/<int:report_id>/archive', methods=['PATCH'])
def archive_report(report_id):
    """Archive or unarchive a report"""
    data = request.json or {}
    # default to archiving if not explicitly unarchiving
    is_archived = data.get('is_archived', True)
    
    db = next(get_db())
    try:
        report = db.query(Report).filter(Report.id == report_id).first()
        if not report:
            return jsonify({'status': 'error', 'message': 'Report not found'}), 404
            
        report.is_archived = is_archived
        db.commit()
        db.refresh(report)
        
        return jsonify({
            'status': 'success',
            'message': 'Report archived successfully' if is_archived else 'Report unarchived successfully',
            'data': report.to_dict()
        })
    except SQLAlchemyError as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    except Exception as e:
        db.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

@reports_bp.route('/summary', methods=['GET'])
def get_summary_report():
    """Generates a summary of sensor logs over a given range with trend analysis"""
    range_type = request.args.get('range', 'daily').lower()
    fountain_id = request.args.get('fountain_id') # optional
    
    db = next(get_db())
    try:
        now = datetime.utcnow()
        if range_type == 'daily':
            period_days = 1
        elif range_type == 'weekly':
            period_days = 7
        elif range_type == 'monthly':
            period_days = 30
        else:
            return jsonify({'status': 'error', 'message': 'Invalid range type. Must be daily, weekly, or monthly'}), 400

        current_start = now - timedelta(days=period_days)
        prev_start = current_start - timedelta(days=period_days)
        prev_end = current_start
            
        from models import SensorLog, Fountain
        from sqlalchemy import func

        def run_agg_query(date_from, date_to):
            q = db.query(
                SensorLog.fountain_id,
                Fountain.name.label('fountain_name'),
                Fountain.location.label('fountain_location'),
                func.avg(SensorLog.ph).label('ph_avg'),
                func.avg(SensorLog.turbidity).label('turbidity_avg'),
                func.avg(SensorLog.temperature).label('temperature_avg'),
                func.avg(SensorLog.tds).label('tds_avg'),
                func.min(SensorLog.ph).label('ph_min'),
                func.max(SensorLog.ph).label('ph_max'),
                func.min(SensorLog.turbidity).label('turbidity_min'),
                func.max(SensorLog.turbidity).label('turbidity_max'),
                func.min(SensorLog.temperature).label('temperature_min'),
                func.max(SensorLog.temperature).label('temperature_max'),
                func.min(SensorLog.tds).label('tds_min'),
                func.max(SensorLog.tds).label('tds_max'),
                func.count(SensorLog.id).label('readings_count')
            ).join(Fountain, SensorLog.fountain_id == Fountain.id)\
             .filter(SensorLog.timestamp >= date_from, SensorLog.timestamp < date_to)
            if fountain_id:
                q = q.filter(SensorLog.fountain_id == int(fountain_id))
            return q.group_by(SensorLog.fountain_id, Fountain.name, Fountain.location).all()

        current_results = run_agg_query(current_start, now)
        prev_results = run_agg_query(prev_start, prev_end)

        prev_map = {}
        for pr in prev_results:
            prev_map[pr.fountain_id] = pr

        def safe_float(v):
            return float(v) if v is not None else None

        def trend_delta(current_val, prev_val):
            if current_val is None or prev_val is None:
                return None
            return round(current_val - prev_val, 4)

        def trend_direction(delta):
            if delta is None:
                return 'stable'
            if delta > 0.01:
                return 'up'
            if delta < -0.01:
                return 'down'
            return 'stable'
        
        summary_data = []
        for r in current_results:
            ph_avg = safe_float(r.ph_avg)
            turbidity_avg = safe_float(r.turbidity_avg)
            temperature_avg = safe_float(r.temperature_avg)
            tds_avg = safe_float(r.tds_avg)
            
            temp_data = {
                'ph_avg': ph_avg,
                'turbidity_avg': turbidity_avg,
                'temperature_avg': temperature_avg,
                'tds_avg': tds_avg
            }
            overall_status = derive_overall_report_status(temp_data)

            prev = prev_map.get(r.fountain_id)
            prev_ph = safe_float(prev.ph_avg) if prev else None
            prev_turb = safe_float(prev.turbidity_avg) if prev else None
            prev_temp = safe_float(prev.temperature_avg) if prev else None
            prev_tds = safe_float(prev.tds_avg) if prev else None

            ph_delta = trend_delta(ph_avg, prev_ph)
            turb_delta = trend_delta(turbidity_avg, prev_turb)
            temp_delta = trend_delta(temperature_avg, prev_temp)
            tds_delta = trend_delta(tds_avg, prev_tds)
            
            summary_data.append({
                'fountain_id': r.fountain_id,
                'fountain_name': r.fountain_name,
                'location': r.fountain_location,
                'ph_avg': ph_avg,
                'turbidity_avg': turbidity_avg,
                'temperature_avg': temperature_avg,
                'tds_avg': tds_avg,
                'ph_min': safe_float(r.ph_min),
                'ph_max': safe_float(r.ph_max),
                'turbidity_min': safe_float(r.turbidity_min),
                'turbidity_max': safe_float(r.turbidity_max),
                'temperature_min': safe_float(r.temperature_min),
                'temperature_max': safe_float(r.temperature_max),
                'tds_min': safe_float(r.tds_min),
                'tds_max': safe_float(r.tds_max),
                'readings_count': r.readings_count,
                'overall_status': overall_status,
                'trend': {
                    'ph': { 'delta': ph_delta, 'direction': trend_direction(ph_delta), 'prev_avg': prev_ph },
                    'turbidity': { 'delta': turb_delta, 'direction': trend_direction(turb_delta), 'prev_avg': prev_turb },
                    'temperature': { 'delta': temp_delta, 'direction': trend_direction(temp_delta), 'prev_avg': prev_temp },
                    'tds': { 'delta': tds_delta, 'direction': trend_direction(tds_delta), 'prev_avg': prev_tds },
                    'has_previous_data': prev is not None
                }
            })
            
        return jsonify({
            'status': 'success',
            'range': range_type,
            'start_date': current_start.isoformat() + 'Z',
            'end_date': now.isoformat() + 'Z',
            'prev_start_date': prev_start.isoformat() + 'Z',
            'prev_end_date': prev_end.isoformat() + 'Z',
            'data': summary_data
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()
