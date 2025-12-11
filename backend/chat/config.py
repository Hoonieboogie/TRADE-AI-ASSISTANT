"""
채팅 설정 (프롬프트 버전 관리)
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Langfuse 프롬프트 설정
PROMPT_VERSION = os.getenv("PROMPT_VERSION")  # 특정 버전 고정 (예: "5")
PROMPT_LABEL = os.getenv("PROMPT_LABEL", "latest")  # 기본값: latest

# 프롬프트 버전을 정수로 변환 (설정된 경우)
if PROMPT_VERSION:
    try:
        PROMPT_VERSION = int(PROMPT_VERSION)
    except ValueError:
        PROMPT_VERSION = None
