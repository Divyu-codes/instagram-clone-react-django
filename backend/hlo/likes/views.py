from django.db.models import F
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import Notification
from posts.models import Post

from .models import Like


class PostLikeView(APIView):
    permission_classes = [IsAuthenticated]

    # ==========================================
    # GET LIKE STATUS + COUNT
    # ==========================================

    def get(self, request, post_id):

        try:
            post = Post.objects.get(
                id=post_id
            )

        except Post.DoesNotExist:
            return Response(
                {
                    "error": "Post not found."
                },
                status=404
            )

        liked = Like.objects.filter(
            post=post,
            user=request.user
        ).exists()

        likes_count = Like.objects.filter(
            post=post
        ).count()

        return Response(
            {
                "liked": liked,
                "likes_count": likes_count,
            }
        )

    # ==========================================
    # LIKE / UNLIKE
    # ==========================================

    def post(self, request, post_id):

        try:
            post = Post.objects.get(
                id=post_id
            )

        except Post.DoesNotExist:
            return Response(
                {
                    "error": "Post not found."
                },
                status=404
            )

        like = Like.objects.filter(
            post=post,
            user=request.user
        ).first()

        # ======================================
        # UNLIKE
        # ======================================

        if like:

            like.delete()

            Post.objects.filter(
                id=post.id,
                likes__gt=0
            ).update(
                likes=F("likes") - 1
            )

            liked = False

        # ======================================
        # LIKE
        # ======================================

        else:

            Like.objects.create(
                post=post,
                user=request.user
            )

            Post.objects.filter(
                id=post.id
            ).update(
                likes=F("likes") + 1
            )

            liked = True

            # ==================================
            # NOTIFICATION
            # ==================================

            if request.user != post.user:

                message = (
                    f"{request.user.username} "
                    f"liked your post."
                )

                Notification.objects.create(
                    recipient=post.user,
                    actor=request.user,
                    notification_type="like",
                    message=message,
                    post=post,
                )

                channel_layer = (
                    get_channel_layer()
                )

                if channel_layer:

                    async_to_sync(
                        channel_layer.group_send
                    )(
                        f"user_{post.user.id}",
                        {
                            "type":
                                "new_notification",

                            "message":
                                message,

                            "notification_type":
                                "like",

                            "actor_id":
                                request.user.id,

                            "actor_username":
                                request.user.username,
                        },
                    )

        # ======================================
        # GET REAL COUNT FROM LIKE TABLE
        # ======================================

        likes_count = Like.objects.filter(
            post=post
        ).count()

        # Keep Post.likes synchronized too
        Post.objects.filter(
            id=post.id
        ).update(
            likes=likes_count
        )

        return Response(
            {
                "liked": liked,
                "likes_count": likes_count,
            }
        )