from django.db import migrations


def create_checkpoint_tables(apps, schema_editor):
    """LangGraph's checkpoint tables (conversation memory), in the same database as the app."""
    from ai_chat.memory import setup_checkpointer

    setup_checkpointer(schema_editor.connection.settings_dict)


class Migration(migrations.Migration):
    # setup() creates indexes concurrently on its own autocommit connection.
    atomic = False

    dependencies = [
        ("ai_chat", "0002_conversation_pending_account_conversation_title_and_more"),
    ]

    operations = [
        migrations.RunPython(create_checkpoint_tables, migrations.RunPython.noop),
    ]
