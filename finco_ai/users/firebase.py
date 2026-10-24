"""Thin wrapper around the Firebase Admin SDK.

verify_id_token() is the single entry point to Firebase in the backend, so
tests patch it (users.firebase.verify_id_token) instead of calling Google.
"""

import firebase_admin
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from firebase_admin import auth, credentials

# Re-exported so callers can catch them without importing firebase_admin.
InvalidIdTokenError = auth.InvalidIdTokenError
ExpiredIdTokenError = auth.ExpiredIdTokenError
RevokedIdTokenError = auth.RevokedIdTokenError
UserDisabledError = auth.UserDisabledError
CertificateFetchError = auth.CertificateFetchError

_app = None


def get_app():
    """Initialize the Firebase app once, from the service-account values in settings."""
    global _app
    if _app is None:
        missing = [
            name
            for name in ("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY")
            if not getattr(settings, name)
        ]
        if missing:
            raise ImproperlyConfigured(f"Set {', '.join(missing)} in finco_ai/.env to verify Firebase tokens.")
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            # .env stores the key on one line with literal "\n" sequences.
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        _app = firebase_admin.initialize_app(cred, name="finco_ai")
    return _app


def verify_id_token(id_token, check_revoked=False):
    """Verify a Firebase ID token and return its claims (uid, email, firebase.sign_in_provider, ...)."""
    return auth.verify_id_token(
        id_token, app=get_app(), check_revoked=check_revoked, clock_skew_seconds=5
    )
