from django.conf import settings
from django.db import models

from posts.models import Post


class Notification(models.Model):

    TYPE_LIKE = "like"
    TYPE_COMMENT = "comment"
    TYPE_FOLLOW = "follow"
    TYPE_FOLLOW_REQUEST = "follow_request"
    TYPE_FOLLOW_REQUEST_ACCEPTED = "follow_request_accepted"
    TYPE_MESSAGE = "message"
    TYPE_STORY = "story"
    TYPE_STORY_VIEW = "story_view"
    TYPE_STORY_REACTION = "story_reaction"
    TYPE_STORY_REPLY = "story_reply"

    NOTIFICATION_TYPES = [
        (TYPE_LIKE, "Like"),
        (TYPE_COMMENT, "Comment"),
        (TYPE_FOLLOW, "Follow"),
        (TYPE_FOLLOW_REQUEST, "Follow Request"),
        (
            TYPE_FOLLOW_REQUEST_ACCEPTED,
            "Follow Request Accepted",
        ),
        (TYPE_MESSAGE, "Message"),
        (TYPE_STORY, "Story"),
        (TYPE_STORY_VIEW, "Story View"),
        (TYPE_STORY_REACTION, "Story Reaction"),
        (TYPE_STORY_REPLY, "Story Reply"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications_received",
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications_sent",
    )

    notification_type = models.CharField(
        max_length=40,
        choices=NOTIFICATION_TYPES,
        default=TYPE_LIKE,
    )

    message = models.TextField()

    post = models.ForeignKey(
        Post,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.actor} -> "
            f"{self.recipient}: "
            f"{self.message}"
        )