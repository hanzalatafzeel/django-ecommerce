from django.urls import path

from apps.recommendations.views import (
    ForYouView,
    FrequentlyBoughtView,
    RelatedProductsView,
    TrendingView,
)

urlpatterns = [
    path("for-you/", ForYouView.as_view(), name="rec-for-you"),
    path("trending/", TrendingView.as_view(), name="rec-trending"),
    path("related/<int:pk>/", RelatedProductsView.as_view(), name="rec-related"),
    path("frequently-bought/<int:pk>/", FrequentlyBoughtView.as_view(), name="rec-frequently-bought"),
]