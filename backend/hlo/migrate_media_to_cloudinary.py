import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.conf import settings
from django.core.files import File

from accounts.models import Profile
from posts.models import Post
from stories.models import Story
from messages.models import Attachment


MEDIA_ROOT = os.path.join(settings.BASE_DIR, "media")


def get_local_path(field_name):
    """
    Database me stored relative media path ko
    local media folder ke actual path me convert karta hai.
    """

    return os.path.join(MEDIA_ROOT, field_name.replace("/", os.sep))


def migrate_field(instance, field_name):
    """
    Existing local file ko Cloudinary storage par upload karta hai.
    """

    field = getattr(instance, field_name)

    if not field or not field.name:
        return False

    relative_name = field.name
    local_path = get_local_path(relative_name)

    print(f"  Local: {local_path}")

    if not os.path.exists(local_path):
        print("  ❌ Local file not found")
        return False

    filename = os.path.basename(relative_name)

    try:
        print(f"  Uploading: {relative_name}")

        with open(local_path, "rb") as file:

            django_file = File(file)

            field.save(
                filename,
                django_file,
                save=False,
            )

        instance.save(update_fields=[field_name])

        print(f"  ✅ Cloudinary: {field.name}")

        return True

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def migrate_profiles():

    print("\n================================")
    print("PROFILE IMAGES")
    print("================================")

    total = 0

    profiles = Profile.objects.exclude(profile_image="")

    for profile in profiles:

        print(f"\nProfile ID: {profile.id}")

        if migrate_field(profile, "profile_image"):
            total += 1

    print(f"\nProfiles migrated: {total}")


def migrate_posts():

    print("\n================================")
    print("POST IMAGES")
    print("================================")

    total = 0

    posts = Post.objects.exclude(image="")

    for post in posts:

        print(f"\nPost ID: {post.id}")

        if migrate_field(post, "image"):
            total += 1

    print(f"\nPosts migrated: {total}")


def migrate_stories():

    print("\n================================")
    print("STORIES")
    print("================================")

    image_total = 0
    video_total = 0

    stories = Story.objects.all()

    for story in stories:

        if story.image:

            print(f"\nStory ID: {story.id} - IMAGE")

            if migrate_field(story, "image"):
                image_total += 1

        if story.video:

            print(f"\nStory ID: {story.id} - VIDEO")

            if migrate_field(story, "video"):
                video_total += 1

    print(f"\nStory images migrated: {image_total}")
    print(f"Story videos migrated: {video_total}")


def migrate_attachments():

    print("\n================================")
    print("CHAT ATTACHMENTS")
    print("================================")

    total = 0

    attachments = Attachment.objects.exclude(file="")

    for attachment in attachments:

        print(f"\nAttachment ID: {attachment.id}")

        if migrate_field(attachment, "file"):
            total += 1

    print(f"\nChat attachments migrated: {total}")


def main():

    print("\n")
    print("==============================================")
    print("   INSTAGRAM CLONE MEDIA MIGRATION")
    print("   Local Media -> Cloudinary")
    print("==============================================")

    migrate_profiles()

    migrate_posts()

    migrate_stories()

    migrate_attachments()

    print("\n==============================================")
    print("   MEDIA MIGRATION FINISHED")
    print("==============================================\n")


if __name__ == "__main__":
    main()