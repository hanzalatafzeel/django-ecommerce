"""Shared base model mixins and utility enums for the platform."""
from django.db import models

from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class OrderStatus(models.TextChoices):
    """Lifecycle of an order, streamed live over WebSockets."""

    PENDING = "pending", "Pending"
    PAYMENT_CONFIRMED = "payment_confirmed", "Payment Confirmed"
    PACKED = "packed", "Packed"
    SHIPPED = "shipped", "Shipped"
    IN_TRANSIT = "in_transit", "In Transit"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"

    @classmethod
    def flow(cls):
        return [cls.PENDING, cls.PAYMENT_CONFIRMED, cls.PACKED, cls.SHIPPED, cls.IN_TRANSIT, cls.DELIVERED]


class PaymentStatus(models.TextChoices):
    INITIATED = "initiated", "Initiated"
    PROCESSING = "processing", "Processing"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


def now():
    return timezone.now()