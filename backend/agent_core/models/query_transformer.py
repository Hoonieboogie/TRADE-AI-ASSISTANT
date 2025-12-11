"""
쿼리 변환 결과를 담는 데이터 모델 (Pydantic)

LLM이 반환하는 JSON을 이 클래스로 변환해서 타입 안전하게 사용
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class QueryTransformResult(BaseModel):
    """
    쿼리 변환 결과

    예시:
    {
        "rewritten_query": "무역 사기 예방 및 대응 방법",
        "sub_queries": null,  # 단순 질문이라 분해 안 함
        "reasoning": "단일 주제 질문이므로 분해 불필요"
    }

    또는:

    {
        "rewritten_query": "수출과 수입의 절차 차이",
        "sub_queries": ["수출 절차 요건", "수입 절차 요건"],  # 복합 질문
        "reasoning": "수출/수입 비교 질문이므로 각각 검색 후 통합"
    }
    """
    rewritten_query: str = Field(
        ...,
        description="검색에 최적화된 개선된 쿼리"
    )
    sub_queries: Optional[List[str]] = Field(
        default=None,
        description="복합 질문이면 분해된 서브쿼리 리스트, 아니면 None"
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="LLM이 왜 이렇게 변환했는지 설명 (디버깅용)"
    )
