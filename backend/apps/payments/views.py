"""Payment API views: initiate, confirm, webhook stub."""
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.payments.models import Payment
from apps.payments.services import PaymentError, confirm_payment, initiate_payment


class _OwnedOrder:
    permission_classes = [permissions.IsAuthenticated]

    def get_order_or_404(self, request, pk):
        order = Order.objects.filter(user=request.user, pk=pk).first()
        if not order:
            raise Order.DoesNotExist
        return order


class PaymentInitiateView(_OwnedOrder, APIView):
    def post(self, request, pk):
        try:
            order = self.get_order_or_404(request, pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        try:
            payment, intent = initiate_payment(
                order,
                method=request.data.get("method", "card"),
                gateway=request.data.get("gateway", "mock"),
            )
        except PaymentError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(
            {"payment_id": payment.id, "transaction_id": payment.transaction_id, "client_secret": intent.get("client_secret", "")},
            status=200,
        )


class PaymentConfirmView(_OwnedOrder, APIView):
    def post(self, request, pk):
        try:
            order = self.get_order_or_404(request, pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found"}, status=404)
        try:
            payment, result = confirm_payment(
                order,
                card_number=request.data.get("card_number", ""),
                otp=request.data.get("otp", ""),
                gateway=request.data.get("gateway", "mock"),
            )
        except PaymentError as exc:
            return Response({"detail": str(exc)}, status=400)
        from apps.orders.serializers import OrderSerializer

        return Response({"payment": {"status": payment.status, "transaction_id": payment.transaction_id}, "order": OrderSerializer(order).data})


class PaymentMethodListView(APIView):
    permission_classes = [permissions.AllowAny]
    balance = {"gateway": "mock", "magic_card": "4242 4242 4242 4242"}

    def get(self, request):
        return Response(
            {
                "gateway": "mock",
                "magic_card": "4242 4242 4242 4242",
                "methods": ["card", "upi", "cod"],
                "note": "Use the magic card to simulate a successful payment.",
            }
        )


class StripeWebhookView(APIView):
    """Endpoint stub for gateway callbacks; extends when live Stripe is configured."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Production: verify Stripe signature via request.headers['Stripe-Signature']
        return Response({"received": True}, status=200)