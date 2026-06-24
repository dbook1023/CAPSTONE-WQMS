#!/usr/bin/env python3
"""
Migration Script: Separate admins from users table.
Temporarily disables FK checks to cleanly remove the old admin from users.
"""
import os
import sys
from dotenv import load_dotenv
load_dotenv()

from models import SessionLocal, engine, Base, User, Admin
from sqlalchemy import text, inspect
from werkzeug.security import generate_password_hash

def run_migration():
    db = SessionLocal()
    inspector = inspect(engine)

    print("=" * 60)
    print("  WQMS MIGRATION: Separate Admin & User Tables")
    print("=" * 60)

    # Step 1: Ensure admins table exists
    existing_tables = inspector.get_table_names()
    if 'admins' not in existing_tables:
        print("\n[1/5] Creating 'admins' table...")
        Admin.__table__.create(engine)
        print("  [OK] 'admins' table created.")
    else:
        print("\n[1/5] 'admins' table already exists.")

    # Step 2: Add admin_id column to audit_logs if not present
    print("\n[2/5] Checking audit_logs for admin_id column...")
    try:
        columns = [col['name'] for col in inspector.get_columns('audit_logs')]
        if 'admin_id' not in columns:
            db.execute(text("ALTER TABLE audit_logs ADD COLUMN admin_id INT NULL"))
            try:
                db.execute(text("ALTER TABLE audit_logs ADD INDEX idx_admin_id (admin_id)"))
            except Exception:
                pass
            db.commit()
            print("  [OK] Added admin_id column to audit_logs.")
        else:
            print("  [OK] admin_id already exists in audit_logs.")
    except Exception as e:
        print(f"  [WARN] audit_logs update skipped: {e}")

    # Step 3: Ensure admin exists in admins table
    print("\n[3/5] Ensuring admin account in 'admins' table...")
    existing_admin = db.query(Admin).filter(Admin.email == 'admin@olfu.edu.ph').first()
    if existing_admin:
        print("  [OK] Admin already exists in 'admins' table.")
    else:
        old_admin = db.query(User).filter(User.email == 'admin@olfu.edu.ph').first()
        if old_admin:
            new_admin = Admin(
                name=old_admin.name,
                email=old_admin.email,
                password=old_admin.password,
                phone=old_admin.phone,
                status=old_admin.status,
                last_login=old_admin.last_login,
            )
            db.add(new_admin)
            db.commit()
            print(f"  [OK] Copied admin '{old_admin.email}' to 'admins' table.")
        else:
            new_admin = Admin(
                name='System Administrator',
                email='admin@olfu.edu.ph',
                status='Active'
            )
            new_admin.set_password('admin123')
            db.add(new_admin)
            db.commit()
            print("  [OK] Created fresh admin: admin@olfu.edu.ph / admin123")

    # Step 4: Remove old admin from users table using FK_CHECKS disable
    print("\n[4/5] Cleaning old admin from 'users' table...")
    old_admin = db.query(User).filter(User.email == 'admin@olfu.edu.ph').first()
    if old_admin:
        old_id = old_admin.id
        print(f"  Found old admin in users (id={old_id}).")
        print("  Temporarily disabling FK checks...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": old_id})
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        db.commit()
        print(f"  [OK] Removed old admin (id={old_id}) from 'users' table.")
    else:
        print("  [OK] No old admin found in 'users' table. Clean.")

    # Step 5: Verify final state
    print("\n[5/5] Verifying final state...")
    admin = db.query(Admin).filter(Admin.email == 'admin@olfu.edu.ph').first()
    user = db.query(User).filter(User.email == 'user@olfu.edu.ph').first()
    leftover = db.query(User).filter(User.email == 'admin@olfu.edu.ph').first()

    print(f"  admins table -> admin@olfu.edu.ph: {'FOUND (OK)' if admin else 'MISSING!'}")
    print(f"  users table  -> user@olfu.edu.ph:  {'FOUND (OK)' if user else 'MISSING!'}")
    print(f"  users table  -> admin@olfu.edu.ph: {'STILL THERE (ERROR)' if leftover else 'REMOVED (OK)'}")

    db.close()

    print("\n" + "=" * 60)
    print("  MIGRATION COMPLETE")
    print("=" * 60)
    print("\n  Admin portal: admin@olfu.edu.ph / admin123")
    print("  User portal:  user@olfu.edu.ph  / user123")
    print("\n  Admin -> 'admins' table (isolated)")
    print("  User  -> 'users' table  (isolated)")
    print("=" * 60)

if __name__ == '__main__':
    run_migration()
