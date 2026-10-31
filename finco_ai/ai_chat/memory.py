"""Conversation memory: a LangGraph Postgres checkpointer keeps each conversation's agent state
(thread_id = conversation id) in the app's own database, next to the Django tables."""

from contextlib import contextmanager

import psycopg
from django.db import connection
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row

from .models import ConversationMemory

# SummarizationMiddleware marks the message that replaces old history with this.
SUMMARY_SOURCE = "summarization"


def _conninfo(settings_dict):
    return make_conninfo(
        dbname=settings_dict["NAME"],
        user=settings_dict["USER"],
        password=settings_dict["PASSWORD"],
        host=settings_dict["HOST"],
        port=settings_dict["PORT"],
    )


@contextmanager
def open_checkpointer(settings_dict=None):
    """A PostgresSaver on its own connection (autocommit, as LangGraph requires), closed afterwards.

    Uses the current Django database settings, so tests write to the test database.
    """
    conninfo = _conninfo(settings_dict or connection.settings_dict)
    with psycopg.connect(conninfo, autocommit=True, prepare_threshold=0, row_factory=dict_row) as conn:
        yield PostgresSaver(conn)


def setup_checkpointer(settings_dict):
    """Create or upgrade LangGraph's checkpoint tables (run from a Django migration)."""
    with open_checkpointer(settings_dict) as checkpointer:
        checkpointer.setup()


def delete_thread(conversation_id):
    """Forget a conversation's agent memory."""
    with open_checkpointer() as checkpointer:
        checkpointer.delete_thread(str(conversation_id))


def save_summary(conversation, messages):
    """Mirror the latest summary from the agent state into ConversationMemory (shown in the admin)."""
    summary = next(
        (
            message.content
            for message in reversed(messages)
            if message.additional_kwargs.get("lc_source") == SUMMARY_SOURCE
        ),
        None,
    )
    if summary:
        ConversationMemory.objects.update_or_create(conversation=conversation, defaults={"summary": summary})
