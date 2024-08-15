from django.urls import path

from apps.catalog.views import (
    BrandListView,
    CategoryListView,
    ProductDetailView,
    ProductListView,
    ReviewListCreateView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("products/<int:pk>/reviews/", ReviewListCreateView.as_view(), name="review-list-create"),
]