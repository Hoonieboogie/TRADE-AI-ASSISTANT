"""
Mem0 Memory Service for Trade Assistant

메모리 구조:
1. 단기 메모리 (Short-term) - 전체 상세 유지:
   - 문서 채팅: doc_{doc_id}_short - 전체 대화 상세 저장
   - 일반 채팅: gen_chat_{gen_chat_id}_short - 전체 대화 상세 저장

2. 장기 메모리 (Long-term) - 10턴마다 요약:
   - 문서 채팅: doc_{doc_id}_long - 10턴마다 요약 누적
   - 일반 채팅: gen_chat_{gen_chat_id}_long - 10턴마다 요약 누적

3. 영구 기록:
   - RDS (PostgreSQL): 전체 대화 히스토리 (DocMessage, GenMessage 테이블)

검색 우선순위:
   - 단기(상세) 먼저 검색 → 장기(요약)로 보충
   - user_id 분리로 검색 충돌 방지
"""

import os
import logging
import concurrent.futures
from typing import List, Dict, Any, Optional
from mem0 import Memory

logger = logging.getLogger(__name__)


# ==================== 커스텀 프롬프트 ====================

PROMPTS = {
    # 단기 메모리용 (상세 저장)
    "short_term": """대화 내용을 상세하게 저장하세요.
저장: 구체적인 요청사항, 수치, 조건, 결정사항, 질문/답변 내용
제외: 인사말, 단순 확인 ("네", "알겠습니다" 등)""",

    # 장기 메모리용 (10턴 요약)
    "long_term_summary": """최근 10턴의 대화를 핵심만 요약하세요.
저장: 주요 결정사항, 합의된 조건, 중요한 변경사항
형식: 간결한 bullet point로 요약"""
}


class TradeMemoryService:
    """Mem0 메모리 관리 서비스 (싱글톤)"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._init_memory()

    def _init_memory(self):
        """Mem0 초기화"""
        try:
            # OpenAI API 키 설정
            if not os.getenv("OPENAI_API_KEY"):
                mem0_key = os.getenv("MEM0_API_KEY")
                if mem0_key:
                    os.environ["OPENAI_API_KEY"] = mem0_key

            # Qdrant 설정
            qdrant_url = os.getenv("QDRANT_URL")
            qdrant_key = os.getenv("QDRANT_API_KEY")

            if qdrant_url and qdrant_key:
                qdrant_config = {
                    "url": qdrant_url,
                    "api_key": qdrant_key,
                    "collection_name": "trade_memory"
                }
            else:
                qdrant_config = {
                    "host": os.getenv("QDRANT_HOST", "localhost"),
                    "port": int(os.getenv("QDRANT_PORT", 6333)),
                    "collection_name": "trade_memory"
                }

            config = {
                "vector_store": {"provider": "qdrant", "config": qdrant_config},
                "llm": {
                    "provider": "openai",
                    "config": {"model": "gpt-4o-mini", "temperature": 0.1, "max_tokens": 2000}
                },
                "embedder": {
                    "provider": "openai",
                    "config": {"model": "text-embedding-3-large"}
                }
            }

            self.memory = Memory.from_config(config)
            self._initialized = True
            logger.info("TradeMemoryService initialized (new structure: short/long separation)")

        except Exception as e:
            logger.error(f"TradeMemoryService init failed: {e}")
            raise

    # ==================== 내부 헬퍼 ====================

    def _add(self, user_id: str, messages: List[Dict], metadata: Dict, prompt: str = None) -> Dict:
        """메모리 추가"""
        try:
            kwargs = {"messages": messages, "user_id": user_id, "metadata": metadata}
            if prompt:
                kwargs["prompt"] = prompt
            return self.memory.add(**kwargs)
        except Exception as e:
            logger.error(f"Memory add failed for {user_id}: {e}")
            return {}

    def _get(self, user_id: str, query: str = None, limit: int = 10) -> List[Dict]:
        """메모리 조회"""
        try:
            if query:
                result = self.memory.search(query=query, user_id=user_id, limit=limit)
            else:
                result = self.memory.get_all(user_id=user_id, limit=limit)

            if isinstance(result, dict):
                return result.get('results', [])
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Memory get failed for {user_id}: {e}")
            return []

    def _delete(self, user_id: str) -> bool:
        """메모리 삭제 (Qdrant 직접 삭제 - user_id 필터링)"""
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.models import Filter, FieldCondition, MatchValue

            qdrant_url = os.getenv("QDRANT_URL")
            qdrant_key = os.getenv("QDRANT_API_KEY")

            if qdrant_url and qdrant_key:
                client = QdrantClient(url=qdrant_url, api_key=qdrant_key)
            else:
                client = QdrantClient(
                    host=os.getenv("QDRANT_HOST", "localhost"),
                    port=int(os.getenv("QDRANT_PORT", 6333))
                )

            # user_id 필터로 해당 메모리만 삭제
            client.delete(
                collection_name="trade_memory",
                points_selector=Filter(
                    must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
                )
            )
            logger.info(f"Deleted memories for user_id={user_id}")
            return True
        except Exception as e:
            logger.error(f"Memory delete failed for {user_id}: {e}")
            return False

    # ==================== 문서 채팅 메모리 ====================

    def add_doc_short_memory(self, doc_id: int, messages: List[Dict]) -> Dict:
        """문서 단기 메모리 저장 (상세)"""
        return self._add(
            f"doc_{doc_id}_short",
            messages,
            {"memory_type": "doc_short", "doc_id": doc_id},
            PROMPTS["short_term"]
        )

    def add_doc_long_memory(self, doc_id: int, messages: List[Dict], turn_range: str) -> Dict:
        """문서 장기 메모리 저장 (10턴 요약)"""
        return self._add(
            f"doc_{doc_id}_long",
            messages,
            {"memory_type": "doc_long", "doc_id": doc_id, "turn_range": turn_range},
            PROMPTS["long_term_summary"]
        )

    def get_doc_short_memory(self, doc_id: int, query: str = None, limit: int = 5) -> List[Dict]:
        """문서 단기 메모리 조회"""
        return self._get(f"doc_{doc_id}_short", query, limit)

    def get_doc_long_memory(self, doc_id: int, query: str = None, limit: int = 3) -> List[Dict]:
        """문서 장기 메모리 조회"""
        return self._get(f"doc_{doc_id}_long", query, limit)

    def delete_doc_memory(self, doc_id: int) -> bool:
        """문서 메모리 삭제 (단기 + 장기)"""
        short_result = self._delete(f"doc_{doc_id}_short")
        long_result = self._delete(f"doc_{doc_id}_long")
        return short_result and long_result

    def delete_trade_memory(self, trade_id: int, doc_ids: List[int]) -> bool:
        """Trade 삭제 시 관련 문서 메모리 일괄 삭제"""
        success_count = sum(1 for doc_id in doc_ids if self.delete_doc_memory(doc_id))
        logger.info(f"Deleted trade memory: trade_id={trade_id}, {success_count}/{len(doc_ids)} docs")
        return success_count == len(doc_ids)

    # ==================== 일반 채팅 메모리 ====================

    def add_gen_chat_short_memory(self, gen_chat_id: int, messages: List[Dict]) -> Dict:
        """일반채팅 단기 메모리 저장 (상세)"""
        return self._add(
            f"gen_chat_{gen_chat_id}_short",
            messages,
            {"memory_type": "gen_chat_short", "gen_chat_id": gen_chat_id},
            PROMPTS["short_term"]
        )

    def add_gen_chat_long_memory(self, gen_chat_id: int, messages: List[Dict], turn_range: str) -> Dict:
        """일반채팅 장기 메모리 저장 (10턴 요약)"""
        return self._add(
            f"gen_chat_{gen_chat_id}_long",
            messages,
            {"memory_type": "gen_chat_long", "gen_chat_id": gen_chat_id, "turn_range": turn_range},
            PROMPTS["long_term_summary"]
        )

    def get_gen_chat_short_memory(self, gen_chat_id: int, query: str = None, limit: int = 5) -> List[Dict]:
        """일반채팅 단기 메모리 조회"""
        return self._get(f"gen_chat_{gen_chat_id}_short", query, limit)

    def get_gen_chat_long_memory(self, gen_chat_id: int, query: str = None, limit: int = 3) -> List[Dict]:
        """일반채팅 장기 메모리 조회"""
        return self._get(f"gen_chat_{gen_chat_id}_long", query, limit)

    def delete_gen_chat_memory(self, gen_chat_id: int) -> bool:
        """일반채팅 메모리 삭제 (단기 + 장기)"""
        short_result = self._delete(f"gen_chat_{gen_chat_id}_short")
        long_result = self._delete(f"gen_chat_{gen_chat_id}_long")
        return short_result and long_result

    # ==================== 컨텍스트 빌더 ====================

    def build_doc_context(
        self,
        doc_id: int,
        query: str
    ) -> Dict[str, Any]:
        """
        문서 채팅용 컨텍스트 (단기 우선, 장기 보충)
        """
        context = {"short_memories": [], "long_memories": [], "context_summary": ""}

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                short_f = executor.submit(self.get_doc_short_memory, doc_id, query, 5)
                long_f = executor.submit(self.get_doc_long_memory, doc_id, query, 3)

                context["short_memories"] = short_f.result()
                context["long_memories"] = long_f.result()

            # 요약
            parts = []
            if context["short_memories"]:
                parts.append(f"상세 {len(context['short_memories'])}건")
            if context["long_memories"]:
                parts.append(f"요약 {len(context['long_memories'])}건")
            context["context_summary"] = ", ".join(parts) if parts else "없음"

        except Exception as e:
            logger.error(f"Build doc context failed: {e}")

        return context

    def build_gen_chat_context(
        self,
        gen_chat_id: int,
        query: str
    ) -> Dict[str, Any]:
        """
        일반채팅용 컨텍스트 (단기 우선, 장기 보충)
        """
        context = {"short_memories": [], "long_memories": [], "context_summary": ""}

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                short_f = executor.submit(self.get_gen_chat_short_memory, gen_chat_id, query, 5)
                long_f = executor.submit(self.get_gen_chat_long_memory, gen_chat_id, query, 3)

                context["short_memories"] = short_f.result()
                context["long_memories"] = long_f.result()

            # 요약
            parts = []
            if context["short_memories"]:
                parts.append(f"상세 {len(context['short_memories'])}건")
            if context["long_memories"]:
                parts.append(f"요약 {len(context['long_memories'])}건")
            context["context_summary"] = ", ".join(parts) if parts else "없음"

        except Exception as e:
            logger.error(f"Build gen_chat context failed: {e}")

        return context


# ==================== 싱글톤 인스턴스 반환 ====================

def get_memory_service() -> Optional[TradeMemoryService]:
    """메모리 서비스 인스턴스 반환"""
    try:
        return TradeMemoryService()
    except Exception as e:
        logger.warning(f"TradeMemoryService disabled: {e}")
        return None
