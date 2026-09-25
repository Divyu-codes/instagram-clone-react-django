from django.urls import path
from .views import (
    RoomMessagesView,
    upload_attachment,
    mark_room_messages_read,
)

urlpatterns = [
     path(
        "room/<str:room_name>/",
        RoomMessagesView.as_view(),
        name="room-messages"
    ),
    path(
        "upload/",
        upload_attachment,
        name="upload-attachment",
    ),
    path(
        "room/<str:room_name>/mark-read/",
        mark_room_messages_read,
        name="mark-room-messages-read",
    ),
]