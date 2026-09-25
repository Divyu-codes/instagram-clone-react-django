from django.contrib import admin
from django.urls import path, include

from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import TokenRefreshView

from accounts.security import SecureTokenObtainPairView


urlpatterns = [

    path(
        "admin/",
        admin.site.urls
    ),

    # Accounts
    path(
        "api/users/",
        include("accounts.urls")
    ),

    # Posts
    path(
        "api/posts/",
        include("posts.urls")
    ),

    # Messages
    path(
        "api/messages/",
        include("messages.urls")
    ),

    # Stories
    path(
        "api/stories/",
        include("stories.urls")
    ),

    # Follows
    path(
        "api/follows/",
        include("follows.urls")
    ),

    # Likes
    path(
        "api/likes/",
        include("likes.urls")
    ),

    # Comments
    path(
        "api/comments/",
        include("comments.urls")
    ),

    # Notifications
    path(
        "api/notifications/",
        include("notifications.urls")
    ),

    # JWT
    path(
        "api/token/",
        SecureTokenObtainPairView.as_view(),
        name="token_obtain_pair"
    ),

    path(
        "api/token/refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh"
    ),
]


urlpatterns += static(
    settings.MEDIA_URL,
    document_root=settings.MEDIA_ROOT
)