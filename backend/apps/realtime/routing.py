"""WebSocket routing for the platform."""
from django.urls import path

from apps.realtime.consumers import NotificationConsumer, OrderTrackingConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/orders/<int:order_id>/", OrderTrackingConsumer.as_asgi()),
]