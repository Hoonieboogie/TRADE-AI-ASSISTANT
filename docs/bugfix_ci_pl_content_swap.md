# CI/PL 콘텐츠 교차 저장 버그 수정 계획서

## 1. 개요

### 1.1 버그 현상
- PL 작성 중 에이전트로 항목 채운 후 CI로 전환하면 CI 화면에 PL 콘텐츠가 렌더링됨
- 해당 상태로 저장 후 재접속하면 CI가 계속 PL로 표시됨

### 1.2 영향 범위
- Step 4 (Shipping Documents) - CI/PL 전환 시
- 에이전트 응답 적용 기능
- 문서 데이터 무결성

### 1.3 심각도
**High** - 데이터 손실 및 문서 무결성 훼손

---

## 2. 원인 분석

### 2.1 근본 원인
**Step(시각적 단계)과 DocKey(데이터 키) 개념 혼동**

| 구분 | Step | DocKey |
|------|------|--------|
| CI | 4 | 4 |
| PL | 4 | 5 |

Step 4에서 CI/PL 모두 `currentStep=4`이지만, 실제 데이터 키는 CI=4, PL=5로 다름.

### 2.2 버그 발생 지점

#### ChatAssistant.tsx (line 440-446)
```typescript
const requestStep = currentStep;  // PL 작성 중이어도 항상 4

const userMessage: Message = {
  step: requestStep,  // step=4로 저장됨 (PL은 5여야 함)
};
```

#### index.tsx - handleChatApply (line 1107)
```typescript
setDocumentData((prev: DocumentData) => ({
  ...prev,
  [step]: updatedContent  // step=4 → CI에 PL 콘텐츠 저장
}));
```

### 2.3 버그 흐름
```
1. PL 작성 중 (currentStep=4, activeShippingDoc='PL', docKey=5)
2. 에이전트 요청 → message.step = 4 (잘못됨)
3. 적용 클릭 → onApply(changes, step=4)
4. handleChatApply → documentData[4] = PL 콘텐츠 (CI 오염)
5. CI 전환 → documentData[4] 참조 → PL 렌더링
6. 저장 → 오염된 데이터 영구화
```

---

## 3. 수정 계획

### 3.1 수정 전략
**방법 2: ChatAssistant에서 실제 docKey 전달 (소스에서 해결)**

소스(ChatAssistant)에서 올바른 docKey를 계산하여 저장하면, 이후 모든 경로(바로 적용, 미리보기 적용, 히스토리 재적용)에서 자동으로 해결됨.

### 3.2 수정 파일
| 파일 | 수정 내용 |
|------|-----------|
| `frontend/components/ChatAssistant.tsx` | requestStep → requestDocKey 변환 로직 추가 |

### 3.3 수정 범위
- 수정 파일: 1개
- 수정 라인: 약 5줄
- 영향 범위: ChatAssistant 내부 로직만

---

## 4. 상세 수정 내용

### 4.1 ChatAssistant.tsx

#### 수정 위치 1: handleSubmit 함수 (line 440 부근)

**Before:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  const requestStep = currentStep;

  const userMessage: Message = {
    id: Date.now().toString(),
    type: 'user',
    content: input,
    step: requestStep
  };
```

**After:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || isLoading) return;

  // Step 4에서는 activeShippingDoc으로 실제 docKey 결정
  const requestDocKey = currentStep <= 3
    ? currentStep
    : (activeShippingDoc === 'PL' ? 5 : 4);

  const userMessage: Message = {
    id: Date.now().toString(),
    type: 'user',
    content: input,
    step: requestDocKey  // 실제 docKey 저장
  };
```

#### 변경 사항 요약
- `requestStep` → `requestDocKey`로 변수명 변경
- Step 4일 때 `activeShippingDoc` 기반으로 실제 docKey(4 또는 5) 계산
- `message.step`에 docKey 저장

---

## 5. 검증 계획

### 5.1 테스트 시나리오

#### 시나리오 1: PL → CI (원래 버그 케이스)
1. Step 4에서 PL 선택
2. 에이전트에게 "항목 채워줘" 요청
3. "바로 적용" 클릭
4. CI 탭 클릭
5. **예상 결과**: CI 콘텐츠 정상 표시

#### 시나리오 2: CI → PL (역방향)
1. Step 4에서 CI 선택
2. 에이전트에게 "항목 채워줘" 요청
3. "바로 적용" 클릭
4. PL 탭 클릭
5. **예상 결과**: PL 콘텐츠 정상 표시

#### 시나리오 3: 미리보기 후 적용
1. PL에서 에이전트 요청
2. "미리보기" 클릭 후 "적용하기"
3. CI 탭 클릭
4. **예상 결과**: CI 콘텐츠 정상 표시

#### 시나리오 4: 저장 후 재접속
1. PL에서 에이전트 적용 후 CI 전환
2. 저장 후 나가기
3. 재접속
4. **예상 결과**: CI/PL 각각 올바른 콘텐츠

### 5.2 회귀 테스트
- Step 1~3 에이전트 적용 정상 동작 확인
- 채팅 히스토리 로드/저장 정상 동작 확인
- 기존 문서 데이터 호환성 확인

---

## 6. 롤백 계획

### 6.1 롤백 조건
- 수정 후 새로운 버그 발생
- 기존 기능 회귀

### 6.2 롤백 방법
```bash
git revert <commit-hash>
```

### 6.3 롤백 영향
- ChatAssistant.tsx 1개 파일만 롤백
- 다른 기능에 영향 없음

---

## 7. 일정

| 단계 | 예상 소요 |
|------|-----------|
| 코드 수정 | 5분 |
| 로컬 테스트 | 15분 |
| 코드 리뷰 | - |
| 배포 | - |

---

## 8. 관련 코드 참조

### 8.1 관련 파일
- `frontend/components/ChatAssistant.tsx` - 수정 대상
- `frontend/components/document-creation/index.tsx` - handleChatApply
- `frontend/components/document-creation/hooks/useDocumentState.ts` - getDocKeyForStep

### 8.2 관련 타입
```typescript
// Message.step은 실제로 docKey를 저장
interface Message {
  step?: number;  // 1, 2, 3, 4(CI), 5(PL)
}
```

---

## 9. 향후 개선 권장사항

### 9.1 인터페이스 명확화 (선택적)
현재 `message.step`이 실제로는 docKey를 저장하므로, 향후 혼동 방지를 위해:

```typescript
interface Message {
  step?: number;      // 시각적 단계 (1~4) - deprecated
  docKey?: number;    // 실제 문서 키 (1~5) - 신규
}
```

### 9.2 타입 안전성 강화 (선택적)
```typescript
type DocKey = 1 | 2 | 3 | 4 | 5;
type VisualStep = 1 | 2 | 3 | 4;
```

---

## 10. 작성 정보

- **작성일**: 2025-12-16
- **작성자**: Claude Code
- **버전**: 1.0
