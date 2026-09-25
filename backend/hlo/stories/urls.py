from django.urls import path

from .views import (
    create_story,
    get_stories,
    view_story,
    story_viewers,
    react_to_story,
    reply_to_story,
)


urlpatterns = [

    # Get active stories
    path(
        "",
        get_stories,
        name="get_stories"
    ),

    # Create story
    path(
        "create/",
        create_story,
        name="create_story"
    ),

    # Mark story as viewed
    path(
        "<int:story_id>/view/",
        view_story,
        name="view_story"
    ),

    # Story viewers + reactions + replies
    path(
        "<int:story_id>/viewers/",
        story_viewers,
        name="story_viewers"
    ),
    path(
        "<int:story_id>/react/",
        react_to_story,
        name="story-react"
    ),
    path(
        "<int:story_id>/reply/",
        reply_to_story,
        name="story-reply"
    ),
]
