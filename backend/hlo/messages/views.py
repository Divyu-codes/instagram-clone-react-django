from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from follows.models import Follow

from .models import Message, Attachment


# ==========================================
# CHECK CHAT PERMISSION
# ==========================================

def users_can_chat(user1_id, user2_id):
    """
    Chat is allowed when either:

    user1 follows user2

    OR

    user2 follows user1
    """

    if not user1_id or not user2_id:
        return False

    if int(user1_id) == int(user2_id):
        return False

    return Follow.objects.filter(
        follower_id=user1_id,
        following_id=user2_id
    ).exists() or Follow.objects.filter(
        follower_id=user2_id,
        following_id=user1_id
    ).exists()


# ==========================================
# GET ROOM MESSAGES
# ==========================================

class RoomMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_name):

        # ------------------------------------------
        # Extract users from room name
        #
        # Example:
        # 8_11
        # ------------------------------------------

        try:
            user_ids = [
                int(value)
                for value in room_name.split("_")
            ]
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid room name."},
                status=400
            )

        # A DM room must contain exactly 2 users.
        if len(user_ids) != 2:
            return Response(
                {"detail": "Invalid room."},
                status=400
            )

        # Current logged-in user MUST be part of room.
        if request.user.id not in user_ids:
            return Response(
                {"detail": "You are not part of this room."},
                status=403
            )

        other_user_id = (
            user_ids[1]
            if user_ids[0] == request.user.id
            else user_ids[0]
        )

        # ------------------------------------------
        # FOLLOW / FOLLOWING CHECK
        #
        # If neither user follows the other,
        # chat is NOT allowed.
        # ------------------------------------------

        if not users_can_chat(
            request.user.id,
            other_user_id
        ):
            return Response(
                {
                    "detail": (
                        "You can chat only with users "
                        "you follow or who follow you."
                    )
                },
                status=403
            )

        # ------------------------------------------
        # NORMAL CHAT MESSAGES
        #
        # Story replies are excluded.
        # ------------------------------------------

        messages = (
            Message.objects
            .filter(
                room_name=room_name
            )
            .exclude(
                message_type="story_reply"
            )
            .select_related(
                "sender"
            )
            .prefetch_related(
                "seen_by",
                "attachments"
            )
            .order_by(
                "timestamp"
            )
        )

        data = []

        for message in messages:

            attachments = []

            for attachment in message.attachments.all():
                attachments.append({
                    "id": attachment.id,
                    "url": attachment.url(),
                    "content_type": attachment.content_type,
                })

            data.append({
                "id": message.id,
                "room_name": message.room_name,
                "sender_id": message.sender_id,
                "sender_username": message.sender.username,
                "content": message.content,
                "message": message.content,
                "message_type": message.message_type,
                "attachment_url": message.attachment_url,
                "timestamp": message.timestamp,
                "seen_by": list(
                    message.seen_by.values_list(
                        "id",
                        flat=True
                    )
                ),
                "attachments": attachments,
            })

        return Response(data)


# ==========================================
# UPLOAD ATTACHMENT
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_attachment(request):
    """
    Upload a chat attachment.
    """

    file = request.FILES.get("file")

    if not file:
        return Response(
            {
                "error": "No file provided"
            },
            status=400
        )

    attachment = Attachment.objects.create(
        file=file,
        content_type=file.content_type or ""
    )

    return Response({
        "id": attachment.id,
        "url": attachment.url(),
        "content_type": attachment.content_type,
    })


# ==========================================
# MARK ROOM MESSAGES AS READ
# ==========================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_room_messages_read(
    request,
    room_name
):
    """
    Mark normal DM messages from the other
    participant as read.

    Story replies are intentionally excluded.

    Also blocks marking messages as read when
    there is no follow relationship.
    """

    # ------------------------------------------
    # Extract room users
    # ------------------------------------------

    try:
        user_ids = [
            int(value)
            for value in room_name.split("_")
        ]
    except (ValueError, TypeError):
        return Response(
            {"detail": "Invalid room name."},
            status=400
        )

    if len(user_ids) != 2:
        return Response(
            {"detail": "Invalid room."},
            status=400
        )

    if request.user.id not in user_ids:
        return Response(
            {"detail": "You are not part of this room."},
            status=403
        )

    other_user_id = (
        user_ids[1]
        if user_ids[0] == request.user.id
        else user_ids[0]
    )

    # ------------------------------------------
    # FOLLOW CHECK
    # ------------------------------------------

    if not users_can_chat(
        request.user.id,
        other_user_id
    ):
        return Response(
            {
                "detail": (
                    "You can chat only with users "
                    "you follow or who follow you."
                )
            },
            status=403
        )

    # ------------------------------------------
    # MARK NORMAL MESSAGES AS READ
    # ------------------------------------------

    messages = (
        Message.objects
        .filter(
            room_name=room_name
        )
        .exclude(
            sender=request.user
        )
        .exclude(
            message_type="story_reply"
        )
    )

    marked = 0

    for message in messages:

        if not message.seen_by.filter(
            id=request.user.id
        ).exists():

            message.seen_by.add(
                request.user
            )

            marked += 1

    return Response({
        "success": True,
        "room_name": room_name,
        "marked_read": marked,
    })