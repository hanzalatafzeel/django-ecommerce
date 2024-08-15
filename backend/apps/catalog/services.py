"""Catalog services: caching primitives shared by list/detail/recommendation views."""
import hashlib

from django.core.cache import cache


def cache_key(*parts):
    raw = ":".join(str(p) for p in parts)
    return "ecom:" + hashlib.md5(raw.encode()).hexdigest()


def get_or_cache(key, fallback, timeout=900):
    """Return (data, hit) — executes `fallback()` only on cache miss."""
    data = cache.get(key)
    if data is not None:
        return data, True
    data = fallback()
    if data is not None:
        cache.set(key, data, timeout)
    return data, False


def invalidate_product(product_id):
    from apps.recommendations.services import invalidate_for_product

    cache.delete(cache_key("product", product_id))
    cache.delete(cache_key("product-list"))
    invalidate_for_product(product_id)