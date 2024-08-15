"""Benchmark: compare cached vs uncached product API latency to prove the Redis speedup."""
import json
import time
import urllib.request
from urllib.parse import urlencode

from django.core.cache import cache
from django.core.management.base import BaseCommand

BASE = "http://127.0.0.1:8000"
PRODUCT_LIST = "/api/v1/catalog/products/"


def _http(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode())


class Command(BaseCommand):
    help = "Measures HTTP latency of the product API cold (cache miss) vs warm (Redis cache hit)."

    def add_arguments(self, parser):
        parser.add_argument("--runs", type=int, default=5)
        parser.add_argument("--base", type=str, default=BASE)

    def handle(self, *args, **options):
        runs = options["runs"]
        base = options["base"]
        urls = {
            "list": base + PRODUCT_LIST + "?" + urlencode({"page_size": 20}),
            "filtered": base + PRODUCT_LIST + "?" + urlencode({"category": "women-footwear", "price_max": 3000, "ordering": "price"}),
            "detail": None,  # resolved below
        }
        first = _http(base + PRODUCT_LIST + "?page_size=1")["results"][0]["id"]
        urls["detail"] = f"{base}/api/v1/catalog/products/{first}/"

        cache.clear()

        results = {}
        for label, url in urls.items():
            times = []
            for _ in range(runs):
                cache.clear()
                t0 = time.perf_counter()
                _http(url)
                times.append((time.perf_counter() - t0) * 1000)
            cold = {"avg_ms": round(sum(times) / len(times), 2), "runs": times}

            _http(url)  # populate cache
            times = []
            for _ in range(runs):
                t0 = time.perf_counter()
                _http(url)
                times.append((time.perf_counter() - t0) * 1000)
            warm = {"avg_ms": round(sum(times) / len(times), 2), "runs": times}

            speedup = round(cold["avg_ms"] / warm["avg_ms"], 2) if warm["avg_ms"] else 0
            results[label] = {"cold": cold, "warm": warm, "speedup_x": speedup}
            self.stdout.write(
                f"{label:10s} cold {cold['avg_ms']:>8}ms  warm {warm['avg_ms']:>8}ms  →  {speedup:>6.2f}x"
            )

        overall = round(
            sum(r["speedup_x"] for r in results.values()) / len(results) if results else 0, 2
        )
        self.stdout.write(self.style.SUCCESS(f"\nOverall average speedup: {overall}x (Redis-cached)"))