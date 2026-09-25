from django.core.management.base import BaseCommand
from django.utils import timezone

from stories.models import Story


class Command(BaseCommand):
    help = "Delete stories that have expired after 24 hours"

    def handle(self, *args, **kwargs):
        expired_stories = Story.objects.filter(
            expires_at__lte=timezone.now()
        )

        count = expired_stories.count()

        expired_stories.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"{count} expired story/stories deleted successfully."
            )
        )