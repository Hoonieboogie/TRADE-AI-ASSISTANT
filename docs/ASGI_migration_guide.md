# ASGI 전환 가이드 (WSGI → ASGI)

> 이 가이드는 gunicorn WSGI에서 uvicorn ASGI로 전환하는 전체 과정을 설명합니다.
> 나중에 따로 실행해도 문제없이 재개할 수 있도록 상세하게 작성되었습니다.

---

## 목차

1. [배경 및 문제점](#1-배경-및-문제점)
2. [해결 방안](#2-해결-방안)
3. [사전 준비](#3-사전-준비)
4. [Phase 1: 인프라 변경](#phase-1-인프라-변경)
5. [Phase 2: views.py 수정](#phase-2-chatviewspy-수정)
6. [Phase 3: trade_views.py 수정](#phase-3-chattrade_viewspy-수정)
7. [Phase 4: 로컬 테스트](#phase-4-로컬-테스트)
8. [Phase 5: EC2 배포](#phase-5-ec2-배포)
9. [롤백 절차](#롤백-절차)
10. [트러블슈팅](#트러블슈팅)

---

## 1. 배경 및 문제점

### 현상
- 채팅 A에서 AI 응답(스트리밍) 대기 중
- 사이드바에서 채팅 B 클릭
- 채팅 B의 메시지가 **채팅 A 응답 완료 후에야** 로드됨
- 로컬에서는 정상, **배포 환경에서만 발생**

### 원인

```
[현재 구조: gunicorn sync workers=1]

요청 A (스트리밍): ██████████████████████████████ (30초)
요청 B (메시지로드):                              대기 → █ (블로킹!)

→ 워커가 1개뿐이라 스트리밍 중 다른 요청 처리 불가
```

### 기술적 원인

**Dockerfile (현재):**
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
```

**스트리밍 코드 (현재):**
```python
def stream_response(self, ...):
    # async 코드를 sync 환경에서 돌리기 위한 브릿지
    loop = asyncio.new_event_loop()
    while True:
        chunk = loop.run_until_complete(async_gen.__anext__())  # ⚠️ 블로킹!
        yield chunk
```

- `run_until_complete()`는 블로킹 호출
- 스트리밍 동안 워커가 완전히 점유됨

---

## 2. 해결 방안

### ASGI (Asynchronous Server Gateway Interface)로 전환

```
[ASGI: uvicorn async]

요청 A (스트리밍): ██░░░░██░░░░██░░░░██  (I/O 대기 시 양보)
요청 B (메시지로드):  ██░██                 (병렬 처리!)

→ 단일 워커로도 수천 개 동시 요청 처리 가능
```

### 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `requirements.txt` | uvicorn 추가 |
| `Dockerfile` | gunicorn → uvicorn |
| `chat/views.py` | ChatStreamView async 전환 |
| `chat/trade_views.py` | DocumentChatStreamView async 전환 |

---

## 3. 사전 준비

### 현재 파일 백업 (선택)
```bash
cd ~/TRADE-AI-ASSISTANT/backend
cp Dockerfile Dockerfile.backup
cp requirements.txt requirements.txt.backup
cp chat/views.py chat/views.py.backup
cp chat/trade_views.py chat/trade_views.py.backup
```

### 현재 브랜치 확인
```bash
git branch --show-current
# 결과: dev/trade-ai-assistant-v2.4 또는 유사한 브랜치
```

---

## Phase 1: 인프라 변경

### 1.1 requirements.txt 수정

**파일**: `backend/requirements.txt`

**추가할 내용** (파일 끝에):
```
# ASGI Server
uvicorn[standard]>=0.30.0
```

### 1.2 Dockerfile 수정

**파일**: `backend/Dockerfile`

**Before:**
```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
```

**After:**
```dockerfile
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300"]
```

### 1.3 확인사항

`config/asgi.py` 파일이 이미 존재하는지 확인:
```bash
cat backend/config/asgi.py
```

기본 Django 프로젝트에는 이미 생성되어 있음:
```python
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
application = get_asgi_application()
```

---

## Phase 2: chat/views.py 수정

### 2.1 import 추가

**파일**: `backend/chat/views.py`

**라인 1 근처에 추가:**
```python
from asgiref.sync import sync_to_async
```

### 2.2 ChatStreamView 클래스 수정

#### 2.2.1 post 메서드 (라인 256)

**Before:**
```python
def post(self, request):
```

**After:**
```python
async def post(self, request):
```

#### 2.2.2 stream_response 메서드 (라인 283)

**Before:**
```python
def stream_response(self, message: str, document: str, user_id=None, gen_chat_id=None):
```

**After:**
```python
async def stream_response(self, message: str, document: str, user_id=None, gen_chat_id=None):
```

### 2.3 DB 접근 코드 수정

#### 라인 294: get_or_create_user
```python
# Before
user = get_or_create_user(user_id)

# After
user = await sync_to_async(get_or_create_user)(user_id)
```

#### 라인 300: GenChat.objects.get
```python
# Before
gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id)

# After
gen_chat = await sync_to_async(GenChat.objects.get)(gen_chat_id=gen_chat_id)
```

#### 라인 306, 311: GenChat.objects.create
```python
# Before
gen_chat = GenChat.objects.create(user=user, title=initial_title)

# After
gen_chat = await sync_to_async(GenChat.objects.create)(user=user, title=initial_title)
```

#### 라인 316-320: GenMessage.objects.create
```python
# Before
user_msg = GenMessage.objects.create(
    gen_chat=gen_chat,
    sender_type='U',
    content=message
)

# After
user_msg = await sync_to_async(GenMessage.objects.create)(
    gen_chat=gen_chat,
    sender_type='U',
    content=message
)
```

#### 라인 326-331: GenMessage.objects.filter (QuerySet 평가 필요)
```python
# Before
prev_messages = GenMessage.objects.filter(gen_chat=gen_chat).exclude(
    gen_message_id=user_msg.gen_message_id
).order_by('created_at')
message_count = prev_messages.count()
start_index = max(0, message_count - 10)
recent_messages = list(prev_messages[start_index:])

# After
@sync_to_async
def get_prev_messages():
    prev_messages = GenMessage.objects.filter(gen_chat=gen_chat).exclude(
        gen_message_id=user_msg.gen_message_id
    ).order_by('created_at')
    message_count = prev_messages.count()
    start_index = max(0, message_count - 10)
    return list(prev_messages[start_index:])

recent_messages = await get_prev_messages()
```

**또는 간단한 방식:**
```python
# After (간단)
prev_messages_qs = GenMessage.objects.filter(gen_chat=gen_chat).exclude(
    gen_message_id=user_msg.gen_message_id
).order_by('created_at')
message_count = await sync_to_async(prev_messages_qs.count)()
start_index = max(0, message_count - 10)
recent_messages = await sync_to_async(list)(prev_messages_qs[start_index:])
```

### 2.4 run_stream() 내부 함수 병합 및 브릿지 제거

**현재 구조 (라인 386-493):**
```python
async def run_stream():
    # ... async 스트리밍 로직 ...
    async for event in result.stream_events():
        yield f"data: ..."

# 브릿지 코드 (삭제 대상)
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
try:
    async_gen = run_stream()
    while True:
        try:
            chunk = loop.run_until_complete(async_gen.__anext__())
            yield chunk
        except StopAsyncIteration:
            break
finally:
    loop.close()
```

**변경 후:**
```python
# run_stream() 내부 내용을 stream_response()에 직접 병합
# 브릿지 코드 전체 삭제

# stream_response() 내에서 직접:
gen_chat_id_to_send = gen_chat.gen_chat_id if gen_chat else None

if gen_chat_id_to_send:
    yield f"data: {json.dumps({'type': 'init', 'gen_chat_id': gen_chat_id_to_send})}\n\n"

try:
    if document:
        agent = get_document_writing_agent(...)
    else:
        agent = get_trade_agent(...)

    # ... input 준비 ...

    result = Runner.run_streamed(agent, input=final_input)

    async for event in result.stream_events():
        # 텍스트 델타 이벤트 처리
        if event.type == "raw_response_event":
            # ... 처리 ...
            yield f"data: {json.dumps({'type': 'text', 'content': data.delta})}\n\n"
        # 툴 호출 이벤트
        elif event.type == "run_item_stream_event":
            # ... 처리 ...
            yield f"data: {json.dumps({'type': 'tool', 'tool': tool_data})}\n\n"

    # 완료 이벤트
    yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used})}\n\n"

except Exception as e:
    yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
```

### 2.5 스트리밍 후 DB 저장 수정 (라인 495-553)

#### GenMessage.objects.create (AI 응답 저장)
```python
# Before
GenMessage.objects.create(
    gen_chat=gen_chat,
    sender_type='A',
    content=full_response
)

# After
await sync_to_async(GenMessage.objects.create)(
    gen_chat=gen_chat,
    sender_type='A',
    content=full_response
)
```

#### GenMessage.objects.filter().count() (라인 528)
```python
# Before
total_messages = GenMessage.objects.filter(gen_chat=gen_chat).count()

# After
total_messages = await sync_to_async(GenMessage.objects.filter(gen_chat=gen_chat).count)()
```

#### GenMessage.objects.filter()[:20] (라인 533-535)
```python
# Before
recent_for_summary = GenMessage.objects.filter(
    gen_chat=gen_chat
).order_by('-created_at')[:20]

# After
recent_for_summary = await sync_to_async(list)(
    GenMessage.objects.filter(gen_chat=gen_chat).order_by('-created_at')[:20]
)
```

### 2.6 memory_service 호출 수정

memory_service의 메서드들은 모두 sync이므로 `sync_to_async` 필요:

```python
# Before
memory_service.add_gen_chat_short_memory(...)
memory_service.add_gen_chat_long_memory(...)

# After
await sync_to_async(memory_service.add_gen_chat_short_memory)(...)
await sync_to_async(memory_service.add_gen_chat_long_memory)(...)
```

---

## Phase 3: chat/trade_views.py 수정

### 3.1 import 추가

**파일**: `backend/chat/trade_views.py`

**라인 1 근처에 추가:**
```python
from asgiref.sync import sync_to_async
```

### 3.2 DocumentChatStreamView 클래스 수정

#### 3.2.1 post 메서드 (라인 743)

**Before:**
```python
def post(self, request):
```

**After:**
```python
async def post(self, request):
```

#### 3.2.2 stream_response 메서드 (라인 779)

**Before:**
```python
def stream_response(self, doc_id, user_id, message, document_content='', prev_documents=None):
```

**After:**
```python
async def stream_response(self, doc_id, user_id, message, document_content='', prev_documents=None):
```

### 3.3 DB 접근 코드 수정

#### 라인 786: Document.objects.get
```python
# Before
document = Document.objects.get(doc_id=doc_id)

# After
document = await sync_to_async(Document.objects.get)(doc_id=doc_id)
```

#### 라인 796-800: DocMessage.objects.create
```python
# Before
user_msg = DocMessage.objects.create(
    doc=document,
    role='user',
    content=message
)

# After
user_msg = await sync_to_async(DocMessage.objects.create)(
    doc=document,
    role='user',
    content=message
)
```

#### 라인 804-809: DocMessage.objects.filter
```python
# Before
prev_messages = DocMessage.objects.filter(doc=document).exclude(
    doc_message_id=user_msg.doc_message_id
).order_by('created_at')
message_count = prev_messages.count()
start_index = max(0, message_count - 10)
recent_messages = list(prev_messages[start_index:])

# After
prev_messages_qs = DocMessage.objects.filter(doc=document).exclude(
    doc_message_id=user_msg.doc_message_id
).order_by('created_at')
message_count = await sync_to_async(prev_messages_qs.count)()
start_index = max(0, message_count - 10)
recent_messages = await sync_to_async(list)(prev_messages_qs[start_index:])
```

#### 라인 823: get_user_by_id_or_emp_no
```python
# Before
user = get_user_by_id_or_emp_no(user_id)

# After
user = await sync_to_async(get_user_by_id_or_emp_no)(user_id)
```

#### 라인 906: Document.objects.filter (sibling_docs)
```python
# Before
sibling_docs = Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)

# After
sibling_docs = await sync_to_async(list)(
    Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)
)
```

#### 라인 938: DocVersion.objects.filter
```python
# Before
latest_version = DocVersion.objects.filter(doc=sibling_doc).order_by('-created_at').first()

# After
latest_version = await sync_to_async(
    DocVersion.objects.filter(doc=sibling_doc).order_by('-created_at').first
)()
```

### 3.4 run_stream() 내부 함수 병합 및 브릿지 제거 (라인 993-1081)

Phase 2와 동일한 패턴으로:
1. `async def run_stream()` 내용을 `stream_response()`에 직접 병합
2. 브릿지 코드 (라인 1053-1081) 전체 삭제

### 3.5 스트리밍 후 DB 저장 수정 (라인 1092-1154)

#### DocMessage.objects.create
```python
# Before
ai_msg = DocMessage.objects.create(
    doc=document,
    role='agent',
    content=full_response,
    metadata={...}
)

# After
ai_msg = await sync_to_async(DocMessage.objects.create)(
    doc=document,
    role='agent',
    content=full_response,
    metadata={...}
)
```

#### DocMessage.objects.filter().count()
```python
# Before
total_messages = DocMessage.objects.filter(doc=document).count()

# After
total_messages = await sync_to_async(DocMessage.objects.filter(doc=document).count)()
```

#### DocMessage.objects.filter()[:20]
```python
# Before
recent_for_summary = DocMessage.objects.filter(doc=document).order_by('-created_at')[:20]

# After
recent_for_summary = await sync_to_async(list)(
    DocMessage.objects.filter(doc=document).order_by('-created_at')[:20]
)
```

### 3.6 memory_service 호출 수정

```python
# Before
mem_service.add_doc_short_memory(...)
mem_service.add_doc_long_memory(...)

# After
await sync_to_async(mem_service.add_doc_short_memory)(...)
await sync_to_async(mem_service.add_doc_long_memory)(...)
```

---

## Phase 4: 로컬 테스트

### 4.1 의존성 설치
```bash
cd backend
pip install uvicorn[standard]
```

### 4.2 uvicorn으로 실행
```bash
uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

### 4.3 테스트 시나리오

#### 테스트 1: 기본 스트리밍
1. 일반 채팅 페이지 접속
2. 질문 입력 후 스트리밍 응답 확인
3. 응답이 정상적으로 표시되는지 확인

#### 테스트 2: 동시 요청 (핵심!)
1. 채팅 A에서 긴 질문 입력 (예: "무역 서류 종류와 각각의 역할을 상세히 설명해줘")
2. 스트리밍 응답이 시작되면
3. **즉시** 사이드바에서 다른 채팅 B 클릭
4. 채팅 B의 메시지가 **즉시** 로드되는지 확인

#### 테스트 3: 문서 채팅
1. 문서 작업 페이지 접속
2. 사이드바 채팅에서 질문 입력
3. 스트리밍 응답 확인

#### 테스트 4: DB 저장 확인
```bash
# MySQL 접속 후
SELECT * FROM gen_message ORDER BY created_at DESC LIMIT 10;
SELECT * FROM doc_message ORDER BY created_at DESC LIMIT 10;
```

### 4.4 에러 발생 시

#### SynchronousOnlyOperation 에러
```
django.core.exceptions.SynchronousOnlyOperation:
You cannot call this from an async context - use a thread or sync_to_async.
```
→ 해당 ORM 호출에 `sync_to_async` 누락. 추가 필요.

#### RuntimeError: no running event loop
```
RuntimeError: no running event loop
```
→ asyncio 브릿지 코드가 아직 남아있음. 삭제 필요.

---

## Phase 5: EC2 배포

### 5.1 코드 푸시
```bash
git add .
git commit -m "ASGI 전환: gunicorn WSGI → uvicorn ASGI

- 스트리밍 중 동시 요청 블로킹 문제 해결
- ChatStreamView, DocumentChatStreamView async 전환
- Django ORM 호출에 sync_to_async 래퍼 적용"
git push
```

### 5.2 EC2 접속 및 배포
```bash
ssh -i ~/Downloads/trade-ai-key.pem ubuntu@54.180.25.167

cd ~/TRADE-AI-ASSISTANT/backend
git pull

# Docker 이미지 재빌드 (캐시 없이)
docker compose build --no-cache

# 컨테이너 재시작
docker compose up -d

# 로그 확인
docker logs -f trade-ai-backend
```

### 5.3 배포 확인
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 5.4 프론트엔드에서 테스트
1. https://trade-ai-assistant.vercel.app 접속
2. 로그인
3. Phase 4의 테스트 시나리오 반복

---

## 롤백 절차

문제 발생 시 즉시 롤백 가능:

### 방법 1: Dockerfile만 되돌리기

```dockerfile
# backend/Dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--timeout", "300", "config.wsgi:application"]
```

```bash
# EC2에서
docker compose build --no-cache
docker compose up -d
```

### 방법 2: Git 롤백

```bash
git revert HEAD  # 또는
git reset --hard HEAD~1
git push -f
```

### 방법 3: 백업 파일 복원

```bash
cp Dockerfile.backup Dockerfile
cp requirements.txt.backup requirements.txt
cp chat/views.py.backup chat/views.py
cp chat/trade_views.py.backup chat/trade_views.py
```

---

## 트러블슈팅

### 문제 1: 스트리밍이 끊김

**증상:** 응답 중간에 연결이 끊어짐

**원인:** CloudFront/nginx 버퍼링

**해결:**
```python
response['X-Accel-Buffering'] = 'no'  # 이미 설정되어 있음
response['Cache-Control'] = 'no-cache'
```

### 문제 2: 타임아웃

**증상:** 긴 응답에서 502 에러

**해결:** Dockerfile에서 타임아웃 증가
```dockerfile
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "600"]
```

### 문제 3: 메모리 누수

**증상:** 시간이 지날수록 메모리 증가

**확인:**
```bash
docker stats trade-ai-backend
```

**해결:** uvicorn에 --limit-max-requests 추가
```dockerfile
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--timeout-keep-alive", "300", "--limit-max-requests", "1000"]
```

### 문제 4: Windows 개발 환경

**증상:** Windows에서 uvicorn 실행 시 에러

**해결:** uvicorn[standard] 대신 uvicorn만 설치하거나, WSL 사용

---

## 변경 요약

| 항목 | 수량 |
|------|------|
| 수정 파일 | 4개 |
| `def` → `async def` | 4곳 |
| `sync_to_async` 래퍼 추가 | ~25곳 |
| 삭제할 브릿지 코드 | ~50줄 |
| 예상 소요 시간 | 1~1.5시간 |

---

## 체크리스트

### Phase 1
- [ ] requirements.txt에 uvicorn 추가
- [ ] Dockerfile 수정

### Phase 2 (views.py)
- [ ] import 추가
- [ ] post 메서드 async 전환
- [ ] stream_response 메서드 async 전환
- [ ] DB 접근 코드 sync_to_async 적용
- [ ] 브릿지 코드 삭제
- [ ] run_stream 내용 병합
- [ ] memory_service 호출 수정

### Phase 3 (trade_views.py)
- [ ] import 추가
- [ ] post 메서드 async 전환
- [ ] stream_response 메서드 async 전환
- [ ] DB 접근 코드 sync_to_async 적용
- [ ] 브릿지 코드 삭제
- [ ] run_stream 내용 병합
- [ ] memory_service 호출 수정

### Phase 4 (테스트)
- [ ] 로컬 uvicorn 실행
- [ ] 기본 스트리밍 테스트
- [ ] 동시 요청 테스트 (핵심!)
- [ ] DB 저장 확인

### Phase 5 (배포)
- [ ] 코드 커밋/푸시
- [ ] EC2 Docker 재빌드
- [ ] 프로덕션 테스트

---

*작성일: 2025-12-15*
*최종 수정: 2025-12-15*
