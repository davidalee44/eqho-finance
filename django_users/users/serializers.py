"""Serializers for user management API."""

from rest_framework import serializers

from .models import Invitation, User, UserActivity


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""

    display_name = serializers.ReadOnlyField()
    is_admin = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'display_name', 'role', 'is_admin', 'company', 'title',
            'phone', 'avatar_url', 'supabase_id', 'last_activity',
            'login_count', 'feature_overrides', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'supabase_id', 'last_activity', 'login_count',
            'created_at', 'updated_at',
        ]


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'first_name', 'last_name',
            'role', 'company', 'title', 'phone',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users."""

    class Meta:
        model = User
        fields = [
            'first_name', 'last_name', 'company', 'title', 'phone',
            'avatar_url', 'feature_overrides',
        ]


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Admin-only serializer for user updates."""

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'role', 'company',
            'title', 'phone', 'avatar_url', 'is_active',
            'feature_overrides', 'notes', 'metadata',
        ]


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity."""

    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'user_email', 'action', 'details',
            'ip_address', 'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for invitations."""

    invited_by_email = serializers.CharField(source='invited_by.email', read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'email', 'role', 'invited_by', 'invited_by_email',
            'status', 'message', 'expires_at', 'accepted_at', 'created_at',
        ]
        read_only_fields = ['id', 'invited_by', 'status', 'accepted_at', 'created_at']


class InvitationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invitations."""

    class Meta:
        model = Invitation
        fields = ['email', 'role', 'message']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('User with this email already exists.')
        if Invitation.objects.filter(email=value, status='pending').exists():
            raise serializers.ValidationError('Pending invitation for this email already exists.')
        return value

