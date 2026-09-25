from django.db import models
from django.contrib.auth.models import User


# =====================================================
# ACCEPTED FOLLOW
# =====================================================

class Follow(models.Model):

    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following"
    )

    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followers"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "follower",
                    "following"
                ],
                name="unique_follow"
            )
        ]

    def __str__(self):

        return (
            f"{self.follower.username} "
            f"follows "
            f"{self.following.username}"
        )


# =====================================================
# PENDING FOLLOW REQUEST
# =====================================================

class FollowRequest(models.Model):

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_follow_requests"
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_follow_requests"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "sender",
                    "receiver"
                ],
                name="unique_follow_request"
            )
        ]

    def __str__(self):

        return (
            f"{self.sender.username} "
            f"requested to follow "
            f"{self.receiver.username}"
        )