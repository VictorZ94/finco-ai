from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AppUser


class AppUserSerializer(serializers.ModelSerializer):
    uid = serializers.CharField(source="firebase_uid", read_only=True)

    class Meta:
        model = AppUser
        fields = [
            "uid",
            "email",
            "display_name",
            "sign_in_provider",
            "email_verified",
            "accent_color",
            "created_at",
        ]
        # Identity fields come from the verified Firebase token, never from the client.
        read_only_fields = ["email", "display_name", "sign_in_provider", "email_verified", "created_at"]

    def validate_accent_color(self, value):
        return value.upper()


class MeView(APIView):
    """GET/PATCH /api/me/ — the signed-in user. GET also registers new users (see authentication)."""

    def get(self, request):
        return Response(AppUserSerializer(request.user).data)

    def patch(self, request):
        serializer = AppUserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
