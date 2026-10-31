from django.contrib import admin

from .models import Conversation, ConversationMemory, Message


class ConversationMemoryInline(admin.StackedInline):
    model = ConversationMemory
    extra = 0


class MessageInline(admin.TabularInline):
    """Read-only transcript, for debugging what the agent did."""

    model = Message
    extra = 0
    fields = ["created_at", "role", "content", "data"]
    readonly_fields = fields
    can_delete = False
    ordering = ["created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["title", "user_id", "created_at", "updated_at"]
    search_fields = ["user_id", "title"]
    ordering = ["-updated_at"]
    inlines = [MessageInline, ConversationMemoryInline]
