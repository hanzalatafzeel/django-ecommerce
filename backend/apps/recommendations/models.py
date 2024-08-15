"""Recommendation domain: co-purchase affinity data."""
from django.db import models


class CoPurchaseFrequency(models.Model):
    """Normalized undirected pair (a < b) counting how often two products were bought together."""

    product_a = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="copurchase_a")
    product_b = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="copurchase_b")
    count = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = [("product_a", "product_b")]
        ordering = ["-count"]

    def __str__(self):
        return f"{self.product_a.title} <-> {self.product_b.title} ({self.count})"