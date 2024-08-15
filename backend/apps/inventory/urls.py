from django.urls import path

from apps.inventory.admin_views import (
    AdminAnalyticsView,
    AdminBrandDetailView,
    AdminBrandListCreateView,
    AdminCategoryDetailView,
    AdminCategoryListCreateView,
    AdminCustomerListView,
    AdminOrderDetailView,
    AdminOrderListView,
    AdminOrderStatusView,
    CouponDetailView,
    CouponListCreateView,
)
from apps.inventory.views import (
    InventoryReportView,
    LowStockReportView,
    ProductAdminDetailView,
    ProductAdminListCreateView,
    RestockView,
)

urlpatterns = [
    path("low-stock/", LowStockReportView.as_view(), name="inventory-low-stock"),
    path("restock/", RestockView.as_view(), name="inventory-restock"),
    path("report/", InventoryReportView.as_view(), name="inventory-report"),
    path("products/", ProductAdminListCreateView.as_view(), name="inventory-products"),
    path("products/<int:pk>/", ProductAdminDetailView.as_view(), name="inventory-product-detail"),
    # Staff management API
    path("admin/analytics/", AdminAnalyticsView.as_view(), name="admin-analytics"),
    path("admin/orders/", AdminOrderListView.as_view(), name="admin-orders"),
    path("admin/orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("admin/orders/<int:pk>/status/", AdminOrderStatusView.as_view(), name="admin-order-status"),
    path("admin/customers/", AdminCustomerListView.as_view(), name="admin-customers"),
    path("admin/coupons/", CouponListCreateView.as_view(), name="admin-coupons"),
    path("admin/coupons/<int:pk>/", CouponDetailView.as_view(), name="admin-coupon-detail"),
    path("admin/categories/", AdminCategoryListCreateView.as_view(), name="admin-categories"),
    path("admin/categories/<int:pk>/", AdminCategoryDetailView.as_view(), name="admin-category-detail"),
    path("admin/brands/", AdminBrandListCreateView.as_view(), name="admin-brands"),
    path("admin/brands/<int:pk>/", AdminBrandDetailView.as_view(), name="admin-brand-detail"),
]