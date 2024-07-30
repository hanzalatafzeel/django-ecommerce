from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('', views.homepage, name="homepage"),
    path('newArrivals', views.newArrivals , name="newArrivals")
]