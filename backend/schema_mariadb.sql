-- ================================================================
-- WQMS (Water Quality Management System) Database Schema
-- MariaDB Compatible | Production-Ready | Normalized to 3NF
-- Version: 1.1 (MariaDB Edition)
-- ================================================================

DROP DATABASE IF EXISTS wqms_db;

CREATE DATABASE wqms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE wqms_db;

-- ================================================================
-- 1. ROLES TABLE
-- ================================================================
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSON NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 2. DEPARTMENTS TABLE
-- ================================================================
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(100) UNIQUE NOT NULL,
    location_desc TEXT,
    contact_person VARCHAR(100),
    contact_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dept_name (department_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 3. USERS TABLE
-- ================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_email (email),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    INDEX idx_email (email),
    INDEX idx_role_id (role_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 3b. ADMINS TABLE
-- ================================================================
CREATE TABLE admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_admin_email (email),
    INDEX idx_admin_email (email),
    INDEX idx_admin_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 4. SENSOR TYPES TABLE
-- ================================================================
CREATE TABLE sensor_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    unit VARCHAR(20) NOT NULL,
    range_min DECIMAL(10,2) NOT NULL,
    range_max DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 5. FOUNTAINS TABLE
-- ================================================================
CREATE TABLE fountains (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(150) NOT NULL,
    department_id INT NOT NULL,
    model VARCHAR(100),
    status ENUM('Online', 'Offline', 'Maintenance', 'Inactive') DEFAULT 'Online',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    installed_date DATE,
    last_maintained DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_name (name),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    
    INDEX idx_dept_id (department_id),
    INDEX idx_status (status),
    INDEX idx_location (location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 6. SENSORS TABLE
-- ================================================================
CREATE TABLE sensors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fountain_id INT NOT NULL,
    sensor_type_id INT NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    calibration_date DATE,
    calibration_due DATE,
    status ENUM('Active', 'Inactive', 'Faulty', 'Calibrating') DEFAULT 'Active',
    battery_level TINYINT UNSIGNED,
    firmware_version VARCHAR(20) NULL,
    calibration_params JSON NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_serial_number (serial_number),
    FOREIGN KEY (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    FOREIGN KEY (sensor_type_id) REFERENCES sensor_types(id) ON DELETE RESTRICT,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_status (status),
    INDEX idx_calibration_due (calibration_due)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 7. SENSOR LOGS TABLE (Time-series data)
-- ================================================================
CREATE TABLE sensor_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    fountain_id INT NOT NULL,
    ph DECIMAL(5,2) NOT NULL,
    turbidity DECIMAL(8,2) NOT NULL,
    temperature DECIMAL(5,2) NOT NULL,
    tds DECIMAL(8,2) NOT NULL,
    ph_voltage DECIMAL(6,4) NULL,
    tds_voltage DECIMAL(6,4) NULL,
    turb_voltage DECIMAL(6,4) NULL,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_fountain_timestamp (fountain_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 8. ALERT SEVERITY TABLE
-- ================================================================
CREATE TABLE alert_severity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    severity_level VARCHAR(20) UNIQUE NOT NULL,
    priority_score INT NOT NULL,
    description TEXT,
    
    INDEX idx_priority (priority_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 9. ALERTS TABLE
-- ================================================================
CREATE TABLE alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fountain_id INT NOT NULL,
    parameter VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    threshold_min DECIMAL(10,2),
    threshold_max DECIMAL(10,2),
    severity_id INT NOT NULL,
    status ENUM('Active', 'Acknowledged', 'Resolved') DEFAULT 'Active',
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by INT NULL,
    resolved_at TIMESTAMP NULL,
    resolution_note TEXT,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    FOREIGN KEY (severity_id) REFERENCES alert_severity(id) ON DELETE RESTRICT,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp),
    INDEX idx_severity (severity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 10. SYSTEM SETTINGS TABLE
-- ================================================================
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('threshold', 'config', 'feature', 'notification') DEFAULT 'config',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL,
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_setting_type (setting_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 11. AUDIT LOGS TABLE
-- ================================================================
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    admin_id INT,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    status ENUM('Success', 'Failure') DEFAULT 'Success',
    error_message TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================

CREATE VIEW vw_fountain_status AS
SELECT 
    f.id,
    f.name,
    f.location,
    d.department_name,
    f.status,
    (SELECT MAX(timestamp) FROM sensor_logs WHERE fountain_id = f.id) AS last_reading_time,
    (SELECT COUNT(*) FROM alerts WHERE fountain_id = f.id AND status IN ('Active', 'Acknowledged')) AS active_alerts
FROM fountains f
LEFT JOIN departments d ON f.department_id = d.id
ORDER BY f.name;

CREATE VIEW vw_latest_readings AS
SELECT 
    f.id,
    f.name,
    f.location,
    (SELECT sl.ph FROM sensor_logs sl WHERE sl.fountain_id = f.id ORDER BY sl.timestamp DESC LIMIT 1) AS ph,
    (SELECT sl.turbidity FROM sensor_logs sl WHERE sl.fountain_id = f.id ORDER BY sl.timestamp DESC LIMIT 1) AS turbidity,
    (SELECT sl.temperature FROM sensor_logs sl WHERE sl.fountain_id = f.id ORDER BY sl.timestamp DESC LIMIT 1) AS temperature,
    (SELECT sl.tds FROM sensor_logs sl WHERE sl.fountain_id = f.id ORDER BY sl.timestamp DESC LIMIT 1) AS tds,
    (SELECT sl.timestamp FROM sensor_logs sl WHERE sl.fountain_id = f.id ORDER BY sl.timestamp DESC LIMIT 1) AS last_reading
FROM fountains f
ORDER BY f.name;

CREATE VIEW vw_user_activity AS
SELECT 
    u.id,
    u.name,
    u.email,
    r.role_name,
    u.last_login,
    COUNT(al.id) AS total_actions,
    MAX(al.timestamp) AS last_activity
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN audit_logs al ON u.id = al.user_id
GROUP BY u.id
ORDER BY u.name;

CREATE VIEW vw_alert_stats_by_fountain AS
SELECT 
    f.name,
    COUNT(a.id) AS total_alerts,
    SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END) AS active_alerts,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS critical_count,
    MAX(a.timestamp) AS latest_alert_time
FROM fountains f
LEFT JOIN alerts a ON f.id = a.fountain_id
GROUP BY f.id
ORDER BY active_alerts DESC, f.name;

-- ================================================================
-- INSERT SAMPLE DATA
-- ================================================================

INSERT INTO roles (role_name, permissions, description) VALUES
('Admin', JSON_OBJECT('users', true, 'settings', true, 'alerts', true, 'reports', true, 'all', true), 'Full system access'),
('Operator', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', true, 'all', false), 'Can view data and manage alerts'),
('Technician', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', true, 'all', false), 'Can troubleshoot and calibrate sensors'),
('Viewer', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', false, 'all', false), 'Read-only access');

INSERT INTO alert_severity (severity_level, priority_score, description) VALUES
('Critical', 4, 'Water quality is unsafe - immediate action required'),
('High', 3, 'Water quality is concerning - action needed soon'),
('Medium', 2, 'Water quality is slightly out of range - monitor closely'),
('Low', 1, 'Minor deviation from ideal parameters - information only');

INSERT INTO sensor_types (type_name, unit, range_min, range_max, description) VALUES
('pH', 'pH', 0, 14, 'Measures acidity/alkalinity of water'),
('Turbidity', 'NTU', 0, 100, 'Measures water clarity/suspended particles'),
('Temperature', '°C', -5, 50, 'Measures water temperature'),
('TDS', 'ppm', 0, 2000, 'Measures total dissolved solids');

INSERT INTO departments (department_name, location_desc, contact_person, contact_email) VALUES
('Main Building', 'Central administrative building - 1st to 3rd floor', 'John Smith', 'john.smith@water.gov'),
('Facilities', 'Maintenance and operations center', 'Sarah Johnson', 'sarah.j@water.gov'),
('Lab', 'Water quality testing laboratory', 'Dr. Mike Chen', 'm.chen@water.gov');

-- Admin user with bcrypt hashed password 'admin123'
INSERT INTO users (email, name, password, role_id, phone, status) VALUES
('admin@olfu.edu.ph', 'Administrator', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5EeiGma1ZwK.e', 1, '+1-555-0001', 'Active');

INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('ph_min', '6.5', 'threshold', 'Minimum acceptable pH level'),
('ph_max', '8.5', 'threshold', 'Maximum acceptable pH level'),
('turbidity_min', '0', 'threshold', 'Minimum acceptable turbidity (NTU)'),
('turbidity_max', '5.0', 'threshold', 'Maximum acceptable turbidity (NTU)'),
('temperature_min', '15', 'threshold', 'Minimum acceptable temperature (°C)'),
('temperature_max', '30', 'threshold', 'Maximum acceptable temperature (°C)'),
('tds_min', '0', 'threshold', 'Minimum acceptable TDS (ppm)'),
('tds_max', '500', 'threshold', 'Maximum acceptable TDS (ppm)'),
('sensor_reading_interval', '300', 'config', 'Sensor reading interval in seconds'),
('alert_email_enabled', '1', 'notification', 'Enable email alerts'),
('alert_sms_enabled', '0', 'notification', 'Enable SMS alerts'),
('data_retention_days', '730', 'config', 'Keep sensor data for 2 years'),
('system_timezone', 'Asia/Manila', 'config', 'System timezone'),
('maintenance_mode', '0', 'config', 'System maintenance mode flag');

-- ================================================================
-- END OF SCHEMA
-- ================================================================
