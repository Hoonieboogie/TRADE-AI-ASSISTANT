"""
설정 및 클라이언트 초기화

전역 설정 상수와 외부 API 클라이언트를 초기화합니다.
"""

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from openai import OpenAI

# 환경 변수 로드
load_dotenv()

# =====================================================================
# 클라이언트 초기화
# =====================================================================

# Qdrant Vector DB 클라이언트
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
    timeout=60
)

# OpenAI 클라이언트 (Embedding 및 Agent용)
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# =====================================================================
# 설정 상수
# =====================================================================

# Qdrant 컬렉션 이름
COLLECTION_KNOWLEDGE = "collection_trade"  # 공통 무역 지식
COLLECTION_USER_DOCS = "collection_trade_user_documents"  # 사용자 업로드 문서

# 하위 호환성을 위한 별칭
COLLECTION_NAME = COLLECTION_KNOWLEDGE

# OpenAI 설정
EMBEDDING_MODEL = "text-embedding-3-large"  # OpenAI Embedding 모델
VECTOR_SIZE = 3072  # text-embedding-3-large 차원

# Reranker 설정
RERANKER_API_URL = os.getenv("RERANKER_API_URL", "http://your-runpod-server/rerank")  # Reranker API 엔드포인트

# Reranker 사용 여부 (실행 시 설정됨)
USE_RERANKER = True  # 기본값
# 복합 질문 시 서브 쿼리별 개별 Reranking 사용 여부
# True: 각 서브 쿼리마다 개별 rerank → 모든 토픽 균형 보장
# False: 통합 rerank → 전체 품질 우선 (일부 토픽 누락 가능)
USE_PER_QUERY_RERANK = True  # 기본값


# =====================================================================
# Collection 초기화
# =====================================================================

def initialize_qdrant():
    """
    Qdrant Collection 초기화

    Django/FastAPI의 startup 이벤트에서 호출하세요.
    """
    from agent_core.collection_manager import CollectionManager

    manager = CollectionManager(qdrant_client)
    manager.initialize_all_collections()
