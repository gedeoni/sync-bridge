from django.db import models


class Customer(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    default_currency = models.CharField(max_length=3, default="USD")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.email}"


class Product(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="USD")
    active = models.BooleanField(default=True)
    weight_grams = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Order(models.Model):
    order_number = models.CharField(max_length=64, unique=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.PROTECT, related_name="orders"
    )
    status = models.CharField(max_length=32)
    currency = models.CharField(max_length=3, default="USD")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    placed_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)


class Employee(models.Model):
    employee_id = models.CharField(max_length=64)
    first_name = models.CharField(max_length=150)
    middle_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150)
    gender = models.CharField(max_length=64, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=64, blank=True, null=True)
    date_of_birth = models.DateTimeField(blank=True, null=True)
    nationality = models.CharField(max_length=64, blank=True, null=True)
    job_level = models.CharField(max_length=64, blank=True, null=True)
    department = models.CharField(max_length=128, blank=True, null=True)
    location = models.CharField(max_length=128, blank=True, null=True)
    bank_account_number = models.CharField(max_length=128, blank=True, null=True)
    company = models.CharField(max_length=128, blank=True, null=True)
    job_title = models.CharField(max_length=128, blank=True, null=True)
    cost_center = models.CharField(max_length=128, blank=True, null=True)
    start_date = models.DateTimeField(blank=True, null=True)
    employee_status = models.CharField(max_length=64, blank=True, null=True)
    manager_id = models.CharField(max_length=64, blank=True, null=True)
    manager_email = models.EmailField(blank=True, null=True)
    last_modified_on = models.DateTimeField(blank=True, null=True)
    last_modified = models.BigIntegerField(blank=True, null=True)

    @property
    def full_name(self) -> str:
        parts = [self.first_name, self.middle_name, self.last_name]
        return " ".join([part for part in parts if part])

    def __str__(self) -> str:
        return self.email
