# Trade AI Assistant - Backend 배포 가이드

> 이 가이드는 Django 백엔드를 AWS EC2에 Docker로 배포하는 **전체 과정**을 설명합니다.
> Docker 파일 생성부터 배포 완료까지, 처음 하는 사람도 따라할 수 있도록 상세하게 작성되었습니다.

---

## 목차

1. [사전 준비사항](#1-사전-준비사항)
2. [Docker 설정 파일 생성](#2-docker-설정-파일-생성)
3. [PyMySQL 설정](#3-pymysql-설정)
4. [환경변수 파일 설정](#4-환경변수-파일-설정)
5. [EC2 인스턴스 생성](#5-ec2-인스턴스-생성)
6. [EC2 접속 방법](#6-ec2-접속-방법)
7. [EC2 환경 설정](#7-ec2-환경-설정)
8. [프로젝트 배포](#8-프로젝트-배포)
9. [RDS 보안 그룹 설정](#9-rds-보안-그룹-설정)
10. [Docker 빌드 및 실행](#10-docker-빌드-및-실행)
11. [배포 확인](#11-배포-확인)
12. [HTTPS 설정 (CloudFront)](#12-https-설정-cloudfront)
13. [프론트엔드 연결](#13-프론트엔드-연결)
14. [배포 종료 및 리소스 정리](#14-배포-종료-및-리소스-정리)
15. [트러블슈팅](#15-트러블슈팅)
16. [유용한 명령어](#16-유용한-명령어)

---

## 1. 사전 준비사항

### 필요한 것들

| 항목 | 설명 |
|------|------|
| AWS 계정 | EC2, RDS, CloudFront 사용 |
| GitHub 저장소 | 프로젝트 코드가 푸시되어 있어야 함 |
| 로컬 환경 | 터미널 (Mac/Linux) 또는 PowerShell (Windows) |
| RDS 데이터베이스 | MySQL RDS가 이미 생성되어 있어야 함 |

### 로컬에서 확인할 것

```bash
# Git 설치 확인
git --version

# SSH 사용 가능한지 확인
ssh -V
```

---

## 2. Docker 설정 파일 생성

> 프로젝트에 Docker 파일이 없는 경우 생성합니다.

### 프로젝트 구조

```
backend/
├── config/
│   ├── __init__.py      # PyMySQL 설정 (중요!)
│   ├── settings.py      # Django 설정
│   ├── urls.py
│   └── wsgi.py
├── chat/                # 앱 폴더들
├── documents/
├── Dockerfile           # ← 생성 필요
├── docker-compose.yml   # ← 생성 필요
├── requirements.txt     # ← 확인 필요
├── .env                 # ← 생성 필요 (gitignore됨)
└── .env.example         # 환경변수 템플릿
```

### Step 2.1: Dockerfile 생성

`backend/Dockerfile` 파일 생성:

```dockerfile
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
```

> **참고 (t2.micro):** 메모리가 1GB뿐이므로 워커를 1개로 제한합니다.
> t2.small(2GB) 이상이면 `--workers 3`으로 변경 가능합니다.

### Step 2.2: docker-compose.yml 생성

`backend/docker-compose.yml` 파일 생성:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: trade-ai-backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    restart: unless-stopped
```

### Step 2.3: requirements.txt 확인

`backend/requirements.txt`에 다음 패키지들이 포함되어 있는지 확인:

```txt
# Django Core
Django>=5.2.8
djangorestframework>=3.14.0
django-cors-headers>=4.3.0
django-storages>=1.14.0

# Database
PyMySQL>=1.1.2

# Environment
python-dotenv>=1.0.0

# AI/ML
openai>=2.8.1
openai-agents>=0.6.1
langchain-core>=1.1.0
langchain-openai>=1.1.0
langchain-text-splitters>=1.0.0
tavily-python>=0.7.13
langfuse>=2.0.0

# Data Processing
pandas>=2.3.3
numpy>=2.3.5
openpyxl>=3.1.5

# Vector Database
qdrant-client>=1.16.1
mem0ai>=0.1.0

# AWS
boto3>=1.35.0

# PDF Processing
pymupdf>=1.24.0

# HTTP & Data Validation
httpx>=0.28.0
pydantic>=2.10.0

# Utils
requests>=2.32.5
python-multipart>=0.0.20
```

**중요:**
- `mysqlclient`는 사용하지 않고 `PyMySQL`을 사용합니다 (Docker 환경에서 C 라이브러리 설치 불필요)
- `httpx`, `pydantic`은 reranker 및 query transformer 기능에 필요
- `mem0ai`는 대화 메모리 기능에 필요
- `pymupdf`는 PDF 파싱에 필요

---

## 3. PyMySQL 설정

> Django 5.x에서 PyMySQL을 사용하려면 버전 위장이 필요합니다.

### Step 3.1: config/__init__.py 수정

`backend/config/__init__.py` 파일을 다음과 같이 수정:

```python
import pymysql

# Django 5.x+ 버전 체크를 통과하기 위해 PyMySQL 버전을 mysqlclient 버전으로 위장
pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()
```

**왜 필요한가?**
- Django 5.x는 mysqlclient 2.2.1+ 버전을 요구
- PyMySQL은 다른 버전 체계를 사용
- 위 코드로 PyMySQL이 mysqlclient처럼 동작하게 함

---

## 4. 환경변수 파일 설정

### Step 4.1: .env.example 생성 (템플릿)

`backend/.env.example` 파일 생성:

```env
# =====================================================
# Trade AI Assistant - Backend Environment Variables
# =====================================================
# 이 파일을 .env로 복사하여 사용하세요.
# cp .env.example .env

# =====================================================
# Django Settings
# =====================================================
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# 프로덕션 프론트엔드 URL (CORS용)
FRONTEND_URL=https://your-vercel-app.vercel.app

# =====================================================
# MySQL Database (RDS)
# =====================================================
MYSQL_HOST=your-rds-endpoint.ap-northeast-2.rds.amazonaws.com
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name

# =====================================================
# OpenAI
# =====================================================
OPENAI_API_KEY=sk-your-api-key-here

# =====================================================
# Qdrant Vector DB
# =====================================================
QDRANT_URL=https://your-qdrant-url.cloud.qdrant.io/
QDRANT_API_KEY=your-qdrant-api-key

# =====================================================
# Tavily (웹 검색)
# =====================================================
TAVILY_API_KEY=tvly-your-api-key

# =====================================================
# AWS S3
# =====================================================
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=ap-northeast-2

# =====================================================
# Langfuse (프롬프트 버전 관리)
# =====================================================
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
USE_LANGFUSE=true
```

### Step 4.2: .env 파일 생성

```bash
cd backend
cp .env.example .env
```

그리고 `.env` 파일을 열어 실제 값들로 채웁니다.

### Step 4.3: .gitignore 확인

`.env` 파일이 Git에 올라가지 않도록 `.gitignore`에 추가:

```
.env
*.env
```

---

## 5. EC2 인스턴스 생성

### Step 5.1: AWS 콘솔 접속

1. https://console.aws.amazon.com 접속
2. 로그인
3. 우측 상단에서 리전 선택: **서울 (ap-northeast-2)**
   - **중요:** RDS가 있는 리전과 **반드시 같은 리전** 선택!

### Step 5.2: EC2 서비스로 이동

1. 상단 검색창에 `EC2` 입력
2. **EC2** 클릭

### Step 5.3: 인스턴스 시작

1. 좌측 메뉴에서 **인스턴스** 클릭
2. **인스턴스 시작** 버튼 클릭

### Step 5.4: 인스턴스 설정

| 설정 항목 | 값 | 설명 |
|----------|-----|------|
| 이름 | `trade-ai-backend` | 원하는 이름 |
| AMI | **Ubuntu Server 24.04 LTS** | Amazon Machine Image |
| 아키텍처 | **64비트 (x86)** | 기본값 |
| 인스턴스 유형 | `t2.micro` | 프리티어 (테스트용) |

### Step 5.5: 키 페어 생성

> 키 페어는 EC2에 SSH 접속할 때 필요한 인증 파일입니다.

**새 키 페어 생성:**
1. **새 키 페어 생성** 클릭
2. 키 페어 이름: `trade-ai-key` (원하는 이름)
3. 키 페어 유형: **RSA**
4. 프라이빗 키 파일 형식: **.pem** (Mac/Linux) 또는 **.ppk** (Windows PuTTY)
5. **키 페어 생성** 클릭
6. `.pem` 파일이 자동 다운로드됨

**중요:** 다운로드된 `.pem` 파일을 안전한 곳에 보관하세요!
```bash
# 권장 위치로 이동
mv ~/Downloads/trade-ai-key.pem ~/Downloads/
```

### Step 5.6: 네트워크 설정

**중요: RDS와 같은 VPC 선택!**

1. **네트워크 설정** 섹션에서 **편집** 클릭
2. **VPC**: RDS가 있는 VPC 선택
   - VPC를 모르면 RDS 콘솔에서 확인
3. **서브넷**: 퍼블릭 서브넷 선택 (외부 접속 가능해야 함)
4. **퍼블릭 IP 자동 할당**: **활성화**

### Step 5.7: 보안 그룹 설정

**보안 그룹 생성** 선택 후:

1. 보안 그룹 이름: `trade-ai-backend-sg`
2. 설명: `Security group for Trade AI Backend`
3. **인바운드 보안 그룹 규칙** 추가:

| 유형 | 포트 범위 | 소스 유형 | 소스 | 설명 |
|------|----------|----------|------|------|
| SSH | 22 | 내 IP | (자동) | SSH 접속용 |
| 사용자 지정 TCP | 8000 | Anywhere | 0.0.0.0/0 | Django API용 |
| HTTP | 80 | Anywhere | 0.0.0.0/0 | (선택) |
| HTTPS | 443 | Anywhere | 0.0.0.0/0 | (선택) |

**규칙 추가 방법:**
- **규칙 추가** 버튼 클릭
- 유형 선택 → 포트 자동 입력됨
- 소스 선택

### Step 5.8: 스토리지 설정

- 크기: **20 GiB** 이상 (Docker 이미지 저장 공간)
- 볼륨 유형: **gp3** (기본값)

### Step 5.9: 인스턴스 시작

1. 설정 검토
2. **인스턴스 시작** 버튼 클릭
3. 성공 메시지 확인

### Step 5.10: 인스턴스 정보 확인

1. **인스턴스 ID** 클릭하여 상세 페이지로 이동
2. 다음 정보 복사해두기:
   - **퍼블릭 IPv4 주소**: `X.X.X.X` (외부 접속용)
   - **프라이빗 IPv4 주소**: `172.31.X.X` (RDS 연결용)

---

## 6. EC2 접속 방법

### Mac/Linux에서 접속

#### Step 6.1: .pem 파일 권한 설정

```bash
chmod 400 ~/Downloads/trade-ai-key.pem
```

**왜 필요한가?** SSH는 보안상 키 파일의 권한이 너무 열려있으면 거부합니다.

#### Step 6.2: SSH 접속

```bash
ssh -i [PEM_파일_경로] ubuntu@[EC2_PUBLIC_IP]
```

예시:
```bash
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@3.35.26.130
```

#### Step 6.3: 첫 접속 시 확인

```
The authenticity of host '3.35.26.130 (3.35.26.130)' can't be established.
ED25519 key fingerprint is SHA256:xxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

`yes` 입력 후 Enter

#### Step 6.4: 접속 성공 확인

```
Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-1234-aws x86_64)
...
ubuntu@ip-172-31-42-163:~$
```

이 프롬프트가 보이면 접속 성공!

### Windows에서 접속 (PowerShell)

```powershell
ssh -i C:\Users\[사용자명]\Downloads\trade-ai-key.pem ubuntu@[EC2_PUBLIC_IP]
```

### Windows에서 접속 (PuTTY)

1. PuTTYgen으로 `.pem`을 `.ppk`로 변환
2. PuTTY 실행
3. Host Name: `ubuntu@[EC2_PUBLIC_IP]`
4. Connection → SSH → Auth → Private key file: `.ppk` 파일 선택
5. Open 클릭

### SSH 접속 문제 해결

| 문제 | 해결 |
|------|------|
| Permission denied | `.pem` 파일 권한 확인 (`chmod 400`) |
| Connection timed out | EC2 보안 그룹에서 22번 포트 열려있는지 확인 |
| Host key verification failed | `~/.ssh/known_hosts`에서 해당 IP 삭제 |

---

## 7. EC2 환경 설정

> EC2에 SSH 접속한 상태에서 진행합니다.

### Step 7.1: 시스템 업데이트

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 7.2: Docker 설치

```bash
# Docker 설치 스크립트 다운로드 및 실행
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 현재 사용자를 docker 그룹에 추가 (sudo 없이 docker 사용 가능하게)
sudo usermod -aG docker $USER

# 설치 스크립트 삭제
rm get-docker.sh

# 변경사항 적용을 위해 재로그인
exit
```

### Step 7.3: 다시 SSH 접속

```bash
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@[EC2_PUBLIC_IP]
```

### Step 7.4: Docker 설치 확인

```bash
# Docker 버전 확인
docker --version
# 출력 예: Docker version 27.3.1, build ce12230

# Docker Compose 버전 확인
docker compose version
# 출력 예: Docker Compose version v2.29.7

# Docker가 sudo 없이 동작하는지 확인
docker ps
# 출력: CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

### Step 7.5: Swap 메모리 추가 (t2.micro 필수)

> **중요!** t2.micro는 메모리가 1GB뿐이라 AI 채팅 처리 시 메모리 부족으로 워커가 죽을 수 있습니다.
> Swap 메모리를 추가하여 이 문제를 완화합니다.

```bash
# 1GB Swap 파일 생성
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 재부팅 후에도 Swap 유지
echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab

# Swap 확인
free -h
```

**정상 출력:**
```
              total        used        free      shared  buff/cache   available
Mem:           957Mi       ...         ...       ...     ...          ...
Swap:          1.0Gi       0B         1.0Gi
```

### Step 7.6: Git 설치 확인

```bash
git --version
# 출력 예: git version 2.43.0
```

Git이 없으면:
```bash
sudo apt install git -y
```

---

## 8. 프로젝트 배포

> EC2에 SSH 접속한 상태에서 진행합니다.

### Step 8.1: 프로젝트 클론

```bash
cd ~
git clone -b [브랜치명] https://github.com/[사용자]/[저장소].git
```

예시:
```bash
git clone -b main https://github.com/SKN-17-Final-5Team/TRADE-AI-ASSISTANT.git
```

특정 브랜치 클론:
```bash
git clone -b test/deployment https://github.com/SKN-17-Final-5Team/TRADE-AI-ASSISTANT.git
```

### Step 8.2: .env 파일 전송

**방법 A: 로컬에서 SCP로 전송 (권장)**

로컬 터미널을 **새로 열어서**:
```bash
scp -i ~/Downloads/trade-ai-key.pem [로컬_.env_경로] ubuntu@[EC2_PUBLIC_IP]:~/TRADE-AI-ASSISTANT/backend/.env
```

예시:
```bash
scp -i ~/Downloads/trade-ai-key.pem ./backend/.env ubuntu@3.35.26.130:~/TRADE-AI-ASSISTANT/backend/.env
```

**방법 B: EC2에서 직접 생성**

EC2에서:
```bash
cd ~/TRADE-AI-ASSISTANT/backend
nano .env
```

.env 내용 붙여넣기 후 저장:
- `Ctrl + O` → `Enter` (저장)
- `Ctrl + X` (종료)

### Step 8.3: ALLOWED_HOSTS 설정

```bash
cd ~/TRADE-AI-ASSISTANT/backend

# 현재 설정 확인
cat .env | grep ALLOWED_HOSTS
```

ALLOWED_HOSTS에 EC2 IP 추가:
```bash
nano .env
```

다음 형식으로 수정 (한 줄에 작성):
```env
ALLOWED_HOSTS=localhost,127.0.0.1,[EC2_PUBLIC_IP],[EC2_PUBLIC_IP].nip.io
```

예시:
```env
ALLOWED_HOSTS=localhost,127.0.0.1,3.35.26.130,3.35.26.130.nip.io
```

### Step 8.4: FRONTEND_URL 설정

CORS를 위해 프론트엔드 URL 설정:
```bash
# 현재 설정 확인
cat .env | grep FRONTEND_URL
```

없으면 추가:
```bash
echo "FRONTEND_URL=https://[YOUR_VERCEL_APP].vercel.app" >> .env
```

예시:
```bash
echo "FRONTEND_URL=https://trade-ai-assistant.vercel.app" >> .env
```

---

## 9. RDS 보안 그룹 설정

> **중요!** EC2에서 RDS에 연결하려면 RDS 보안 그룹에서 EC2의 **Private IP**를 허용해야 합니다.

### Step 9.1: EC2 Private IP 확인

EC2에서:
```bash
hostname -I | awk '{print $1}'
```

출력 예시: `172.31.42.163`

**이 IP를 복사해두세요!**

### Step 9.2: RDS 보안 그룹 찾기

1. AWS 콘솔 → **RDS**
2. 좌측 **데이터베이스** 클릭
3. 해당 RDS 인스턴스 이름 클릭
4. **연결 & 보안** 탭
5. **VPC 보안 그룹** 링크 클릭 (파란색 링크)

### Step 9.3: 인바운드 규칙 추가

1. 보안 그룹 상세 페이지에서 **인바운드 규칙** 탭 클릭
2. **인바운드 규칙 편집** 버튼 클릭
3. **규칙 추가** 클릭
4. 다음 정보 입력:

| 유형 | 포트 범위 | 소스 유형 | 소스 |
|------|----------|----------|------|
| MySQL/Aurora | 3306 | 사용자 지정 | `[EC2_PRIVATE_IP]/32` |

예시:
| 유형 | 포트 범위 | 소스 |
|------|----------|------|
| MySQL/Aurora | 3306 | `172.31.42.163/32` |

5. **규칙 저장** 클릭

### Step 9.4: RDS 연결 테스트

EC2에서:
```bash
nc -zv [RDS_ENDPOINT] 3306 -w 5
```

예시:
```bash
nc -zv rago-database.c1260o8a6i62.ap-northeast-2.rds.amazonaws.com 3306 -w 5
```

**성공 시:**
```
Connection to rago-database... 3306 port [tcp/mysql] succeeded!
```

**실패 시:**
```
nc: connect to rago-database... port 3306 (tcp) timed out
```
→ 보안 그룹 설정 다시 확인 (Private IP가 맞는지)

---

## 10. Docker 빌드 및 실행

> EC2에 SSH 접속한 상태에서 진행합니다.

### Step 10.1: backend 디렉토리로 이동

```bash
cd ~/TRADE-AI-ASSISTANT/backend
```

### Step 10.2: Docker 이미지 빌드 및 실행

```bash
docker compose up --build -d
```

옵션 설명:
- `--build`: Docker 이미지를 새로 빌드
- `-d`: 백그라운드(detached) 모드로 실행

### Step 10.3: 빌드 진행 확인

```bash
docker compose logs -f
```

정상 실행 시 로그:
```
[INFO] Starting gunicorn 23.0.0
[INFO] Listening at: http://0.0.0.0:8000 (1)
[INFO] Using worker: sync
[INFO] Booting worker with pid: 6
[INFO] Booting worker with pid: 7
[INFO] Booting worker with pid: 8
```

`Ctrl + C`로 로그 보기 종료 (컨테이너는 계속 실행됨)

### Step 10.4: 컨테이너 상태 확인

```bash
docker ps
```

정상 실행 시:
```
CONTAINER ID   IMAGE         COMMAND                  CREATED          STATUS          PORTS                    NAMES
abc123def456   backend-web   "gunicorn --bind 0.0…"   10 seconds ago   Up 9 seconds    0.0.0.0:8000->8000/tcp   trade-ai-backend
```

STATUS가 `Up`이면 정상!

---

## 11. 배포 확인

### Step 11.1: Health Check (EC2 내부에서)

```bash
curl http://localhost:8000/api/health/
```

응답:
```json
{"status": "ok"}
```

### Step 11.2: 외부에서 접근 테스트

**로컬 터미널**에서:
```bash
curl http://[EC2_PUBLIC_IP]:8000/api/health/
```

예시:
```bash
curl http://3.35.26.130:8000/api/health/
```

응답:
```json
{"status": "ok"}
```

### Step 11.3: 브라우저에서 확인

브라우저에서 접속:
```
http://[EC2_PUBLIC_IP]:8000/api/health/
```

`{"status": "ok"}` 가 보이면 배포 성공!

---

## 12. HTTPS 설정 (CloudFront)

> **필수!** Vercel(HTTPS)에서 HTTP API 호출 시 Mixed Content 에러가 발생합니다.
> CloudFront로 HTTPS를 적용해야 합니다.

### Step 12.1: CloudFront 콘솔 접속

1. AWS 콘솔 → 검색창에 `CloudFront` 입력 → 클릭
2. **배포 생성** (또는 **Create distribution**) 클릭

### Step 12.2: 플랜 선택

- **Free** 플랜 선택 (테스트에 충분)

### Step 12.3: Distribution 기본 설정

| 설정 | 값 |
|------|-----|
| Distribution name | `trade-ai-backend` (원하는 이름) |
| Distribution type | **Single website or app** |

### Step 12.4: Origin 설정

> **중요!** CloudFront는 IP 주소를 직접 받지 않습니다.

1. **Origin type**: **Other** 선택
2. **Custom origin** 입력:

```
[EC2_PUBLIC_IP].nip.io
```

예시:
```
3.35.26.130.nip.io
```

**주의:**
- 포트(`:8000`)는 여기에 입력하지 않습니다!
- `nip.io`는 무료 DNS 서비스로, IP를 도메인처럼 사용 가능하게 해줍니다

3. **Origin path**: 비워두기

### Step 12.5: Origin Settings 설정

1. **Customize origin settings** 선택
2. 다음 설정 적용:

| 설정 | 값 | 중요도 |
|------|-----|--------|
| **Protocol** | `HTTP only` | **매우 중요!** (HTTPS 아님) |
| **HTTP port** | `8000` | **매우 중요!** |
| HTTPS port | 443 (기본값) | - |
| Connection attempts | 3 | 기본값 유지 |
| Connection timeout | 10 | 기본값 유지 |
| **Response timeout** | **120** | **중요! AI 응답 대기** |
| Keep-alive timeout | 5 | 기본값 유지 |

> **Response timeout을 120초로 설정하는 이유:**
> AI 채팅 응답이 길어질 수 있어서 기본 30초로는 부족합니다.
> 스트리밍 중간에 `ERR_HTTP2_PROTOCOL_ERROR`가 발생하면 이 값을 늘려야 합니다.

**Protocol을 HTTPS로 하면 안 되는 이유:**
- EC2의 Django는 HTTP로만 동작
- CloudFront가 HTTPS로 연결 시도하면 실패

### Step 12.6: Cache Settings 설정

1. **Customize cache settings** 선택
2. 다음 설정 적용:

| 설정 | 값 |
|------|-----|
| **Viewer protocol policy** | `Redirect HTTP to HTTPS` |
| **Allowed HTTP methods** | `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE` |
| Cache HTTP methods | OPTIONS 체크 해제 |

### Step 12.7: Cache Policy 및 Origin Request Policy

| 설정 | 값 | 중요도 |
|------|-----|--------|
| **Origin request policy** | `AllViewerExceptHostHeader` | **매우 중요!** |
| Response headers policy | (비워두기) | - |

**AllViewerExceptHostHeader가 중요한 이유:**
- CORS를 위해 Origin 헤더를 백엔드로 전달해야 함
- 이 설정이 없으면 CORS 에러 발생

### Step 12.8: WAF 설정 (중요!)

1. **Rate limiting**: 활성화 권장 (무료, DoS 방어)
   - 기본값: 300 requests / 5분

2. **Core protections 모니터 모드 설정** (403 에러 방지):
   - CloudFront 배포 생성 후 → **Security** 탭
   - **Manage protections** 클릭
   - **Use monitor mode** 체크박스 **체크**
   - **Save**

> **왜 필요한가?**
> WAF Core protections가 AI 채팅 요청을 "공격"으로 오인하여 403 Forbidden을 반환할 수 있습니다.
> 모니터 모드로 설정하면 차단 없이 로깅만 합니다.

### Step 12.9: 배포 생성

1. **Create distribution** 클릭
2. 배포 생성 완료!

### Step 12.10: 배포 완료 대기

1. 상태가 **Deploying** 표시됨
2. **Deployed**가 될 때까지 대기 (약 5-10분)
3. **Distribution domain name** 복사

예시: `d13r27gytibq2f.cloudfront.net`

### Step 12.11: EC2 ALLOWED_HOSTS 업데이트

EC2에 SSH 접속 후:
```bash
cd ~/TRADE-AI-ASSISTANT/backend
nano .env
```

ALLOWED_HOSTS에 CloudFront 도메인 추가:
```env
ALLOWED_HOSTS=localhost,127.0.0.1,[EC2_IP],[EC2_IP].nip.io,[CLOUDFRONT_DOMAIN]
```

예시:
```env
ALLOWED_HOSTS=localhost,127.0.0.1,3.35.26.130,3.35.26.130.nip.io,d13r27gytibq2f.cloudfront.net
```

저장 후 컨테이너 재시작:
```bash
docker compose restart
```

### Step 12.12: CloudFront 테스트

```bash
curl https://[CLOUDFRONT_DOMAIN]/api/health/
```

예시:
```bash
curl https://d13r27gytibq2f.cloudfront.net/api/health/
```

응답:
```json
{"status": "ok"}
```

---

## 13. 프론트엔드 연결

### Step 13.1: Vercel 환경변수 설정

1. https://vercel.com 접속 → 프로젝트 선택
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Environment Variables** 클릭
4. `VITE_DJANGO_API_URL` 설정:

**이미 있는 경우:**
- 해당 변수 오른쪽 **...** 또는 연필 아이콘 클릭
- **Edit** 선택
- Value를 CloudFront 도메인으로 변경

**없는 경우:**
- **Add New** 클릭
- 다음 정보 입력:

| Key | Value |
|-----|-------|
| `VITE_DJANGO_API_URL` | `https://[CLOUDFRONT_DOMAIN]` |

예시:
```
VITE_DJANGO_API_URL=https://d13r27gytibq2f.cloudfront.net
```

**주의:**
- 끝에 `/` 붙이지 마세요!
- `https://` 포함해야 함

### Step 13.2: Vercel 재배포

1. **Deployments** 탭 클릭
2. 최신 배포의 **...** 클릭
3. **Redeploy** 선택
4. **Use existing Build Cache** 체크 **해제**
5. **Redeploy** 확인

### Step 13.3: 연결 테스트

1. 프론트엔드 URL 접속 (예: https://trade-ai-assistant.vercel.app)
2. 로그인 시도
3. 브라우저 개발자 도구 (F12) → Console에서 에러 확인

---

## 14. 배포 종료 및 리소스 정리

> 테스트 배포 완료 후 비용 절감을 위해 리소스를 정리합니다.

### Step 14.1: EC2 Docker 컨테이너 중지

EC2에서:
```bash
cd ~/TRADE-AI-ASSISTANT/backend
docker compose down
```

또는 로컬에서:
```bash
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@[EC2_IP] "cd TRADE-AI-ASSISTANT/backend && docker compose down"
```

### Step 14.2: CloudFront 삭제

1. AWS 콘솔 → **CloudFront**
2. 배포 선택 (체크박스)
3. **Disable** 클릭 (삭제 전 필수!)
4. 상태가 "Deployed" → "Disabled"로 변경될 때까지 대기 (5-10분)
5. 다시 선택 → **Delete** 클릭

### Step 14.3: EC2 인스턴스 중지/삭제

**중지만 하려면 (나중에 다시 사용):**
1. AWS 콘솔 → **EC2** → **인스턴스**
2. 인스턴스 선택
3. **인스턴스 상태** → **인스턴스 중지**

**완전 삭제하려면:**
1. AWS 콘솔 → **EC2** → **인스턴스**
2. 인스턴스 선택
3. **인스턴스 상태** → **인스턴스 종료**

### Step 14.4: RDS 보안 그룹 규칙 제거

1. AWS 콘솔 → **EC2** → **보안 그룹**
2. RDS 보안 그룹 선택
3. **인바운드 규칙** → **인바운드 규칙 편집**
4. EC2 Private IP 규칙 삭제
5. **규칙 저장**

### Step 14.5: Vercel 프로젝트 삭제 (선택)

1. Vercel → 프로젝트 선택
2. **Settings** 탭
3. 맨 아래로 스크롤 → **Delete Project**
4. 프로젝트 이름 입력 → **Delete**

### 정리 체크리스트

- [ ] EC2 Docker 컨테이너 중지
- [ ] CloudFront Disable → Delete
- [ ] EC2 인스턴스 중지 또는 종료
- [ ] RDS 보안 그룹 규칙 제거
- [ ] (선택) Vercel 프로젝트 삭제

---

## 15. 트러블슈팅

### 문제 1: mysqlclient 버전 에러

**에러 메시지:**
```
django.core.exceptions.ImproperlyConfigured: mysqlclient 2.2.1 or newer is required; you have 1.4.6
```

**원인:** PyMySQL 버전이 Django에 잘못 보고됨

**해결:**

`config/__init__.py` 파일 확인:
```python
import pymysql

pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()
```

`requirements.txt`에서:
```
# mysqlclient>=2.2.0  # 주석 처리
PyMySQL>=1.1.2
```

### 문제 2: RDS 연결 실패 (Connection timed out)

**에러:**
```
nc: connect to rago-database... port 3306 (tcp) timed out
```

**원인:** RDS 보안 그룹에서 EC2 접근 미허용

**해결:**
1. RDS 보안 그룹 → 인바운드 규칙 편집
2. **EC2의 Private IP** 추가 (Public IP 아님!)
3. 형식: `172.31.x.x/32`

EC2 Private IP 확인:
```bash
hostname -I | awk '{print $1}'
```

### 문제 3: CloudFront 504 Gateway Timeout

**에러:**
```
504 Gateway Timeout - We can't connect to the server
```

**원인 1:** CloudFront Origin Protocol이 HTTPS로 설정됨

**해결:**
1. CloudFront → Origins 탭 → Edit
2. **Protocol**: `HTTP only` 선택
3. **HTTP port**: `8000`

**원인 2:** Origin request policy 미설정

**해결:**
1. CloudFront → Behaviors 탭 → Edit
2. **Origin request policy**: `AllViewerExceptHostHeader`

### 문제 4: CORS 에러

**에러:**
```
Access to fetch has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**해결 1:** EC2의 `.env`에서 FRONTEND_URL 설정
```env
FRONTEND_URL=https://trade-ai-assistant.vercel.app
```

컨테이너 재시작:
```bash
docker compose restart
```

**해결 2:** CloudFront Origin request policy 확인
- `AllViewerExceptHostHeader` 선택되어 있어야 함

### 문제 5: Mixed Content 에러

**에러:**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure HTTP resource
```

**해결:** CloudFront로 HTTPS 설정 (섹션 12 참고)

### 문제 6: CloudFront에서 IP 주소 거부

**에러:**
```
Origin domain cannot be an IP address
```

**해결:** `nip.io` 사용
```
3.35.26.130.nip.io
```

### 문제 7: SSH 접속 실패

**에러:** `Permission denied (publickey)`

**해결:**
```bash
# .pem 파일 권한 확인
chmod 400 ~/Downloads/trade-ai-key.pem

# 사용자명이 ubuntu인지 확인
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@[IP]
```

**에러:** `Connection timed out`

**해결:**
- EC2 보안 그룹에서 22번 포트가 열려있는지 확인
- "내 IP"로 제한했다면 IP가 변경되지 않았는지 확인

### 문제 8: Docker 빌드 실패

**에러:** 패키지 설치 실패

**해결:**
```bash
# 캐시 없이 새로 빌드
docker compose build --no-cache
docker compose up -d
```

### 문제 9: Worker SIGKILL / Out of Memory

**에러:**
```
[ERROR] Worker (pid:7) was sent SIGKILL! Perhaps out of memory?
```

**원인:** t2.micro 메모리(1GB) 부족

**해결:**

1. **Swap 메모리 추가:**
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab
```

2. **Gunicorn 워커 수 줄이기:**

Dockerfile에서:
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
```

3. **(장기적) EC2 인스턴스 업그레이드:**
   - t2.small (2GB) 또는 t3.small 권장

### 문제 10: Worker Timeout (Gunicorn)

**에러:**
```
[CRITICAL] WORKER TIMEOUT (pid:7)
```

**원인:** AI 응답, Reranker 처리 등이 기본 타임아웃(30초)보다 오래 걸림

**해결:**

Dockerfile에서 타임아웃 늘리기:
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
```

Docker 재빌드:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### 문제 11: ERR_HTTP2_PROTOCOL_ERROR 200 (OK)

**에러:**
```
net::ERR_HTTP2_PROTOCOL_ERROR 200 (OK)
```

**원인:** CloudFront Response timeout이 너무 짧음

**해결:**

1. CloudFront → Distribution → **Origins** 탭
2. Origin 선택 → **Edit**
3. **Response timeout**: `120` (초)
4. **Save changes**

### 문제 12: 403 Forbidden (WAF 차단)

**에러:**
- 문서 API에서 403 Forbidden
- 일반 채팅은 되는데 문서 관련 API만 실패

**원인:** WAF Core protections가 요청을 차단

**해결:**

1. CloudFront → Distribution → **Security** 탭
2. **Manage protections** 버튼의 **화살표(▼)** 클릭
3. **Use monitor mode** 체크
4. **Save**

### 문제 13: 메모리 모니터링

**실시간 메모리 확인:**
```bash
# EC2에서 (2초마다 갱신)
watch -n 2 free -h
```

**위험 신호:**
- Available이 50Mi 이하
- Swap 사용이 500Mi 이상

---

## 16. 유용한 명령어

### SSH 접속

```bash
# 기본 접속
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@[EC2_IP]

# 접속하면서 명령어 실행
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@[EC2_IP] "docker ps"
```

### Docker 명령어

```bash
# 컨테이너 상태 확인
docker ps

# 모든 컨테이너 (중지된 것 포함)
docker ps -a

# 컨테이너 로그 보기
docker logs trade-ai-backend

# 실시간 로그 보기
docker logs -f trade-ai-backend

# 최근 50줄 로그
docker logs --tail 50 trade-ai-backend

# 컨테이너 재시작
docker compose restart

# 컨테이너 중지
docker compose down

# 컨테이너 중지 + 이미지 삭제 후 재빌드
docker compose down
docker rmi backend-web -f
docker compose up --build -d

# 캐시 없이 완전 새로 빌드
docker compose build --no-cache
docker compose up -d

# 컨테이너 내부 접속
docker exec -it trade-ai-backend bash

# 컨테이너 내부에서 Django 명령어 실행
docker exec trade-ai-backend python manage.py migrate
docker exec trade-ai-backend python manage.py collectstatic
```

### 파일 전송 (SCP)

```bash
# 로컬 → EC2 (단일 파일)
scp -i ~/Downloads/trade-ai-key.pem ./file.txt ubuntu@[EC2_IP]:~/destination/

# 로컬 → EC2 (디렉토리)
scp -i ~/Downloads/trade-ai-key.pem -r ./directory ubuntu@[EC2_IP]:~/destination/

# EC2 → 로컬
scp -i ~/Downloads/trade-ai-key.pem ubuntu@[EC2_IP]:~/file.txt ./local/
```

### Git 업데이트 (EC2에서)

```bash
cd ~/TRADE-AI-ASSISTANT
git pull origin [브랜치명]

# Docker 재빌드
cd backend
docker compose down
docker compose up --build -d
```

### 네트워크 테스트

```bash
# RDS 연결 테스트
nc -zv [RDS_ENDPOINT] 3306 -w 5

# EC2 Private IP 확인
hostname -I | awk '{print $1}'

# 포트 리스닝 확인
netstat -tlnp | grep 8000

# curl로 API 테스트
curl http://localhost:8000/api/health/
```

### 메모리 & 시스템 모니터링

```bash
# 메모리 상태 확인 (1회)
free -h

# 실시간 메모리 모니터링 (2초마다 갱신)
watch -n 2 free -h

# Docker 컨테이너 리소스 사용량
docker stats trade-ai-backend

# 시스템 전체 리소스 모니터링
htop  # 설치: sudo apt install htop
```

---

## 배포 체크리스트

### Docker 파일 준비
- [ ] `Dockerfile` 생성
- [ ] `docker-compose.yml` 생성
- [ ] `config/__init__.py`에 PyMySQL 설정
- [ ] `requirements.txt`에서 mysqlclient 주석 처리
- [ ] `.env` 파일 준비

### EC2 설정
- [ ] EC2 인스턴스 생성 (RDS와 같은 VPC)
- [ ] 보안 그룹에 22, 8000 포트 추가
- [ ] 키 페어(.pem) 다운로드
- [ ] SSH 접속 확인
- [ ] Docker 설치
- [ ] **Swap 메모리 추가 (t2.micro 필수)**
- [ ] 프로젝트 클론
- [ ] .env 파일 전송/설정

### RDS 연결
- [ ] EC2 Private IP 확인
- [ ] RDS 보안 그룹에 EC2 Private IP 추가
- [ ] RDS 연결 테스트 (`nc -zv`)

### Docker 실행
- [ ] Docker 빌드 및 실행
- [ ] Health Check 확인 (`/api/health/`)
- [ ] 로그에서 에러 확인

### CloudFront (HTTPS)
- [ ] CloudFront 배포 생성
- [ ] Origin: `[EC2_IP].nip.io`
- [ ] Protocol: `HTTP only`
- [ ] HTTP port: `8000`
- [ ] **Response timeout: `120`초**
- [ ] Origin request policy: `AllViewerExceptHostHeader`
- [ ] **WAF Core protections: Monitor mode 설정**
- [ ] ALLOWED_HOSTS에 CloudFront 도메인 추가
- [ ] CloudFront HTTPS 테스트

### 프론트엔드 연결
- [ ] Vercel 환경변수 설정 (`VITE_DJANGO_API_URL`)
- [ ] Vercel 재배포
- [ ] 전체 연동 테스트

---

## 참고 정보

### 현재 프로젝트 설정 예시

| 항목 | 값 |
|------|-----|
| EC2 Public IP | `3.35.26.130` |
| EC2 Private IP | `172.31.42.163` |
| SSH 사용자 | `ubuntu` |
| PEM 파일 | `trade-ai-test-key.pem` |
| 프로젝트 경로 | `~/TRADE-AI-ASSISTANT/backend` |
| Docker 컨테이너 | `trade-ai-backend` |
| API 포트 | `8000` |
| CloudFront 도메인 | `d13r27gytibq2f.cloudfront.net` |
| Frontend URL | `https://trade-ai-assistant.vercel.app` |

### 주요 파일 위치

| 파일 | 경로 |
|------|------|
| Dockerfile | `backend/Dockerfile` |
| docker-compose.yml | `backend/docker-compose.yml` |
| PyMySQL 설정 | `backend/config/__init__.py` |
| Django 설정 | `backend/config/settings.py` |
| 환경변수 | `backend/.env` |
| 패키지 목록 | `backend/requirements.txt` |

### API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/health/` | 서버 상태 확인 |
| `/api/` | 채팅 API |
| `/api/documents/` | 문서 API |
| `/api/documents/auth/login/` | 로그인 API |
| `/admin/` | Django Admin |

---

*마지막 업데이트: 2025-12-11*
