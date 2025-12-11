"""
Document API Views

새로운 DB 구조에 맞춘 View 정의
"""

import asyncio
import json
import time
import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import StreamingHttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate

from .models import Department, User, TradeFlow, Document, DocVersion, DocMessage
from .serializers import (
    DepartmentSerializer,
    UserSerializer,
    UserCreateSerializer,
    LoginSerializer,
    LoginResponseSerializer,
    TradeFlowListSerializer,
    TradeFlowCreateSerializer,
    TradeFlowDetailSerializer,
    DocumentSerializer,
    DocumentCreateSerializer,
    DocumentUpdateSerializer,
    DocVersionSerializer,
    DocVersionCreateSerializer,
    DocMessageSerializer,
    DocMessageCreateSerializer,
    PresignedUploadRequestSerializer,
    PresignedUploadResponseSerializer,
    UploadCompleteRequestSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
)
from agent_core.s3_utils import s3_manager

logger = logging.getLogger(__name__)


def get_user_by_id_or_emp_no(user_id):
    """
    user_id(숫자) 또는 emp_no(사원번호)로 사용자 조회

    프론트엔드에서 emp_no(사원번호)를 user_id로 전달할 수 있으므로,
    먼저 emp_no로 조회하고, 없으면 user_id(정수)로 조회합니다.
    """
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


# =============================================================================
# Auth Views
# =============================================================================

class LoginView(APIView):
    """로그인 API"""

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        emp_no = serializer.validated_data['emp_no']
        password = serializer.validated_data['password']

        user = authenticate(request, username=emp_no, password=password)

        if user is None:
            return Response(
                {'error': '사원번호 또는 비밀번호가 올바르지 않습니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.activation:
            return Response(
                {'error': '비활성화된 계정입니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        response_data = {
            'user_id': user.user_id,
            'emp_no': user.emp_no,
            'name': user.name,
            'user_role': user.user_role,
            'dept': DepartmentSerializer(user.dept).data if user.dept else None
        }

        return Response(response_data)


class PasswordChangeView(APIView):
    """비밀번호 변경 API"""

    def post(self, request):
        emp_no = request.data.get('emp_no')
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        # 필수 필드 검증
        if not emp_no or not current_password or not new_password:
            return Response(
                {'error': '사원번호, 현재 비밀번호, 새 비밀번호는 필수입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 비밀번호 유효성 검사 (8~16자, 영문/숫자/특수문자 조합)
        import re
        if len(new_password) < 8 or len(new_password) > 16:
            return Response(
                {'error': '비밀번호는 8~16자 사이여야 합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        has_letter = bool(re.search(r'[A-Za-z]', new_password))
        has_number = bool(re.search(r'[0-9]', new_password))
        has_special = bool(re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]', new_password))

        if not (has_letter and has_number and has_special):
            return Response(
                {'error': '비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 현재 비밀번호로 인증
        user = authenticate(request, username=emp_no, password=current_password)

        if user is None:
            return Response(
                {'error': '현재 비밀번호가 올바르지 않습니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.activation:
            return Response(
                {'error': '비활성화된 계정입니다.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 비밀번호 변경
        user.set_password(new_password)
        user.save()

        logger.info(f"Password changed for user: {emp_no}")

        return Response({'message': '비밀번호가 성공적으로 변경되었습니다.'})


# =============================================================================
# Department Views
# =============================================================================

class DepartmentViewSet(viewsets.ModelViewSet):
    """부서 ViewSet"""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


# =============================================================================
# User Views
# =============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """사용자 ViewSet"""

    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer


# =============================================================================
# TradeFlow Views
# =============================================================================

class TradeFlowViewSet(viewsets.ModelViewSet):
    """거래 플로우 ViewSet"""

    queryset = TradeFlow.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return TradeFlowListSerializer
        elif self.action == 'create':
            return TradeFlowCreateSerializer
        return TradeFlowDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(user_id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        trade_flow = TradeFlow.objects.create(
            user=user,
            title=serializer.validated_data['title']
        )

        # 5개 문서 자동 생성 (업로드 기능을 위해 필요)
        doc_types = ['offer', 'pi', 'contract', 'ci', 'pl']
        for doc_type in doc_types:
            Document.objects.create(
                trade=trade_flow,
                doc_type=doc_type
            )

        return Response(
            TradeFlowDetailSerializer(trade_flow).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """거래 상태 업데이트"""
        trade_flow = self.get_object()
        new_status = request.data.get('status')

        if new_status not in ['in_progress', 'completed']:
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trade_flow.status = new_status
        trade_flow.save()

        return Response(TradeFlowDetailSerializer(trade_flow).data)


# =============================================================================
# Document Views
# =============================================================================

class DocumentViewSet(viewsets.ModelViewSet):
    """문서 ViewSet"""

    queryset = Document.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DocumentUpdateSerializer
        return DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        trade_id = self.request.query_params.get('trade_id')
        if trade_id:
            queryset = queryset.filter(trade_id=trade_id)
        return queryset

    @action(detail=True, methods=['post'])
    def upload_request(self, request, pk=None):
        """Presigned URL 요청"""
        document = self.get_object()

        serializer = PresignedUploadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        filename = data['filename']
        file_size = data['file_size']
        mime_type = data['mime_type']

        try:
            presigned_data = s3_manager.generate_presigned_upload_url(
                file_name=filename,
                file_type=mime_type,
                expiration=3600
            )

            # Document 업데이트
            document.doc_mode = 'upload'
            document.original_filename = filename
            document.s3_key = presigned_data['s3_key']
            document.s3_url = presigned_data['file_url']
            document.file_size = file_size
            document.mime_type = mime_type
            document.upload_status = 'uploading'
            document.save()

            return Response({
                'doc_id': document.doc_id,
                'upload_url': presigned_data['upload_url'],
                's3_key': presigned_data['s3_key'],
                'expires_in': 3600
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Failed to generate presigned URL: {e}")
            return Response(
                {'error': 'Failed to generate upload URL', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def upload_complete(self, request, pk=None):
        """업로드 완료 알림"""
        document = self.get_object()

        serializer = UploadCompleteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        s3_key = serializer.validated_data['s3_key']

        if document.s3_key != s3_key:
            return Response(
                {'error': 'S3 key mismatch'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if document.upload_status != 'uploading':
            return Response(
                {'error': f'Document is already {document.upload_status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 상태 업데이트
        document.upload_status = 'processing'
        document.save()

        # PDF 처리 시작
        from documents.services import process_uploaded_document
        process_uploaded_document(document.doc_id)

        return Response({
            'status': 'processing',
            'doc_id': document.doc_id,
            'message': 'Document processing started'
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['get'])
    def refresh_url(self, request, pk=None):
        """S3 URL 갱신"""
        document = self.get_object()

        if not document.s3_key:
            return Response(
                {'error': 'No S3 key found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_url = s3_manager.generate_presigned_download_url(
                s3_key=document.s3_key,
                expiration=3600 * 24
            )

            document.s3_url = new_url
            document.save()

            return Response({
                's3_url': new_url,
                'expires_in': 3600 * 24
            })

        except Exception as e:
            logger.error(f"Failed to refresh URL: {e}")
            return Response(
                {'error': 'Failed to refresh URL', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# DocVersion Views
# =============================================================================

class DocVersionViewSet(viewsets.ModelViewSet):
    """문서 버전 ViewSet"""

    queryset = DocVersion.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return DocVersionCreateSerializer
        return DocVersionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        doc_id = self.request.query_params.get('doc_id')
        if doc_id:
            queryset = queryset.filter(doc_id=doc_id)
        return queryset

    def create(self, request, *args, **kwargs):
        """새 버전 생성"""
        doc_id = request.data.get('doc_id')
        content = request.data.get('content')

        if not doc_id or not content:
            return Response(
                {'error': 'doc_id and content are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            document = Document.objects.get(doc_id=doc_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # doc_mode가 설정 안 되어 있으면 manual로 설정
        if document.doc_mode != 'manual':
            document.doc_mode = 'manual'

        # Document의 updated_at 업데이트 (save 호출)
        document.save()

        # Trade의 updated_at도 업데이트
        trade = document.trade
        trade.save()

        version = DocVersion.objects.create(
            doc=document,
            content=content
        )

        logger.info(f"Created version {version.version_id} for doc {doc_id}, trade {trade.trade_id} updated")

        return Response(
            DocVersionSerializer(version).data,
            status=status.HTTP_201_CREATED
        )


# =============================================================================
# DocMessage Views
# =============================================================================

class DocMessageViewSet(viewsets.ModelViewSet):
    """채팅 메시지 ViewSet"""

    queryset = DocMessage.objects.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return DocMessageCreateSerializer
        return DocMessageSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        doc_id = self.request.query_params.get('doc_id')
        if doc_id:
            queryset = queryset.filter(doc_id=doc_id)
        return queryset


# =============================================================================
# Chat Views
# =============================================================================

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


class DocumentChatView(APIView):
    """
    문서 기반 채팅 API (Mem0 메모리 통합)

    POST /api/documents/{doc_id}/chat/
    {
        "message": "이 계약서의 가격은?",
        "user_id": 1  # 선택: 메모리 기능에 사용
    }
    """

    def post(self, request, doc_id):
        from agents import Runner
        from agents.items import ToolCallItem
        from agent_core import get_read_document_agent
        from chat.config import PROMPT_VERSION, PROMPT_LABEL
        from chat.memory_service import get_memory_service

        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = serializer.validated_data['message']
        user_id = request.data.get('user_id')  # 메모리용 user_id

        try:
            document = Document.objects.get(doc_id=doc_id)
            trade_id = document.trade_id

            if document.doc_mode == 'upload' and document.upload_status != 'ready':
                return Response(
                    {'error': f'문서가 아직 준비되지 않았습니다 (현재 상태: {document.upload_status})'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 사용자 메시지 저장
            DocMessage.objects.create(
                doc=document,
                role='user',
                content=message
            )

            # Mem0 컨텍스트 로드
            mem_service = get_memory_service()
            context = {}
            numeric_user_id = None

            if user_id:
                # get_user_by_id_or_emp_no 함수로 사용자 조회 (emp_no 우선)
                user_obj = get_user_by_id_or_emp_no(user_id)
                if user_obj:
                    numeric_user_id = user_obj.user_id
                    logger.info(f"User found: emp_no/user_id={user_id} -> user_id={numeric_user_id}")

            if numeric_user_id and mem_service:
                context = mem_service.build_doc_context(
                    doc_id=doc_id,
                    user_id=numeric_user_id,
                    query=message
                )

            # Agent 생성 및 실행
            agent = get_read_document_agent(
                document_id=document.doc_id,
                document_name=document.original_filename or document.get_doc_type_display(),
                document_type=document.get_doc_type_display(),
                prompt_version=PROMPT_VERSION,
                prompt_label=PROMPT_LABEL
            )

            # 컨텍스트 추가
            enhanced_input = message
            if context.get('context_summary'):
                enhanced_input = f"[{context['context_summary']}]\n\n{message}"

            result = asyncio.run(Runner.run(agent, input=enhanced_input))

            # 사용된 툴 추출
            tools_used = []
            seen_tools = set()
            for item in result.new_items:
                if isinstance(item, ToolCallItem):
                    try:
                        tool_name = item.raw_item.name
                    except AttributeError:
                        continue
                    if tool_name not in seen_tools:
                        seen_tools.add(tool_name)
                        tool_info = TOOL_DISPLAY_INFO.get(tool_name, {
                            'name': tool_name,
                            'icon': 'tool',
                            'description': f'{tool_name} 도구를 사용했습니다.'
                        })
                        tools_used.append({'id': tool_name, **tool_info})

            # AI 응답 저장
            DocMessage.objects.create(
                doc=document,
                role='agent',
                content=result.final_output,
                metadata={'tools_used': [tool['id'] for tool in tools_used]}
            )

            # Mem0에 대화 메모리 추가
            if numeric_user_id:
                try:
                    mem_service.add_doc_memory(
                        doc_id=doc_id,
                        user_id=numeric_user_id,
                        messages=[
                            {"role": "user", "content": message},
                            {"role": "assistant", "content": result.final_output}
                        ],
                        metadata={
                            "trade_id": trade_id,
                            "doc_type": document.doc_type
                        }
                    )
                    logger.info(f"Mem0 메모리 추가: doc_id={doc_id}, user_id={numeric_user_id}")
                except Exception as mem_error:
                    logger.error(f"Mem0 메모리 추가 실패: {mem_error}")

            return Response({
                'message': result.final_output,
                'tools_used': tools_used,
                'context_used': context.get('context_summary', '')
            })

        except Document.DoesNotExist:
            return Response(
                {'error': '문서를 찾을 수 없습니다'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Document chat error: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'채팅 처리 중 오류가 발생했습니다: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# SSE Views
# =============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class DocumentProcessingStatusView(View):
    """
    문서 처리 상태 SSE 스트림

    GET /api/documents/{doc_id}/status/stream/
    """

    def get(self, request, doc_id):
        response = StreamingHttpResponse(
            self.stream_status(doc_id),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response

    def stream_status(self, doc_id):
        """문서 처리 상태 스트리밍"""

        max_wait_time = 300
        poll_interval = 2
        elapsed = 0

        while elapsed < max_wait_time:
            try:
                document = Document.objects.get(doc_id=doc_id)

                status_data = {
                    'status': document.upload_status,
                    'doc_id': document.doc_id,
                    'filename': document.original_filename,
                }

                if document.upload_status == 'uploading':
                    status_data['message'] = '파일 업로드 대기 중...'
                    status_data['progress'] = 10

                elif document.upload_status == 'processing':
                    chunk_count = len(document.qdrant_point_ids)
                    status_data['message'] = f'문서 분석 중... ({chunk_count}개 청크 처리됨)'
                    status_data['progress'] = min(30 + chunk_count * 5, 90)

                elif document.upload_status == 'ready':
                    new_url = s3_manager.generate_presigned_download_url(
                        s3_key=document.s3_key,
                        expiration=3600 * 24
                    )
                    document.s3_url = new_url
                    document.save()

                    status_data['message'] = '처리 완료!'
                    status_data['progress'] = 100
                    status_data['s3_url'] = new_url
                    status_data['total_chunks'] = len(document.qdrant_point_ids)
                    yield f"data: {json.dumps({'type': 'complete', **status_data})}\n\n"
                    return

                elif document.upload_status == 'error':
                    status_data['message'] = document.error_message or '처리 중 오류 발생'
                    status_data['error'] = document.error_message
                    yield f"data: {json.dumps({'type': 'error', **status_data})}\n\n"
                    return

                yield f"data: {json.dumps({'type': 'status', **status_data})}\n\n"

            except Document.DoesNotExist:
                yield f"data: {json.dumps({'type': 'error', 'error': '문서를 찾을 수 없습니다', 'doc_id': doc_id})}\n\n"
                return

            time.sleep(poll_interval)
            elapsed += poll_interval

        yield f"data: {json.dumps({'type': 'timeout', 'message': '처리 시간이 초과되었습니다', 'doc_id': doc_id})}\n\n"
