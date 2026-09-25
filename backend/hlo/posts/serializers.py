from rest_framework import serializers

from .models import Post
from likes.models import Like
from comments.models import Comment


class PostSerializer(serializers.ModelSerializer):

    # ==========================================
    # USER ID
    # ==========================================

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True
    )

    # ==========================================
    # USERNAME
    # ==========================================

    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    # ==========================================
    # PROFILE IMAGE
    # ==========================================

    profile_image = serializers.SerializerMethodField()

    # ==========================================
    # POST IMAGE
    # ==========================================

    image = serializers.ImageField(
        required=True
    )

    # ==========================================
    # REAL LIKE COUNT
    # ==========================================

    likes = serializers.SerializerMethodField()

    # ==========================================
    # REAL COMMENT COUNT
    # ==========================================

    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post

        fields = [
            "id",
            "user",
            "user_id",
            "username",
            "profile_image",
            "image",
            "caption",
            "location",
            "likes",
            "comments",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "user",
            "user_id",
            "username",
            "profile_image",
            "likes",
            "comments",
            "created_at",
        ]

    # ==========================================
    # PROFILE IMAGE
    # ==========================================

    def get_profile_image(self, obj):

        try:
            profile = obj.user.profile

            if not profile.profile_image:
                return None

            request = self.context.get("request")

            if request:
                return request.build_absolute_uri(
                    profile.profile_image.url
                )

            return profile.profile_image.url

        except Exception:
            return None

    # ==========================================
    # LIKE COUNT
    # ==========================================

    def get_likes(self, obj):

        return Like.objects.filter(
            post=obj
        ).count()

    # ==========================================
    # COMMENT COUNT
    # ==========================================

    def get_comments(self, obj):

        return Comment.objects.filter(
            post=obj
        ).count()