"""Orders domain: orders, order items, status history, coupons."""
import random
import string

from django.conf import settings
from django.db import models

from apps.core.models import OrderStatus, TimeStampedModel


def generate_order_number():
    return "ECOM-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Coupon(TimeStampedModel):
    code = models.CharField(max_length=40, unique=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="% off")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="flat amount off")
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_until = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    max_redemptions = models.PositiveIntegerField(default=1000)
    used_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.code

    def discount_for(self, subtotal):
        value = float(subtotal)
        if self.discount_amount and float(self.discount_amount) > 0:
            return min(float(self.discount_amount), value)
        return min(value * float(self.discount_percent) / 100.0, value)

    def usable(self, subtotal=0):
        from django.utils import timezone

        if not self.active:
            return False
        if float(subtotal) < float(self.min_order_value):
            return False
        if self.valid_until:
            if self.valid_until.tzinfo is None:
                self.valid_until = self.valid_until.replace(tzinfo=timezone.get_current_timezone())
            if self.valid_until < timezone.now():
                return False
        return self.used_count < self.max_redemptions


class Order(TimeStampedModel):
    STATUS = OrderStatus

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    order_number = models.CharField(max_length=20, unique=True, default=generate_order_number)
    status = models.CharField(max_length=24, choices=OrderStatus.choices, default=OrderStatus.PENDING)

    # Shipping snapshot
    address_label = models.CharField(max_length=60, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    pincode = models.CharField(max_length=12, blank=True)
    country = models.CharField(max_length=60, default="India")

    # Amounts
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    coupon = models.ForeignKey(Coupon, null=True, blank=True, on_delete=models.SET_NULL)
    coupon_code = models.CharField(max_length=40, blank=True)

    placed_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-placed_at"]

    def __str__(self):
        return self.order_number

    @property
    def track(self):
        return list(OrderStatus.flow())


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.SET_NULL, null=True, related_name="order_items")
    product_title = models.CharField(max_length=200)
    product_image = models.CharField(max_length=300, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.quantity}x {self.product_title}"


class OrderStatusHistory(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=24, choices=OrderStatus.choices)
    note = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order.order_number}: {self.status}"