from django.contrib import admin

from apps.accounts.models import Address, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "phone", "newsletter"]
    search_fields = ["user__username", "phone"]


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["user", "label", "city", "state", "pincode", "is_default"]
    list_filter = ["is_default", "state"]
    search_fields = ["user__username", "line1", "city"]