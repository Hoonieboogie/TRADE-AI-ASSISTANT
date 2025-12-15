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
RUN pip install gunicorn

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8000

# 실행 명령
# workers: 메모리 절약을 위해 1개 (t2.micro 기준)
# timeout: AI 응답 대기를 위해 300초 (5분)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
