"""Payments domain."""
from django.db import models

from apps.core.models import PaymentStatus, TimeStampedModel


class GatewayChoices(models.TextChoices):
    MOCK = "mock", "Mock (simulated)"
    STRIPE = "stripe", "Stripe"


class Payment(TimeStampedModel):
    order = models.OneToOneField("orders.Order", on_delete=models.CASCADE, related_name="payment")
    method = models.CharField(max_length=40, default="card")
    gateway = models.CharField(max_length=20, choices=GatewayChoices.choices, default=GatewayChoices.MOCK)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.INITIATED)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_id = models.CharField(max_length=120, blank=True)
    provider_response = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.transaction_id or self.id} ({self.status})"