"""Order serializers."""
from decimal import Decimal

from rest_framework import serializers

from apps.orders.models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_title", "product_image", "unit_price", "quantity", "subtotal"]

    def get_subtotal(self, obj):
        return str(obj.subtotal)


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = ["id", "status", "status_label", "note", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_label",
            "status_history",
            "subtotal",
            "discount",
            "shipping",
            "tax",
            "total",
            "coupon_code",
            "payment_status",
            "items",
            "placed_at",
            "delivered_at",
            "address_label",
            "address_line1",
            "city",
            "state",
            "pincode",
        ]
        read_only_fields = fields

    def get_payment_status(self, obj):
        payment = getattr(obj, "payment", None)
        if payment:
            return {"status": payment.status, "gateway": payment.gateway, "transaction_id": payment.transaction_id}
        return None


class OrderCreateSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        from apps.accounts.models import Address

        try:
            attrs["address"] = Address.objects.get(id=attrs["address_id"], user=self.context["request"].user)
        except Address.DoesNotExist:
            raise serializers.ValidationError({"address_id": "Address not found"})
        return attrs