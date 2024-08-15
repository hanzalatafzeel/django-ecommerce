"""Cart API views."""
from decimal import Decimal

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import Cart, CartItem
from apps.cart.serializers import CartSerializer
from apps.catalog.models import Product


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart = get_or_create_cart(request.user)
        return Response(CartSerializer(cart).data)

    def delete(self, request):
        cart = get_or_create_cart(request.user)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartAddView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cart = get_or_create_cart(request.user)
        product = Product.objects.get(pk=request.data.get("product"))
        quantity = int(request.data.get("quantity", 1))
        if quantity <= 0:
            return Response({"detail": "quantity must be positive"}, status=400)
        if quantity > product.stock:
            return Response({"detail": f"Only {product.stock} in stock"}, status=400)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity, "unit_price": product.price},
        )
        if not created:
            item.quantity = min(item.quantity + quantity, max(product.stock, item.quantity))
            item.save()
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CartUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cart = get_or_create_cart(request.user)
        try:
            item = cart.items.select_related("product").get(pk=request.data.get("item"))
        except CartItem.DoesNotExist:
            return Response({"detail": "item not found"}, status=404)
        quantity = int(request.data.get("quantity", 1))
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = min(quantity, item.product.stock)
            item.save()
        return Response(CartSerializer(cart).data)


class CartRemoveView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        cart = get_or_create_cart(request.user)
        cart.items.filter(pk=request.data.get("item")).delete()
        return Response(CartSerializer(cart).data)