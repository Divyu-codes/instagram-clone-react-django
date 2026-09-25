import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .models import (
    Message,
    Attachment,
    MessageReaction,
)
from follows.models import Follow


class ChatConsumer(AsyncWebsocketConsumer):

    # =====================================================
    # CONNECT
    # =====================================================

    async def connect(self):

        self.room_name = (
            self.scope["url_route"]["kwargs"]["room_name"]
        )

        self.room_group_name = (
            f"chat_{self.room_name}"
        )

        self.user = self.scope["user"]

        print(
            "CONNECT:",
            self.room_name,
            self.user,
            self.user.is_authenticated
        )

        if not self.user.is_authenticated:

            print(
                "USER NOT AUTHENTICATED"
            )

            await self.close()
            return

        # Chat is allowed only when either user follows the other.
        can_chat = await self.can_chat(
            self.room_name,
            self.user.id
        )

        if not can_chat:
            print(
                "CHAT BLOCKED - NO FOLLOW RELATION:",
                self.room_name,
                "User:",
                self.user.username
            )
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        print(
            "WebSocket connected:",
            self.room_name,
            "User:",
            self.user.username
        )


    # =====================================================
    # DISCONNECT
    # =====================================================

    async def disconnect(
        self,
        close_code
    ):

        if hasattr(
            self,
            "room_group_name"
        ):

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        print(
            "DISCONNECT:",
            getattr(
                self,
                "room_name",
                ""
            ),
            "User:",
            getattr(
                self.user,
                "username",
                ""
            )
        )


    # =====================================================
    # RECEIVE
    # =====================================================

    async def receive(
        self,
        text_data
    ):

        try:

            data = json.loads(
                text_data
            )

        except json.JSONDecodeError:

            return


        action = data.get(
            "action",
            "message"
        )

        # Re-check on every incoming action so an unfollow immediately
        # blocks further chat activity even if an old socket is still open.
        can_chat = await self.can_chat(
            self.room_name,
            self.user.id
        )

        if not can_chat:
            print(
                "CHAT ACTION BLOCKED - NO FOLLOW RELATION:",
                self.room_name,
                "User:",
                self.user.username
            )
            await self.close()
            return


        # =================================================
        # TYPING
        # =================================================

        if action == "typing":

            await self.channel_layer.group_send(

                self.room_group_name,

                {
                    "type": "typing_message",

                    "user_id":
                        self.user.id,

                    "typing":
                        bool(
                            data.get(
                                "typing",
                                False
                            )
                        ),
                }
            )

            return


        # =================================================
        # REACTION
        # =================================================

        if action == "reaction":

            message_id = data.get(
                "message_id"
            )

            emoji = data.get(
                "emoji"
            )

            if not message_id or not emoji:

                return


            reaction_data = await self.save_reaction(
                    message_id,
                    self.user.id,
                    emoji
                )


            if not reaction_data:

                return


            await self.channel_layer.group_send(

                self.room_group_name,

                {
                    "type":
                        "reaction_message",

                    "message_id":
                        reaction_data[
                            "message_id"
                        ],

                    "user_id":
                        reaction_data[
                            "user_id"
                        ],

                    "username":
                        reaction_data[
                            "username"
                        ],

                    "emoji":
                        reaction_data[
                            "emoji"
                        ],
                }
            )

            return


        # =================================================
        # REMOVE REACTION
        # =================================================

        if action == "remove_reaction":

            message_id = data.get(
                "message_id"
            )

            if not message_id:

                return


            removed = await self.remove_reaction(
                    message_id,
                    self.user.id
                )


            if not removed:

                return


            await self.channel_layer.group_send(

                self.room_group_name,

                {
                    "type":
                        "reaction_removed",

                    "message_id":
                        int(
                            message_id
                        ),

                    "user_id":
                        self.user.id,
                }
            )

            return


        # =================================================
        # SEEN
        # =================================================

        if action == "seen":

            message_id = data.get(
                "message_id"
            )

            if message_id:

                await self.mark_message_seen(
                    message_id,
                    self.user.id
                )


            await self.channel_layer.group_send(

                self.room_group_name,

                {
                    "type":
                        "seen_message",

                    "message_id":
                        message_id,

                    "user_id":
                        self.user.id,
                }
            )

            return


        # =================================================
        # NORMAL MESSAGE
        # =================================================

        message_text = (
            data.get(
                "message",
                ""
            )
            or ""
        ).strip()


        message_type = data.get(
            "message_type",
            "text"
        )


        attachment_id = data.get(
            "attachment_id"
        )


        attachment_url = data.get(
            "attachment_url"
        )


        # Message can be empty when
        # sending media/document/voice.

        if (
            not message_text
            and not attachment_id
            and not attachment_url
        ):

            return


        message = await self.save_message(

            self.room_name,

            self.user.id,

            message_text,

            message_type,

            attachment_id,

            attachment_url
        )


        if not message:

            return


        # =================================================
        # SEND MESSAGE TO CHAT ROOM
        # =================================================

        await self.channel_layer.group_send(

            self.room_group_name,

            {
                "type":
                    "chat_message",

                "id":
                    message["id"],

                "message":
                    message["message"],

                "content":
                    message["content"],

                "sender_id":
                    message["sender_id"],

                "sender_username":
                    message[
                        "sender_username"
                    ],

                "message_type":
                    message[
                        "message_type"
                    ],

                "attachment_url":
                    message[
                        "attachment_url"
                    ],

                "timestamp":
                    message[
                        "timestamp"
                    ],

                "reactions":
                    message[
                        "reactions"
                    ],
            }
        )


        # =================================================
        # NOTIFY OTHER USER
        # =================================================

        other_user_id = (
            await self.get_other_user_id(
                self.room_name,
                self.user.id
            )
        )


        if other_user_id:

            await self.channel_layer.group_send(

                f"user_{other_user_id}",

                {
                    "type":
                        "new_message_notification",

                    "sender_id":
                        self.user.id,

                    "message":
                        message_text
                        or (
                            f"Sent a "
                            f"{message_type}"
                        ),

                    "id":
                        message["id"],

                    "room_name":
                        self.room_name,
                }
            )


    # =====================================================
    # CHAT MESSAGE EVENT
    # =====================================================

    async def chat_message(
        self,
        event
    ):

        # If the message belongs to the other participant and this
        # chat WebSocket is open, persist the message as read.
        if int(event.get("sender_id", 0)) != int(self.user.id):
            message_id = event.get("id")
            if message_id:
                await self.mark_message_seen(
                    message_id,
                    self.user.id
                )

        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "message",

                    "id":
                        event["id"],

                    "message":
                        event["message"],

                    "content":
                        event["content"],

                    "sender_id":
                        event["sender_id"],

                    "sender_username":
                        event[
                            "sender_username"
                        ],

                    "message_type":
                        event[
                            "message_type"
                        ],

                    "attachment_url":
                        event[
                            "attachment_url"
                        ],

                    "timestamp":
                        event[
                            "timestamp"
                        ],

                    "reactions":
                        event[
                            "reactions"
                        ],
                }
            )
        )


    # =====================================================
    # TYPING EVENT
    # =====================================================

    async def typing_message(
        self,
        event
    ):

        # Don't send typing event back
        # to the person who is typing.

        if (
            event["user_id"]
            == self.user.id
        ):

            return


        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "typing",

                    "user_id":
                        event["user_id"],

                    "typing":
                        event["typing"],
                }
            )
        )


    # =====================================================
    # REACTION EVENT
    # =====================================================

    async def reaction_message(
        self,
        event
    ):

        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "reaction",

                    "message_id":
                        event[
                            "message_id"
                        ],

                    "user_id":
                        event[
                            "user_id"
                        ],

                    "username":
                        event[
                            "username"
                        ],

                    "emoji":
                        event[
                            "emoji"
                        ],
                }
            )
        )


    # =====================================================
    # REACTION REMOVED
    # =====================================================

    async def reaction_removed(
        self,
        event
    ):

        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "reaction_removed",

                    "message_id":
                        event[
                            "message_id"
                        ],

                    "user_id":
                        event[
                            "user_id"
                        ],
                }
            )
        )


    # =====================================================
    # SEEN EVENT
    # =====================================================

    async def seen_message(
        self,
        event
    ):

        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "seen",

                    "message_id":
                        event[
                            "message_id"
                        ],

                    "user_id":
                        event[
                            "user_id"
                        ],
                }
            )
        )


    # =====================================================
    # SAVE MESSAGE
    # =====================================================

    @database_sync_to_async
    def save_message(
        self,
        room_name,
        sender_id,
        content,
        message_type,
        attachment_id=None,
        attachment_url=None
    ):

        try:

            message = Message.objects.create(

                room_name=room_name,

                sender_id=sender_id,

                content=content,

                message_type=message_type,

                attachment_url=(
                    attachment_url
                    or None
                )
            )


            # Attach uploaded file
            if attachment_id:

                try:

                    attachment = Attachment.objects.get(
                            id=attachment_id
                        )


                    attachment.message = message

                    attachment.save(
                        update_fields=[
                            "message"
                        ]
                    )


                    # If URL wasn't supplied,
                    # get it from Attachment.

                    if not message.attachment_url:

                        message.attachment_url = attachment.url()

                        message.save(
                            update_fields=[
                                "attachment_url"
                            ]
                        )

                except Attachment.DoesNotExist:

                    pass


            return {

                "id":
                    message.id,

                "message":
                    message.content,

                "content":
                    message.content,

                "sender_id":
                    message.sender_id,

                "sender_username":
                    message.sender.username,

                "message_type":
                    message.message_type,

                "attachment_url":
                    message.attachment_url,

                "timestamp":
                    message.timestamp.isoformat(),

                "reactions": [],
            }


        except Exception as error:

            print(
                "SAVE MESSAGE ERROR:",
                error
            )

            return None


    # =====================================================
    # SAVE REACTION
    # =====================================================

    @database_sync_to_async
    def save_reaction(
        self,
        message_id,
        user_id,
        emoji
    ):

        try:

            message =  Message.objects.get(
                    id=message_id
                )


            reaction, created =    MessageReaction.objects.update_or_create(

                    message=message,

                    user_id=user_id,

                    defaults={
                        "emoji": emoji
                    }
                )


            return {

                "message_id":
                    message.id,

                "user_id":
                    user_id,

                "username":
                    reaction.user.username,

                "emoji":
                    reaction.emoji,
            }


        except Message.DoesNotExist:

            return None


    # =====================================================
    # REMOVE REACTION
    # =====================================================

    @database_sync_to_async
    def remove_reaction(
        self,
        message_id,
        user_id
    ):

        deleted, _ =  MessageReaction.objects.filter(

                message_id=message_id,

                user_id=user_id

            ).delete()


        return deleted > 0


    # =====================================================
    # MARK SEEN
    # =====================================================

    @database_sync_to_async
    def mark_message_seen(
        self,
        message_id,
        user_id
    ):

        try:

            message = Message.objects.get(
                    id=message_id
                )

            message.seen_by.add(
                user_id
            )

        except Message.DoesNotExist:

            pass


    # =====================================================
    # CHECK CHAT ACCESS
    # =====================================================

    @database_sync_to_async
    def can_chat(
        self,
        room_name,
        current_user_id
    ):
        try:
            user_ids = [
                int(value)
                for value in room_name.split("_")
            ]

            if len(user_ids) != 2:
                return False

            if user_ids[0] == user_ids[1]:
                return False

            current_user_id = int(current_user_id)

            if current_user_id not in user_ids:
                return False

            other_user_id = (
                user_ids[1]
                if user_ids[0] == current_user_id
                else user_ids[0]
            )

            return Follow.objects.filter(
                follower_id=current_user_id,
                following_id=other_user_id
            ).exists() or Follow.objects.filter(
                follower_id=other_user_id,
                following_id=current_user_id
            ).exists()

        except (
            ValueError,
            TypeError
        ):
            return False


    # =====================================================
    # GET OTHER USER
    # =====================================================

    @database_sync_to_async
    def get_other_user_id(
        self,
        room_name,
        current_user_id
    ):

        try:

            user_ids = [
                int(value)
                for value
                in room_name.split("_")
            ]


            for user_id in user_ids:

                if (
                    user_id
                    != int(
                        current_user_id
                    )
                ):

                    return user_id


        except (
            ValueError,
            TypeError
        ):

            return None


        return None


# =========================================================
# NOTIFICATION CONSUMER
# =========================================================

class NotificationConsumer(
    AsyncWebsocketConsumer
):

    async def connect(self):

        self.user =self.scope["user"]


        print(
            "NOTIFICATION CONNECT:",
            self.user,
            self.user.is_authenticated
        )


        if not self.user.is_authenticated:

            print(
                "NOTIFICATION USER "
                "NOT AUTHENTICATED"
            )

            await self.close()

            return


        self.user_group_name = f"user_{self.user.id}"


        await self.channel_layer.group_add(

            self.user_group_name,

            self.channel_name
        )


        await self.accept()


        print(
            "Notification WebSocket connected:",
            self.user.username
        )


    async def disconnect(
        self,
        close_code
    ):

        if hasattr(
            self,
            "user_group_name"
        ):

            await self.channel_layer.group_discard(

                self.user_group_name,

                self.channel_name
            )


        print(
            "Notification WebSocket disconnected"
        )


    async def new_message_notification(
        self,
        event
    ):

        await self.send(

            text_data=json.dumps(

                {
                    "type":
                        "new_message",

                    "sender_id":
                        event[
                            "sender_id"
                        ],

                    "message":
                        event[
                            "message"
                        ],

                    "id":
                        event["id"],

                    "room_name":
                        event[
                            "room_name"
                        ],
                }
            )
        )

    async def new_notification(
        self,
        event
    ):
        await self.send(
            text_data=json.dumps(
                {
                    "type": "notification",
                    "message": event.get("message"),
                    "notification_type": event.get("notification_type"),
                    "actor_id": event.get("actor_id"),
                    "actor_username": event.get("actor_username"),
                }
            )
        )