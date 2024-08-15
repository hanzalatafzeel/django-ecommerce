from django.urls import path

from apps.cart.views import CartAddView, CartRemoveView, CartUpdateView, CartView

urlpatterns = [
    path("", CartView.as_view(), name="cart"),
    path("add/", CartAddView.as_view(), name="cart-add"),
    path("update/", CartUpdateView.as_view(), name="cart-update"),
    path("remove/", CartRemoveView.as_view(), name="cart-remove"),
]