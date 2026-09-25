from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from django.contrib.auth.models import User
from django.db.models import F

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Profile
from notifications.models import Notification

from .models import Follow, FollowRequest


# =====================================================
# HELPER - SEND NOTIFICATION
# =====================================================

def send_notification(
    recipient,
    actor,
    notification_type,
    message
):
    """
    Create notification in database
    and send it through WebSocket.
    """

    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
    )

    channel_layer = get_channel_layer()

    if channel_layer:

        async_to_sync(
            channel_layer.group_send
        )(
            f"user_{recipient.id}",
            {
                "type": "new_notification",

                "message": message,

                "notification_type": notification_type,

                "actor_id": actor.id,

                "actor_username": actor.username,
            }
        )


# =====================================================
# FOLLOW / UNFOLLOW / FOLLOW REQUEST
# =====================================================

class FollowUserView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request, user_id):

        # =================================================
        # SELF FOLLOW PROTECTION
        # =================================================

        if request.user.id == user_id:

            return Response(
                {
                    "detail": "You cannot follow yourself."
                },
                status=400
            )

        # =================================================
        # GET TARGET USER
        # =================================================

        try:

            target_user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail": "User not found."
                },
                status=404
            )

        # =================================================
        # GET / CREATE TARGET PROFILE
        # =================================================

        target_profile, _ = Profile.objects.get_or_create(
            user=target_user
        )

        # =================================================
        # CHECK EXISTING ACCEPTED FOLLOW
        # =================================================

        existing_follow = Follow.objects.filter(
            follower=request.user,
            following=target_user
        ).first()

        # =================================================
        # ALREADY FOLLOWING -> UNFOLLOW
        # =================================================

        if existing_follow:

            existing_follow.delete()

            # Update target followers count
            Profile.objects.filter(
                user=target_user,
                followers_count__gt=0
            ).update(
                followers_count=F(
                    "followers_count"
                ) - 1
            )

            # Update current user's following count
            Profile.objects.filter(
                user=request.user,
                following_count__gt=0
            ).update(
                following_count=F(
                    "following_count"
                ) - 1
            )

            target_profile.refresh_from_db()

            return Response(
                {
                    "following": False,

                    "requested": False,

                    "followers_count": (
                        target_profile.followers_count
                    ),
                }
            )

        # =================================================
        # CHECK EXISTING PENDING REQUEST
        # =================================================

        existing_request = FollowRequest.objects.filter(
            sender=request.user,
            receiver=target_user
        ).first()

        # =================================================
        # REQUEST ALREADY SENT -> CANCEL REQUEST
        # =================================================

        if existing_request:

            existing_request.delete()

            return Response(
                {
                    "following": False,

                    "requested": False,

                    "followers_count": (
                        target_profile.followers_count
                    ),
                }
            )

        # =================================================
        # PUBLIC ACCOUNT
        # =================================================

        if not target_profile.is_private:

            # Create accepted follow directly
            Follow.objects.create(
                follower=request.user,
                following=target_user
            )

            # Update target follower count
            Profile.objects.filter(
                user=target_user
            ).update(
                followers_count=F(
                    "followers_count"
                ) + 1
            )

            # Update current user's following count
            Profile.objects.filter(
                user=request.user
            ).update(
                following_count=F(
                    "following_count"
                ) + 1
            )

            # IMPORTANT:
            # This notification is ONLY sent
            # for an actual accepted follow.

            message = (
                f"{request.user.username} "
                f"started following you."
            )

            send_notification(
                recipient=target_user,
                actor=request.user,
                notification_type="follow",
                message=message
            )

            target_profile.refresh_from_db()

            return Response(
                {
                    "following": True,

                    "requested": False,

                    "followers_count": (
                        target_profile.followers_count
                    ),
                }
            )

        # =================================================
        # PRIVATE ACCOUNT
        # =================================================

        # DO NOT create Follow here.
        #
        # Only create a pending FollowRequest.

        FollowRequest.objects.create(
            sender=request.user,
            receiver=target_user
        )

        # IMPORTANT:
        # Private account gets request notification,
        # NOT "started following you".

        message = (
            f"{request.user.username} "
            f"requested to follow you."
        )

        send_notification(
            recipient=target_user,
            actor=request.user,
            notification_type="follow_request",
            message=message
        )

        return Response(
            {
                "following": False,

                "requested": True,

                "followers_count": (
                    target_profile.followers_count
                ),
            }
        )


# =====================================================
# FOLLOWERS LIST
# =====================================================

class FollowersListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request, user_id):

        try:

            target_user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail": "User not found."
                },
                status=404
            )

        follows = (
            Follow.objects
            .filter(
                following=target_user
            )
            .select_related(
                "follower"
            )
            .order_by(
                "-created_at"
            )
        )

        data = []

        for item in follows:

            profile, _ = Profile.objects.get_or_create(
                user=item.follower
            )

            image = None

            if profile.profile_image:

                image = request.build_absolute_uri(
                    profile.profile_image.url
                )

            data.append(
                {
                    "id": item.follower.id,

                    "user_id": item.follower.id,

                    "username": item.follower.username,

                    "profile_image": image,
                }
            )

        return Response(data)


# =====================================================
# FOLLOWING LIST
# =====================================================

class FollowingListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request, user_id):

        try:

            target_user = User.objects.get(
                id=user_id
            )

        except User.DoesNotExist:

            return Response(
                {
                    "detail": "User not found."
                },
                status=404
            )

        follows = (
            Follow.objects
            .filter(
                follower=target_user
            )
            .select_related(
                "following"
            )
            .order_by(
                "-created_at"
            )
        )

        data = []

        for item in follows:

            profile, _ = Profile.objects.get_or_create(
                user=item.following
            )

            image = None

            if profile.profile_image:

                image = request.build_absolute_uri(
                    profile.profile_image.url
                )

            data.append(
                {
                    "id": item.following.id,

                    "user_id": item.following.id,

                    "username": item.following.username,

                    "profile_image": image,
                }
            )

        return Response(data)


# =====================================================
# INCOMING FOLLOW REQUESTS
# =====================================================

class FollowRequestListView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def get(self, request):

        requests = (
            FollowRequest.objects
            .filter(
                receiver=request.user
            )
            .select_related(
                "sender"
            )
            .order_by(
                "-created_at"
            )
        )

        data = []

        for item in requests:

            profile, _ = Profile.objects.get_or_create(
                user=item.sender
            )

            image = None

            if profile.profile_image:

                image = request.build_absolute_uri(
                    profile.profile_image.url
                )

            data.append(
                {
                    "id": item.id,

                    "user_id": item.sender.id,

                    "username": item.sender.username,

                    "profile_image": image,

                    "created_at": item.created_at,
                }
            )

        return Response(data)


# =====================================================
# ACCEPT FOLLOW REQUEST
# =====================================================

class AcceptFollowRequestView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request, request_id):

        try:

            follow_request = (
                FollowRequest.objects
                .select_related(
                    "sender",
                    "receiver"
                )
                .get(
                    id=request_id,
                    receiver=request.user
                )
            )

        except FollowRequest.DoesNotExist:

            return Response(
                {
                    "detail": "Follow request not found."
                },
                status=404
            )

        sender = follow_request.sender

        # =================================================
        # CHECK IF ALREADY FOLLOWING
        # =================================================

        existing_follow = Follow.objects.filter(
            follower=sender,
            following=request.user
        ).exists()

        # =================================================
        # CREATE ACCEPTED FOLLOW
        # =================================================

        if not existing_follow:

            Follow.objects.create(
                follower=sender,
                following=request.user
            )

            # Receiver gets +1 follower
            Profile.objects.filter(
                user=request.user
            ).update(
                followers_count=F(
                    "followers_count"
                ) + 1
            )

            # Sender gets +1 following
            Profile.objects.filter(
                user=sender
            ).update(
                following_count=F(
                    "following_count"
                ) + 1
            )

        # =================================================
        # DELETE PENDING REQUEST
        # =================================================

        follow_request.delete()

        # =================================================
        # ACCEPT NOTIFICATION
        # =================================================

        message = (
            f"{request.user.username} "
            f"accepted your follow request."
        )

        send_notification(
            recipient=sender,
            actor=request.user,
            notification_type="follow_request_accepted",
            message=message
        )

        profile = Profile.objects.get(
            user=request.user
        )

        return Response(
            {
                "success": True,

                "following": True,

                "requested": False,

                "followers_count": (
                    profile.followers_count
                ),
            }
        )


# =====================================================
# REJECT FOLLOW REQUEST
# =====================================================

class RejectFollowRequestView(APIView):

    permission_classes = [
        IsAuthenticated
    ]

    def post(self, request, request_id):

        deleted, _ = (
            FollowRequest.objects
            .filter(
                id=request_id,
                receiver=request.user
            )
            .delete()
        )

        if deleted == 0:

            return Response(
                {
                    "detail": "Follow request not found."
                },
                status=404
            )

        return Response(
            {
                "success": True
            }
        )