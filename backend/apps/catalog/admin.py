from django.contrib import admin

from apps.catalog.models import Brand, Category, Product, Review, Tag


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ["name"]


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["title", "brand", "category", "price", "mrp", "stock", "sold_count", "rating", "active", "featured"]
    list_filter = ["active", "featured", "brand", "category"]
    search_fields = ["title", "brand__name"]
    prepopulated_fields = {"slug": ("title",)}
    list_editable = ["stock", "price", "active", "featured"]
    readonly_fields = ["rating", "rating_count"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["product", "user", "rating", "created_at"]
    list_filter = ["rating"]


admin.site.register(Tag)