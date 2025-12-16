"""
Trade and Document Management Views with Mem0 Integration
"""

import asyncio
import json
import logging
import re
from asgiref.sync import sync_to_async
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
        title = request.data.get('title', '새 문서')

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

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        대시보드용 Trade 목록 조회 (최적화됨)
        
        GET /api/trade/dashboard/?user_id=...
        """
        from django.db.models import Prefetch
        from .serializers import TradeDashboardSerializer
        from .models import Document, DocVersion

        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # 1. 문서 버전 Prefetch (최신순 정렬)
            version_prefetch = Prefetch(
                'versions',
                queryset=DocVersion.objects.order_by('-created_at'),
                to_attr='prefetched_versions'
            )

            # 2. 문서 Prefetch (버전 포함)
            doc_prefetch = Prefetch(
                'documents',
                queryset=Document.objects.prefetch_related(version_prefetch),
            )

            # 3. Trade 조회 (문서 포함)
            trades = TradeFlow.objects.filter(user_id=user_id)\
                .prefetch_related(doc_prefetch)\
                .order_by('-updated_at')

            serializer = TradeDashboardSerializer(trades, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Dashboard fetch failed: {e}")
            return Response(
                {'error': f'대시보드 데이터 조회 실패: {str(e)}'},
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
        "document_content": "",  # 선택: 현재 화면 에디터 내용
        "prev_documents": {}   # 선택: 이전 step 문서 내용 (저장 여부 무관, 실시간 전달)
    }
    """

    async def post(self, request):
        try:
            data = json.loads(request.body)
            doc_id = data.get('doc_id') or data.get('document_id')
            user_id = data.get('user_id')
            message = data.get('message')
            document_content = data.get('document_content', '')
            prev_documents = data.get('prev_documents', {})  # 이전 step 문서 내용

            logger.info(f"DocumentChatStreamView: doc_id={doc_id}, user_id={user_id}, message={message[:50] if message else 'None'}, doc_content_len={len(document_content)}, prev_docs={list(prev_documents.keys())}")
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
            self.stream_response(doc_id, user_id, message, document_content, prev_documents),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    async def stream_response(self, doc_id, user_id, message, document_content='', prev_documents=None):
        """문서 Agent 스트리밍 응답 생성기 - ASGI async 버전"""
        if prev_documents is None:
            prev_documents = {}

        # 1. Document 조회
        try:
            document = await sync_to_async(Document.objects.get)(doc_id=doc_id)
            trade_id = document.trade_id
        except Document.DoesNotExist:
            yield f"data: {json.dumps({'type': 'error', 'error': f'Document를 찾을 수 없습니다: doc_id={doc_id}'})}\n\n"
            return

        # doc_id 정보 전송
        yield f"data: {json.dumps({'type': 'init', 'doc_id': doc_id, 'trade_id': trade_id})}\n\n"

        # 2. 사용자 메시지 저장
        user_msg = await sync_to_async(DocMessage.objects.create)(
            doc=document,
            role='user',
            content=message
        )
        logger.info(f"스트리밍: DocMessage 저장: doc_message_id={user_msg.doc_message_id}")

        # 3. 이전 대화 히스토리 로드
        @sync_to_async
        def get_prev_messages():
            prev_msgs = DocMessage.objects.filter(doc=document).exclude(
                doc_message_id=user_msg.doc_message_id
            ).order_by('created_at')
            msg_count = prev_msgs.count()
            start_idx = max(0, msg_count - 10)
            return list(prev_msgs[start_idx:]), msg_count

        recent_messages, message_count = await get_prev_messages()

        # role 변환: DB의 'agent' → OpenAI API의 'assistant'
        message_history = [
            {"role": "assistant" if msg.role == "agent" else msg.role, "content": msg.content}
            for msg in recent_messages
        ]
        logger.info(f"스트리밍: 대화 히스토리 로드: {len(message_history)}개 메시지")

        # 4. Mem0 컨텍스트 로드 (새 구조: 단기 + 장기 분리)
        mem_service = await sync_to_async(get_memory_service)()
        context = {}

        # user_id를 정수로 변환 (emp_no가 들어올 수도 있음)
        user = await sync_to_async(get_user_by_id_or_emp_no)(user_id)
        numeric_user_id = user.user_id if user else None

        if mem_service:
            context = await sync_to_async(mem_service.build_doc_context)(
                doc_id=doc_id,
                query=message
            )

        if context.get('context_summary'):
            yield f"data: {json.dumps({'type': 'context', 'summary': context['context_summary']})}\n\n"

        # 5. doc_mode에 따라 적절한 Agent 선택
        doc_mode = await sync_to_async(lambda: document.doc_mode)()
        upload_status = await sync_to_async(lambda: document.upload_status)()
        original_filename = await sync_to_async(lambda: document.original_filename)()
        doc_type_display_val = await sync_to_async(document.get_doc_type_display)()
        extracted_text = await sync_to_async(lambda: document.extracted_text)()

        # 이전 step 문서 내용 수집 (Agent 시스템 프롬프트에 포함)
        prev_doc_contents = []
        doc_type_names = {
            'offer': 'Offer Sheet', 'pi': 'Proforma Invoice', 'contract': 'Sales Contract',
            'ci': 'Commercial Invoice', 'pl': 'Packing List'
        }

        try:
            @sync_to_async
            def get_sibling_docs():
                return [{
                    'doc_type': doc.doc_type,
                    'doc_mode': doc.doc_mode,
                    'extracted_text': doc.extracted_text,
                    'latest_content': (DocVersion.objects.filter(doc=doc).order_by('-created_at').first() or type('', (), {'content': None})()).content
                } for doc in Document.objects.filter(trade_id=trade_id).exclude(doc_id=doc_id)]

            processed_types = set()
            for sib in await get_sibling_docs():
                if sib['doc_type'] in processed_types:
                    continue

                text_content = None
                mode_label = ""

                # 업로드 모드: extracted_text 사용
                if sib['doc_mode'] == 'upload' and sib['extracted_text']:
                    text_content = sib['extracted_text'].strip()
                    mode_label = "(업로드)"
                # 직접작성 모드: 프론트엔드 데이터 우선, 없으면 DB
                else:
                    if prev_documents and sib['doc_type'] in prev_documents:
                        content = prev_documents[sib['doc_type']].get('content', '') if prev_documents[sib['doc_type']] else ''
                        if content and content.strip():
                            text_content = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', content)).strip()
                            mode_label = "(직접작성)"

                    if not text_content and sib['latest_content']:
                        html = sib['latest_content'].get('html', '') or sib['latest_content'].get('html_content', '') if isinstance(sib['latest_content'], dict) else str(sib['latest_content'])
                        if html and html.strip():
                            text_content = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).strip()
                            mode_label = "(직접작성)"

                if text_content:
                    prev_doc_contents.append(f"[{doc_type_names.get(sib['doc_type'], sib['doc_type'])} {mode_label}]\n{text_content}")
                    processed_types.add(sib['doc_type'])

        except Exception as e:
            logger.error(f"이전 문서 조회 오류: {e}")

        prev_docs_content_str = "\n\n".join(prev_doc_contents) if prev_doc_contents else None

        # Agent 생성 (이전 문서 내용을 시스템 프롬프트에 포함)
        if doc_mode == 'upload' and upload_status == 'ready':
            agent = get_read_document_agent(
                document_id=document.doc_id,
                document_name=original_filename or f"문서_{document.doc_id}",
                document_type=doc_type_display_val,
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL,
                prev_docs_content=prev_docs_content_str
            )
            logger.info(f"업로드 모드 Agent 사용 (doc_id={doc_id}, prev_docs={len(prev_doc_contents)}개)")
        else:
            agent = get_document_writing_agent(
                document_content=document_content,
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL,
                prev_docs_content=prev_docs_content_str
            )
            logger.info(f"작성 모드 Agent 사용 (doc_id={doc_id}, prev_docs={len(prev_doc_contents)}개)")

        # 에이전트 정보 전송
        agent_info = {
            'name': agent.name,
            'model': agent.model,
            'doc_mode': doc_mode,
            'tools': [tool.__name__ if hasattr(tool, '__name__') else str(tool) for tool in agent.tools]
        }
        yield f"data: {json.dumps({'type': 'agent_info', 'agent': agent_info})}\n\n"

        # 컨텍스트 구성
        enhanced_input = message
        context_parts = []

        # 이전 step 문서 내용 참조
        if prev_doc_contents:
            context_parts.append(f"[이전 step 문서 내용 - 참조용]\n" + "\n\n".join(prev_doc_contents))

        # Mem0 컨텍스트 추가
        if context.get('short_memories'):
            context_parts.append(f"[이전 대화 상세]\n" + "\n".join(f"- {m.get('memory', str(m))}" for m in context['short_memories']))

        if context.get('long_memories'):
            context_parts.append(f"[이전 대화 요약]\n" + "\n".join(f"- {m.get('memory', str(m))}" for m in context['long_memories']))

        if message_history:
            history_text = "\n".join([f"{'사용자' if msg['role'] == 'user' else 'AI'}: {msg['content'][:100]}..." for msg in message_history[-3:]])
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
        tools_used = []
        seen_tools = set()
        full_response = ""

        try:
            result = Runner.run_streamed(agent, input=final_input)

            async for event in result.stream_events():
                if event.type == "raw_response_event":
                    data = event.data
                    if hasattr(data, 'type') and data.type == 'response.output_text.delta':
                        if hasattr(data, 'delta') and data.delta:
                            full_response += data.delta
                            yield f"data: {json.dumps({'type': 'text', 'content': data.delta})}\n\n"

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
                            yield f"data: {json.dumps({'type': 'tool', 'tool': tool_data})}\n\n"

            # 완료 이벤트
            yield f"data: {json.dumps({'type': 'done', 'tools_used': tools_used})}\n\n"

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            return

        # 7. 편집 응답인지 확인 및 처리
        edit_response = None
        if full_response:
            edit_response = parse_edit_response(full_response)
            if edit_response:
                logger.info(f"편집 응답 감지: {len(edit_response.get('changes', []))}개 변경사항")
                yield f"data: {json.dumps({'type': 'edit', 'message': edit_response['message'], 'changes': edit_response['changes']})}\n\n"

        # 8. AI 응답 저장
        try:
            await sync_to_async(DocMessage.objects.create)(
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
            logger.info(f"스트리밍: DocMessage AI 응답 저장 완료, tools={[t['id'] for t in tools_used]}")

            # 9. Mem0에 메모리 추가
            if mem_service:
                messages = [
                    {"role": "user", "content": message},
                    {"role": "assistant", "content": full_response}
                ]
                try:
                    await sync_to_async(mem_service.add_doc_short_memory)(
                        doc_id=doc_id,
                        messages=messages
                    )

                    @sync_to_async
                    def get_turn_info():
                        total = DocMessage.objects.filter(doc=document).count()
                        turn = total // 2
                        recent = list(DocMessage.objects.filter(doc=document).order_by('-created_at')[:20])
                        return turn, recent

                    turn_count, recent_for_summary = await get_turn_info()

                    if turn_count > 0 and turn_count % 10 == 0:
                        summary_messages = [
                            {"role": "assistant" if m.role == "agent" else m.role, "content": m.content}
                            for m in reversed(recent_for_summary)
                        ]
                        turn_start = turn_count - 9
                        turn_end = turn_count
                        await sync_to_async(mem_service.add_doc_long_memory)(
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
