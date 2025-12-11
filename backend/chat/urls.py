from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatView, ChatStreamView, GenChatDeleteView
from .trade_views import (
    TradeInitView,
    TradeFlowViewSet,
    DocumentViewSet,
    DocChatHistoryView,
    DocumentChatView,
    DocumentChatStreamView,
    GeneralChatView,
)

# DRF Router for ViewSets
router = DefaultRouter()
router.register(r'trade', TradeFlowViewSet, basename='trade')
router.register(r'documents', DocumentViewSet, basename='documents')

urlpatterns = [
    # 기존 일반 채팅 API
    path('chat/', ChatView.as_view(), name='chat'),
    path('chat/stream/', ChatStreamView.as_view(), name='chat-stream'),

    # 일반 채팅 (Mem0 통합)
    path('chat/general/', GeneralChatView.as_view(), name='chat-general'),
    path('chat/general/<int:gen_chat_id>/', GenChatDeleteView.as_view(), name='chat-general-delete'),

    # 무역 거래 초기화
    path('trade/init/', TradeInitView.as_view(), name='trade-init'),

    # 문서 채팅 API
    path('documents/chat/', DocumentChatView.as_view(), name='document-chat'),
    path('documents/chat/stream/', DocumentChatStreamView.as_view(), name='document-chat-stream'),
    path('documents/<int:doc_id>/chat/history/', DocChatHistoryView.as_view(), name='document-chat-history'),

    # ViewSet routes (trade/, documents/)
    path('', include(router.urls)),
]
