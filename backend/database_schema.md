# WQMS Database Schema Design

## Overview
This document describes the production-ready database design for the Water Quality Monitoring System (WQMS). The schema implements 3NF (Third Normal Form) normalization for data integrity and efficient querying.

---

## Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
│─────────────│
│ id (PK)     │
│ email (UNQ) │
│ name        │
│ password    │
│ role_id (FK)│
│ status      │
│ created_at  │
│ updated_at  │
└─────────────┘
      ↓
┌─────────────┐
│    Roles    │
│─────────────│
│ id (PK)     │
│ role_name   │
│ permissions │
└─────────────┘

┌──────────────────┐
│    Fountains     │
│──────────────────│
│ id (PK)          │
│ name (UNQ)       │
│ location         │
│ department_id(FK)│
│ model            │
│ status           │
│ installed_date   │
│ created_at       │
│ updated_at       │
└──────────────────┘
      ↓
┌──────────────────┐
│   Departments    │
│──────────────────│
│ id (PK)          │
│ department_name  │
│ location_desc    │
└──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│    Sensors       │         │   Sensor Types   │
│──────────────────│         │──────────────────│
│ id (PK)          │────────→│ id (PK)          │
│ fountain_id (FK) │         │ type_name        │
│ sensor_type_id   │         │ unit             │
│ serial_number    │         │ range_min        │
│ calibration_date │         │ range_max        │
│ status           │         └──────────────────┘
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│   Sensor Logs    │
│──────────────────│
│ id (PK)          │
│ fountain_id (FK) │
│ ph               │
│ turbidity (NTU)  │
│ temperature (°C) │
│ tds (ppm)        │
│ timestamp (IDX)  │
└──────────────────┘

┌──────────────────┐        ┌────────────────┐
│     Alerts       │        │ Alert Severity │
│──────────────────│        │────────────────│
│ id (PK)          │───────→│ id (PK)        │
│ fountain_id (FK) │        │ severity_level │
│ parameter        │        │ description    │
│ value            │        └────────────────┘
│ threshold_min    │
│ threshold_max    │
│ severity_id (FK) │
│ status           │
│ message          │
│ timestamp (IDX)  │
│ resolved_at      │
│ resolution_note  │
│ resolved_by (FK) │
└──────────────────┘

┌────────────────────┐
│ System Settings    │
│────────────────────│
│ id (PK)            │
│ setting_key (UNQ)  │
│ setting_value      │
│ setting_type       │
│ description        │
│ updated_at         │
│ updated_by (FK)    │
└────────────────────┘

┌──────────────────┐
│ Audit Logs       │
│──────────────────│
│ id (PK)          │
│ user_id (FK)     │
│ action           │
│ entity_type      │
│ entity_id        │
│ old_values       │
│ new_values       │
│ timestamp (IDX)  │
│ ip_address       │
└──────────────────┘
```

---

## Table Specifications

### 1. **roles** - Role Management
**Purpose**: Define system roles and permissions  
**Normalization**: 1NF (atomic values)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique role identifier |
| role_name | VARCHAR(50) | UNIQUE, NOT NULL | Role name (Admin, Operator, Technician) |
| permissions | JSON | NOT NULL | Role permissions in JSON format |
| description | TEXT | - | Role description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Why**: Separating roles into a table allows for flexible permission management and easy role updates without modifying the users table.

---

### 2. **departments** - Location/Department Management
**Purpose**: Organize fountains by department/building  
**Normalization**: 1NF

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique department ID |
| department_name | VARCHAR(100) | UNIQUE, NOT NULL | Department name |
| location_desc | TEXT | - | Detailed location description |
| contact_person | VARCHAR(100) | - | Department contact |
| contact_email | VARCHAR(100) | - | Contact email |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Why**: Allows filtering fountains by department and organizing monitoring by location.

---

### 3. **users** - User Management
**Purpose**: Store system user credentials and information  
**Normalization**: 2NF (removed role dependency to separate table)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique user identifier |
| email | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | User email for login |
| name | VARCHAR(100) | NOT NULL | User full name |
| password | VARCHAR(255) | NOT NULL | Hashed password |
| role_id | INT | FK(roles.id), NOT NULL | User role reference |
| phone | VARCHAR(20) | - | Contact phone |
| status | ENUM('Active', 'Inactive', 'Suspended') | DEFAULT 'Active' | User status |
| last_login | TIMESTAMP | - | Last login timestamp |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Indexes**: 
- PRIMARY KEY (id)
- UNIQUE (email)
- INDEX (role_id)

**Why**: Proper indexing on email for fast login queries. Foreign key to roles enables flexible permission management.

---

### 4. **sensor_types** - Sensor Type Reference
**Purpose**: Define available sensor types and their specifications  
**Normalization**: 1NF

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique sensor type ID |
| type_name | VARCHAR(50) | UNIQUE, NOT NULL | Sensor type (pH, Turbidity, Temperature, TDS) |
| unit | VARCHAR(20) | NOT NULL | Measurement unit (pH, NTU, °C, ppm) |
| range_min | DECIMAL(10,2) | NOT NULL | Minimum measurement range |
| range_max | DECIMAL(10,2) | NOT NULL | Maximum measurement range |
| description | TEXT | - | Sensor description |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Why**: Normalizes sensor type data and allows for easy addition of new sensor types.

---

### 5. **fountains** - Fountain Assets
**Purpose**: Store information about monitored water fountains  
**Normalization**: 2NF (department dependency removed)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique fountain identifier |
| name | VARCHAR(100) | UNIQUE, NOT NULL | Fountain name/identifier |
| location | VARCHAR(150) | NOT NULL | Physical location description |
| department_id | INT | FK(departments.id), NOT NULL | Department reference |
| model | VARCHAR(100) | - | Fountain model/make |
| status | ENUM('Online', 'Offline', 'Maintenance', 'Inactive') | DEFAULT 'Online' | Current status |
| latitude | DECIMAL(10,8) | - | GPS latitude |
| longitude | DECIMAL(11,8) | - | GPS longitude |
| installed_date | DATE | - | Installation date |
| last_maintained | DATE | - | Last maintenance date |
| notes | TEXT | - | Additional notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE (name)
- INDEX (department_id)
- INDEX (status)

**Why**: GPS coordinates for mapping features. Status field enables quick filtering of operational fountains.

---

### 6. **sensors** - Physical Sensor Devices
**Purpose**: Track individual sensor devices assigned to fountains  
**Normalization**: 2NF

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique sensor identifier |
| fountain_id | INT | FK(fountains.id), NOT NULL | Fountain reference |
| sensor_type_id | INT | FK(sensor_types.id), NOT NULL | Sensor type reference |
| serial_number | VARCHAR(100) | UNIQUE, NOT NULL | Sensor serial number |
| calibration_date | DATE | - | Last calibration date |
| calibration_due | DATE | - | Next calibration due date |
| status | ENUM('Active', 'Inactive', 'Faulty', 'Calibrating') | DEFAULT 'Active' | Sensor status |
| battery_level | TINYINT | - | Battery percentage (0-100) for wireless |
| notes | TEXT | - | Maintenance notes |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update timestamp |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE (serial_number)
- INDEX (fountain_id)
- INDEX (status)

**Why**: Allows tracking multiple sensors per fountain. Calibration tracking ensures data accuracy.

---

### 7. **sensor_logs** - Real-time Sensor Data
**Purpose**: Store time-series sensor readings  
**Normalization**: 3NF (all data directly depends on sensor_logs PK)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGINT | PK, AUTO_INCREMENT | Unique log entry ID |
| fountain_id | INT | FK(fountains.id), NOT NULL, INDEX | Fountain reference |
| ph | DECIMAL(5,2) | NOT NULL | pH value (0-14) |
| turbidity | DECIMAL(8,2) | NOT NULL | Turbidity in NTU |
| temperature | DECIMAL(5,2) | NOT NULL | Temperature in °C |
| tds | DECIMAL(8,2) | NOT NULL | Total Dissolved Solids in ppm |
| timestamp | TIMESTAMP | NOT NULL, INDEX | Reading timestamp |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (fountain_id)
- INDEX (timestamp)
- COMPOSITE INDEX (fountain_id, timestamp) - for range queries

**Why**: Uses BIGINT for ID to handle millions of records. Timestamp index enables efficient historical queries. Partition strategy can be applied by date for large datasets.

---

### 8. **alert_severity** - Alert Severity Levels
**Purpose**: Define severity levels for alerts  
**Normalization**: 1NF

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Severity level ID |
| severity_level | VARCHAR(20) | UNIQUE, NOT NULL | Level name (Critical, High, Medium, Low) |
| priority_score | INT | NOT NULL | Priority ranking for sorting |
| description | TEXT | - | Description of severity |

**Why**: Allows flexible alert severity management and easy sorting by priority.

---

### 9. **alerts** - System Alerts
**Purpose**: Store alert events triggered by out-of-threshold sensor readings  
**Normalization**: 2NF (severity dependency removed)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Unique alert ID |
| fountain_id | INT | FK(fountains.id), NOT NULL, INDEX | Fountain reference |
| parameter | VARCHAR(50) | NOT NULL | Parameter name (pH, Turbidity, etc.) |
| value | DECIMAL(10,2) | NOT NULL | Actual measured value |
| threshold_min | DECIMAL(10,2) | - | Minimum threshold |
| threshold_max | DECIMAL(10,2) | - | Maximum threshold |
| severity_id | INT | FK(alert_severity.id), NOT NULL | Alert severity |
| status | ENUM('Active', 'Acknowledged', 'Resolved') | DEFAULT 'Active', INDEX | Alert status |
| message | TEXT | NOT NULL | Alert message |
| timestamp | TIMESTAMP | NOT NULL, INDEX | Alert triggered time |
| acknowledged_at | TIMESTAMP | - | When alert was acknowledged |
| acknowledged_by | INT | FK(users.id) | User who acknowledged |
| resolved_at | TIMESTAMP | - | When alert was resolved |
| resolution_note | TEXT | - | Resolution description |
| resolved_by | INT | FK(users.id) | User who resolved |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (fountain_id)
- INDEX (status)
- COMPOSITE INDEX (timestamp, status)

**Why**: Tracks alert lifecycle. Foreign keys to users maintain audit trail of who handled alerts. Status field allows filtering by active/resolved alerts.

---

### 10. **system_settings** - Configuration Management
**Purpose**: Store system-wide configuration and threshold settings  
**Normalization**: 1NF (atomic values)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | INT | PK, AUTO_INCREMENT | Setting ID |
| setting_key | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | Setting key (ph_min, turbidity_max) |
| setting_value | TEXT | NOT NULL | Setting value |
| setting_type | ENUM('threshold', 'config', 'feature') | DEFAULT 'config' | Setting category |
| description | TEXT | - | Setting description |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | Last update |
| updated_by | INT | FK(users.id) | User who made update |

**Indexes**:
- PRIMARY KEY (id)
- UNIQUE (setting_key)

**Sample Settings**:
```
ph_min = 6.5
ph_max = 8.5
turbidity_min = 0
turbidity_max = 5.0
temperature_min = 15
temperature_max = 30
tds_min = 0
tds_max = 500
alert_email_enabled = 1
sensor_reading_interval = 300 (seconds)
```

**Why**: Centralized configuration management allows threshold changes without code modifications.

---

### 11. **audit_logs** - Activity Auditing
**Purpose**: Track all user actions for compliance and debugging  
**Normalization**: 3NF (all data directly depends on PK)

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| id | BIGINT | PK, AUTO_INCREMENT | Unique audit log ID |
| user_id | INT | FK(users.id), NOT NULL, INDEX | User who performed action |
| action | VARCHAR(50) | NOT NULL | Action type (INSERT, UPDATE, DELETE, LOGIN) |
| entity_type | VARCHAR(50) | NOT NULL | Entity affected (users, fountains, alerts) |
| entity_id | INT | - | ID of affected entity |
| old_values | JSON | - | Previous values for UPDATE operations |
| new_values | JSON | - | New values after operation |
| timestamp | TIMESTAMP | NOT NULL, INDEX | Action timestamp |
| ip_address | VARCHAR(45) | - | User IP address (IPv4/IPv6) |
| status | ENUM('Success', 'Failure') | DEFAULT 'Success' | Action status |
| error_message | TEXT | - | Error details if failed |

**Indexes**:
- PRIMARY KEY (id)
- INDEX (user_id)
- INDEX (timestamp)
- COMPOSITE INDEX (entity_type, entity_id)

**Why**: Provides complete audit trail for regulatory compliance (PNSDW). JSON fields allow flexible schema for storing complex changes.

---

## Normalization Strategy

### First Normal Form (1NF)
✅ All tables contain only atomic (indivisible) values
✅ No repeating groups

### Second Normal Form (2NF)
✅ All non-key attributes fully depend on the primary key (no partial dependencies)
✅ Surrogate keys used for efficient indexing
✅ Dependencies on other entities moved to separate tables (e.g., roles, departments, alert_severity)

### Third Normal Form (3NF)
✅ No transitive dependencies - non-key attributes depend only on primary key, not on other non-key attributes
✅ Example: Sensor data (sensor_logs) doesn't store fountain_location redundantly; it references fountain_id which has location

---

## Performance Optimization

### Indexes
- **Composite Indexes** on frequently queried combinations (fountain_id + timestamp)
- **Covering Indexes** to satisfy queries without table access
- **Partial Indexes** on status fields to quickly find active items

### Query Optimization
- Avoid SELECT * - specify needed columns
- Use pagination for large result sets
- Implement connection pooling

### Partitioning Strategy (Future)
- **sensor_logs**: Partition by DATE on timestamp column (monthly partitions)
- **audit_logs**: Partition by DATE on timestamp column
- Improves query performance on historical data

### Caching Strategy
- Cache system_settings in application memory
- Cache frequent queries (latest readings) with 5-min TTL
- Use Redis for WebSocket data

---

## Security Considerations

1. **Passwords**: Use bcrypt/Argon2 hashing (bcrypt recommended: 10+ rounds)
2. **IP Logging**: Track user IPs for suspicious activity detection
3. **Foreign Keys**: Enforce referential integrity
4. **Timestamps**: Automatic timestamps for audit trails
5. **Least Privilege**: Users table has role_id to implement permission system
6. **Encryption**: Sensitive data (if any) should use AES-256

---

## Backup Strategy

- **Full Backup**: Daily at 2:00 AM UTC
- **Incremental Backup**: Every 6 hours
- **Point-in-Time Recovery**: Enabled with binary logs (7-day retention)
- **Test Restores**: Weekly validation of backup integrity

---

## Growth Projections

**Assumptions**:
- 50 fountains
- 4 sensors per fountain (pH, Turbidity, Temperature, TDS)
- 1 reading every 5 minutes

**Annual Data Growth**:
- Sensor logs per year: 50 × 4 × 12 × 365 / (5/60) = **17,520,000 records**
- Estimated sensor_logs table size: ~1.5 GB/year
- Estimated total database: ~2-3 GB/year

**Recommendation**: Implement partitioning after year 1 and consider archival strategy for logs >2 years old.

---

## Implementation Steps

1. ✅ Create database and tables (see schema.sql)
2. ✅ Create foreign key constraints
3. ✅ Create indexes
4. ✅ Create views for common queries
5. ✅ Implement triggers for audit logging
6. ✅ Set up backup procedures
7. ✅ Configure connection pooling
8. ✅ Load sample data
