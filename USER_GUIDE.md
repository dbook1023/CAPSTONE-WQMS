# Water Quality Monitoring System (WQMS) - Complete User's Guide & Project Documentation

Welcome to the official, end-to-end **User's Guide & Technical Reference** for the **Water Quality Monitoring System (WQMS)**. This comprehensive manual details the complete system architecture, hardware firmware integration, backend API, configuration files, and step-by-step user operational guides for both **System Administrators** and **Operators (Standard Users)**.

---

## 📋 Table of Contents
1. [System Overview & Architecture](#1-system-overview--architecture)
2. [User Roles & Access Control Model](#2-user-roles--access-control-model)
3. [Configuration Files & System Setup](#3-configuration-files--system-setup)
   - [Environment Configuration (`.env`)](#environment-configuration-env)
   - [Database Connection Config (`db_config.py`)](#database-connection-config-db_configpy)
   - [Batch Launchers (`start_wqms.bat` & `stop_wqms.bat`)](#batch-launchers-start_wqmsbat--stop_wqmsbat)
   - [Cloud & Build Manifests (`build.sh`, `render.yaml`, `Procfile`)](#cloud--build-manifests-buildsh-renderyaml-procfile)
   - [Dependencies (`requirements.txt`)](#dependencies-requirementstxt)
4. [Hardware & ESP32 Firmware Integration](#4-hardware--esp32-firmware-integration)
   - [Microcontroller & Pin Allocation](#microcontroller--pin-allocation)
   - [Sensor Specifications & Calibration](#sensor-specifications--calibration)
   - [Telemetry Payload Structure & Endpoints](#telemetry-payload-structure--endpoints)
5. [Public Information Pages Manual](#5-public-information-pages-manual)
6. [Operator Portal User Manual (`user@olfu.edu.ph`)](#6-operator-portal-user-manual-userolfueduph)
   - [Operator Dashboard](#operator-dashboard)
   - [Real-time Water Monitoring](#real-time-water-monitoring)
   - [Fountain Status & Filter Health](#fountain-status--filter-health)
   - [Water Quality Reports](#water-quality-reports)
   - [Operator Account Settings](#operator-account-settings)
   - [Operator Help & Support](#operator-help--support)
7. [Admin Portal User Manual (`admin@olfu.edu.ph`)](#7-admin-portal-user-manual-adminolfueduph)
   - [Executive Admin Dashboard](#executive-admin-dashboard)
   - [Fountain Management](#fountain-management)
   - [Sensor Management & Threshold Configuration](#sensor-management--threshold-configuration)
   - [Alert & Notification Management](#alert--notification-management)
   - [Reports & Compliance Analytics](#reports--compliance-analytics)
   - [User & Role Management](#user--role-management)
   - [System Settings & SMS Gateway Config](#system-settings--sms-gateway-config)
   - [Admin Help Manual](#admin-help-manual)
8. [Backend REST API v1 Reference](#8-backend-rest-api-v1-reference)
9. [Water Quality Parameter Standards Reference](#9-water-quality-parameter-standards-reference)
10. [Troubleshooting & Frequently Asked Questions (FAQ)](#10-troubleshooting--frequently-asked-questions-faq)

---

## 1. 🚀 System Overview & Architecture

The **Water Quality Monitoring System (WQMS)** is an IoT-enabled enterprise platform designed to perform real-time automated sampling, parameter analysis, threshold checking, alert dispatch, and compliance reporting for drinking water fountains across campus facilities.

```
       +--------------------------------------------------------+
       |             ESP32 Microcontroller Nodes                |
       |  (pH Probe, TDS Sensor, Turbidity Sensor, Temp Sensor) |
       +---------------------------+----------------------------+
                                   |
                                   | HTTP POST (JSON Telemetry)
                                   v
       +--------------------------------------------------------+
       |             Flask Python RESTful API (v1)               |
       |   (Authentication, Telemetry Processing, Alerts Engine) |
       +-------------+----------------------------+-------------+
                     |                            |
                     | SQLAlchemy                 | SMS API (Resend /
                     v                            | Twilio / Semaphore)
       +---------------------------+  +-----------v-------------+
       |  MySQL / MariaDB Database |  | SMS & Email Alerts Hub  |
       |  (Fountains, Sensors,     |  +-------------------------+
       |   Alerts, Users, Audit)   |
       +---------------------------+
                     ^
                     | RESTful Data Fetching (Fetch API / JSON)
                     |
       +-------------+------------------------------------------+
       |                 HTML5 / CSS3 / Vanilla JS              |
       |        Dual Portals: Admin Portal & Operator Portal    |
       +--------------------------------------------------------+
```

### Key System Components
- **Firmware Layer**: Built for ESP32 microcontrollers. Reads analog sensor signals (pH, TDS, Turbidity) and digital sensors (DS18B20 Temp), converts them to physical units, displays local data on a $16\times 2$ I2C LCD screen, and streams JSON data to the backend API every second.
- **Backend API Layer**: Developed in Python using Flask, SQLAlchemy ORM, and Werkzeug Security. Manages authentication, data validation, alert threshold checking, background SMS alerts, and analytical reporting.
- **Database Layer**: MariaDB / MySQL relational schema containing optimized indices and normalized tables for users, roles, fountains, sensors, telemetry logs, threshold alerts, and audit records.
- **Frontend Portals**: Modern responsive web application split into an **Operator Portal** (for daily operational monitoring) and an **Admin Portal** (for hardware provisioning, user control, threshold settings, and system diagnostics).

---

## 2. 👥 User Roles & Access Control Model

The WQMS platform enforces strict Role-Based Access Control (RBAC). Web interface accounts are categorized into two primary user roles:

| Feature / Capability | Operator Role (`User`) | Admin Role (`Admin`) |
| :--- | :---: | :---: |
| **Default Login** | `user@olfu.edu.ph` / `user123` | `admin@olfu.edu.ph` / `admin123` |
| **View Real-time Parameter Charts** | ✅ Yes | ✅ Yes |
| **View Fountain Locations & Status** | ✅ Yes | ✅ Yes |
| **Generate & Export Reports (CSV/PDF)** | ✅ Yes | ✅ Yes |
| **Update Personal Profile & Password** | ✅ Yes | ✅ Yes |
| **Log Maintenance Issues** | ✅ Yes | ✅ Yes |
| **Add / Edit / Remove Fountains** | ❌ No | ✅ Yes |
| **Provision & Calibrate Sensor Hardware** | ❌ No | ✅ Yes |
| **Modify Parameter Threshold Limits** | ❌ No | ✅ Yes |
| **Manage & Acknowledge System Alerts** | ❌ View Only | ✅ Full Resolution |
| **Manage User Accounts & Assign Roles** | ❌ No | ✅ Yes |
| **Configure SMS Gateway & Database Settings** | ❌ No | ✅ Yes |

---

## 3. 🛠️ Configuration Files & System Setup

### Environment Configuration (`.env`)
The environment configuration file stores database credentials, Flask operating mode, security keys, and SMS service configurations.

Located at: `backend/.env` (Template provided at `backend/.env.example`)

```ini
# Database Connection Parameters
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=wqms_db
DB_PORT=3306

# Flask Framework Options
FLASK_ENV=development
SECRET_KEY=your_super_secret_key_here

# SMS & Email Alert Services
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=Aqua Monitor <onboarding@resend.dev>
```

#### Production Configuration (`backend/.env.production`)
For cloud or production deployment (e.g., Render, Railway, AWS):
```ini
DB_HOST=your_cloud_db_host
DB_USER=your_cloud_db_user
DB_PASSWORD=your_cloud_db_password
DB_NAME=wqms_db
DB_PORT=3306
FLASK_ENV=production
SECRET_KEY=e83a9f...production_secret_key...
```

---

### Database Connection Config (`db_config.py`)
Located at: `backend/db_config.py`

This module provides direct raw MySQL/MariaDB connections using `mysql.connector`, parsing parameters securely from environment variables.

```python
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
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
```

---

### Batch Launchers (`start_wqms.bat` & `stop_wqms.bat`)

#### 1. Startup Script (`start_wqms.bat`)
Located in root directory: `start_wqms.bat`
- Checks if MySQL/MariaDB service is running (or starts XAMPP MySQL automatically).
- Activates virtual environment (`.venv\Scripts\python.exe`).
- Opens default browser to `http://127.0.0.1:5000`.
- Starts backend server `python app.py`.

```bat
@echo off
TITLE WQMS - Water Quality Monitoring System Launcher
COLOR 0A
CLS

echo [1/3] Checking Database Service (MySQL / MariaDB)...
net start MySQL >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    net start MariaDB >nul 2>&1
)

echo [2/3] Starting WQMS Flask Backend Server...
cd /d "%~dp0backend"
set "PYTHON_EXEC=..\.venv\Scripts\python.exe"

echo [3/3] Launching WQMS Portal in Web Browser...
timeout /t 2 >nul
start "" "http://127.0.0.1:5000"

%PYTHON_EXEC% app.py
pause
```

#### 2. Shutdown Script (`stop_wqms.bat`)
Located in root directory: `stop_wqms.bat`
- Gracefully terminates Python backend server processes running `app.py`.

```bat
@echo off
TITLE WQMS - Stopping System
echo Stopping WQMS Backend Server...
taskkill /FI "WINDOWTITLE eq WQMS - Water Quality Monitoring System Launcher*" /F
taskkill /IM python.exe /F
echo WQMS Services Stopped.
```

---

### Cloud & Build Manifests (`build.sh`, `render.yaml`, `Procfile`)

#### 1. Build Shell Script (`build.sh`)
Executes automated package installation and database seeding on Linux deployment:
```bash
#!/usr/bin/env bash
set -o errexit

python -m pip install --upgrade pip
pip install -r backend/requirements.txt

if [ -f "backend/setup_database.py" ]; then
    echo "Running database setup..."
    python backend/setup_database.py || echo "Database setup skipped or failed."
fi
```

#### 2. Render Blueprint (`render.yaml`)
Specifies Python runtime, build command, worker class, and binding environment:
```yaml
services:
  - type: web
    name: wqms-app
    env: python
    buildCommand: "./build.sh"
    startCommand: "gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT --chdir backend wsgi:app"
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.8
      - key: SECRET_KEY
        generateValue: true
      - key: API_HOST
        value: "0.0.0.0"
```

#### 3. Procfile (`Procfile`)
```
web: gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT --chdir backend wsgi:app
```

---

### Dependencies (`requirements.txt`)
Located at: `backend/requirements.txt`
```
Flask==3.0.2
Flask-Cors==4.0.0
Flask-SocketIO==5.3.6
Flask-SQLAlchemy==3.1.1
SQLAlchemy==2.0.27
PyMySQL==1.1.0
mysql-connector-python==8.3.0
python-dotenv==1.0.1
Werkzeug==3.0.1
requests==2.31.0
eventlet==0.35.1
gunicorn==21.2.0
```

---

## 4. 🔌 Hardware & ESP32 Firmware Integration

The system includes firmware located at `firmware/wqms_esp32/wqms_esp32.ino`.

### Microcontroller & Pin Allocation
The hardware node uses an **ESP32 DevKit V1** microcontroller configured with 12-bit ADC resolution and 11dB attenuation.

| Sensor Module | Physical Parameter | ESP32 Pin | Signal Type | Operating Voltage |
| :--- | :--- | :--- | :--- | :--- |
| **Analog pH Sensor Probe** | Water acidity / alkalinity | `GPIO 34` (ADC1_CH6) | Analog (0-3.3V) | 5.0V DC |
| **TDS Meter Module** | Total Dissolved Solids | `GPIO 33` (ADC1_CH5) | Analog (0-2.3V) | 3.3V / 5.0V DC |
| **Analog Turbidity Sensor** | Water clarity (NTU) | `GPIO 32` (ADC1_CH4) | Analog (0-4.5V) | 5.0V DC |
| **DS18B20 Temp Probe** | Water Temperature (°C) | `GPIO 4` (OneWire) | Digital (OneWire) | 3.3V DC |
| **LCD 1602 Display** | Local visual display | `SDA: 21, SCL: 22` | I2C (Address `0x27`) | 5.0V DC |

---

### Firmware Code Highlights (`wqms_esp32.ino`)

```cpp
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
#define WIFI_SSID "Your_Campus_WiFi"
#define WIFI_PASSWORD "Your_WiFi_Password"
#define FLASK_SERVER_URL "http://10.151.31.14:5000/api/v1/sensors/update"

// Hardware Pin Definitions
constexpr uint8_t TURBIDITY_PIN = 32;
constexpr uint8_t TDS_PIN = 33;
constexpr uint8_t TEMP_PIN = 4;
constexpr uint8_t PH_PIN = 34;

// Calibration Standards
constexpr int CLEAN_WATER = 3537;
constexpr int DIRTY_WATER = 2500;
constexpr float PH_CALIBRATION = 21.34f;
```

---

### Telemetry Payload Structure & Endpoints
The ESP32 firmware reads all connected sensors every second, formats the values into a JSON object, and sends an HTTP `POST` request to `/api/v1/sensors/update` (or `/api/v1/sensors/telemetry`).

#### JSON Payload Format:
```json
{
  "device_id": "3A7B992F01C4",
  "temperature": 23.5,
  "ntu": 0.85,
  "turbidity": 0.85,
  "tds": 142.0,
  "ph": 7.24,
  "timestamp": 1285040
}
```

#### Server Response (HTTP 200 OK):
```json
{
  "status": "success",
  "message": "Telemetry reading recorded successfully",
  "data": {
    "fountain_id": 1,
    "status": "Safe"
  }
}
```

---

## 5. 🌐 Public Information Pages Manual

The WQMS web portal features public landing pages accessible without authentication:

1. **Home Page (`index.html`)**: Overview of campus drinking water safety initiatives, real-time safety status summary banner, and direct navigation links.
2. **About WQMS (`about.html`)**: Detailed background on the smart campus water monitoring program, sensor technology explanation, and environmental compliance standards.
3. **Campus Fountain Locator (`fountains.html`)**: Interactive list and location directory of drinking fountains across buildings and departments, showing real-time operational status (Online, Offline, Under Maintenance).
4. **Water Safety & Research (`research.html`)**: Educational reference explaining pH, TDS, Turbidity, and Temperature metrics according to WHO and PNSDW guidelines.
5. **Contact & Support (`contact.html`)**: Public contact form allowing campus visitors, faculty, and students to send feedback or report physical fountain issues to facility staff.

---

## 6. 👤 Operator Portal User Manual (`user@olfu.edu.ph`)

The **Operator Portal** is engineered for facility operators, maintenance staff, and lab technicians.

### Account Credentials
- **URL**: `http://127.0.0.1:5000/login.html` (or `frontend/user/user-dashboard.html`)
- **Email**: `user@olfu.edu.ph`
- **Password**: `user123`

---

### Operator Pages & Features

#### 1. Operator Dashboard (`user-dashboard.html`)
- **Metric Cards**: Quick view of campus average pH, average TDS (ppm), average Turbidity (NTU), and water temperature (°C).
- **Status Indicators**: Safe (Green), Warning (Yellow), and Danger (Red) banners for instantaneous status assessment.
- **Quick Links**: Direct shortcuts to detailed parameter telemetry and maintenance logs.

#### 2. Real-time Water Monitoring (`user-monitoring.html`)
- **Live Interactive Charts**: Powered by Chart.js for real-time telemetry rendering.
- **Parameter Selector**: Toggle views between:
  - **pH Level**: Safe range $6.5 - 8.5$.
  - **TDS Level**: Safe $< 300\text{ ppm}$, Warning $300 - 500\text{ ppm}$, Critical $> 500\text{ ppm}$.
  - **Turbidity**: Safe $< 1.0\text{ NTU}$, Warning $1.0 - 5.0\text{ NTU}$.
  - **Temperature**: Normal $15^\circ\text{C} - 25^\circ\text{C}$.
- **Fountain Dropdown**: Switch telemetry view between different campus fountain nodes.

#### 3. Fountain Status & Filter Health (`user-fountain-status.html`)
- **Fountain Registry List**: Displays display IDs (e.g. `F001`, `F002`), location names, and operational status.
- **Filter Health Meters**: Visual progress bars showing filter life percentage based on operational flow hours.
- **Maintenance Notes**: Inspect recent service dates and scheduled filter replacement timelines.

#### 4. Water Quality Reports (`user-reports.html`)
- **Historical Data Log**: View past telemetry logs sorted by date and time.
- **Filter & Search**: Filter logs by specific date range, fountain ID, or status severity.
- **Export Options**: Download reports as CSV datasets or formatted PDF summaries.

#### 5. Operator Account Settings (`user-settings.html`)
- **Profile Management**: Update operator full name, phone number, and profile picture.
- **SMS Preferences**: Enable/disable personal mobile SMS notifications for warning threshold alerts.
- **Security**: Update user password.

#### 6. Operator Help & Support (`user-help.html`)
- Operational reference guide, common error messages, and direct submission form for physical fountain repairs.

---

## 7. ⚙️ Admin Portal User Manual (`admin@olfu.edu.ph`)

The **Admin Portal** is designed exclusively for system administrators, department heads, and lead engineers.

### Account Credentials
- **URL**: `http://127.0.0.1:5000/frontend/admin/admin-login.html`
- **Email**: `admin@olfu.edu.ph`
- **Password**: `admin123`

---

### Admin Pages & Features

#### 1. Executive Admin Dashboard (`admin-dashboard.html`)
- **System Overview Counters**: Total registered fountains, active sensors, unresolved alerts, and active user count.
- **Real-Time Telemetry Stream**: Live WebSocket/polling update feed showing raw incoming readings from ESP32 nodes.
- **System Alert Feed**: Immediate alert notification panel showing out-of-range sensor readings.

#### 2. Fountain Management (`admin-fountains.html`)
- **Add New Fountain**: Register new drinking fountains with Display ID (`F005`), Name, Department assignment, and Location.
- **Edit Fountain Info**: Update fountain location details or assign maintenance status (`Online`, `Offline`, `Maintenance`).
- **Delete Fountain**: Remove decommissioned drinking fountains from active tracking.

#### 3. Sensor Management & Threshold Configuration (`admin-sensors.html`)
- **Sensor Hardware Registration**: Link new ESP32 serial MAC addresses to physical fountain stations.
- **Calibration Settings**: Adjust zero-offset and slope values for pH and TDS probes.
- **Threshold Limit Configuration**:
  - Set custom lower/upper bounds for triggering automated alerts:
    - `pH Min` / `pH Max` (e.g., $6.5 - 8.5$)
    - `TDS Warning Limit` (e.g., $300\text{ ppm}$) / `TDS Danger Limit` ($500\text{ ppm}$)
    - `Turbidity Limit` (e.g., $5.0\text{ NTU}$)

#### 4. Alert & Notification Management (`admin-alerts.html`)
- **Alert Feed**: Centralized table of all system-generated threshold breach logs.
- **Acknowledge & Resolve**: Mark active warnings as resolved after physical inspection and maintenance.
- **Manual SMS Dispatch**: Trigger immediate SMS alerts to maintenance technicians on call.

#### 5. Reports & Compliance Analytics (`admin-reports.html`)
- **Advanced Compliance Reporting**: Generate institutional water safety audit compliance reports.
- **Comparative Trend Charts**: Compare parameter variance between multiple campus buildings over days, weeks, or months.
- **Data Export**: Export complete raw database telemetry records to CSV/Excel format.

#### 6. User & Role Management (`admin-users.html`)
- **User Account Directory**: Manage all registered web user accounts.
- **Create Account**: Register new operator accounts with full name, email, phone number, and initial password.
- **Role Assignment**: Assign accounts to either `Admin` (Id: 1) or `User (Operator)` (Id: 2).
- **Account Status**: Toggle user account states between `Active` and `Disabled`.

#### 7. System Settings & SMS Gateway Config (`admin-settings.html`)
- **SMS Gateway Credentials**: Configure Twilio / Semaphore / Resend API keys, sender IDs, and recipient phone lists.
- **Maintenance Mode Toggle**: Suspend public notification services during scheduled campus-wide plumbing maintenance.
- **Database Backup & Cleanup**: Perform single-click database backup dumps and truncate old log entries.
- **System Audit Log**: View timestamped history of administrative user actions (login events, setting modifications, threshold updates).

#### 8. Admin Help Manual (`admin-help.html`)
- Technical documentation covering database schema migrations, hardware troubleshooting, and API deployment.

---

## 8. 📡 Backend REST API v1 Reference

All backend REST API endpoints accept and return `application/json` data payloads.

### Authentication Endpoints (`/api/v1/auth`)

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/v1/auth/login` | `POST` | Authenticate user credentials and return user object & session | No |
| `/api/v1/auth/register` | `POST` | Register a new operator user account | Admin Only |
| `/api/v1/auth/logout` | `POST` | Terminate current user session | Yes |
| `/api/v1/auth/me` | `GET` | Fetch profile details of currently authenticated user | Yes |

---

### Fountain Management Endpoints (`/api/v1/fountains`)

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/v1/fountains` | `GET` | Fetch list of all registered drinking fountains | No |
| `/api/v1/fountains/<id>` | `GET` | Fetch detailed info and latest reading for specific fountain | No |
| `/api/v1/fountains` | `POST` | Register a new fountain | Admin Only |
| `/api/v1/fountains/<id>` | `PUT` | Update fountain details or operational status | Admin Only |
| `/api/v1/fountains/<id>` | `DELETE` | Remove fountain record | Admin Only |

---

### Sensor & Telemetry Endpoints (`/api/v1/sensors`)

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/v1/sensors/update` | `POST` | Ingest real-time JSON telemetry payload from ESP32 | ESP32 / Open |
| `/api/v1/sensors/telemetry` | `POST` | Alternate telemetry ingestion endpoint | ESP32 / Open |
| `/api/v1/sensors/latest` | `GET` | Fetch latest telemetry readings across all fountains | Yes |
| `/api/v1/sensors/history` | `GET` | Fetch historical parameter logs with pagination and filters | Yes |
| `/api/v1/sensors/thresholds`| `GET/PUT` | View or update parameter threshold boundaries | Admin Only |

---

### Alert Management Endpoints (`/api/v1/alerts`)

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/v1/alerts` | `GET` | Fetch active and historical threshold breach alerts | Yes |
| `/api/v1/alerts/<id>/resolve` | `POST` | Mark alert as resolved with maintenance notes | Admin Only |

---

### Users & Settings Endpoints (`/api/v1/users` & `/api/v1/settings`)

| Endpoint | Method | Description | Auth Required |
| :--- | :---: | :--- | :---: |
| `/api/v1/users` | `GET` | List all system users | Admin Only |
| `/api/v1/users/<id>` | `PUT` | Update user details, role, or active status | Admin Only |
| `/api/v1/settings` | `GET` | Fetch global system configurations | Admin Only |
| `/api/v1/settings` | `POST` | Update global system settings and API keys | Admin Only |

---

## 9. 🧪 Water Quality Parameter Standards Reference

The WQMS threshold monitoring engine evaluates incoming telemetry against official **World Health Organization (WHO)** and **Philippine National Standards for Drinking Water (PNSDW)** guidelines:

| Parameter | Unit | Ideal / Safe Range | Warning Range | Critical / Danger Range | Health & Operational Impact |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **pH Level** | $\text{pH}$ | **6.5 – 8.5** | $6.0 - 6.4$ or $8.6 - 9.0$ | $< 6.0$ or $> 9.0$ | Low pH causes pipe corrosion and heavy metal leaching; high pH causes scaling and bitter taste. |
| **Total Dissolved Solids (TDS)** | $\text{ppm}$ | **< 300 ppm** | $300 - 500\text{ ppm}$ | **> 500 ppm** | Elevated TDS indicates high mineral content, potential salinity, or dissolved contaminants. |
| **Turbidity** | $\text{NTU}$ | **< 1.0 NTU** | $1.0 - 5.0\text{ NTU}$ | **> 5.0 NTU** | High turbidity indicates suspended particles, silt, or filter membrane breakdown. |
| **Temperature** | $^\circ\text{C}$ | **15°C – 25°C** | $25.1^\circ\text{C} - 30.0^\circ\text{C}$ | **> 30.0°C** | Warm water promotes bacterial growth in supply lines and reduces drinking palatability. |

---

## 10. 🛠️ Troubleshooting & Frequently Asked Questions (FAQ)

### Frequently Asked Questions

#### Q1: How do I launch the application locally on Windows?
**Answer**: Double-click `start_wqms.bat` in the root folder. The script will verify MySQL/MariaDB database execution, launch the Flask server, and automatically open your default browser to `http://127.0.0.1:5000`.

#### Q2: What are the default login accounts?
- **Admin Portal**: `admin@olfu.edu.ph` with password `admin123`.
- **Operator Portal**: `user@olfu.edu.ph` with password `user123`.

#### Q3: How do ESP32 hardware nodes connect to the system?
**Answer**: Make sure your ESP32 board is connected to the same local Wi-Fi network as your backend server. Update `WIFI_SSID`, `WIFI_PASSWORD`, and `FLASK_SERVER_URL` in `firmware/wqms_esp32/wqms_esp32.ino`, then flash the firmware using the Arduino IDE.

---

### Common Issues & Troubleshooting Steps

| Symptom / Error | Probable Cause | Resolution |
| :--- | :--- | :--- |
| `Error while connecting to MySQL: Access denied` | Invalid database credentials in `.env` | Open `backend/.env` and update `DB_USER` and `DB_PASSWORD` to match your local MySQL configuration. |
| `[SERVER] WiFi connection failed` on ESP32 Serial Monitor | Incorrect Wi-Fi SSID/password or 5GHz network incompatibility | ESP32 only supports 2.4GHz Wi-Fi networks. Update `WIFI_SSID` and `WIFI_PASSWORD` in `wqms_esp32.ino` to a 2.4GHz network. |
| Dashboard parameter charts are not updating | Backend server is offline or WebSocket connection failed | Ensure `app.py` is actively running. Check browser console ($F12$) to verify API requests to `/api/v1/sensors/latest` return HTTP status 200. |
| SMS alerts are not being received | Invalid API key or exhausted SMS gateway credits | Navigate to Admin Portal -> System Settings (`admin-settings.html`) and verify your SMS service API key and sender phone number. |
| `ModuleNotFoundError: No module named 'flask'` | Python environment dependencies not installed | Run `pip install -r backend/requirements.txt` inside your Python environment. |

---

*End of WQMS Complete User's Guide & Project Documentation.*
