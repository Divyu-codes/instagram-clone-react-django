from django.utils import timezone
from django.db.models import Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from follows.models import Follow
from notifications.models import Notification
from messages.models import Message
from .models import Story, StoryView, StoryReaction


# ==========================================
# DELETE EXPIRED STORIES
# ==========================================

def delete_expired_stories():
    Story.objects.filter(
        expires_at__lte=timezone.now()
    ).delete()


# ==========================================
# STORY DATA
# ==========================================

def story_data(story, request_user=None, request=None):
    my_view = False

    if request_user and story.user_id != request_user.id:
        my_view = StoryView.objects.filter(
            story=story,
            user=request_user
        ).exists()

    profile_image = None

    try:
        profile = story.user.profile

        if profile.profile_image:
            if request:
                profile_image = request.build_absolute_uri(
                    profile.profile_image.url
                )
            else:
                profile_image = profile.profile_image.url
    except Exception:
        profile_image = None

    view_count = StoryView.objects.filter(
        story=story
    ).exclude(
        user=story.user
    ).count()

    return {
        "id": story.id,
        "user_id": story.user_id,
        "username": story.user.username,
        "profile_image": profile_image,
        "image": (
            request.build_absolute_uri(story.image.url)
            if request and story.image
            else (story.image.url if story.image else None)
        ),
        "video": (
            request.build_absolute_uri(story.video.url)
            if request and story.video
            else (story.video.url if story.video else None)
        ),
        "text": story.text,
        "created_at": story.created_at,
        "expires_at": story.expires_at,
        "viewed": my_view,
        "view_count": view_count,
    }


# ==========================================
# CREATE STORY
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_story(request):
    image = request.FILES.get("image")
    video = request.FILES.get("video")
    text = request.data.get("text", "").strip()

    if not image and not video and not text:
        return Response(
            {"error": "Story must contain image, video or text."},
            status=400
        )

    if image and video:
        return Response(
            {"error": "Upload either image or video, not both."},
            status=400
        )

    story = Story.objects.create(
        user=request.user,
        image=image,
        video=video,
        text=text
    )

    notification_message = (
        f"{request.user.username} shared a story."
    )

    Notification.objects.create(
        recipient=request.user,
        actor=request.user,
        notification_type="story",
        message=notification_message,
    )

    channel_layer = get_channel_layer()

    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{request.user.id}",
            {
                "type": "new_notification",
                "message": notification_message,
                "notification_type": "story",
                "actor_id": request.user.id,
                "actor_username": request.user.username,
            },
        )

    return Response(
        story_data(story, request.user, request),
        status=201
    )


# ==========================================
# GET STORIES
# ==========================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_stories(request):
    """
    Return only:

    1. Current user's own stories
    2. Stories of users followed by current user

    Users who are NOT followed are excluded.
    """

    delete_expired_stories()

    current_user = request.user

    # ------------------------------------------
    # Get users followed by current user
    # ------------------------------------------

    following_ids = current_user.following.values_list(
        "following_id",
        flat=True
    )

    # ------------------------------------------
    # Get stories:
    #
    # - Own stories
    # - Followed users' stories
    #
    # NOT:
    # - Unfollowed users' stories
    # ------------------------------------------

    stories = (
        Story.objects
        .filter(
            Q(user=current_user) |
            Q(user_id__in=following_ids),
            expires_at__gt=timezone.now()
        )
        .select_related("user")
        .order_by("-created_at")
    )

    return Response([
        story_data(
            story,
            current_user,
            request
        )
        for story in stories
    ])


# ==========================================
# VIEW STORY
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def view_story(request, story_id):
    delete_expired_stories()

    try:
        story = Story.objects.select_related("user").get(
            id=story_id,
            expires_at__gt=timezone.now()
        )
    except Story.DoesNotExist:
        return Response(
            {"error": "Story not found or expired."},
            status=404
        )

    # Never create a StoryView when the owner opens their own story.
    if story.user_id == request.user.id:
        view_count = StoryView.objects.filter(
            story=story
        ).exclude(
            user=story.user
        ).count()

        return Response({
            "success": True,
            "story_id": story.id,
            "owner": True,
            "already_viewed": False,
            "viewed": False,
            "view_count": view_count,
        })

    view, created = StoryView.objects.get_or_create(
        story=story,
        user=request.user
    )

    view_count = StoryView.objects.filter(
        story=story
    ).exclude(
        user=story.user
    ).count()

    # Notify story owner only on the first view.
    if created:
        notification_message = (
            f"{request.user.username} viewed your story."
        )

        Notification.objects.create(
            recipient=story.user,
            actor=request.user,
            notification_type="story",
            message=notification_message,
        )

        channel_layer = get_channel_layer()

        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"user_{story.user.id}",
                {
                    "type": "new_notification",
                    "message": notification_message,
                    "notification_type": "story_view",
                    "actor_id": request.user.id,
                    "actor_username": request.user.username,
                },
            )

    return Response({
        "success": True,
        "story_id": story.id,
        "owner": False,
        "already_viewed": not created,
        "viewed": True,
        "view_count": view_count,
    })


# ==========================================
# STORY VIEWERS
# ==========================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def story_viewers(request, story_id):
    try:
        story = Story.objects.select_related("user").get(
            id=story_id
        )
    except Story.DoesNotExist:
        return Response(
            {"error": "Story not found."},
            status=404
        )

    # Only the story owner can see viewers,
    # reactions and replies.
    if story.user_id != request.user.id:
        return Response(
            {"error": "Only the story owner can see viewers."},
            status=403
        )

    viewers = (
        StoryView.objects
        .filter(story=story)
        .exclude(user=story.user)
        .select_related("user")
        .order_by("-viewed_at")
    )

    # ------------------------------------------------------
    # Get story replies for each viewer.
    #
    # Story replies are stored as message_type="story_reply",
    # so they can be shown here without appearing in normal
    # DM chat.
    # ------------------------------------------------------

    replies_by_user = {}

    for viewer in viewers:
        room_ids = sorted([
            int(story.user.id),
            int(viewer.user.id),
        ])

        room_name = f"{room_ids[0]}_{room_ids[1]}"

        messages = (
            Message.objects
            .filter(
                room_name=room_name,
                sender_id=viewer.user.id,
                message_type="story_reply",
                timestamp__gte=story.created_at,
            )
            .order_by("timestamp")
        )

        replies_by_user[viewer.user.id] = [
            {
                "id": message.id,
                "text": message.content,
                "timestamp": message.timestamp,
            }
            for message in messages
            if message.content
        ]

    data = []

    for viewer in viewers:
        profile_image = None

        try:
            profile = viewer.user.profile

            if profile.profile_image:
                profile_image = request.build_absolute_uri(
                    profile.profile_image.url
                )
        except Exception:
            profile_image = None

        # A user can have only one current reaction because
        # react_to_story uses update_or_create().
        reaction = (
            StoryReaction.objects
            .filter(
                story=story,
                user=viewer.user,
            )
            .first()
        )

        reaction_data = None

        if reaction:
            reaction_data = {
                "emoji": reaction.emoji,
                "created_at": getattr(
                    reaction,
                    "created_at",
                    None
                ),
            }

        data.append({
            "user_id": viewer.user.id,
            "username": viewer.user.username,
            "first_name": viewer.user.first_name,
            "last_name": viewer.user.last_name,
            "profile_image": profile_image,
            "viewed_at": viewer.viewed_at,
            "reaction": reaction_data,
            "replies": replies_by_user.get(
                viewer.user.id,
                []
            ),
        })

    return Response({
        "story_id": story.id,
        "count": len(data),
        "viewers": data,
    })


# ==========================================
# STORY REACTION
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def react_to_story(request, story_id):
    delete_expired_stories()

    try:
        story = Story.objects.select_related("user").get(
            id=story_id,
            expires_at__gt=timezone.now()
        )
    except Story.DoesNotExist:
        return Response(
            {"error": "Story not found or expired."},
            status=404
        )

    if story.user_id == request.user.id:
        return Response(
            {"error": "You cannot react to your own story."},
            status=400
        )

    emoji = (request.data.get("emoji") or "").strip()

    allowed = {
        "❤️",
        "😂",
        "😮",
        "😢",
        "🔥",
    }

    if emoji not in allowed:
        return Response(
            {"error": "Invalid reaction."},
            status=400
        )

    reaction, created = StoryReaction.objects.update_or_create(
        story=story,
        user=request.user,
        defaults={
            "emoji": emoji
        }
    )

    notification_message = (
        f"{request.user.username} reacted {emoji} to your story."
    )

    Notification.objects.create(
        recipient=story.user,
        actor=request.user,
        notification_type="story",
        message=notification_message,
    )

    channel_layer = get_channel_layer()

    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{story.user.id}",
            {
                "type": "new_notification",
                "message": notification_message,
                "notification_type": "story_reaction",
                "actor_id": request.user.id,
                "actor_username": request.user.username,
            },
        )

    return Response({
        "success": True,
        "emoji": reaction.emoji,
        "created": created,
    })


# ==========================================
# STORY REPLY
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reply_to_story(request, story_id):
    delete_expired_stories()

    try:
        story = Story.objects.select_related("user").get(
            id=story_id,
            expires_at__gt=timezone.now()
        )
    except Story.DoesNotExist:
        return Response(
            {"error": "Story not found or expired."},
            status=404
        )

    if story.user_id == request.user.id:
        return Response(
            {"error": "You cannot reply to your own story."},
            status=400
        )

    text = (
        request.data.get("text")
        or request.data.get("message")
        or ""
    ).strip()

    if not text:
        return Response(
            {"error": "Reply cannot be empty."},
            status=400
        )

    if len(text) > 1000:
        return Response(
            {"error": "Reply is too long."},
            status=400
        )

    ids = sorted([
        int(request.user.id),
        int(story.user.id),
    ])

    room_name = f"{ids[0]}_{ids[1]}"

    # IMPORTANT:
    # Story reply is stored separately from normal chat.
    message = Message.objects.create(
        room_name=room_name,
        sender=request.user,
        content=text,
        message_type="story_reply",
    )

    message_data = {
        "id": message.id,
        "message": message.content,
        "content": message.content,
        "sender_id": message.sender_id,
        "sender_username": request.user.username,
        "message_type": message.message_type,
        "attachment_url": None,
        "timestamp": message.timestamp.isoformat(),
        "reactions": [],
        "seen_by": [],
    }

    # IMPORTANT:
    # Do NOT broadcast story reply to normal chat WebSocket.
    # Otherwise it will appear as a normal DM.

    notification_message = (
        f"{request.user.username} replied to your story."
    )

    Notification.objects.create(
        recipient=story.user,
        actor=request.user,
        notification_type="story_reply",
        message=notification_message,
    )

    return Response({
        "success": True,
        "room_name": room_name,
        "message": message_data,
    }, status=201)