from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class CustomUserManager(BaseUserManager):
    """
    emp_no를 USERNAME_FIELD로 사용하는 커스텀 UserManager
    """
    def create_user(self, emp_no, name, password=None, **extra_fields):
        if not emp_no:
            raise ValueError('사원번호(emp_no)는 필수입니다')
        user = self.model(emp_no=emp_no, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, emp_no, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(emp_no, name, password, **extra_fields)


class Department(models.Model):
    """
    부서 정보
    """
    dept_id = models.BigAutoField(primary_key=True)
    dept_name = models.CharField(max_length=100, help_text="부서명")

    class Meta:
        db_table = 'department'

    def __str__(self):
        return self.dept_name


class User(AbstractUser):
    """
    사용자 정보

    Django AbstractUser를 확장하여 사원번호, 부서 등 추가 필드 포함
    """
    user_id = models.BigAutoField(primary_key=True)

    # username 필드를 emp_no로 대체 (AbstractUser의 username 비활성화)
    username = None
    emp_no = models.CharField(
        max_length=50,
        unique=True,
        help_text="사원번호"
    )
    name = models.CharField(max_length=100, help_text="이름")
    dept = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        help_text="부서"
    )
    activation = models.BooleanField(default=True, help_text="활성 상태")

    USER_ROLE_CHOICES = [
        ('user', 'User'),
        ('admin', 'Admin'),
    ]
    user_role = models.CharField(
        max_length=20,
        choices=USER_ROLE_CHOICES,
        default='user',
        help_text="사용자 역할"
    )

    # emp_no를 로그인 ID로 사용
    USERNAME_FIELD = 'emp_no'
    REQUIRED_FIELDS = ['name']

    # 커스텀 UserManager 사용
    objects = CustomUserManager()

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.emp_no} - {self.name}"


class TradeFlow(models.Model):
    """
    거래 플로우

    하나의 거래(Trade)에 여러 문서가 포함됨
    """
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    trade_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='trade_flows',
        help_text="생성한 사용자"
    )
    title = models.CharField(max_length=255, help_text="거래 제목")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='in_progress',
        help_text="진행 상태"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trade_flow'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class Document(models.Model):
    """
    문서 정보

    기존 user_documents 테이블 역할을 완전히 흡수
    """
    DOC_TYPE_CHOICES = [
        ('offer', 'Offer Sheet'),
        ('pi', 'Proforma Invoice'),
        ('contract', 'Sales Contract'),
        ('ci', 'Commercial Invoice'),
        ('pl', 'Packing List'),
    ]

    DOC_MODE_CHOICES = [
        ('manual', 'Manual'),
        ('upload', 'Upload'),
        ('skip', 'Skip'),
    ]

    UPLOAD_STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
    ]

    doc_id = models.BigAutoField(primary_key=True)
    trade = models.ForeignKey(
        TradeFlow,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="거래 플로우"
    )
    doc_type = models.CharField(
        max_length=20,
        choices=DOC_TYPE_CHOICES,
        help_text="문서 유형"
    )
    doc_mode = models.CharField(
        max_length=20,
        choices=DOC_MODE_CHOICES,
        default='manual',
        help_text="작성 모드"
    )

    # S3 관련 필드 (upload 모드일 때 사용)
    s3_key = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="S3 저장 경로"
    )
    s3_url = models.URLField(
        max_length=1000,
        null=True,
        blank=True,
        help_text="S3 URL"
    )
    original_filename = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="원본 파일명"
    )
    file_size = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="파일 크기 (bytes)"
    )
    mime_type = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="MIME 타입"
    )

    # 업로드 상태 (upload 모드일 때 사용)
    upload_status = models.CharField(
        max_length=20,
        choices=UPLOAD_STATUS_CHOICES,
        null=True,
        blank=True,
        help_text="업로드 처리 상태"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="에러 메시지"
    )

    # RAG용 벡터 ID
    qdrant_point_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="RAG용 벡터 ID 목록"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'document'
        ordering = ['doc_type']
        indexes = [
            models.Index(fields=['trade', 'doc_type']),
            models.Index(fields=['upload_status']),
        ]
        # 하나의 trade에 같은 doc_type은 하나만 존재
        unique_together = ['trade', 'doc_type']

    def __str__(self):
        return f"{self.trade.title} - {self.get_doc_type_display()}"


class DocVersion(models.Model):
    """
    문서 버전

    저장할 때마다 새 버전 생성
    """
    version_id = models.BigAutoField(primary_key=True)
    doc = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='versions',
        help_text="문서"
    )
    content = models.JSONField(help_text="문서 내용")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_version'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['doc', '-created_at']),
        ]

    def __str__(self):
        return f"{self.doc} - Version {self.version_id}"


class DocMessage(models.Model):
    """
    문서 채팅 메시지

    화면에 채팅 기록 표시용
    LLM 메모리 관리는 Mem0가 user_id + doc_id로 처리
    """
    ROLE_CHOICES = [
        ('user', 'User'),
        ('agent', 'Agent'),
    ]

    doc_message_id = models.BigAutoField(primary_key=True)
    doc = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='messages',
        help_text="문서"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        help_text="발신자 역할"
    )
    content = models.TextField(help_text="메시지 내용")
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="도구 사용 결과, 검색 결과 등"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'doc_message'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['doc', 'created_at']),
        ]

    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"{self.role}: {preview}"
