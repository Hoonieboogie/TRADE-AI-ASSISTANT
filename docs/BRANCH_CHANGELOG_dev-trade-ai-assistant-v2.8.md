# Branch Changelog: dev/trade-ai-assistant-v2.8

```yaml
# METADATA
branch: dev/trade-ai-assistant-v2.8
base_branch: main
created_at: 2025-12-15
last_updated: 2025-12-15T17:00:00+09:00
total_commits_from_main: 78
status: active (1 commit ahead of origin, 3 files with uncommitted changes)
authors:
  - happyfrogg
  - claude-ai-assistant
```

---

## CRITICAL: Merge Rules

> **AI 에이전트가 머지할 때 반드시 지켜야 할 규칙**

### 1. 이 브랜치가 우선인 파일들
```
frontend/App.tsx
frontend/components/document-creation/index.tsx
frontend/components/document-creation/types.ts
```

### 2. 핵심 변경사항 (절대 덮어쓰면 안 됨)
| 파일 | 변경 내용 | 이유 |
|------|----------|------|
| `App.tsx` | `createNewTrade` 반환 타입 변경 | doc_mode 동기화 버그 수정 |
| `App.tsx` | `handleNavigate('documents')` 항상 초기화 | 새 trade 버전 혼동 버그 수정 |
| `App.tsx` | `handleSaveDocument` skip/upload 모드 스킵 | doc_mode 유지 버그 수정 |
| `index.tsx` | `handleModeSelect` docIds 직접 사용 | 백엔드 doc_mode 동기화 |
| `types.ts` | `onCreateTrade` 타입 수정 | 타입 일치 |

### 3. 충돌 시 해결 방법
```
충돌 발생 시:
1. 이 브랜치(dev/trade-ai-assistant-v2.8)의 코드를 채택
2. 다른 브랜치의 추가 기능만 병합
3. 테스트: step1 건너뛰기 → step2 저장 → 재접속 → step1이 건너뛰기로 유지되는지 확인
```

---

## 최근 세션 변경사항 (Uncommitted)

### 변경된 파일 목록
```
modified:   frontend/App.tsx
modified:   frontend/components/document-creation/index.tsx
modified:   frontend/components/document-creation/types.ts
```

### 1. frontend/App.tsx

#### 1.1 createNewTrade 반환 타입 변경 (Line 108-133)

**Before:**
```typescript
const createNewTrade = async (): Promise<string | null> => {
  // ...
  return tradeId;
}
```

**After:**
```typescript
const createNewTrade = async (): Promise<{ tradeId: string; docIds: Record<string, number> } | null> => {
  if (currentDocId || !currentUser) {
    return currentDocId ? { tradeId: currentDocId, docIds: currentDocIds || {} } : null;
  }
  // ...
  return { tradeId, docIds: data.doc_ids };
}
```

**이유:** `handleModeSelect`에서 새 Trade 생성 직후 `doc_mode`를 백엔드에 업데이트해야 하는데, React 상태 업데이트가 비동기적이라 `getDocId`가 아직 갱신 안 된 상태에서 호출됨. `docIds`를 직접 반환하여 즉시 사용 가능하게 함.

#### 1.2 handleNavigate('documents') 항상 초기화 (Line 79-87)

**Before:**
```typescript
if (page === 'documents') {
  if (!currentDocId) {
    setCurrentStep(1);
    setDocumentData({});
    // ...
  }
}
```

**After:**
```typescript
if (page === 'documents') {
  setCurrentDocId(null);
  setCurrentDocIds(null);
  setCurrentStep(1);
  setDocumentData({});
  setCurrentActiveShippingDoc(null);
  setDocSessionId(Date.now().toString());
}
```

**이유:** 새 문서 작성 시 항상 초기화하여 이전 trade의 버전이 새 trade에 표시되는 버그 수정. `handleOpenDocument`는 `setCurrentPage`를 직접 호출하므로 영향 없음.

#### 1.3 handleSaveDocument skip/upload 모드 스킵 (Line 351-353)

**Before:**
```typescript
await Promise.all(docKeys.map(async (key) => {
  const content = data[key];
  if (content) {
    // ... 버전 저장
  }
}));
```

**After:**
```typescript
await Promise.all([1, 2, 3, 4, 5].map(async (key) => {
  const stepMode = data.stepModes?.[key];
  if (stepMode === 'skip' || stepMode === 'upload') return;  // 버전 저장 스킵

  const content = data[key];
  if (!content) return;
  // ... 버전 저장
}));
```

**이유:** 백엔드 `DocVersionViewSet.create`가 버전 생성 시 `doc_mode`를 강제로 `'manual'`로 변경함. skip/upload 모드 문서는 버전을 저장하지 않아 `doc_mode` 유지.

### 2. frontend/components/document-creation/index.tsx

#### 2.1 handleModeSelect docIds 직접 사용 (Line 705-725)

**Before:**
```typescript
const handleModeSelect = async (mode: StepMode) => {
  if (onCreateTrade) {
    await onCreateTrade();
  }
  setStepModes(prev => ({ ...prev, [currentStep]: mode }));
  setIsDirty(false);

  const docId = getDocId?.(currentStep, null);
  if (docId && mode) {
    // PATCH 요청
  }
};
```

**After:**
```typescript
const handleModeSelect = async (mode: StepMode) => {
  const result = onCreateTrade ? await onCreateTrade() : null;
  const docIds = result?.docIds || null;

  setStepModes(prev => ({ ...prev, [currentStep]: mode }));
  setIsDirty(false);

  const stepToDocType: Record<number, string> = { 1: 'offer', 2: 'pi', 3: 'contract', 4: 'ci', 5: 'pl' };
  const docId = docIds?.[stepToDocType[currentStep]] ?? getDocId?.(currentStep, null);

  if (docId && mode) {
    // PATCH 요청
  }
};
```

**이유:** 새 Trade 생성 직후 `docIds`를 직접 사용하여 백엔드 `doc_mode` 업데이트 가능. 기존 Trade는 `getDocId` 사용.

### 3. frontend/components/document-creation/types.ts

#### 3.1 onCreateTrade 타입 수정 (Line 25)

**Before:**
```typescript
onCreateTrade?: () => Promise<string | null>;
```

**After:**
```typescript
onCreateTrade?: () => Promise<{ tradeId: string; docIds: Record<string, number> } | null>;
```

---

## 전체 커밋 히스토리 (main 기준)

### 최근 커밋 (이 브랜치 전용)
| Hash | Message | Files |
|------|---------|-------|
| `24062ec` | 표 작업 step 적용 문제 수정 | index.tsx |
| `2b5aefc` | 새로고침 시 세션 유지 수정 | App.tsx, index.tsx |
| `f591e94` | Docker 배포 설정 추가 | Dockerfile 등 |
| `40a1e38` | 필요없는 문서 삭제 | - |
| `43d80fb` | 일반채팅 나가기 시 채팅 내역 보존 | ChatPage.tsx |

### Merge된 브랜치들
| Hash | Branch | Description |
|------|--------|-------------|
| `2149d6d` | issue/doc-version-v1.0 | 문서 버전 저장/복원 기능 |
| `c412bf7` | feature/trade-title | 거래 제목 기능 |
| `9ec47f3` | issue/uploaded-doc-read-v1.0 | 업로드 문서 읽기 |
| `04db934` | feature/agent-response-status | 에이전트 응답 상태 |
| `36da093` | feature/gen-chat-default | 일반 채팅 기본 |
| `3ccfa7c` | issue/prev-document-read-v1.0 | 이전 문서 읽기 |
| `a9b0da6` | feature/manager-page | 관리자 페이지 |

---

## 주요 기능별 요약

### 1. doc_mode 동기화 버그 수정 (이번 세션)
- **문제:** step1 건너뛰기 → step2 저장 → 재접속 → step1이 직접작성으로 변경
- **원인:** 백엔드 DocVersionViewSet.create가 doc_mode를 'manual'로 강제 변경
- **해결:** 프론트엔드에서 skip/upload 모드 문서는 버전 저장 스킵

### 2. 새 Trade 버전 혼동 버그 수정 (이번 세션)
- **문제:** 새 trade 생성 시 다른 trade의 버전이 히스토리에 표시
- **원인:** handleNavigate('documents')가 currentDocId null일 때만 초기화
- **해결:** 항상 초기화하도록 수정

### 3. 세션 유지 기능 (2b5aefc)
- 새로고침 시 문서 작성 상태 유지
- sessionStorage 활용

### 4. 일반 채팅 개선 (다수 커밋)
- 사이드바 토글 UX/UI 개선
- 채팅 내역 보존
- 스트리밍 격리
- 메시지 즉시 초기화

### 5. 문서 버전 저장/복원 (2149d6d 머지)
- 버전 히스토리 사이드바
- 버전 복원 기능

---

## 충돌 위험도 분석

### 높음 (반드시 확인 필요)
| 파일 | 위험 영역 | 설명 |
|------|----------|------|
| `App.tsx` | Line 77-90 | handleNavigate 초기화 로직 |
| `App.tsx` | Line 108-133 | createNewTrade 반환 타입 |
| `App.tsx` | Line 314-378 | handleSaveDocument 저장 로직 |
| `index.tsx` | Line 705-725 | handleModeSelect |
| `types.ts` | Line 25 | onCreateTrade 타입 |

### 중간
| 파일 | 위험 영역 | 설명 |
|------|----------|------|
| `App.tsx` | fetchTrades | 코드 정리로 인한 diff |
| `App.tsx` | handleOpenDocument | 주석 제거 |

### 낮음
| 파일 | 위험 영역 | 설명 |
|------|----------|------|
| 기타 | - | 단순 코드 정리 |

---

## Merge 가이드

### 사전 준비
```bash
# 1. 현재 브랜치 상태 확인
git status
git log --oneline -5

# 2. uncommitted 변경사항 커밋 (선택)
git add frontend/App.tsx frontend/components/document-creation/index.tsx frontend/components/document-creation/types.ts
git commit -m "fix: doc_mode 동기화 버그 수정 및 코드 정리"

# 3. remote 동기화
git push origin dev/trade-ai-assistant-v2.8
```

### Merge 방법 (다른 브랜치로 머지할 때)
```bash
# 1. 대상 브랜치로 이동
git checkout <target-branch>

# 2. 이 브랜치 머지
git merge dev/trade-ai-assistant-v2.8

# 3. 충돌 발생 시
# - App.tsx: dev/trade-ai-assistant-v2.8 코드 우선 채택
# - index.tsx: dev/trade-ai-assistant-v2.8 코드 우선 채택
# - types.ts: dev/trade-ai-assistant-v2.8 코드 우선 채택

# 4. 충돌 해결 후
git add .
git commit -m "Merge branch 'dev/trade-ai-assistant-v2.8'"
```

### 머지 후 테스트 체크리스트
- [ ] step1 건너뛰기 → step2 저장 → 재접속 → step1이 건너뛰기 유지
- [ ] step1 업로드 → step2 저장 → 재접속 → step1이 업로드 유지
- [ ] 새 trade 생성 → 버전 히스토리가 비어있음
- [ ] 기존 trade 열기 → 해당 trade의 버전만 표시
- [ ] 일반 채팅 → 채팅방 전환 → 메시지 격리
- [ ] 새로고침 → 문서 작성 상태 유지

---

## 전체 변경 파일 목록 (main 대비)

### Frontend (주요)
```
frontend/App.tsx
frontend/components/document-creation/index.tsx
frontend/components/document-creation/types.ts
frontend/components/ChatPage.tsx
frontend/components/ChatAssistant.tsx
frontend/components/MainPage.tsx
frontend/components/AdminPage.tsx
frontend/components/VersionHistorySidebar.tsx
frontend/components/chat-sidebar/*
```

### Backend (주요)
```
backend/chat/views.py
backend/chat/trade_views.py
backend/chat/memory_service.py
backend/documents/views.py
backend/documents/services.py
```

### 총 변경 파일 수: 약 100+개

---

## 참고 사항

### 관련 브랜치들
- `issue/uploaded-doc-read-v1.0` - 업로드 문서 읽기
- `issue/uploaded-file-v1.0` - 업로드 파일 처리
- `issue/doc-version-v1.0` - 문서 버전 (이미 머지됨)
- `issue/prev-document-read-v1.0` - 이전 문서 읽기 (이미 머지됨)

### 관련 문서
- `docs/Backend_deployment_guide.md`
- `docs/Frontend_deployment_guide.md`

### 다른 브랜치와 머지 시 주의사항
1. **App.tsx** - 이 브랜치의 `createNewTrade` 반환 타입 변경 필수 유지
2. **index.tsx** - `handleModeSelect`에서 `docIds` 직접 사용 로직 필수 유지
3. **types.ts** - `onCreateTrade` 타입 일치 확인

---

*Generated by Claude AI Assistant on 2025-12-15*
