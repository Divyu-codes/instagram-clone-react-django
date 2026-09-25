from django.urls import path

from .views import (
    FollowUserView,
    FollowersListView,
    FollowingListView,
    FollowRequestListView,
    AcceptFollowRequestView,
    RejectFollowRequestView,
)


urlpatterns = [

    # Follow / unfollow / request
    path(
        "<int:user_id>/",
        FollowUserView.as_view(),
        name="follow-user"
    ),

    # Followers
    path(
        "<int:user_id>/followers/",
        FollowersListView.as_view(),
        name="followers-list"
    ),

    # Following
    path(
        "<int:user_id>/following/",
        FollowingListView.as_view(),
        name="following-list"
    ),

    # Incoming requests
    path(
        "requests/",
        FollowRequestListView.as_view(),
        name="follow-request-list"
    ),

    # Accept request
    path(
        "requests/<int:request_id>/accept/",
        AcceptFollowRequestView.as_view(),
        name="accept-follow-request"
    ),

    # Reject request
    path(
        "requests/<int:request_id>/reject/",
        RejectFollowRequestView.as_view(),
        name="reject-follow-request"
    ),
]