from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db import models

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import (
    RefreshToken,
    TokenError
)

from .models import Profile
from .serializers import ProfileSerializer

from follows.models import Follow


# ==========================================
# ALL USERS / PROFILES
# ==========================================

class ProfileListView(generics.ListAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        current_user = self.request.user

        # Users whom current user is already following
        accepted_following_ids = Follow.objects.filter(
            follower=current_user
        ).values_list(
            "following_id",
            flat=True
        )

        return (
            Profile.objects
            .select_related("user")
            .filter(
                user__is_active=True
            )
            .exclude(
                user=current_user
            )
            .exclude(
                user__is_staff=True
            )
            .exclude(
                user__is_superuser=True
            )
            .filter(
                # Public profiles are visible to everyone
                # OR
                # Private profiles are visible only if
                # current user is already an accepted follower
                models.Q(is_private=False)
                |
                models.Q(
                    user_id__in=accepted_following_ids
                )
            )
        )


# ==========================================
# MY PROFILE
# ==========================================

class MyProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user
        )

        return profile


# ==========================================
# PROFILE DETAIL
# ==========================================

class ProfileDetailView(
    generics.RetrieveAPIView
):

    serializer_class = ProfileSerializer

    permission_classes = [
        IsAuthenticated
    ]

    def get_object(self):

        # URL:
        # /api/users/<user_id>/

        user_id = self.kwargs["pk"]

        user = get_object_or_404(
            User,
            id=user_id,
            is_active=True
        )

        # Make sure profile always exists
        profile, _ = Profile.objects.get_or_create(
            user=user
        )

        return profile


# ==========================================
# LOGOUT
# ==========================================

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):

        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {
                    "detail": "Refresh token is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            RefreshToken(
                refresh_token
            ).blacklist()

        except TokenError:
            return Response(
                {
                    "detail": "Invalid or expired token."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            status=status.HTTP_205_RESET_CONTENT
        )