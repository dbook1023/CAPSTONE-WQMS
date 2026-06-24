import json
from models import SessionLocal, Alert, Report
import requests


def main():
    db = SessionLocal()
    try:
        alert_count = db.query(Alert).count()
        report_count = db.query(Report).count()
        recent_alerts = [a.to_dict() for a in db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all()]
        recent_reports = [r.to_dict() for r in db.query(Report).order_by(Report.created_at.desc()).limit(5).all()]

        print(json.dumps({
            'alert_count': alert_count,
            'report_count': report_count,
            'recent_alerts': recent_alerts,
            'recent_reports': recent_reports
        }, default=str, indent=2))

        # Try contacting local API
        try:
            resp = requests.get('http://127.0.0.1:5000/api/v1/alerts/')
            print('\nAPI_REQUEST: status', resp.status_code)
            try:
                print('API_RESPONSE_BODY:', resp.json())
            except Exception as e:
                print('API_RESPONSE_PARSE_ERROR:', str(e))
        except Exception as e:
            print('\nAPI_REQUEST_ERROR:', str(e))

    finally:
        db.close()


if __name__ == '__main__':
    main()
