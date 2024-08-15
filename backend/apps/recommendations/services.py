"""Recommendation engine.

- content_based: same category / shared tags / price proximity (Redis-cached)
- frequently_bought_together: co-purchase affinity table (updated on checkout)
- recommended_for_user: personalised picks from purchase history + top sellers
"""
from collections import Counter
from itertools import combinations

from django.db.models import F, Q

from apps.catalog.models import Product
from apps.catalog.services import cache_key, get_or_cache
from apps.recommendations.models import CoPurchaseFrequency

RELATED_LIMIT = 8
FBT_LIMIT = 6


def content_based_ids(product_id, limit=RELATED_LIMIT):
    try:
        product = Product.objects.get(pk=product_id, active=True)
    except Product.DoesNotExist:
        return []

    scores = Counter()

    if product.category_id:
        for pid in (
            Product.objects.filter(active=True, category_id=product.category_id)
            .exclude(id=product.id)
            .values_list("id", flat=True)
        ):
            scores[pid] += 2

    tag_ids = list(product.tags.values_list("id", flat=True))
    if tag_ids:
        for pid in (
            Product.objects.filter(active=True, tags__id__in=tag_ids)
            .exclude(id=product.id)
            .distinct()
            .values_list("id", flat=True)
        ):
            scores[pid] += 1

    # Price proximity tie-breaker (top scorers first)
    ordered = [pid for pid, _ in scores.most_common(limit * 4)]
    if ordered:
        rows = {
            pid: price
            for pid, price in Product.objects.filter(id__in=ordered).values_list("id", "price")
        }
        pprice = float(product.price)
        ordered.sort(key=lambda pid: (scores[pid], -abs(float(rows[pid]) - pprice)), reverse=False)
        ordered.sort(key=lambda pid: scores[pid], reverse=True)
    return ordered[:limit]


def related_products(product_id, limit=RELATED_LIMIT):
    """Content-based similar products (Redis-cached)."""
    key = cache_key("rec:related", product_id)
    ids, _ = get_or_cache(key, lambda: content_based_ids(product_id, limit), timeout=1800)
    return list(Product.objects.filter(id__in=ids, active=True).select_related("brand", "category")[:limit])


def frequently_bought_ids(product_id, limit=FBT_LIMIT):
    rows = (
        CoPurchaseFrequency.objects.filter(Q(product_a_id=product_id) | Q(product_b_id=product_id))
        .order_by("-count")[: limit * 2]
    )
    out = []
    for row in rows:
        other = row.product_a_id if row.product_b_id == product_id else row.product_b_id
        if other not in out:
            out.append(other)
    return out[:limit]


def frequently_bought_together(product_id, limit=FBT_LIMIT):
    """'Frequently bought together' products (Redis-cached)."""
    key = cache_key("rec:fbt", product_id)
    ids, _ = get_or_cache(key, lambda: frequently_bought_ids(product_id, limit), timeout=1800)
    return list(Product.objects.filter(id__in=ids, active=True).select_related("brand", "category")[:limit])


def recommended_for_user_ids(user, limit=RELATED_LIMIT):
    """Personalised: co-purchase neighbours of products the user previously bought + top sellers."""
    from apps.orders.models import Order, OrderItem

    bought = list(
        OrderItem.objects.filter(order__user=user, product__isnull=False)
        .order_by("-quantity")
        .values_list("product_id", flat=True)[:8]
    )
    if not bought:
        return list(Product.objects.filter(active=True, featured=True).values_list("id", flat=True)[:limit])

    q = Q()
    for pid in bought:
        q |= Q(product_a_id=pid) | Q(product_b_id=pid)
    rows = CoPurchaseFrequency.objects.filter(q).order_by("-count")[: limit * 2]
    ids, seen = [], set()
    for row in rows:
        for pid in (row.product_a_id, row.product_b_id):
            if pid not in seen and pid not in bought:
                seen.add(pid)
                ids.append(pid)
    if len(ids) < limit:
        extras = list(
            Product.objects.filter(active=True, featured=True)
            .exclude(id__in=bought)
            .exclude(id__in=ids)
            .values_list("id", flat=True)
        )
        ids += extras
    return ids[:limit]


def recommended_for_user(user, limit=RELATED_LIMIT):
    ids = recommended_for_user_ids(user, limit)
    if not ids:
        return Product.objects.none()
    order = {pid: i for i, pid in enumerate(ids)}
    return sorted(
        Product.objects.filter(id__in=ids, active=True).select_related("brand", "category"),
        key=lambda p: order[p.id],
    )


def trending_ids(limit=RELATED_LIMIT):
    return list(Product.objects.filter(active=True).order_by("-sold_count").values_list("id", flat=True)[:limit])


def trending_products(limit=RELATED_LIMIT):
    ids = trending_ids(limit)
    return list(Product.objects.filter(id__in=ids, active=True).select_related("brand", "category"))


def record_purchase(user, cart_items):
    """Update co-purchase affinity from a completed order's items."""
    products = [ci.product for ci in cart_items if ci.product]
    for a, b in combinations(products, 2):
        if a.id == b.id:
            continue
        pa, pb = (a.id, b.id) if a.id < b.id else (b.id, a.id)
        updated = CoPurchaseFrequency.objects.filter(product_a_id=pa, product_b_id=pb).update(count=F("count") + 1)
        if not updated:
            CoPurchaseFrequency.objects.get_or_create(product_a_id=pa, product_b_id=pb, defaults={"count": 1})
    for p in products:
        invalidate_for_product(p.id)


def invalidate_for_product(product_id):
    from django.core.cache import cache

    cache.delete(cache_key("rec:related", product_id))
    cache.delete(cache_key("rec:fbt", product_id))