import uuid

from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user_id = models.CharField(max_length=128, db_index=True)  # Firebase UID

    class Meta:
        db_table = "conversations"

    def __str__(self):
        return f"Conversation {self.id}"


class ConversationMemory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    summary = models.TextField()

    updated_at = models.DateTimeField(auto_now=True)

    conversation = models.OneToOneField(
        Conversation,
        on_delete=models.CASCADE,
        related_name="memory",
    )

    class Meta:
        db_table = "conversation_memory"

    def __str__(self):
        return f"Memory for {self.conversation_id}"
