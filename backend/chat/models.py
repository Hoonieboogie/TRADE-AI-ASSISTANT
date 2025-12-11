# chat/models.py
#
# 핵심 모델들은 documents 앱에 정의되어 있음
# 여기서는 documents 앱의 모델을 import하여 사용
#
# documents.models에 있는 모델:
# - Department, User, TradeFlow, Document, DocVersion, DocMessage
#
# chat 앱에서 추가로 필요한 모델:
# - GenChat, GenMessage, GenUploadFile (일반 채팅용)

from django.db import models

# documents 앱의 모델 re-export (하위 호환성)
from documents.models import (
    Department,
    User,
    TradeFlow,
    Document,
    DocVersion,
    DocMessage,
)


# ============================================================
# 일반 채팅 (General Chat) - chat 앱 전용
# ============================================================

class GenChat(models.Model):
    """일반 채팅 세션"""
    gen_chat_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gen_chats')
    title = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'gen_chat'
        ordering = ['-updated_at']
        managed = True

    def __str__(self):
        return f"Chat {self.gen_chat_id} - {self.user.name}"


class GenMessage(models.Model):
    """일반 채팅 메시지"""
    SENDER_TYPE_CHOICES = [
        ('U', 'User'),
        ('A', 'Assistant'),
    ]

    gen_message_id = models.BigAutoField(primary_key=True)
    gen_chat = models.ForeignKey(GenChat, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=1, choices=SENDER_TYPE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gen_message'
        ordering = ['created_at']
        managed = True

    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"{self.get_sender_type_display()}: {preview}"


class GenUploadFile(models.Model):
    """일반 채팅 업로드 파일"""
    gen_file_id = models.BigAutoField(primary_key=True)
    gen_message = models.ForeignKey(GenMessage, on_delete=models.CASCADE, related_name='files')
    origin_name = models.CharField(max_length=255)
    file_url = models.URLField(max_length=1000)

    class Meta:
        db_table = 'gen_upload_file'
        managed = True

    def __str__(self):
        return f"{self.origin_name} ({self.gen_file_id})"
