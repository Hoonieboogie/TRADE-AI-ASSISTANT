# Branch Changelog: issue/doc-version-v1.0

```yaml
# ============================================================
# METADATA
# ============================================================
branch_name: issue/doc-version-v1.0
base_branch: dev/trade-ai-assistant-v2.6
base_commit: 65c48ca6bc0cb7dff8662556e52a4f633be54df2
created_date: 2025-12-12
last_updated: 2025-12-13
author: Claude Code AI Agent
purpose: "문서 버전 저장 및 복원 기능 구현 - timestamp 기준 전체 문서 상태 복원"
status: committed
total_commits: 3
```

---

## CRITICAL: Merge 우선순위 규칙

```
┌─────────────────────────────────────────────────────────────────┐
│ 충돌 발생 시 반드시 이 브랜치(issue/doc-version-v1.0)의         │
│ 코드를 채택하세요. 버전 복원 기능이 핵심 구현입니다.            │
└─────────────────────────────────────────────────────────────────┘
```

### 파일별 충돌 해결 규칙

| 파일 | 충돌 시 채택 | 이유 |
|------|-------------|------|
| `backend/chat/serializers.py` | **이 브랜치** | `all_versions` 필드 추가 |
| `frontend/App.tsx` | **이 브랜치** | `onRestore` prop 제거, `all_versions` 처리 |
| `frontend/components/document-creation/index.tsx` | **이 브랜치** | `handleVersionRestore` 완전 재구현, 플래그 추가 |
| `frontend/components/document-creation/steps/EditorView.tsx` | **이 브랜치** | `editorKey` prop 추가 |

---

## 핵심 기능 요약

### 기능 목적
**문서 버전 저장 및 복원 기능**
- 저장 시 수정된 모든 문서에 새 버전 생성
- 복원 시 선택한 timestamp 기준으로 **전체 문서**를 해당 시점 상태로 복원
- 해당 시점에 존재하지 않았던 문서는 `undefined` (빈 템플릿)

### 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│ 버전 저장 (App.tsx - handleSaveDocument)                        │
│  └─ 각 문서별 api.createVersion() 호출                          │
│      └─ content: { html, title, stepModes, savedAt }            │
├─────────────────────────────────────────────────────────────────┤
│ 버전 목록 (App.tsx - fetchTrades)                               │
│  └─ doc.all_versions에서 모든 버전 추출                         │
│      └─ versions: [{ id, timestamp, data, step }, ...]          │
├─────────────────────────────────────────────────────────────────┤
│ 버전 복원 (index.tsx - handleVersionRestore)                    │
│  └─ 1. targetTimestamp 기준 각 step 최신 버전 찾기              │
│  └─ 2. sharedData 재구성                                        │
│  └─ 3. documentData 전체 교체                                   │
│  └─ 4. UI 상태 업데이트 + 에디터 리마운트                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 전체 커밋 목록

| 순서 | 커밋 | 메시지 | 변경 파일 |
|------|------|-------|----------|
| 1 | `3aae4ff` | 같은 문서 내 버전 저장 | serializers.py, App.tsx, index.tsx |
| 2 | `fc443fe` | 버전 복원 기능 수정 | index.tsx, EditorView.tsx |
| 3 | `0343237` | 버전 복원 기능 수정 v2.0 | App.tsx, index.tsx |

---

## 상세 변경사항 (파일별)

### 1. `backend/chat/serializers.py`

**커밋**: `3aae4ff`

**변경 내용**: `all_versions` 필드 추가

```diff
@@ -80,11 +80,12 @@ class DocumentSerializer(serializers.ModelSerializer):

 class DocumentDashboardSerializer(DocumentSerializer):
-    """대시보드용 문서 Serializer (최신 버전 포함)"""
+    """대시보드용 문서 Serializer (최신 버전 및 모든 버전 포함)"""
     latest_version = serializers.SerializerMethodField()
+    all_versions = serializers.SerializerMethodField()

     class Meta(DocumentSerializer.Meta):
-        fields = DocumentSerializer.Meta.fields + ['latest_version']
+        fields = DocumentSerializer.Meta.fields + ['latest_version', 'all_versions']
```

**추가된 메서드** (라인 103-112):
```python
def get_all_versions(self, obj):
    """모든 버전을 시간순으로 반환 (최신순)"""
    versions = getattr(obj, 'prefetched_versions', None)
    if versions:
        return DocVersionSerializer(versions, many=True).data
    # Fallback
    versions = obj.versions.order_by('-created_at').all()
    return DocVersionSerializer(versions, many=True).data
```

---

### 2. `frontend/App.tsx`

**커밋**: `3aae4ff`, `0343237`

#### 2-1. versions 목록 처리 변경 (라인 329-351)

**Before**:
```typescript
// Add to versions list (for sidebar)
allVersions.push({
  id: doc.latest_version.version_id.toString(),
  timestamp: new Date(doc.latest_version.created_at).getTime(),
  data: { [step]: latestContent.html || latestContent, title: latestContent.title },
  step: step
});
```

**After**:
```typescript
// 2. Add ALL versions to versions list (for sidebar)
if (doc.all_versions && Array.isArray(doc.all_versions)) {
  doc.all_versions.forEach((version: any) => {
    if (version.content) {
      const versionContent = version.content;
      allVersions.push({
        id: version.version_id.toString(),
        timestamp: new Date(version.created_at).getTime(),
        data: { [step]: versionContent.html || versionContent, title: versionContent.title },
        step: step
      });
    }
  });
}
```

#### 2-2. onRestore prop 제거 (라인 762-771)

**삭제된 코드**:
```typescript
onRestore={(version) => {
  setDocumentData(prev => ({
    ...prev,
    [version.step]: version.data[version.step]
  }));
  if (currentStep !== version.step) {
    setCurrentStep(version.step);
  }
}}
```

#### 2-3. 불필요한 console.log 제거 (라인 543-546)

**삭제**:
```typescript
console.log(`[API] Saved version for doc ${document.doc_id} (${docType})`);
// ...
console.log(`[API] Skipped saving unchanged doc ${document.doc_id} (${docType})`);
```

---

### 3. `frontend/components/document-creation/index.tsx`

**커밋**: `3aae4ff`, `fc443fe`, `0343237`

#### 3-1. props에서 onRestore 제거 (라인 67-70)

```diff
-  onRestore,
   initialActiveShippingDoc,
```

#### 3-2. isRestoringVersion 플래그 추가 (라인 140)

```typescript
const isLoadingTemplate = useRef(false); // 템플릿 로딩 중 플래그
const isRestoringVersion = useRef(false); // 버전 복원 중 플래그
```

#### 3-3. L/C useEffect 수정 - undefined step 처리 (라인 229-289)

**Before**:
```typescript
const updateFields = (step: number, fields: string[]) => {
  let content = newData[step];
  if (!content) {
    content = hydrateTemplate(getTemplateForStep(step));
  }
  if (!content) return;
  // ...
};
```

**After**:
```typescript
const updateFields = (step: number, fields: string[]) => {
  const content = newData[step];
  // 해당 step에 콘텐츠가 없으면 (버전 복원으로 undefined인 경우 등) 처리하지 않음
  if (!content) return;
  // ...
};
```

**의존성 배열 변경**:
```diff
-}, [documentData[3], hydrateTemplate]);
+}, [documentData[3], setDocumentData]);
```

#### 3-4. handleStepChange 수정 (라인 324-363)

**추가**:
```typescript
const handleStepChange = (newStep: number) => {
  // Step 변경 시 에디터 초기화로 인한 onChange 무시하기 위해 플래그 설정
  isLoadingTemplate.current = true;

  // ... 기존 로직 ...

  setCurrentStep(newStep);

  // 에디터 초기화 완료 후 플래그 해제
  setTimeout(() => {
    isLoadingTemplate.current = false;
  }, 100);
};
```

#### 3-5. handleEditorChange 수정 (라인 664-685)

**추가**:
```typescript
const handleEditorChange = (content: string) => {
  // 버전 복원 중에는 에디터 변경을 완전히 무시 (복원된 상태 보호)
  if (isRestoringVersion.current) {
    return;
  }

  // ...

  // 템플릿 로딩 중에는 isDirty만 설정하지 않음 (데이터는 저장)
  if (!isLoadingTemplate.current) {
    markStepModified(saveKey);
    setIsDirty(true);
  }
};
```

#### 3-6. handleModeSelect 간소화 (라인 690-703)

**Before**:
```typescript
isLoadingTemplate.current = true;
setIsDirty(false);
setStepModes(prev => ({ ...prev, [currentStep]: mode }));
setTimeout(() => {
  isLoadingTemplate.current = false;
}, 500);
```

**After**:
```typescript
setStepModes(prev => ({ ...prev, [currentStep]: mode }));
setIsDirty(false);
```

#### 3-7. handleRowAdded/handleRowDeleted 수정 (라인 847-946)

**Before**:
```typescript
let content = prev[step];
if (!content) {
  content = hydrateTemplate(getTemplateForStep(step));
}
```

**After**:
```typescript
const content = prev[step];
if (!content) return;  // 콘텐츠가 없는 step은 건너뜀
```

**의존성 배열 변경**:
```diff
-}, [currentStep, activeShippingDoc, hydrateTemplate, setDocumentData]);
+}, [currentStep, activeShippingDoc, setDocumentData]);
```

#### 3-8. handleShippingDocChange 수정 (라인 948-965)

**추가**:
```typescript
const handleShippingDocChange = (doc: ShippingDocType) => {
  isLoadingTemplate.current = true;
  // ... 기존 로직 ...
  setTimeout(() => {
    isLoadingTemplate.current = false;
  }, 100);
};
```

#### 3-9. handleVersionRestore 완전 재구현 (라인 967-1040)

**전체 코드**:
```typescript
const handleVersionRestore = (version: Version) => {
  const targetTimestamp = version.timestamp;
  const step = version.step;

  // 플래그 설정
  isRestoringVersion.current = true;
  isLoadingTemplate.current = true;

  // 1. timestamp 기준 각 문서 상태 복원
  const restoredDocumentData: DocumentData = {
    title: version.data.title || documentData.title,
    1: undefined, 2: undefined, 3: undefined, 4: undefined, 5: undefined,
  };

  for (let docStep = 1; docStep <= 5; docStep++) {
    const stepVersions = versions
      .filter(v => v.step === docStep && v.timestamp <= targetTimestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
    if (stepVersions.length > 0) {
      restoredDocumentData[docStep] = stepVersions[0].data[docStep];
    }
  }

  // 2. sharedData 재구성
  const newSharedData: Record<string, string> = {};
  const parser = new DOMParser();
  for (let docStep = 1; docStep <= 5; docStep++) {
    const content = restoredDocumentData[docStep];
    if (content) {
      const doc = parser.parseFromString(content, 'text/html');
      doc.querySelectorAll('span[data-field-id]').forEach(field => {
        const key = field.getAttribute('data-field-id');
        const value = field.textContent;
        const source = field.getAttribute('data-source');
        if (key && value && value !== `[${key}]` && source !== 'auto' && !newSharedData[key]) {
          newSharedData[key] = value;
        }
      });
    }
  }
  setSharedData(newSharedData);

  // 3. documentData 교체
  setDocumentData(restoredDocumentData);

  // 4. UI 상태 업데이트
  setShowVersionHistory(false);
  if (step <= 3) {
    setCurrentStep(step);
    setStepModes(prev => ({ ...prev, [step]: 'manual' }));
  } else {
    setCurrentStep(4);
    setActiveShippingDoc(step === 4 ? 'CI' : 'PL');
  }

  // 5. 에디터 리마운트 및 플래그 해제
  setEditorKey(prev => prev + 1);
  setTimeout(() => {
    isRestoringVersion.current = false;
    isLoadingTemplate.current = false;
  }, 100);
};
```

#### 3-10. initialContent useMemo 의존성 추가 (라인 1047)

```diff
-}, [currentDocKey, documentData[currentDocKey], sharedData]);
+}, [currentDocKey, documentData[currentDocKey], sharedData, editorKey]);
```

#### 3-11. EditorView에 editorKey prop 전달 (라인 1270)

```diff
+editorKey={editorKey}
```

---

### 4. `frontend/components/document-creation/steps/EditorView.tsx`

**커밋**: `fc443fe`

#### 4-1. editorKey prop 추가 (라인 13, 28)

```typescript
interface EditorViewProps {
  // ...
  editorKey?: number;
}

export default function EditorView({
  // ...
  editorKey = 0,
}) {
```

#### 4-2. ContractEditor key 수정 (라인 47)

```diff
-key={`${currentStep}-${activeShippingDoc || 'default'}`}
+key={`${currentStep}-${activeShippingDoc || 'default'}-${editorKey}`}
```

---

## 충돌 위험도 분석

### 높음 (HIGH)

| 파일 | 위험 요소 | 해결 방법 |
|------|----------|----------|
| `index.tsx` | `handleVersionRestore` 완전 재구현, 여러 함수 수정 | 이 브랜치 전체 채택 |
| `App.tsx` | `onRestore` prop 제거, versions 처리 변경 | 이 브랜치 채택 |

### 중간 (MEDIUM)

| 파일 | 위험 요소 | 해결 방법 |
|------|----------|----------|
| `serializers.py` | `all_versions` 필드 추가 | 이 브랜치 채택 |
| `EditorView.tsx` | `editorKey` prop 추가 | 이 브랜치 채택 |

---

## Merge 가이드

### 사전 확인

```bash
git fetch origin
git status  # clean 상태 확인
```

### Merge 명령어

```bash
# 대상 브랜치로 전환
git checkout [target-branch]
git pull origin [target-branch]

# merge
git merge issue/doc-version-v1.0

# 충돌 시 해결 후
git add .
git commit -m "Merge branch 'issue/doc-version-v1.0' - 버전 복원 기능"
git push origin [target-branch]
```

### 충돌 해결 체크리스트

- [ ] `serializers.py`: `all_versions` 필드 및 `get_all_versions` 메서드 존재
- [ ] `App.tsx`: `onRestore` prop 제거됨
- [ ] `App.tsx`: `all_versions` 배열 처리 로직 존재
- [ ] `index.tsx`: `isRestoringVersion` ref 존재
- [ ] `index.tsx`: `handleVersionRestore`가 timestamp 기반 복원
- [ ] `index.tsx`: `handleEditorChange`에서 `isRestoringVersion` 체크
- [ ] `EditorView.tsx`: `editorKey` prop 존재
- [ ] `EditorView.tsx`: ContractEditor key에 `editorKey` 포함

---

## 전체 변경 파일 목록

| 파일 | 라인 변경 |
|------|----------|
| `backend/chat/serializers.py` | +15, -3 |
| `frontend/App.tsx` | +13, -22 |
| `frontend/components/document-creation/index.tsx` | +115, -55 |
| `frontend/components/document-creation/steps/EditorView.tsx` | +2, -0 |

**총계**: +145, -80

---

## 테스트 방법

1. **버전 저장**: Offer 작성 → 저장 → 추가 입력 → 저장 → PI 이동 → 저장
2. **버전 목록**: 사이드바에서 3개 버전 표시 확인
3. **버전 복원**: 버전 1 선택 → Offer만 복원, PI는 빈 템플릿
4. **에디터 입력**: 모드 선택 후 첫 입력 정상 동작

---

## 문서 버전

- **버전**: 1.0.0
- **작성일**: 2025-12-13
- **작성자**: Claude Code AI Agent
