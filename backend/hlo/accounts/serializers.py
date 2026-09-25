from rest_framework import serializers

from .models import Profile
from posts.models import Post
from follows.models import Follow, FollowRequest


class ProfileSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    first_name = serializers.CharField(
        source="user.first_name",
        read_only=True
    )

    last_name = serializers.CharField(
        source="user.last_name",
        read_only=True
    )

    user_id = serializers.IntegerField(
        source="user.id",
        read_only=True
    )

    profile_image = serializers.ImageField(
        required=False,
        allow_null=True
    )

    is_following = serializers.SerializerMethodField()

    follow_request_pending = serializers.SerializerMethodField()

    incoming_follow_request_pending = serializers.SerializerMethodField()

    can_view_posts = serializers.SerializerMethodField()

    followers_count = serializers.SerializerMethodField()

    following_count = serializers.SerializerMethodField()

    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = Profile

        fields = [
            "id",
            "user_id",
            "username",
            "first_name",
            "last_name",
            "profile_image",
            "bio",

            "is_private",

            "followers_count",
            "following_count",
            "posts_count",

            "is_following",
            "follow_request_pending",
            "incoming_follow_request_pending",
            "can_view_posts",
        ]

        read_only_fields = [
            "id",
            "user_id",
            "username",
            "first_name",
            "last_name",

            "followers_count",
            "following_count",
            "posts_count",

            "is_following",
            "follow_request_pending",
            "incoming_follow_request_pending",
            "can_view_posts",
        ]

    def get_posts_count(self, obj):

        return Post.objects.filter(
            user=obj.user
        ).count()

    def get_followers_count(self, obj):

        return Follow.objects.filter(
            following=obj.user
        ).count()

    def get_following_count(self, obj):

        return Follow.objects.filter(
            follower=obj.user
        ).count()

    def get_is_following(self, obj):

        request = self.context.get("request")

        if not request:
            return False

        if not request.user.is_authenticated:
            return False

        if request.user == obj.user:
            return False

        return Follow.objects.filter(
            follower=request.user,
            following=obj.user
        ).exists()

    def get_follow_request_pending(self, obj):

        request = self.context.get("request")

        if not request:
            return False

        if not request.user.is_authenticated:
            return False

        if request.user == obj.user:
            return False

        return FollowRequest.objects.filter(
            sender=request.user,
            receiver=obj.user
        ).exists()

    def get_incoming_follow_request_pending(self, obj):

        request = self.context.get("request")

        if not request:
            return False

        if not request.user.is_authenticated:
            return False

        if request.user == obj.user:
            return False

        return FollowRequest.objects.filter(
            sender=obj.user,
            receiver=request.user
        ).exists()

    def get_can_view_posts(self, obj):

        request = self.context.get("request")

        if not request:
            return False

        if not request.user.is_authenticated:
            return False

        # Own profile
        if request.user == obj.user:
            return True

        # Public profile
        if not obj.is_private:
            return True

        # Private profile
        # Only accepted followers can view posts.
        return Follow.objects.filter(
            follower=request.user,
            following=obj.user
        ).exists()

    def to_representation(self, instance):

        data = super().to_representation(instance)

        if instance.profile_image:

            request = self.context.get("request")

            if request:

                data["profile_image"] = (
                    request.build_absolute_uri(
                        instance.profile_image.url
                    )
                )

            else:

                data["profile_image"] = (
                    instance.profile_image.url
                )

        else:

            data["profile_image"] = None

        return data