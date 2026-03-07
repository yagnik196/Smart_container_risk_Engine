"""
analytics/management/commands/backfill_containers.py

Re-processes all completed DatasetUpload files to populate:
  - declared_value  (null in rows before migration 0003)
  - weight          (null in rows before migration 0003)
  - measured_weight (null in rows before migration 0003)
  - explanation     (identical fallback text in rows before SHAP was installed)

Usage:
    python manage.py backfill_containers
    python manage.py backfill_containers --upload-id <uuid>   # single file
    python manage.py backfill_containers --dry-run             # preview only
"""

import logging
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger('analytics')


class Command(BaseCommand):
    help = 'Re-run ML inference on completed uploads to back-fill null columns and fix identical explanations.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--upload-id',
            type=str,
            default=None,
            help='Limit back-fill to a specific DatasetUpload UUID.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Print what would be updated without writing to the DB.',
        )

    def handle(self, *args, **options):
        from analytics.models import DatasetUpload, Container
        from analytics.ml_engine import get_engine
        from analytics.column_mapper import apply_column_mapping

        upload_id = options['upload_id']
        dry_run = options['dry_run']

        # --- Fetch uploads to process ---
        qs = DatasetUpload.objects.filter(processing_status=DatasetUpload.STATUS_COMPLETED)
        if upload_id:
            qs = qs.filter(id=upload_id)

        uploads = list(qs)
        self.stdout.write(f'Found {len(uploads)} completed upload(s) to back-fill.')

        engine = get_engine()

        total_updated = 0

        for upload in uploads:
            self.stdout.write(f'\n[{upload.id}] Loading {upload.file_path} …')
            try:
                ext = upload.file_path.rsplit('.', 1)[-1].lower()
                if ext == 'csv':
                    df = pd.read_csv(upload.file_path)
                else:
                    df = pd.read_excel(upload.file_path)

                df = apply_column_mapping(df)
                results = engine.predict(df)

                self.stdout.write(f'  Inference done: {len(results)} rows.')

                if dry_run:
                    sample = results.head(3)
                    self.stdout.write(f'  DRY-RUN sample:\n{sample[["Container_ID","Declared_Value","Weight","Explanation"]].to_string()}')
                    continue

                # Build lookup for existing containers
                existing = {
                    c.container_id: c
                    for c in Container.objects.filter(
                        user=upload.user,
                        container_id__in=results['Container_ID'].tolist(),
                    )
                }

                to_update = []
                for _, row in results.iterrows():
                    cid = str(row['Container_ID'])
                    if cid not in existing:
                        continue

                    c = existing[cid]
                    c.upload = upload
                    c.declared_value = float(row['Declared_Value']) if pd.notna(row.get('Declared_Value')) else None
                    c.weight = float(row['Weight']) if pd.notna(row.get('Weight')) else None
                    c.measured_weight = float(row['Measured_Weight']) if pd.notna(row.get('Measured_Weight')) else None
                    c.explanation = row['Explanation']
                    to_update.append(c)

                with transaction.atomic():
                    Container.objects.bulk_update(
                        to_update,
                        ['upload', 'declared_value', 'weight', 'measured_weight', 'explanation'],
                        batch_size=500,
                    )

                self.stdout.write(self.style.SUCCESS(
                    f'  Updated {len(to_update)} containers for upload {upload.id}'
                ))
                total_updated += len(to_update)

            except FileNotFoundError:
                self.stdout.write(self.style.WARNING(
                    f'  Skipped {upload.id}: file not found at {upload.file_path}'
                ))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(
                    f'  FAILED {upload.id}: {exc}'
                ))
                logger.exception(f'backfill_containers failed for {upload.id}')

        self.stdout.write(self.style.SUCCESS(
            f'\nBack-fill complete. {total_updated} containers updated across {len(uploads)} upload(s).'
        ))
