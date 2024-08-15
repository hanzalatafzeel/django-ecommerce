"""Catalog serializers."""
from rest_framework import serializers

from apps.catalog.models import Brand, Category, Product, Review, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class BrandSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "product_count"]


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "product_count", "children"]

    def get_children(self, obj):
        children = obj.children.all()
        if children:
            return CategorySerializer(children, many=True).data
        return []


class ProductListSerializer(serializers.ModelSerializer):
    brand = serializers.StringRelatedField()
    category = serializers.StringRelatedField()
    tags = TagSerializer(many=True, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "title",
            "slug",
            "brand",
            "category",
            "price",
            "mrp",
            "discount_percent",
            "rating",
            "rating_count",
            "stock",
            "in_stock",
            "image",
            "featured",
            "tags",
        ]


class ProductDetailSerializer(ProductListSerializer):
    reviews_count = serializers.IntegerField(read_only=True)
    related_ids = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["description", "reviews_count", "related_ids"]

    def get_related_ids(self, obj):
        return list(
            obj.category.products.filter(active=True)
            .exclude(id=obj.id)
            .values_list("id", flat=True)[:4]
        )


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)
    rating = serializers.ChoiceField(choices=[(i, i) for i in range(1, 6)])

    class Meta:
        model = Review
        fields = ["id", "product", "user", "rating", "comment", "created_at"]
        read_only_fields = ["user"]

    def validate(self, attrs):
        attrs["user"] = self.context["request"].user
        attrs["product"] = self.context["product"]
        return attrs