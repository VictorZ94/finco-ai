def get_user_id(request):
    """Return the Firebase UID that owns this request's data.

    request.user is the users.AppUser set by FirebaseAuthentication after
    verifying the request's Firebase ID token. Never trust a user_id sent by the client.
    """
    return request.user.firebase_uid
