"""Anonymous dashboard stats for admins & the storefront hero."""
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class DashboardStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        from apps.catalog.models import Category, Product
        from apps.orders.models import Order

        return Response(
            {
                "products": Product.objects.count(),
                "categories": Category.objects.count(),
                "orders": Order.objects.count(),
                "customers": get_user_model().objects.filter(is_staff=False).count(),
                "revenue": Order.objects.filter(status__in=["delivered", "in_transit", "shipped", "packed", "payment_confirmed"]).aggregate(
                    total=Sum("total")
                )["total"]
                or 0,
                "low_stock": Product.objects.filter(stock__lte=10).count(),
            }
        )