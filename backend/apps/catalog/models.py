"""Catalog domain: brands, categories, products, reviews, tags."""
from django.db import models
from django.template.defaultfilters import slugify
from django.urls import reverse

from apps.core.models import TimeStampedModel


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=130, blank=True, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Category(TimeStampedModel):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, blank=True, unique=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="children")

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]
        unique_together = [("parent", "name")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            if self.parent_id:
                self.slug = f"{slugify(self.parent.name)}-{slugify(self.name)}"
            else:
                self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Tag(TimeStampedModel):
    name = models.CharField(max_length=60, unique=True)

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, blank=True, unique=True)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name="products")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="products", null=True, blank=True)
    tags = models.ManyToManyField(Tag, related_name="products", blank=True)

    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    image = models.CharField(max_length=300, blank=True, default="")

    # Denormalized rating payload (updated on review write)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)
    rating_count = models.PositiveIntegerField(default=0)

    # Inventory + catalog flags
    stock = models.PositiveIntegerField(default=0)
    sold_count = models.PositiveIntegerField(default=0, help_text="Tracks best-sellers & co-purchase data")
    active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["category", "active"]),
            models.Index(fields=["brand", "active"]),
            models.Index(fields=["-rating"]),
            models.Index(fields=["-sold_count"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    @property
    def discount_percent(self):
        if self.mrp and self.mrp > self.price:
            return int(round((1 - float(self.price) / float(self.mrp)) * 100))
        return 0

    @property
    def in_stock(self):
        return self.stock > 0

    def get_absolute_url(self):
        return reverse("product-detail", kwargs={"pk": self.pk})


class Review(TimeStampedModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("product", "user")]

    def __str__(self):
        return f"{self.product} - {self.rating}*"