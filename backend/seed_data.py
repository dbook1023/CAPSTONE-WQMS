#!/usr/bin/env python3
"""
Seed the WQMS database with sample data for development
"""
from dotenv import load_dotenv
load_dotenv()

from models import SessionLocal, User, Admin, Fountain, Department
from werkzeug.security import generate_password_hash

db = SessionLocal()

# 1. Seed admin into the separate admins table
admin = db.query(Admin).filter(Admin.email == 'admin@olfu.edu.ph').first()
if admin:
    admin.password = generate_password_hash('admin123', method='pbkdf2:sha256', salt_length=16)
    print("Updated admin password for: admin@olfu.edu.ph / admin123")
else:
    admin = Admin(name='System Administrator', email='admin@olfu.edu.ph', status='Active')
    admin.set_password('admin123')
    db.add(admin)
    print("Created admin: admin@olfu.edu.ph / admin123")

# 2. Add a regular user into the users table
existing_user = db.query(User).filter(User.email == 'user@olfu.edu.ph').first()
if not existing_user:
    user = User(name='Regular User', email='user@olfu.edu.ph', role_id=4, phone='+1-555-0002', status='Active')
    user.set_password('user123')
    db.add(user)
    print("Created regular user: user@olfu.edu.ph / user123")
else:
    print("Regular user already exists")

# 3. Update existing fountain with display_id
f1 = db.query(Fountain).filter(Fountain.id == 1).first()
if f1:
    f1.display_id = 'F001'
    f1.name = 'Main Building Lobby'
    f1.location = 'Level 1, Entrance'
    print("Updated fountain F001: Main Building Lobby")

# 4. Add more fountains
dept = db.query(Department).first()
dept_id = dept.id if dept else 1

new_fountains = [
    {'display_id': 'F002', 'name': 'Student Center North', 'location': 'Level 2, Near Cafeteria', 'status': 'Online'},
    {'display_id': 'F003', 'name': 'Sports Complex', 'location': 'Ground Floor, Gym', 'status': 'Offline'},
    {'display_id': 'F004', 'name': 'Library Wing B', 'location': 'Level 3, Study Area', 'status': 'Online'},
]

for fd in new_fountains:
    exists = db.query(Fountain).filter(Fountain.display_id == fd['display_id']).first()
    if not exists:
        fountain = Fountain(
            display_id=fd['display_id'],
            name=fd['name'],
            location=fd['location'],
            department_id=dept_id,
            status=fd['status']
        )
        db.add(fountain)
        print(f"Added fountain: {fd['display_id']} - {fd['name']}")
    else:
        print(f"Fountain {fd['display_id']} already exists")

db.commit()
db.close()
print("\nDatabase seeding complete!")
print("=" * 50)
print("Login credentials:")
print("  Admin: admin@olfu.edu.ph / admin123")
print("  User:  user@olfu.edu.ph  / user123")
print("=" * 50)
