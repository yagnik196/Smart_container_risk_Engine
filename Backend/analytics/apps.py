"""analytics/apps.py – Load ML models at server startup"""

import logging
from django.apps import AppConfig

logger = logging.getLogger('analytics')


class AnalyticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'analytics'

    def ready(self):
        """Pre-load the ML models into memory when Django starts."""
        try:
            from .ml_engine import get_engine
            get_engine()
            logger.info('ML models loaded successfully via AppConfig.ready()')
        except Exception as exc:
            logger.error(f'Could not pre-load ML models: {exc}')
