"""
analytics/views/export.py – Export container data as CSV or Excel
"""

import logging
import io
import pandas as pd
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse

from rest_framework.permissions import IsAuthenticated
from analytics.models import Container

logger = logging.getLogger('analytics')


class ExportView(APIView):
    permission_classes = [IsAuthenticated]
    """
    GET /export/?format=csv|xlsx&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

    Streams container data for the authenticated user.
    """

    def get(self, request):
        fmt = request.query_params.get('format', 'csv').lower()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if fmt not in ('csv', 'xlsx'):
            return Response({'error': "format must be 'csv' or 'xlsx'."}, status=400)

        qs = Container.objects.filter(user=request.user)

        # Filter by specific upload job (per-file export)
        upload_id = request.query_params.get('upload_id')
        if upload_id:
            qs = qs.filter(upload_id=upload_id)

        if start_date:
            try:
                qs = qs.filter(declaration_date__gte=start_date)
            except Exception:
                return Response({'error': 'Invalid start_date format. Use YYYY-MM-DD.'}, status=400)

        if end_date:
            try:
                qs = qs.filter(declaration_date__lte=end_date)
            except Exception:
                return Response({'error': 'Invalid end_date format. Use YYYY-MM-DD.'}, status=400)

        if not qs.exists():
            return Response({'error': 'No data found for given filters.'}, status=404)

        df = pd.DataFrame(qs.values(
            'container_id', 'declared_value', 'weight', 'measured_weight',
            'risk_score', 'risk_level',
            'anomaly_flag', 'explanation', 'declaration_date', 'updated_at'
        ))

        # Rename for presentation
        df.columns = [
            'Container_ID', 'Declared_Value', 'Declared_Weight', 'Measured_Weight',
            'Risk_Score', 'Risk_Level',
            'Anomaly_Flag', 'Explanation', 'Declaration_Date', 'Updated_At'
        ]
        df = df.sort_values('Risk_Score', ascending=False)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        fname = f'container_risks_{timestamp}'

        if fmt == 'csv':
            csv_data = df.to_csv(index=False)
            response = HttpResponse(csv_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{fname}.csv"'
        else:
            buffer = io.BytesIO()
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='Container Risks')
            buffer.seek(0)
            response = HttpResponse(
                buffer.read(),
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{fname}.xlsx"'

        logger.info(
            f'User {request.user.username} exported {len(df)} rows as {fmt}'
        )
        return response
