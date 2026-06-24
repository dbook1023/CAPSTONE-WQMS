# WQMS Database Implementation Guide

## Quick Start

### 1. Install Dependencies
```bash
pip install mysql-connector-python
pip install SQLAlchemy==2.0.20
pip install python-dotenv
pip install bcrypt
pip install Werkzeug
```

### 2. Configure Database Connection

Create a `.env` file in the backend directory:

```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password_here
DB_NAME=wqms_db

# SQLAlchemy Connection String (for ORM)
DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/wqms_db

# Optional: For production
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=40
DB_POOL_RECYCLE=3600
```

### 3. Create Database

Option A: Using MySQL CLI
```bash
# Login to MySQL
mysql -u root -p

# Execute schema script
SOURCE /path/to/schema.sql
```

Option B: Using Python (ORM)
```python
from models import init_db
from dotenv import load_dotenv
import os

load_dotenv()
database_url = os.getenv('DATABASE_URL')
init_db(database_url)
```

### 4. Seed Initial Data

```bash
mysql -u root -p wqms_db < schema.sql
```

The schema.sql already includes sample data for:
- Roles (Admin, Operator, Technician, Viewer)
- Alert Severity Levels
- Sensor Types
- Departments
- Default Admin User
- System Settings

---

## Database Connection Setup

### Option 1: Using Raw MySQL Connector (Legacy)

Update `db_config.py`:

```python
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Creates and returns a connection to the MySQL database"""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'wqms_db'),
            port=int(os.getenv('DB_PORT', 3306))
        )
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
        return None

def execute_query(query, params=None):
    """Utility function to execute a query and return results"""
    connection = get_db_connection()
    if connection is None:
        return None
    
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(query, params)
        result = cursor.fetchall()
        connection.commit()
        return result
    except Error as e:
        print(f"Query error: {e}")
        return None
    finally:
        cursor.close()
        connection.close()
```

### Option 2: Using SQLAlchemy ORM (Recommended)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Common Database Operations

### Reading Data

```python
from models import User, Fountain, SensorLog
from sqlalchemy.orm import Session

def get_all_fountains(db: Session):
    """Get all fountains"""
    return db.query(Fountain).all()

def get_latest_sensor_readings(db: Session, fountain_id: int):
    """Get most recent sensor reading"""
    return db.query(SensorLog)\
        .filter(SensorLog.fountain_id == fountain_id)\
        .order_by(SensorLog.timestamp.desc())\
        .first()

def get_active_alerts(db: Session):
    """Get all unresolved alerts"""
    from models import AlertStatus
    return db.query(Alert)\
        .filter(Alert.status == AlertStatus.ACTIVE)\
        .order_by(Alert.timestamp.desc())\
        .all()

def get_user_by_email(db: Session, email: str):
    """Find user by email"""
    return db.query(User).filter(User.email == email).first()
```

### Writing Data

```python
from models import Fountain, SensorLog, Alert, AlertSeverity
from datetime import datetime

def create_fountain(db: Session, name: str, location: str, dept_id: int):
    """Create new fountain"""
    fountain = Fountain(
        name=name,
        location=location,
        department_id=dept_id,
        status='Online'
    )
    db.add(fountain)
    db.commit()
    db.refresh(fountain)
    return fountain

def log_sensor_reading(db: Session, fountain_id: int, ph: float, 
                       turbidity: float, temp: float, tds: float):
    """Log sensor reading"""
    log = SensorLog(
        fountain_id=fountain_id,
        ph=ph,
        turbidity=turbidity,
        temperature=temp,
        tds=tds,
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    return log

def create_alert(db: Session, fountain_id: int, parameter: str, value: float, 
                 threshold_min: float, threshold_max: float, severity_id: int):
    """Create system alert"""
    alert = Alert(
        fountain_id=fountain_id,
        parameter=parameter,
        value=value,
        threshold_min=threshold_min,
        threshold_max=threshold_max,
        severity_id=severity_id,
        message=f"{parameter} out of range: {value}",
        timestamp=datetime.utcnow(),
        status='Active'
    )
    db.add(alert)
    db.commit()
    return alert
```

### Updating Data

```python
def update_user(db: Session, user_id: int, **kwargs):
    """Update user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    return user

def resolve_alert(db: Session, alert_id: int, resolved_by_id: int, note: str):
    """Mark alert as resolved"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return None
    
    alert.status = AlertStatus.RESOLVED
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = resolved_by_id
    alert.resolution_note = note
    
    db.commit()
    db.refresh(alert)
    return alert
```

### Deleting Data

```python
def delete_fountain(db: Session, fountain_id: int):
    """Delete fountain (cascades to related data)"""
    fountain = db.query(Fountain).filter(Fountain.id == fountain_id).first()
    if not fountain:
        return False
    
    db.delete(fountain)
    db.commit()
    return True
```

---

## API Integration Examples

### Updated sensors.py

```python
from flask import Blueprint, request, jsonify
from models import SensorLog, get_db_session
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

sensors_bp = Blueprint('sensors', __name__)
db = get_db_session(os.getenv('DATABASE_URL'))

@sensors_bp.route('/latest', methods=['GET'])
def get_latest_data():
    """Returns the most recent sensor readings"""
    try:
        logs = db.query(SensorLog)\
            .order_by(SensorLog.timestamp.desc())\
            .limit(50)\
            .all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/history', methods=['GET'])
def get_sensor_history():
    """Returns historical data for charts"""
    fountain_id = request.args.get('fountain_id')
    limit = request.args.get('limit', 50, type=int)
    
    if not fountain_id:
        return jsonify({"error": "fountain_id is required"}), 400
    
    try:
        logs = db.query(SensorLog)\
            .filter(SensorLog.fountain_id == fountain_id)\
            .order_by(SensorLog.timestamp.desc())\
            .limit(limit)\
            .all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@sensors_bp.route('/update', methods=['POST'])
def update_sensor_data():
    """Receive sensor data from ESP32"""
    data = request.get_json()
    
    try:
        log = SensorLog(
            fountain_id=data.get('fountain_id'),
            ph=data.get('ph'),
            turbidity=data.get('turbidity'),
            temperature=data.get('temperature'),
            tds=data.get('tds'),
            timestamp=datetime.utcnow()
        )
        db.add(log)
        db.commit()
        return jsonify({"message": "Sensor data logged"}), 201
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 400
```

---

## Query Examples

### Complex Queries

```python
from sqlalchemy import and_, or_, desc

# Get fountains with their latest readings
def get_fountains_with_latest_readings(db):
    from sqlalchemy.orm import aliased
    
    results = db.query(
        Fountain.name,
        Fountain.location,
        SensorLog.ph,
        SensorLog.turbidity,
        SensorLog.temperature,
        SensorLog.tds,
        SensorLog.timestamp
    ).outerjoin(
        SensorLog,
        SensorLog.fountain_id == Fountain.id
    ).distinct(Fountain.id)\
    .order_by(Fountain.id, SensorLog.timestamp.desc())\
    .all()
    
    return results

# Get fountains with active alerts
def get_fountains_with_active_alerts(db):
    from models import AlertStatus
    
    results = db.query(Fountain).join(Alert).filter(
        Alert.status == AlertStatus.ACTIVE
    ).distinct().all()
    
    return results

# Get alert statistics by department
def get_alert_stats_by_department(db):
    from sqlalchemy import func
    
    stats = db.query(
        Department.department_name,
        func.count(Alert.id).label('total_alerts'),
        func.sum(case(
            (Alert.status == AlertStatus.ACTIVE, 1),
            else_=0
        )).label('active_alerts')
    ).join(Fountain).join(Alert).group_by(
        Department.id
    ).all()
    
    return stats

# Get user activity
def get_user_activity(db, days: int = 7):
    from sqlalchemy import func
    from datetime import timedelta
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    activity = db.query(
        User.name,
        User.email,
        func.count(AuditLog.id).label('actions'),
        func.max(AuditLog.timestamp).label('last_activity')
    ).join(AuditLog).filter(
        AuditLog.timestamp >= cutoff_date
    ).group_by(User.id).all()
    
    return activity
```

---

## Performance Optimization Tips

### 1. Use Proper Indexing
```sql
-- Already in schema, but verify with:
SHOW INDEX FROM sensor_logs;
SHOW INDEX FROM alerts;
```

### 2. Pagination for Large Results
```python
def get_paginated_alerts(db, page: int = 1, per_page: int = 20):
    query = db.query(Alert).order_by(Alert.timestamp.desc())
    total = query.count()
    
    alerts = query.offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()
    
    return {
        'data': [alert.to_dict() for alert in alerts],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    }
```

### 3. Bulk Operations
```python
def log_multiple_readings(db, readings_list):
    """Log multiple sensor readings at once"""
    logs = [
        SensorLog(
            fountain_id=r['fountain_id'],
            ph=r['ph'],
            turbidity=r['turbidity'],
            temperature=r['temperature'],
            tds=r['tds'],
            timestamp=r['timestamp']
        )
        for r in readings_list
    ]
    db.bulk_save_objects(logs)
    db.commit()
```

### 4. Use Connection Pooling
```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)
```

---

## Backup & Maintenance

### Automated Backup (Bash Script)

```bash
#!/bin/bash
# backup_wqms.sh

BACKUP_DIR="/backups/wqms"
DB_NAME="wqms_db"
DB_USER="root"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Full backup
mysqldump -u $DB_USER -p $DB_NAME | \
    gzip > $BACKUP_DIR/wqms_full_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/wqms_full_$TIMESTAMP.sql.gz"
```

Add to crontab:
```cron
# Daily backup at 2:00 AM
0 2 * * * /home/user/backup_wqms.sh
```

### Database Maintenance

```python
def optimize_database(db_connection):
    """Optimize tables for performance"""
    tables = ['sensor_logs', 'audit_logs', 'alerts']
    
    cursor = db_connection.cursor()
    for table in tables:
        cursor.execute(f"OPTIMIZE TABLE {table}")
    db_connection.commit()
```

---

## Troubleshooting

### Issue: "Too many connections"
**Solution**: Increase max_connections in MySQL config
```ini
[mysqld]
max_connections = 1000
```

### Issue: Slow sensor_logs queries
**Solution**: Implement partitioning
```sql
ALTER TABLE sensor_logs PARTITION BY RANGE 
(YEAR(timestamp)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### Issue: "Lost connection to MySQL server"
**Solution**: Enable pool_pre_ping and pool_recycle
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

---

## Security Best Practices

1. **Password Hashing**: Always use bcrypt (cost 10+)
   ```python
   user.set_password(password)  # Automatically hashed
   ```

2. **SQL Injection Prevention**: Always use parameterized queries
   ```python
   # ✅ GOOD
   db.query(User).filter(User.email == email).first()
   
   # ❌ BAD
   execute_query(f"SELECT * FROM users WHERE email = '{email}'")
   ```

3. **Environment Variables**: Never hardcode credentials
   ```python
   load_dotenv()
   DB_PASSWORD = os.getenv('DB_PASSWORD')
   ```

4. **Audit Logging**: Track all actions
   ```python
   sp_audit_log(user_id, 'UPDATE', 'users', user_id, old_vals, new_vals, ip)
   ```

---

## Next Steps

1. ✅ Create the database using schema.sql
2. ✅ Configure db_config.py with your database credentials
3. ✅ Update API endpoints to use ORM models
4. ✅ Implement authentication with password hashing
5. ✅ Set up audit logging for compliance
6. ✅ Configure automated backups
7. ✅ Load test with multiple concurrent users
8. ✅ Implement caching layer (Redis) for frequently accessed data
9. ✅ Set up database monitoring and alerts
10. ✅ Document API endpoints with Swagger/OpenAPI
