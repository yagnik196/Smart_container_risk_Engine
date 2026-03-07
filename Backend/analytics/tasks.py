"""analytics/tasks.py – Celery task for async dataset processing"""

import logging
import json
import time
import pandas as pd
from celery import shared_task
from django.core.cache import cache
from django.contrib.auth.models import User
from django.db import transaction

logger = logging.getLogger('analytics')

# Redis TTL for job status (1 hour)
JOB_STATUS_TTL = 3600
# Redis key for dashboard cache invalidation
DASHBOARD_CACHE_KEY = 'dashboard:summary:{user_id}'


def _set_job_status(job_id: str, status: str, message: str = ''):
    cache.set(
        f'job_status:{job_id}',
        json.dumps({'status': status, 'message': message}),
        timeout=JOB_STATUS_TTL,
    )


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def process_dataset(self, upload_id: str, user_id: int):
    """
    Background Celery task:
    1. Load the saved CSV file
    2. Run ML inference
    3. Bulk upsert Container records
    4. Invalidate dashboard cache
    5. Mark upload complete
    """
    from .models import DatasetUpload, Container
    from .ml_engine import get_engine

    start = time.time()
    logger.info(f'[Task {upload_id}] Starting ML processing for user_id={user_id}')
    _set_job_status(upload_id, 'processing', 'Inference running …')

    try:
        upload = DatasetUpload.objects.get(id=upload_id)
        upload.processing_status = DatasetUpload.STATUS_PROCESSING
        upload.save(update_fields=['processing_status'])

        # ------------------------------------------------------------------
        # Load dataset
        # ------------------------------------------------------------------
        from analytics.column_mapper import apply_column_mapping
        file_path = upload.file_path
        ext = file_path.rsplit('.', 1)[-1].lower()
        if ext == 'csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)

        df = apply_column_mapping(df)
        logger.info(f'[Task {upload_id}] Loaded {len(df)} rows from {file_path}')

        # ------------------------------------------------------------------
        # ML Inference
        # ------------------------------------------------------------------
        engine = get_engine()
        results = engine.predict(df)

        logger.info(f'[Task {upload_id}] Inference complete. {len(results)} predictions.')

        # ------------------------------------------------------------------
        # Bulk upsert Container records
        # ------------------------------------------------------------------
        user = User.objects.get(id=user_id)
        containers_to_update = []
        containers_to_create = []

        existing = {
            c.container_id: c
            for c in Container.objects.filter(
                user=user, container_id__in=results['Container_ID'].tolist()
            )
        }

        for _, row in results.iterrows():
            cid = str(row['Container_ID'])
            dec_date = row['Declaration_Date'] if pd.notna(row.get('Declaration_Date')) else None
            dec_val = row['Declared_Value'] if pd.notna(row.get('Declared_Value')) else None
            weight_val = row['Weight'] if pd.notna(row.get('Weight')) else None
            measured_weight_val = row['Measured_Weight'] if pd.notna(row.get('Measured_Weight')) else None

            if cid in existing:
                c = existing[cid]
                c.upload = upload
                c.risk_score = row['Risk_Score']
                c.risk_level = row['Risk_Level']
                c.anomaly_flag = bool(row['Anomaly_Flag'])
                c.explanation = row['Explanation']
                c.declaration_date = dec_date
                c.declared_value = dec_val
                c.weight = weight_val
                c.measured_weight = measured_weight_val
                containers_to_update.append(c)
            else:
                containers_to_create.append(Container(
                    user=user,
                    upload=upload,
                    container_id=cid,
                    risk_score=row['Risk_Score'],
                    risk_level=row['Risk_Level'],
                    anomaly_flag=bool(row['Anomaly_Flag']),
                    explanation=row['Explanation'],
                    declaration_date=dec_date,
                    declared_value=dec_val,
                    weight=weight_val,
                    measured_weight=measured_weight_val,
                ))

        with transaction.atomic():
            if containers_to_create:
                Container.objects.bulk_create(containers_to_create, batch_size=500)
            if containers_to_update:
                Container.objects.bulk_update(
                    containers_to_update,
                    ['upload', 'risk_score', 'risk_level', 'anomaly_flag', 'explanation',
                     'declaration_date', 'declared_value', 'weight', 'measured_weight'],
                    batch_size=500,
                )

        logger.info(
            f'[Task {upload_id}] DB upsert: {len(containers_to_create)} created, '
            f'{len(containers_to_update)} updated.'
        )

        # ------------------------------------------------------------------
        # Invalidate dashboard cache for this user
        # ------------------------------------------------------------------
        cache_key = DASHBOARD_CACHE_KEY.format(user_id=user_id)
        cache.delete(cache_key)

        # ------------------------------------------------------------------
        # Mark upload complete
        # ------------------------------------------------------------------
        upload.processing_status = DatasetUpload.STATUS_COMPLETED
        upload.row_count = len(df)
        upload.save(update_fields=['processing_status', 'row_count'])

        elapsed = round(time.time() - start, 2)
        msg = f'Processed {len(results)} containers in {elapsed}s.'
        _set_job_status(upload_id, 'completed', msg)
        logger.info(f'[Task {upload_id}] {msg}')

        return {'status': 'completed', 'rows': len(results), 'elapsed': elapsed}

    except DatasetUpload.DoesNotExist:
        logger.error(f'[Task {upload_id}] Upload record not found.')
        _set_job_status(upload_id, 'failed', 'Upload record not found.')
        raise

    except Exception as exc:
        logger.error(f'[Task {upload_id}] Processing failed: {exc}', exc_info=True)
        _set_job_status(upload_id, 'failed', str(exc))
        try:
            upload = DatasetUpload.objects.get(id=upload_id)
            upload.processing_status = DatasetUpload.STATUS_FAILED
            upload.error_message = str(exc)
            upload.save(update_fields=['processing_status', 'error_message'])
        except Exception:
            pass
        raise self.retry(exc=exc)
