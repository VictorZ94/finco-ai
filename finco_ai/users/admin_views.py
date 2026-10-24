from django.conf import settings
from django.contrib import admin
from django.contrib.auth import REDIRECT_FIELD_NAME, authenticate, login
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect


def _safe_next(request):
    target = request.POST.get(REDIRECT_FIELD_NAME) or request.GET.get(REDIRECT_FIELD_NAME)
    if target and url_has_allowed_host_and_scheme(
        target, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return target
    return reverse("admin:index")


@never_cache
@csrf_protect
def admin_login(request):
    """Replaces Django admin's password login with Firebase sign-in.

    The page signs in with the Firebase JS SDK and posts the ID token here;
    users.backends.FirebaseAdminBackend verifies it and checks FIREBASE_ADMIN_UIDS.
    """
    next_url = _safe_next(request)
    if request.user.is_active and request.user.is_staff:
        return redirect(next_url)

    error = None
    if request.method == "POST":
        user = authenticate(request, id_token=request.POST.get("id_token", ""))
        if user is not None:
            login(request, user)
            return redirect(next_url)
        error = "This account is not an administrator, or the sign-in could not be verified."

    context = {
        **admin.site.each_context(request),
        "title": "Log in",
        "next": next_url,
        "error": error,
        "firebase_config": {
            "apiKey": settings.FIREBASE_WEB_API_KEY,
            "authDomain": settings.FIREBASE_AUTH_DOMAIN,
            "projectId": settings.FIREBASE_PROJECT_ID,
            "appId": settings.FIREBASE_APP_ID,
        },
    }
    return render(request, "users/admin_login.html", context, status=403 if error else 200)
