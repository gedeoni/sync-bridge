from django.urls import path
from .views import SyncHistoryListView, SyncHistoryDetailView, SyncHistoryRetryView

urlpatterns = [
    path("sync-history", SyncHistoryListView.as_view(), name="sync-history-list"),
    path(
        "sync-history/<int:history_id>",
        SyncHistoryDetailView.as_view(),
        name="sync-history-detail",
    ),
    path(
        "sync-history/retry/<int:history_id>",
        SyncHistoryRetryView.as_view(),
        name="sync-history-retry",
    ),
]
