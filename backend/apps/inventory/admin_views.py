"""Staff-only management API: analytics, orders, customers, coupons, catalog admin."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, DecimalField, F, Max, Q, Sum
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Brand, Category
from apps.catalog.serializers import BrandSerializer, CategorySerializer
from apps.core.models import OrderStatus
from apps.inventory.serializers import (
    AdminCustomerSerializer,
    AdminOrderDetailSerializer,
    AdminOrderSerializer,
    CouponSerializer,
)
from apps.orders.models import Coupon, Order

FULFILLED = [
    OrderStatus.PAYMENT_CONFIRMED,
    OrderStatus.PACKED,
    OrderStatus.SHIPPED,
    OrderStatus.IN_TRANSIT,
    OrderStatus.DELIVERED,
]
DONE = [OrderStatus.DELIVERED, OrderStatus.CANCELLED]


class AdminAnalyticsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        day = timedelta(days=1)
        start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=30)

        fulfilled = Q(status__in=FULFILLED)
        active_orders = ~Q(status="failed") & ~Q(status=OrderStatus.CANCELLED)

        # --- daily series (last 30 days, zero-filled) ---
        rows = {
            row["day"]: row
            for row in Order.objects.filter(placed_at__gte=start)
            .annotate(day=TruncDate("placed_at"))
            .values("day")
            .annotate(
                revenue=Coalesce(Sum("total", filter=fulfilled), 0, output_field=DecimalField()),
                orders=Count("id", filter=active_orders),
            )
        }
        series, d = [], start.date()
        while d <= now.date():
            r = rows.get(d)
            series.append({"day": d.isoformat(), "revenue": float(r["revenue"]) if r else 0.0, "orders": r["orders"] if r else 0})
            d += day

        # --- aggregates & previous-period deltas ---
        scope = Q(placed_at__gte=start)
        prev = Q(placed_at__gte=prev_start, placed_at__lt=start)

        kpi_cur = Order.objects.filter(scope).aggregate(
            revenue=Coalesce(Sum("total", filter=scope & fulfilled), 0, output_field=DecimalField()),
            orders=Count("id", filter=scope & active_orders),
        )
        kpi_prev = Order.objects.filter(placed_at__lt=now).aggregate(
            revenue=Coalesce(Sum("total", filter=prev & fulfilled), 0, output_field=DecimalField()),
            orders=Count("id", filter=prev & active_orders),
        )
        customers = get_user_model().objects.filter(is_staff=False)
        customers_cur = customers.filter(date_joined__gte=start).count()
        customers_prev = customers.filter(date_joined__gte=prev_start, date_joined__lt=start).count()

        def delta(cur, prev_val):
            if not prev_val:
                return 100.0 if cur else 0.0
            return round(((cur - prev_val) / prev_val) * 100, 1)

        products = OrderItemQuery()

        orders_by_status = [
            {"status": s, "count": c}
            for s, c in Order.objects.values_list("status").annotate(c=Count("id")).order_by("-c")
        ]

        revenue_by_category = list(
            OrderItemQuery.revenue_by_category(FULFILLED).values("name", "total")
        )

        top_customers = [
            {"id": r["user__id"], "username": r["user__username"], "email": r["user__email"],
             "spent": float(r["spent"] or 0), "orders": r["orders"]}
            for r in Order.objects.filter(fulfilled, placed_at__gte=start)
            .values("user__id", "user__username", "user__email")
            .annotate(spent=Sum("total"), orders=Count("id"))
            .order_by("-spent")[:5]
        ]

        recent = Order.objects.select_related("user").prefetch_related("items").filter(active_orders).order_by("-placed_at")[:8]

        return Response(
            {
                "kpis": {
                    "revenue": {"value": float(kpi_cur["revenue"]), "delta": delta(float(kpi_cur["revenue"]), float(kpi_prev["revenue"]))},
                    "orders": {"value": kpi_cur["orders"], "delta": delta(kpi_cur["orders"], kpi_prev["orders"])},
                    "customers": {"value": customers_cur, "delta": delta(customers_cur, customers_prev)},
                    "products": products.count(),
                    "low_stock": products.low_stock(),
                    "out_of_stock": products.out_of_stock(),
                },
                "series": series,
                "orders_by_status": orders_by_status,
                "revenue_by_category": revenue_by_category,
                "top_customers": top_customers,
                "recent_orders": AdminOrderSerializer(recent, many=True).data,
                "top_sellers": products.top_sellers(),
            }
        )


class OrderItemQuery:
    """Helpers on the OrderItem/Product aggregate surface used by analytics."""

    @staticmethod
    def revenue_by_category(statuses):
        from apps.orders.models import OrderItem

        return (
            OrderItem.objects.filter(order__status__in=statuses)
            .values(name=F("product__category__name"))
            .annotate(total=Sum(F("unit_price") * F("quantity"), output_field=DecimalField()))
            .order_by("-total")[:8]
        )

    @staticmethod
    def top_sellers(limit=5):
        from apps.catalog.models import Product

        return list(Product.objects.order_by("-sold_count")[:limit].values("id", "title", "sold_count", "stock"))

    @staticmethod
    def low_stock():
        from apps.catalog.models import Product

        return Product.objects.filter(active=True, stock__lte=10).count()

    @staticmethod
    def out_of_stock():
        from apps.catalog.models import Product

        return Product.objects.filter(active=True, stock=0).count()

    @staticmethod
    def count():
        from apps.catalog.models import Product

        return Product.objects.count()


class AdminOrderListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminOrderSerializer
    filter_backends = [SearchFilter]
    search_fields = ["order_number", "user__username", "user__email", "city"]

    def get_queryset(self):
        qs = (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .order_by("-placed_at")
        )
        s = self.request.query_params.get("status")
        if s:
            qs = qs.filter(status=s)
        return qs


class AdminOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminOrderDetailSerializer
    queryset = Order.objects.select_related("user").prefetch_related("items", "status_history")


class AdminOrderStatusView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        order = Order.objects.filter(pk=pk).first()
        if not order:
            return Response({"detail": "Order not found"}, status=404)
        target = (request.data.get("status") or "").strip().lower()

        if target == OrderStatus.CANCELLED:
            from apps.orders.services import cancel_order

            try:
                cancel_order(order)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=400)
            return Response(AdminOrderDetailSerializer(order).data)

        flow = list(OrderStatus.flow())
        if order.status in DONE:
            return Response({"detail": f"Order is {order.get_status_display()}; no further transitions."}, status=400)
        if target not in flow:
            return Response({"detail": f"Invalid status '{target}'."}, status=400)
        if flow.index(target) <= flow.index(order.status):
            return Response({"detail": "Status cannot move backwards."}, status=400)

        from apps.orders.services import set_order_status

        set_order_status(order, target, note="Updated by store admin")
        return Response(AdminOrderDetailSerializer(order).data)


class AdminCustomerListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = AdminCustomerSerializer
    filter_backends = [SearchFilter]
    search_fields = ["username", "email", "first_name", "last_name"]

    def get_queryset(self):
        return (
            get_user_model()
            .objects.filter(is_staff=False)
            .annotate(
                order_count=Count("orders"),
                total_spent=Coalesce(
                    Sum("orders__total", filter=Q(orders__status__in=FULFILLED)),
                    0,
                    output_field=DecimalField(),
                ),
                last_order_at=Max("orders__placed_at"),
            )
            .order_by("-total_spent")
        )


class CouponListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all().order_by("-created_at")


class CouponDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


class AdminCategoryListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CategorySerializer
    queryset = Category.objects.annotate(product_count=Count("products")).order_by("name")


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CategorySerializer
    queryset = Category.objects.annotate(product_count=Count("products"))


class AdminBrandListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BrandSerializer
    queryset = Brand.objects.annotate(product_count=Count("products")).order_by("name")


class AdminBrandDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = BrandSerializer
    queryset = Brand.objects.annotate(product_count=Count("products"))