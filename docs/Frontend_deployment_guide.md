# Frontend (Vercel) 배포 가이드

> 이 가이드는 React/Vite 프론트엔드를 Vercel에 배포하고 백엔드와 연결하는 전체 과정을 설명합니다.
> 처음 배포하는 사람도 따라할 수 있도록 상세하게 작성되었습니다.

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [Vercel 가입 및 GitHub 연동](#2-vercel-가입-및-github-연동)
3. [GitHub 레포지토리 접근 권한](#3-github-레포지토리-접근-권한)
4. [Fork 생성 (Organization 레포인 경우)](#4-fork-생성-organization-레포인-경우)
5. [Vercel에서 프로젝트 Import](#5-vercel에서-프로젝트-import)
6. [빌드 설정](#6-빌드-설정)
7. [환경변수 설정](#7-환경변수-설정)
8. [배포](#8-배포)
9. [백엔드 연결](#9-백엔드-연결)
10. [Git LFS 설정](#10-git-lfs-설정)
11. [배포 확인](#11-배포-확인)
12. [트러블슈팅](#12-트러블슈팅)

---

## 1. 사전 준비

### 필요한 것들

| 항목 | 설명 |
|------|------|
| GitHub 계정 | 코드 저장소 |
| Vercel 계정 | 무료 플랜으로 충분 |
| GitHub에 올라간 프로젝트 | frontend 폴더 포함 |

### 프로젝트 구조 확인

```
project/
├── frontend/           # React/Vite 프론트엔드
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── backend/            # Django 백엔드
└── README.md
```

---

## 2. Vercel 가입 및 GitHub 연동

### Step 2.1: Vercel 가입

1. https://vercel.com 접속
2. **Sign Up** 클릭
3. **Continue with GitHub** 선택
4. GitHub 계정으로 로그인

### Step 2.2: GitHub 연동 승인

1. Vercel이 GitHub 접근 권한 요청
2. **Authorize Vercel** 클릭
3. 필요한 권한 확인 후 승인

---

## 3. GitHub 레포지토리 접근 권한

### 개인 레포지토리인 경우

바로 다음 단계로 진행

### Organization 레포지토리인 경우

"Install Vercel" 화면에서:

1. **본인 계정** 선택 (Organization 아님)
2. Organization 레포는 관리자 승인 필요
3. 또는 **개인 계정으로 Fork** 후 진행 (권장)

---

## 4. Fork 생성 (Organization 레포인 경우)

> 개인 레포지토리라면 이 단계 건너뛰기

### Step 4.1: Fork 생성

1. GitHub에서 원본 레포 접속
2. 우측 상단 **Fork** 버튼 클릭
3. Owner: **본인 계정** 선택
4. **Create fork** 클릭

### Step 4.2: Fork에 코드 푸시

Fork한 레포의 main 브랜치가 비어있다면:

```bash
# 로컬에서 fork를 remote로 추가
git remote add fork https://github.com/[본인계정]/[레포명].git

# 현재 브랜치를 fork의 main으로 push
git push fork [현재브랜치]:main --force
```

예시:
```bash
git remote add fork https://github.com/myusername/TRADE-AI-ASSISTANT.git
git push fork test/deployment:main --force
```

---

## 5. Vercel에서 프로젝트 Import

### Step 5.1: 새 프로젝트 생성

1. Vercel Dashboard 접속
2. **Add New...** → **Project** 클릭

### Step 5.2: 레포지토리 선택

1. GitHub 레포 목록에서 해당 레포 찾기
2. Fork한 레포라면 Fork된 레포 선택
3. **Import** 클릭

---

## 6. 빌드 설정

> Monorepo (frontend/backend 분리)인 경우 필수!

### Step 6.1: Build and Output Settings

**Build and Output Settings** 펼치기 → 각 항목 오른쪽 **Override** 토글 켜기:

| 항목 | 값 |
|------|-----|
| **Build Command** | `cd frontend && npm run build` |
| **Output Directory** | `frontend/dist` |
| **Install Command** | `cd frontend && npm install` |

### Step 6.2: Root Directory (선택)

루트 디렉토리를 frontend로 설정하는 방법도 있음:
- **Root Directory**: `frontend`

이 경우 Build Command는 기본값 사용 가능

---

## 7. 환경변수 설정

### Step 7.1: Environment Variables 펼치기

**Environment Variables** 섹션 펼치기

### Step 7.2: 필요한 환경변수 추가

| Key | Value | 설명 |
|-----|-------|------|
| `VITE_DJANGO_API_URL` | (나중에 설정) | 백엔드 API URL |
| `VITE_USE_DJANGO` | `true` | Django 백엔드 사용 여부 |

**참고:** 백엔드 배포 후 `VITE_DJANGO_API_URL` 설정

---

## 8. 배포

### Step 8.1: 배포 시작

**Deploy** 버튼 클릭

### Step 8.2: 빌드 로그 확인

1. 빌드 진행 상황 확인 (1-3분 소요)
2. 에러 발생 시 로그에서 원인 확인

### Step 8.3: 배포 완료

"Congratulations!" 화면이 나오면 성공!

---

## 9. 백엔드 연결

> 백엔드가 CloudFront로 배포된 후 진행

### Step 9.1: 환경변수 설정/수정

1. Vercel 프로젝트 → **Settings** 탭
2. 좌측 메뉴에서 **Environment Variables** 클릭
3. 변수 목록 확인

### Step 9.2: VITE_DJANGO_API_URL 설정

**이미 있는 경우 (수정):**
1. `VITE_DJANGO_API_URL` 변수 찾기
2. 오른쪽 **...** 또는 연필 아이콘 클릭
3. **Edit** 선택
4. Value를 CloudFront 도메인으로 변경
5. **Save** 클릭

**없는 경우 (추가):**
1. **Add New** 버튼 클릭
2. 다음 정보 입력:

| Key | Value |
|-----|-------|
| `VITE_DJANGO_API_URL` | `https://[CLOUDFRONT_DOMAIN]` |

예시:
```
VITE_DJANGO_API_URL=https://d13r27gytibq2f.cloudfront.net
```

**주의사항:**
- 끝에 `/` 붙이지 마세요!
- `https://` 포함해야 함
- 이미 존재하는 변수를 다시 추가하면 에러 발생

### Step 9.3: 환경변수 적용 범위

| Environment | 설명 |
|-------------|------|
| Production | 실제 배포 환경 |
| Preview | PR 미리보기 환경 |
| Development | 개발 환경 |

보통 **모든 환경**에 체크

### Step 9.4: 재배포

환경변수 변경 후 **반드시 재배포** 필요!

1. **Deployments** 탭 클릭
2. 최신 배포 항목에서 **...** 클릭
3. **Redeploy** 선택
4. **Use existing Build Cache** 체크 **해제** (권장)
5. **Redeploy** 확인

### Step 9.5: 연결 테스트

1. 배포된 프론트엔드 URL 접속
2. 로그인 또는 API 호출 기능 테스트
3. 브라우저 개발자 도구 (F12) → **Console** 탭에서 에러 확인

---

## 10. Git LFS 설정

> 비디오/이미지 등 대용량 파일이 Git LFS로 관리되는 경우

### Step 10.1: Git LFS 활성화

1. Vercel Dashboard → **Settings** → **Git**
2. **Git Large File Storage (LFS)** 찾기
3. **Enabled** 토글 켜기
4. **Save**

### Step 10.2: 재배포

1. **Deployments** → 최근 배포
2. **...** → **Redeploy**
3. **Use existing Build Cache** 체크 **해제**
4. **Redeploy**

---

## 11. 배포 확인

### Step 11.1: 사이트 접속

**Visit** 버튼 클릭 또는 직접 URL 접속:
```
https://[프로젝트명].vercel.app
```

예시:
```
https://trade-ai-assistant.vercel.app
```

### Step 11.2: 기능 테스트

1. 페이지 정상 로딩 확인
2. 로그인 기능 테스트
3. API 호출 기능 테스트

---

## 12. 트러블슈팅

### 문제 1: 빌드 실패

**에러:** Build 단계에서 실패

**해결:**
1. Build Logs에서 에러 메시지 확인
2. 흔한 원인:
   - `package.json` 경로 오류
   - 의존성 설치 실패
   - TypeScript 타입 에러

**확인 사항:**
```bash
# 로컬에서 빌드 테스트
cd frontend
npm install
npm run build
```

### 문제 2: 404 에러 (페이지를 찾을 수 없음)

**에러:** 배포 후 페이지 접속 시 404

**해결:**
1. **Output Directory** 확인: `frontend/dist`
2. 빌드 결과물 경로 확인

### 문제 3: 비디오/이미지 안 나옴

**에러:** 대용량 파일 로딩 실패

**해결:**
1. Git LFS 활성화 (섹션 10 참고)
2. 캐시 없이 재배포

### 문제 4: API 호출 실패

**에러:** Network Error 또는 Failed to fetch

**확인 사항:**
1. `VITE_DJANGO_API_URL` 환경변수 설정 확인
2. 백엔드 서버 실행 중인지 확인
3. 환경변수 변경 후 재배포했는지 확인

### 문제 5: Mixed Content 에러

**에러:**
```
Mixed Content: The page was loaded over HTTPS, but requested an insecure HTTP resource
```

**원인:** HTTPS 프론트엔드에서 HTTP 백엔드 호출

**해결:**
- 백엔드에 CloudFront로 HTTPS 적용 필요
- `VITE_DJANGO_API_URL`을 `https://`로 시작하는 CloudFront URL로 설정

### 문제 6: CORS 에러

**에러:**
```
Access to fetch has been blocked by CORS policy
```

**원인:** 백엔드에서 프론트엔드 도메인 허용 안 됨

**해결:**
1. 백엔드 EC2의 `.env` 파일에서 `FRONTEND_URL` 설정:
   ```env
   FRONTEND_URL=https://trade-ai-assistant.vercel.app
   ```
2. Docker 컨테이너 재시작:
   ```bash
   docker compose restart
   ```

### 문제 7: 환경변수 중복 에러

**에러:**
```
A variable with the name `VITE_DJANGO_API_URL` already exists
```

**원인:** 이미 존재하는 환경변수를 다시 추가하려 함

**해결:**
1. 기존 변수를 **Edit**으로 수정
2. 새로 추가하지 말 것

### 문제 8: 변경 사항이 반영 안 됨

**원인:** 캐시된 빌드 사용

**해결:**
1. Redeploy 시 **Use existing Build Cache** 체크 **해제**
2. 필요시 **Clear Cache and Deploy**

---

## 배포 후 자동 업데이트

GitHub에 push하면 Vercel이 **자동으로 재배포**합니다:

| 브랜치 | 배포 환경 |
|--------|----------|
| main | Production (실제 사이트) |
| 다른 브랜치 | Preview (미리보기) |

### 자동 배포 확인

1. GitHub에 코드 push
2. Vercel Dashboard → **Deployments** 탭
3. 새 배포가 자동으로 시작됨

---

## 배포 체크리스트

### 초기 배포
- [ ] Vercel 계정 생성 및 GitHub 연동
- [ ] 프로젝트 Import
- [ ] Build Command 설정: `cd frontend && npm run build`
- [ ] Output Directory 설정: `frontend/dist`
- [ ] Install Command 설정: `cd frontend && npm install`
- [ ] 배포 성공 확인

### 백엔드 연결
- [ ] 백엔드 CloudFront URL 확인
- [ ] `VITE_DJANGO_API_URL` 환경변수 설정
- [ ] Vercel 재배포 (캐시 없이)
- [ ] 로그인/API 호출 테스트
- [ ] Console에서 에러 없는지 확인

### 추가 설정
- [ ] Git LFS 활성화 (필요시)
- [ ] 커스텀 도메인 설정 (필요시)

---

## 참고 정보

### 현재 프로젝트 설정 예시

| 항목 | 값 |
|------|-----|
| 프론트엔드 URL | `https://trade-ai-assistant.vercel.app` |
| 백엔드 URL | `https://d13r27gytibq2f.cloudfront.net` |
| Build Command | `cd frontend && npm run build` |
| Output Directory | `frontend/dist` |

### 환경변수 목록

| Key | Value | 설명 |
|-----|-------|------|
| `VITE_DJANGO_API_URL` | `https://d13r27gytibq2f.cloudfront.net` | 백엔드 API URL |
| `VITE_USE_DJANGO` | `true` | Django 백엔드 사용 |

---

*마지막 업데이트: 2025-12-04*
