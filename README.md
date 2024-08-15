# VoltMart — High-Volume E-Commerce Platform

A full-stack, high-volume e-commerce platform rebuilt from the django-ecommerce starter:

| Layer | Stack |
|---|---|
| Backend | **Django 6 + Django REST Framework** (Python 3.14) |
| Realtime | **Django Channels** (WebSockets) for live order tracking |
| Database | **PostgreSQL 16** (production, docker-compose) · **SQLite** (zero-config dev fallback) |
| Cache | **Redis 7** (embedded `redislite` in dev; docker-compose in prod) |
| Frontend | **React 19 + Vite** SPA |
| Payments | Simulated gateway instantly-processed (Stripe-ready layer with webhook) |
| Auth | JWT (`djangorestframework-simplejwt`), access + refresh |

**Live demo feature:** place an order, open its tracking page, then run
`python manage.py advance_orders --order <id>` — the page updates in real time over WebSockets.

---

## Features

- **Catalog (520 seeded products, 10 brands, 13 category tree)**
  - Paginated, searchable, filterable (`category`, `brand`, `price_max`, `in_stock`) and sortable list
  - Redis-cached product list & detail endpoints
  - Categories/brands with live product counts
  - Reviews with rating aggregation (writes update product rating)
- **Accounts** — register, JWT login, profile, address management
- **Cart** — add / update / remove, subtotal, per-item totals
- **Orders** — coupon discounts (`WELCOME10` 10%, `FLAT200` flat ₹200, `MEGA50` 50%), tax (18%), flat shipping, checkout from cart, cancel, full **status history + delivered_at**
- **Payments** — mock gateway (`4242 4242 4242 4242` succeeds) with Stripe-pluggable `StripeGateway` + webhook stub
- **Real-time order tracking** — Channels consumer `ws://…/ws/orders/<id>/?token=<jwt>` broadcasts `ORDER_STATUS` on every status transition; Redis channel layer when available
- **Recommendations** — trending, content-based related, "frequently bought together" (co-purchase frequency table updated per order), "for you"
- **Inventory** — low-stock report, restock, snapshot report
- **Dashboard (admin `/admin`)** — full staff store manager: KPIs with trend deltas, revenue/orders time series, status distribution & category revenue (recharts); product manager (search/filters, inline price & stock edits, restock, add/edit modal, delete); order manager (search + status filter, detail drawer, forward-only status advancement that pushes live WS updates, cancel pre-shipment); customers (searchable, spend/order totals); coupons CRUD; categories & brands manager
- **Management commands** — `seed_products`, `start_redis`, `benchmark`, `advance_orders`

## Repo layout

```
backend/
  config/            settings (env-driven), urls, asgi/wsgi (Channels)
  apps/
    core/            base models, status enums, dashboard, pagination, permissions
    accounts/        auth, profiles, addresses
    catalog/         products/brands/categories/tags/reviews, filters, caching, seeds
    cart/            cart + items
    orders/          orders, order items, coupons, status history, services
    payments/        mock + Stripe gateways, initiate/confirm/webhook
    inventory/       low stock / restock / report
    recommendations/ trending, related, FBT, for-you (co-purchase)
    realtime/        WebSocket consumers (order tracking, notifications), JWT middleware
frontend/            React 19 + Vite SPA (shop, cart, checkout, live order tracking, dashboard)
docker-compose.yml   PostgreSQL 16 + Redis 7 + backend + frontend
```

## Quickstart (dev — no external services required)

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # defaults: SQLite + embedded Redis
python manage.py start_redis &  # embedded Redis on :6379 (no root needed)
python manage.py migrate
python manage.py seed_products --count 520
python manage.py runserver      # (or: daphne for WebSockets)

# 2. Frontend
cd ../frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api and /ws → :8000)
```

Demo users: `admin/admin12345` (staff), `user1/demo12345` … `user25/demo12345`.
Coupons: `WELCOME10`, `FLAT200`, `MEGA50`. Magic card: `4242 4242 4242 4242`.

### Production / docker-compose (PostgreSQL + Redis)

```bash
docker compose up --build        # API :8000, SPA :5173, Postgres :5432, Redis :6379
```
`docker-compose.yml` sets `DB_ENGINE=postgres` and `REDIS_URL=redis://redis:6379/0`.

## API cheat sheet (prefix `/api/v1/`)

```
POST auth/token/              JWT {username,password} → {access,refresh}
POST accounts/register/       create user → tokens
GET  accounts/me/             current profile
GET|POST accounts/addresses/
GET  catalog/products/        ?search=&category=&brand=&price_max=&ordering=&page=
GET  catalog/products/<id>/
GET  catalog/products/<id>/reviews/    POST (auth) {rating 1-5, comment}
GET  catalog/categories/ | catalog/brands/
GET  cart/ | POST cart/add/ | cart/update/ | cart/remove/
POST orders/                  {address_id, coupon_code?} (checkout from cart)
GET  orders/ | orders/<id>/ | orders/<id>/cancel/
POST payments/orders/<id>/initiate/    {gateway: mock|stripe}
POST payments/orders/<id>/confirm/     {gateway, card_number}
GET  inventory/low-stock/ | restock/ | report/ | products/ | products/<id>/
GET  inventory/admin/analytics/                     (admin) KPIs + 30-day series + breakdowns
GET  inventory/admin/orders/   (admin) ?search=&status=&page=     POST …/orders/<id>/status/ {status}
GET  inventory/admin/customers/ (admin) ?search=
GET|POST inventory/admin/coupons/ | /coupons/<id>/  (admin) PATCH/DELETE
GET|POST inventory/admin/categories/ | /brands/     (admin) PATCH/DELETE per item
GET  recommendations/trending/ | for-you/ | related/<id>/ | frequently-bought/<id>/
GET  dashboard/stats/         (admin)
WS   /ws/orders/<id>/?token=<jwt>      ORDER_STATUS events
```

## Benchmark (Redis caching)

`python manage.py benchmark --runs 5`:

```
list       cold 14.61ms  warm 5.33ms  → 2.74x
filtered   cold 13.21ms  warm 5.23ms  → 2.53x
detail     cold  9.91ms  warm 7.41ms  → 1.34x
Overall average speedup: 2.2x
```

## Configuration

All runtime knobs live in `.env` (see `backend/.env.example`). Key ones:

- `DB_ENGINE=sqlite|postgres` — switch database without code changes
- `REDIS_URL` / `CACHE_BACKEND` — cache + channel layer (falls back to locmem gracefully)
- `STRIPE_SECRET_KEY` — set to enable the real Stripe gateway instead of the simulator
- `SHOP_SIMULATED_DELIVERY_DAYS` — delivery date estimate used by the simulator