from rest_framework import serializers
from .models import Notification
from follows.models import Follow # Follow model ko import karein

class NotificationSerializer(serializers.ModelSerializer):

    actor_username = serializers.CharField(
        source="actor.username", read_only=True
    )

    actor_id = serializers.IntegerField(
        source="actor.id", read_only=True
    )


    is_following_actor = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "actor_id",
            "actor_username",
            "is_following_actor", 
            "notification_type",
            "message",
            "post",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields

    def get_is_following_actor(self, obj):
        request = self.context.get('request')
    
        if request and request.user.is_authenticated and obj.actor:
            return Follow.objects.filter(
                follower=request.user, 
                following=obj.actor
            ).exists()
            
        return False