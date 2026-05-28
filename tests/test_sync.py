from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from sync.models import Customer, Product, Order


@override_settings(APP_AUTH_TOKEN='test-secret-token')
class SyncTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_AUTH_TOKEN='test-secret-token')

    def test_sync_customer_success(self):
        payload = {
            "model": "customers",
            "data": [
                {
                    "email": "jane@example.com",
                    "first_name": "Jane",
                    "last_name": "Doe"
                }
            ]
        }
        response = self.client.post('/api/v1/sync', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify it was created in the DB
        self.assertTrue(Customer.objects.filter(email="jane@example.com").exists())
        customer = Customer.objects.get(email="jane@example.com")
        self.assertEqual(customer.first_name, "Jane")

    def test_sync_product_success(self):
        payload = {
            "model": "products",
            "data": [
                {
                    "name": "Awesome Widget",
                    "description": "Premium quality widget",
                    "price": "19.99",
                    "currency": "USD",
                    "active": True,
                    "weight_grams": 250
                }
            ]
        }
        response = self.client.post('/api/v1/sync', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Product.objects.filter(name="Awesome Widget").exists())

    def test_sync_order_success(self):
        # Create a Customer and Product first
        customer = Customer.objects.create(email="c@c.com", first_name="A", last_name="B")
        product = Product.objects.create(name="P1", price="10.00", currency="USD")

        payload = {
            "model": "orders",
            "data": [
                {
                    "order_number": "ORD-12345",
                    "customer_id": customer.id,
                    "status": "pending",
                    "currency": "USD",
                    "items": [
                        {
                            "product_id": product.id,
                            "qty": 3,
                            "unit_price": "10.00"
                        }
                    ]
                }
            ]
        }
        response = self.client.post('/api/v1/sync', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(Order.objects.filter(order_number="ORD-12345").exists())
        order = Order.objects.get(order_number="ORD-12345")
        self.assertEqual(order.amount, 30.00)
        self.assertEqual(order.items.count(), 1)

    def test_sync_atomic_rollback(self):
        # Verify that if any item in the sync payload fails, the entire batch is rolled back.
        payload = {
            "model": "customers",
            "data": [
                {
                    "email": "rollback-valid@example.com",
                    "first_name": "Valid",
                    "last_name": "User"
                },
                {
                    "email": "invalid-email-format",  # Should fail validation!
                    "first_name": "Invalid",
                    "last_name": "User"
                }
            ]
        }
        response = self.client.post('/api/v1/sync', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify that NEITHER customer was saved in the database
        self.assertFalse(Customer.objects.filter(email="rollback-valid@example.com").exists())
        self.assertFalse(Customer.objects.filter(email="invalid-email-format").exists())
