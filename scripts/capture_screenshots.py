import os
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "images", "docs"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

BASE_URL = "http://127.0.0.1:5000"

PAGES = [
    # Public Pages
    {"name": "public_home.png", "url": f"{BASE_URL}/index.html", "wait": 1.5},
    {"name": "public_about.png", "url": f"{BASE_URL}/about.html", "wait": 1.0},
    {"name": "public_fountains.png", "url": f"{BASE_URL}/fountains.html", "wait": 1.5},
    {"name": "public_research.png", "url": f"{BASE_URL}/research.html", "wait": 1.0},
    {"name": "public_contact.png", "url": f"{BASE_URL}/contact.html", "wait": 1.0},

    # Operator Pages
    {"name": "user_login.png", "url": f"{BASE_URL}/login.html", "wait": 1.0},
    {"name": "user_dashboard.png", "url": f"{BASE_URL}/frontend/user/user-dashboard.html", "wait": 2.0},
    {"name": "user_monitoring.png", "url": f"{BASE_URL}/frontend/user/user-monitoring.html", "wait": 2.0},
    {"name": "user_fountain_status.png", "url": f"{BASE_URL}/frontend/user/user-fountain-status.html", "wait": 2.0},
    {"name": "user_reports.png", "url": f"{BASE_URL}/frontend/user/user-reports.html", "wait": 2.0},
    {"name": "user_settings.png", "url": f"{BASE_URL}/frontend/user/user-settings.html", "wait": 1.5},
    {"name": "user_help.png", "url": f"{BASE_URL}/frontend/user/user-help.html", "wait": 1.0},

    # Admin Pages
    {"name": "admin_login.png", "url": f"{BASE_URL}/frontend/admin/admin-login.html", "wait": 1.0},
    {"name": "admin_dashboard.png", "url": f"{BASE_URL}/frontend/admin/admin-dashboard.html", "wait": 2.0},
    {"name": "admin_fountains.png", "url": f"{BASE_URL}/frontend/admin/admin-fountains.html", "wait": 2.0},
    {"name": "admin_sensors.png", "url": f"{BASE_URL}/frontend/admin/admin-sensors.html", "wait": 2.0},
    {"name": "admin_alerts.png", "url": f"{BASE_URL}/frontend/admin/admin-alerts.html", "wait": 2.0},
    {"name": "admin_reports.png", "url": f"{BASE_URL}/frontend/admin/admin-reports.html", "wait": 2.0},
    {"name": "admin_users.png", "url": f"{BASE_URL}/frontend/admin/admin-users.html", "wait": 2.0},
    {"name": "admin_settings.png", "url": f"{BASE_URL}/frontend/admin/admin-settings.html", "wait": 2.0},
    {"name": "admin_help.png", "url": f"{BASE_URL}/frontend/admin/admin-help.html", "wait": 1.0},
]

def capture_all():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        print(f"Saving screenshots to: {OUTPUT_DIR}")

        for item in PAGES:
            filepath = os.path.join(OUTPUT_DIR, item["name"])
            print(f"Capturing {item['url']} -> {item['name']}...")
            try:
                page.goto(item["url"], wait_until="networkidle", timeout=10000)
            except Exception as e:
                print(f"   [Warning] Load timeout or error for {item['url']}: {e}")
            time.sleep(item["wait"])
            page.screenshot(path=filepath, full_page=False)
            print(f"   Saved {item['name']}")

        browser.close()
    print("All screenshots captured successfully!")

if __name__ == "__main__":
    capture_all()
