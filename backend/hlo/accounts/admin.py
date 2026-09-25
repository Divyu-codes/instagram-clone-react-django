from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "phone_number",
        "email_verified",
        "google_account",
        "followers_count",
        "following_count",
    )
    search_fields = ("user__username", "user__email", "phone_number")