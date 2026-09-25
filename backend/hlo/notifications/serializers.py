from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):

    actor_username = serializers.CharField(
        source="actor.username",
        read_only=True
    )

    actor_id = serializers.IntegerField(
        source="actor.id",
        read_only=True
    )

    class Meta:
        model = Notification

        fields = [
            "id",
            "actor_id",
            "actor_username",
            "notification_type",
            "message",
            "post",
            "is_read",
            "created_at",
        ]

        read_only_fields = fields