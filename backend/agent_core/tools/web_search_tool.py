"""
웹 검색 Tool (Tavily API)

실시간 웹 검색으로 내부 문서에 없는 최신 정보를 찾습니다.
- 최신 뉴스 및 업데이트(예: "최근 무역 동향은?")
- 시장 동향 및 규제 변경사항(예: "관세율 변화", "최신 분쟁", "해외 선거" 등의 이슈)
- 정보 검증 및 크로스체크
"""

import os
from typing import Optional
from agents import function_tool
from tavily import TavilyClient


# Tavily 클라이언트 초기화
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))


@function_tool
def search_web(
    query: str,
    max_results: int = 5,
    search_depth: str = "basic",
    include_answer: bool = True
) -> str:
    """
    Tavily API를 사용한 실시간 웹 검색

    내부 문서에 정보가 없거나 최신 정보가 필요할 때 사용하세요.

    사용 시나리오:
    - 최근 뉴스나 이벤트 (예: "2025년 무역 규제 변경사항", "중일분쟁", "러시아-우크라이나 전쟁")
    - 실시간 시장 정보 (예: "현재 환율 동향")
    - 최신 규제 업데이트 (예: "미국 수출 규제 최신 변경")
    - 정보 검증 (예: "특정 기업의 최근 무역 사기 사례", "특정 국가와의 거래에서 최근 사례)

    Args:
        query: 검색할 질문 또는 키워드
        max_results: 반환할 검색 결과 수 (1-10, 기본값: 5)
        search_depth: 검색 깊이 "basic" 또는 "advanced" (기본값: "basic")
        include_answer: AI 요약 답변 포함 여부 (기본값: True)

    Returns:
        포맷팅된 검색 결과 텍스트 (출처 URL 포함)
    """
    print(f"\n🌐 웹 검색 시작: '{query}' (최대 {max_results}개 결과, {search_depth} 모드)")

    try:
        # Tavily API로 웹 검색 수행
        response = tavily_client.search(
            query=query,
            search_depth=search_depth,
            max_results=max_results,
            include_answer=include_answer,
            topic="general"
        )

        # 검색 결과 포맷팅
        formatted_results = []

        # AI 생성 요약 답변 추가 (있는 경우)
        if include_answer and response.get('answer'):
            formatted_results.append("=" * 60)
            formatted_results.append("📌 AI 요약 답변:")
            formatted_results.append("=" * 60)
            formatted_results.append(response['answer'])
            formatted_results.append("")

        # 검색 결과 추가
        if response.get('results'):
            num_results = len(response['results'])
            formatted_results.append("=" * 60)
            formatted_results.append(f"🔍 웹 검색 결과 ({num_results}개):")
            formatted_results.append("=" * 60)

            for i, result in enumerate(response['results'], 1):
                title = result.get('title', 'No title')
                url = result.get('url', '')
                content = result.get('content', '')
                score = result.get('score', 0)

                # 내용이 너무 길면 잘라냄 (500자로 제한)
                content_preview = content[:500] + "..." if len(content) > 500 else content

                formatted_results.append(f"\n[{i}] {title}")
                formatted_results.append(f"   URL: {url}")
                formatted_results.append(f"   관련도: {score:.2f}")
                formatted_results.append(f"   내용: {content_preview}")

            print(f"✓ 웹 검색 완료: {num_results}개 결과 반환\n")
            return "\n".join(formatted_results)

        else:
            # 검색 결과가 없는 경우
            no_result_msg = f"'{query}'에 대한 웹 검색 결과가 없습니다."
            print(f"⚠️  {no_result_msg}\n")
            return no_result_msg

    except Exception as e:
        # 에러 발생 시
        error_msg = f"⚠️ 웹 검색 실패: {str(e)}"
        print(f"{error_msg}\n")
        return f"웹 검색 중 오류가 발생했습니다: {str(e)}"
