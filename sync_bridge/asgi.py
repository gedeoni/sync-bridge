import os
from django.core.asgi import get_asgi_application
import dotenv
from channels.routing import ProtocolTypeRouter, URLRouter
from graphql_api.routing import websocket_urlpatterns

dotenv.load_dotenv()

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sync_bridge.settings")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(websocket_urlpatterns),
    }
)
