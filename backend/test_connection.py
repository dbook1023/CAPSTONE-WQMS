#!/usr/bin/env python3
"""
Test database connection and display table information
"""

from dotenv import load_dotenv
import os
from models import SessionLocal, User, Fountain, Sensor, SensorLog, Alert, Role

load_dotenv()

print("=" * 60)
print("🧪 WQMS DATABASE CONNECTION TEST")
print("=" * 60)
print()

try:
    db = SessionLocal()
    
    # Test connection
    print("🔌 Testing database connection...")
    users = db.query(User).all()
    print(f"✅ Connected successfully!")
    print()
    
    # Display table information
    print("📊 DATABASE SUMMARY")
    print("-" * 60)
    
    roles = db.query(Role).all()
    print(f"  👥 Roles: {len(roles)}")
    for role in roles:
        print(f"     - {role.role_name}")
    
    users_count = db.query(User).count()
    print(f"  👤 Users: {users_count}")
    for user in users:
        print(f"     - {user.email} ({user.role.role_name})")
    
    fountains = db.query(Fountain).all()
    print(f"  💧 Fountains: {len(fountains)}")
    
    sensors = db.query(Sensor).all()
    print(f"  📡 Sensors: {len(sensors)}")
    
    logs = db.query(SensorLog).all()
    print(f"  📈 Sensor Logs: {len(logs)}")
    
    alerts = db.query(Alert).all()
    print(f"  ⚠️  Alerts: {len(alerts)}")
    
    print()
    print("=" * 60)
    print("✅ ALL TESTS PASSED - Database is ready!")
    print("=" * 60)
    print()
    print("📝 Default Admin User:")
    print(f"   Email: admin@wqms.local")
    print(f"   Password: admin123")
    print()
    
    db.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
