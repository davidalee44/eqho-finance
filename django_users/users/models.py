"""
Custom User model for Eqho user tracking and management.

Extends Django's AbstractUser to support:
- Supabase integration (external auth_id)
- Role-based access control
- Activity tracking
- Feature flag overrides
"""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with extended fields for Eqho platform."""

    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        INVESTOR = 'investor', 'Investor'
        ANALYST = 'analyst', 'Analyst'
        VIEWER = 'viewer', 'Viewer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to external auth provider (Supabase)
    supabase_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        help_text='UUID from Supabase auth.users'
    )

    # Role-based access
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
    )

    # Profile fields
    company = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(blank=True)

    # Tracking
    last_activity = models.DateTimeField(null=True, blank=True)
    login_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Feature flag overrides (JSON field for flexibility)
    feature_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text='Per-user feature flag overrides'
    )

    # Metadata
    notes = models.TextField(blank=True, help_text='Admin notes about this user')
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['supabase_id']),
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['last_activity']),
        ]

    def __str__(self):
        return f'{self.email} ({self.role})'

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.is_superuser

    @property
    def display_name(self):
        if self.first_name and self.last_name:
            return f'{self.first_name} {self.last_name}'
        return self.email.split('@')[0] if self.email else self.username


class UserActivity(models.Model):
    """Track user activity for analytics and audit."""

    class ActionType(models.TextChoices):
        LOGIN = 'login', 'Login'
        LOGOUT = 'logout', 'Logout'
        VIEW_SLIDE = 'view_slide', 'View Slide'
        EXPORT_DATA = 'export_data', 'Export Data'
        DOWNLOAD_REPORT = 'download_report', 'Download Report'
        UPDATE_SETTINGS = 'update_settings', 'Update Settings'
        API_ACCESS = 'api_access', 'API Access'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action = models.CharField(max_length=50, choices=ActionType.choices)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_activities'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
        verbose_name_plural = 'User activities'

    def __str__(self):
        return f'{self.user.email} - {self.action} at {self.timestamp}'


class Invitation(models.Model):
    """Manage user invitations."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        EXPIRED = 'expired', 'Expired'
        REVOKED = 'revoked', 'Revoked'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    role = models.CharField(
        max_length=20,
        choices=User.Role.choices,
        default=User.Role.VIEWER,
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invitations_sent'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    token = models.CharField(max_length=255, unique=True)
    message = models.TextField(blank=True, help_text='Custom invitation message')
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invitations'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invitation to {self.email} ({self.status})'
