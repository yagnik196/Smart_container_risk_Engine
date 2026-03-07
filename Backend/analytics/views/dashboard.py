"""
analytics/views/dashboard.py – Summary, Container List, Anomalies
"""

import logging
from django.core.cache import cache
from django.db.models import Count, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from analytics.models import Container, DatasetUpload
from analytics.serializers import ContainerSerializer

logger = logging.getLogger('analytics')

CACHE_TTL = 60  # seconds


class DashboardSummaryView(APIView):
    """GET /dashboard/summary/ – Aggregate metrics for the user."""

    def get(self, request):
        user = request.user
        cache_key = f'dashboard:summary:{user.id}'
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f'Dashboard cache hit for user {user.id}')
            return Response(cached)

        qs = Container.objects.filter(user=user)
        total = qs.count()

        if total == 0:
            data = {
                'total_containers': 0,
                'critical_containers': 0,
                'low_risk_containers': 0,
                'avg_risk_score': 0.0,
                'anomaly_count': 0,
                'risk_distribution': {'Critical': 0, 'Medium': 0, 'Low Risk': 0},
                'latest_upload_id': None,
            }
            return Response(data)

        agg = qs.aggregate(avg_risk=Avg('risk_score'))
        critical = qs.filter(risk_level='Critical').count()
        medium = qs.filter(risk_level='Medium').count()
        low_risk = qs.filter(risk_level='Low Risk').count()
        anomalies = qs.filter(anomaly_flag=True).count()

        latest_upload = DatasetUpload.objects.filter(user=user, processing_status=DatasetUpload.STATUS_COMPLETED).order_by('-uploaded_at').first()

        data = {
            'total_containers': total,
            'critical_containers': critical,
            'low_risk_containers': low_risk,
            'avg_risk_score': round(agg['avg_risk'] or 0, 2),
            'anomaly_count': anomalies,
            'risk_distribution': {
                'Critical': critical,
                'Medium': medium,
                'Low Risk': low_risk,
            },
            'latest_upload_id': str(latest_upload.id) if latest_upload else None,
        }

        cache.set(cache_key, data, timeout=CACHE_TTL)
        logger.info(f'Dashboard summary computed for user {user.id}: {total} containers')
        return Response(data)


class ContainerListView(APIView):
    """GET /dashboard/containers/ – Paginated container list (sorted by risk_score desc).

    Query params:
        risk_level: 'Critical' | 'Medium' | 'Low Risk'  (optional)
        upload_id:  UUID of a specific DatasetUpload to filter by  (optional)
        page_size:  number of results per page, max 1000, default 500  (optional)
    """

    def get(self, request):
        qs = Container.objects.filter(user=request.user).order_by('-risk_score')

        # Optional filters
        risk_level = request.query_params.get('risk_level')
        if risk_level:
            qs = qs.filter(risk_level=risk_level)

        upload_id = request.query_params.get('upload_id')
        if upload_id:
            qs = qs.filter(upload_id=upload_id)

        # Configurable page size (default 500, max 1000)
        try:
            page_size = min(int(request.query_params.get('page_size', 500)), 1000)
        except (ValueError, TypeError):
            page_size = 500

        paginator = PageNumberPagination()
        paginator.page_size = page_size
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ContainerSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AnomalyListView(APIView):
    """GET /dashboard/anomalies/ – Containers flagged as anomalies.

    Query params:
        upload_id: UUID of a specific DatasetUpload to filter by  (optional)
    """

    def get(self, request):
        qs = Container.objects.filter(user=request.user, anomaly_flag=True)

        upload_id = request.query_params.get('upload_id')
        if upload_id:
            qs = qs.filter(upload_id=upload_id)

        paginator = PageNumberPagination()
        paginator.page_size = 500
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ContainerSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
