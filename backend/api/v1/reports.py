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
