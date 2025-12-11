"""
Reranker API 모델 정의 (Pydantic)

RunPod 서버와 통신하기 위한 요청/응답 데이터 모델
"""

from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class RerankRequest(BaseModel):
    """
    Reranker API 요청 모델

    RunPod 서버로 전송할 리랭킹 요청 데이터 구조
    """
    query: str = Field(..., description="검색 쿼리")
    documents: List[str] = Field(..., description="리랭킹할 문서 리스트")
    top_k: int = Field(default=5, ge=1, le=100, description="반환할 상위 문서 개수")
    return_documents: bool = Field(default=True, description="문서 내용 포함 여부")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "규칙적인 운동의 건강상 이점은 무엇인가요?",
                "documents": [
                    "규칙적인 신체 활동은 칼로리를 연소하고 근육량을 늘려 체중 조절에 도움이 됩니다.",
                    "올림픽 게임의 역사는 기원전 776년경 고대 그리스로 거슬러 올라갑니다."
                ],
                "top_k": 5,
                "return_documents": True
            }
        }
    )


class RerankResult(BaseModel):
    """
    리랭킹 결과 항목

    각 문서의 재정렬 결과 (인덱스, 점수, 내용)
    """
    index: int  # 원본 문서 리스트에서의 인덱스
    score: float  # Reranker가 계산한 관련도 점수
    document: Optional[str] = None  # 문서 내용 (return_documents=True일 때만)


class RerankResponse(BaseModel):
    """
    Reranker API 응답 모델

    서버로부터 받은 리랭킹 결과 전체
    """
    results: List[RerankResult]  # 재정렬된 문서 리스트
    query: str  # 원본 쿼리
    total_documents: int  # 총 문서 개수
