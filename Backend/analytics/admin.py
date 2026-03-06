"""analytics/admin.py – Admin panel registrations"""

from django.contrib import admin
from .models import DatasetUpload, Container


@admin.register(DatasetUpload)
class DatasetUploadAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'file_path', 'processing_status', 'row_count', 'uploaded_at')
    list_filter = ('processing_status',)
    search_fields = ('user__username', 'file_path')
    ordering = ('-uploaded_at',)
    readonly_fields = ('id', 'uploaded_at')


@admin.register(Container)
class ContainerAdmin(admin.ModelAdmin):
    list_display = ('container_id', 'user', 'risk_level', 'risk_score', 'anomaly_flag', 'updated_at')
    list_filter = ('risk_level', 'anomaly_flag')
    search_fields = ('container_id', 'user__username')
    ordering = ('-risk_score',)
    readonly_fields = ('id', 'updated_at')
