"""Celery application configuration for background tasks."""

from __future__ import annotations

import logging

from src.config import settings

logger = logging.getLogger(__name__)

try:
    from celery import Celery

    celery_app = Celery(
        "eka_tasks",
        broker=settings.celery_broker_url,
        backend=settings.celery_result_backend,
        include=["src.worker.tasks"],
    )

    celery_app.conf.update(
        task_serializer="json",
        accept_content=["json"],
        result_serializer="json",
        timezone="UTC",
        enable_utc=True,
        task_track_started=True,
        task_time_limit=1800,
        worker_prefetch_multiplier=1,
        beat_schedule={
            "erp-reconciliation-every-14-days": {
                "task": "tasks.reconcile_all_tenants",
                "schedule": 14 * 86400,  # 14 days in seconds
            },
            "automated-daily-disaster-recovery-backup": {
                "task": "tasks.run_automated_backup",
                "schedule": 86400,  # 24 hours (daily at UTC midnight cycle)
            },
        },
    )

    @celery_app.task(name="tasks.ping")
    def ping() -> str:
        """Simple healthcheck task."""
        return "pong"

except ImportError:
    logger.info("celery package not installed; placeholder Celery app initialized.")

    class _MockCeleryApp:
        def __init__(self, *args, **kwargs):
            self.conf = {}

        def task(self, *args, **kwargs):
            def decorator(f):
                return f

            return decorator

    celery_app = _MockCeleryApp()

    def ping() -> str:
        return "pong"
