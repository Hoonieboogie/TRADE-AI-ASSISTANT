"""
유틸리티 함수

텍스트 처리 및 문서 출력을 위한 헬퍼 함수들
"""


def dedup_consecutive_lines(text: str) -> str:
    """
    연속된 중복 라인 제거

    Args:
        text: 원본 텍스트

    Returns:
        중복 라인이 제거된 텍스트
    """
    lines = text.splitlines()
    cleaned = []
    prev = None
    for line in lines:
        stripped = line.rstrip()
        if stripped == prev:  # 이전 라인과 동일하면 스킵
            continue
        cleaned.append(line)
        prev = stripped
    return "\n".join(cleaned)


def print_retrieved_documents(points, n: int = None):
    """
    검색된 문서를 콘솔에 출력 (디버깅용)

    Args:
        points: Qdrant 검색 결과 포인트 리스트
        n: 출력할 문서 개수 (None이면 전체 출력)
    """
    if not points:
        print("⚠️  검색 결과가 없습니다.\n")
        return

    display_points = points[:n] if n else points

    print("="*60)
    print(f"📄 검색된 문서 (총 {len(points)}개 중 {len(display_points)}개 표시)")
    print("="*60)

    for i, point in enumerate(display_points, 1):
        # text 또는 content 필드에서 내용 가져오기 (데이터 소스마다 다름)
        content = point.payload.get("text") or point.payload.get("content") or ""
        if content:
            content = content[:500]
        score = point.score
        source_tag = point.payload.get("data_source", "unknown")

        # 콘솔 출력 (LLM에게는 전달되지 않음)
        print(f"\n문서 {i}:")
        print(f"  출처: {source_tag}")
        print(f"  점수: {score:.3f}")
        print(f"  내용: {content[:200]}{'...' if len(content) > 200 else ''}")

    print("\n" + "=" * 60)
