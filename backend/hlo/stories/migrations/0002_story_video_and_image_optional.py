# Generated for video story support.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("stories", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="story",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to="stories/"),
        ),
        migrations.AddField(
            model_name="story",
            name="video",
            field=models.FileField(blank=True, null=True, upload_to="stories/videos/"),
        ),
    ]
