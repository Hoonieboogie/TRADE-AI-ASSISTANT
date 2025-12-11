# TRADE-AI-ASSISTANT

AI 기반 무역 문서 관리 및 생성 시스템

---

## 주요 기능

### 1. AI 채팅 어시스턴트
- 무역 관련 질의응답 (RAG 기반)
- 실시간 웹 검색 (Tavily)
- Mem0 기반 장기/단기 메모리 시스템
- 스트리밍 응답 지원

### 2. 문서 생성 워크플로우
- 5단계 무역 문서 생성 (Offer Sheet → PI → Contract → CI → PL)
- AI 어시스턴트와 실시간 협업
- 리치 텍스트 에디터 (Tiptap)
- PDF 업로드 및 RAG 연동
- 문서 버전 관리

### 3. 메모리 시스템 (Mem0 + Qdrant)
| 유형 | 설명 | 생명주기 |
|------|------|----------|
| 문서 세션 (`doc_{id}`) | 현재 문서 작업 요약 | Trade 삭제 시 삭제 |
| 채팅 세션 (`gen_chat_{id}`) | 일반채팅 대화 요약 | 채팅방 삭제 시 삭제 |
| 사용자 선호도 (`user_{id}`) | 무역 조건, 결제 방식 선호 | 영구 보관 |
| 거래처 메모 (`buyer_{id}_{name}`) | 거래처 특성, 주의사항 | 영구 보관 |

### 4. 세션 관리
- 새로고침 시 작업 상태 유지 (sessionStorage)
- Trade Lazy Creation (저장 시점에 생성)

### 5. 에디터 기능
- DataField: 동적 데이터 필드 (자동완성, 공유 데이터 매핑)
- Checkbox/Radio: 문서 내 선택 위젯
- AutoCalculation: 수량×단가 자동 계산
- 행 추가/삭제: 표 동적 편집
- PDF 다운로드: html2canvas + jsPDF

---

## 프로젝트 구조

```
TRADE-AI-ASSISTANT/
│
├── frontend/                              # React + TypeScript 프론트엔드
│   ├── App.tsx                            # 메인 앱 (라우팅, 상태 관리)
│   │
│   ├── components/
│   │   ├── LoginPage.tsx                  # 로그인 페이지
│   │   ├── MainPage.tsx                   # 메인 대시보드 (문서 목록)
│   │   ├── ChatPage.tsx                   # 일반 AI 채팅 페이지
│   │   ├── ChatAssistant.tsx              # 문서 채팅 어시스턴트 (슬라이드 패널)
│   │   ├── DocumentCreationPage.tsx       # 문서 생성 래퍼
│   │   ├── VersionHistorySidebar.tsx      # 버전 히스토리 사이드바
│   │   ├── PdfViewer.tsx                  # PDF 뷰어 (react-pdf)
│   │   ├── OthersDocumentViewer.tsx       # 기타 문서 뷰어
│   │   ├── ShootingStarIntro.tsx          # 인트로 애니메이션
│   │   ├── StepSelector.tsx               # 단계 선택 컴포넌트
│   │   ├── CommercialInvoiceTemplate.tsx  # CI 템플릿 (레거시)
│   │   ├── SalesContractTemplate.tsx      # 계약서 템플릿 (레거시)
│   │   │
│   │   ├── document-creation/             # 문서 생성 모듈
│   │   │   ├── index.tsx                  # 메인 컨테이너 (47KB)
│   │   │   ├── types.ts                   # 타입 정의
│   │   │   ├── hooks/
│   │   │   │   ├── index.ts
│   │   │   │   ├── useDocumentState.ts    # 문서 상태 관리
│   │   │   │   ├── useFileUpload.ts       # S3 파일 업로드
│   │   │   │   └── useSharedData.ts       # 문서 간 데이터 공유
│   │   │   ├── layout/
│   │   │   │   ├── index.ts
│   │   │   │   ├── DocumentHeader.tsx     # 문서 헤더 (제목, 저장, 다운로드)
│   │   │   │   └── StepNavigation.tsx     # 5단계 네비게이션
│   │   │   ├── modals/
│   │   │   │   ├── index.ts
│   │   │   │   ├── PasswordChangeModal.tsx  # 비밀번호 변경 (API 연동)
│   │   │   │   ├── DownloadModal.tsx        # PDF 다운로드 옵션
│   │   │   │   ├── ExitConfirmModal.tsx     # 나가기 확인
│   │   │   │   ├── SaveSuccessModal.tsx     # 저장 완료
│   │   │   │   ├── MyPageModal.tsx          # 마이페이지
│   │   │   │   └── LogoutConfirmModal.tsx   # 로그아웃 확인
│   │   │   └── steps/
│   │   │       ├── index.ts
│   │   │       ├── ModeSelector.tsx       # 모드 선택 (수동/업로드/스킵)
│   │   │       ├── EditorView.tsx         # 에디터 뷰 (Tiptap 래퍼)
│   │   │       ├── FileUploadView.tsx     # PDF 업로드 뷰
│   │   │       ├── EmptyState.tsx         # 빈 상태
│   │   │       ├── SkipState.tsx          # 스킵 상태
│   │   │       └── ShippingDocsDashboard.tsx  # CI/PL 대시보드
│   │   │
│   │   ├── editor/                        # Tiptap 에디터
│   │   │   ├── ContractEditor.tsx         # 커스텀 에디터 (핵심)
│   │   │   │   ├── DataField 노드         # 데이터 필드 (source: agent/mapped/user)
│   │   │   │   ├── Checkbox 노드          # 체크박스 (그룹 지원)
│   │   │   │   ├── Radio 노드             # 라디오 (linkedField 지원)
│   │   │   │   └── AutoCalculation 확장   # sub_total, total 자동 계산
│   │   │   ├── EditorToolbar.tsx          # 에디터 툴바 (Bold, Italic 등)
│   │   │   └── editor.css                 # 에디터 스타일
│   │   │
│   │   ├── figma/
│   │   │   └── ImageWithFallback.tsx      # 이미지 폴백 컴포넌트
│   │   │
│   │   └── ui/                            # shadcn/ui 컴포넌트 (50개)
│   │       ├── button.tsx, input.tsx, dialog.tsx ...
│   │       └── utils.ts
│   │
│   ├── templates/                         # 문서 HTML 템플릿 (TypeScript)
│   │   ├── offerSheet.ts                  # Offer Sheet
│   │   ├── proformaInvoice.ts             # Proforma Invoice
│   │   ├── saleContract.ts                # Sales Contract
│   │   ├── commercialInvoice.ts           # Commercial Invoice
│   │   └── packingList.ts                 # Packing List
│   │
│   ├── doc_templates/                     # 문서 HTML 템플릿 (참조용)
│   │   ├── Offer_Sheet.html
│   │   ├── PI.html
│   │   ├── PO.html                        # Purchase Order (미사용)
│   │   ├── Sales_Contract.html
│   │   ├── Commercial_Invoice.html
│   │   └── PL.html
│   │
│   ├── utils/
│   │   ├── api.ts                         # API 클라이언트 (ApiClient 클래스)
│   │   ├── documentApi.ts                 # 문서 전용 API
│   │   └── documentUtils.ts               # 문서 유틸리티 (checkStepCompletion 등)
│   │
│   ├── styles/
│   │   └── globals.css                    # 글로벌 스타일
│   │
│   ├── src/
│   │   ├── main.tsx                       # React 엔트리포인트
│   │   ├── index.css                      # 기본 CSS
│   │   └── vite-env.d.ts                  # Vite 타입 정의
│   │
│   ├── guidelines/
│   │   └── Guidelines.md                  # UI/UX 가이드라인
│   │
│   ├── img/                               # 이미지 에셋
│   ├── background.mp4                     # 배경 비디오 (30MB)
│   ├── index.html                         # HTML 엔트리
│   ├── package.json                       # npm 패키지
│   ├── tsconfig.json                      # TypeScript 설정
│   ├── vite.config.ts                     # Vite 설정
│   ├── tailwind.config.cjs                # Tailwind 설정
│   ├── postcss.config.cjs                 # PostCSS 설정
│   ├── Attributions.md                    # 라이선스 귀속
│   └── .env                               # 환경변수
│
├── backend/                               # Django + DRF 백엔드
│   ├── config/                            # Django 설정
│   │   ├── __init__.py                    # PyMySQL 설정
│   │   ├── settings.py                    # 프로젝트 설정 (TIME_ZONE: Asia/Seoul)
│   │   ├── urls.py                        # 루트 URL
│   │   ├── wsgi.py                        # WSGI 설정
│   │   └── asgi.py                        # ASGI 설정
│   │
│   ├── documents/                         # 문서 관리 앱
│   │   ├── models.py                      # DB 모델
│   │   │   ├── Department                 # 부서
│   │   │   ├── User (AbstractUser)        # 사용자 (emp_no 기반 인증)
│   │   │   ├── TradeFlow                  # 거래 플로우
│   │   │   ├── Document                   # 문서 (5종, S3 연동)
│   │   │   ├── DocVersion                 # 문서 버전 (JSON content)
│   │   │   └── DocMessage                 # 문서 채팅 메시지
│   │   ├── views.py                       # API 뷰
│   │   │   ├── LoginView                  # 로그인 (emp_no/password)
│   │   │   ├── PasswordChangeView         # 비밀번호 변경
│   │   │   ├── TradeFlowViewSet           # 거래 CRUD
│   │   │   ├── DocumentViewSet            # 문서 CRUD + S3 업로드
│   │   │   ├── DocVersionViewSet          # 버전 관리
│   │   │   └── DocumentChatView           # 문서 채팅
│   │   ├── serializers.py                 # DRF 시리얼라이저
│   │   ├── services.py                    # 비즈니스 로직 (S3, RAG)
│   │   ├── urls.py                        # URL 라우팅
│   │   ├── admin.py                       # Django Admin
│   │   ├── apps.py                        # 앱 설정
│   │   ├── tests.py                       # 테스트
│   │   └── migrations/                    # DB 마이그레이션
│   │
│   ├── chat/                              # 채팅 앱
│   │   ├── models.py                      # 일반 채팅 모델
│   │   │   ├── GenChat                    # 일반 채팅 세션
│   │   │   ├── GenMessage                 # 일반 채팅 메시지
│   │   │   └── GenUploadFile              # 채팅 업로드 파일
│   │   ├── views.py                       # 일반 채팅 API
│   │   │   ├── ChatView                   # 일반 채팅 (비스트리밍)
│   │   │   ├── ChatStreamView             # 일반 채팅 스트리밍
│   │   │   └── GenChatDeleteView          # 채팅방 삭제 (Mem0 포함)
│   │   ├── trade_views.py                 # 문서 채팅 API
│   │   │   ├── TradeInitView              # Trade 초기화 (5개 Doc 생성)
│   │   │   ├── DocumentChatView           # 문서 채팅 (비스트리밍)
│   │   │   ├── DocumentChatStreamView     # 문서 채팅 스트리밍
│   │   │   ├── GeneralChatView            # 일반 채팅 (Mem0 통합)
│   │   │   └── extract_buyer_from_content # buyer 자동 추출
│   │   ├── memory_service.py              # Mem0 메모리 서비스 (핵심)
│   │   │   ├── TradeMemoryService         # 싱글톤 메모리 서비스
│   │   │   ├── add_doc_memory             # 문서 세션 메모리
│   │   │   ├── add_user_memory            # 사용자 선호도
│   │   │   ├── add_buyer_memory           # 거래처 메모
│   │   │   ├── add_gen_chat_memory        # 일반채팅 메모리
│   │   │   ├── build_doc_context          # 문서 컨텍스트 빌더
│   │   │   ├── build_gen_chat_context     # 채팅 컨텍스트 빌더
│   │   │   └── save_memory_smart          # 스마트 메모리 저장
│   │   ├── config.py                      # 채팅 앱 설정
│   │   ├── serializers.py                 # DRF 시리얼라이저
│   │   ├── urls.py                        # URL 라우팅
│   │   ├── admin.py, apps.py, tests.py
│   │   └── migrations/
│   │
│   ├── agent_core/                        # AI 에이전트 코어
│   │   ├── __init__.py
│   │   ├── agents.py                      # 에이전트 팩토리
│   │   │   ├── get_trade_agent            # 무역 Q&A 에이전트
│   │   │   ├── get_document_writing_agent # 문서 작성 에이전트
│   │   │   └── get_read_document_agent    # 업로드 문서 에이전트
│   │   ├── config.py                      # 에이전트 설정
│   │   ├── utils.py                       # 유틸리티 함수
│   │   │
│   │   ├── tools/                         # 에이전트 도구
│   │   │   ├── __init__.py
│   │   │   ├── search_tool.py             # RAG 검색 (Qdrant)
│   │   │   │   ├── search_trade_documents # 무역 문서 검색
│   │   │   │   └── search_user_document   # 사용자 문서 검색
│   │   │   └── web_search_tool.py         # 웹 검색 (Tavily)
│   │   │       └── search_web
│   │   │
│   │   ├── services/                      # AI 서비스
│   │   │   ├── __init__.py
│   │   │   ├── query_transformer_service.py  # 쿼리 변환
│   │   │   └── reranker_service.py           # 리랭커
│   │   │
│   │   ├── models/                        # AI 모델 래퍼
│   │   │   ├── __init__.py
│   │   │   ├── query_transformer.py       # 쿼리 변환 모델
│   │   │   └── reranker.py                # 리랭커 모델
│   │   │
│   │   ├── prompts/                       # 프롬프트 (Langfuse fallback)
│   │   │   └── fallback.py                # 로컬 프롬프트
│   │   │
│   │   ├── langfuse_config.py             # Langfuse 설정
│   │   ├── s3_utils.py                    # S3 유틸리티 (presigned URL 등)
│   │   ├── pdf_parser.py                  # PDF 파싱 (PyMuPDF)
│   │   └── collection_manager.py          # Qdrant 컬렉션 관리
│   │
│   ├── scripts/
│   │   └── setup_s3_cors.py               # S3 CORS 설정 스크립트
│   │
│   ├── manage.py                          # Django 관리 명령
│   ├── requirements.txt                   # Python 패키지
│   ├── memory_readme.md                   # 메모리 시스템 문서
│   ├── test_prompt_version.py             # 프롬프트 버전 테스트
│   ├── .env                               # 환경변수
│   └── .env.example                       # 환경변수 예시
│
├── docs/                                  # 프로젝트 문서
│   ├── DATABASE_DESIGN.md                 # DB 설계 문서
│   ├── BRANCH_CHANGELOG_feature-text-editor-v2.md
│   ├── BRANCH_CHANGELOG_issue-document-upload.md
│   └── bugfix-loading-indicator.md
│
├── .claude/                               # Claude Code 설정
│   └── settings.local.json
│
├── .serena/                               # Serena MCP 설정
│
├── AGENT_EDIT_FIX_PLAN.md                 # 에이전트 편집 수정 계획
├── FIELD_MAPPING_FIX_PLAN.md              # 필드 매핑 수정 계획
├── MERGE_PLAN.md                          # 브랜치 병합 계획
├── PROJECT_STRUCTURE.md                   # 프로젝트 구조 상세
├── LANGFUSE_GUIDE.md                      # Langfuse 사용 가이드
├── package.json                           # 루트 npm 설정
├── package-lock.json
├── .gitignore
├── .gitattributes
└── README.md                              # 이 문서
```

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.2.0 | UI 프레임워크 |
| TypeScript | 5.2.2 | 타입 안전성 |
| Vite | 5.0.0 | 빌드 도구 |
| Tailwind CSS | 3.3.3 | 스타일링 |
| Tiptap | 3.11.0+ | 리치 텍스트 에디터 |
| ProseMirror | 1.x | Tiptap 기반 에디터 코어 |
| react-pdf | 10.2.0 | PDF 뷰어 |
| pdfjs-dist | 5.4.x | PDF 렌더링 |
| html2canvas | 1.4.1 | HTML→Canvas 변환 |
| jsPDF | 3.0.4 | PDF 생성 |
| Framer Motion | 12.x | 애니메이션 |
| Lucide React | 0.554.0 | 아이콘 |
| react-markdown | 10.1.0 | 마크다운 렌더링 |
| shadcn/ui | - | UI 컴포넌트 |

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| Python | 3.11+ | 런타임 |
| Django | 5.2.8 | 웹 프레임워크 |
| Django REST Framework | 3.14+ | REST API |
| OpenAI Agents SDK | 0.6.1 | AI 에이전트 |
| OpenAI | 2.8.1+ | GPT-4o API |
| Mem0 | 0.1.0 | 메모리 시스템 |
| Qdrant | Cloud | 벡터 DB |
| LangChain | 1.1.0 | LLM 통합 |
| Langfuse | 2.0+ | 프롬프트 관리/모니터링 |
| Tavily | 0.7.13 | 웹 검색 |
| Boto3 | 1.35+ | AWS S3 |
| PyMuPDF | 1.24+ | PDF 파싱 |
| PyMySQL | 1.1.2 | MySQL 드라이버 |
| pandas | 2.3.3 | 데이터 처리 |
| numpy | 2.3.5 | 수치 연산 |

### 인프라
| 서비스 | 용도 |
|--------|------|
| AWS RDS (MySQL) | 관계형 데이터베이스 |
| AWS S3 | 파일 저장 (PDF 업로드) |
| Qdrant Cloud | 벡터 데이터베이스 |
| Langfuse Cloud | 프롬프트 버전 관리 |

---

## 데이터베이스 스키마

```
┌─────────────┐     ┌─────────────┐
│ Department  │     │    User     │
├─────────────┤     ├─────────────┤
│ dept_id(PK) │◄────┤ user_id(PK) │
│ dept_name   │     │ emp_no(UK)  │ ← USERNAME_FIELD
└─────────────┘     │ name        │
                    │ dept_id(FK) │
                    │ user_role   │ (user/admin)
                    │ activation  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  TradeFlow  │   │   GenChat   │   │  (Mem0)     │
├─────────────┤   ├─────────────┤   │ user_{id}   │
│ trade_id(PK)│   │gen_chat_id  │   │ buyer_{id}  │
│ user_id(FK) │   │ user_id(FK) │   │ doc_{id}    │
│ title       │   │ title       │   │ gen_chat_{} │
│ status      │   │ created_at  │   └─────────────┘
│ created_at  │   │ updated_at  │
│ updated_at  │   └──────┬──────┘
└──────┬──────┘          │
       │                 ▼
       │         ┌─────────────┐
       │         │ GenMessage  │
       │         ├─────────────┤
       │         │gen_message_id│
       │         │gen_chat_id  │
       │         │sender_type  │ (U/A)
       │         │content      │
       │         │created_at   │
       │         └──────┬──────┘
       │                │
       │                ▼
       │         ┌─────────────┐
       │         │GenUploadFile│
       │         ├─────────────┤
       │         │gen_file_id  │
       │         │gen_message  │
       │         │origin_name  │
       │         │file_url     │
       │         └─────────────┘
       │
       ▼
┌─────────────┐
│  Document   │
├─────────────┤
│ doc_id(PK)  │
│ trade_id(FK)│
│ doc_type    │ (offer/pi/contract/ci/pl)
│ doc_mode    │ (manual/upload/skip)
│ s3_key      │
│ s3_url      │
│ original_filename │
│ file_size   │
│ mime_type   │
│ upload_status │ (uploading/processing/ready/error)
│ error_message │
│ qdrant_point_ids │ (JSON)
│ created_at  │
│ updated_at  │
└──────┬──────┘
       │
       ├───────────────┐
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│ DocVersion  │ │ DocMessage  │
├─────────────┤ ├─────────────┤
│ version_id  │ │doc_message_id│
│ doc_id(FK)  │ │ doc_id(FK)  │
│ content     │ │ role        │ (user/agent)
│ created_at  │ │ content     │
└─────────────┘ │ metadata    │ (JSON)
                │ created_at  │
                └─────────────┘
```

### 문서 유형 (doc_type)
| 코드 | 문서명 | Step |
|------|--------|------|
| offer | Offer Sheet | 1 |
| pi | Proforma Invoice | 2 |
| contract | Sales Contract | 3 |
| ci | Commercial Invoice | 4 |
| pl | Packing List | 5 |

### 문서 모드 (doc_mode)
| 모드 | 설명 |
|------|------|
| manual | 직접 작성 (에디터) |
| upload | PDF 업로드 |
| skip | 건너뛰기 |

---

## API 엔드포인트

### 인증 (`/api/documents/auth/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/login/` | 로그인 (emp_no, password) |
| POST | `/password-change/` | 비밀번호 변경 |

### Trade (`/api/trade/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/init/` | Trade 초기화 (5개 Document 자동 생성) |
| GET | `/` | 거래 목록 조회 (query: user_id) |
| GET | `/{trade_id}/` | 거래 상세 조회 (문서 포함) |
| PUT | `/{trade_id}/` | 거래 수정 |
| DELETE | `/{trade_id}/` | 거래 삭제 (Mem0 메모리 포함) |
| PATCH | `/{trade_id}/update_status/` | 상태 업데이트 |

### Document (`/api/documents/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 문서 목록 (query: trade_id) |
| GET | `/{doc_id}/` | 문서 상세 조회 |
| PUT | `/{doc_id}/` | 문서 수정 |
| POST | `/{doc_id}/upload_request/` | S3 Presigned URL 요청 |
| POST | `/{doc_id}/upload_complete/` | 업로드 완료 알림 |
| GET | `/{doc_id}/refresh_url/` | S3 URL 갱신 |
| GET | `/{doc_id}/status/stream/` | 처리 상태 SSE 스트림 |

### Version (`/api/documents/versions/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/?doc_id={id}` | 버전 목록 |
| POST | `/` | 버전 생성 (body: doc_id, content) |
| GET | `/{version_id}/` | 버전 상세 |

### 채팅 (`/api/chat/`)
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/chat/` | 일반 채팅 (비스트리밍) |
| GET | `/chat/stream/` | 일반 채팅 스트리밍 (SSE) |
| POST | `/chat/general/` | 일반 채팅 (Mem0 통합) |
| DELETE | `/chat/general/{gen_chat_id}/` | 채팅방 삭제 (Mem0 포함) |
| POST | `/documents/chat/` | 문서 채팅 |
| GET | `/documents/chat/stream/` | 문서 채팅 스트리밍 |
| GET | `/documents/{doc_id}/chat/history/` | 채팅 히스토리 |

---

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/SKN-17-Final-5Team/TRADE-AI-ASSISTANT.git
cd TRADE-AI-ASSISTANT
```

### 2. Backend 설정

#### 2-1. Python 가상환경 생성

```bash
# conda 사용 시
conda create -n trade-assistant python=3.12
conda activate trade-assistant

# 또는 venv 사용 시
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

#### 2-2. 패키지 설치

```bash
cd backend
pip install -r requirements.txt
```

#### 2-3. 환경변수 설정

`backend/.env` 파일 생성 (`.env.example` 참조):

```env
# Django
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Qdrant Vector DB
QDRANT_URL=https://your-qdrant-url.cloud.qdrant.io/
QDRANT_API_KEY=your-qdrant-api-key

# Mem0 (OpenAI API 키 공유 가능)
MEM0_API_KEY=sk-your-openai-api-key

# Tavily (웹 검색)
TAVILY_API_KEY=tvly-your-tavily-key

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=ap-northeast-2

# Langfuse (선택)
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
USE_LANGFUSE=true
```

#### 2-4. 데이터베이스 설정

MySQL 데이터베이스 생성:
```sql
CREATE DATABASE trade_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`config/settings.py`에서 DB 설정 확인 후 마이그레이션:
```bash
python manage.py migrate
```

#### 2-5. 서버 실행

```bash
python manage.py runserver
```

백엔드: http://localhost:8000

### 3. Frontend 설정

#### 3-1. 패키지 설치

```bash
cd frontend
npm install
```

#### 3-2. 환경변수 설정

`frontend/.env` 파일 생성:

```env
VITE_USE_DJANGO=true
VITE_DJANGO_API_URL=http://localhost:8000
```

#### 3-3. 개발 서버 실행

```bash
npm run dev
```

프론트엔드: http://localhost:5173

---

## 실행 순서

```bash
# 터미널 1: 백엔드
cd backend
conda activate trade-assistant
python manage.py runserver

# 터미널 2: 프론트엔드
cd frontend
npm run dev
```

---

## AI 에이전트

| 에이전트 | 용도 | 모델 | 도구 |
|----------|------|------|------|
| Trade Compliance Analyst | 무역 Q&A | GPT-4o | RAG, 웹 검색 |
| Document Writing Assistant | 문서 작성/편집 | GPT-4o | RAG, 웹 검색 |
| Document Reader Assistant | 업로드 문서 Q&A | GPT-4o | 문서 내 검색, RAG, 웹 검색 |

### 도구 (Tools)
| 도구 | 설명 |
|------|------|
| `search_trade_documents` | Qdrant 벡터 DB에서 무역 문서 검색 |
| `search_user_document` | 사용자가 업로드한 특정 문서 내 검색 |
| `search_web` | Tavily API를 통한 실시간 웹 검색 |

### 프롬프트 관리
- **Langfuse**: 프롬프트 버전 관리 및 A/B 테스트
- **Fallback**: Langfuse 실패 시 로컬 프롬프트 사용 (`agent_core/prompts/fallback.py`)

---

## 에디터 커스텀 노드

### DataField
- 동적 데이터 입력 필드
- `source` 속성: `null` (기본), `agent` (AI 입력), `mapped` (다른 문서에서 매핑), `user` (사용자 입력)
- `disabled` 속성: 조건부 비활성화

### Checkbox
- 체크박스 위젯
- `group` 속성: 같은 그룹 내 다중 선택 가능

### Radio
- 라디오 버튼 위젯
- `group` 속성: 같은 그룹 내 단일 선택
- `linkedField` 속성: 선택 시 연결된 DataField 활성화

### AutoCalculation
- `sub_total_price = quantity × unit_price` 자동 계산
- `total_quantity`, `total_price`, `total_ea/box`, `total_box` 합계 자동 계산

---

## 트러블슈팅

### CORS 에러
`backend/config/settings.py`에서 프론트엔드 URL 확인:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### MySQL 연결 오류
- MySQL 서버 실행 상태 확인
- PyMySQL 설치 확인 (`pip install pymysql`)
- `config/__init__.py`에 PyMySQL 설정 확인:
  ```python
  import pymysql
  pymysql.install_as_MySQLdb()
  ```

### OpenAI API 오류
- API 키 유효성 확인
- 크레딧 잔액 확인
- 모델명 확인 (gpt-4o)

### Mem0 메모리 오류
- `MEM0_API_KEY` 또는 `OPENAI_API_KEY` 설정 확인
- Qdrant 연결 상태 확인
- `trade_memory` 컬렉션 존재 확인

### S3 업로드 오류
- AWS 자격 증명 확인
- 버킷 CORS 설정 확인 (`scripts/setup_s3_cors.py`)
- Presigned URL 만료 시간 확인

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| `docs/DATABASE_DESIGN.md` | 데이터베이스 설계 상세 |
| `backend/memory_readme.md` | 메모리 시스템 가이드 |
| `LANGFUSE_GUIDE.md` | Langfuse 사용 가이드 |
| `PROJECT_STRUCTURE.md` | 프로젝트 구조 상세 |
| `frontend/guidelines/Guidelines.md` | UI/UX 가이드라인 |

---

## 라이선스

- UI 컴포넌트: [shadcn/ui](https://ui.shadcn.com/)
- 에디터: [Tiptap](https://tiptap.dev/)
- PDF 렌더링: [PDF.js](https://mozilla.github.io/pdf.js/)
