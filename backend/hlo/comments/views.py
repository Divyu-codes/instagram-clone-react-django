from django.shortcuts import get_object_or_404
from django.db.models import F
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from notifications.models import Notification
from posts.models import Post

from .models import Comment
from .serializers import CommentSerializer


class PostCommentListCreateView(generics.ListCreateAPIView):

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Comment.objects
            .filter(post_id=self.kwargs["post_id"])
            .select_related("user")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        post = get_object_or_404(Post, id=self.kwargs["post_id"])

        comment = serializer.save(user=self.request.user, post=post)

        Post.objects.filter(id=post.id).update(comments=F("comments") + 1)

        if self.request.user != post.user:
            message = f"{self.request.user.username} commented on your post."
            Notification.objects.create(
                recipient=post.user,
                actor=self.request.user,
                notification_type="comment",
                message=message,
                post=post,
            )
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_{post.user.id}",
                    {
                        "type": "new_notification",
                        "message": message,
                        "notification_type": "comment",
                        "actor_id": self.request.user.id,
                        "actor_username": self.request.user.username,
                        "comment_id": comment.id,
                    },
                )