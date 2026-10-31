import uuid

from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # The first user message, shortened; shown in the conversation list.
    title = models.CharField(max_length=120, blank=True, default="")
    # A new account the agent proposed and the user hasn't answered yet:
    # {"parent_code", "code", "name", "role"} (see ai_chat.agent).
    pending_account = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user_id = models.CharField(max_length=128, db_index=True)  # Firebase UID

    class Meta:
        db_table = "conversations"

    def __str__(self):
        return self.title or f"Conversation {self.id}"


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


class Message(models.Model):
    """One chat message. Assistant messages may carry a card in `data`."""

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    # Card shown under the text: {"type": "recorded", ...} or {"type": "account_proposal", ...}.
    data = models.JSONField(null=True, blank=True)
    # Sent by the frontend with each user message, so a retried request isn't run twice.
    client_id = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["conversation", "client_id"], name="uniq_chat_message_client_id"
            ),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:40]}"
