"""
Trade and Document Management Views with Mem0 Integration
"""

import asyncio
import json
import logging
import re
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from agents import Runner
from agents.items import ToolCallItem
from agent_core import get_document_writing_agent, get_read_document_agent
from .config import PROMPT_VERSION, PROMPT_LABEL

from .models import (
    User, TradeFlow, Document, DocMessage, DocVersion,
    GenChat, GenMessage, GenUploadFile, Department
)
from .serializers import (
    TradeFlowSerializer, DocumentSerializer, DocMessageSerializer,
    DocVersionSerializer, DocChatRequestSerializer
)
from .memory_service import get_memory_service
from .views import parse_edit_response

logger = logging.getLogger(__name__)


def extract_buyer_from_content(content: str) -> str:
    """
    문서 내용(HTML)에서 buyer 이름 추출

    Offer Sheet, PI 등의 문서에서 To/Buyer 필드를 찾아 추출
    """
    if not content:
        return None

    # HTML에서 텍스트 추출을 위한 간단한 처리
    text = re.sub(r'<[^>]+>', ' ', content)
    text = re.sub(r'\s+', ' ', text)

    # 패턴 1: "To:" 또는 "Buyer:" 다음의 회사명
    patterns = [
        r'(?:To|Buyer|Messrs\.?)\s*[:\s]+([A-Za-z][\w\s&.,()-]+?)(?:\s*(?:Address|Tel|Fax|Email|Date|From|$))',
        r'(?:To|Buyer)\s*[:\s]+([A-Za-z][\w\s&.,()-]{3,50})',
        r'MESSRS\.?\s+([A-Z][\w\s&.,()-]+?)(?:\s*$|\s+[A-Z]{2,})',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            buyer = match.group(1).strip()
            # 너무 짧거나 긴 경우 제외
            if 2 < len(buyer) < 100:
                # 불필요한 후행 문자 제거
                buyer = re.sub(r'[\s,;:]+$', '', buyer)
                return buyer

    return None


# Step 번호 → doc_type 매핑
STEP_TO_DOC_TYPE = {
    1: 'offer',
    2: 'pi',
    3: 'contract',
    4: 'ci',
    5: 'pl'
}

# doc_type → Step 번호 매핑
DOC_TYPE_TO_STEP = {v: k for k, v in STEP_TO_DOC_TYPE.items()}


# 툴 이름 → 표시 정보 매핑
TOOL_DISPLAY_INFO = {
    'search_user_document': {
        'name': '업로드 문서 검색',
        'icon': 'file-search',
        'description': '업로드한 문서에서 관련 내용을 검색했습니다.'
    },
    'search_trade_documents': {
        'name': '무역 지식 검색',
        'icon': 'document',
        'description': '무역 문서 데이터베이스에서 관련 정보를 검색했습니다.'
    },
    'search_web': {
        'name': '웹 검색',
        'icon': 'web',
        'description': '최신 정보를 위해 웹 검색을 수행했습니다.'
    }
}


def extract_tools_used(result) -> list:
    """Agent 실행 결과에서 사용된 툴 정보 추출"""
    tools_used = []
    seen_tools = set()

    for item in result.new_items:
        if isinstance(item, ToolCallItem):
            try:
                tool_name = item.raw_item.name
            except AttributeError:
                try:
                    tool_name = item.tool_call.function.name
                except AttributeError:
                    continue

            if tool_name not in seen_tools:
                seen_tools.add(tool_name)
                tool_info = TOOL_DISPLAY_INFO.get(tool_name, {
                    'name': tool_name,
                    'icon': 'tool',
                    'description': f'{tool_name} 도구를 사용했습니다.'
                })
                tools_used.append({
                    'id': tool_name,
                    **tool_info
                })

    return tools_used


def get_user_by_id_or_emp_no(user_id):
    """user_id(숫자) 또는 emp_no(사원번호)로 사용자 조회"""
    if user_id is None:
        return None
    try:
        # 먼저 emp_no로 조회 시도 (사원번호가 숫자로만 되어 있어도 emp_no로 먼저 찾기)
        try:
            return User.objects.get(emp_no=str(user_id))
        except User.DoesNotExist:
            pass

        # emp_no로 못 찾으면 user_id(정수)로 조회
        if isinstance(user_id, int) or (isinstance(user_id, str) and user_id.isdigit()):
            return User.objects.get(user_id=int(user_id))

        return None
    except User.DoesNotExist:
        logger.warning(f"User not found: user_id={user_id}")
        return None


# ==================== Trade Flow Initialization ====================

class TradeInitView(APIView):
    """
    새 무역 거래(TradeFlow) 초기화 API

    POST /api/trade/init/
    {
        "user_id": "emp001" 또는 1,
        "title": "거래 제목" (선택)
    }

    Returns:
    {
        "trade_id": 1,
        "doc_ids": {
            "offer": 10,
            "pi": 11,
            "contract": 12,
            "ci": 13,
            "pl": 14
        }
    }
    """

    def post(self, request):
        user_id = request.data.get('user_id')
        title = request.data.get('title', 'untitled document')

        logger.info(f"TradeInitView: user_id={user_id}, title={title}")

        # 사용자 조회
        user = get_user_by_id_or_emp_no(user_id)
        if not user:
            # 사용자가 없으면 자동 생성 (개발/테스트용)
            if user_id:
                try:
                    # 기본 부서 가져오기 또는 생성
                    default_dept, _ = Department.objects.get_or_create(
                        dept_name="Default",
                        defaults={"dept_name": "Default"}
                    )
                    user = User.objects.create(
                        emp_no=str(user_id),
                        name=f"User_{user_id}",
                        password="temp_password",
                        dept=default_dept
                    )
                    logger.info(f"새 사용자 자동 생성: emp_no={user_id}, user_id={user.user_id}")
                except Exception as e:
                    logger.error(f"사용자 자동 생성 실패: {e}")
                    import traceback
                    traceback.print_exc()
                    return Response(
                        {'error': f'사용자 생성 실패: {str(e)}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'user_id가 필요합니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # 1. TradeFlow 생성
            trade = TradeFlow.objects.create(
                user=user,
                title=title
            )
            logger.info(f"TradeFlow 생성: trade_id={trade.trade_id}")

            # 2. Document 5개 생성 (각 doc_type)
            doc_ids = {}
            for step, doc_type in STEP_TO_DOC_TYPE.items():
                doc = Document.objects.create(
                    trade=trade,
                    doc_type=doc_type
                )
                doc_ids[doc_type] = doc.doc_id
                logger.info(f"Document 생성: doc_id={doc.doc_id}, doc_type={doc_type}")

            return Response({
                'trade_id': trade.trade_id,
                'doc_ids': doc_ids
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"TradeFlow 초기화 실패: {e}")
            return Response(
                {'error': f'초기화 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== Trade Flow Management ====================

class TradeFlowViewSet(viewsets.ModelViewSet):
    """무역 플로우 관리 ViewSet"""
    queryset = TradeFlow.objects.all()
    serializer_class = TradeFlowSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        """
        무역 플로우 삭제 + Mem0 메모리 정리

        DELETE /api/trade/{trade_id}/
        """
        trade = self.get_object()
        trade_id = trade.trade_id

        # 관련 문서 ID 목록 가져오기
        doc_ids = list(trade.documents.values_list('doc_id', flat=True))

        try:
            # 1. Mem0 메모리 삭제
            if doc_ids:
                mem_service = get_memory_service()
                if mem_service:
                    mem_service.delete_trade_memory(trade_id, doc_ids)
                    logger.info(f"Deleted mem0 memories for trade_id={trade_id}, docs={doc_ids}")
                else:
                    logger.warning(f"Mem0 service unavailable, skipping memory cleanup for trade_id={trade_id}")

            # 2. RDS에서 삭제 (CASCADE로 관련 데이터 자동 삭제)
            trade.delete()

            logger.info(f"Successfully deleted trade_id={trade_id} with {len(doc_ids)} documents")

            return Response({
                'message': '무역 플로우가 삭제되었습니다.',
                'trade_id': trade_id,
                'deleted_doc_count': len(doc_ids)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to delete trade: {e}")
            return Response(
                {'error': f'삭제 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== Document Management ====================

class DocumentViewSet(viewsets.ModelViewSet):
    """문서 관리 ViewSet"""
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        trade_id = self.request.query_params.get('trade_id')
        if trade_id:
            queryset = queryset.filter(trade_id=trade_id)
        return queryset

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """
        문서의 모든 대화 메시지 조회

        GET /api/documents/{doc_id}/messages/
        """
        document = self.get_object()
        messages = document.messages.all()
        serializer = DocMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """
        문서의 모든 버전 조회

        GET /api/documents/{doc_id}/versions/
        """
        document = self.get_object()
        versions = document.versions.all()
        serializer = DocVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def save_version(self, request, pk=None):
        """
        현재 문서 상태를 버전으로 저장 + Mem0에 문서 내용 저장 (Step간 참조용)

        POST /api/documents/{doc_id}/save_version/
        {
            "content": {...},
            "user_id": "emp001"  # 선택
        }
        """
        document = self.get_object()
        content = request.data.get('content')
        user_id = request.data.get('user_id')

        if not content:
            return Response(
                {'error': 'content가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. RDS에 버전 저장
            version = DocVersion.objects.create(
                doc=document,
                content=content
            )
            serializer = DocVersionSerializer(version)
            logger.info(f"Saved version {version.version_id} for doc_id={document.doc_id}")

            # 2. TradeFlow title 업데이트 (content에 title이 있으면)
            trade_id = document.trade_id
            if trade_id and isinstance(content, dict):
                title = content.get('title', '').strip()
                if title:
                    try:
                        trade_flow = TradeFlow.objects.get(trade_id=trade_id)
                        if trade_flow.title != title:
                            trade_flow.title = title
                            trade_flow.save(update_fields=['title', 'updated_at'])
                            logger.info(f"Updated TradeFlow title: trade_id={trade_id}, title={title}")
                    except TradeFlow.DoesNotExist:
                        logger.warning(f"TradeFlow not found: trade_id={trade_id}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Failed to save version: {e}")
            return Response(
                {'error': f'버전 저장 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def update_upload(self, request, pk=None):
        """
        문서의 업로드 정보 업데이트

        POST /api/documents/{doc_id}/update_upload/
        {
            "doc_mode": "upload",
            "s3_key": "uploads/2024/01/abc123.pdf",
            "s3_url": "https://s3.../uploads/2024/01/abc123.pdf",
            "original_filename": "contract.pdf",
            "file_size": 123456,
            "mime_type": "application/pdf",
            "upload_status": "ready"
        }
        """
        document = self.get_object()

        try:
            # 업로드 관련 필드 업데이트
            document.doc_mode = request.data.get('doc_mode', document.doc_mode)
            document.s3_key = request.data.get('s3_key', document.s3_key)
            document.s3_url = request.data.get('s3_url', document.s3_url)
            document.original_filename = request.data.get('original_filename', document.original_filename)
            document.file_size = request.data.get('file_size', document.file_size)
            document.mime_type = request.data.get('mime_type', document.mime_type)
            document.upload_status = request.data.get('upload_status', document.upload_status)
            document.error_message = request.data.get('error_message', document.error_message)
            document.save()

            logger.info(f"Updated upload info for doc_id={document.doc_id}")

            serializer = DocumentSerializer(document)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Failed to update upload info: {e}")
            return Response(
                {'error': f'업로드 정보 업데이트 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== Document Chat History API ====================

class DocChatHistoryView(APIView):
    """
    문서 채팅 히스토리 조회 API

    GET /api/documents/{doc_id}/chat/history/

    Returns:
    {
        "doc_id": 1,
        "messages": [
            {"role": "user", "content": "...", "created_at": "..."},
            {"role": "agent", "content": "...", "created_at": "..."}
        ]
    }
    """

    def get(self, request, doc_id):
        try:
            document = Document.objects.get(doc_id=doc_id)
            messages = DocMessage.objects.filter(doc=document).order_by('created_at')

            message_list = [
                {
                    'doc_message_id': msg.doc_message_id,
                    'role': msg.role,
                    'content': msg.content,
                    'metadata': msg.metadata,
                    'created_at': msg.created_at.isoformat()
                }
                for msg in messages
            ]

            return Response({
                'doc_id': doc_id,
                'trade_id': document.trade_id,
                'doc_type': document.doc_type,
                'messages': message_list
            })

        except Document.DoesNotExist:
            return Response({
                'doc_id': doc_id,
                'messages': []
            })
        except Exception as e:
            logger.error(f"DocChatHistoryView 오류: {e}")
            return Response(
                {'error': f'대화 히스토리 조회 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ==================== Document Chat with Mem0 ====================

class DocumentChatView(APIView):
    """
    문서 작성 챗봇 API (Mem0 통합 + DocMessage 저장)

    POST /api/documents/chat/
    {
        "doc_id": 1,           # 필수: Document ID
        "message": "...",      # 필수
        "user_id": "emp001"    # 선택: 로그인 사용자
    }
    """

    def post(self, request):
        doc_id = request.data.get('doc_id') or request.data.get('document_id')
        user_id = request.data.get('user_id')
        message = request.data.get('message')

        if not message:
            return Response(
                {'error': 'message 필드가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not doc_id:
            return Response(
                {'error': 'doc_id 필드가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(f"DocumentChatView: doc_id={doc_id}, user_id={user_id}, message={message[:50]}...")

        try:
            # 1. Document 조회
            try:
                document = Document.objects.get(doc_id=doc_id)
                trade_id = document.trade_id
            except Document.DoesNotExist:
                return Response(
                    {'error': f'Document를 찾을 수 없습니다: doc_id={doc_id}'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 2. 사용자 메시지 저장 (DocMessage)
            user_msg = DocMessage.objects.create(
                doc=document,
                role='user',
                content=message
            )
            logger.info(f"DocMessage 저장: doc_message_id={user_msg.doc_message_id}")

            # 3. 이전 대화 히스토리 로드 (현재 메시지 제외)
            prev_messages = DocMessage.objects.filter(doc=document).exclude(
                doc_message_id=user_msg.doc_message_id
            ).order_by('created_at')
            message_count = prev_messages.count()
            start_index = max(0, message_count - 10)
            recent_messages = list(prev_messages[start_index:])

            # role 변환: DB의 'agent' → OpenAI API의 'assistant'
            message_history = [
                {"role": "assistant" if msg.role == "agent" else msg.role, "content": msg.content}
                for msg in recent_messages
            ]
            logger.info(f"대화 히스토리 로드: {len(message_history)}개 메시지")

            # 4. Mem0 컨텍스트 로드
            mem_service = get_memory_service()
            context = {}

            # user_id를 정수로 변환 (emp_no가 들어올 수도 있음)
            user = get_user_by_id_or_emp_no(user_id)
            numeric_user_id = user.user_id if user else None

            if numeric_user_id and mem_service:
                context = mem_service.build_doc_context(
                    doc_id=doc_id,
                    user_id=numeric_user_id,
                    query=message
                )

            # 5. Agent 실행
            agent = get_document_writing_agent(
                document_content="",
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL
            )

            # 컨텍스트 추가
            enhanced_input = message
            context_parts = []

            # 사용자 장기 메모리 (선호도, 거래처 정보 등)
            if context.get('user_memories'):
                user_mem_texts = [m.get('memory', str(m)) for m in context['user_memories']]
                context_parts.append(f"[사용자 이전 기록]\n" + "\n".join(f"- {t}" for t in user_mem_texts))

            # 현재 문서 세션 메모리
            if context.get('doc_memories'):
                doc_mem_texts = [m.get('memory', str(m)) for m in context['doc_memories']]
                context_parts.append(f"[현재 문서 대화 요약]\n" + "\n".join(f"- {t}" for t in doc_mem_texts))

            if message_history:
                history_text = "\n".join([
                    f"{'사용자' if msg['role'] == 'user' else 'AI'}: {msg['content'][:100]}..."
                    for msg in message_history[-3:]
                ])
                context_parts.append(f"[최근 대화]\n{history_text}")

            if context_parts:
                enhanced_input = f"{chr(10).join(context_parts)}\n\n{message}"

            # Agent 실행 (전체 히스토리 + 현재 메시지)
            input_items = []
            for msg in message_history:
                input_items.append({"role": msg["role"], "content": msg["content"]})
            input_items.append({"role": "user", "content": enhanced_input})

            logger.info(f"Agent input 준비 완료: {len(input_items)}개 메시지")

            result = asyncio.run(Runner.run(
                agent,
                input=input_items if len(input_items) > 1 else enhanced_input,
            ))

            # 6. AI 응답 저장
            ai_msg = DocMessage.objects.create(
                doc=document,
                role='agent',
                content=result.final_output
            )
            logger.info(f"DocMessage AI 응답 저장: doc_message_id={ai_msg.doc_message_id}")

            # 7. Mem0에 스마트 메모리 추가 (단기 + 장기 + 거래처)
            if numeric_user_id and mem_service:
                messages = [
                    {"role": "user", "content": message},
                    {"role": "assistant", "content": result.final_output}
                ]
                try:
                    # 문서 최신 버전에서 내용 가져와 buyer 추출
                    latest_version = DocVersion.objects.filter(doc=document).order_by('-created_at').first()
                    doc_content_for_buyer = ''
                    if latest_version and latest_version.content:
                        content_data = latest_version.content
                        if isinstance(content_data, dict):
                            doc_content_for_buyer = content_data.get('html', '') or content_data.get('html_content', '')
                        else:
                            doc_content_for_buyer = str(content_data)
                    buyer_name = extract_buyer_from_content(doc_content_for_buyer)

                    # 스마트 메모리 저장 (자동 분배)
                    mem_result = mem_service.save_memory_smart(
                        messages=messages,
                        user_id=numeric_user_id,
                        doc_id=doc_id,
                        buyer_name=buyer_name,
                        save_doc=True,
                        save_user=True,
                        save_buyer=bool(buyer_name)
                    )
                    logger.info(
                        f"Mem0 스마트 메모리 저장: doc_id={doc_id}, user_id={numeric_user_id}, "
                        f"buyer={buyer_name}, result={mem_result}"
                    )
                except Exception as mem_error:
                    logger.error(f"Mem0 메모리 추가 실패: {mem_error}")

            # 8. 사용된 툴 정보 추출
            tools_used = extract_tools_used(result)

            return Response({
                'doc_message_id': ai_msg.doc_message_id,
                'doc_id': doc_id,
                'message': result.final_output,
                'tools_used': tools_used,
                'context_used': context.get('context_summary', '')
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"Document chat error: {e}")
            return Response(
                {'error': f'채팅 처리 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class DocumentChatStreamView(View):
    """
    문서 작성 스트리밍 챗봇 API (Mem0 통합 + DocMessage 저장)

    POST /api/documents/chat/stream/
    {
        "doc_id": 1,           # 필수: Document ID
        "message": "...",      # 필수
        "user_id": "emp001",   # 선택: 로그인 사용자
        "document_content": ""  # 선택: 현재 화면 에디터 내용
    }
    """

    def post(self, request):
        try:
            data = json.loads(request.body)
            doc_id = data.get('doc_id') or data.get('document_id')
            user_id = data.get('user_id')
            message = data.get('message')
            document_content = data.get('document_content', '')

            logger.info(f"DocumentChatStreamView: doc_id={doc_id}, user_id={user_id}, message={message[:50] if message else 'None'}, doc_content_len={len(document_content)}")
        except json.JSONDecodeError:
            return StreamingHttpResponse(
                f"data: {json.dumps({'type': 'error', 'error': 'Invalid JSON'})}\n\n",
                content_type='text/event-stream'
            )

        if not message:
            return StreamingHttpResponse(
                f"data: {json.dumps({'type': 'error', 'error': 'message 필드가 필요합니다.'})}\n\n",
                content_type='text/event-stream'
            )

        if not doc_id:
            return StreamingHttpResponse(
                f"data: {json.dumps({'type': 'error', 'error': 'doc_id 필드가 필요합니다.'})}\n\n",
                content_type='text/event-stream'
            )

        response = StreamingHttpResponse(
            self.stream_response(doc_id, user_id, message, document_content),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    def stream_response(self, doc_id, user_id, message, document_content=''):
        """문서 Agent 스트리밍 응답 생성기"""

        # 1. Document 조회
        try:
            document = Document.objects.get(doc_id=doc_id)
            trade_id = document.trade_id
        except Document.DoesNotExist:
            yield f"data: {json.dumps({'type': 'error', 'error': f'Document를 찾을 수 없습니다: doc_id={doc_id}'})}\n\n"
            return

        # doc_id 정보 전송
        yield f"data: {json.dumps({'type': 'init', 'doc_id': doc_id, 'trade_id': trade_id})}\n\n"

        # 2. 사용자 메시지 저장
        user_msg = DocMessage.objects.create(
            doc=document,
            role='user',
            content=message
        )
        logger.info(f"스트리밍: DocMessage 저장: doc_message_id={user_msg.doc_message_id}")

        # 3. 이전 대화 히스토리 로드
        prev_messages = DocMessage.objects.filter(doc=document).exclude(
            doc_message_id=user_msg.doc_message_id
        ).order_by('created_at')
        message_count = prev_messages.count()
        start_index = max(0, message_count - 10)
        recent_messages = list(prev_messages[start_index:])

        # role 변환: DB의 'agent' → OpenAI API의 'assistant'
        message_history = [
            {"role": "assistant" if msg.role == "agent" else msg.role, "content": msg.content}
            for msg in recent_messages
        ]
        logger.info(f"스트리밍: 대화 히스토리 로드: {len(message_history)}개 메시지")

        # 4. Mem0 컨텍스트 로드 (새 구조: 단기 + 장기 분리)
        mem_service = get_memory_service()
        context = {}

        # user_id를 정수로 변환 (emp_no가 들어올 수도 있음)
        user = get_user_by_id_or_emp_no(user_id)
        numeric_user_id = user.user_id if user else None

        if mem_service:
            context = mem_service.build_doc_context(
                doc_id=doc_id,
                query=message
            )

        if context.get('context_summary'):
            yield f"data: {json.dumps({'type': 'context', 'summary': context['context_summary']})}\n\n"

        # 5. doc_mode에 따라 적절한 Agent 선택
        if document.doc_mode == 'upload' and document.upload_status == 'ready':
            # 업로드 모드: Document Reader Assistant (문서 내용 검색/질의 전용)
            agent = get_read_document_agent(
                document_id=document.doc_id,
                document_name=document.original_filename or f"문서_{document.doc_id}",
                document_type=document.get_doc_type_display(),
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL
            )
            logger.info(f"📄 업로드 모드: Document Reader Assistant 사용 (doc_id={doc_id}, filename={document.original_filename})")
        else:
            # 수동 작성 모드: Document Writing Assistant (문서 편집/작성 지원)
            agent = get_document_writing_agent(
                document_content=document_content,
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL
            )
            logger.info(f"✏️ 작성 모드: Document Writing Assistant 사용 (doc_id={doc_id})")

        # 에이전트 정보 전송 (브라우저 콘솔 디버깅용)
        agent_info = {
            'name': agent.name,
            'model': agent.model,
            'doc_mode': document.doc_mode,
            'tools': [tool.__name__ if hasattr(tool, '__name__') else str(tool) for tool in agent.tools]
        }
        yield f"data: {json.dumps({'type': 'agent_info', 'agent': agent_info})}\n\n"
        logger.info(f"🤖 Agent 정보: {agent_info}")

        enhanced_input = message
        context_parts = []

        # 현재 작성 중인 문서 내용 (에디터에서 전달됨)
        if document_content and document_content.strip():
            # HTML 태그 제거하여 텍스트 추출
            current_text = re.sub(r'<[^>]+>', ' ', document_content)
            current_text = re.sub(r'\s+', ' ', current_text).strip()
            if current_text:
                context_parts.append(f"[현재 작성 중인 {document.doc_type} 문서 내용]\n{current_text[:2000]}")
                logger.info(f"현재 에디터 내용 {len(current_text)}자 컨텍스트에 추가")

        # 이전 step 문서 내용 참조 (RDS DocVersion에서 직접 조회 - 더 신뢰성 있음)
        try:
            sibling_docs = Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)
            prev_doc_contents = []
            for sibling_doc in sibling_docs:
                # 가장 최근 버전 가져오기
                latest_version = DocVersion.objects.filter(doc=sibling_doc).order_by('-created_at').first()
                if latest_version and latest_version.content:
                    content_data = latest_version.content
                    # 필드명: 'html' (프론트엔드에서 저장하는 필드명)
                    html_content = ''
                    if isinstance(content_data, dict):
                        html_content = content_data.get('html', '') or content_data.get('html_content', '')
                    else:
                        html_content = str(content_data)

                    if html_content and html_content.strip():
                        # HTML 태그 제거하여 순수 텍스트 추출
                        text_content = re.sub(r'<[^>]+>', ' ', html_content)
                        text_content = re.sub(r'\s+', ' ', text_content).strip()
                        if text_content:
                            prev_doc_contents.append(f"  [{sibling_doc.doc_type}]\n{text_content[:1500]}")

            if prev_doc_contents:
                context_parts.append(f"[이전 step 문서 내용 - 참조용]\n" + "\n\n".join(prev_doc_contents))
                logger.info(f"이전 문서 {len(prev_doc_contents)}개 내용을 컨텍스트에 추가")
        except Exception as e:
            logger.error(f"이전 문서 조회 오류: {e}")

        # Mem0 컨텍스트 추가 (단기: 상세, 장기: 요약)
        if context.get('short_memories'):
            short_mem_texts = [m.get('memory', str(m)) for m in context['short_memories']]
            context_parts.append(f"[이전 대화 상세]\n" + "\n".join(f"- {t}" for t in short_mem_texts))

        if context.get('long_memories'):
            long_mem_texts = [m.get('memory', str(m)) for m in context['long_memories']]
            context_parts.append(f"[이전 대화 요약]\n" + "\n".join(f"- {t}" for t in long_mem_texts))

        if message_history:
            history_text = "\n".join([
                f"{'사용자' if msg['role'] == 'user' else 'AI'}: {msg['content'][:100]}..."
                for msg in message_history[-3:]
            ])
            context_parts.append(f"[최근 대화]\n{history_text}")

        if context_parts:
            enhanced_input = f"{chr(10).join(context_parts)}\n\n{message}"

        # Agent input 준비
        input_items = []
        for msg in message_history:
            input_items.append({"role": msg["role"], "content": msg["content"]})
        input_items.append({"role": "user", "content": enhanced_input})

        final_input = input_items if len(input_items) > 1 else enhanced_input
        logger.info(f"스트리밍: Agent input 준비 완료: {len(input_items)}개 메시지")

        # 6. 스트리밍 실행
        async def run_stream():
            tools_used = []
            seen_tools = set()
            full_response = ""

            try:
                result = Runner.run_streamed(agent, input=final_input)

                async for event in result.stream_events():
                    # 텍스트 스트리밍 이벤트
                    if event.type == "raw_response_event":
                        data = event.data
                        if hasattr(data, 'type') and data.type == 'response.output_text.delta':
                            if hasattr(data, 'delta') and data.delta:
                                full_response += data.delta
                                yield ('text', data.delta)

                    # 툴 호출 이벤트
                    elif event.type == "run_item_stream_event":
                        item = event.item
                        if isinstance(item, ToolCallItem):
                            tool_name = None
                            try:
                                tool_name = item.raw_item.name
                            except AttributeError:
                                pass

                            if not tool_name:
                                try:
                                    tool_name = item.name
                                except AttributeError:
                                    pass

                            if not tool_name:
                                try:
                                    tool_name = item.tool_call.function.name
                                except AttributeError:
                                    pass

                            logger.info(f"Tool detected: {tool_name}")

                            if tool_name and tool_name not in seen_tools:
                                seen_tools.add(tool_name)
                                tool_info = TOOL_DISPLAY_INFO.get(tool_name, {
                                    'name': tool_name,
                                    'icon': 'tool',
                                    'description': f'{tool_name} 도구를 사용했습니다.'
                                })
                                tool_data = {'id': tool_name, **tool_info}
                                tools_used.append(tool_data)
                                logger.info(f"Tool info sent: {tool_data}")
                                yield ('tool', tool_data)

                yield ('done', {'full_response': full_response, 'tools_used': tools_used})

            except Exception as e:
                import traceback
                traceback.print_exc()
                yield ('error', str(e))

        # 비동기 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        tools_used = []
        full_response = ""

        try:
            async_gen = run_stream()
            while True:
                try:
                    event_type, event_data = loop.run_until_complete(async_gen.__anext__())

                    if event_type == 'text':
                        yield f"data: {json.dumps({'type': 'text', 'content': event_data})}\n\n"
                    elif event_type == 'tool':
                        tools_used.append(event_data)
                        yield f"data: {json.dumps({'type': 'tool', 'tool': event_data})}\n\n"
                    elif event_type == 'done':
                        full_response = event_data['full_response']
                        tools_used = event_data['tools_used']
                        yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used})}\n\n"
                    elif event_type == 'error':
                        yield f"data: {json.dumps({'type': 'error', 'error': event_data})}\n\n"

                except StopAsyncIteration:
                    break
        finally:
            loop.close()

        # 7. 편집 응답인지 확인 및 처리
        edit_response = None
        if full_response:
            edit_response = parse_edit_response(full_response)
            if edit_response:
                logger.info(f"편집 응답 감지: {len(edit_response.get('changes', []))}개 변경사항")
                # 편집 응답 전송
                yield f"data: {json.dumps({'type': 'edit', 'message': edit_response['message'], 'changes': edit_response['changes']})}\n\n"

        # 8. AI 응답 저장 (metadata에 tools_used, changes 포함)
        try:
            ai_msg = DocMessage.objects.create(
                doc=document,
                role='agent',
                content=full_response,
                metadata={
                    'tools_used': tools_used,
                    'is_edit': edit_response is not None,
                    'changes': edit_response.get('changes', []) if edit_response else [],
                    'edit_message': edit_response.get('message', '') if edit_response else ''
                }
            )
            logger.info(f"스트리밍: DocMessage AI 응답 저장: doc_message_id={ai_msg.doc_message_id}, tools={[t['id'] for t in tools_used]}")

            # Mem0에 메모리 추가 (단기: 매번, 장기: 10턴마다)
            if mem_service:
                messages = [
                    {"role": "user", "content": message},
                    {"role": "assistant", "content": full_response}
                ]
                try:
                    # 단기 메모리 저장 (매번)
                    mem_service.add_doc_short_memory(
                        doc_id=doc_id,
                        messages=messages
                    )

                    # 10턴마다 장기 메모리에 요약 저장
                    total_messages = DocMessage.objects.filter(doc=document).count()
                    turn_count = total_messages // 2  # 1턴 = user + assistant

                    if turn_count > 0 and turn_count % 10 == 0:
                        # 최근 10턴(20개 메시지)을 가져와서 요약 저장
                        recent_for_summary = DocMessage.objects.filter(
                            doc=document
                        ).order_by('-created_at')[:20]

                        summary_messages = [
                            {"role": "assistant" if m.role == "agent" else m.role, "content": m.content}
                            for m in reversed(recent_for_summary)
                        ]

                        turn_start = turn_count - 9
                        turn_end = turn_count
                        mem_service.add_doc_long_memory(
                            doc_id=doc_id,
                            messages=summary_messages,
                            turn_range=f"{turn_start}-{turn_end}"
                        )
                        logger.info(f"✅ Mem0 장기 메모리 저장 (Turn {turn_start}-{turn_end})")

                    logger.info(f"✅ Mem0 단기 메모리 추가 완료: doc_id={doc_id}, Turn {turn_count}")
                except Exception as mem_error:
                    logger.warning(f"스트리밍: Mem0 메모리 추가 실패 (무시): {mem_error}")

            logger.info(f"Document chat stream completed: doc_id={doc_id}, tools={[t['id'] for t in tools_used]}")

        except Exception as e:
            logger.error(f"Failed to save AI response: {e}")
            import traceback
            traceback.print_exc()


# ==================== General Chat (일반 채팅) ====================

class GeneralChatView(APIView):
    """
    일반 채팅 API (문서 작성과 무관한 일반 대화)

    POST /api/chat/general/
    {
        "user_id": "emp001",
        "message": "...",
        "gen_chat_id": 1  # 선택: 기존 채팅 이어가기
    }
    """

    def post(self, request):
        user_id = request.data.get('user_id')
        message = request.data.get('message')
        gen_chat_id = request.data.get('gen_chat_id')

        if not message:
            return Response(
                {'error': 'message 필드가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_user_by_id_or_emp_no(user_id)
        if not user:
            return Response(
                {'error': '사용자를 찾을 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # GenChat 조회 또는 생성
            if gen_chat_id:
                try:
                    gen_chat = GenChat.objects.get(gen_chat_id=gen_chat_id)
                except GenChat.DoesNotExist:
                    gen_chat = GenChat.objects.create(user=user, title="일반 채팅")
            else:
                gen_chat = GenChat.objects.create(user=user, title="일반 채팅")

            # 사용자 메시지 저장
            GenMessage.objects.create(
                gen_chat=gen_chat,
                sender_type='U',
                content=message
            )

            # TODO: AI 응답 생성 (일반 채팅용 Agent 필요)
            ai_response = "일반 채팅 기능은 아직 구현 중입니다."

            # AI 응답 저장
            ai_msg = GenMessage.objects.create(
                gen_chat=gen_chat,
                sender_type='A',
                content=ai_response
            )

            return Response({
                'gen_chat_id': gen_chat.gen_chat_id,
                'gen_message_id': ai_msg.gen_message_id,
                'message': ai_response
            })

        except Exception as e:
            logger.error(f"General chat error: {e}")
            return Response(
                {'error': f'채팅 처리 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
