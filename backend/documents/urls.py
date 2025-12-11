"""
Documents App URLs

새로운 DB 구조에 맞춘 URL 정의
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    LoginView,
    PasswordChangeView,
    DepartmentViewSet,
    UserViewSet,
    TradeFlowViewSet,
    DocumentViewSet,
    DocVersionViewSet,
    DocMessageViewSet,
    DocumentChatView,
    DocumentProcessingStatusView,
)

# Router for ViewSets
router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'users', UserViewSet, basename='user')
router.register(r'trades', TradeFlowViewSet, basename='trade')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'versions', DocVersionViewSet, basename='version')
router.register(r'messages', DocMessageViewSet, basename='message')

urlpatterns = [
    # 인증
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/password-change/', PasswordChangeView.as_view(), name='password-change'),

    # ViewSet routes (먼저 배치하여 trades/, users/ 등이 먼저 매칭되도록 함)
    path('', include(router.urls)),

    # 문서 채팅 (ViewSet URL과 일관성 유지: /api/documents/documents/{id}/...)
    path('documents/<int:doc_id>/chat/', DocumentChatView.as_view(), name='document-chat'),

    # 문서 처리 상태 SSE 스트림
    path('documents/<int:doc_id>/status/stream/', DocumentProcessingStatusView.as_view(), name='document-status-stream'),
]

"""
API Endpoints:

Auth:
- POST /api/documents/auth/login/ - 로그인
- POST /api/documents/auth/password-change/ - 비밀번호 변경

Departments:
- GET /api/departments/ - 부서 목록
- POST /api/departments/ - 부서 생성
- GET /api/departments/{dept_id}/ - 부서 상세
- PUT /api/departments/{dept_id}/ - 부서 수정
- DELETE /api/departments/{dept_id}/ - 부서 삭제

Users:
- GET /api/users/ - 사용자 목록
- POST /api/users/ - 사용자 생성
- GET /api/users/{user_id}/ - 사용자 상세
- PUT /api/users/{user_id}/ - 사용자 수정
- DELETE /api/users/{user_id}/ - 사용자 삭제

TradeFlows:
- GET /api/trades/ - 거래 목록 (query: user_id)
- POST /api/trades/ - 거래 생성 (body: user_id, title)
- GET /api/trades/{trade_id}/ - 거래 상세 (문서 포함)
- PUT /api/trades/{trade_id}/ - 거래 수정
- DELETE /api/trades/{trade_id}/ - 거래 삭제
- PATCH /api/trades/{trade_id}/update_status/ - 상태 업데이트

Documents:
- GET /api/documents/ - 문서 목록 (query: trade_id)
- GET /api/documents/{doc_id}/ - 문서 상세
- PUT /api/documents/{doc_id}/ - 문서 수정
- POST /api/documents/{doc_id}/upload_request/ - Presigned URL 요청
- POST /api/documents/{doc_id}/upload_complete/ - 업로드 완료 알림
- GET /api/documents/{doc_id}/refresh_url/ - S3 URL 갱신
- POST /api/documents/{doc_id}/chat/ - 문서 채팅
- GET /api/documents/{doc_id}/status/stream/ - 처리 상태 SSE

Versions:
- GET /api/versions/ - 버전 목록 (query: doc_id)
- POST /api/versions/ - 버전 생성 (body: doc_id, content)
- GET /api/versions/{version_id}/ - 버전 상세

Messages:
- GET /api/messages/ - 메시지 목록 (query: doc_id)
- POST /api/messages/ - 메시지 생성
- GET /api/messages/{doc_message_id}/ - 메시지 상세
"""
