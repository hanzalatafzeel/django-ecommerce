"""Authenticated WebSocket middleware using JWT (query/reject on the token)."""
import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user(token):
    try:
        access = AccessToken(token)
        user = get_user_model().objects.get(id=access["user_id"])
        return user
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query = {}
        if "query_string" in scope:
            try:
                from urllib.parse import parse_qs

                query = parse_qs(scope["query_string"].decode())
            except Exception:
                query = {}
        token = (query.get("token") or [""])[0]
        scope["user"] = await _get_user(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)