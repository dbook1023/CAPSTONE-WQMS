-- ================================================================
-- WQMS (Water Quality Management System) Database Schema
-- Production-Ready | Normalized to 3NF
-- Version: 1.0
-- Last Updated: 2026-05-14
-- ================================================================

-- Drop existing database (use with caution!)
-- DROP DATABASE IF EXISTS wqms_db;

-- Create database with UTF-8 encoding for international support
CREATE DATABASE IF NOT EXISTS wqms_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE wqms_db;

-- ================================================================
-- 1. ROLES TABLE - Role-based Access Control
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
-- 2. DEPARTMENTS TABLE - Location/Department Organization
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
-- 3. USERS TABLE - User Management & Authentication
-- ================================================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    role_id INT NOT NULL,
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_email (email),
    FOREIGN KEY fk_user_role (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    
    INDEX idx_email (email),
    INDEX idx_role_id (role_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 4. SENSOR TYPES TABLE - Reference Data for Sensor Types
-- ================================================================
CREATE TABLE sensor_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) UNIQUE NOT NULL COMMENT 'pH, Turbidity, Temperature, TDS',
    unit VARCHAR(20) NOT NULL COMMENT 'pH, NTU, °C, ppm',
    range_min DECIMAL(10,2) NOT NULL,
    range_max DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 5. FOUNTAINS TABLE - Water Fountain Assets
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
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_name (name),
    FOREIGN KEY fk_fountain_dept (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    
    INDEX idx_dept_id (department_id),
    INDEX idx_status (status),
    INDEX idx_location (location),
    SPATIAL INDEX idx_coords (POINT(latitude, longitude))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 6. SENSORS TABLE - Physical Sensor Devices
-- ================================================================
CREATE TABLE sensors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fountain_id INT NOT NULL,
    sensor_type_id INT NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    calibration_date DATE,
    calibration_due DATE,
    status ENUM('Active', 'Inactive', 'Faulty', 'Calibrating') DEFAULT 'Active',
    battery_level TINYINT UNSIGNED COMMENT 'Battery percentage 0-100',
    firmware_version VARCHAR(20) NULL,
    calibration_params JSON NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_serial_number (serial_number),
    FOREIGN KEY fk_sensor_fountain (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    FOREIGN KEY fk_sensor_type (sensor_type_id) REFERENCES sensor_types(id) ON DELETE RESTRICT,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_status (status),
    INDEX idx_calibration_due (calibration_due)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 7. SENSOR LOGS TABLE - Real-time Sensor Data (Time-series)
-- ================================================================
CREATE TABLE sensor_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'Use BIGINT for millions of records',
    fountain_id INT NOT NULL,
    ph DECIMAL(5,2) NOT NULL COMMENT 'pH value: 0-14',
    turbidity DECIMAL(8,2) NOT NULL COMMENT 'Turbidity in NTU (Nephelometric Turbidity Units)',
    temperature DECIMAL(5,2) NOT NULL COMMENT 'Temperature in Celsius',
    tds DECIMAL(8,2) NOT NULL COMMENT 'Total Dissolved Solids in ppm (parts per million)',
    ph_voltage DECIMAL(6,4) NULL COMMENT 'Raw pH probe voltage from ESP32',
    tds_voltage DECIMAL(6,4) NULL COMMENT 'Raw TDS probe voltage from ESP32',
    turb_voltage DECIMAL(6,4) NULL COMMENT 'Raw turbidity sensor voltage from ESP32',
    timestamp TIMESTAMP NOT NULL COMMENT 'Reading timestamp from sensor',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY fk_log_fountain (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_fountain_timestamp (fountain_id, timestamp) COMMENT 'Composite for range queries',
    FULLTEXT INDEX idx_ft_values (fountain_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Partition strategy: Monthly by timestamp after year 1';

-- ================================================================
-- 8. ALERT SEVERITY TABLE - Reference Data for Alert Levels
-- ================================================================
CREATE TABLE alert_severity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    severity_level VARCHAR(20) UNIQUE NOT NULL COMMENT 'Critical, High, Medium, Low',
    priority_score INT NOT NULL COMMENT 'Numeric priority for sorting',
    description TEXT,
    
    INDEX idx_priority (priority_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 9. ALERTS TABLE - Alert Events & Notifications
-- ================================================================
CREATE TABLE alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fountain_id INT NOT NULL,
    parameter VARCHAR(50) NOT NULL COMMENT 'pH, Turbidity, Temperature, TDS',
    value DECIMAL(10,2) NOT NULL COMMENT 'Actual measured value',
    threshold_min DECIMAL(10,2),
    threshold_max DECIMAL(10,2),
    severity_id INT NOT NULL,
    status ENUM('Active', 'Acknowledged', 'Resolved') DEFAULT 'Active',
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL COMMENT 'When alert was triggered',
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by INT NULL,
    resolved_at TIMESTAMP NULL,
    resolution_note TEXT,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    FOREIGN KEY fk_alert_fountain (fountain_id) REFERENCES fountains(id) ON DELETE CASCADE,
    FOREIGN KEY fk_alert_severity (severity_id) REFERENCES alert_severity(id) ON DELETE RESTRICT,
    FOREIGN KEY fk_alert_ack_user (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY fk_alert_resolved_user (resolved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_fountain_id (fountain_id),
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp),
    INDEX idx_severity (severity_id),
    COMPOSITE INDEX idx_status_timestamp (status, timestamp) COMMENT 'For finding active alerts'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 10. SYSTEM SETTINGS TABLE - Configuration Management
-- ================================================================
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL COMMENT 'ph_min, ph_max, turbidity_max, etc',
    setting_value TEXT NOT NULL,
    setting_type ENUM('threshold', 'config', 'feature', 'notification') DEFAULT 'config',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    FOREIGN KEY fk_settings_user (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_setting_key (setting_key),
    INDEX idx_setting_type (setting_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- 11. AUDIT LOGS TABLE - Activity Auditing & Compliance
-- ================================================================
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(50) NOT NULL COMMENT 'INSERT, UPDATE, DELETE, LOGIN, LOGOUT',
    entity_type VARCHAR(50) NOT NULL COMMENT 'users, fountains, alerts, sensors, settings',
    entity_id INT,
    old_values JSON COMMENT 'Previous values for UPDATE operations',
    new_values JSON COMMENT 'New values after operation',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6 address',
    status ENUM('Success', 'Failure') DEFAULT 'Success',
    error_message TEXT,
    
    FOREIGN KEY fk_audit_user (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Partition strategy: Monthly by timestamp for archival';

-- ================================================================
-- VIEWS FOR COMMON QUERIES
-- ================================================================

-- View: Current Status of All Fountains
CREATE OR REPLACE VIEW vw_fountain_status AS
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

-- View: Latest Sensor Readings for All Fountains
CREATE OR REPLACE VIEW vw_latest_readings AS
SELECT 
    f.id,
    f.name,
    f.location,
    sl.ph,
    sl.turbidity,
    sl.temperature,
    sl.tds,
    sl.timestamp
FROM fountains f
LEFT JOIN LATERAL (
    SELECT * FROM sensor_logs 
    WHERE sensor_logs.fountain_id = f.id 
    ORDER BY timestamp DESC 
    LIMIT 1
) sl ON TRUE
ORDER BY f.name;

-- View: User Activity Summary
CREATE OR REPLACE VIEW vw_user_activity AS
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

-- View: Alert Statistics by Fountain
CREATE OR REPLACE VIEW vw_alert_stats_by_fountain AS
SELECT 
    f.name,
    COUNT(*) AS total_alerts,
    SUM(CASE WHEN a.status = 'Active' THEN 1 ELSE 0 END) AS active_alerts,
    SUM(CASE WHEN a.severity_id = 1 THEN 1 ELSE 0 END) AS critical_count,
    MAX(a.timestamp) AS latest_alert_time
FROM fountains f
LEFT JOIN alerts a ON f.id = a.fountain_id
GROUP BY f.id
ORDER BY active_alerts DESC, f.name;

-- ================================================================
-- STORED PROCEDURES
-- ================================================================

-- Procedure: Get Latest Sensor Data for a Fountain
DELIMITER //
CREATE PROCEDURE sp_get_latest_readings(IN p_fountain_id INT)
BEGIN
    SELECT 
        f.name,
        f.location,
        sl.ph,
        sl.turbidity,
        sl.temperature,
        sl.tds,
        sl.timestamp
    FROM sensor_logs sl
    JOIN fountains f ON sl.fountain_id = f.id
    WHERE sl.fountain_id = p_fountain_id
    ORDER BY sl.timestamp DESC
    LIMIT 1;
END //
DELIMITER ;

-- Procedure: Get Sensor History for Charts
DELIMITER //
CREATE PROCEDURE sp_get_sensor_history(
    IN p_fountain_id INT,
    IN p_days INT,
    IN p_limit INT
)
BEGIN
    SELECT 
        ph,
        turbidity,
        temperature,
        tds,
        timestamp
    FROM sensor_logs
    WHERE fountain_id = p_fountain_id
        AND timestamp >= DATE_SUB(NOW(), INTERVAL p_days DAY)
    ORDER BY timestamp DESC
    LIMIT p_limit;
END //
DELIMITER ;

-- Procedure: Create System Alert
DELIMITER //
CREATE PROCEDURE sp_create_alert(
    IN p_fountain_id INT,
    IN p_parameter VARCHAR(50),
    IN p_value DECIMAL(10,2),
    IN p_threshold_min DECIMAL(10,2),
    IN p_threshold_max DECIMAL(10,2),
    IN p_severity_id INT,
    IN p_message TEXT
)
BEGIN
    INSERT INTO alerts (
        fountain_id,
        parameter,
        value,
        threshold_min,
        threshold_max,
        severity_id,
        status,
        message,
        timestamp
    ) VALUES (
        p_fountain_id,
        p_parameter,
        p_value,
        p_threshold_min,
        p_threshold_max,
        p_severity_id,
        'Active',
        p_message,
        NOW()
    );
END //
DELIMITER ;

-- Procedure: Log User Action (for audit trail)
DELIMITER //
CREATE PROCEDURE sp_audit_log(
    IN p_user_id INT,
    IN p_action VARCHAR(50),
    IN p_entity_type VARCHAR(50),
    IN p_entity_id INT,
    IN p_old_values JSON,
    IN p_new_values JSON,
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        ip_address,
        status
    ) VALUES (
        p_user_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_ip_address,
        'Success'
    );
END //
DELIMITER ;

-- ================================================================
-- SAMPLE DATA / SEED DATA
-- ================================================================

-- Insert Roles
INSERT INTO roles (role_name, permissions, description) VALUES
('Admin', JSON_OBJECT('users', true, 'settings', true, 'alerts', true, 'reports', true, 'all', true), 'Full system access'),
('Operator', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', true, 'all', false), 'Can view data and manage alerts'),
('Technician', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', true, 'all', false), 'Can troubleshoot and calibrate sensors'),
('Viewer', JSON_OBJECT('users', false, 'settings', false, 'alerts', true, 'reports', false, 'all', false), 'Read-only access');

-- Insert Alert Severity Levels
INSERT INTO alert_severity (severity_level, priority_score, description) VALUES
('Critical', 4, 'Water quality is unsafe - immediate action required'),
('High', 3, 'Water quality is concerning - action needed soon'),
('Medium', 2, 'Water quality is slightly out of range - monitor closely'),
('Low', 1, 'Minor deviation from ideal parameters - information only');

-- Insert Sensor Types
INSERT INTO sensor_types (type_name, unit, range_min, range_max, description) VALUES
('pH', 'pH', 0, 14, 'Measures acidity/alkalinity of water'),
('Turbidity', 'NTU', 0, 100, 'Measures water clarity/suspended particles'),
('Temperature', '°C', -5, 50, 'Measures water temperature'),
('TDS', 'ppm', 0, 2000, 'Measures total dissolved solids');

-- Insert Departments
INSERT INTO departments (department_name, location_desc, contact_person, contact_email) VALUES
('Main Building', 'Central administrative building - 1st to 3rd floor', 'John Smith', 'john.smith@water.gov'),
('Facilities', 'Maintenance and operations center', 'Sarah Johnson', 'sarah.j@water.gov'),
('Lab', 'Water quality testing laboratory', 'Dr. Mike Chen', 'm.chen@water.gov');

-- Insert Default Admin User
-- Password: admin123 (hashed with bcrypt)
-- TO GENERATE: Use bcrypt to hash your password with cost 10-12
INSERT INTO users (email, name, password, role_id, phone, status) VALUES
('admin@wqms.local', 'Administrator', '$2y$10$example_hash_here_please_regenerate', 1, '+1-555-0001', 'Active');

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
-- pH Thresholds (Philippine NSDWQ compliant)
('ph_min', '6.5', 'threshold', 'Minimum acceptable pH level'),
('ph_max', '8.5', 'threshold', 'Maximum acceptable pH level'),
-- Turbidity Thresholds
('turbidity_min', '0', 'threshold', 'Minimum acceptable turbidity (NTU)'),
('turbidity_max', '5.0', 'threshold', 'Maximum acceptable turbidity (NTU)'),
-- Temperature Thresholds
('temperature_min', '15', 'threshold', 'Minimum acceptable temperature (°C)'),
('temperature_max', '30', 'threshold', 'Maximum acceptable temperature (°C)'),
-- TDS Thresholds
('tds_min', '0', 'threshold', 'Minimum acceptable TDS (ppm)'),
('tds_max', '500', 'threshold', 'Maximum acceptable TDS (ppm)'),
-- System Configuration
('sensor_reading_interval', '300', 'config', 'Sensor reading interval in seconds'),
('alert_email_enabled', '1', 'notification', 'Enable email alerts'),
('alert_sms_enabled', '0', 'notification', 'Enable SMS alerts'),
('data_retention_days', '730', 'config', 'Keep sensor data for 2 years'),
('system_timezone', 'Asia/Manila', 'config', 'System timezone'),
('maintenance_mode', '0', 'config', 'System maintenance mode flag');

-- ================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ================================================================
-- Already defined in table creation, but here are additional recommendations:

-- For very large deployments, consider:
-- ALTER TABLE sensor_logs ADD INDEX idx_ph (ph);
-- ALTER TABLE sensor_logs ADD INDEX idx_turbidity (turbidity);
-- ALTER TABLE sensor_logs ADD INDEX idx_temperature (temperature);
-- ALTER TABLE sensor_logs ADD INDEX idx_tds (tds);
-- ALTER TABLE alerts ADD INDEX idx_parameter (parameter);

-- ================================================================
-- END OF SCHEMA
-- ================================================================
-- 
-- NEXT STEPS:
-- 1. Execute this entire script to create the database
-- 2. Update DEFAULT USER PASSWORD in users table
-- 3. Configure db_config.py with connection parameters
-- 4. Run application tests
-- 5. Set up automated backups
-- 6. Implement trigger functions for audit logging
-- 7. Create monitoring alerts for database size/performance
--
-- ================================================================
