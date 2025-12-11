from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Department, User, TradeFlow, Document, DocVersion, DocMessage


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['dept_id', 'dept_name']
    search_fields = ['dept_name']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['user_id', 'emp_no', 'name', 'dept', 'user_role', 'activation']
    list_filter = ['user_role', 'activation', 'dept']
    search_fields = ['emp_no', 'name']
    ordering = ['emp_no']

    fieldsets = (
        (None, {'fields': ('emp_no', 'password')}),
        ('개인정보', {'fields': ('name', 'dept')}),
        ('권한', {'fields': ('user_role', 'activation', 'is_staff', 'is_superuser')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('emp_no', 'name', 'password1', 'password2', 'dept', 'user_role'),
        }),
    )


@admin.register(TradeFlow)
class TradeFlowAdmin(admin.ModelAdmin):
    list_display = ['trade_id', 'title', 'user', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'user__name', 'user__emp_no']
    raw_id_fields = ['user']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['doc_id', 'trade', 'doc_type', 'doc_mode', 'upload_status', 'created_at']
    list_filter = ['doc_type', 'doc_mode', 'upload_status']
    search_fields = ['trade__title', 'original_filename']
    raw_id_fields = ['trade']


@admin.register(DocVersion)
class DocVersionAdmin(admin.ModelAdmin):
    list_display = ['version_id', 'doc', 'created_at']
    search_fields = ['doc__trade__title']
    raw_id_fields = ['doc']


@admin.register(DocMessage)
class DocMessageAdmin(admin.ModelAdmin):
    list_display = ['doc_message_id', 'doc', 'role', 'created_at']
    list_filter = ['role']
    search_fields = ['content', 'doc__trade__title']
    raw_id_fields = ['doc']
