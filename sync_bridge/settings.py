from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.getenv("DEBUG", "true").lower() == "true"

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ValueError(
            "SECRET_KEY environment variable is required in production settings!"
        )
    SECRET_KEY = "change-me-in-production-dev-only"

ALLOWED_HOSTS = [host for host in os.getenv("ALLOWED_HOSTS", "*").split(",") if host]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "channels",
    "strawberry.django",
    "common",
    "health",
    "sync",
    "sync_history",
    "graphql_api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middleware.RequestIdMiddleware",
    "common.monitoring.MonitoringMiddleware",
]

ROOT_URLCONF = "sync_bridge.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "sync_bridge.wsgi.application"
ASGI_APPLICATION = "sync_bridge.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.getenv("DB_PATH", str(BASE_DIR / "sync-bridge.db")),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["common.auth.ApiKeyAuthentication"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "EXCEPTION_HANDLER": "common.exceptions.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Sync Bridge API",
    "DESCRIPTION": "Robust data synchronization service built with Django.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

APP_AUTH_TOKEN = os.getenv("APP_AUTH_TOKEN")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"level":"%(levelname)s","logger":"%(name)s","message":%(message)s}',
        },
        "plain": {
            "format": "%(levelname)s %(name)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        }
    },
    "loggers": {
        "sync_bridge": {
            "handlers": ["console"],
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "common.monitoring": {
            "handlers": ["console"],
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "propagate": False,
        },
    },
}
