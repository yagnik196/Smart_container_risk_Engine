"""
analytics/views/upload.py – Dataset Upload, Manual Entry, Job Status
"""

import os
import json
import logging
import tempfile
import pandas as pd
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from analytics.models import DatasetUpload
from analytics.tasks import process_dataset
from analytics.ml_engine import REQUIRED_COLUMNS

logger = logging.getLogger('analytics')

ALLOWED_EXTENSIONS = {'csv', 'xls', 'xlsx'}
MAX_FILE_SIZE_BYTES = 52_428_800   # 50 MB


def _validate_columns(df: pd.DataFrame):
    """Return list of missing required columns."""
    df.columns = df.columns.str.strip()
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    return missing


class FileUploadView(APIView):
    """POST /datasets/upload/ – Upload CSV / XLS / XLSX dataset."""
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided.'}, status=400)

        # --- File extension validation ---
        ext = file_obj.name.rsplit('.', 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Unsupported file type ".{ext}". Allowed: {ALLOWED_EXTENSIONS}'},
                status=400,
            )

        # --- File size validation ---
        if file_obj.size > MAX_FILE_SIZE_BYTES:
            return Response(
                {'error': f'File too large ({file_obj.size} bytes). Max 50 MB.'},
                status=400,
            )

        # --- Save file to disk ---
        user_dir = settings.MEDIA_ROOT / f'user_{request.user.id}'
        user_dir.mkdir(parents=True, exist_ok=True)
        file_name = file_obj.name.replace(' ', '_')
        dest_path = user_dir / file_name

        with open(dest_path, 'wb') as f:
            for chunk in file_obj.chunks():
                f.write(chunk)

        # --- Column validation (peek at file) ---
        try:
            if ext == 'csv':
                df_peek = pd.read_csv(dest_path, nrows=5)
            else:
                df_peek = pd.read_excel(dest_path, nrows=5)
            missing = _validate_columns(df_peek)
            if missing:
                os.remove(dest_path)
                return Response(
                    {'error': 'Missing required columns.', 'missing_columns': missing},
                    status=400,
                )
        except Exception as exc:
            os.remove(dest_path)
            return Response({'error': f'Could not read file: {exc}'}, status=400)

        # --- Create DB record ---
        upload = DatasetUpload.objects.create(
            user=request.user,
            file_path=str(dest_path),
        )

        # --- Enqueue Celery task ---
        process_dataset.delay(str(upload.id), request.user.id)

        logger.info(
            f'User {request.user.username} uploaded {file_name} → job {upload.id}'
        )

        return Response({
            'message': 'File uploaded successfully. Processing started.',
            'job_id': str(upload.id),
            'file_name': file_name,
        }, status=status.HTTP_202_ACCEPTED)


class ManualEntryView(APIView):
    """POST /datasets/manual-entry/ – Submit container data as JSON."""
    parser_classes = [JSONParser]

    def post(self, request):
        data = request.data
        if not isinstance(data, list) or len(data) == 0:
            return Response(
                {'error': 'Provide a non-empty JSON array of container records.'},
                status=400,
            )

        # --- Write to temp CSV ---
        try:
            df = pd.DataFrame(data)
            missing = _validate_columns(df)
            if missing:
                return Response(
                    {'error': 'Missing required fields.', 'missing_columns': missing},
                    status=400,
                )
        except Exception as exc:
            return Response({'error': f'Invalid data format: {exc}'}, status=400)

        user_dir = settings.MEDIA_ROOT / f'user_{request.user.id}'
        user_dir.mkdir(parents=True, exist_ok=True)
        from django.utils import timezone
        ts = timezone.now().strftime('%Y%m%d_%H%M%S')
        dest_path = user_dir / f'manual_entry_{ts}.csv'
        df.to_csv(dest_path, index=False)

        upload = DatasetUpload.objects.create(
            user=request.user,
            file_path=str(dest_path),
        )

        process_dataset.delay(str(upload.id), request.user.id)

        logger.info(
            f'User {request.user.username} submitted manual entry → job {upload.id}'
        )

        return Response({
            'message': 'Data received. Processing started.',
            'job_id': str(upload.id),
            'row_count': len(df),
        }, status=status.HTTP_202_ACCEPTED)


class JobStatusView(APIView):
    """GET /datasets/status/<job_id>/ – Poll job processing status."""

    def get(self, request, job_id):
        raw = cache.get(f'job_status:{job_id}')
        if raw:
            return Response(json.loads(raw))

        # Fall back to DB
        try:
            upload = DatasetUpload.objects.get(id=job_id, user=request.user)
            return Response({
                'status': upload.processing_status,
                'message': upload.error_message or '',
                'row_count': upload.row_count,
            })
        except DatasetUpload.DoesNotExist:
            return Response({'error': 'Job not found.'}, status=404)
