"""analytics/models.py – DatasetUpload and Container models"""

import uuid
from django.db import models
from django.contrib.auth.models import User


class DatasetUpload(models.Model):
    """Tracks every uploaded dataset and its processing state."""

    STATUS_PENDING = 'pending'
    STATUS_PROCESSING = 'processing'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploads')
    file_path = models.CharField(max_length=500)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    processing_status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    row_count = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'Upload {self.id} by {self.user.username} [{self.processing_status}]'


class Container(models.Model):
    """
    Stores the *latest* risk assessment for each container per user.
    unique_together(user, container_id) → one row per container per user,
    updated in place on every re-run.
    """

    RISK_CRITICAL = 'Critical'
    RISK_MEDIUM = 'Medium'
    RISK_LOW = 'Low Risk'

    RISK_CHOICES = [
        (RISK_CRITICAL, 'Critical'),
        (RISK_MEDIUM, 'Medium'),
        (RISK_LOW, 'Low Risk'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='containers')
    # Link to the upload job this container came from (nullable for backward compat)
    upload = models.ForeignKey(
        'DatasetUpload', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='containers'
    )
    container_id = models.CharField(max_length=100)
    risk_score = models.FloatField()
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES)
    anomaly_flag = models.BooleanField(default=False)
    explanation = models.TextField(blank=True)
    declared_value = models.FloatField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)           # declared weight
    measured_weight = models.FloatField(null=True, blank=True)  # measured / scanned weight
    declaration_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'container_id')
        ordering = ['-risk_score']
        indexes = [
            models.Index(fields=['user', 'risk_level']),
            models.Index(fields=['user', 'anomaly_flag']),
            models.Index(fields=['user', 'declaration_date']),
        ]

    def __str__(self):
        return f'{self.container_id} | {self.risk_level} ({self.risk_score:.1f})'
