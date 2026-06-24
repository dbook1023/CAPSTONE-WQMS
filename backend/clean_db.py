#!/usr/bin/env python3
"""
Clean Database Script
Removes all mock data and keeps only one Admin and one User account.
"""
from models import SessionLocal, User, Fountain, Alert, SensorLog, AuditLog, Department, Role
from werkzeug.security import generate_password_hash

def clean_database():
    db = SessionLocal()
    try:
        print("Starting database cleanup...")

        # 1. Clear transaction data
        print("- Clearing Alerts...")
        db.query(Alert).delete()
        
        print("- Clearing Sensor Logs...")
        db.query(SensorLog).delete()
        
        print("- Clearing Audit Logs...")
        db.query(AuditLog).delete()
        
        print("- Clearing Fountains...")
        db.query(Fountain).delete()

        # 2. Clear Users and Admins except the target ones
        print("- Clearing Users...")
        db.query(User).delete()
        print("- Clearing Admins...")
        from models import Admin
        db.query(Admin).delete()
        db.commit()

        # 3. Create fresh Admin and User
        print("- Creating official integration accounts...")
        
        admin = Admin(
            name='System Administrator',
            email='admin@olfu.edu.ph',
            status='Active'
        )
        admin.set_password('admin123')
        
        user = User(
            name='General User',
            email='user@olfu.edu.ph',
            role_id=4,
            status='Active'
        )
        user.set_password('user123')
        
        db.add(admin)
        db.add(user)
        
        db.commit()
        print("\nCleanup complete!")
        print("=" * 30)
        print("REMAINING ACCOUNTS:")
        print("Admin: admin@olfu.edu.ph / admin123")
        print("User:  user@olfu.edu.ph  / user123")
        print("=" * 30)

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
