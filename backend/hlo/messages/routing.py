from django.urls import re_path

from .consumers import (
    ChatConsumer,
    NotificationConsumer,
)


websocket_urlpatterns = [

    # =========================
    # CHAT WEBSOCKET
    # =========================

    re_path(
        r"ws/chat/(?P<room_name>[^/]+)/$",
        ChatConsumer.as_asgi(),
    ),

    # =========================
    # USER NOTIFICATION WEBSOCKET
    # =========================

    re_path(
        r"ws/notifications/$",
        NotificationConsumer.as_asgi(),
    ),

]