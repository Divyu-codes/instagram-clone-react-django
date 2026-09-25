from django.db import models
from django.conf import settings


class Message(models.Model):

    MESSAGE_TYPES = (
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("voice", "Voice"),
        ("document", "Document"),
    )

    room_name = models.CharField(
        max_length=255
    )

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    content = models.TextField(
        blank=True
    )

    message_type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default="text"
    )

    attachment_url = models.URLField(
        blank=True,
        null=True
    )

    timestamp = models.DateTimeField(
        auto_now_add=True
    )

    seen_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="seen_messages",
        blank=True
    )

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return (
            f"{self.room_name} | "
            f"{getattr(self.sender, 'id', '?')}: "
            f"{self.content[:20]} "
            f"[{self.message_type}]"
        )


class MessageReaction(models.Model):

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="reactions"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    emoji = models.CharField(
        max_length=10
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["message", "user"],
                name="unique_message_user_reaction"
            )
        ]

    def __str__(self):
        return (
            f"{self.user.username} "
            f"{self.emoji} "
            f"on message {self.message.id}"
        )


class Conversation(models.Model):

    name = models.CharField(
        max_length=255,
        blank=True
    )

    is_group = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return (
            self.name
            or f"conversation:{self.id}"
        )


class Participant(models.Model):

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participants"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    joined_at = models.DateTimeField(
        auto_now_add=True
    )

    is_admin = models.BooleanField(
        default=False
    )

    class Meta:
        unique_together = (
            "conversation",
            "user"
        )

    def __str__(self):
        return (
            f"{self.user.username} "
            f"in {self.conversation}"
        )


class Attachment(models.Model):

    file = models.FileField(
        upload_to="chat_uploads/%Y/%m/%d/"
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True
    )

    content_type = models.CharField(
        max_length=100,
        blank=True
    )

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="attachments",
        null=True,
        blank=True
    )

    def url(self):
        try:
            return self.file.url
        except Exception:
            return None

    def __str__(self):
        return (
            f"Attachment {self.id} "
            f"for message "
            f"{getattr(self.message, 'id', None)}"
        )