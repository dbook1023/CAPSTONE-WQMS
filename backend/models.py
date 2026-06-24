"""
WQMS Database Models - SQLAlchemy ORM
Production-ready models for Water Quality Management System
"""

from datetime import datetime, timezone
import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime, 
    ForeignKey, JSON, Text, Date, DECIMAL, Boolean,
    Index, UniqueConstraint, TIMESTAMP,
    BIGINT, Numeric
)
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from werkzeug.security import generate_password_hash, check_password_hash

Base = declarative_base()

# ================================================================
# MODELS - Database Models
# ================================================================

class Role(Base):
    """Role-based access control"""
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    role_name = Column(String(50), unique=True, nullable=False, index=True)
    permissions = Column(JSON, nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    users = relationship('User', back_populates='role')
    
    def __repr__(self):
        return f"<Role {self.role_name}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'role_name': self.role_name,
            'permissions': self.permissions,
            'description': self.description
        }


class Department(Base):
    """Location/Department organization"""
    __tablename__ = 'departments'
    
    id = Column(Integer, primary_key=True)
    department_name = Column(String(100), unique=True, nullable=False, index=True)
    location_desc = Column(Text)
    contact_person = Column(String(100))
    contact_email = Column(String(100))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    fountains = relationship('Fountain', back_populates='department')
    
    def __repr__(self):
        return f"<Department {self.department_name}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'department_name': self.department_name,
            'location_desc': self.location_desc,
            'contact_person': self.contact_person,
            'contact_email': self.contact_email
        }


class User(Base):
    """User management & authentication"""
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False, index=True)
    phone = Column(String(20))
    status = Column(String(20), default='Active', index=True)
    last_login = Column(DateTime)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    role = relationship('Role', back_populates='users')
    alerts_acknowledged = relationship(
        'Alert', 
        foreign_keys='Alert.acknowledged_by',
        back_populates='acknowledged_by_user'
    )
    alerts_resolved = relationship(
        'Alert',
        foreign_keys='Alert.resolved_by',
        back_populates='resolved_by_user'
    )
    audit_logs = relationship('AuditLog', back_populates='user')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
    
    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password, password)
    
    def __repr__(self):
        return f"<User {self.email}>"
    
    def to_dict(self, include_password=False):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role_id': self.role_id,
            'role_name': self.role.role_name if self.role else None,
            'phone': self.phone,
            'status': self.status,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_password:
            data['password'] = self.password
        return data


class Admin(Base):
    """Admin management & authentication in a separate table"""
    __tablename__ = 'admins'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    phone = Column(String(20))
    status = Column(String(20), default='Active', index=True)
    last_login = Column(DateTime)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audit_logs = relationship('AuditLog', back_populates='admin')
    settings_modified = relationship('SystemSetting', back_populates='modified_by_admin')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=16)
    
    def check_password(self, password):
        """Verify password against hash"""
        return check_password_hash(self.password, password)
    
    def __repr__(self):
        return f"<Admin {self.email}>"
    
    def to_dict(self, include_password=False):
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role_name': 'Admin',  # Expose 'Admin' role name for simple frontend routing compatibility
            'phone': self.phone,
            'status': self.status,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_password:
            data['password'] = self.password
        return data


class SensorType(Base):
    """Reference data for sensor types"""
    __tablename__ = 'sensor_types'
    
    id = Column(Integer, primary_key=True)
    type_name = Column(String(50), unique=True, nullable=False, index=True)
    unit = Column(String(20), nullable=False)
    range_min = Column(Numeric(10, 2), nullable=False)
    range_max = Column(Numeric(10, 2), nullable=False)
    description = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    sensors = relationship('Sensor', back_populates='sensor_type')
    
    def __repr__(self):
        return f"<SensorType {self.type_name}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'type_name': self.type_name,
            'unit': self.unit,
            'range_min': float(self.range_min),
            'range_max': float(self.range_max),
            'description': self.description
        }


class Fountain(Base):
    """Water fountain assets"""
    __tablename__ = 'fountains'
    __table_args__ = (
        UniqueConstraint('name', name='uk_fountain_name'),
        Index('idx_f_status', 'status'),
        Index('idx_f_location', 'location'),
    )
    
    id = Column(Integer, primary_key=True)
    display_id = Column(String(20), unique=True, comment='User-facing ID like F001')
    name = Column(String(100), nullable=False)
    location = Column(String(150), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id'), nullable=False, index=True)
    model = Column(String(100))
    status = Column(String(20), default='Online', index=True)
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    installed_date = Column(Date)
    last_maintained = Column(Date)
    notes = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    department = relationship('Department', back_populates='fountains')
    sensors = relationship('Sensor', back_populates='fountain', cascade='all, delete-orphan')
    sensor_logs = relationship('SensorLog', back_populates='fountain', cascade='all, delete-orphan')
    alerts = relationship('Alert', back_populates='fountain', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Fountain {self.name}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'displayId': self.display_id or f'F{str(self.id).zfill(3)}',
            'name': self.name,
            'location': self.location,
            'department_id': self.department_id,
            'department_name': self.department.department_name if self.department else None,
            'model': self.model,
            'status': self.status,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'installed_date': self.installed_date.isoformat() if self.installed_date else None,
            'last_maintained': self.last_maintained.isoformat() if self.last_maintained else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Sensor(Base):
    """Physical sensor devices"""
    __tablename__ = 'sensors'
    
    id = Column(Integer, primary_key=True)
    fountain_id = Column(Integer, ForeignKey('fountains.id'), nullable=False, index=True)
    sensor_type_id = Column(Integer, ForeignKey('sensor_types.id'), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False)
    calibration_date = Column(Date)
    calibration_due = Column(Date, index=True)
    status = Column(String(20), default='Active', index=True)
    battery_level = Column(TINYINT)
    firmware_version = Column(String(20), comment='Last reported firmware version')
    calibration_params = Column(JSON, comment='Per-device calibration coefficients')
    notes = Column(Text)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    fountain = relationship('Fountain', back_populates='sensors')
    sensor_type = relationship('SensorType', back_populates='sensors')
    
    # Default calibration coefficients (used when calibration_params is NULL)
    DEFAULT_CALIBRATION = {
        'ph_slope': -5.70,
        'ph_offset': 21.34,
        'tds_k_value': 0.2,
        'turb_a': -1120.4,
        'turb_b': 5742.3,
        'turb_c': -4352.9
    }
    
    def get_calibration(self):
        """Return per-device calibration params, falling back to defaults"""
        defaults = dict(self.DEFAULT_CALIBRATION)
        if self.calibration_params:
            defaults.update(self.calibration_params)
        return defaults
    
    @validates('battery_level')
    def validate_battery_level(self, key, value):
        if value is not None and (value < 0 or value > 100):
            raise ValueError('Battery level must be between 0 and 100')
        return value
    
    def __repr__(self):
        return f"<Sensor {self.serial_number}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'fountain_id': self.fountain_id,
            'sensor_type_id': self.sensor_type_id,
            'serial_number': self.serial_number,
            'calibration_date': self.calibration_date.isoformat() if self.calibration_date else None,
            'calibration_due': self.calibration_due.isoformat() if self.calibration_due else None,
            'status': self.status,
            'battery_level': self.battery_level,
            'firmware_version': self.firmware_version,
            'calibration_params': self.calibration_params or self.DEFAULT_CALIBRATION
        }


class SensorLog(Base):
    """Real-time sensor data (time-series)"""
    __tablename__ = 'sensor_logs'
    __table_args__ = (
        Index('idx_sl_fountain_id', 'fountain_id'),
        Index('idx_sl_timestamp', 'timestamp'),
        Index('idx_sl_fountain_timestamp', 'fountain_id', 'timestamp'),
    )
    
    id = Column(BIGINT, primary_key=True)
    fountain_id = Column(Integer, ForeignKey('fountains.id'), nullable=False)
    ph = Column(Numeric(5, 2), nullable=False)
    turbidity = Column(Numeric(8, 2), nullable=False)
    temperature = Column(Numeric(5, 2), nullable=False)
    tds = Column(Numeric(8, 2), nullable=False)
    # Raw voltage preservation (for post-hoc recalibration)
    ph_voltage = Column(Numeric(6, 4), comment='Raw pH probe voltage from ESP32')
    tds_voltage = Column(Numeric(6, 4), comment='Raw TDS probe voltage from ESP32')
    turb_voltage = Column(Numeric(6, 4), comment='Raw turbidity sensor voltage from ESP32')
    timestamp = Column(TIMESTAMP, nullable=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    fountain = relationship('Fountain', back_populates='sensor_logs')
    
    def __repr__(self):
        return f"<SensorLog fountain_id={self.fountain_id} timestamp={self.timestamp}>"
    
    def to_dict(self):
        ph_val = float(self.ph)
        turb_val = float(self.turbidity)
        tds_val = float(self.tds)
        temp_val = float(self.temperature)

        # PNSDW AO 2017 Classifications
        ph_status = 'PASS' if 6.5 <= ph_val <= 8.5 else 'FAIL'
        turb_status = 'PASS' if turb_val <= 5.0 else 'FAIL'
        tds_status = 'PASS' if tds_val <= 500 else 'FAIL'
        temp_status = 'PASS' if 15.0 <= temp_val <= 32.0 else 'FAIL'

        overall_status = 'PASS' if all(s == 'PASS' for s in [ph_status, turb_status, tds_status, temp_status]) else 'FAIL'

        return {
            'id': self.id,
            'fountain_id': self.fountain_id,
            'ph': ph_val,
            'ph_status': ph_status,
            'turbidity': turb_val,
            'turbidity_status': turb_status,
            'temperature': temp_val,
            'temperature_status': temp_status,
            'tds': tds_val,
            'tds_status': tds_status,
            'overall_status': overall_status,
            'ph_voltage': float(self.ph_voltage) if self.ph_voltage else None,
            'tds_voltage': float(self.tds_voltage) if self.tds_voltage else None,
            'turb_voltage': float(self.turb_voltage) if self.turb_voltage else None,
            'timestamp': (self.timestamp.isoformat() + 'Z') if (self.timestamp and self.timestamp.tzinfo is None) else (self.timestamp.isoformat() if self.timestamp else None)
        }


class AlertSeverity(Base):
    """Alert severity levels"""
    __tablename__ = 'alert_severity'
    
    id = Column(Integer, primary_key=True)
    severity_level = Column(String(20), unique=True, nullable=False)
    priority_score = Column(Integer, nullable=False, index=True)
    description = Column(Text)
    
    # Relationships
    alerts = relationship('Alert', back_populates='severity')
    
    def __repr__(self):
        return f"<AlertSeverity {self.severity_level}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'severity_level': self.severity_level,
            'priority_score': self.priority_score,
            'description': self.description
        }


class Alert(Base):
    """System alerts & notifications"""
    __tablename__ = 'alerts'
    __table_args__ = (
        Index('idx_a_status', 'status'),
        Index('idx_a_timestamp', 'timestamp'),
        Index('idx_a_status_timestamp', 'status', 'timestamp'),
    )
    
    id = Column(Integer, primary_key=True)
    fountain_id = Column(Integer, ForeignKey('fountains.id'), nullable=False, index=True)
    parameter = Column(String(50), nullable=False)
    value = Column(Numeric(10, 2), nullable=False)
    threshold_min = Column(Numeric(10, 2))
    threshold_max = Column(Numeric(10, 2))
    severity_id = Column(Integer, ForeignKey('alert_severity.id'), nullable=False)
    status = Column(String(20), default='Active', index=True)
    message = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False)
    acknowledged_at = Column(DateTime)
    acknowledged_by = Column(Integer, ForeignKey('users.id'))
    resolved_at = Column(DateTime)
    resolution_note = Column(Text)
    resolved_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    fountain = relationship('Fountain', back_populates='alerts')
    severity = relationship('AlertSeverity', back_populates='alerts')
    acknowledged_by_user = relationship(
        'User',
        foreign_keys=[acknowledged_by],
        back_populates='alerts_acknowledged'
    )
    resolved_by_user = relationship(
        'User',
        foreign_keys=[resolved_by],
        back_populates='alerts_resolved'
    )
    
    def __repr__(self):
        return f"<Alert fountain_id={self.fountain_id} status={self.status}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'fountain_id': self.fountain_id,
            'fountain_name': self.fountain.name if self.fountain else None,
            'parameter': self.parameter,
            'value': float(self.value),
            'severity': self.severity.severity_level if self.severity else None,
            'status': self.status,
            'message': self.message,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }


class SystemSetting(Base):
    """System-wide configuration"""
    __tablename__ = 'system_settings'
    
    id = Column(Integer, primary_key=True)
    setting_key = Column(String(100), unique=True, nullable=False, index=True)
    setting_value = Column(Text, nullable=False)
    setting_type = Column(String(20), default='config', index=True)
    description = Column(Text)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey('admins.id'))
    
    # Relationships
    modified_by_admin = relationship('Admin', back_populates='settings_modified')
    
    def __repr__(self):
        return f"<SystemSetting {self.setting_key}={self.setting_value}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'setting_key': self.setting_key,
            'setting_value': self.setting_value,
            'setting_type': self.setting_type,
            'description': self.description
        }


class Report(Base):
    """Compliance reports generated by users"""
    __tablename__ = 'reports'
    
    id = Column(Integer, primary_key=True)
    fountain_id = Column(Integer, ForeignKey('fountains.id'), nullable=False, index=True)
    generated_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    ph_avg = Column(Numeric(5, 2))
    turbidity_avg = Column(Numeric(8, 2))
    temperature_avg = Column(Numeric(5, 2))
    tds_avg = Column(Numeric(8, 2))
    overall_status = Column(String(50))
    readings_count = Column(Integer)
    is_archived = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    # Relationships
    fountain = relationship('Fountain')
    user = relationship('User')

    def __repr__(self):
        return f"<Report {self.id} - Fountain {self.fountain_id}>"

    def to_dict(self):
        created_at = None
        if self.created_at:
            created_at = self.created_at.replace(tzinfo=timezone.utc).isoformat().replace('+00:00', 'Z')

        return {
            'id': self.id,
            'fountain_id': self.fountain_id,
            'fountain_name': self.fountain.name if self.fountain else None,
            'location': self.fountain.location if self.fountain else None,
            'generated_by_id': self.generated_by,
            'generated_by_name': self.user.name if self.user else None,
            'ph_avg': float(self.ph_avg) if self.ph_avg is not None else None,
            'turbidity_avg': float(self.turbidity_avg) if self.turbidity_avg is not None else None,
            'temperature_avg': float(self.temperature_avg) if self.temperature_avg is not None else None,
            'tds_avg': float(self.tds_avg) if self.tds_avg is not None else None,
            'overall_status': self.overall_status,
            'readings_count': self.readings_count,
            'is_archived': self.is_archived,
            'created_at': created_at
        }


class AuditLog(Base):
    """Activity auditing & compliance"""
    __tablename__ = 'audit_logs'
    __table_args__ = (
        Index('idx_al_user_id', 'user_id'),
        Index('idx_al_admin_id', 'admin_id'),
        Index('idx_al_timestamp', 'timestamp'),
        Index('idx_al_entity', 'entity_type', 'entity_id'),
        Index('idx_al_action', 'action'),
    )
    
    id = Column(BIGINT, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    admin_id = Column(Integer, ForeignKey('admins.id'), nullable=True)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer)
    old_values = Column(JSON)
    new_values = Column(JSON)
    timestamp = Column(TIMESTAMP, default=datetime.utcnow)
    ip_address = Column(String(45))
    status = Column(String(20), default='Success')
    error_message = Column(Text)
    
    # Relationships
    user = relationship('User', back_populates='audit_logs')
    admin = relationship('Admin', back_populates='audit_logs')
    
    def __repr__(self):
        return f"<AuditLog user_id={self.user_id} admin_id={self.admin_id} action={self.action}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'ip_address': self.ip_address,
            'status': self.status
        }


# ================================================================
# DATABASE SESSION FACTORY
# ================================================================

from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'mysql+pymysql://root@localhost:3306/wqms_db')

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=False
)

from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency for Flask to inject database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
