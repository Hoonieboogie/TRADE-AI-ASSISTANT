FROM python:3.12-slim

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사 및 설치
# Note: PyMySQL은 순수 Python이므로 C 라이브러리 불필요
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 실행 명령
# ASGI 서버로 uvicorn 사용 (비동기 처리로 동시 요청 지원)
# timeout-keep-alive: AI 응답 대기를 위해 300초 (5분)
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300"]
