from django.db.models import Q

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Post
from .serializers import PostSerializer

from follows.models import Follow


# ============================================================
# POST LIST / CREATE
# ============================================================

class PostListView(generics.ListCreateAPIView):

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        user = self.request.user

        # ====================================================
        # ONLY ACCEPTED FOLLOWING USERS
        # ====================================================
        #
        # Follow table me sirf accepted relationships hain.
        #
        # FollowRequest pending hai to yahan record nahi hoga.
        #
        # Isliye:
        #
        # Vishu -> Divya requested
        #          ↓
        #          Divya ne accept nahi kiya
        #          ↓
        #          Divya ki post hidden
        #
        # Vishu -> Divya accepted
        #          ↓
        #          Follow record exists
        #          ↓
        #          Divya ki post visible
        #
        accepted_following_ids = Follow.objects.filter(
            follower=user
        ).values_list(
            "following_id",
            flat=True
        )

        # ====================================================
        # HOME FEED
        # ====================================================
        #
        # Sirf:
        # 1. Apni posts
        # 2. Jin users ko current user actually follow karta hai
        #
        # Public users ki posts bhi random feed me nahi aayengi.
        #
        queryset = (
            Post.objects
            .select_related("user")
            .filter(
                Q(user=user)
                |
                Q(user_id__in=accepted_following_ids)
            )
            .distinct()
            .order_by("-created_at")
        )

        return queryset

    # ========================================================
    # CREATE POST
    # ========================================================

    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user
        )


# ============================================================
# DELETE POST
# ============================================================

class PostDeleteView(generics.DestroyAPIView):

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        # User sirf apni post delete kar sakta hai.

        return Post.objects.filter(
            user=self.request.user
        )