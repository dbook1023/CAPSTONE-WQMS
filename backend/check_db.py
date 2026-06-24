from models import SessionLocal, Admin, User

db = SessionLocal()
try:
    admin_count = db.query(Admin).count()
    user_count = db.query(User).count()
    print('admins', admin_count)
    print('users', user_count)
finally:
    db.close()
