from django.db import models
from django.contrib.auth.models import User
import uuid


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    profile_image = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True
    )

    bio = models.TextField(blank=True)

    is_private = models.BooleanField(default=False)

    phone_number = models.CharField(
        max_length=32,
        blank=True,
        null=True,
        unique=True
    )

    google_account = models.BooleanField(default=False)

    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    posts_count = models.IntegerField(default=0)

    email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(
        null=True,
        blank=True,
        unique=True
    )

    two_factor_secret = models.CharField(
        max_length=64,
        blank=True
    )

    two_factor_enabled = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username
