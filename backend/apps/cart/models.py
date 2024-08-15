"""Cart domain."""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Cart(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart")

    @property
    def subtotal(self):
        return sum(i.subtotal for i in self.items.all())

    @property
    def count(self):
        return sum(i.quantity for i in self.items.all())

    def __str__(self):
        return f"Cart({self.user.username})"


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = [("cart", "product")]

    @property
    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.quantity}x {self.product.title}"