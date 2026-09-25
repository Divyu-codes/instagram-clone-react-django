from django.urls import path

from .views import (
    PostListView,
    PostDeleteView,
)


urlpatterns = [
    # Get all posts / create post
    path(
        "",
        PostListView.as_view(),
        name="post-list"
    ),

    # Delete own post
    path(
        "<int:pk>/",
        PostDeleteView.as_view(),
        name="post-delete"
    ),
]