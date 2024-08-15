"""WebSocket consumers: real-time order tracking + notifications."""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from apps.orders.models import Order


def _group_for_order(order_id):
    return f"order_{order_id}"


class OrderTrackingConsumer(AsyncJsonWebsocketConsumer):
    """Streams order status changes to the authenticated owner of the order."""

    async def connect(self):
        self.order_id = self.scope["url_route"]["kwargs"]["order_id"]
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return
        order = await self._get_order(self.order_id, user.id)
        if order is None:
            await self.close(code=4404)
            return
        self.group_name = _group_for_order(self.order_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json({"type": "ORDER_STATUS", "status": order.status, "status_label": order.get_status_display()})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def order_status_update(self, event):
        await self.send_json(
            {"type": "ORDER_STATUS", "order_id": event["order_id"], "status": event["status"], "status_label": event["status_label"]}
        )

    @database_sync_to_async
    def _get_order(self, order_id, user_id):
        return Order.objects.filter(id=order_id, user_id=user_id).first()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4401)
            return
        self.group_name = f"user_{user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notify(self, event):
        await self.send_json(event)


def push_order_status(order):
    """Broadcast an order-status change to its tracking group."""
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    async_to_sync(get_channel_layer().group_send)(
        _group_for_order(order.id),
        {
            "type": "order_status_update",
            "order_id": order.id,
            "status": order.status,
            "status_label": order.get_status_display(),
        },
    )


def push_notification(user_id, message, **extra):
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    async_to_sync(get_channel_layer().group_send)(
        f"user_{user_id}",
        {"type": "notify", "message": message, **extra},
    )