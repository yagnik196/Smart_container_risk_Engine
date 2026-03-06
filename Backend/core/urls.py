"""core/urls.py – Root URL configuration"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication
    path('auth/', include('user.urls')),

    # Analytics (datasets, dashboard, export)
    path('', include('analytics.urls')),
]
