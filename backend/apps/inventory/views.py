"""Inventory API views: product CRUD (staff), low-stock alerts, restocking, reports."""
from django.db import IntegrityError, transaction
from django.db.models import F, Sum
from django.template.defaultfilters import slugify
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter

from apps.catalog.models import Product
from apps.catalog.serializers import ProductListSerializer
from apps.inventory.serializers import AdminProductSerializer


def _unique_slug(title: str) -> str:
    base = slugify(title) or "product"
    slug, n = base, 2
    while Product.objects.filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class ProductAdminListCreateView(generics.ListCreateAPIView):
    """Staff product manager: paginated list + create."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminProductSerializer
    filter_backends = [SearchFilter]
    search_fields = ["title", "brand__name", "category__name"]

    def get_queryset(self):
        qs = Product.objects.select_related("brand", "category").order_by("-created_at")
        stock = self.request.query_params.get("stock")
        if stock == "low":
            qs = qs.filter(stock__lte=10)
        elif stock == "out":
            qs = qs.filter(stock=0)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        title = serializer.validated_data.get("title", "")
        try:
            with transaction.atomic():
                serializer.save(slug=_unique_slug(title))
        except IntegrityError:
            return Response({"detail": "Could not save product (duplicate slug)."}, status=400)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ProductAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Staff edit/delete a product (price, stock, flags, fields)."""

    permission_classes = [IsAdminUser]
    serializer_class = AdminProductSerializer
    queryset = Product.objects.select_related("brand", "category")


class LowStockReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Product.objects.filter(active=True, stock__lte=10).select_related("brand", "category").order_by("stock")
        return Response(ProductListSerializer(qs, many=True).data)


class RestockView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        product = Product.objects.get(pk=request.data.get("product_id"))
        qty = int(request.data.get("quantity", 0))
        if qty <= 0:
            return Response({"detail": "quantity must be positive"}, status=400)
        Product.objects.filter(pk=product.pk).update(stock=F("stock") + qty)
        product.refresh_from_db()
        return Response({"product_id": product.id, "stock": product.stock})


class InventoryReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        products = Product.objects.filter(active=True)
        report = {
            "total_products": Product.objects.count(),
            "out_of_stock": products.filter(stock=0).count(),
            "low_stock": products.filter(stock__gt=0, stock__lte=10).count(),
            "total_units_in_stock": products.aggregate(total=Sum("stock"))["total"] or 0,
            "top_sellers": list(
                products.order_by("-sold_count")[:5].values("id", "title", "sold_count", "stock")
            ),
        }
        return Response(report)
