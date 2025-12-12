# Branch Changelog: issue/uploaded-file-v1.0

```yaml
# ============================================================================
# METADATA
# ============================================================================
branch_name: issue/uploaded-file-v1.0
base_branch: dev/trade-ai-assistant-v1.0
common_ancestor: ed9f859b18fee398399be96a39a6a1154b771ff9
created_date: 2025-12-11
last_updated: 2025-12-12
author: happyfrogg, HoonHan
total_commits: 3 (from common ancestor)
status: ready_for_merge
```

---

## CRITICAL RULES - MERGE CONFLICT RESOLUTION

> **AI Agent Instructions**: 충돌 발생 시 아래 규칙을 반드시 따르세요.

### Priority Order (높은 순)
1. **이 브랜치 (`issue/uploaded-file-v1.0`)** - S3/삭제 로직 관련
2. **`dev/trade-ai-assistant-v1.0`** - 기타 기능

### File-Specific Rules

| 파일 | 충돌 시 채택 | 이유 |
|------|-------------|------|
| `backend/agent_core/s3_utils.py` | **이 브랜치** | 계층적 S3 경로 + delete_folder 신규 추가 |
| `backend/chat/memory_service.py` | **이 브랜치** | delete_trade_memory 최적화 버전 |
| `backend/documents/services.py` | **이 브랜치** | delete_trade_with_resources 신규 추가 |
| `backend/documents/views.py` | **이 브랜치** | destroy() 메서드 + upload_request 수정 |

---

## COMMIT HISTORY (Chronological)

### Commit 1: `3fba624` (2025-12-11)
**Message**: 최신 개발 내용으로 재업로드
**Author**: HoonHan
**Files Changed**: 18 files (+2698, -117)

주요 변경:
- `backend/agent_core/parsers.py` - 신규 파일 (문서 파싱 유틸)
- `backend/documents/services.py` - process_uploaded_document 리팩토링
- Frontend 문서 업로드 UI 개선
- 배포 가이드 문서 추가

---

### Commit 2: `a08fee3` (2025-12-11)
**Message**: S3 저장 로직 변경
**Author**: happyfrogg
**Files Changed**: 2 files (+19, -9)

#### `backend/agent_core/s3_utils.py`
```diff
- def generate_presigned_upload_url(self, file_name: str, file_type: str = 'application/pdf', expiration: int = 3600):
+ def generate_presigned_upload_url(self, file_name: str, file_type: str, emp_no: str, trade_id: int, doc_type: str, expiration: int = 3600):
```
- UUID 기반 → 계층적 경로 (`documents/{emp_no}/{trade_id}/{doc_type}/{filename}`)
- `os`, `uuid` import 제거

#### `backend/documents/views.py`
```diff
+ trade = document.trade
+ emp_no = trade.user.emp_no
+ trade_id = trade.trade_id
+ doc_type = document.doc_type

  presigned_data = s3_manager.generate_presigned_upload_url(
      file_name=filename,
      file_type=mime_type,
-     expiration=3600
+     emp_no=emp_no,
+     trade_id=trade_id,
+     doc_type=doc_type
  )
```

---

### Commit 3: `8937cb7` (2025-12-12)
**Message**: trade 삭제 파이프라인 수정
**Author**: happyfrogg
**Files Changed**: 4 files (+137, -4)

#### `backend/agent_core/s3_utils.py` - Lines 171-212
```python
def delete_folder(self, prefix: str) -> dict:
    """
    S3에서 특정 prefix(폴더) 하위의 모든 파일 삭제
    Args:
        prefix: 삭제할 폴더 경로 (예: 'documents/251201001/513/')
    Returns:
        dict: {'deleted': int, 'errors': int}
    """
    deleted_count = 0
    error_count = 0
    try:
        paginator = self.s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)
        for page in pages:
            if 'Contents' not in page:
                continue
            objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
            if objects_to_delete:
                response = self.s3_client.delete_objects(
                    Bucket=self.bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
                deleted_count += len(response.get('Deleted', []))
                error_count += len(response.get('Errors', []))
        logger.info(f"Deleted S3 folder '{prefix}': {deleted_count} files deleted, {error_count} errors")
    except ClientError as e:
        logger.error(f"Failed to delete S3 folder '{prefix}': {e}")
        error_count += 1
    return {'deleted': deleted_count, 'errors': error_count}
```

#### `backend/chat/memory_service.py` - Lines 199-223
```python
def delete_trade_memory(self, trade_id: int, doc_ids: List[int]) -> bool:
    """Trade 삭제 시 관련 문서 메모리 일괄 삭제"""
    if not doc_ids:
        return True
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchAny
        # 모든 doc_id에 대한 user_id 목록 생성 (short + long)
        user_ids = [f"doc_{doc_id}_{t}" for doc_id in doc_ids for t in ("short", "long")]
        # 기존 memory 인스턴스의 vector_store 클라이언트 사용
        self.memory.vector_store.client.delete(
            collection_name="trade_memory",
            points_selector=Filter(
                must=[FieldCondition(key="user_id", match=MatchAny(any=user_ids))]
            )
        )
        logger.info(f"Deleted trade memory: trade_id={trade_id}, docs={len(doc_ids)}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete trade memory: {e}")
        return False
```

#### `backend/documents/services.py` - Lines 320-378
```python
def delete_trade_with_resources(trade_flow) -> dict:
    """
    Trade 삭제 - RDS 즉시 삭제 후 외부 리소스는 백그라운드 정리
    """
    import threading
    import concurrent.futures
    from agent_core.s3_utils import s3_manager
    from chat.memory_service import get_memory_service

    trade_id = trade_flow.trade_id
    emp_no = trade_flow.user.emp_no

    # 삭제 전 정보 수집
    doc_ids = []
    qdrant_ids = []
    for doc in trade_flow.documents.all():
        doc_ids.append(doc.doc_id)
        if doc.qdrant_point_ids:
            qdrant_ids.extend(doc.qdrant_point_ids)

    # 1. RDS 즉시 삭제 (UI 즉시 반영)
    trade_flow.delete()
    logger.info(f"Trade {trade_id} deleted from RDS")

    # 2. 외부 리소스 백그라운드 정리
    def cleanup():
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {}
            if qdrant_ids:
                futures['qdrant'] = executor.submit(
                    lambda: qdrant_client.delete(COLLECTION_USER_DOCS, points_selector=qdrant_ids)
                )
            if doc_ids:
                mem_service = get_memory_service()
                if mem_service:
                    futures['mem0'] = executor.submit(
                        lambda: mem_service.delete_trade_memory(trade_id, doc_ids)
                    )
            futures['s3'] = executor.submit(
                lambda: s3_manager.delete_folder(f"documents/{emp_no}/{trade_id}/")
            )
            for name, future in futures.items():
                try:
                    future.result(timeout=30)
                    logger.info(f"[Cleanup] {name} done for trade {trade_id}")
                except Exception as e:
                    logger.error(f"[Cleanup] {name} failed: {e}")

    if doc_ids or qdrant_ids:
        threading.Thread(target=cleanup, daemon=True).start()

    return {'deleted': True}
```

#### `backend/documents/views.py` - Lines 274-281
```python
def destroy(self, request, *args, **kwargs):
    """Trade 삭제 (S3, Qdrant, Mem0, RDS 포함)"""
    from .services import delete_trade_with_resources
    trade_flow = self.get_object()
    delete_trade_with_resources(trade_flow)
    return Response(status=status.HTTP_204_NO_CONTENT)
```

---

## FEATURE SUMMARY

### 1. S3 계층적 저장 구조
**Before**: `documents/{uuid}.{ext}`
**After**: `documents/{emp_no}/{trade_id}/{doc_type}/{filename}`

### 2. Trade 삭제 파이프라인
```
DELETE /api/documents/trades/{id}/
         ↓
┌─────────────────────────────────┐
│ views.py: destroy()             │
│   → services.delete_trade_...   │
└─────────────────────────────────┘
         ↓
┌─────────────────────────────────┐
│ 1. RDS 즉시 삭제 → 응답 반환    │  ← 동기 (~0.1초)
└─────────────────────────────────┘
         ↓ (daemon thread)
┌─────────────────────────────────┐
│ 병렬 정리 (백그라운드):         │
│ - Qdrant: 문서 벡터 삭제        │
│ - Mem0: 대화 메모리 삭제        │  ← 비동기
│ - S3: 폴더 삭제                 │
└─────────────────────────────────┘
```

---

## CONFLICT RISK ANALYSIS

| 파일 | 위험도 | 충돌 가능 영역 | 해결 방법 |
|------|--------|----------------|-----------|
| `s3_utils.py` | **HIGH** | `generate_presigned_upload_url` 시그니처 변경 | 이 브랜치 채택 (신규 파라미터 필수) |
| `memory_service.py` | **MEDIUM** | `delete_trade_memory` 메서드 | 이 브랜치 채택 (최적화 버전) |
| `services.py` | **HIGH** | `process_uploaded_document`, 신규 함수 추가 | 이 브랜치 채택 |
| `views.py` | **MEDIUM** | `upload_request`, `destroy` 추가 | 이 브랜치 채택 |

---

## MERGE GUIDE

### Pre-Merge Checklist
- [ ] dev/trade-ai-assistant-v1.0 브랜치가 최신 상태인지 확인
- [ ] 로컬에서 테스트 완료
- [ ] S3 계층적 경로 테스트 완료
- [ ] Trade 삭제 테스트 완료 (RDS, S3, Qdrant, Mem0)

### Merge Commands
```bash
# 1. dev 브랜치로 이동
git checkout dev/trade-ai-assistant-v1.0

# 2. 최신 상태로 업데이트
git pull origin dev/trade-ai-assistant-v1.0

# 3. issue 브랜치 머지
git merge issue/uploaded-file-v1.0

# 4. 충돌 발생 시
# - s3_utils.py: issue/uploaded-file-v1.0 버전 채택
# - memory_service.py: issue/uploaded-file-v1.0 버전 채택
# - services.py: issue/uploaded-file-v1.0 버전 채택
# - views.py: issue/uploaded-file-v1.0 버전 채택

# 5. 충돌 해결 후
git add .
git commit -m "Merge issue/uploaded-file-v1.0 into dev"

# 6. 푸시
git push origin dev/trade-ai-assistant-v1.0
```

---

## FULL COMMIT LIST

| Hash | Date | Author | Message |
|------|------|--------|---------|
| `8937cb7` | 2025-12-12 | happyfrogg | trade 삭제 파이프라인 수정 |
| `a08fee3` | 2025-12-11 | happyfrogg | S3 저장 로직 변경 |
| `3fba624` | 2025-12-11 | HoonHan | 최신 개발 내용으로 재업로드 |
| `ed9f859` | 2025-12-11 | - | README 초기화 (common ancestor) |

---

## MODIFIED FILES LIST

### Backend (Core Changes)
| 파일 | 변경 유형 | Lines |
|------|----------|-------|
| `backend/agent_core/s3_utils.py` | Modified | +61, -8 |
| `backend/chat/memory_service.py` | Modified | +26, -4 |
| `backend/documents/services.py` | Modified | +308, -117 |
| `backend/documents/views.py` | Modified | +39, -2 |

### Backend (Other)
| 파일 | 변경 유형 |
|------|----------|
| `backend/agent_core/parsers.py` | Added |
| `backend/debug_parser.py` | Added |
| `backend/documents/models.py` | Modified |
| `backend/documents/serializers.py` | Modified |
| `backend/documents/migrations/0003_*.py` | Added |
| `backend/documents/migrations/0004_*.py` | Added |
| `backend/documents/migrations/0005_*.py` | Added |

### Frontend
| 파일 | 변경 유형 |
|------|----------|
| `frontend/components/OthersDocumentViewer.tsx` | Modified |
| `frontend/components/document-creation/hooks/useFileUpload.ts` | Modified |
| `frontend/components/document-creation/index.tsx` | Modified |
| `frontend/components/document-creation/steps/FileUploadView.tsx` | Modified |
| `frontend/components/document-creation/steps/PreviewTextFetcher.tsx` | Added |
| `frontend/package.json` | Modified |
| `frontend/utils/documentApi.ts` | Modified |

### Documentation
| 파일 | 변경 유형 |
|------|----------|
| `docs/Backend_deployment_guide.md` | Added |
| `docs/Frontend_deployment_guide.md` | Added |

---

## API CHANGES

### Modified Endpoints

#### DELETE /api/documents/trades/{trade_id}/
- **Before**: 기본 Django REST Framework 삭제 (RDS만)
- **After**: 전체 리소스 정리 (RDS + S3 + Qdrant + Mem0)
- **Response**: 204 No Content (즉시 반환, 백그라운드 정리)

#### POST /api/documents/{doc_id}/upload_request/
- **S3 Key 변경**: `documents/{uuid}.ext` → `documents/{emp_no}/{trade_id}/{doc_type}/{filename}`

---

*Generated: 2025-12-12*
