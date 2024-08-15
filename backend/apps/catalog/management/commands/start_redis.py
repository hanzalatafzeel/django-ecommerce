"""Start an embedded Redis server (redislite) for local development without root."""
import os
import time

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Launch an embedded Redis server (redislite) bound to REDIS_URL (default 127.0.0.1:6379)."

    def add_arguments(self, parser):
        parser.add_argument("--port", type=int, default=None, help="Override port (default: from REDIS_URL or 6379)")

    def handle(self, *args, **options):
        import redislite
        from urllib.parse import urlparse

        url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        host = urlparse(url).hostname or "127.0.0.1"
        port = options["port"] or (urlparse(url).port or 6379)

        try:
            import socket

            s = socket.create_connection((host, port), timeout=0.5)
            s.close()
            self.stdout.write(self.style.WARNING(f"Redis already listening on {host}:{port} — skipping."))
            return
        except OSError:
            pass

        self.stdout.write(self.style.SUCCESS(f"Starting embedded Redis on {host}:{port} ..."))
        server = redislite.Redis(
            serverconfig={
                "port": str(port),
                "bind": host,
                "daemonize": "no",
                "loglevel": "warning",
            }
        )
        server.ping()
        self.stdout.write(self.style.SUCCESS(f"Redis up on {host}:{port}. Ctrl-C to stop. Keep this process alive while developing."))
        while True:
            try:
                time.sleep(120)
            except KeyboardInterrupt:
                self.stdout.write("Redis stopped. Goodbye.")
                return