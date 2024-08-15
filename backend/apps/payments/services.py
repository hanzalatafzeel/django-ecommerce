"""Payment gateway service layer.

Abstracts a clean `PaymentGateway` interface so the platform can run against the
built-in simulated gateway today and swap in Stripe (test or live) purely via env
config — the checkout/order code never changes.
"""
import os
import uuid
from dataclasses import dataclass

from apps.core.models import OrderStatus, PaymentStatus
from apps.payments.models import Payment


@dataclass
class GatewayResult:
    approved: bool
    transaction_id: str
    message: str
    raw: dict


class BaseGateway:
    name = "base"

    def create_payment_intent(self, amount, order_number, **kwargs) -> dict:
        raise NotImplementedError

    def confirm(self, payment_intent_id, **kwargs) -> GatewayResult:
        raise NotImplementedError


class MockGateway(BaseGateway):
    """Simulated gateway: '4242 4242 4242 4242' always approves; else declines."""

    name = "mock"
    MAGIC_GOOD = "4242424242424242"

    def create_payment_intent(self, amount, order_number, **kwargs):
        return {"payment_intent_id": f"pi_mock_{uuid.uuid4().hex[:18]}", "client_secret": f"cs_{uuid.uuid4().hex[:18]}", "gateway": self.name}

    def confirm(self, payment_intent_id, card_number="", **kwargs):
        card = str(card_number).replace(" ", "")
        ok = card == self.MAGIC_GOOD
        return GatewayResult(
            approved=ok,
            transaction_id=f"tx_mock_{uuid.uuid4().hex[:16]}" if ok else "",
            message="Payment approved" if ok else "Card was declined by issuer",
            raw={"intent": payment_intent_id, "card_last4": card[-4:] if card else ""},
        )


class StripeGateway(BaseGateway):
    """Real Stripe integration — only active when STRIPE_SECRET_KEY is set."""

    name = "stripe"

    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY", "")
        self._stripe = None
        if self.api_key:
            try:
                import stripe as _stripe

                _stripe.api_key = self.api_key
                self._stripe = _stripe
            except ImportError:
                self._stripe = None

    @property
    def available(self):
        return self._stripe is not None

    def create_payment_intent(self, amount, order_number, **kwargs):
        if not self.available:
            raise RuntimeError("Stripe is not configured (STRIPE_SECRET_KEY missing)")
        intent = self._stripe.PaymentIntent.create(amount=int(round(float(amount) * 100)), currency="inr", metadata={"order": order_number})
        return {"payment_intent_id": intent.id, "client_secret": intent.client_secret, "gateway": self.name}

    def confirm(self, payment_intent_id, **kwargs):
        if not self.available:
            raise RuntimeError("Stripe is not configured")
        intent = self._stripe.PaymentIntent.retrieve(payment_intent_id)
        if intent.status == "succeeded":
            return GatewayResult(approved=True, transaction_id=intent.id, message="Payment approved", raw={"status": intent.status})
        return GatewayResult(approved=False, transaction_id=intent.id, message=f"Payment {intent.status}", raw={"status": intent.status})


def get_gateway(name="mock"):
    if name == "stripe":
        gw = StripeGateway()
        if gw.available:
            return gw
        raise RuntimeError("Stripe not available — install stripe + set STRIPE_SECRET_KEY")
    return MockGateway()


class PaymentError(Exception):
    pass


def initiate_payment(order, method="card", gateway="mock", **extra):
    """Create the PaymentIntent record for an order."""
    if getattr(order, "payment", None):
        raise PaymentError("Payment already initiated for this order")
    gw = get_gateway(gateway)
    intent = gw.create_payment_intent(order.total, order.order_number, **extra)
    payment = Payment.objects.create(
        order=order,
        method=method,
        gateway=gateway,
        status=PaymentStatus.PROCESSING,
        amount=order.total,
        transaction_id=intent.get("payment_intent_id", ""),
        provider_response={"client_secret": intent.get("client_secret", ""), "gateway": gateway},
    )
    return payment, intent


def confirm_payment(order, card_number="", otp="", gateway="mock"):
    """Confirm the authorized payment and advance the order to PAYMENT_CONFIRMED."""
    payment = getattr(order, "payment", None)
    if not payment:
        raise PaymentError("No payment to confirm — initiate first")
    gw = get_gateway(gateway)
    result = gw.confirm(payment.transaction_id or payment.provider_response.get("payment_intent_id", ""), card_number=card_number, otp=otp)

    if result.approved:
        payment.status = PaymentStatus.SUCCEEDED
        payment.transaction_id = result.transaction_id
        payment.provider_response["approval"] = result.raw
        payment.save(update_fields=["status", "transaction_id", "provider_response", "updated_at"])
        if order.status == OrderStatus.PENDING:
            from apps.orders.services import set_order_status

            set_order_status(order, OrderStatus.PAYMENT_CONFIRMED, note=f"Payment received ({gateway})")
        return payment, result

    payment.status = PaymentStatus.FAILED
    payment.provider_response["failure"] = result.raw
    payment.save(update_fields=["status", "provider_response", "updated_at"])
    raise PaymentError(result.message)


def refund_payment(order, gateway="mock"):
    from apps.orders.services import set_order_status

    payment = getattr(order, "payment", None)
    if not payment or payment.status != PaymentStatus.SUCCEEDED:
        raise PaymentError("Nothing to refund")
    payment.status = PaymentStatus.REFUNDED
    payment.save(update_fields=["status"])
    set_order_status(order, OrderStatus.REFUNDED, note=f"Refunded ({gateway})")
    return payment