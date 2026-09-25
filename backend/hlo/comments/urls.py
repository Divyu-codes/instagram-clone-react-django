from django.urls import path

from .views import PostCommentListCreateView


urlpatterns = [
    path(
        "<int:post_id>/",
        PostCommentListCreateView.as_view(),
        name="post-comments"
    ),
]