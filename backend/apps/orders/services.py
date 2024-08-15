"""Order domain services: checkout, stock reservation, status transitions."""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.cart.models import Cart
from apps.core.models import OrderStatus
from apps.orders.models import Coupon, Order, OrderItem, OrderStatusHistory

SHIPPING_FLAT = Decimal("49.0")
TAX_RATE = Decimal("0.18")


def _apply_coupon(order, coupon):
    order.coupon = coupon
    order.coupon_code = coupon.code
    order.discount = Decimal(coupon.discount_for(order.subtotal)).quantize(Decimal("0.01"))
    coupon.used_count += 1
    coupon.save(update_fields=["used_count"])


@transaction.atomic
def checkout_from_cart(user, address, coupon_code=None, shipping_override=None):
    """Create an order from the user's cart, reserving stock atomically."""
    from apps.cart.models import CartItem

    cart, _ = Cart.objects.get_or_create(user=user)
    cart_items = list(CartItem.objects.select_for_update().select_related("product").filter(cart=cart).select_related("product"))
    if not cart_items:
        raise ValueError("Cart is empty")

    for ci in cart_items:
        if ci.product.stock < ci.quantity:
            raise ValueError(f"Not enough stock for '{ci.quantity}x {ci.product.title}' (in stock: {ci.product.stock})")
        from django.db.models import F

        ci.product.stock = F("stock") - ci.quantity
        ci.product.sold_count = F("sold_count") + ci.quantity
        ci.product.save(update_fields=["stock", "sold_count", "updated_at"])

    subtotal = sum((ci.quantity * ci.product.price for ci in cart_items), Decimal("0.0"))
    order = Order.objects.create(
        user=user,
        address_label=address.label,
        address_line1=address.line1,
        address_line2=address.line2,
        city=address.city,
        state=address.state,
        pincode=address.pincode,
        country=address.country,
        subtotal=subtotal,
        shipping=shipping_override or SHIPPING_FLAT,
    )

    for ci in cart_items:
        OrderItem.objects.create(
            order=order,
            product=ci.product,
            product_title=ci.product.title,
            product_image=ci.product.image,
            unit_price=ci.product.price,
            quantity=ci.quantity,
        )

    if coupon_code:
        coupon = Coupon.objects.filter(code__iexact=coupon_code).first()
        if coupon and coupon.usable(subtotal):
            _apply_coupon(order, coupon)

    taxable = order.subtotal - order.discount
    order.tax = (taxable * TAX_RATE).quantize(Decimal("0.01"))
    order.total = (taxable + order.tax + order.shipping).quantize(Decimal("0.01"))
    order.save(update_fields=["shipping", "tax", "total", "discount", "coupon", "coupon_code"])

    # Record the initial status event + sim order history data
    OrderStatusHistory.objects.create(order=order, status=order.status, note="Order placed")

    from apps.recommendations.services import record_purchase

    record_purchase(user, cart_items)

    cart.items.all().delete()
    return order


def set_order_status(order, new_status, note=""):
    """Transition an order's status, persisting history and broadcasting live."""
    if order.status == new_status:
        return
    order.status = new_status
    if new_status == OrderStatus.DELIVERED:
        order.delivered_at = timezone.now()
        order.save(update_fields=["status", "delivered_at", "updated_at"])
    else:
        order.save(update_fields=["status", "updated_at"])
    OrderStatusHistory.objects.create(order=order, status=new_status, note=note)
    from apps.realtime.consumers import push_notification, push_order_status

    push_order_status(order)
    push_notification(order.user_id, f"Order {order.order_number} is now {order.get_status_display()}")


def cancel_order(order):
    if order.status in (OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED):
        raise ValueError("Cannot cancel an order already shipped")
    for item in order.items.all():
        if item.product:
            from django.db.models import F

            item.product.stock = F("stock") + item.quantity
            item.product.save(update_fields=["stock", "updated_at"])
    set_order_status(order, OrderStatus.CANCELLED, note="Cancelled by customer; stock restored")