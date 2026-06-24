# Database Setup Checklist

## Pre-Setup Requirements

- [ ] MySQL Server installed and running (Version 8.0+)
- [ ] MySQL command-line tools available
- [ ] Python 3.8+ installed
- [ ] Virtual environment created (`python -m venv venv`)

## Step-by-Step Setup Guide

### Step 1: Prepare Environment Variables
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=YourSecurePassword123!
DB_NAME=wqms_db
DATABASE_URL=mysql+pymysql://root:YourSecurePassword123!@localhost:3306/wqms_db
```

### Step 2: Install Python Dependencies
```bash
pip install -r requirements.txt
```

**Expected output:**
```
Successfully installed flask-3.0.0 SQLAlchemy-2.0.20 ...
```

### Step 3: Create MySQL Database

**Option A: Using MySQL CLI**
```bash
# Login to MySQL
mysql -u root -p

# Then execute:
SOURCE backend/schema.sql;

# Verify:
USE wqms_db;
SHOW TABLES;
```

**Option B: Using Python (ORM)**
```bash
python
>>> from models import init_db
>>> import os
>>> from dotenv import load_dotenv
>>> load_dotenv()
>>> db_url = os.getenv('DATABASE_URL')
>>> init_db(db_url)
Database initialized successfully...
```

### Step 4: Verify Database Setup

```bash
# Check if database created
mysql -u root -p -e "USE wqms_db; SHOW TABLES;"

# Expected output: 11 tables
# roles, departments, users, sensor_types, fountains, 
# sensors, sensor_logs, alert_severity, alerts, 
# system_settings, audit_logs
```

### Step 5: Update Admin Password

```bash
# Connect to database
mysql -u root -p wqms_db

# Update password (requires bcrypt hashing)
# Use this Python script:
```

**generate_hash.py:**
```python
from werkzeug.security import generate_password_hash

password = input("Enter new admin password: ")
hashed = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
print(f"\nUse this hash in the database:")
print(hashed)
```

```bash
# Run the script
python generate_hash.py

# Then in MySQL:
UPDATE users SET password = 'paste_the_hash_here' WHERE id = 1;
```

### Step 6: Test Database Connection

**test_db_connection.py:**
```python
from dotenv import load_dotenv
import os
from models import SessionLocal, User

load_dotenv()

try:
    db = SessionLocal()
    users = db.query(User).all()
    print(f"✅ Connection successful! Found {len(users)} users")
    for user in users:
        print(f"   - {user.email} ({user.role.role_name})")
    db.close()
except Exception as e:
    print(f"❌ Connection failed: {e}")
```

```bash
python test_db_connection.py
```

### Step 7: Run Flask Application

```bash
python app.py
```

Expected output:
```
 * Serving Flask app 'app'
 * Environment: development
 * Debug mode: on
 * Running on http://0.0.0.0:5000
```

### Step 8: Test API Endpoints

```bash
# Test API is running
curl http://localhost:5000/api/v1/status

# Expected response:
{"system": "online", "last_sync": "2025-05-07T20:45:00Z", "active_sensors": 4}

# Test sensors endpoint
curl http://localhost:5000/api/v1/sensors/latest

# Test users endpoint
curl http://localhost:5000/api/v1/users
```

---

## Database Backup Setup

### Create Backup Script (backup_wqms.sh)

```bash
#!/bin/bash

BACKUP_DIR="/backups/wqms"
DB_NAME="wqms_db"
DB_USER="root"
DB_PASSWORD="your_password"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Full backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | \
    gzip > $BACKUP_DIR/wqms_full_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/wqms_full_$TIMESTAMP.sql.gz"
```

### Make Executable and Schedule

```bash
chmod +x backup_wqms.sh

# Add to crontab (daily at 2:00 AM)
crontab -e

# Add this line:
0 2 * * * /home/user/backup_wqms.sh
```

---

## Common Issues & Solutions

### Issue 1: "Unknown column 'character_set_client'"
**Solution:** Upgrade MySQL to 8.0+
```bash
mysql --version  # Check version
```

### Issue 2: "Access denied for user 'root'@'localhost'"
**Solution:** Verify MySQL is running and password is correct
```bash
mysql -u root -p  # Test connection
# If can't connect, restart MySQL:
sudo systemctl restart mysql  # Linux
brew services restart mysql  # macOS
```

### Issue 3: "No module named 'flask'"
**Solution:** Install dependencies
```bash
pip install -r requirements.txt
```

### Issue 4: "1071 Specified key was too long"
**Solution:** Ensure MySQL character set is utf8mb4
```sql
ALTER DATABASE wqms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Issue 5: Port 5000 already in use
**Solution:** Kill the process or use different port
```bash
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port in app.py
socketio.run(app, port=5001)
```

---

## Performance Tuning

### Check Query Performance
```bash
# Enable slow query log
mysql -u root -p -e "SET GLOBAL slow_query_log = 'ON';"

# View slow queries
tail -f /var/log/mysql/slow.log
```

### Optimize Tables
```bash
mysql -u root -p wqms_db -e "OPTIMIZE TABLE sensor_logs, alerts, audit_logs;"
```

### Update Statistics
```bash
mysql -u root -p wqms_db -e "ANALYZE TABLE sensor_logs, alerts, audit_logs;"
```

---

## Production Deployment Checklist

- [ ] Change MySQL root password
- [ ] Create dedicated database user (not root)
- [ ] Enable SSL/TLS for connections
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Enable binary logging for point-in-time recovery
- [ ] Set up monitoring and alerts
- [ ] Enable audit logging
- [ ] Use environment variables for secrets
- [ ] Implement connection pooling
- [ ] Set up read replicas (optional, for scaling)
- [ ] Configure slow query logging
- [ ] Implement query caching/Redis
- [ ] Test disaster recovery procedures

---

## Monitoring & Maintenance

### Check Database Size
```bash
mysql -u root -p -e "SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) MB
FROM information_schema.TABLES
WHERE table_schema = 'wqms_db'
ORDER BY (data_length + index_length) DESC;"
```

### Monitor Active Connections
```bash
mysql -u root -p -e "SHOW PROCESSLIST;"
```

### Check Replication Status (if configured)
```bash
mysql -u root -p -e "SHOW SLAVE STATUS\G"
```

---

## Support & Documentation

- **Schema Documentation**: See `database_schema.md`
- **Implementation Guide**: See `DATABASE_IMPLEMENTATION.md`
- **API Documentation**: See Flask route handlers in `api/v1/`
- **Python Models**: See `models.py` for ORM definitions

For questions or issues, refer to the troubleshooting section above.
