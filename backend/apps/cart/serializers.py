"""Cart serializers."""
from rest_framework import serializers

from apps.cart.models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    product_detail = serializers.SerializerMethodField()
    subtotal = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_detail", "quantity", "unit_price", "subtotal"]

    def get_product_detail(self, obj):
        from apps.catalog.models import Product
        from apps.catalog.serializers import ProductListSerializer

        return ProductListSerializer(obj.product).data


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.DecimalField(read_only=True, max_digits=12, decimal_places=2)

    class Meta:
        model = Cart
        fields = ["id", "items", "subtotal", "count", "created_at", "updated_at"]