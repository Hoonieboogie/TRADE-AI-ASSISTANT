# Memory Feature Implementation

이 문서는 TRADE-AI-ASSISTANT 프로젝트의 **메모리 시스템**을 설명합니다.

---

## 1. 핵심 개념: AI는 어떻게 대화를 기억하는가?

### 문제점
AI(GPT/Claude)는 기본적으로 **대화를 기억하지 못합니다**. 매번 새로운 요청으로 인식합니다.

### 해결책
대화 내용을 저장하고, AI 호출 시 **시스템 프롬프트에 포함**시켜 전달합니다.

```
[사용자 메시지: "가격을 5000달러로 수정해줘"]
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI 호출 시 전달되는 내용                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [시스템 프롬프트]                                            │
│  "당신은 무역 문서 작성을 돕는 AI입니다..."                     │
│                                                             │
│  [최근 대화 히스토리 - RDS에서 10개 조회]                       │
│  User: "Offer Sheet 작성해줘"                                │
│  AI: "네, 작성했습니다..."                                    │
│  User: "상품명을 Widget A로 변경해줘"                         │
│  AI: "Widget A로 변경했습니다..."                             │
│  ... (최근 10개)                                             │
│                                                             │
│  [Mem0 메모리 - 관련 핵심 정보]                               │
│  - "이 사용자는 Widget A 상품을 거래 중"                       │
│  - "이전에 FOB 조건을 선호한다고 함"                           │
│                                                             │
│  [현재 사용자 메시지]                                         │
│  "가격을 5000달러로 수정해줘"                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                │
                ▼
        [AI가 컨텍스트를 이해하고 응답]
```

---

## 2. 저장소 구조: RDS vs Mem0

### 왜 두 개의 저장소를 사용하는가?

| 저장소 | 역할 | 비유 |
|--------|------|------|
| **RDS (MySQL)** | 원본 데이터 보관 | 📁 파일 캐비닛 (전체 기록 보관) |
| **Mem0 (Qdrant)** | 핵심 정보 검색 | 🧠 뇌 (중요한 것만 기억) |

### 데이터 흐름

```
[사용자가 메시지 전송]
        │
        ▼
┌───────────────────┐     ┌───────────────────┐
│   RDS (MySQL)     │     │   Mem0 (Qdrant)   │
├───────────────────┤     ├───────────────────┤
│                   │     │                   │
│ 원본 메시지 저장    │     │ AI가 핵심만 추출   │
│ "가격을 5000달러로 │     │ "가격: 5000달러"   │
│  수정해줘"         │     │                   │
│                   │     │ 벡터로 변환해서    │
│ 순서대로 저장      │     │ 저장 (의미 검색용) │
│                   │     │                   │
└───────────────────┘     └───────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────────┐
│           AI 호출 시 조합                     │
├─────────────────────────────────────────────┤
│                                             │
│  RDS에서: 최근 10개 메시지 (대화 흐름)         │
│  Mem0에서: 현재 질문과 관련된 핵심 정보        │
│                                             │
│  → 시스템 프롬프트에 포함하여 AI에 전달        │
│                                             │
└─────────────────────────────────────────────┘
```

### RDS와 Mem0의 차이점

| 항목 | RDS | Mem0 |
|------|-----|------|
| **저장 내용** | 원본 메시지 전체 | AI가 추출한 핵심 정보 |
| **검색 방식** | 최신순 정렬 | 의미 유사도 검색 |
| **예시 저장** | "PI 문서에서 가격을 5000달러로 수정해줘" | "가격: 5000달러로 변경됨" |
| **용도** | 대화 히스토리 재생 | 관련 정보 빠른 검색 |
| **조회 속도** | 빠름 (인덱스) | 빠름 (벡터 검색) |

---

## 3. 문서 채팅 메모리 흐름

문서 작성 페이지(DocumentCreationPage)에서 채팅할 때의 메모리 동작입니다.

### 메시지 전송 시

```
[사용자: "상품명을 Widget A로 변경해줘"]
                │
                ├──► RDS (DocMessage 테이블) 저장
                │    - 원본 메시지 그대로
                │    - doc_id로 문서별 구분
                │
                ├──► Mem0 저장
                │    - AI가 핵심 추출: "상품명: Widget A"
                │    - user_id: "doc_{doc_id}"로 저장
                │
                ▼
        [AI 호출 준비]
                │
                ├──► RDS에서 최근 10개 메시지 조회
                │
                ├──► Mem0에서 관련 메모리 검색
                │    - 현재 질문 "상품명을 Widget A로..."와
                │      유사한 과거 대화 검색
                │
                ├──► RDS (DocVersion)에서 이전 Step 문서 조회
                │    - Step2에서 Step1 문서 내용 참조
                │
                ▼
        [시스템 프롬프트 조합 → AI 호출]
                │
                ▼
        [AI 응답]
                │
                ├──► RDS (DocMessage) 저장
                │
                └──► Mem0 저장
```

### Step 간 문서 참조

Step2(PI)에서 Step1(Offer Sheet) 내용을 참조해야 할 때:

```
[Step2에서 AI 호출 시]
        │
        └──► RDS DocVersion 테이블에서 직접 조회
             │
             ├── Document.objects.filter(trade_id=trade_id)
             │   → 같은 무역의 모든 문서 찾기
             │
             ├── DocVersion.objects.filter(doc=sibling_doc)
             │   → 각 문서의 최신 버전 가져오기
             │
             └── HTML → Text 변환 후 시스템 프롬프트에 포함
```

**왜 Mem0가 아닌 RDS에서 조회하는가?**
- Mem0는 내용을 **요약/추출**하므로 원본이 변형됨
- RDS는 **원본 그대로** 저장되어 정확한 내용 참조 가능

---

## 4. 일반 채팅 메모리 흐름

메인 페이지(MainPage)에서 일반 채팅할 때의 메모리 동작입니다.

```
[사용자: "FOB 조건이 뭐야?"]
                │
                ├──► RDS (GenMessage 테이블) 저장
                │
                ├──► Mem0 저장
                │    - user_id: "gen_chat_{gen_chat_id}"
                │
                ▼
        [AI 호출 준비]
                │
                ├──► Mem0에서 세션 내 대화 메모리 검색
                │    - 이번 채팅 세션에서 나눈 대화
                │
                ├──► Mem0에서 사용자 장기 메모리 검색
                │    - user_id: "user_{user_id}"
                │    - "이 사용자는 FOB 조건을 선호함" 등
                │
                ▼
        [AI 응답]
```

**일반 채팅 특징:**
- 새로고침하면 새 채팅방으로 시작 (gen_chat_id가 새로 생성)
- 하지만 **사용자 장기 메모리**는 유지됨 (user_id 기준)

---

## 5. 메모리 종류 정리

### Mem0에 저장되는 메모리 종류

| 메모리 종류 | Mem0 user_id | 저장 내용 | 수명 |
|------------|--------------|----------|------|
| **문서 대화 메모리** | `doc_{doc_id}` | 해당 문서에서 나눈 대화 핵심 | 문서 삭제 시까지 |
| **일반 채팅 메모리** | `gen_chat_{id}` | 해당 세션에서 나눈 대화 핵심 | 세션 종료 시까지 |
| **사용자 장기 메모리** | `user_{user_id}` | 사용자 선호도, 패턴 | 영구 |

### RDS에 저장되는 데이터

| 테이블 | 저장 내용 | 용도 |
|--------|----------|------|
| `DocMessage` | 문서 채팅 원본 메시지 | 대화 히스토리 표시, AI 컨텍스트 |
| `GenMessage` | 일반 채팅 원본 메시지 | AI 컨텍스트 |
| `DocVersion` | 문서 에디터 내용 (HTML) | Step 간 참조, 버전 관리 |
| `DocUploadFile` | 업로드 파일 파싱 내용 | 파일 내용 참조 |

---

## 6. 파일 구조

### Backend 파일 역할

| 파일 | 역할 | 사용하는 페이지 |
|------|------|----------------|
| `views.py` | 일반 채팅 API | MainPage |
| `trade_views.py` | 문서 채팅/저장 API | DocumentCreationPage |
| `memory_service.py` | Mem0 연동 서비스 | 양쪽 모두 |
| `models.py` | DB 모델 정의 | - |

### API 흐름도

```
[MainPage.tsx]
    │
    └── /api/chat/stream/ ──► views.py (ChatStreamView)
                                  │
                                  └── memory_service.build_gen_chat_context()

[DocumentCreationPage (index.tsx)]
    │
    ├── /api/trade/init/ ──► trade_views.py (TradeInitView)
    │
    ├── /api/documents/chat/stream/ ──► trade_views.py (DocumentChatStreamView)
    │                                       │
    │                                       ├── RDS에서 최근 10개 메시지 조회
    │                                       ├── memory_service.build_context()
    │                                       └── RDS DocVersion에서 이전 Step 조회
    │
    └── /api/documents/{id}/save_version/ ──► trade_views.py
```

---

## 7. 성능 최적화

### 1. 최근 10개 메시지만 전달

```python
# trade_views.py
recent_messages = DocMessage.objects.filter(doc_id=doc_id) \
    .order_by('-created_at')[:10]  # 최신 10개만
```

**이유:** 토큰 절약 + 오래된 대화는 덜 중요

### 2. 병렬 메모리 조회

```python
# memory_service.py
with ThreadPoolExecutor(max_workers=3) as executor:
    doc_future = executor.submit(self.get_doc_memory, ...)
    user_future = executor.submit(self.get_user_memory, ...)

    # 동시에 조회 → 시간 단축
    context["doc_memories"] = doc_future.result()
    context["user_memories"] = user_future.result()
```

### 3. 첫 메시지 최적화

새 채팅방의 첫 메시지는 단기 메모리 조회를 스킵합니다.
(아직 쌓인 대화가 없으므로)

```python
if is_first_message:
    # 장기 메모리(사용자 선호도)만 조회
    context["user_memories"] = self.get_user_memory(...)
```

---

## 8. 주의사항

1. **일반 채팅은 새로고침 시 리셋**
   - gen_chat_id가 새로 생성됨
   - 이전 대화 히스토리 UI에 표시 안 됨
   - 단, 사용자 장기 메모리는 유지

2. **문서 채팅은 영구 유지**
   - doc_id 기준으로 대화 저장
   - 페이지 재진입 시 히스토리 로드

3. **Step 간 문서 참조는 RDS에서**
   - Mem0가 아닌 DocVersion 테이블에서 직접 조회
   - 원본 보존이 중요하기 때문

4. **토큰 제한**
   - AI에 전달되는 대화 히스토리는 최근 10개
   - 전체 히스토리는 RDS에 보관됨

---

## 9. 초기 코드 대비 변경 사항

### 삭제된 기능

| 삭제된 것 | 대체 방법 |
|----------|----------|
| `save_to_memory` API | `save_version` API 사용 |
| Mem0에 문서 내용 저장 | RDS DocVersion에 저장 |
| `trade_{trade_id}` 메모리 | RDS에서 직접 조회 |

### 변경 이유

**Before:** Step 이동 시 Mem0에 문서 내용 저장
```typescript
await fetch('/api/documents/save_to_memory/', {
    body: JSON.stringify({ trade_id, doc_type, content })
})
```

**After:** RDS save_version API 사용
```typescript
await fetch(`/api/documents/${docId}/save_version/`, {
    body: JSON.stringify({ content: { html_content, ... } })
})
```

**이유:** Mem0는 내용을 요약/추출하므로 원본 보존이 안 됨

---

## 10. 메모리 병합 작업 변경사항 (2024-12-05)

이 섹션은 **메모리 기능 병합 작업**으로 인해 변경된 파일들을 정리합니다.
**다른 기능 담당자**는 자신이 작성한 코드 중 변경된 부분을 확인하세요.

---

### 변경된 파일 목록

| 파일 | 변경 유형 | 담당 기능 |
|------|----------|----------|
| `frontend/App.tsx` | **수정** | 전체 앱 라우팅/상태 |
| `frontend/components/ChatAssistant.tsx` | **수정** | 문서 내 채팅 |
| `frontend/components/ChatPage.tsx` | 변경 없음 | 일반 채팅 |
| `frontend/components/document-creation/index.tsx` | **수정** | 문서 작성 페이지 |
| `backend/chat/views.py` | **수정** | 일반 채팅 API |
| `backend/chat/trade_views.py` | **수정** | 문서 채팅 API |
| `backend/chat/memory_service.py` | **수정** | Mem0 서비스 |
| `backend/agent_core/prompts/fallback.py` | 변경 없음 | Agent 프롬프트 |

---

### 10.1 Frontend 변경사항

#### `App.tsx` 변경

**1. 새 state 추가**
```typescript
// 현재 Trade의 doc_ids (직접 저장용 - 새 문서 생성 시 바로 사용)
const [currentDocIds, setCurrentDocIds] = useState<Record<string, number> | null>(null);
```

**2. `handleNavigate` 함수 변경 (새 문서 생성 시 Trade 초기화)**
```typescript
// 변경 전: 새 문서 생성 시 아무 처리 없음
const handleNavigate = (page: PageType) => {
  if (page === 'documents') {
    if (!currentDocId) {
      setCurrentStep(1);
      // ...
    }
  }
};

// 변경 후: Trade 초기화 API 호출
const handleNavigate = async (page: PageType) => {
  if (page === 'documents') {
    if (!currentDocId && currentUser) {
      // Trade 초기화 API 호출 - 새 Trade와 5개의 Document를 생성
      const response = await fetch(`${API_URL}/api/trade/init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.emp_no,
          title: '새 무역 거래'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDocId(data.trade_id.toString());
        setCurrentDocIds(data.doc_ids);  // doc_ids 저장
        fetchTrades();
      }
    }
  }
};
```

**3. `getDocId` 함수 변경**
```typescript
// 변경 전
const getDocId = useCallback((step, shippingDoc) => {
  if (!currentDocId) return null;
  const trade = savedDocuments.find(d => d.id === currentDocId);
  // savedDocuments에서만 찾음
}, [currentDocId, savedDocuments]);

// 변경 후
const getDocId = useCallback((step, shippingDoc) => {
  const docType = stepToDocType(step, shippingDoc);

  // 1. 먼저 currentDocIds에서 찾기 (새 문서 생성 시 바로 사용)
  if (currentDocIds && currentDocIds[docType]) {
    return currentDocIds[docType];
  }

  // 2. savedDocuments에서 찾기
  if (!currentDocId) return null;
  const trade = savedDocuments.find(d => d.id === currentDocId);
  // ...
}, [currentDocId, savedDocuments, currentDocIds]);  // currentDocIds 의존성 추가
```

**4. `handleOpenDocument` 함수 변경**
```typescript
// 변경 후: 기존 문서 열 때 doc_ids 로드
const handleOpenDocument = (doc: SavedDocument) => {
  // ... 기존 코드 ...

  // 추가된 부분: tradeData에서 doc_ids 추출
  if (doc.tradeData?.documents) {
    const docIds: Record<string, number> = {};
    doc.tradeData.documents.forEach((d) => {
      docIds[d.doc_type] = d.doc_id;
    });
    setCurrentDocIds(docIds);
  }
};
```

**5. 메인으로 돌아갈 때 초기화**
```typescript
if (page === 'main') {
  setCurrentDocId(null);
  setCurrentDocIds(null);  // 추가
}
```

---

#### `ChatAssistant.tsx` 변경

**1. Props 인터페이스 변경**
```typescript
// 변경 전
interface ChatAssistantProps {
  // ...
  tradeId?: number | null;
  docIds?: Record<string, number> | null;
  userEmployeeId?: string;
}

// 변경 후
interface ChatAssistantProps {
  // ...
  userEmployeeId?: string;
  getDocId?: (step: number, shippingDoc?: 'CI' | 'PL' | null) => number | null;
}
```

**2. `currentDocId` 계산 로직 변경**
```typescript
// 변경 전: STEP_TO_DOC_TYPE 상수 사용
const STEP_TO_DOC_TYPE: Record<number, string> = { 1: 'offer', 2: 'pi', ... };
const currentDocId = useMemo(() => {
  if (!docIds) return null;
  const docType = STEP_TO_DOC_TYPE[currentStep];
  return docType ? (docIds[docType] || null) : null;
}, [docIds, currentStep, tradeId]);

// 변경 후: getDocId 함수 사용
const currentDocId = useMemo(() => {
  if (documentId) return documentId;
  if (getDocId) {
    const shippingDoc = currentStep === 4 ? 'CI' : currentStep === 5 ? 'PL' : null;
    return getDocId(currentStep <= 3 ? currentStep : (currentStep === 4 ? 4 : 5), shippingDoc);
  }
  return null;
}, [documentId, getDocId, currentStep]);
```

**3. 채팅 히스토리 로드 함수 - role 매핑 수정**
```typescript
// 변경 전: sender_type 사용
const loadedMessages = data.messages.map((msg) => ({
  type: msg.sender_type === 'U' ? 'user' : 'ai',
  // ...
}));

// 변경 후: role 사용 (백엔드 응답 형식에 맞춤)
const loadedMessages = data.messages.map((msg) => ({
  type: msg.role === 'user' ? 'user' : 'ai',  // 'agent' -> 'ai'
  // ...
}));
```

**4. edit 응답 처리 시 step 정보 추가**
```typescript
// 변경 전: step 정보 누락
} else if (data.type === 'edit') {
  setMessages(prev => prev.map(msg =>
    msg.id === aiMessageId
      ? { ...msg, content: data.message, hasApply: true, changes: data.changes }
      : msg
  ));

// 변경 후: step 정보 추가
} else if (data.type === 'edit') {
  setMessages(prev => prev.map(msg =>
    msg.id === aiMessageId
      ? { ...msg, content: data.message, hasApply: true, changes: data.changes, step: requestStep }
      : msg
  ));
```

---

#### `document-creation/index.tsx` 변경

**ChatAssistant에 전달하는 props 변경**
```typescript
// 변경 전
<ChatAssistant
  // ...
  userId={userEmployeeId}
/>

// 변경 후
<ChatAssistant
  // ...
  userEmployeeId={userEmployeeId}
  getDocId={getDocId}
/>
```

---

### 10.2 Backend 변경사항

#### `views.py` 변경 (일반 채팅 API)

**1. GenChat 조회 로직 변경**
```python
# 변경 전: user 필터 포함
gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id, user=user)

# 변경 후: gen_chat_id만으로 조회
gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id)
logger.info(f"✅ 기존 GenChat 조회 성공: gen_chat_id={gen_chat_id}")
```

**2. Mem0 예외 처리 강화**
```python
# 변경 전
memory_service = get_memory_service()
mem0_context = memory_service.build_gen_chat_context(...)

# 변경 후
memory_service = get_memory_service()
if memory_service:  # None 체크 추가
    mem0_context = memory_service.build_gen_chat_context(...)
```

**3. 디버깅 로그 추가**
```python
logger.info(f"✅ 대화 히스토리 로드 (RDS): {len(message_history)}개 메시지 (총 {message_count}개 중)")
if message_history:
    for i, msg in enumerate(message_history[-3:]):
        logger.info(f"  └ 최근 {i+1}: [{msg['role']}] {msg['content'][:50]}...")
```

---

#### `trade_views.py` 변경 (문서 채팅 API)

**1. parse_edit_response import 추가**
```python
from .views import parse_edit_response
```

**2. 편집 응답 처리 추가**
```python
# 변경 전: 편집 응답 처리 없음
# AI 응답 저장만 수행

# 변경 후: 편집 응답 감지 및 전송
edit_response = None
if full_response:
    edit_response = parse_edit_response(full_response)
    if edit_response:
        logger.info(f"편집 응답 감지: {len(edit_response.get('changes', []))}개 변경사항")
        yield f"data: {json.dumps({'type': 'edit', 'message': edit_response['message'], 'changes': edit_response['changes']})}\n\n"
```

**3. DocMessage metadata에 tool 정보 저장**
```python
# 변경 전
ai_msg = DocMessage.objects.create(
    doc=document,
    role='agent',
    content=full_response
)

# 변경 후
ai_msg = DocMessage.objects.create(
    doc=document,
    role='agent',
    content=full_response,
    metadata={
        'tools_used': tools_used,
        'is_edit': edit_response is not None,
        'changes_count': len(edit_response.get('changes', [])) if edit_response else 0
    }
)
```

**4. 이전 Step 문서 조회 시 html 필드명 수정**
```python
# 변경 전
html_content = content_data.get('html_content', '')

# 변경 후 (프론트엔드 저장 형식에 맞춤)
html_content = content_data.get('html', '') or content_data.get('html_content', '')
```

**5. 현재 에디터 내용 컨텍스트 추가**
```python
# 추가된 코드
if document_content and document_content.strip():
    current_text = re.sub(r'<[^>]+>', ' ', document_content)
    current_text = re.sub(r'\s+', ' ', current_text).strip()
    if current_text:
        context_parts.append(f"[현재 작성 중인 {document.doc_type} 문서 내용]\n{current_text[:2000]}")
```

---

#### `memory_service.py` 변경

**get_memory_service() 예외 처리 추가**
```python
# 변경 전
def get_memory_service():
    global _memory_service_instance
    if _memory_service_instance is None:
        _memory_service_instance = TradeMemoryService()
    return _memory_service_instance

# 변경 후
def get_memory_service():
    global _memory_service_instance
    if _memory_service_instance is None:
        try:
            _memory_service_instance = TradeMemoryService()
        except Exception as e:
            logger.warning(f"⚠️ TradeMemoryService 초기화 실패 (메모리 기능 비활성화): {e}")
            return None
    return _memory_service_instance
```

---

### 10.3 주요 버그 수정 요약

| 문제 | 원인 | 해결 |
|------|------|------|
| 문서 ID 매핑 안됨 | 새 문서 생성 시 Trade 초기화 안됨 | `handleNavigate`에서 `/api/trade/init/` 호출 |
| 채팅 내역 안보임 | role 매핑 불일치 (`sender_type` vs `role`) | `msg.role === 'user'`로 수정 |
| 에디터 수정 안됨 | edit 응답 전송 누락 + step 정보 누락 | `parse_edit_response` 추가, step 정보 포함 |
| 일반 채팅 히스토리 안됨 | GenChat 조회 시 user 필터 문제 | user 필터 제거 |
| Mem0 초기화 실패 시 크래시 | 예외 처리 없음 | `get_memory_service()` None 반환 |
| Step간 문서 참조 안됨 | html 필드명 불일치 | `html` 또는 `html_content` 모두 체크 |
| metadata에 tool 정보 없음 | 저장 시 metadata 누락 | `tools_used` 등 metadata 추가 |

---

### 10.4 테스트 체크리스트

개발 후 아래 항목을 테스트하세요:

- [ ] **새 문서 생성**: "새 문서" 버튼 클릭 → Trade 초기화 되는지
- [ ] **문서 내 채팅**: 채팅 메시지 전송 → 응답 오는지
- [ ] **에디터 수정**: "가격을 50000달러로 수정해줘" → Apply 버튼 → 에디터 반영
- [ ] **채팅 히스토리**: 채팅 후 페이지 나갔다 다시 들어가면 이전 대화 보이는지
- [ ] **일반 채팅**: 메인페이지에서 여러 번 대화 → 이전 대화 기억하는지
- [ ] **Step간 참조**: Step2에서 "Step1 내용 참조해줘" → 참조되는지
- [ ] **metadata 저장**: DB `doc_message` 테이블 `metadata` 컬럼에 tool 정보 있는지

---

### 10.5 환경 변수

메모리 기능에 필요한 환경 변수:

```env
# Qdrant (Mem0 벡터 저장소)
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=your-api-key

# 또는 로컬 Qdrant
QDRANT_HOST=localhost
QDRANT_PORT=6333

# OpenAI (Mem0 임베딩용) - 아래 두 개 중 하나만 있으면 됨
OPENAI_API_KEY=sk-xxx
# 또는
MEM0_API_KEY=sk-xxx  # OPENAI_API_KEY가 없으면 이 값이 자동으로 사용됨

# Langfuse (선택)
LANGFUSE_PUBLIC_KEY=pk-xxx
LANGFUSE_SECRET_KEY=sk-xxx
```

**참고**: `MEM0_API_KEY`가 설정되어 있고 `OPENAI_API_KEY`가 없으면, `memory_service.py`에서 자동으로 `MEM0_API_KEY`를 `OPENAI_API_KEY`로 설정합니다.

**Qdrant 연결 실패 시**: 메모리 기능이 비활성화되고, 채팅은 RDS 히스토리만으로 동작합니다.

---

### 10.6 추가 변경사항 (2024-12-05 추가)

#### `memory_service.py` - MEM0_API_KEY 지원

```python
# __init__ 메서드 시작 부분에 추가
def __init__(self):
    if self._initialized:
        return

    try:
        # MEM0_API_KEY를 OPENAI_API_KEY로 설정 (Mem0 내부에서 OpenAI 사용)
        mem0_api_key = os.getenv("MEM0_API_KEY")
        if mem0_api_key and not os.getenv("OPENAI_API_KEY"):
            os.environ["OPENAI_API_KEY"] = mem0_api_key
            logger.info("Set OPENAI_API_KEY from MEM0_API_KEY")

        # ... 이하 기존 코드 ...
```

**변경 이유**: `.env`에 `MEM0_API_KEY`로 API 키가 저장되어 있는 경우, Mem0가 내부적으로 사용하는 `OPENAI_API_KEY` 환경변수로 자동 설정하여 초기화 실패를 방지합니다.
