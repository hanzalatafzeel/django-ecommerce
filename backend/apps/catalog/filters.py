"""Product filters: category, brand, price range, rating, stock, tag."""
import django_filters

from apps.catalog.models import Product, Review


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")
    brand = django_filters.CharFilter(field_name="brand__slug")
    tag = django_filters.CharFilter(field_name="tags__name")
    price_min = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    rating_min = django_filters.NumberFilter(field_name="rating", lookup_expr="gte")
    in_stock = django_filters.BooleanFilter(method="filter_stock")
    featured = django_filters.BooleanFilter(field_name="featured")

    ordering = django_filters.OrderingFilter(
        fields=(
            ("price", "price"),
            ("-price", "price_desc"),
            ("-price", "-price"),
            ("-rating", "rating"),
            ("-rating", "-rating"),
            ("-discount_pct", "bestdeals"),
            ("-created_at", "newest"),
            ("-sold_count", "bestselling"),
        )
    )

    class Meta:
        model = Product
        fields = []

    def filter_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset


class ReviewFilter(django_filters.FilterSet):
    class Meta:
        model = Review
        fields = ["product"]