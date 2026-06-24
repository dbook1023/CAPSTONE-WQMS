# WQMS Database - Visual Reference

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     WQMS Frontend (HTML/JS)                         │
│         (dashboards, alerts, user interface, real-time updates)     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTP/REST/WebSocket
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                   Flask Backend (Python)                            │
│     /api/v1/users     /api/v1/fountains    /api/v1/sensors         │
│     /api/v1/alerts    /api/v1/settings     /api/v1/auth            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ SQLAlchemy ORM / MySQL Queries
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      MySQL Database                                 │
│    (11 tables, indexes, views, procedures - see below)             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Entity Relationship Diagram (Detailed)

```
                                    ┌──────────────┐
                                    │    roles     │
                                    ├──────────────┤
                                    │ id (PK)      │
                                    │ role_name    │
                                    │ permissions  │◄───────┐
                                    │ description  │        │
                                    └──────────────┘        │
                                           ▲                │
                                           │                │
                              ┌────────────┴────────┐      │
                              │                     │      │
                              │                     │      │
                    ┌──────────▼────────┐  ┌───────▼───────────────┐
                    │ users             │  │ audit_logs            │
                    ├──────────────────┤  ├──────────────────────┤
                    │ id (PK)           │  │ id (PK)              │
                    │ email (UNIQUE)    │  │ user_id (FK)◄─┐      │
                    │ name              │  │ action              │
                    │ password          │  │ entity_type        │
                    │ role_id (FK)──────┼──│ entity_id           │
                    │ phone             │  │ old_values (JSON)   │
                    │ status            │  │ new_values (JSON)   │
                    │ last_login        │  │ timestamp (INDEX)   │
                    │ created_at        │  │ ip_address          │
                    │ updated_at        │  │ status              │
                    └──────────────────┘  └─────────────────────┘
                              │
                              │ FK users.id
                              │
                 ┌────────────┴────────────┬──────────────────┐
                 │                         │                  │
      ┌──────────▼──────────┐  ┌──────────▼────────┐  ┌──────▼────────────┐
      │ alerts              │  │ system_settings   │  │ FUTURE: email_logs │
      ├─────────────────────┤  ├──────────────────┤  │ FUTURE: sms_logs   │
      │ id (PK)             │  │ id (PK)          │  │ FUTURE: reports    │
      │ fountain_id (FK)────┼─▶│ setting_key      │  └────────────────────┘
      │ parameter           │  │ setting_value    │
      │ value               │  │ setting_type     │
      │ threshold_min       │  │ description      │
      │ threshold_max       │  │ updated_at       │
      │ severity_id (FK)────┼┐ │ updated_by (FK)  │
      │ status (INDEX)      │└─┼──────────────────┼─ users.id
      │ message             │  │ THRESHOLDS:      │
      │ timestamp (INDEX)   │  │ ph_min = 6.5     │
      │ resolved_at         │  │ ph_max = 8.5     │
      │ resolution_note     │  │ turbidity_max=5  │
      │ resolved_by (FK)────┼──│ temp_min = 15    │
      │ acknowledged_by (FK)├──│ temp_max = 30    │
      │ acknowledged_at     │  │ tds_max = 500    │
      │ created_at          │  │ (more...)        │
      └─────────────────────┘  └──────────────────┘
              │
              │ FK fountain_id
              │
      ┌───────▼─────────────────────────────┐
      │                                     │
┌─────▼─────────────┐          ┌───────────▼──────────┐
│ alert_severity    │          │ fountains            │
├──────────────────┤          ├──────────────────────┤
│ id (PK)           │          │ id (PK)              │
│ severity_level    │◄─────────│ name (UNIQUE)        │
│ priority_score    │          │ location (INDEX)     │
│ description       │          │ department_id (FK)───┼──┐
└──────────────────┘          │ model                │  │
                               │ status (INDEX)       │  │
                               │ latitude             │  │
                               │ longitude (SPATIAL)  │  │
                               │ installed_date       │  │
                               │ last_maintained      │  │
                               │ notes                │  │
                               │ created_at           │  │
                               │ updated_at           │  │
                               └──────────────────────┘  │
                                        ▲                │
                                        │ FK             │
                                   ┌────┴──────────┐    │
                                   │                │    │
                        ┌──────────┴────────┐       │    │
                        │                   │       │    │
              ┌─────────▼──────────┐   ┌────▼──────▼─────────────┐
              │ sensors            │   │ departments              │
              ├────────────────────┤   ├──────────────────────────┤
              │ id (PK)            │   │ id (PK)                  │
              │ fountain_id (FK)───┼──▶│ department_name (UNIQUE) │
              │ sensor_type_id (FK)├──┐│ location_desc            │
              │ serial_number      │  │ │ contact_person          │
              │ calibration_date   │  │ │ contact_email           │
              │ calibration_due    │  │ │ created_at              │
              │ status             │  │ └──────────────────────────┘
              │ battery_level      │  │
              │ notes              │  │
              │ created_at         │  │
              │ updated_at         │  │
              └────────────────────┘  │
                       ▲               │
                       │               │
              ┌────────┴───────────────┤
              │                        │
    ┌─────────▼──────────┐ ┌──────────▼────────────┐
    │ sensor_types       │ │ sensor_logs          │
    ├────────────────────┤ ├──────────────────────┤
    │ id (PK)            │ │ id (PK, BIGINT)      │
    │ type_name (UNIQUE) │ │ fountain_id (FK)     │
    │ unit               │ │ ph (DECIMAL)         │
    │ range_min          │ │ turbidity (DECIMAL)  │
    │ range_max          │ │ temperature (DECIMAL)│
    │ description        │ │ tds (DECIMAL)        │
    │ created_at         │ │ timestamp (INDEX)    │
    └────────────────────┘ │ created_at           │
                           └──────────────────────┘
                           
                    TIME-SERIES DATA
                    (Millions of records)
                    (Partition by DATE)
```

---

## Data Flow Diagrams

### Sensor Reading Flow

```
┌──────────────┐
│ ESP32 Device │ (every 5 minutes)
└──────┬───────┘
       │ POST /api/v1/sensors/update
       │ {"fountain_id": 1, "ph": 7.2, "turbidity": 2.3, ...}
       │
       ▼
┌──────────────────────────────────┐
│ Flask: update_sensor_data()      │
│ - Validate input                 │
│ - Insert to sensor_logs          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ MySQL: sensor_logs TABLE         │
│ INSERT row                       │
│ fountain_id=1, ph=7.2, time=now  │
└──────┬───────────────────────────┘
       │
       ├──▶ (Trigger/Procedure) Check thresholds
       │    IF ph > 8.5 THEN INSERT into alerts
       │
       ▼
┌──────────────────────────────────┐
│ MySQL: alerts TABLE (optional)   │
│ INSERT (if out of bounds)        │
│ status='Active', severity=HIGH   │
└──────────────────────────────────┘
```

### Alert Workflow

```
┌──────────────────────────────────┐
│ Threshold Violation Detected     │
│ (Automated or Manual)            │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Create Alert                     │
│ alerts.status = 'Active'         │
│ alerts.severity_id = 3 (HIGH)    │
│ alerts.timestamp = NOW()         │
└──────┬───────────────────────────┘
       │
       ├──▶ Notify Operator (WebSocket)
       │
       ▼
┌──────────────────────────────────┐
│ Operator Acknowledges            │
│ PUT /api/v1/alerts/{id}          │
│ status = 'Acknowledged'          │
│ acknowledged_by = user_id        │
│ acknowledged_at = NOW()          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Technician Resolves              │
│ PUT /api/v1/alerts/{id}/resolve  │
│ status = 'Resolved'              │
│ resolved_by = user_id            │
│ resolution_note = '...'          │
│ resolved_at = NOW()              │
└──────────────────────────────────┘
```

### User Authentication Flow

```
┌─────────────────────┐
│ Login Request       │
│ {email, password}   │
└──────┬──────────────┘
       │ POST /api/v1/auth/login
       │
       ▼
┌──────────────────────────────────┐
│ Flask: login()                   │
│ - Get email from request         │
│ - Query users table              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ MySQL: SELECT users WHERE        │
│ email = 'user@wqms.local'        │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Verify Password (Bcrypt)         │
│ check_password_hash()            │
│ Password match? YES ────────┐    │
└──────────────────────────────────┘
                                    │
                    ┌───────────────┘
                    ▼
    ┌───────────────────────────────────┐
    │ Update last_login timestamp       │
    │ UPDATE users SET                  │
    │ last_login = NOW()                │
    │ WHERE id = {user_id}              │
    └───┬───────────────────────────────┘
        │
        ├──▶ Log audit entry
        │    INSERT audit_logs
        │    action='LOGIN', user_id=X
        │    ip_address=X, timestamp=NOW()
        │
        ▼
    ┌───────────────────────────────────┐
    │ Return user data + role info      │
    │ {id, name, email, role_name, ...} │
    └───────────────────────────────────┘
```

---

## Index Strategy

### Primary Indexes (Used in 90% of queries)

```
Table: users
├── PRIMARY KEY (id)
├── UNIQUE INDEX uk_email (email) → Fast login lookups
└── FOREIGN KEY INDEX (role_id) → Join performance

Table: fountains
├── PRIMARY KEY (id)
├── UNIQUE INDEX uk_name (name)
├── FOREIGN KEY INDEX (department_id)
└── REGULAR INDEX (status) → Quick filter by Online/Offline

Table: sensor_logs
├── PRIMARY KEY (id)
├── COMPOSITE INDEX (fountain_id, timestamp) → Most queries
├── REGULAR INDEX (timestamp) → Date range queries
└── REGULAR INDEX (fountain_id) → Single fountain lookups

Table: alerts
├── PRIMARY KEY (id)
├── REGULAR INDEX (status) → Find active alerts quickly
├── REGULAR INDEX (timestamp) → Recent alerts
├── COMPOSITE INDEX (status, timestamp) → Common filter combo
└── FOREIGN KEY INDEX (fountain_id)
```

### Expected Query Times (with indexes)

```
Query: Get latest reading for fountain 1
SELECT * FROM sensor_logs WHERE fountain_id=1 ORDER BY timestamp DESC LIMIT 1
├─ Without index: 50-100ms (full table scan)
└─ With index: 2-5ms ✅ 

Query: Find active alerts
SELECT * FROM alerts WHERE status='Active' ORDER BY timestamp DESC
├─ Without index: 100-200ms
└─ With index: 10-20ms ✅

Query: User login
SELECT * FROM users WHERE email='user@wqms.local'
├─ Without index: 30-50ms
└─ With index: 1-2ms ✅
```

---

## Normalization Examples

### Why We Separated Roles (2NF)

**❌ NOT NORMALIZED (Data Anomalies)**
```
users table (without role separation):
┌────┬──────────────────┬────────────────────────────────┐
│ id │ email            │ role_permissions (JSON)        │
├────┼──────────────────┼────────────────────────────────┤
│ 1  │ admin@...        │ {"users":true, "settings":...} │
│ 2  │ operator@...     │ {"users":true, "settings":...} │
│ 3  │ technician@...   │ {"users":true, "settings":...} │
└────┴──────────────────┴────────────────────────────────┘
Problem: Duplicate permissions (data redundancy)
```

**✅ NORMALIZED (Our Design)**
```
roles table:
┌────┬──────────────┬────────────────────────────────┐
│ id │ role_name    │ permissions (JSON)             │
├────┼──────────────┼────────────────────────────────┤
│ 1  │ Admin        │ {"users":true, "settings":...} │
│ 2  │ Operator     │ {"users":false, "settings":...}│
│ 3  │ Technician   │ {"users":false, "settings":...}│
└────┴──────────────┴────────────────────────────────┘

users table:
┌────┬──────────────────┬─────────┐
│ id │ email            │ role_id │
├────┼──────────────────┼─────────┤
│ 1  │ admin@...        │ 1       │ → FK to roles
│ 2  │ operator@...     │ 2       │
│ 3  │ technician@...   │ 3       │
└────┴──────────────────┴─────────┘
Benefit: One change to roles.permissions updates all users ✅
```

---

## Capacity Planning

### Year-by-Year Growth

```
YEAR 1:
├─ Fountains: 50
├─ Sensors: 200 (4 per fountain)
├─ Readings/day: 57,600 (1 every 5 min)
├─ Database size: ~2 GB
└─ Tables OK without partitioning

YEAR 2:
├─ Fountains: 100
├─ Sensors: 400
├─ Readings/day: 115,200
├─ Database size: ~4 GB
├─ ACTION: Partition sensor_logs by MONTH
└─ Tables still performing well

YEAR 3+:
├─ Fountains: 200+
├─ Sensors: 800+
├─ Readings/day: 230,400+
├─ Database size: 6+ GB
├─ ACTION: Archive old alerts/audit_logs
├─ ACTION: Implement read replicas
└─ Consider: NoSQL for time-series (InfluxDB)
```

---

## Disaster Recovery

### Recovery Point Objective (RPO) by Strategy

```
HOURLY BACKUPS:
├─ Backup every hour
├─ Data loss window: 1 hour maximum
└─ Storage needed: 30 GB/month (for MySQL 2GB/day)

DAILY BACKUPS + BINARY LOGS:
├─ Full backup daily (2-3 GB)
├─ Binary logs every 15 minutes
├─ Point-in-time recovery: Yes
├─ Data loss window: 15 minutes
└─ Storage needed: 90 GB/month

REPLICATION SETUP:
├─ Real-time replication to secondary server
├─ Zero data loss (synchronous)
├─ Failover: < 1 minute
└─ Additional server cost
```

---

## Security Layers

```
┌─────────────────────────────────────────────────┐
│ Application Layer (Flask)                       │
│ - JWT/Session tokens                           │
│ - HTTPS only                                    │
│ - CORS validation                               │
├─────────────────────────────────────────────────┤
│ Authentication Layer (Users Table)              │
│ - Bcrypt password hashing (10+ rounds)         │
│ - Email verification                            │
│ - Role-based access control                     │
├─────────────────────────────────────────────────┤
│ Database Layer (MySQL)                          │
│ - User permissions (grant ... to user)         │
│ - SSL/TLS connections                          │
│ - Connection encryption                         │
│ - Parameterized queries (SQL injection proof)   │
├─────────────────────────────────────────────────┤
│ Audit Layer                                     │
│ - All actions logged in audit_logs             │
│ - User tracking (who did what when)            │
│ - IP address logging                            │
│ - Action status (success/failure)              │
├─────────────────────────────────────────────────┤
│ Network Layer (Infrastructure)                  │
│ - Firewall rules (port 3306 → app server only) │
│ - VPN for remote connections                    │
│ - Private network/VPC for database              │
└─────────────────────────────────────────────────┘
```

---

## Quick Lookup: What Data Goes Where?

```
USER MANAGEMENT
├─ User login credentials → users table (bcrypt hashed)
├─ User permissions → roles table (JSON)
├─ User activity → audit_logs table
└─ Last login time → users.last_login

FOUNTAIN MONITORING
├─ Fountain details (name, location) → fountains table
├─ Fountain department/building → departments table
├─ Fountain location (GPS) → fountains.latitude/longitude
└─ Fountain status (Online/Offline) → fountains.status

SENSOR DATA
├─ Sensor specifications → sensor_types (reference table)
├─ Physical sensor info → sensors (serial number, calibration)
├─ Live readings (pH, temp, etc) → sensor_logs (TIME-SERIES)
└─ Sensor status/battery → sensors.status/battery_level

ALERTS & NOTIFICATIONS
├─ Alert definitions → alerts table
├─ Alert severity levels → alert_severity (reference)
├─ Alert history → alerts.created_at, resolved_at
└─ Who handled alerts → users (acknowledged_by, resolved_by)

SYSTEM CONFIGURATION
├─ Thresholds (pH=6.5-8.5, etc) → system_settings
├─ Feature flags → system_settings
├─ Notification preferences → system_settings
└─ Who changed what → audit_logs (updated_by, timestamp)
```

---

This visual reference provides the complete picture of your database design! 📊
