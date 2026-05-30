import os
from pathlib import Path
from django.core.wsgi import get_wsgi_application
import dotenv

# Resolve the project root directory (two levels up from this file)
# sync-bridge-django/sync_bridge/wsgi.py -> sync-bridge-django/
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

dotenv.load_dotenv(ENV_PATH)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sync_bridge.settings")

application = get_wsgi_application()
