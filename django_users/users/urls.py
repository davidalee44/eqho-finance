"""URL configuration for users app."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import InvitationViewSet, UserActivityViewSet, UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'activities', UserActivityViewSet, basename='activity')
router.register(r'invitations', InvitationViewSet, basename='invitation')

urlpatterns = [
    path('', include(router.urls)),
]

