"""Aggregates all v1 API routes across platform apps."""

from django.urls import include, path

urlpatterns = [
    path("accounts/", include("apps.accounts.urls")),
    path("catalog/", include("apps.catalog.urls")),
    path("cart/", include("apps.cart.urls")),
    path("orders/", include("apps.orders.urls")),
    path("payments/", include("apps.payments.urls")),
    path("inventory/", include("apps.inventory.urls")),
    path("recommendations/", include("apps.recommendations.urls")),
    path("dashboard/", include("apps.core.urls")),
]