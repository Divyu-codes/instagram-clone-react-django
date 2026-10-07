import os

# ---------------------------------------------------------
# Django setup MUST happen before importing Django models
# ---------------------------------------------------------

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()


from pathlib import Path
from collections import defaultdict
import datetime

import cloudinary
import cloudinary.uploader

from django.conf import settings
from django.utils import timezone

from messages.models import Attachment


print("Starting voice migration...\n")

MEDIA_ROOT = Path(settings.MEDIA_ROOT)


# ---------------------------------------------------------
# 1. Get all audio attachments from database
# ---------------------------------------------------------

attachments = list(
    Attachment.objects
    .filter(content_type="audio/webm")
    .select_related("message")
    .order_by("message__timestamp", "id")
)

print(f"Database voice attachments found: {len(attachments)}")


# ---------------------------------------------------------
# 2. Find local .webm files
# ---------------------------------------------------------

local_files = list(MEDIA_ROOT.rglob("*.webm"))

print(f"Local .webm files found: {len(local_files)}")


# ---------------------------------------------------------
# 3. Group database attachments by date
# ---------------------------------------------------------

db_by_date = defaultdict(list)

for attachment in attachments:

    if not attachment.message:
        continue

    timestamp = attachment.message.timestamp

    if not timestamp:
        continue

    if timezone.is_aware(timestamp):
        local_date = timezone.localtime(timestamp).date()
    else:
        local_date = timestamp.date()

    db_by_date[local_date].append(attachment)


# ---------------------------------------------------------
# 4. Group local files by YYYY/MM/DD folder
# ---------------------------------------------------------

files_by_date = defaultdict(list)

for file_path in local_files:

    try:
        relative = file_path.relative_to(MEDIA_ROOT)
        parts = relative.parts

        for i in range(len(parts) - 2):

            if (
                parts[i].isdigit()
                and len(parts[i]) == 4
                and parts[i + 1].isdigit()
                and parts[i + 2].isdigit()
            ):

                year = int(parts[i])
                month = int(parts[i + 1])
                day = int(parts[i + 2])

                file_date = datetime.date(
                    year,
                    month,
                    day
                )

                files_by_date[file_date].append(file_path)

                break

    except Exception:
        continue


# ---------------------------------------------------------
# 5. Sort local files
# ---------------------------------------------------------

for date in files_by_date:
    files_by_date[date].sort(
        key=lambda p: p.name
    )


# ---------------------------------------------------------
# 6. Show planned mapping
# ---------------------------------------------------------

print("\nPlanned mapping:\n")

for date in sorted(db_by_date.keys()):

    db_items = db_by_date[date]
    file_items = files_by_date.get(date, [])

    print(f"DATE: {date}")
    print(f"  DB attachments : {len(db_items)}")
    print(f"  Local files    : {len(file_items)}")

    for attachment, file_path in zip(
        db_items,
        file_items
    ):
        print(
            f"    Attachment {attachment.id}"
            f" -> {file_path.name}"
        )

    print()


# ---------------------------------------------------------
# 7. Safety check
# ---------------------------------------------------------

for date, db_items in db_by_date.items():

    file_items = files_by_date.get(date, [])

    if len(db_items) != len(file_items):

        print(
            f"ERROR: Date {date} has "
            f"{len(db_items)} DB attachments but "
            f"{len(file_items)} local files."
        )

        print(
            "Migration stopped. "
            "No files were uploaded."
        )

        raise SystemExit(1)


# ---------------------------------------------------------
# 8. Upload voice files to Cloudinary
# ---------------------------------------------------------

migrated = 0

for date in sorted(db_by_date.keys()):

    db_items = db_by_date[date]
    file_items = files_by_date[date]

    for attachment, local_file in zip(
        db_items,
        file_items
    ):

        print(
            f"Uploading Attachment {attachment.id} "
            f"<- {local_file.name}"
        )

        result = cloudinary.uploader.upload(
            str(local_file),
            folder="instagram_clone/chat_uploads",
            resource_type="video",
            format="webm",
        )

        secure_url = result["secure_url"]
        public_id = result["public_id"]

        # Save Cloudinary public ID
        attachment.file.name = public_id

        attachment.save(
            update_fields=["file"]
        )

        # Save correct Cloudinary URL
        # in the Message record used by chat.
        if attachment.message:

            attachment.message.attachment_url = secure_url

            attachment.message.save(
                update_fields=["attachment_url"]
            )

        migrated += 1

        print(
            f"  Cloudinary URL: {secure_url}"
        )

        print()


print("========================================")
print("VOICE MIGRATION COMPLETE")
print("========================================")
print(f"Migrated: {migrated} voice attachments")