from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import authentication, exceptions

from financial_accounts.provisioning import seed_default_chart

from . import firebase
from .models import AppUser

LAST_SEEN_RESOLUTION = timedelta(minutes=5)


def claims_profile(claims):
    """AppUser fields taken from verified Firebase token claims."""
    return {
        "email": claims.get("email", ""),
        "display_name": claims.get("name", ""),
        "sign_in_provider": claims.get("firebase", {}).get("sign_in_provider", ""),
        "email_verified": bool(claims.get("email_verified", False)),
    }


def sync_app_user(claims):
    """Create or refresh the AppUser for these claims; new users get the default chart."""
    uid = claims["uid"]
    now = timezone.now()
    profile = claims_profile(claims)

    user = AppUser.objects.filter(firebase_uid=uid).first()
    if user is None:
        with transaction.atomic():
            user, created = AppUser.objects.get_or_create(
                firebase_uid=uid, defaults={**profile, "last_seen_at": now}
            )
            if created:
                seed_default_chart(uid)
        return user

    changed = {key: value for key, value in profile.items() if value and getattr(user, key) != value}
    if changed or not user.last_seen_at or now - user.last_seen_at > LAST_SEEN_RESOLUTION:
        for key, value in changed.items():
            setattr(user, key, value)
        user.last_seen_at = now
        user.save(update_fields=[*changed, "last_seen_at", "updated_at"])
    return user


class FirebaseAuthentication(authentication.BaseAuthentication):
    """DRF authentication: `Authorization: Bearer <Firebase ID token>`."""

    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("latin-1")
        if not header:
            return None  # IsAuthenticated then answers 401.
        parts = header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            raise exceptions.AuthenticationFailed("Invalid Authorization header.")

        try:
            claims = firebase.verify_id_token(parts[1])
        except firebase.ExpiredIdTokenError:
            raise exceptions.AuthenticationFailed("Your session expired. Please sign in again.")
        except (firebase.InvalidIdTokenError, ValueError):
            raise exceptions.AuthenticationFailed("Invalid authentication token.")
        except firebase.CertificateFetchError:
            raise exceptions.AuthenticationFailed("Could not verify the token. Try again.")

        return sync_app_user(claims), claims

    def authenticate_header(self, request):
        # A WWW-Authenticate header makes DRF answer 401 (not 403) for unauthenticated calls.
        return self.keyword
