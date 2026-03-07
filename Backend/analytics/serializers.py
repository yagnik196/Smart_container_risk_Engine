"""analytics/serializers.py – Container serializer"""

from rest_framework import serializers
from .models import Container, DatasetUpload


class ContainerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Container
        fields = [
            'container_id', 'risk_score', 'risk_level',
            'anomaly_flag', 'explanation', 'declared_value',
            'weight', 'measured_weight',
            'declaration_date', 'updated_at',
        ]


class DatasetUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetUpload
        fields = ['id', 'file_path', 'uploaded_at', 'processing_status', 'row_count', 'error_message']
