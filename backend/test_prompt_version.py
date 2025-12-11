"""
현재 로드되는 프롬프트 버전 확인 스크립트
"""

import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent_core import get_trade_agent
from chat.config import PROMPT_VERSION, PROMPT_LABEL

print("=" * 60)
print("프롬프트 버전 확인")
print("=" * 60)

print(f"\n[환경 변수 설정]")
print(f"PROMPT_LABEL: {PROMPT_LABEL}")
print(f"PROMPT_VERSION: {PROMPT_VERSION}")

print(f"\n[Agent 생성 시도...]")
try:
    agent = get_trade_agent(
        prompt_version=PROMPT_VERSION,
        prompt_label=PROMPT_LABEL
    )
    print("✅ Agent 생성 성공")
    print(f"\n현재 로드된 프롬프트 길이: {len(agent.instructions)} 글자")
    print(f"프롬프트 시작 부분: {agent.instructions[:100]}...")
except Exception as e:
    print(f"❌ Agent 생성 실패: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
