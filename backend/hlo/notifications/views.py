from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return (
            Notification.objects
            .filter(
                recipient=self.request.user
            )
            .select_related(
                "actor",
                "post"
            )
            .order_by("-created_at")
        )


class NotificationMarkReadView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        updated_count = (
            Notification.objects
            .filter(
                recipient=request.user,
                is_read=False
            )
            .update(
                is_read=True
            )
        )

        return Response(
            {
                "success": True,
                "count": updated_count,
            },
            status=status.HTTP_200_OK
        )