from unittest import mock

from . import firebase


def fake_claims(uid, **extra):
    """Claims shaped like a verified Firebase ID token."""
    return {
        "uid": uid,
        "email": f"{uid}@example.com",
        "name": uid.replace("-", " ").title(),
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"},
        **extra,
    }


class FirebaseAuthMixin:
    """Mocks Firebase token verification for API tests.

    A token "token:<uid>" verifies as that uid; "expired"/anything else fails.
    Use self.authenticate(uid) to make self.client send a valid Bearer token.
    """

    def setUp(self):
        super().setUp()
        patcher = mock.patch.object(firebase, "verify_id_token", side_effect=self._verify)
        self.verify_mock = patcher.start()
        self.addCleanup(patcher.stop)

    @staticmethod
    def _verify(token, check_revoked=False):
        if token == "expired":
            raise firebase.ExpiredIdTokenError("expired", cause=None)
        if token.startswith("token:"):
            return fake_claims(token.removeprefix("token:"))
        raise firebase.InvalidIdTokenError("invalid")

    def authenticate(self, uid):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer token:{uid}")
