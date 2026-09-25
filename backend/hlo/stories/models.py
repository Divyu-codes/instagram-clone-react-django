from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class Story(models.Model):

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="stories"
    )

    image = models.ImageField(
        upload_to="stories/images/",
        blank=True,
        null=True
    )

    video = models.FileField(
        upload_to="stories/videos/",
        blank=True,
        null=True
    )

    text = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    expires_at = models.DateTimeField(
        null=True,
        blank=True
    )

    def save(self, *args, **kwargs):

        if not self.expires_at:
            self.expires_at = (
                timezone.now() +
                timedelta(hours=24)
            )

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    def __str__(self):
        return f"{self.user.username} - Story"


class StoryView(models.Model):

    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name="views"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="story_views"
    )

    viewed_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["story", "user"],
                name="unique_story_view"
            )
        ]

    def __str__(self):
        return (
            f"{self.user.username} "
            f"viewed Story {self.story.id}"
        )


# =========================================================
# STORY REACTION
# =========================================================

class StoryReaction(models.Model):

    REACTION_CHOICES = (
        ("❤️", "Heart"),
        ("😂", "Laugh"),
        ("😮", "Wow"),
        ("😢", "Sad"),
        ("🔥", "Fire"),
    )

    story = models.ForeignKey(
        Story,
        on_delete=models.CASCADE,
        related_name="reactions"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="story_reactions"
    )

    emoji = models.CharField(
        max_length=10,
        choices=REACTION_CHOICES
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["story", "user"],
                name="unique_story_user_reaction"
            )
        ]

    def __str__(self):
        return (
            f"{self.user.username} "
            f"{self.emoji} "
            f"on Story {self.story.id}"
        )