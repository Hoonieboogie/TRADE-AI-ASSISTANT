from rest_framework import serializers
from .models import (
    Department, User, TradeFlow, Document, DocMessage,
    DocVersion, GenChat, GenMessage, GenUploadFile
)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['dept_id', 'dept_name']


class UserSerializer(serializers.ModelSerializer):
    dept_name = serializers.CharField(source='dept.dept_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'user_id', 'emp_no', 'name', 'dept', 'dept_name',
            'activation', 'user_role', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user_id', 'created_at', 'updated_at']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


class TradeFlowSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = TradeFlow
        fields = [
            'trade_id', 'user', 'user_name', 'title', 'status',
            'document_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['trade_id', 'created_at', 'updated_at']

    def get_document_count(self, obj):
        return obj.documents.count()


class DocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    doc_mode_display = serializers.CharField(source='get_doc_mode_display', read_only=True)
    message_count = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'doc_id', 'trade', 'doc_type', 'doc_type_display',
            'doc_mode', 'doc_mode_display',
            # Upload fields
            's3_key', 's3_url', 'original_filename', 'file_size',
            'mime_type', 'upload_status', 'error_message',
            'converted_pdf_url', 'extracted_text',
            'qdrant_point_ids',
            # Counts
            'message_count', 'version_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['doc_id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_version_count(self, obj):
        return obj.versions.count()


class DocumentDashboardSerializer(DocumentSerializer):
    """대시보드용 문서 Serializer (최신 버전 및 모든 버전 포함)"""
    latest_version = serializers.SerializerMethodField()
    all_versions = serializers.SerializerMethodField()

    class Meta(DocumentSerializer.Meta):
        fields = DocumentSerializer.Meta.fields + ['latest_version', 'all_versions']

    def get_latest_version(self, obj):
        # prefetch_related로 가져온 versions 중 첫 번째 (최신)
        # ViewSet에서 Prefetch로 정렬해두어야 함
        versions = getattr(obj, 'prefetched_versions', None)
        if versions and len(versions) > 0:
            return DocVersionSerializer(versions[0]).data

        # Fallback (N+1 발생 가능하므로 prefetch 권장)
        latest = obj.versions.order_by('-created_at').first()
        if latest:
            return DocVersionSerializer(latest).data
        return None

    def get_all_versions(self, obj):
        """모든 버전을 시간순으로 반환 (최신순)"""
        # prefetch_related로 가져온 versions 사용
        versions = getattr(obj, 'prefetched_versions', None)
        if versions:
            return DocVersionSerializer(versions, many=True).data

        # Fallback
        versions = obj.versions.order_by('-created_at').all()
        return DocVersionSerializer(versions, many=True).data


class TradeDashboardSerializer(TradeFlowSerializer):
    """대시보드용 Trade Serializer (문서 목록 포함)"""
    documents = DocumentDashboardSerializer(many=True, read_only=True)

    class Meta(TradeFlowSerializer.Meta):
        fields = TradeFlowSerializer.Meta.fields + ['documents']



class DocMessageSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = DocMessage
        fields = [
            'doc_message_id', 'doc', 'role', 'role_display',
            'content', 'metadata', 'created_at'
        ]
        read_only_fields = ['doc_message_id', 'created_at']


class DocVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocVersion
        fields = ['version_id', 'doc', 'content', 'created_at']
        read_only_fields = ['version_id', 'created_at']


# ============================================================
# 일반 채팅 (General Chat) Serializers
# ============================================================

class GenChatSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = GenChat
        fields = [
            'gen_chat_id', 'user', 'user_name', 'title',
            'message_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['gen_chat_id', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class GenMessageSerializer(serializers.ModelSerializer):
    sender_type_display = serializers.CharField(source='get_sender_type_display', read_only=True)
    files = serializers.SerializerMethodField()

    class Meta:
        model = GenMessage
        fields = [
            'gen_message_id', 'gen_chat', 'sender_type',
            'sender_type_display', 'content', 'files', 'created_at'
        ]
        read_only_fields = ['gen_message_id', 'created_at']

    def get_files(self, obj):
        return GenUploadFileSerializer(obj.files.all(), many=True).data


class GenUploadFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenUploadFile
        fields = ['gen_file_id', 'gen_message', 'origin_name', 'file_url']
        read_only_fields = ['gen_file_id']


# ==================== Request/Response Serializers ====================

class DocChatRequestSerializer(serializers.Serializer):
    """문서 챗봇 요청"""
    doc_id = serializers.IntegerField(required=False, allow_null=True)
    message = serializers.CharField(required=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    trade_id = serializers.IntegerField(required=False, allow_null=True)
    doc_type = serializers.ChoiceField(
        choices=['offer', 'pi', 'contract', 'ci', 'pl'],
        required=False,
        allow_null=True
    )


class GenChatRequestSerializer(serializers.Serializer):
    """일반 챗봇 요청"""
    gen_chat_id = serializers.IntegerField(required=False, allow_null=True)
    user_id = serializers.IntegerField(required=True)
    message = serializers.CharField(required=True)


class ChatResponseSerializer(serializers.Serializer):
    """챗봇 응답"""
    type = serializers.CharField()  # 'text' or 'edit'
    message = serializers.CharField()
    tools_used = serializers.ListField(child=serializers.DictField(), required=False)
    changes = serializers.ListField(child=serializers.DictField(), required=False)
