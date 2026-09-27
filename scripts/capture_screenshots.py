import os
import time
import json
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "images", "docs"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

BASE_URL = "http://127.0.0.1:5000"

USER_SESSION = {
    "id": 2,
    "email": "user@olfu.edu.ph",
    "role": "User",
    "name": "Regular User",
    "loginTime": "2026-09-27T12:00:00.000Z"
}

ADMIN_SESSION = {
    "id": 1,
    "email": "admin@olfu.edu.ph",
    "role": "Admin",
    "name": "System Administrator",
    "loginTime": "2026-09-27T12:00:00.000Z"
}

PUBLIC_PAGES = [
    {"name": "public_home.png", "url": f"{BASE_URL}/index.html", "wait": 1.5},
    {"name": "public_about.png", "url": f"{BASE_URL}/about.html", "wait": 1.0},
    {"name": "public_fountains.png", "url": f"{BASE_URL}/fountains.html", "wait": 1.5},
    {"name": "public_research.png", "url": f"{BASE_URL}/research.html", "wait": 1.0},
    {"name": "public_contact.png", "url": f"{BASE_URL}/contact.html", "wait": 1.0},
]

USER_PAGES = [
    {"name": "user_dashboard.png", "url": f"{BASE_URL}/frontend/user/user-dashboard.html", "wait": 2.5},
    {"name": "user_monitoring.png", "url": f"{BASE_URL}/frontend/user/user-monitoring.html", "wait": 2.5},
    {"name": "user_fountain_status.png", "url": f"{BASE_URL}/frontend/user/user-fountain-status.html", "wait": 2.5},
    {"name": "user_reports.png", "url": f"{BASE_URL}/frontend/user/user-reports.html", "wait": 2.5},
    {"name": "user_settings.png", "url": f"{BASE_URL}/frontend/user/user-settings.html", "wait": 2.0},
    {"name": "user_help.png", "url": f"{BASE_URL}/frontend/user/user-help.html", "wait": 1.5},
]

ADMIN_PAGES = [
    {"name": "admin_dashboard.png", "url": f"{BASE_URL}/frontend/admin/admin-dashboard.html", "wait": 2.5},
    {"name": "admin_fountains.png", "url": f"{BASE_URL}/frontend/admin/admin-fountains.html", "wait": 2.5},
    {"name": "admin_sensors.png", "url": f"{BASE_URL}/frontend/admin/admin-sensors.html", "wait": 2.5},
    {"name": "admin_alerts.png", "url": f"{BASE_URL}/frontend/admin/admin-alerts.html", "wait": 2.5},
    {"name": "admin_reports.png", "url": f"{BASE_URL}/frontend/admin/admin-reports.html", "wait": 2.5},
    {"name": "admin_users.png", "url": f"{BASE_URL}/frontend/admin/admin-users.html", "wait": 2.5},
    {"name": "admin_settings.png", "url": f"{BASE_URL}/frontend/admin/admin-settings.html", "wait": 2.5},
    {"name": "admin_help.png", "url": f"{BASE_URL}/frontend/admin/admin-help.html", "wait": 1.5},
]

def capture_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. PUBLIC PAGES
        print("\n--- Capturing Public Pages ---")
        context_pub = browser.new_context(viewport={"width": 1280, "height": 800})
        page_pub = context_pub.new_page()
        for item in PUBLIC_PAGES:
            filepath = os.path.join(OUTPUT_DIR, item["name"])
            print(f"Capturing {item['name']} from {item['url']}...")
            try:
                page_pub.goto(item["url"], wait_until="networkidle", timeout=10000)
            except Exception as e:
                print(f"  [Error] {e}")
            time.sleep(item["wait"])
            page_pub.screenshot(path=filepath, full_page=False)
        context_pub.close()

        # 2. OPERATOR LOGIN & USER PAGES
        print("\n--- Capturing Operator User Pages ---")
        context_user = browser.new_context(viewport={"width": 1280, "height": 800})
        page_user = context_user.new_page()

        # Capture login page first
        filepath = os.path.join(OUTPUT_DIR, "user_login.png")
        print(f"Capturing user_login.png from {BASE_URL}/login.html...")
        page_user.goto(f"{BASE_URL}/login.html", wait_until="networkidle")
        time.sleep(1.0)
        page_user.screenshot(path=filepath, full_page=False)

        # Inject User Session into localStorage
        print("Injecting aqua_monitor_user_session into localStorage...")
        page_user.evaluate(f"localStorage.setItem('aqua_monitor_user_session', JSON.stringify({json.dumps(USER_SESSION)}))")
        
        for item in USER_PAGES:
            filepath = os.path.join(OUTPUT_DIR, item["name"])
            print(f"Capturing {item['name']} from {item['url']}...")
            try:
                page_user.goto(item["url"], wait_until="networkidle", timeout=10000)
            except Exception as e:
                print(f"  [Error] {e}")
            time.sleep(item["wait"])
            page_user.screenshot(path=filepath, full_page=False)
        context_user.close()

        # 3. ADMIN LOGIN & ADMIN PAGES
        print("\n--- Capturing Admin Pages ---")
        context_admin = browser.new_context(viewport={"width": 1280, "height": 800})
        page_admin = context_admin.new_page()

        # Capture admin login page first
        filepath = os.path.join(OUTPUT_DIR, "admin_login.png")
        print(f"Capturing admin_login.png from {BASE_URL}/frontend/admin/admin-login.html...")
        page_admin.goto(f"{BASE_URL}/frontend/admin/admin-login.html", wait_until="networkidle")
        time.sleep(1.0)
        page_admin.screenshot(path=filepath, full_page=False)

        # Inject Admin Session into localStorage
        print("Injecting aqua_monitor_admin_session into localStorage...")
        page_admin.evaluate(f"localStorage.setItem('aqua_monitor_admin_session', JSON.stringify({json.dumps(ADMIN_SESSION)}))")

        for item in ADMIN_PAGES:
            filepath = os.path.join(OUTPUT_DIR, item["name"])
            print(f"Capturing {item['name']} from {item['url']}...")
            try:
                page_admin.goto(item["url"], wait_until="networkidle", timeout=10000)
            except Exception as e:
                print(f"  [Error] {e}")
            time.sleep(item["wait"])
            page_admin.screenshot(path=filepath, full_page=False)
        context_admin.close()

        browser.close()
    print("\nAll authenticated screenshots re-captured successfully!")

if __name__ == "__main__":
    capture_all()
