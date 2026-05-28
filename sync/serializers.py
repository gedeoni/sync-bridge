import re
from decimal import Decimal
from rest_framework import serializers
from .models import Customer, Product, Order, OrderItem, Employee


class SyncRequestSerializer(serializers.Serializer):
    model = serializers.ChoiceField(choices=['customers', 'products', 'orders', 'employees'])
    data = serializers.ListField(child=serializers.DictField(), allow_empty=False)



class CustomerSyncSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'email', 'first_name', 'last_name', 'default_currency']
        extra_kwargs = {
            'id': {'required': False},
            'default_currency': {'required': False},
        }


class ProductSyncSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'currency', 'active', 'weight_grams']
        extra_kwargs = {
            'id': {'required': False},
        }


class OrderItemSyncSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product')

    class Meta:
        model = OrderItem
        # 'order' is excluded as it will be set by the parent OrderSyncSerializer
        fields = ['id', 'product_id', 'qty', 'unit_price']
        extra_kwargs = {
            'id': {'required': False},
        }


class OrderSyncSerializer(serializers.ModelSerializer):
    items = OrderItemSyncSerializer(many=True, required=False)
    customer_id = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), source='customer')

    class Meta:
        model = Order
        fields = ['id', 'order_number', 'customer_id', 'status', 'currency', 'amount', 'items']
        extra_kwargs = {
            'id': {'required': False},
            'currency': {'required': False},
            'amount': {'required': False},
        }

    def validate(self, attrs):
        items = attrs.get('items')
        amount = attrs.get('amount')

        if items:
            # unit_price is already a Decimal from the child serializer
            calc_amount = sum(Decimal(item['qty']) * item['unit_price'] for item in items)
            if amount is None:
                attrs['amount'] = calc_amount
            elif amount != calc_amount:
                raise serializers.ValidationError(
                    f"Order amount must equal the sum of item prices (qty * unit_price). Calculated={calc_amount} provided={amount}"
                )
        elif amount is None:
            raise serializers.ValidationError('Order must include items or an amount')

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = Order.objects.create(**validated_data)
        if items_data:
            order_items = [OrderItem(order=order, **item_data) for item_data in items_data]
            OrderItem.objects.bulk_create(order_items)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        # Update the Order instance fields using the parent class method
        instance = super().update(instance, validated_data)

        # Replace items only if 'items' key was present in the payload
        if items_data is not None:
            instance.items.all().delete()
            if items_data:
                order_items = [OrderItem(order=instance, **item_data) for item_data in items_data]
                OrderItem.objects.bulk_create(order_items)

        return instance


class EmployeeSyncSerializer(serializers.ModelSerializer):
    id = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = '__all__'

    def to_internal_value(self, data):
        new_data = {}
        for key, value in data.items():
            # covert camelCase to snake_case
            new_key = re.sub(r'(?<!^)(?=[A-Z])', '_', key).lower()
            new_data[new_key] = value
        return super().to_internal_value(new_data)

    def validate_id(self, value):
        if value is None:
            return value
        try:
            return int(value)
        except (ValueError, TypeError) as exc:
            raise serializers.ValidationError('Employee id must be numeric when provided') from exc


class CustomerSyncRequestSerializer(serializers.Serializer):
    model = serializers.ChoiceField(choices=['customers'])
    data = CustomerSyncSerializer(many=True)


class ProductSyncRequestSerializer(serializers.Serializer):
    model = serializers.ChoiceField(choices=['products'])
    data = ProductSyncSerializer(many=True)


class OrderSyncRequestSerializer(serializers.Serializer):
    model = serializers.ChoiceField(choices=['orders'])
    data = OrderSyncSerializer(many=True)


class EmployeeSyncRequestSerializer(serializers.Serializer):
    model = serializers.ChoiceField(choices=['employees'])
    data = EmployeeSyncSerializer(many=True)
