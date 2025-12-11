"""
Langfuse 설정 및 프롬프트 로딩 유틸리티

Langfuse SDK를 통한 프롬프트 버전 관리
"""

import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# =====================================================================
# Langfuse 설정
# =====================================================================

LANGFUSE_PUBLIC_KEY = os.getenv("LANGFUSE_PUBLIC_KEY")
LANGFUSE_SECRET_KEY = os.getenv("LANGFUSE_SECRET_KEY")
LANGFUSE_HOST = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
LANGFUSE_ENABLED = bool(LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY)

# Langfuse 클라이언트 싱글톤
_langfuse_client = None


def get_langfuse_client():
    """Langfuse 클라이언트 싱글톤 반환"""
    global _langfuse_client
    if _langfuse_client is None and LANGFUSE_ENABLED:
        from langfuse import Langfuse
        _langfuse_client = Langfuse(
            public_key=LANGFUSE_PUBLIC_KEY,
            secret_key=LANGFUSE_SECRET_KEY,
            host=LANGFUSE_HOST
        )
        print("✅ Langfuse SDK 클라이언트 초기화 완료")
    return _langfuse_client


# =====================================================================
# 프롬프트 로딩 함수
# =====================================================================

def load_prompt_from_langfuse(
    prompt_name: str,
    version: int | None = None,
    label: str = "latest",
    **variables
) -> str:
    """
    Langfuse SDK를 통해 프롬프트를 가져오고 변수 치환

    Args:
        prompt_name: Langfuse에 등록된 프롬프트 이름
        version: 특정 버전 번호 (None이면 label 기준)
        label: 버전 레이블 ("production", "latest" 등)
        **variables: 프롬프트 템플릿 변수들

    Returns:
        변수가 치환된 프롬프트 문자열
    """
    client = get_langfuse_client()
    if not client:
        raise Exception("Langfuse가 비활성화되어 있습니다")

    try:
        # 프롬프트 가져오기
        if version is not None:
            prompt = client.get_prompt(prompt_name, version=version)
            print(f"✅ Langfuse 프롬프트 로드: {prompt_name} (버전: {version})")
        else:
            prompt = client.get_prompt(prompt_name, label=label)
            print(f"✅ Langfuse 프롬프트 로드: {prompt_name} (label: {label})")

        # 변수 치환 (있으면)
        if variables:
            return prompt.compile(**variables)
        else:
            return prompt.compile()

    except Exception as e:
        raise Exception(f"Langfuse 프롬프트 로드 실패: {e}")


def load_prompt_from_file(filename: str = "trade_instructions.txt") -> str:
    """
    로컬 파일에서 프롬프트 로드 (Fallback용)

    Args:
        filename: 프롬프트 파일명 (prompts/ 디렉토리 내)

    Returns:
        파일 내용 (프롬프트 문자열)
    """
    current_dir = os.path.dirname(__file__)
    prompts_dir = os.path.join(current_dir, "prompts")
    file_path = os.path.join(prompts_dir, filename)

    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()
