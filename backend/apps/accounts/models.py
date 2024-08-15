"""Accounts domain: profiles and shipping addresses."""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Profile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    avatar_url = models.CharField(max_length=300, blank=True)
    newsletter = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username


class Address(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="addresses")
    label = models.CharField(max_length=60, default="Home")
    line1 = models.CharField(max_length=200)
    line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=120)
    state = models.CharField(max_length=120)
    pincode = models.CharField(max_length=12)
    country = models.CharField(max_length=60, default="India")
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_default", "-updated_at"]

    def __str__(self):
        return f"{self.label}: {self.line1}, {self.city}"