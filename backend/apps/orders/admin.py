from django.contrib import admin

from apps.orders.models import Coupon, Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product_title", "unit_price", "quantity"]


class StatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ["status", "note", "created_at"]
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["order_number", "user", "status", "total", "placed_at"]
    list_filter = ["status", "placed_at"]
    search_fields = ["order_number", "user__username"]
    inlines = [OrderItemInline, StatusHistoryInline]
    readonly_fields = ["order_number", "subtotal", "discount", "shipping", "tax", "total", "placed_at"]
    actions = []


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ["code", "discount_percent", "discount_amount", "min_order_value", "active", "used_count", "valid_until"]
    search_fields = ["code"]


admin.site.register(OrderStatusHistory)