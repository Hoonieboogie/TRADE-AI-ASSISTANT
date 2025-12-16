"""
에이전트 팩토리

모든 AI Agent 생성 함수를 통합 관리
- get_trade_agent: 일반 무역 Q&A (Langfuse 지원)
- get_document_writing_agent: 문서 작성/편집 (Langfuse 지원)
- get_read_document_agent: 업로드 문서 Q&A (Langfuse 지원)

Langfuse 우선 로드 → 실패 시 로컬 fallback
"""

from agents import Agent

from agent_core.tools.search_tool import search_trade_documents, search_user_document
from agent_core.tools.web_search_tool import search_web
from agent_core.langfuse_config import (
    LANGFUSE_ENABLED,
    load_prompt_from_langfuse,
    load_prompt_from_file,
)
from agent_core.prompts.fallback import (
    DOCUMENT_WRITING_PROMPT,
    DOCUMENT_READ_PROMPT,
)


# =====================================================================
# 1. 무역 전문가 Agent (일반 Q&A)
# =====================================================================

def get_trade_agent(
    prompt_version: int | None = None,
    prompt_label: str = "latest"
) -> Agent:
    """
    무역 전문가 Agent 생성

    일반 무역 관련 질의응답을 처리하는 Agent
    Langfuse 우선 로드, 실패 시 로컬 프롬프트 사용

    Args:
        prompt_version: Langfuse 프롬프트 특정 버전 (None이면 label 기준)
        prompt_label: Langfuse 프롬프트 레이블 ("production", "latest" 등)

    Returns:
        Agent 인스턴스
    """
    if LANGFUSE_ENABLED:
        try:
            instructions = load_prompt_from_langfuse(
                prompt_name="trade_assistant_v1",
                version=prompt_version,
                label=prompt_label
            )
        except Exception as e:
            print(f"⚠️ Langfuse 로드 실패, 로컬 프롬프트로 대체: {e}")
            instructions = load_prompt_from_file()
    else:
        print("📁 Langfuse 비활성화, 로컬 프롬프트 사용")
        instructions = load_prompt_from_file()

    return Agent(
        name="Trade Compliance Analyst",
        model="gpt-5.1",
        instructions=instructions,
        tools=[search_trade_documents, search_web],
    )


# =====================================================================
# 2. 문서 작성 Agent (에디터 수정 기능)
# =====================================================================

def get_document_writing_agent(
    document_content: str,
    prompt_version: int | None = None,
    prompt_label: str = "latest"
) -> Agent:
    """
    문서 작성 Agent 생성 (읽기 + 수정 기능)

    trade_agent의 모든 기능 + 문서 편집 기능
    Langfuse 우선 로드, 실패 시 로컬 프롬프트 사용

    Args:
        document_content: 현재 에디터의 HTML 내용
        prompt_version: Langfuse 프롬프트 특정 버전
        prompt_label: Langfuse 프롬프트 레이블

    Returns:
        Agent 인스턴스
    """
    if LANGFUSE_ENABLED:
        try:
            instructions = load_prompt_from_langfuse(
                prompt_name="writing_assistant_v1",
                version=prompt_version,
                label=prompt_label,
                document_content=document_content
            )
        except Exception as e:
            print(f"⚠️ Langfuse 로드 실패, 로컬 프롬프트로 대체: {e}")
            instructions = DOCUMENT_WRITING_PROMPT.format(
                document_content=document_content
            )
    else:
        print("📁 Langfuse 비활성화, 로컬 프롬프트 사용")
        instructions = DOCUMENT_WRITING_PROMPT.format(
            document_content=document_content
        )

    return Agent(
        name="Document Writing Assistant",
        model="gpt-5.1",
        instructions=instructions,
        tools=[search_trade_documents, search_web],
    )


# =====================================================================
# 3. 문서 읽기 Agent (업로드된 문서 전용)
# =====================================================================

def get_read_document_agent(
    document_id: int,
    document_name: str,
    document_type: str = "문서",
    prompt_version: int | None = None,
    prompt_label: str = "latest"
) -> Agent:
    """
    업로드 문서 전용 Agent 생성

    일반 무역 질의 + 현재 문서 내용 질의를 모두 처리하는 하이브리드 Agent
    Langfuse 우선 로드, 실패 시 로컬 프롬프트 사용

    Args:
        document_id: 현재 문서 ID
        document_name: 문서 파일명 (예: "Sales_Contract_ABC.pdf")
        document_type: 문서 타입 (예: "Offer Sheet", "Sales Contract")
        prompt_version: Langfuse 프롬프트 특정 버전
        prompt_label: Langfuse 프롬프트 레이블

    Returns:
        Agent 인스턴스
    """
    if LANGFUSE_ENABLED:
        try:
            instructions = load_prompt_from_langfuse(
                prompt_name="document_assistant_v1",
                version=prompt_version,
                label=prompt_label,
                document_id=document_id,
                document_name=document_name,
                document_type=document_type
            )
        except Exception as e:
            print(f"⚠️ Langfuse 로드 실패, 로컬 프롬프트로 대체: {e}")
            instructions = DOCUMENT_READ_PROMPT.format(
                document_id=document_id,
                document_name=document_name,
                document_type=document_type
            )
    else:
        print("📁 Langfuse 비활성화, 로컬 프롬프트 사용")
        instructions = DOCUMENT_READ_PROMPT.format(
            document_id=document_id,
            document_name=document_name,
            document_type=document_type
        )

    return Agent(
        name="Document Reader Assistant",
        model="gpt-5.1",
        instructions=instructions,
        tools=[search_user_document, search_trade_documents, search_web],
    )
