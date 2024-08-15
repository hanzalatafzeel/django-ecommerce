"""Catalog API views with Redis-backed caching."""
from django.db import models
from django.db.models import Avg, Count, F, Case, Q, When
from rest_framework import generics
from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.response import Response

from apps.catalog.filters import ProductFilter
from apps.catalog.models import Brand, Category, Product, Review
from apps.catalog.serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    ReviewSerializer,
)
from apps.catalog.services import cache_key, get_or_cache, invalidate_product
from apps.core.api import StandardResultsSetPagination


class ReadOrAuthenticatedWrite(BasePermission):
    """Public read access; only authenticated users may write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)


ACTIVE_PRODUCTS = Q(products__active=True)


class CategoryListView(generics.ListAPIView):
    permission_classes = []
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Category.objects.filter(parent__isnull=True)
            .annotate(product_count=Count("products", filter=ACTIVE_PRODUCTS, distinct=True))
            .order_by("name")
        )


class BrandListView(generics.ListAPIView):
    permission_classes = []
    serializer_class = BrandSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            Brand.objects.annotate(product_count=Count("products", filter=ACTIVE_PRODUCTS, distinct=True))
            .order_by("name")
        )


class ProductListView(generics.ListAPIView):
    """Paginated product list with search / filter / sort, cached in Redis."""

    permission_classes = []
    serializer_class = ProductListSerializer
    pagination_class = StandardResultsSetPagination
    search_fields = ["title", "description", "brand__name", "category__name", "tags__name"]

    def get_queryset(self):
        qs = Product.objects.select_related("brand", "category").prefetch_related("tags").filter(active=True)
        qs = qs.annotate(
            discount_pct=Case(
                When(mrp__gt=F("price"), then=(F("mrp") - F("price")) * 100 / F("mrp")),
                default=0,
                output_field=models.IntegerField(),
            )
        )
        return ProductFilter(self.request.query_params, queryset=qs).qs

    def _build_payload(self):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(ProductListSerializer(page, many=True).data).data

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return Response(self._build_payload())
        key = cache_key("product-list", request.get_full_path())
        data, _ = get_or_cache(key, self._build_payload, timeout=900)
        return Response(data)


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = []
    serializer_class = ProductDetailSerializer
    queryset = Product.objects.select_related("brand", "category").prefetch_related("tags")

    def get(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super().get(request, *args, **kwargs)
        key = cache_key("product", kwargs["pk"])
        data, _ = get_or_cache(key, lambda: ProductDetailSerializer(self.get_object()).data, timeout=900)
        return Response(data)


class ReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [ReadOrAuthenticatedWrite]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.select_related("user").filter(product_id=self.kwargs["pk"]).order_by("-created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["product"] = Product.objects.get(pk=self.kwargs["pk"])
        return ctx

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        product = Product.objects.get(pk=self.kwargs["pk"])
        agg = Review.objects.filter(product=product).aggregate(avg=Avg("rating"))
        product.rating = round(agg["avg"] or 0, 2)
        product.rating_count = Review.objects.filter(product=product).count()
        product.save(update_fields=["rating", "rating_count", "updated_at"])
        invalidate_product(product.id)