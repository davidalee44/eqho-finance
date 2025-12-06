"""Admin configuration for user management."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Invitation, User, UserActivity


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""

    list_display = (
        'email', 'username', 'role', 'company',
        'is_active', 'last_activity', 'login_count', 'created_at'
    )
    list_filter = ('role', 'is_active', 'is_staff', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name', 'company')
    ordering = ('-created_at',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Eqho Profile', {
            'fields': ('role', 'company', 'title', 'phone', 'avatar_url', 'supabase_id')
        }),
        ('Activity', {
            'fields': ('last_activity', 'login_count')
        }),
        ('Feature Flags', {
            'fields': ('feature_overrides',),
            'classes': ('collapse',),
        }),
        ('Notes', {
            'fields': ('notes', 'metadata'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ('last_activity', 'login_count', 'created_at', 'updated_at')


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    """Admin for user activity tracking."""

    list_display = ('user', 'action', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__email', 'user__username', 'ip_address')
    ordering = ('-timestamp',)
    readonly_fields = ('id', 'user', 'action', 'details', 'ip_address', 'user_agent', 'timestamp')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    """Admin for invitations."""

    list_display = ('email', 'role', 'invited_by', 'status', 'expires_at', 'created_at')
    list_filter = ('status', 'role', 'created_at')
    search_fields = ('email', 'invited_by__email')
    ordering = ('-created_at',)
    readonly_fields = ('token', 'accepted_at', 'created_at')
