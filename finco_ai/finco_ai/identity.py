from django.conf import settings


def get_user_id(request):
    """Return the Firebase UID that owns this request's data.

    Placeholder until auth exists: every request acts as DEFAULT_USER_ID.
    Replace with Firebase ID-token verification (Authorization header).
    """
    return settings.DEFAULT_USER_ID
