"""Account serializers: registration, profile, addresses."""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers

from apps.accounts.models import Address, Profile

UserModel = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField(required=True)

    class Meta:
        model = UserModel
        fields = ["username", "email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        user = UserModel.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        Profile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(source="profile.phone", read_only=True, default="")

    class Meta:
        model = UserModel
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "is_staff"]


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "line1",
            "line2",
            "city",
            "state",
            "pincode",
            "country",
            "is_default",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        if validated_data.get("is_default"):
            Address.objects.filter(user=validated_data["user"]).update(is_default=False)
        return Address.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_default", False) and not instance.is_default:
            Address.objects.filter(user=instance.user).update(is_default=False)
        return super().update(instance, validated_data)