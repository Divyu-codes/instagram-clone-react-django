from django.urls import path
from .views import PostLikeView


urlpatterns = [
    path(
        "<int:post_id>/",
        PostLikeView.as_view(),
        name="post-like"
    ),
]