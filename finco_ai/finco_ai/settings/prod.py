"""
Production settings. Used by wsgi.py / asgi.py by default.

Check with: python manage.py check --deploy --settings=finco_ai.settings.prod
https://docs.djangoproject.com/en/6.1/howto/deployment/checklist/
"""

from .base import *  # noqa: F403
from .base import env

DEBUG = False

# Required: comma-separated hostnames, e.g. "api.finco.ai,finco.ai".
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

# Full origins (with scheme) allowed to send unsafe requests, e.g. "https://finco.ai".
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])


# HTTPS

SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Start low and raise to 31536000 (1 year) once HTTPS is confirmed working everywhere.
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=3600)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False)
SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=False)

# Trust X-Forwarded-Proto when running behind a TLS-terminating proxy (most PaaS hosts).
if env.bool('BEHIND_PROXY', default=False):
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
