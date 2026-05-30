# Harmless comment to test pre-commit hook staged filter
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient


@override_settings(APP_AUTH_TOKEN="test-secret-token")
class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_get_sync_history_no_auth(self):
        # GET requests should bypass authentication
        response = self.client.get("/api/v1/sync-history")
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_sync_stats_no_auth(self):
        # GET requests should bypass authentication
        response = self.client.get("/api/v1/sync/stats")
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_sync_no_auth(self):
        # POST requests require authentication
        response = self.client.post(
            "/api/v1/sync", {"model": "customers", "data": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json().get("message"), "Access Denied")

    def test_post_sync_valid_auth(self):
        # POST with correct token should pass authentication (might fail validation but not auth)
        self.client.credentials(HTTP_X_AUTH_TOKEN="test-secret-token")
        response = self.client.post(
            "/api/v1/sync",
            {
                "model": "customers",
                "data": [{"email": "t@t.com", "first_name": "A", "last_name": "B"}],
            },
            format="json",
        )
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_post_sync_invalid_auth(self):
        # POST with incorrect token should fail authentication
        self.client.credentials(HTTP_X_AUTH_TOKEN="wrong-token")
        response = self.client.post(
            "/api/v1/sync", {"model": "customers", "data": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
