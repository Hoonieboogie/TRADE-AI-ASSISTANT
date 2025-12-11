"""
Qdrant Collection 관리자

두 개의 컬렉션을 관리합니다:
1. collection_trade: 공통 무역 지식 (이미 구축됨)
2. collection_trade_user_documents: 사용자 업로드 문서
"""

import logging
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PayloadSchemaType

logger = logging.getLogger(__name__)


class CollectionManager:
    """Qdrant Collection 생명주기 관리"""

    def __init__(self, client: QdrantClient):
        self.client = client

    def ensure_collection(
        self,
        collection_name: str,
        vector_size: int = 3072,  # text-embedding-3-large
        distance: Distance = Distance.COSINE
    ) -> None:
        """
        Collection 존재 보장 (idempotent)

        여러 인스턴스에서 동시 호출해도 안전하게 처리됩니다.

        Args:
            collection_name: 컬렉션 이름
            vector_size: 벡터 차원 (기본값: 3072)
            distance: 거리 측정 방식 (기본값: Cosine)
        """
        try:
            if self.client.collection_exists(collection_name=collection_name):
                logger.info(f"✓ Collection '{collection_name}' already exists")
                return

            logger.info(f"Creating collection '{collection_name}'...")

            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=distance
                )
            )

            logger.info(f"✓ Collection '{collection_name}' created successfully")

        except Exception as e:
            # Race condition 처리: 다른 인스턴스가 먼저 생성했을 수 있음
            if self.client.collection_exists(collection_name=collection_name):
                logger.info(f"✓ Collection '{collection_name}' exists (created by another instance)")
            else:
                logger.error(f"Failed to create collection '{collection_name}': {e}")
                raise

    def create_payload_index(self, collection_name: str, field_name: str, field_type: PayloadSchemaType):
        """
        Payload 필드에 인덱스 생성 (필터링 성능 향상)

        Args:
            collection_name: 컬렉션 이름
            field_name: 인덱스를 생성할 필드명
            field_type: 필드 타입 (integer, keyword 등)
        """
        try:
            self.client.create_payload_index(
                collection_name=collection_name,
                field_name=field_name,
                field_schema=field_type
            )
            logger.info(f"✓ Created payload index on '{field_name}' in '{collection_name}'")
        except Exception as e:
            # 인덱스가 이미 존재하면 무시
            if "already exists" in str(e).lower():
                logger.info(f"✓ Payload index on '{field_name}' already exists")
            else:
                logger.warning(f"Failed to create payload index on '{field_name}': {e}")

    def initialize_all_collections(self):
        """모든 필요한 컬렉션 초기화"""

        # 1. 공통 무역 지식 컬렉션 (이미 존재할 수 있음)
        self.ensure_collection(
            collection_name="collection_trade",
            vector_size=3072,
            distance=Distance.COSINE
        )

        # 2. 사용자 업로드 문서 컬렉션 (새로 생성)
        user_docs_collection = "collection_trade_user_documents"
        self.ensure_collection(
            collection_name=user_docs_collection,
            vector_size=3072,
            distance=Distance.COSINE
        )

        # 2-1. document_id 필드에 인덱스 생성 (필터링 성능 향상)
        self.create_payload_index(
            collection_name=user_docs_collection,
            field_name="document_id",
            field_type=PayloadSchemaType.INTEGER
        )

        logger.info("All collections initialized successfully")
