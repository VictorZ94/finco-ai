import uuid

from django.core.validators import RegexValidator
from django.db import models


class AppUser(models.Model):
    """A FincoAI user, mirrored from Firebase Authentication.

    Firebase owns credentials; this table never stores a password. Rows are
    created and refreshed by users.authentication.FirebaseAuthentication.
    Django's auth_user table is separate and only holds admin staff.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    firebase_uid = models.CharField(max_length=128, unique=True)
    email = models.EmailField(blank=True, default="")
    display_name = models.CharField(max_length=255, blank=True, default="")
    sign_in_provider = models.CharField(max_length=50, blank=True, default="")
    email_verified = models.BooleanField(default=False)
    # UI brand color seed chosen in Appearance ("#RRGGBB"); blank means the default.
    accent_color = models.CharField(
        max_length=7,
        blank=True,
        default="",
        validators=[RegexValidator(r"^#[0-9A-Fa-f]{6}$", "Use a hex color like #3F5885.")],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "app_users"

    def __str__(self):
        return self.email or self.firebase_uid

    # Lets DRF's IsAuthenticated permission accept this object as request.user.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
