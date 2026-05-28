from django.contrib import admin
from django.urls import include, path
from graphql_api.views import graphql_view
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/v1/', include('health.urls')),
    path('api/v1/', include('sync.urls')),
    path('api/v1/', include('sync_history.urls')),
    path('graphql', graphql_view, name='graphql'),
]
