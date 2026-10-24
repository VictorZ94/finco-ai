from django.contrib import admin

from .models import Conversation, ConversationMemory


class ConversationMemoryInline(admin.StackedInline):
    model = ConversationMemory
    extra = 0


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "user_id", "created_at", "updated_at"]
    search_fields = ["user_id"]
    ordering = ["-created_at"]
    inlines = [ConversationMemoryInline]
