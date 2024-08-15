"""Seed 500+ products, brands, categories, tags, demo users, coupons, reviews & orders."""
import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from faker import Faker

from apps.accounts.models import Address
from apps.catalog.models import Brand, Category, Product, Review, Tag
from apps.core.models import OrderStatus
from apps.orders.models import Coupon, Order, OrderItem, OrderStatusHistory
from apps.payments.models import GatewayChoices, Payment, PaymentStatus

User = get_user_model()
fake = Faker()

IMAGES = [
    "adidas.png", "banner.jpg", "banner.png", "ck.png", "dg.png", "free.png",
    "gucci.png", "image.png", "levis.png", "new.png", "ogproducts.png",
    "product1.png", "product2.png", "product3.png", "product4.png", "thumsup.png",
]

BRANDS = ["Adidas", "Gucci", "Levi's", "Calvin Klein", "Dolce & Gabbana", "Puma", "Nike", "H&M", "Zara", "Coach"]

CATEGORY_TREE = {
    "Men": ["Clothing", "Footwear", "Accessories"],
    "Women": ["Clothing", "Footwear", "Accessories", "Jewelry"],
    "Kids": ["Clothing", "Footwear", "Toys"],
}

TAGS = [
    "casual", "formal", "sport", "party", "summer", "winter", "premium",
    "bestseller", "new arrival", "unisex", "limited", "eco",
]


def _price(lo=499, hi=14999):
    return Decimal(random.randint(lo, hi)).quantize(Decimal("0.01"))


class Command(BaseCommand):
    help = "Seed the platform with 500+ products, users, coupons, reviews and demo orders."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=520, help="Number of products to generate")
        parser.add_argument("--products-only", action="store_true", help="Only create brands/categories/products")

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        self.stdout.write(f"Seeding {count} products ...")

        brands = [Brand.objects.get_or_create(name=n, defaults={"slug": n.lower().replace(' ', '-')})[0] for n in BRANDS]

        categories = []
        root_map = {}
        for root, children in CATEGORY_TREE.items():
            root_cat = Category.objects.get_or_create(name=root)[0]
            root_map[root] = root_cat
            for child in children:
                categories.append(Category.objects.get_or_create(name=child, parent=root_cat)[0])

        tags = [Tag.objects.get_or_create(name=t)[0] for t in TAGS]

        products = []
        for i in range(count):
            cat = random.choice(categories)
            brand = random.choice(brands) if random.random() < 0.8 else None
            price = _price() if random.random() < 0.9 else _price(49, 1499)
            mrp = price * Decimal(str(random.randint(110, 165) / 100.0))
            title = f"{brand.name if brand else fake.company()} {cat.name} {fake.word().capitalize()} {i+1}"
            img = "/static/image/" + random.choice(IMAGES)
            p, _ = Product.objects.update_or_create(
                slug=f"p{i+1}",
                defaults={
                    "title": title,
                    "brand": brand,
                    "category": cat,
                    "description": fake.paragraph(nb_sentences=4),
                    "price": price,
                    "mrp": mrp.quantize(Decimal("0.01")),
                    "image": img,
                    "stock": random.choice([0, 0, 3, 5, 12] + list(range(4, 95))),
                    "sold_count": random.randint(0, 400),
                    "featured": random.random() < 0.12,
                    "active": True,
                    "rating": Decimal(str(random.randint(30, 50) / 10.0)),
                    "rating_count": random.randint(0, 900),
                },
            )
            p.tags.set(random.sample(tags, k=min(len(tags), random.randint(2, 4))))
            products.append(p)

        if options["products_only"]:
            self.stdout.write(self.style.SUCCESS(f"Done. {Product.objects.count()} products in DB."))
            return

        # --- Users ---
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@ecom.local", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password("admin12345")
            admin.save()
            self.stdout.write("  → superuser 'admin' / 'admin12345'")

        customers = []
        for i in range(25):
            username = f"user{i+1}"
            u, created = User.objects.get_or_create(username=username, defaults={"email": f"{username}@ecom.local"})
            if created:
                u.set_password("demo12345")
                u.save()
                Address.objects.create(
                    user=u,
                    label=fake.random_element(["Home", "Work"]),
                    line1=fake.street_address(),
                    city=fake.city(),
                    state=fake.state(),
                    pincode=str(random.randint(100000, 999999)),
                    is_default=True,
                )
            customers.append(u)

        # --- Coupons ---
        coupons = [
            {"code": "WELCOME10", "discount_percent": 10},
            {"code": "FLAT200", "discount_amount": 200, "min_order_value": 1000},
            {"code": "MEGA50", "discount_percent": 50},
        ]
        for c in coupons:
            Coupon.objects.get_or_create(code=c["code"], defaults=c)

        # --- Reviews ---
        for _ in range(random.randint(250, 320)):
            p = random.choice(products)
            u = random.choice(customers)
            if Review.objects.filter(product=p, user=u).exists():
                continue
            Review.objects.create(
                product=p,
                user=u,
                rating=random.randint(3, 5),
                comment=fake.sentence(nb_words=12),
            )

        # --- Demo orders with payments across the whole status flow ---
        flow = [OrderStatus.PENDING, OrderStatus.PAYMENT_CONFIRMED, OrderStatus.PACKED, OrderStatus.SHIPPED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED]
        for i in range(40):
            customer = random.choice(customers)
            addr = customer.addresses.first()
            if addr is None:
                continue
            items = random.sample(products, k=random.randint(1, 4))
            subtotal = Decimal(0)
            order = Order.objects.create(
                user=customer,
                address_label=addr.label,
                address_line1=addr.line1,
                city=addr.city,
                state=addr.state,
                pincode=addr.pincode,
                status=random.choice(flow),
                subtotal=Decimal(0),
                shipping=Decimal("49.00"),
            )
            from apps.orders.services import SHIPPING_FLAT, TAX_RATE

            for it in items:
                qty = random.randint(1, 3)
                OrderItem.objects.create(
                    order=order, product=it, product_title=it.title, product_image=it.image,
                    unit_price=it.price, quantity=qty,
                )
                subtotal += it.price * qty
            order.subtotal = subtotal
            order.tax = ((subtotal - order.discount) * TAX_RATE).quantize(Decimal("0.01"))
            order.total = (subtotal - order.discount + order.tax + SHIPPING_FLAT).quantize(Decimal("0.01"))
            order.save()
            OrderStatusHistory.objects.create(order=order, status=order.status, note="Seeded demo order")
            if order.status not in (OrderStatus.PENDING, OrderStatus.CANCELLED):
                Payment.objects.create(
                    order=order,
                    gateway=GatewayChoices.MOCK,
                    status=PaymentStatus.SUCCEEDED,
                    amount=order.total,
                    transaction_id=f"tx_demo_{order.id}",
                )

        self.stdout.write(self.style.SUCCESS(
            f"Seed complete → {Product.objects.count()} products, {Brand.objects.count()} brands, "
            f"{Category.objects.count()} categories, {User.objects.filter(is_staff=False).count()} customers, "
            f"{Order.objects.count()} orders."
        ))