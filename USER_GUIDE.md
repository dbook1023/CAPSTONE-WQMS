# Water Quality Monitoring System (WQMS) - Complete User's Guide & Project Documentation

Welcome to the official, end-to-end **User's Guide & Technical Reference** for the **Water Quality Monitoring System (WQMS)**. This comprehensive manual details the complete system architecture, hardware firmware integration, backend API, configuration files, visual page guides with screenshots, and step-by-step user operational guides for both **System Administrators** and **Operators (Standard Users)**.

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
   - [Operator Login](#operator-login)
   - [Operator Dashboard](#operator-dashboard)
   - [Real-time Water Monitoring](#real-time-water-monitoring)
   - [Fountain Status & Filter Health](#fountain-status--filter-health)
   - [Water Quality Reports](#water-quality-reports)
   - [Operator Account Settings](#operator-account-settings)
   - [Operator Help & Support](#operator-help--support)
7. [Admin Portal User Manual (`admin@olfu.edu.ph`)](#7-admin-portal-user-manual-adminolfueduph)
   - [Admin Login](#admin-login)
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

---

### Database Connection Config (`db_config.py`)
Located at: `backend/db_config.py`

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

#### Build Shell Script (`build.sh`)
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

#### Render Blueprint (`render.yaml`)
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

---

## 4. 🔌 Hardware & ESP32 Firmware Integration

Firmware Location: `firmware/wqms_esp32/wqms_esp32.ino`

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

## 5. 🌐 Public Information Pages Manual

### 1. Home Page (`index.html`)
Overview of campus drinking water safety initiatives, real-time safety status summary banner, and direct navigation links.

![Public Home Page](assets/images/docs/public_home.png)

---

### 2. About WQMS (`about.html`)
Detailed background on the smart campus water monitoring program, sensor technology explanation, and environmental compliance standards.

![About WQMS](assets/images/docs/public_about.png)

---

### 3. Campus Fountain Locator (`fountains.html`)
Interactive list and location directory of drinking fountains across buildings and departments, showing real-time operational status (Online, Offline, Under Maintenance).

![Campus Fountain Locator](assets/images/docs/public_fountains.png)

---

### 4. Water Safety & Research (`research.html`)
Educational reference explaining pH, TDS, Turbidity, and Temperature metrics according to WHO and PNSDW guidelines.

![Water Safety Research](assets/images/docs/public_research.png)

---

### 5. Contact & Support (`contact.html`)
Public contact form allowing campus visitors, faculty, and students to send feedback or report physical fountain issues to facility staff.

![Contact & Support Page](assets/images/docs/public_contact.png)

---

## 6. 👤 Operator Portal User Manual (`user@olfu.edu.ph`)

The **Operator Portal** is engineered for facility operators, maintenance staff, and lab technicians.

### Account Credentials
- **URL**: `http://127.0.0.1:5000/login.html` (or `frontend/user/user-dashboard.html`)
- **Email**: `user@olfu.edu.ph`
- **Password**: `user123`

---

### 1. Operator Login (`login.html`)
Secure user authentication portal for facility operators.

![Operator Login Page](assets/images/docs/user_login.png)

---

### 2. Operator Dashboard (`user-dashboard.html`)
Quick view of campus average pH, average TDS (ppm), average Turbidity (NTU), and water temperature (°C) with operational health indicators.

![Operator Dashboard](assets/images/docs/user_dashboard.png)

---

### 3. Real-time Water Monitoring (`user-monitoring.html`)
Live interactive parameter charts powered by Chart.js for real-time telemetry rendering across campus drinking fountains.

![Real-time Water Monitoring](assets/images/docs/user_monitoring.png)

---

### 4. Fountain Status & Filter Health (`user-fountain-status.html`)
Registry listing showing active vs. maintenance status of campus drinking fountains and visual filter life percentage meters.

![Fountain Status & Filter Health](assets/images/docs/user_fountain_status.png)

---

### 5. Water Quality Reports (`user-reports.html`)
Historical data log view with date-range filters and CSV/PDF report download capabilities.

![Water Quality Reports Page](assets/images/docs/user_reports.png)

---

### 6. Operator Account Settings (`user-settings.html`)
Manage profile preferences, SMS alert subscriptions, and password updates.

![Operator Settings Page](assets/images/docs/user_settings.png)

---

### 7. Operator Help & Support (`user-help.html`)
Operational reference guide, common error messages, and direct submission form for physical fountain repairs.

![Operator Help Page](assets/images/docs/user_help.png)

---

## 7. ⚙️ Admin Portal User Manual (`admin@olfu.edu.ph`)

The **Admin Portal** is designed exclusively for system administrators, department heads, and lead engineers.

### Account Credentials
- **URL**: `http://127.0.0.1:5000/frontend/admin/admin-login.html`
- **Email**: `admin@olfu.edu.ph`
- **Password**: `admin123`

---

### 1. Admin Login (`admin-login.html`)
Protected administrative login portal enforcing role-based authentication.

![Admin Login Page](assets/images/docs/admin_login.png)

---

### 2. Executive Admin Dashboard (`admin-dashboard.html`)
System-wide counters (total fountains, active sensors, unresolved alerts, user accounts), live incoming telemetry stream, and active alert feeds.

![Executive Admin Dashboard](assets/images/docs/admin_dashboard.png)

---

### 3. Fountain Management (`admin-fountains.html`)
Provisioning new drinking fountains, modifying physical location assignments, and updating operational states (`Online`, `Offline`, `Maintenance`).

![Fountain Management Page](assets/images/docs/admin_fountains.png)

---

### 4. Sensor Management & Threshold Configuration (`admin-sensors.html`)
Registering sensor hardware nodes, viewing raw telemetry logs, setting parameter warning/critical thresholds (pH, TDS, Turbidity, Temp, Flow).

![Sensor Management Page](assets/images/docs/admin_sensors.png)

---

### 5. Alert & Notification Management (`admin-alerts.html`)
Automated alert breach log feed, resolving active warnings, dispatching manual SMS notifications to maintenance technicians.

![Alert Management Page](assets/images/docs/admin_alerts.png)

---

### 6. Reports & Compliance Analytics (`admin-reports.html`)
Exporting institutional water safety audit compliance reports, multi-building trend charts, and raw CSV data exports.

![Admin Reports & Analytics](assets/images/docs/admin_reports.png)

---

### 7. User & Role Management (`admin-users.html`)
Managing registered accounts, creating new operator accounts, assigning roles (`Admin` / `User`), and toggling account status (`Active` / `Disabled`).

![User & Role Management Page](assets/images/docs/admin_users.png)

---

### 8. System Settings & SMS Gateway Config (`admin-settings.html`)
Configuring SMS gateway credentials (Twilio / Semaphore / Resend), database backup tools, maintenance mode toggle, and system audit logs.

![System Settings Page](assets/images/docs/admin_settings.png)

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
