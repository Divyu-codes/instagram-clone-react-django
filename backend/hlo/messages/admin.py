from django.contrib import admin
from .models import Message, Conversation, Participant, Attachment


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
	list_display = ("room_name", "sender", "message_type", "attachment_url", "timestamp")
	search_fields = ("room_name", "sender__username", "sender__email")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
	list_display = ("id", "name", "is_group", "created_at")


@admin.register(Participant)
class ParticipantAdmin(admin.ModelAdmin):
	list_display = ("conversation", "user", "is_admin", "joined_at")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
	list_display = ("id", "message", "file", "content_type", "uploaded_at")
