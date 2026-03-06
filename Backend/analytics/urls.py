"""analytics/urls.py – Analytics URL patterns"""

from django.urls import path
from analytics.views.upload import FileUploadView, ManualEntryView, JobStatusView
from analytics.views.dashboard import DashboardSummaryView, ContainerListView, AnomalyListView
from analytics.views.export import ExportView

urlpatterns = [
    # Dataset upload
    path('datasets/upload/', FileUploadView.as_view(), name='file-upload'),
    path('datasets/manual-entry/', ManualEntryView.as_view(), name='manual-entry'),
    path('datasets/status/<str:job_id>/', JobStatusView.as_view(), name='job-status'),

    # Dashboard
    path('dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('dashboard/containers/', ContainerListView.as_view(), name='dashboard-containers'),
    path('dashboard/anomalies/', AnomalyListView.as_view(), name='dashboard-anomalies'),

    # Export
    path('export/', ExportView.as_view(), name='export'),
]
