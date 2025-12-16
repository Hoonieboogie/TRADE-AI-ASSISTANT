# 순차적 워크플로우 및 데이터 매핑 정책

## 개요
무역 문서 작성 시 순차적 워크플로우를 강제하고, 버전 복원 시 데이터 일관성을 유지하기 위한 로직 개선.

## 배경
- 무역 문서 순서: Offer Sheet → PI → Contract → CI → PL
- 이전 문서의 데이터가 다음 문서에 자동 매핑됨
- 버전 복원 시 논리적 일관성 필요

## 문제점 (현재)

### 1. 접근 가능 로직 문제
**파일:** `frontend/components/MainPage.tsx` (라인 410-414)

```typescript
// 현재 로직
let isAccessible = stepNumber === 1;
if (stepNumber > 1) {
  const prevStepComplete = checkCompletion(stepNumber - 1);
  isAccessible = prevStepComplete || isDocCompleted;  // 문제!
}
```

**문제:**
- `isDocCompleted`가 true면 (해당 step에 내용 있음) 이전 step 미완성이어도 접근 가능
- 버전 복원으로 Offer가 미완성이 되어도 PI에 내용 있으면 접근 가능으로 표시

### 2. 매핑 충돌 정책 부재
- 버전 복원 후 다음 문서에 이미 작성된 내용이 있을 때
- 새로 복원된 데이터와 기존 데이터 중 무엇이 우선인지 불명확

---

## 해결 방안

### 1. 접근 가능 로직 수정 (엄격한 순차 워크플로우)

**수정 내용:**
```typescript
// 수정 후
let isAccessible = stepNumber === 1;
if (stepNumber > 1) {
  const prevStepComplete = checkCompletion(stepNumber - 1);
  isAccessible = prevStepComplete;  // 이전 step 완료 필수
}
```

**동작:**
- 이전 step이 완료되어야만 다음 step 접근 가능
- 현재 step에 내용이 있어도 이전이 미완성이면 접근 불가
- 데이터는 유지됨 (접근만 불가)

### 2. 매핑 충돌 정책: A (새 값 우선)

**선택:** 새로 매핑되는 값이 우선 (기존 입력 덮어씀)

**이유:**
1. 버전 복원 = 시점 되돌리기 → 그 이후 작업은 새로 해야 함
2. 무역 문서 특성: Offer가 변경되면 PI도 맞춰야 함 (데이터 정합성)
3. Offer "XYZ, 200"인데 PI가 "ABC, 150"이면 실무적으로 문제

**시나리오:**
1. Offer 완성 (회사: "ABC", 수량: 100)
2. PI 작성 (자동 매핑, 사용자가 수량을 150으로 수정)
3. Offer 미완성 버전으로 복원 → PI 접근 불가
4. Offer 다시 완성 (회사: "XYZ", 수량: 200)
5. PI 다시 접근 → **회사: XYZ, 수량: 200** (새 데이터로 매핑)

---

## 수정 파일 목록

### 1. MainPage.tsx - 접근 가능 로직 수정
**파일:** `frontend/components/MainPage.tsx`
**위치:** 라인 410-414

```typescript
// Before
isAccessible = prevStepComplete || isDocCompleted;

// After
isAccessible = prevStepComplete;
```

### 2. handleVersionRestore - sharedData 재추출 확인
**파일:** `frontend/components/document-creation/index.tsx`
**함수:** `handleVersionRestore`

확인 사항:
- 복원된 문서에서 sharedData 추출하는지
- 새 sharedData가 제대로 설정되는지

### 3. updateContentWithSharedData - 덮어쓰기 동작 확인
**파일:** `frontend/hooks/useSharedData.ts`
**함수:** `updateContentWithSharedData`

확인 사항:
- 기존 값이 있어도 새 sharedData로 덮어쓰는지
- A 옵션 (새 값 우선) 동작 확인

---

## 테스트 시나리오

### 시나리오 1: 기본 순차 워크플로우
1. Offer Sheet 완성
2. PI 접근 가능 확인
3. PI 작성 (Offer 데이터 매핑 확인)

### 시나리오 2: 버전 복원 후 접근 불가
1. Offer 완성 → PI 작성 중
2. Offer를 미완성 버전으로 복원
3. 메인페이지에서 PI "접근 불가" (회색 + 빗금) 확인

### 시나리오 3: 재완성 후 새 데이터 매핑
1. 시나리오 2 이후
2. Offer 다시 완성 (다른 데이터로)
3. PI 접근 가능 확인
4. PI에 새 Offer 데이터 매핑 확인 (기존 입력 덮어씀)

---

## 구현 순서

1. ✅ **MainPage.tsx**: 접근 가능 로직 수정 (commit: `2a41169`)
2. ✅ **handleVersionRestore**: sharedData 재추출 로직 확인 완료 (이미 올바르게 구현됨)
   - `setSharedData(newSharedData)` - 복원된 문서에서 추출한 값으로 완전 교체
3. ✅ **updateContentWithSharedData**: 덮어쓰기 동작 확인 완료
   - `field.textContent !== sharedData[key]` - 값이 다르면 새 값으로 덮어씀 (정책 A)
4. ✅ **modifiedSteps 초기화**: 버전 복원 시 저장 모달 오류 수정 (commit: `d345e91`)
5. ⏳ **테스트**: 전체 플로우 검증

---

## 구현 상세

### handleVersionRestore (line 1425-1524)
```typescript
// 2. 복원된 모든 문서에서 sharedData 추출하여 한 번에 설정
const newSharedData: Record<string, string> = {};
// ... 모든 문서에서 유효한 값 추출 ...
setSharedData(newSharedData);  // 완전 교체 (이전 데이터 제거)

// 3.5. modifiedSteps 초기화 (복원된 데이터 기준으로 내용이 있는 step만)
const restoredSteps = new Set<number>();
// ... 복원된 step만 추가 ...
setModifiedSteps(restoredSteps);
```

### updateContentWithSharedData (documentUtils.ts, line 57-80)
```typescript
if (key && sharedData[key]) {
  if (field.textContent !== sharedData[key]) {
    field.textContent = sharedData[key];  // 새 값으로 덮어씀 (정책 A)
    field.setAttribute('data-source', 'mapped');
  }
}
```

### initialContent (line 1547-1551)
```typescript
// Step 이동 시 sharedData 자동 적용
const initialContent = useMemo((): string => {
  const content = documentData[currentDocKey] || hydrateTemplate(...);
  return updateContentWithSharedData(content);  // 새 sharedData 적용
}, [currentDocKey, documentData, sharedData, editorKey]);
```

---

## 관련 파일

- `frontend/components/MainPage.tsx` - 메인페이지 문서 목록
- `frontend/components/document-creation/index.tsx` - 문서 작성 페이지
- `frontend/hooks/useSharedData.ts` - 공유 데이터 관리
- `frontend/components/VersionHistorySidebar.tsx` - 버전 기록 사이드바
