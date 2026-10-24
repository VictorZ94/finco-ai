from django.contrib import admin

from .models import AppUser


@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    """Firebase users, mirrored on each API request. Credentials live in Firebase."""

    list_display = ["email", "display_name", "sign_in_provider", "email_verified", "last_seen_at", "created_at"]
    list_filter = ["sign_in_provider", "email_verified"]
    search_fields = ["email", "display_name", "firebase_uid"]
    ordering = ["-created_at"]
    readonly_fields = [field.name for field in AppUser._meta.fields]

    def has_add_permission(self, request):
        return False  # users are created by signing up through Firebase
