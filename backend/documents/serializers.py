"""
Document API Serializers

새로운 DB 구조에 맞춘 Serializer 정의
"""

from rest_framework import serializers
from .models import Department, User, TradeFlow, Document, DocVersion, DocMessage


# =============================================================================
# Department Serializers
# =============================================================================

class DepartmentSerializer(serializers.ModelSerializer):
    """부서 Serializer"""

    class Meta:
        model = Department
        fields = ['dept_id', 'dept_name']


# =============================================================================
# User Serializers
# =============================================================================

class UserSerializer(serializers.ModelSerializer):
    """사용자 Serializer"""

    dept = DepartmentSerializer(read_only=True)
    dept_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        source='dept',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = User
        fields = [
            'user_id',
            'emp_no',
            'name',
            'dept',
            'dept_id',
            'activation',
            'user_role',
            'date_joined',
        ]
        read_only_fields = ['user_id', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_emp_no(self, value):
        """수정 시 사원번호 중복 검증 (본인 제외)"""
        if self.instance and self.instance.emp_no == value:
            return value  # 본인 사원번호는 허용
        if User.objects.filter(emp_no=value).exists():
            raise serializers.ValidationError('이미 존재하는 사원번호입니다.')
        return value


class UserCreateSerializer(serializers.ModelSerializer):
    """사용자 생성 Serializer"""

    class Meta:
        model = User
        fields = ['emp_no', 'name', 'dept', 'user_role']

    def validate_emp_no(self, value):
        """사원번호 중복 검증"""
        if User.objects.filter(emp_no=value).exists():
            raise serializers.ValidationError('이미 존재하는 사원번호입니다.')
        return value

    def create(self, validated_data):
        user = User(**validated_data)
        # 초기 비밀번호를 "a123456!"로 설정
        user.set_password('a123456!')
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    """로그인 요청 Serializer"""

    emp_no = serializers.CharField(help_text="사원번호")
    password = serializers.CharField(help_text="비밀번호", write_only=True)


class LoginResponseSerializer(serializers.Serializer):
    """로그인 응답 Serializer"""

    user_id = serializers.IntegerField()
    emp_no = serializers.CharField()
    name = serializers.CharField()
    user_role = serializers.CharField()
    dept = DepartmentSerializer(allow_null=True)


# =============================================================================
# DocVersion Serializers
# =============================================================================

# =============================================================================
# DocVersion Serializers
# =============================================================================

class DocVersionSummarySerializer(serializers.ModelSerializer):
    """문서 버전 요약 Serializer (스냅샷 제외)"""

    class Meta:
        model = DocVersion
        fields = ['version_id', 'trade', 'meta', 'created_at']
        read_only_fields = ['version_id', 'created_at']


class DocVersionSerializer(serializers.ModelSerializer):
    """문서 버전 상세 Serializer (스냅샷 포함)"""

    class Meta:
        model = DocVersion
        fields = ['version_id', 'trade', 'snapshot', 'meta', 'created_at']
        read_only_fields = ['version_id', 'created_at']


class DocVersionCreateSerializer(serializers.ModelSerializer):
    """문서 버전 생성 Serializer"""

    class Meta:
        model = DocVersion
        fields = ['trade', 'snapshot', 'meta']


# =============================================================================
# Document Serializers
# =============================================================================

class DocumentSerializer(serializers.ModelSerializer):
    """문서 Serializer"""

    latest_version = serializers.SerializerMethodField()
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'doc_id',
            'trade_id',
            'doc_type',
            'doc_mode',
            's3_key',
            's3_url',
            'original_filename',
            'file_size',
            'mime_type',
            'upload_status',
            'error_message',
            'extracted_text',
            'converted_pdf_key',
            'converted_pdf_url',
            'qdrant_point_ids',
            'latest_version',
            'version_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['doc_id', 'created_at', 'updated_at']

    def get_latest_version(self, obj):
        # Deprecated: Versions are now at Trade level
        return None

    def get_version_count(self, obj):
        # Return total versions of the trade
        if obj.trade:
            return obj.trade.versions.count()
        return 0


class DocumentCreateSerializer(serializers.ModelSerializer):
    """문서 생성 Serializer"""

    class Meta:
        model = Document
        fields = ['trade', 'doc_type', 'doc_mode']


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """문서 업데이트 Serializer"""

    class Meta:
        model = Document
        fields = ['doc_mode', 's3_key', 's3_url', 'original_filename',
                  'file_size', 'mime_type', 'upload_status', 'error_message']


# =============================================================================
# TradeFlow Serializers
# =============================================================================

class TradeFlowListSerializer(serializers.ModelSerializer):
    """거래 플로우 목록 Serializer"""

    documents = serializers.SerializerMethodField()
    versions = DocVersionSummarySerializer(many=True, read_only=True)
    latest_version = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = TradeFlow
        fields = [
            'trade_id',
            'title',
            'status',
            'document_count',
            'completed_count',
            'documents',
            'versions',
            'latest_version',
            'created_at',
            'updated_at',
        ]

    def get_document_count(self, obj):
        return obj.documents.count()

    def get_completed_count(self, obj):
        # Check latest snapshot for completed steps
        latest = obj.versions.first()
        if latest and latest.snapshot:
            # Count how many steps have content in the snapshot
            return len(latest.snapshot.keys())
        return 0

    def get_documents(self, obj):
        documents = obj.documents.all()
        return DocumentSerializer(documents, many=True).data

    def get_latest_version(self, obj):
        latest = obj.versions.first()
        if latest:
            return DocVersionSerializer(latest).data
        return None


class TradeFlowCreateSerializer(serializers.ModelSerializer):
    """거래 플로우 생성 Serializer"""

    class Meta:
        model = TradeFlow
        fields = ['title']


class TradeFlowDetailSerializer(serializers.ModelSerializer):
    """거래 플로우 상세 Serializer"""

    documents = serializers.SerializerMethodField()
    versions = DocVersionSummarySerializer(many=True, read_only=True)

    class Meta:
        model = TradeFlow
        fields = [
            'trade_id',
            'title',
            'status',
            'documents',
            'versions',
            'created_at',
            'updated_at',
        ]

    def get_documents(self, obj):
        documents = obj.documents.all()
        return DocumentSerializer(documents, many=True).data


# =============================================================================
# DocMessage Serializers
# =============================================================================

class DocMessageSerializer(serializers.ModelSerializer):
    """채팅 메시지 Serializer"""

    class Meta:
        model = DocMessage
        fields = ['doc_message_id', 'doc_id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = ['doc_message_id', 'created_at']


class DocMessageCreateSerializer(serializers.ModelSerializer):
    """채팅 메시지 생성 Serializer"""

    class Meta:
        model = DocMessage
        fields = ['doc', 'role', 'content', 'metadata']


# =============================================================================
# Presigned URL Serializers (S3 업로드용)
# =============================================================================

class PresignedUploadRequestSerializer(serializers.Serializer):
    """Presigned URL 요청 Serializer"""

    filename = serializers.CharField(max_length=255, help_text="원본 파일명")
    file_size = serializers.IntegerField(min_value=1, help_text="파일 크기 (bytes)")
    mime_type = serializers.CharField(default='application/pdf', help_text="MIME 타입")


class PresignedUploadResponseSerializer(serializers.Serializer):
    """Presigned URL 응답 Serializer"""

    doc_id = serializers.IntegerField(help_text="문서 ID")
    upload_url = serializers.URLField(help_text="업로드할 Presigned URL")
    s3_key = serializers.CharField(help_text="S3 파일 키")
    expires_in = serializers.IntegerField(help_text="URL 만료 시간 (초)")


class UploadCompleteRequestSerializer(serializers.Serializer):
    """업로드 완료 알림 Serializer"""

    s3_key = serializers.CharField(help_text="S3 파일 키")


# =============================================================================
# Chat Request/Response Serializers
# =============================================================================

class ChatRequestSerializer(serializers.Serializer):
    """채팅 요청 Serializer"""

    message = serializers.CharField(help_text="사용자 메시지")


class ChatResponseSerializer(serializers.Serializer):
    """채팅 응답 Serializer"""

    message = serializers.CharField(help_text="AI 응답 메시지")
    tools_used = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="사용된 툴 목록"
    )
