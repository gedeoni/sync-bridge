from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from sync.models import Employee


@override_settings(APP_AUTH_TOKEN="test-secret-token")
class GraphQLTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_get_graphql_playground_no_auth(self):
        # GET should succeed and bypass auth (GraphiQL loader)
        response = self.client.get("/graphql", HTTP_ACCEPT="text/html")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_graphql_query_no_auth(self):
        # POST requires auth
        payload = {"query": "query { employees { email } }"}
        response = self.client.post("/graphql", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json().get("message"), "Access Denied")

    def test_post_graphql_query_success(self):
        # Create an employee first
        Employee.objects.create(
            employee_id="E001",
            first_name="Jane",
            last_name="Doe",
            email="jane.doe@company.com",
        )

        self.client.credentials(HTTP_X_AUTH_TOKEN="test-secret-token")
        payload = {"query": "query { employees { email firstName } }"}
        response = self.client.post("/graphql", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json().get("data")
        self.assertIsNotNone(data)
        employees = data.get("employees")
        self.assertEqual(len(employees), 1)
        self.assertEqual(employees[0].get("email"), "jane.doe@company.com")
        self.assertEqual(employees[0].get("firstName"), "Jane")

    def test_post_graphql_mutation_success(self):
        self.client.credentials(HTTP_X_AUTH_TOKEN="test-secret-token")
        payload = {
            "query": """
                mutation {
                    createEmployee(data: {
                        employeeId: "E002",
                        firstName: "John",
                        lastName: "Smith",
                        email: "john.smith@company.com"
                    }) {
                        id
                        email
                    }
                }
            """
        }
        response = self.client.post("/graphql", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json().get("data")
        self.assertIsNotNone(data)
        create_employee = data.get("createEmployee")
        self.assertEqual(create_employee.get("email"), "john.smith@company.com")

        # Verify it exists in DB
        self.assertTrue(
            Employee.objects.filter(email="john.smith@company.com").exists()
        )
