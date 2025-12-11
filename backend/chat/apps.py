from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'

    def ready(self):
        """애플리케이션 시작 시 Qdrant 초기화"""
        # 중복 초기화 방지 (Django는 reload 시 2번 실행될 수 있음)
        import sys
        if 'runserver' not in sys.argv and 'gunicorn' not in sys.argv[0]:
            return

        try:
            from agent_core.config import initialize_qdrant
            initialize_qdrant()
            logger.info("Qdrant collections initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant: {e}")
            # 프로덕션에서는 애플리케이션 시작 실패로 처리하려면 주석 해제
            # raise
