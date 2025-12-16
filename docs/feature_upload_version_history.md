# 업로드 문서 버전 기록 저장 기능 구현 계획서

## 1. 개요

### 1.1 현재 상태
- 업로드 문서는 Document 테이블에만 저장됨
- DocVersion 테이블에 기록되지 않아 버전 기록에 표시 안 됨
- 같은 step에 재업로드 시 이전 S3 파일이 orphan으로 남음

### 1.2 목표
1. 업로드 문서도 DocVersion에 저장하여 버전 기록 표시
2. 재업로드 시 이전 S3 파일 삭제 (orphan 방지)
3. 버전 기록 UI에서 업로드/에디터 버전 구분 표시
4. **버전 복원 시 해당 모드로 전환** (업로드→뷰어, 에디터→에디터)

### 1.3 영향 범위
- 백엔드: documents/views.py, documents/services.py
- 프론트엔드: App.tsx, VersionHistorySidebar.tsx, index.tsx, useFileUpload.ts

---

## 2. 버전 복원 동작 정의

### 2.1 시나리오
```
1. 문서 업로드 → 저장 → 버전 A (type: upload)
2. "다시 작성하기" → 에디터로 작성 → 저장 → 버전 B (type: manual)
3. "다시 작성하기" → 다른 문서 업로드 → 저장 → 버전 C (type: upload)

버전 기록 사이드바:
├── 버전 C (업로드) - 클릭 → 업로드 뷰어로 전환
├── 버전 B (에디터) - 클릭 → 에디터로 전환, HTML 로드
└── 버전 A (업로드) - 클릭 → 업로드 뷰어로 전환
```

### 2.2 복원 동작
| 버전 타입 | 복원 시 동작 |
|-----------|-------------|
| upload | stepMode='upload', 뷰어에 S3 파일 표시 |
| manual | stepMode='manual', 에디터에 HTML 로드 |

---

## 3. 상세 구현 계획

### 3.1 백엔드: 이전 S3 파일 삭제

**파일**: `backend/documents/views.py`
**함수**: `upload_request` (line ~391)

```python
@action(detail=True, methods=['post'])
def upload_request(self, request, pk=None):
    document = self.get_object()

    serializer = PresignedUploadRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # [추가] 이전 업로드 파일이 있으면 S3에서 삭제
    if document.s3_key:
        try:
            s3_manager.delete_file(document.s3_key)
            logger.info(f"Deleted previous S3 file: {document.s3_key}")

            # 변환된 PDF도 삭제
            if document.converted_pdf_key:
                s3_manager.delete_file(document.converted_pdf_key)
                logger.info(f"Deleted previous converted PDF: {document.converted_pdf_key}")
        except Exception as e:
            logger.warning(f"Failed to delete previous S3 files: {e}")

    # 기존 presigned URL 생성 로직...
```

---

### 3.2 백엔드: DocVersion 생성

**파일**: `backend/documents/services.py`
**함수**: `process_uploaded_document` (line ~388, `upload_status = 'ready'` 직전)

```python
# 포인트 ID 저장
document.qdrant_point_ids = [p.id for p in points]

# [추가] 업로드 버전 기록 생성
from documents.models import DocVersion
DocVersion.objects.create(
    doc=document,
    content={
        'type': 'upload',
        's3_key': document.s3_key,
        's3_url': document.s3_url,
        'filename': document.original_filename,
        'file_size': document.file_size,
        'mime_type': document.mime_type,
        'converted_pdf_key': getattr(document, 'converted_pdf_key', None),
        'converted_pdf_url': getattr(document, 'converted_pdf_url', None),
    }
)
logger.info(f"Created upload version for document {document.doc_id}")

document.upload_status = 'ready'
document.save()
```

---

### 3.3 프론트엔드: 버전 로드 시 upload 타입 처리

**파일**: `frontend/App.tsx`
**위치**: line ~232-242

```typescript
doc.all_versions?.forEach((version: any) => {
  if (version.content) {
    const vc = version.content;
    const isUpload = vc.type === 'upload';

    allVersions.push({
      id: version.version_id.toString(),
      timestamp: new Date(version.created_at).getTime(),
      data: isUpload
        ? {
            [step]: null,  // 업로드는 HTML 없음
            title: vc.filename,
          }
        : { [step]: vc.html || vc, title: vc.title },
      step,
      // 업로드 버전 추가 정보
      isUpload,
      uploadInfo: isUpload ? {
        s3_key: vc.s3_key,
        s3_url: vc.s3_url,
        filename: vc.filename,
        convertedPdfUrl: vc.converted_pdf_url,
      } : undefined,
    });
  }
});
```

---

### 3.4 프론트엔드: Version 타입 수정

**파일**: `frontend/components/VersionHistorySidebar.tsx`
**위치**: line ~6-11

```typescript
export interface UploadInfo {
  s3_key: string;
  s3_url: string;
  filename: string;
  convertedPdfUrl?: string;
}

export interface Version {
  id: string;
  timestamp: number;
  data: DocumentData;
  step: number;
  isUpload?: boolean;
  uploadInfo?: UploadInfo;
}
```

---

### 3.5 프론트엔드: useFileUpload 훅에 상태 복원 함수 추가

**파일**: `frontend/components/document-creation/hooks/useFileUpload.ts`

```typescript
// 버전 복원 시 업로드 상태 설정용
const restoreUploadState = useCallback((
  step: number,
  data: {
    filename: string;
    s3_url: string;
    convertedPdfUrl?: string;
  }
) => {
  setUploadedFileNames(prev => ({ ...prev, [step]: data.filename }));
  setUploadedDocumentUrls(prev => ({ ...prev, [step]: data.s3_url }));
  setUploadedConvertedPdfUrls(prev => ({ ...prev, [step]: data.convertedPdfUrl || null }));
  setUploadStatus(prev => ({ ...prev, [step]: 'ready' }));
}, []);

return {
  // 기존...
  restoreUploadState,  // 추가
};
```

---

### 3.6 프론트엔드: handleVersionRestore 수정

**파일**: `frontend/components/document-creation/index.tsx`
**함수**: `handleVersionRestore` (line ~1423)

```typescript
const handleVersionRestore = (version: Version) => {
  const targetTimestamp = version.timestamp;
  const step = version.step;

  isRestoringVersion.current = true;
  isLoadingTemplate.current = true;

  // ... 기존 restoredDocumentData 생성 로직 ...

  // ... 기존 sharedData 추출 로직 (업로드 버전이면 스킵) ...

  setDocumentData(restoredDocumentData);

  // UI 상태 업데이트 - 버전 타입에 따라 분기
  setShowVersionHistory(false);

  if (step <= 3) {
    setCurrentStep(step);

    // [수정] 버전 타입에 따라 모드 설정
    if (version.isUpload && version.uploadInfo) {
      // 업로드 버전 복원
      setStepModes(prev => ({ ...prev, [step]: 'upload' }));
      restoreUploadState(step, {
        filename: version.uploadInfo.filename,
        s3_url: version.uploadInfo.s3_url,
        convertedPdfUrl: version.uploadInfo.convertedPdfUrl,
      });
    } else {
      // 에디터 버전 복원
      setStepModes(prev => ({ ...prev, [step]: 'manual' }));
    }
  } else {
    // Step 4 (CI/PL)
    setCurrentStep(4);
    setActiveShippingDoc(step === 4 ? 'CI' : 'PL');

    // [수정] Step 4도 버전 타입에 따라 분기
    if (version.isUpload && version.uploadInfo) {
      setStepModes(prev => ({ ...prev, [4]: 'upload' }));
      restoreUploadState(step, {
        filename: version.uploadInfo.filename,
        s3_url: version.uploadInfo.s3_url,
        convertedPdfUrl: version.uploadInfo.convertedPdfUrl,
      });
    } else {
      setStepModes(prev => ({ ...prev, [4]: 'manual' }));
    }
  }

  setEditorKey(prev => prev + 1);
  setTimeout(() => {
    isRestoringVersion.current = false;
    isLoadingTemplate.current = false;
  }, 100);
};
```

---

### 3.7 프론트엔드: VersionHistorySidebar UI 수정

**파일**: `frontend/components/VersionHistorySidebar.tsx`
**위치**: 버전 카드 렌더링 부분 (line ~199-253)

```typescript
import { Upload, FileText } from 'lucide-react';

// 버전 카드 내부
<div className={`mb-4 p-3 rounded-xl border ${
  version.isUpload
    ? 'bg-amber-50 border-amber-200'
    : 'bg-gray-50 border-gray-100 group-hover:bg-blue-50/30'
}`}>
  <div className="flex items-center gap-2 mb-1">
    {version.isUpload ? (
      <>
        <Upload className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold text-amber-700">
          업로드된 문서
        </p>
      </>
    ) : (
      <>
        <FileText className="w-4 h-4 text-blue-500" />
        <p className="text-sm font-semibold text-gray-700">
          {getTemplateName(version.step)}
        </p>
      </>
    )}
  </div>
  <p className="text-xs text-gray-500 pl-6">
    {version.isUpload ? version.uploadInfo?.filename : formatActualDate(version.timestamp)}
  </p>
</div>

// 복원 버튼 - 동일하게 동작 (업로드/에디터 구분 없이 복원 가능)
<button
  onClick={() => onRestore && onRestore(version)}
  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl ..."
>
  <RotateCcw className="w-4 h-4" />
  이 버전으로 복원
</button>
```

---

## 4. 데이터 구조

### 4.1 DocVersion.content - 업로드 타입
```json
{
  "type": "upload",
  "s3_key": "documents/251201001/123/offer/document.pdf",
  "s3_url": "https://bucket.s3.region.amazonaws.com/...",
  "filename": "수출계약서.pdf",
  "file_size": 1048576,
  "mime_type": "application/pdf",
  "converted_pdf_key": "documents/.../preview.pdf",
  "converted_pdf_url": "https://..."
}
```

### 4.2 DocVersion.content - manual 타입 (기존)
```json
{
  "html": "<div>...</div>",
  "title": "문서 제목",
  "stepModes": {...},
  "savedAt": "2025-12-16T..."
}
```

### 4.3 프론트엔드 Version 객체
```typescript
{
  id: "123",
  timestamp: 1702700000000,
  data: { [step]: "html..." | null, title: "..." },
  step: 1,
  isUpload: true | false,
  uploadInfo?: {
    s3_key: "...",
    s3_url: "...",
    filename: "...",
    convertedPdfUrl: "..."
  }
}
```

---

## 5. 수정 파일 요약

| 순서 | 파일 | 수정 내용 |
|------|------|-----------|
| 1 | `backend/documents/views.py` | upload_request: 이전 S3 파일 삭제 |
| 2 | `backend/documents/services.py` | process_uploaded_document: DocVersion 생성 |
| 3 | `frontend/App.tsx` | 버전 로드 시 isUpload, uploadInfo 추가 |
| 4 | `frontend/components/VersionHistorySidebar.tsx` | Version 타입 확장, 업로드 버전 UI |
| 5 | `frontend/components/document-creation/hooks/useFileUpload.ts` | restoreUploadState 함수 추가 |
| 6 | `frontend/components/document-creation/index.tsx` | handleVersionRestore: 버전 타입별 분기 |

---

## 6. 테스트 시나리오

### 6.1 업로드 → 버전 기록 표시
1. Step 1에서 PDF 파일 업로드
2. 저장 버튼 클릭
3. 버전 기록 사이드바 열기
4. **예상**: 업로드 버전 표시 (amber 색상, 파일명)

### 6.2 업로드 버전 복원
1. 위 상태에서 "다시 작성하기" → 에디터로 작성 → 저장
2. 버전 기록에서 업로드 버전 클릭
3. **예상**: upload 모드로 전환, PDF 뷰어에 해당 파일 표시

### 6.3 에디터 버전 복원
1. 버전 기록에서 에디터 버전 클릭
2. **예상**: manual 모드로 전환, 에디터에 HTML 로드

### 6.4 재업로드 시 S3 orphan 방지
1. Step 1에서 파일 A 업로드 → 저장
2. "다시 작성하기" → 파일 B 업로드
3. S3 확인
4. **예상**: 파일 A 삭제됨, 파일 B만 존재

### 6.5 혼합 시나리오
1. 업로드 → 저장 → 에디터 작성 → 저장 → 다시 업로드 → 저장
2. 버전 기록 확인
3. **예상**: 3개 버전 모두 표시 (upload, manual, upload)
4. 각 버전 클릭 시 해당 모드로 정상 전환

---

## 7. 구현 순서

1. **백엔드 먼저**
   - views.py: 이전 S3 삭제
   - services.py: DocVersion 생성

2. **프론트엔드 순서**
   - useFileUpload.ts: restoreUploadState 추가
   - VersionHistorySidebar.tsx: 타입 및 UI
   - App.tsx: 버전 로드 로직
   - index.tsx: handleVersionRestore 수정

---

## 8. 주의사항

### 8.1 기존 데이터 호환성
- 기존 업로드 문서는 DocVersion 없음 → 버전 기록에 미표시 (의도된 동작)
- 마이그레이션 불필요

### 8.2 S3 삭제 실패
- 삭제 실패해도 업로드 계속 진행 (warning 로그)
- orphan 파일은 S3 lifecycle policy로 정리 권장

### 8.3 Step 4 (CI/PL) 처리
- CI와 PL은 별도 문서로 각각 버전 관리
- 업로드 버전 복원 시 activeShippingDoc도 함께 설정

---

## 9. 작성 정보

- **작성일**: 2025-12-16
- **작성자**: Claude Code
- **브랜치**: feature/upload-save-indication
- **버전**: 2.0
