from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

from . import firebase


class FirebaseAdminBackend(ModelBackend):
    """Django admin login with a Firebase ID token; password login is impossible.

    Only UIDs listed in FIREBASE_ADMIN_UIDS are let in. Their auth_user row is
    created on first login with an unusable password, so no hash is stored.
    """

    def authenticate(self, request, id_token=None, **kwargs):
        if not id_token:
            return None  # e.g. username/password attempts
        try:
            claims = firebase.verify_id_token(id_token, check_revoked=True)
        except (
            firebase.InvalidIdTokenError,
            firebase.ExpiredIdTokenError,
            firebase.RevokedIdTokenError,
            firebase.UserDisabledError,
            firebase.CertificateFetchError,
            ValueError,
        ):
            return None

        uid = claims["uid"]
        if uid not in settings.FIREBASE_ADMIN_UIDS:
            return None

        User = get_user_model()
        user, created = User.objects.get_or_create(
            username=uid,
            defaults={"email": claims.get("email", ""), "is_staff": True, "is_superuser": True},
        )
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        return user if self.user_can_authenticate(user) else None
