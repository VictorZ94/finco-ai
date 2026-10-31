"""
Django settings shared by every environment.

Environment-specific settings live in dev.py and prod.py, which import from
here. Secrets and per-deployment values are read from environment variables,
falling back to a .env file next to manage.py (see .env.example).

For more information on this file, see
https://docs.djangoproject.com/en/6.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/6.1/ref/settings/
"""

from pathlib import Path

import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()

# Real environment variables take precedence over values in .env.
environ.Env.read_env(BASE_DIR / '.env')


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY')


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    # Local apps
    'financial_accounts',
    'transactions',
    'ai_chat',
    'dashboard',
    'reports',
    'users',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'finco_ai.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'finco_ai.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases
# PostgreSQL (docker-compose.yaml); connection values come from the POSTGRES_* env vars.

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB'),
        'USER': env('POSTGRES_USER'),
        'PASSWORD': env('POSTGRES_PASSWORD'),
        'HOST': env('POSTGRES_HOST'),
        'PORT': env('POSTGRES_PORT'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'


# REST API
# https://www.django-rest-framework.org/api-guide/settings/
# Every request must carry a Firebase ID token (Authorization: Bearer <token>);
# see users/authentication.py. Views scope data with finco_ai.identity.get_user_id.

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ['users.authentication.FirebaseAuthentication'],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    # Money travels as strings ("50000.00"), never floats.
    'COERCE_DECIMAL_TO_STRING': True,
}


# Firebase Authentication
# Firebase is the only identity provider: app users never get a Django password.
# Service account (backend token verification). Empty values only fail when a
# token is actually verified, so tests (which mock Firebase) run without them.

FIREBASE_PROJECT_ID = env('FIREBASE_PROJECT_ID', default='')
FIREBASE_CLIENT_EMAIL = env('FIREBASE_CLIENT_EMAIL', default='')
FIREBASE_PRIVATE_KEY = env('FIREBASE_PRIVATE_KEY', default='')

# Public web config, used by the Firebase sign-in page of Django admin.
FIREBASE_WEB_API_KEY = env('FIREBASE_WEB_API_KEY', default='')
FIREBASE_AUTH_DOMAIN = env('FIREBASE_AUTH_DOMAIN', default='')
FIREBASE_APP_ID = env('FIREBASE_APP_ID', default='')

# Firebase UIDs allowed into Django admin (comma-separated).
FIREBASE_ADMIN_UIDS = env.list('FIREBASE_ADMIN_UIDS', default=[])

# Django auth only serves admin staff, and only via Firebase: no password login.
AUTHENTICATION_BACKENDS = ['users.backends.FirebaseAdminBackend']
LOGIN_URL = 'admin:login'

# Admin sessions expire after 8 hours.
SESSION_COOKIE_AGE = 8 * 60 * 60

# Chat agent LLM (ai_chat.llm). Ollama cloud by default: messages and the user's
# account names are sent to OLLAMA_HOST. Point it at http://127.0.0.1:11434 for a local model.
OLLAMA_HOST = env('OLLAMA_HOST', default='https://ollama.com')
OLLAMA_API_KEY = env('OLLAMA_API_KEY', default='')
OLLAMA_MODEL = env('OLLAMA_MODEL', default='gemma4:31b')
OLLAMA_TIMEOUT = env.float('OLLAMA_TIMEOUT', default=60.0)
# Chat memory: when a conversation's history passes this many tokens, older messages are replaced by a
# summary and the most recent CHAT_SUMMARY_KEEP_MESSAGES are kept as they are (ai_chat.agent).
CHAT_SUMMARY_TRIGGER_TOKENS = env.int('CHAT_SUMMARY_TRIGGER_TOKENS', default=4000)
CHAT_SUMMARY_KEEP_MESSAGES = env.int('CHAT_SUMMARY_KEEP_MESSAGES', default=20)
