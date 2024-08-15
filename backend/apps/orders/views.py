"""Order API views."""
from django.core.exceptions import ValidationError
from rest_framework import permissions, status
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.orders.serializers import OrderCreateSerializer, OrderSerializer
from apps.orders.services import cancel_order, checkout_from_cart


class OrderListCreateView(ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects.select_related("user", "coupon")
            .prefetch_related("items", "status_history")
            .filter(user=self.request.user)
        )

    def create(self, request, *args, **kwargs):
        input_ser = OrderCreateSerializer(data=request.data, context={"request": request})
        input_ser.is_valid(raise_exception=True)
        try:
            order = checkout_from_cart(
                request.user,
                input_ser.validated_data["address"],
                coupon_code=input_ser.validated_data.get("coupon_code") or None,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return (
            Order.objects.select_related("user", "coupon")
            .prefetch_related("items", "status_history")
            .filter(user=self.request.user)
        )


class OrderCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        order = Order.objects.filter(user=request.user, pk=pk).first()
        if not order:
            return Response({"detail": "Order not found"}, status=404)
        try:
            cancel_order(order)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(OrderSerializer(order).data)