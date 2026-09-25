from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_profile_email_verification_token_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="phone_number",
            field=models.CharField(max_length=32, null=True, blank=True, unique=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="google_account",
            field=models.BooleanField(default=False),
        ),
    ]
