"""Recommendation API views."""
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.serializers import ProductListSerializer
from apps.recommendations import services


class _ProductIdMixin:
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        products = self.get_products(pk)
        return Response([ProductListSerializer(p).data for p in products])


class RelatedProductsView(_ProductIdMixin, APIView):
    def get_products(self, pk):
        return services.related_products(pk)


class FrequentlyBoughtView(_ProductIdMixin, APIView):
    def get_products(self, pk):
        return services.frequently_bought_together(pk)


class ForYouView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            products = services.recommended_for_user(request.user)
        else:
            products = list(services.trending_products(8))
        return Response([ProductListSerializer(p).data for p in products])


class TrendingView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = None

    def get_queryset(self):
        return services.trending_products(10)