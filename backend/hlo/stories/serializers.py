from rest_framework import serializers
from .models import Story


class StorySerializer(serializers.ModelSerializer):

    media_type = serializers.SerializerMethodField()

    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    user_profile_image = serializers.CharField(
        source="user.profile.profile_image",
        read_only=True,
        allow_null=True
    )

    class Meta:

        model = Story

        fields = [
            "id",
            "user",
            "username",
            "user_profile_image",
            "image",
            "video",
            "media_type",
            "caption",
            "created_at",
            "expires_at",
        ]

        read_only_fields = [
            "user",
            "created_at",
            "expires_at",
        ]

    def get_media_type(self, story):
        return "video" if story.video else "image"
