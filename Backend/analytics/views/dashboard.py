"""
analytics/views/dashboard.py – Summary, Container List, Anomalies
"""

import logging
from django.core.cache import cache
from django.db.models import Count, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from analytics.models import Container
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
                'risk_distribution': {'Critical': 0, 'Low Risk': 0},
            }
            return Response(data)

        agg = qs.aggregate(avg_risk=Avg('risk_score'))
        critical = qs.filter(risk_level='Critical').count()
        low_risk = qs.filter(risk_level='Low Risk').count()
        anomalies = qs.filter(anomaly_flag=True).count()

        data = {
            'total_containers': total,
            'critical_containers': critical,
            'low_risk_containers': low_risk,
            'avg_risk_score': round(agg['avg_risk'] or 0, 2),
            'anomaly_count': anomalies,
            'risk_distribution': {
                'Critical': critical,
                'Low Risk': low_risk,
            },
        }

        cache.set(cache_key, data, timeout=CACHE_TTL)
        logger.info(f'Dashboard summary computed for user {user.id}: {total} containers')
        return Response(data)


class ContainerListView(APIView):
    """GET /dashboard/containers/ – Paginated container list (sorted by risk_score desc)."""

    def get(self, request):
        qs = Container.objects.filter(user=request.user)

        # Optional filters
        risk_level = request.query_params.get('risk_level')
        if risk_level:
            qs = qs.filter(risk_level=risk_level)

        paginator = PageNumberPagination()
        paginator.page_size = 50
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ContainerSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AnomalyListView(APIView):
    """GET /dashboard/anomalies/ – Containers flagged as anomalies."""

    def get(self, request):
        qs = Container.objects.filter(user=request.user, anomaly_flag=True)
        paginator = PageNumberPagination()
        paginator.page_size = 50
        result_page = paginator.paginate_queryset(qs, request)
        serializer = ContainerSerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
