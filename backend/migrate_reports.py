import os
import sys
from dotenv import load_dotenv
load_dotenv()

from models import SessionLocal, engine, Report
from sqlalchemy import text, inspect
from api.v1.reports import derive_overall_report_status

def add_is_archived():
    db = SessionLocal()
    print("Adding is_archived to reports table...")
    try:
        columns = [col['name'] for col in inspect(engine).get_columns('reports')]
        if 'is_archived' in columns:
            print("is_archived column already exists.")
        else:
            db.execute(text("ALTER TABLE reports ADD COLUMN is_archived BOOLEAN DEFAULT FALSE"))
            db.commit()
            print("Successfully added is_archived column.")
    except Exception as e:
        print(f"Column might already exist or error occurred: {e}")
    finally:
        db.close()


def backfill_report_statuses(dry_run=False):
    db = SessionLocal()
    updated = 0

    print("Backfilling report overall_status values...")
    try:
        reports = db.query(Report).order_by(Report.id.asc()).all()
        for report in reports:
            payload = {
                'ph_avg': float(report.ph_avg) if report.ph_avg is not None else None,
                'turbidity_avg': float(report.turbidity_avg) if report.turbidity_avg is not None else None,
                'temperature_avg': float(report.temperature_avg) if report.temperature_avg is not None else None,
                'tds_avg': float(report.tds_avg) if report.tds_avg is not None else None,
            }

            derived_status = derive_overall_report_status(payload)
            current_status = (report.overall_status or '').strip().upper() if report.overall_status else None

            if current_status != derived_status:
                print(f"  report_id={report.id}: {current_status or 'NULL'} -> {derived_status}")
                if not dry_run:
                    report.overall_status = derived_status
                updated += 1

        if dry_run:
            db.rollback()
            print(f"Dry run complete. {updated} report(s) would be updated.")
        else:
            db.commit()
            print(f"Backfill complete. Updated {updated} report(s).")
    except Exception as e:
        db.rollback()
        print(f"Backfill failed: {e}")
        raise
    finally:
        db.close()

if __name__ == '__main__':
    add_is_archived()
    backfill_report_statuses(dry_run='--dry-run' in sys.argv)
