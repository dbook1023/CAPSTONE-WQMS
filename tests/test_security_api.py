import os
import sys
import unittest
from datetime import datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from app import app
from api.v1.common import generate_auth_token


class SecurityAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

        # Pre-generate valid tokens for testing
        self.admin_token = generate_auth_token(user_id=1, role_name='Admin', portal_type='admin')
        self.user1_token = generate_auth_token(user_id=10, role_name='User', portal_type='user')
        self.user2_token = generate_auth_token(user_id=20, role_name='User', portal_type='user')

    # --- 1. UNAUTHENTICATED ACCESS TESTS ---
    def test_unauthenticated_access_denied(self):
        """Unauthenticated requests to protected endpoints should return 401"""
        res = self.client.get('/api/v1/users/')
        self.assertIn(res.status_code, [401, 403])

        res = self.client.get('/api/v1/admins/')
        self.assertIn(res.status_code, [401, 403])

        res = self.client.put('/api/v1/settings/update', json={'test_key': 'val'})
        self.assertIn(res.status_code, [401, 403])

    # --- 2. INSUFFICIENT ROLE TESTS ---
    def test_insufficient_role_access_denied(self):
        """Standard user/operator token trying to access admin routes should return 403"""
        self.client.set_cookie('aqua_session', self.user1_token)
        res = self.client.get('/api/v1/admins/')
        self.assertEqual(res.status_code, 403)

        res = self.client.post('/api/v1/admins/', json={'name': 'Hacker', 'email': 'hacker@test.com'})
        self.assertEqual(res.status_code, 403)

    # --- 3. IDOR / BOLA PROTECTION TESTS ---
    def test_idor_protection_user_access_another_user(self):
        """User 1 (id=10) attempting to view or modify User 2 (id=20) should return 403"""
        self.client.set_cookie('aqua_session', self.user1_token)
        
        # User 1 tries to view User 2
        res = self.client.get('/api/v1/users/20')
        self.assertEqual(res.status_code, 403)

        # User 1 tries to update User 2
        res = self.client.put('/api/v1/users/20', json={'name': 'Tampered Name'})
        self.assertEqual(res.status_code, 403)

    # --- 4. EXPIRED / INVALID AUTHENTICATION TESTS ---
    def test_invalid_token_denied(self):
        """Requests with an invalid token string should return 401"""
        self.client.set_cookie('aqua_session', 'invalid.garbage.token.string')
        res = self.client.get('/api/v1/users/me')
        self.assertEqual(res.status_code, 401)

    # --- 5. PUBLIC & ESP32 ENDPOINT ACCESSIBILITY TESTS ---
    def test_public_and_esp32_endpoints_accessible(self):
        """Public status endpoint and ESP32 telemetry should be accessible without session tokens"""
        res = self.client.get('/api/v1/status')
        self.assertIn(res.status_code, [200, 500])  # 200 if DB connected, 500 if DB offline

        # ESP32 POST telemetry route test
        res = self.client.post('/api/v1/sensors/update', json={
            'serial': 'TEST-ESP32-999',
            'temperature': 24.5,
            'ph': 7.1,
            'tds': 180,
            'ntu': 0.8
        })
        self.assertIn(res.status_code, [200, 400, 500])  # Route accepted request


if __name__ == '__main__':
    unittest.main()
