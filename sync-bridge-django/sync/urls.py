from django.urls import path
from .views import SyncView, SyncStatsView

urlpatterns = [
    path("sync", SyncView.as_view(), name="sync"),
    path("sync/stats", SyncStatsView.as_view(), name="sync-stats"),
]
