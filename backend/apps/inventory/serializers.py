"""Serializers for the staff/admin management API (overview, orders, customers, coupons)."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.orders.models import Coupon, Order
from apps.catalog.models import Product


class AdminOrderSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    placed_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "user",
            "status",
            "status_label",
            "subtotal",
            "discount",
            "shipping",
            "tax",
            "total",
            "coupon_code",
            "items_count",
            "placed_at",
            "city",
        ]

    def get_user(self, obj):
        return {
            "id": obj.user_id,
            "username": obj.user.username,
            "email": obj.user.email,
            "first_name": obj.user.first_name,
        }

    def get_items_count(self, obj):
        return len(obj.items.all())


class AdminOrderDetailSerializer(AdminOrderSerializer):
    items = serializers.SerializerMethodField()
    status_history = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    class Meta(AdminOrderSerializer.Meta):
        fields = AdminOrderSerializer.Meta.fields + ["address", "items", "status_history", "payment_status"]

    def get_items(self, obj):
        from apps.orders.serializers import OrderItemSerializer

        return OrderItemSerializer(obj.items.all(), many=True).data

    def get_status_history(self, obj):
        from apps.orders.serializers import OrderStatusHistorySerializer

        return OrderStatusHistorySerializer(obj.status_history.all(), many=True).data

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        if payment:
            return {"status": payment.status, "gateway": payment.gateway, "transaction_id": payment.transaction_id}
        return None

    def get_address(self, obj):
        return {
            "label": obj.address_label,
            "line1": obj.address_line1,
            "line2": obj.address_line2,
            "city": obj.city,
            "state": obj.state,
            "pincode": obj.pincode,
            "country": obj.country,
        }


class AdminCustomerSerializer(serializers.ModelSerializer):
    order_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    last_order_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = get_user_model()
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
            "is_active",
            "order_count",
            "total_spent",
            "last_order_at",
        ]


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_percent",
            "discount_amount",
            "min_order_value",
            "valid_until",
            "active",
            "max_redemptions",
            "used_count",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate(self, attrs):
        percent = attrs.get("discount_percent", self.instance.discount_percent if self.instance else 0) or 0
        amount = attrs.get("discount_amount", self.instance.discount_amount if self.instance else 0) or 0
        if not (float(percent) > 0 or float(amount) > 0):
            raise serializers.ValidationError("Set either a discount_percent or a discount_amount.")
        return attrs


class AdminProductSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "brand",
            "brand_name",
            "category",
            "category_name",
            "description",
            "price",
            "mrp",
            "image",
            "stock",
            "sold_count",
            "rating",
            "rating_count",
            "active",
            "featured",
            "discount_percent",
            "in_stock",
            "created_at",
        ]
        read_only_fields = ["slug", "sold_count", "rating", "rating_count", "created_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("price cannot be negative")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("stock cannot be negative")
        return value