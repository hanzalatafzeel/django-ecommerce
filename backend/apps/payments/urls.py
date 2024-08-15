from django.urls import path

from apps.payments.views import (
    PaymentConfirmView,
    PaymentInitiateView,
    PaymentMethodListView,
    StripeWebhookView,
)

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-methods"),
    path("orders/<int:pk>/initiate/", PaymentInitiateView.as_view(), name="payment-initiate"),
    path("orders/<int:pk>/confirm/", PaymentConfirmView.as_view(), name="payment-confirm"),
    path("webhook/stripe/", StripeWebhookView.as_view(), name="payment-webhook-stripe"),
]