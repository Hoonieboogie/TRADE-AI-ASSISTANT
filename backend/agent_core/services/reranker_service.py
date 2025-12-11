"""
Reranker API 연동 서비스

RunPod 서버의 Reranker API를 호출하여 문서를 재정렬
"""

from typing import List
import httpx

from agent_core.config import RERANKER_API_URL
from agent_core.models.reranker import RerankRequest, RerankResponse


async def call_reranker_api(query: str, documents: List[str], top_k: int = 5) -> RerankResponse:
    """
    RunPod 서버의 Reranker API를 호출하여 문서를 재정렬

    Args:
        query: 검색 쿼리
        documents: 재정렬할 문서 텍스트 리스트
        top_k: 반환할 상위 문서 개수

    Returns:
        RerankResponse: 재정렬된 결과 (인덱스, 점수 포함)

    Raises:
        httpx.HTTPError: API 호출 실패 시
        Exception: 기타 예상치 못한 오류 시
    """
    print(f"\n🔄 Reranker API 호출 중... (문서 {len(documents)}개 → top {top_k}개)")

    # 요청 데이터 생성 (Pydantic 모델 활용)
    request_data = RerankRequest(
        query=query,
        documents=documents,
        top_k=top_k,
        return_documents=True
    )

    try:
        # 비동기 HTTP 클라이언트로 POST 요청 (reranker 서버는 동기 방식으로 처리함)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                RERANKER_API_URL,
                json=request_data.model_dump(),  # Pydantic 모델을 dict로 변환
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()  # HTTP 에러 발생 시 예외 발생

            # 응답을 Pydantic 모델로 변환
            rerank_response = RerankResponse(**response.json())
            print(f"✓ Reranker 완료: {len(rerank_response.results)}개 문서 반환\n")

            return rerank_response

    except httpx.HTTPError as e:
        print(f"⚠️  Reranker API 호출 실패: {e}")
        print("기본 검색 결과를 사용합니다.\n")
        raise
    except Exception as e:
        print(f"⚠️  예상치 못한 오류: {e}")
        print("기본 검색 결과를 사용합니다.\n")
        raise
