"""Advance one order through the live status flow (demo of real-time order tracking)."""
import random

from apps.core.models import OrderStatus
from apps.orders.models import Order
from apps.orders.services import set_order_status
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Move orders forward one step in the status flow (also pushes a live WebSocket update)."

    def add_arguments(self, parser):
        parser.add_argument("--order", type=int, help="Advance a specific order by id (deterministic).")
        parser.add_argument(
            "--step",
            type=str,
            choices=list(OrderStatus.flow()),
            help="Force the order to this exact status instead of the next step.",
        )

    def handle(self, *args, **options):
        flow = OrderStatus.flow()

        if options["order"]:
            order = Order.objects.get(pk=options["order"])
            from_status = order.status
            idx = flow.index(order.status)
            next_step = flow[idx + 1] if idx < len(flow) - 1 else order.status
            target = options["step"] or next_step
            set_order_status(order, target, note=f"Advanced by simulator → {order.get_status_display()}")
            self.stdout.write(self.style.SUCCESS(f"{order.order_number}: {from_status} → {target}"))
            return

        candidates = list(
            Order.objects.filter(
                status__in=[OrderStatus.PENDING, OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT]
            )
        )
        moved = 0
        for order in random.sample(candidates, k=min(len(candidates), 3)):
            idx = flow.index(order.status)
            if idx < len(flow) - 1:
                next_status = flow[idx + 1]
                set_order_status(order, next_status, note=f"Advanced by simulator → {order.get_status_display()}")
                self.stdout.write(self.style.SUCCESS(f"{order.order_number}: {order.status} → {next_status}"))
                moved += 1
        self.stdout.write(f"Moved {moved} order(s).")