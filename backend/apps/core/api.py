"""Shared API utilities: pagination, permissions, response helpers."""
import time

from rest_framework import permissions
from rest_framework.pagination import PageNumberPagination


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data["page"] = self.page.number
        response.data["pages"] = self.page.paginator.num_pages
        response.data["total"] = self.page.paginator.count
        return response


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, "user", None)
        return owner is not None and owner == request.user


class IsAuthenticatedOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated) and (
            request.method in permissions.SAFE_METHODS or request.user.is_staff
        )


def timed(fn, label):
    start = time.perf_counter()

    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = fn(*args, **kwargs)
        duration_ms = (time.perf_counter() - t0) * 1000
        if label:
            total = time.perf_counter() - start
        return result, duration_ms

    return wrapper