# Branch Changelog: issue/prev-document-read-v1.0

```yaml
# ============================================================
# METADATA
# ============================================================
branch_name: issue/prev-document-read-v1.0
base_branch: dev/trade-ai-assistant-v2.1
created_date: 2025-12-12
last_updated: 2025-12-12
author: Claude Code AI Agent
purpose: "AI 챗봇이 이전 step 문서 내용을 실시간으로 참조할 수 있도록 기능 추가"
status: uncommitted_changes  # 아직 커밋되지 않은 변경사항 있음
```

---

## CRITICAL: Merge 우선순위 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│ 충돌 발생 시 반드시 이 브랜치(issue/prev-document-read-v1.0)의  │
│ 코드를 채택하세요. 이 브랜치가 최신 기능 구현입니다.            │
└─────────────────────────────────────────────────────────────────┘
```

### 파일별 충돌 해결 규칙

| 파일 | 충돌 시 채택 | 이유 |
|------|-------------|------|
| `backend/chat/trade_views.py` | **이 브랜치** | `prev_documents` 파라미터 및 업로드 문서 처리 로직 추가 |
| `frontend/components/ChatAssistant.tsx` | **이 브랜치** | `PrevDocument` 인터페이스 및 `buildPrevDocuments()` 함수 추가 |
| `frontend/components/document-creation/index.tsx` | **이 브랜치** | `documentData`, `stepModes` props 전달 추가 |

---

## 핵심 변경 요약

### 기능 목적
**AI 챗봇이 이전 단계에서 작성/업로드된 문서 내용을 실시간으로 참조**할 수 있도록 함.
- 저장 여부와 무관하게 현재 에디터에 작성 중인 내용도 참조 가능
- 업로드된 문서의 경우 DB의 `extracted_text` 필드에서 조회
- 직접 작성 문서의 경우 프론트엔드에서 실시간 전달

### 데이터 흐름
```
┌──────────────────────────────────────────────────────────────────────┐
│ Frontend (ChatAssistant.tsx)                                         │
│  └─ buildPrevDocuments()                                             │
│      ├─ manual 문서: documentData[step] HTML 콘텐츠 전달             │
│      └─ upload 문서: mode 정보만 전달 (content 비어있음)             │
├──────────────────────────────────────────────────────────────────────┤
│ API Request Body                                                     │
│  └─ prev_documents: { "offer": { type: "upload", content: "" }, ... }│
├──────────────────────────────────────────────────────────────────────┤
│ Backend (trade_views.py)                                             │
│  └─ stream_response()                                                │
│      ├─ prev_documents에 content 있으면 → 그대로 사용                │
│      └─ content 없으면 → DB 조회                                     │
│          ├─ upload 문서: extracted_text 사용                         │
│          └─ manual 문서: DocVersion에서 조회                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 상세 변경사항 (Uncommitted)

### 1. `backend/chat/trade_views.py`

#### 변경 위치: DocumentChatStreamView 클래스

**1-1. API 문서 주석 업데이트 (라인 735-739)**
```diff
@@ -735,7 +735,8 @@
         "doc_id": 1,           # 필수: Document ID
         "message": "...",      # 필수
         "user_id": "emp001",   # 선택: 로그인 사용자
-        "document_content": ""  # 선택: 현재 화면 에디터 내용
+        "document_content": "",  # 선택: 현재 화면 에디터 내용
+        "prev_documents": {}   # 선택: 이전 step 문서 내용 (저장 여부 무관, 실시간 전달)
     }
```

**1-2. POST 메서드에서 prev_documents 파싱 (라인 746-751)**
```diff
@@ -746,8 +747,9 @@
             user_id = data.get('user_id')
             message = data.get('message')
             document_content = data.get('document_content', '')
+            prev_documents = data.get('prev_documents', {})  # 이전 step 문서 내용

-            logger.info(f"DocumentChatStreamView: doc_id={doc_id}, user_id={user_id}, message={message[:50] if message else 'None'}, doc_content_len={len(document_content)}")
+            logger.info(f"DocumentChatStreamView: doc_id={doc_id}, user_id={user_id}, message={message[:50] if message else 'None'}, doc_content_len={len(document_content)}, prev_docs={list(prev_documents.keys())}")
```

**1-3. stream_response 호출부 수정 (라인 769-771)**
```diff
@@ -767,7 +769,7 @@
         response = StreamingHttpResponse(
-            self.stream_response(doc_id, user_id, message, document_content),
+            self.stream_response(doc_id, user_id, message, document_content, prev_documents),
             content_type='text/event-stream'
         )
```

**1-4. stream_response 함수 시그니처 변경 (라인 779-782)**
```diff
@@ -776,8 +778,11 @@
-    def stream_response(self, doc_id, user_id, message, document_content=''):
+    def stream_response(self, doc_id, user_id, message, document_content='', prev_documents=None):
         """문서 Agent 스트리밍 응답 생성기"""
+        if prev_documents is None:
+            prev_documents = {}
```

**1-5. 이전 문서 조회 로직 전면 개편 (라인 877-951)**

기존 코드 (삭제):
```python
# 이전 step 문서 내용 참조 (RDS DocVersion에서 직접 조회 - 더 신뢰성 있음)
try:
    sibling_docs = Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)
    prev_doc_contents = []
    for sibling_doc in sibling_docs:
        # 가장 최근 버전 가져오기
        latest_version = DocVersion.objects.filter(doc=sibling_doc).order_by('-created_at').first()
        if latest_version and latest_version.content:
            content_data = latest_version.content
            html_content = ''
            if isinstance(content_data, dict):
                html_content = content_data.get('html', '') or content_data.get('html_content', '')
            else:
                html_content = str(content_data)
            if html_content and html_content.strip():
                text_content = re.sub(r'<[^>]+>', ' ', html_content)
                text_content = re.sub(r'\s+', ' ', text_content).strip()
                if text_content:
                    prev_doc_contents.append(f"  [{sibling_doc.doc_type}]\n{text_content[:1500]}")
    if prev_doc_contents:
        context_parts.append(f"[이전 step 문서 내용 - 참조용]\n" + "\n\n".join(prev_doc_contents))
        logger.info(f"이전 문서 {len(prev_doc_contents)}개 내용을 컨텍스트에 추가")
except Exception as e:
    logger.error(f"이전 문서 조회 오류: {e}")
```

신규 코드 (추가):
```python
# 이전 step 문서 내용 참조
# 1. 프론트엔드에서 전달된 prev_documents 우선 사용 (직접 작성 문서)
# 2. 업로드 문서는 DB의 extracted_text 조회
# prev_documents: { "offer": { "type": "manual"|"upload", "content": "..." }, ... }
prev_doc_contents = []

# 문서 타입 표시명 매핑
doc_type_display = {
    'offer': 'Offer Sheet',
    'pi': 'Proforma Invoice',
    'contract': 'Sales Contract',
    'ci': 'Commercial Invoice',
    'pl': 'Packing List'
}

# 이전 문서 조회 (현재 문서 제외)
try:
    sibling_docs = Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)
    processed_doc_types = set()  # 이미 처리된 문서 타입 추적

    for sibling_doc in sibling_docs:
        doc_type = sibling_doc.doc_type
        display_name = doc_type_display.get(doc_type, doc_type)
        text_content = None
        mode_label = ""

        # 1. 프론트엔드에서 전달된 데이터 확인 (직접 작성 문서)
        if prev_documents and doc_type in prev_documents:
            doc_info = prev_documents[doc_type]
            if doc_info:
                content = doc_info.get('content', '')
                mode = doc_info.get('type', 'manual')

                if content and content.strip():
                    # HTML 태그 제거하여 순수 텍스트 추출
                    text_content = re.sub(r'<[^>]+>', ' ', content)
                    text_content = re.sub(r'\s+', ' ', text_content).strip()
                    mode_label = "(업로드)" if mode == 'upload' else "(직접작성)"

        # 2. 프론트엔드 데이터가 없으면 DB에서 조회
        if not text_content:
            # 업로드 문서: extracted_text 사용
            if sibling_doc.doc_mode == 'upload' and sibling_doc.extracted_text:
                text_content = sibling_doc.extracted_text.strip()
                mode_label = "(업로드)"
                logger.info(f"📄 업로드 문서 extracted_text 사용: {doc_type}, {len(text_content)}자")

            # 직접 작성 문서: DocVersion에서 조회
            elif sibling_doc.doc_mode == 'manual':
                latest_version = DocVersion.objects.filter(doc=sibling_doc).order_by('-created_at').first()
                if latest_version and latest_version.content:
                    content_data = latest_version.content
                    html_content = ''
                    if isinstance(content_data, dict):
                        html_content = content_data.get('html', '') or content_data.get('html_content', '')
                    else:
                        html_content = str(content_data)

                    if html_content and html_content.strip():
                        text_content = re.sub(r'<[^>]+>', ' ', html_content)
                        text_content = re.sub(r'\s+', ' ', text_content).strip()
                        mode_label = "(직접작성)"

        # 컨텍스트에 추가
        if text_content and doc_type not in processed_doc_types:
            prev_doc_contents.append(f"  [{display_name} {mode_label}]\n{text_content[:1500]}")
            processed_doc_types.add(doc_type)

    if prev_doc_contents:
        context_parts.append(f"[이전 step 문서 내용 - 참조용]\n" + "\n\n".join(prev_doc_contents))
        logger.info(f"✅ 이전 문서 {len(prev_doc_contents)}개 내용을 컨텍스트에 추가")

except Exception as e:
    logger.error(f"이전 문서 조회 오류: {e}")
```

---

### 2. `frontend/components/ChatAssistant.tsx`

#### 변경 위치: 컴포넌트 상단 및 handleSendMessage 함수

**2-1. PrevDocument 인터페이스 추가 (라인 51-55)**
```typescript
// 이전 문서 정보 타입
interface PrevDocument {
  type: 'manual' | 'upload' | 'skip';
  content: string;  // manual: HTML, upload: extracted text 또는 URL
}
```

**2-2. ChatAssistantProps 인터페이스 확장 (라인 63-64)**
```diff
@@ -57,9 +63,11 @@
   userEmployeeId?: string;
   getDocId?: (step: number, shippingDoc?: 'CI' | 'PL' | null) => number | null;
   activeShippingDoc?: 'CI' | 'PL' | null;
+  documentData?: Record<string | number, string | undefined>; // 모든 step의 문서 내용
+  stepModes?: Record<number, 'manual' | 'upload' | 'skip' | null>; // 각 step의 작성 모드
 }
```

**2-3. 함수 시그니처에 props 추가 (라인 66)**
```diff
-export default function ChatAssistant({ currentStep, onClose, editorRef, onApply, documentId, userEmployeeId, getDocId, activeShippingDoc }: ChatAssistantProps) {
+export default function ChatAssistant({ currentStep, onClose, editorRef, onApply, documentId, userEmployeeId, getDocId, activeShippingDoc, documentData, stepModes }: ChatAssistantProps) {
```

**2-4. buildPrevDocuments 함수 추가 (라인 444-490)**
```typescript
// 이전 step 문서 내용 구성 (저장 여부와 무관하게 실시간 데이터 전달)
const buildPrevDocuments = (): Record<string, PrevDocument> => {
  const docTypeMap: Record<number, string> = {
    1: 'offer',
    2: 'pi',
    3: 'contract',
    4: 'ci',
    5: 'pl'
  };

  const prevDocs: Record<string, PrevDocument> = {};

  if (documentData && stepModes) {
    // 현재 step 이전의 모든 문서 수집
    for (let step = 1; step <= 5; step++) {
      // 현재 step은 제외 (document_content로 이미 전달)
      if (step === currentStep) continue;
      // Step 4에서 activeShippingDoc에 따라 CI(4) 또는 PL(5) 중 하나만 현재 step
      if (currentStep === 4 && activeShippingDoc === 'CI' && step === 4) continue;
      if (currentStep === 4 && activeShippingDoc === 'PL' && step === 5) continue;

      const docType = docTypeMap[step];
      const mode = stepModes[step];
      const content = documentData[step];

      // mode가 있으면 prevDocs에 추가
      // - manual/skip: content가 있어야 추가
      // - upload: content 없어도 추가 (백엔드에서 DB의 extracted_text 조회)
      if (mode) {
        if (mode === 'upload') {
          // 업로드 문서: content 없어도 mode 정보 전달 → 백엔드에서 extracted_text 조회
          prevDocs[docType] = {
            type: mode,
            content: content && typeof content === 'string' ? content : ''
          };
        } else if (content && typeof content === 'string' && content.trim()) {
          // 직접작성/skip 문서: content가 있을 때만 추가
          prevDocs[docType] = {
            type: mode,
            content: content
          };
        }
      }
    }
  }

  return prevDocs;
};

const prevDocuments = buildPrevDocuments();
```

**2-5. 디버깅 로그에 prevDocuments 추가 (라인 503-506)**
```diff
@@ -444,7 +503,8 @@
       console.log('🔍 Chat API 호출 정보:', {
         documentId,
         currentDocId,
         effectiveDocId,
         currentStep,
-        userEmployeeId
+        userEmployeeId,
+        prevDocuments: Object.keys(prevDocuments)
       });
```

**2-6. API 요청 body에 prev_documents 추가 (라인 527-528)**
```diff
@@ -467,7 +527,8 @@
           body: JSON.stringify({
             doc_id: effectiveDocId,
             message: currentInput,
             user_id: userEmployeeId,
-            document_content: documentContent  // 현재 작성 중인 문서 내용 전달
+            document_content: documentContent,  // 현재 작성 중인 문서 내용 전달
+            prev_documents: prevDocuments  // 이전 step 문서 내용 전달
           })
```

---

### 3. `frontend/components/document-creation/index.tsx`

#### 변경 위치: ChatAssistant 컴포넌트 호출부 (라인 1485-1491)

```diff
@@ -1485,6 +1485,8 @@
             userEmployeeId={userEmployeeId}
             getDocId={getDocId}
             activeShippingDoc={activeShippingDoc}
+            documentData={documentData}
+            stepModes={stepModes}
           />
```

---

## 충돌 위험도 분석

### 높음 (HIGH) - 주의 필요

| 파일 | 위험 요소 | 해결 방법 |
|------|----------|----------|
| `backend/chat/trade_views.py` | `stream_response` 함수 시그니처 변경, 이전 문서 조회 로직 전면 개편 | 이 브랜치 코드 채택 후 다른 브랜치의 추가 로직만 병합 |

### 중간 (MEDIUM)

| 파일 | 위험 요소 | 해결 방법 |
|------|----------|----------|
| `frontend/components/ChatAssistant.tsx` | `handleSendMessage` 함수 내 API 호출 부분 | 이 브랜치의 `prev_documents` 관련 코드 유지 |
| `frontend/components/document-creation/index.tsx` | `ChatAssistant` props 추가 | 이 브랜치 코드 채택 |

### 낮음 (LOW)

- 없음

---

## Merge 가이드

### 사전 준비

```bash
# 1. 현재 변경사항 커밋
cd /c/Users/mjs/Desktop/trade2/TRADE-AI-ASSISTANT
git add .
git commit -m "feat: AI 챗봇 이전 step 문서 실시간 참조 기능 추가

- prev_documents 파라미터로 이전 문서 내용 전달
- 업로드 문서: DB의 extracted_text 조회
- 직접 작성 문서: 프론트엔드에서 실시간 전달
- 문서 타입별 표시명 추가 (Offer Sheet, PI, Contract, CI, PL)"

# 2. 원격에 푸시
git push origin issue/prev-document-read-v1.0
```

### Merge 명령어

```bash
# 대상 브랜치로 전환
git checkout dev/trade-ai-assistant-v2.1

# 최신 상태로 업데이트
git pull origin dev/trade-ai-assistant-v2.1

# 이 브랜치 merge
git merge issue/prev-document-read-v1.0

# 충돌 발생 시 해결 후
git add .
git commit -m "Merge branch 'issue/prev-document-read-v1.0' into dev/trade-ai-assistant-v2.1"

# 푸시
git push origin dev/trade-ai-assistant-v2.1
```

### 충돌 해결 체크리스트

- [ ] `backend/chat/trade_views.py`: `stream_response` 함수에 `prev_documents` 파라미터 포함 확인
- [ ] `backend/chat/trade_views.py`: 이전 문서 조회 로직이 프론트엔드 우선, DB fallback 구조인지 확인
- [ ] `frontend/components/ChatAssistant.tsx`: `PrevDocument` 인터페이스 존재 확인
- [ ] `frontend/components/ChatAssistant.tsx`: `buildPrevDocuments()` 함수 존재 확인
- [ ] `frontend/components/ChatAssistant.tsx`: API 요청에 `prev_documents` 포함 확인
- [ ] `frontend/components/document-creation/index.tsx`: `documentData`, `stepModes` props 전달 확인

---

## 전체 변경 파일 목록

| 파일 | 변경 유형 | 라인 수 변경 |
|------|----------|-------------|
| `backend/chat/trade_views.py` | Modified | +70, -20 |
| `frontend/components/ChatAssistant.tsx` | Modified | +60, -3 |
| `frontend/components/document-creation/index.tsx` | Modified | +2, -0 |

---

## 테스트 방법

### 기능 테스트

1. **직접 작성 문서 참조 테스트**
   - Step 1에서 Offer Sheet 직접 작성 (저장 안 함)
   - Step 2로 이동
   - AI에게 "이전 문서 내용 요약해줘" 질문
   - 예상 결과: Step 1의 내용이 참조됨

2. **업로드 문서 참조 테스트**
   - Step 1에서 파일 업로드
   - Step 2로 이동
   - AI에게 "이전 문서 내용 요약해줘" 질문
   - 예상 결과: 업로드된 문서의 extracted_text가 참조됨
   - 백엔드 로그에서 `📄 업로드 문서 extracted_text 사용` 메시지 확인

3. **혼합 테스트**
   - Step 1: 업로드
   - Step 2: 직접 작성
   - Step 3에서 AI에게 질문
   - 예상 결과: 두 문서 모두 참조됨

---

## 커밋 히스토리

현재 이 브랜치에는 커밋되지 않은 변경사항만 존재합니다.

```
23a30f7 (HEAD -> issue/prev-document-read-v1.0, origin/issue/prev-document-read-v1.0) 건너뛰기, 파일 업로드 체크되게 수정
40a2697 메인  작업 UI 생성 날짜 추가, 클릭시 이동 로직 변경
13fb657 메인 페이지 작업 UI 전체적으로 수정
...
ae52491 (분기점) trade 삭제 파이프라인 merge
```

**Uncommitted Changes:**
- `backend/chat/trade_views.py` - AI 챗봇 이전 문서 참조 로직
- `frontend/components/ChatAssistant.tsx` - prev_documents 전달 로직
- `frontend/components/document-creation/index.tsx` - props 전달

---

## 문서 버전 정보

- **문서 버전**: 1.0.0
- **작성일**: 2025-12-12
- **작성자**: Claude Code AI Agent
- **검토 상태**: 미검토
