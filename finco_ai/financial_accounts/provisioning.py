import json
from functools import cache
from pathlib import Path

from django.db import transaction

from .models import FinancialAccount

# The fixture doubles as the default chart template for every new user.
TEMPLATE_PATH = Path(__file__).resolve().parent / "fixtures" / "financial_accounts.json"


@cache
def _template():
    """Template rows as (pk, fields) ordered so parents come before children."""
    rows = json.loads(TEMPLATE_PATH.read_text(encoding="utf-8"))
    return sorted(((row["pk"], row["fields"]) for row in rows), key=lambda row: row[1]["level"])


def seed_default_chart(user_id):
    """Give a user their own copy of the default chart of accounts.

    Idempotent: does nothing if the user already has accounts. Returns the number created.
    """
    with transaction.atomic():
        if FinancialAccount.objects.filter(user_id=user_id).exists():
            return 0
        created = {}  # template pk -> new account
        for template_pk, fields in _template():
            parent_pk = fields["parent"]
            created[template_pk] = FinancialAccount.objects.create(
                code=fields["code"],
                name=fields["name"],
                nature=fields["nature"],
                level=fields["level"],
                account_type=fields["account_type"],
                can_receive_movement=fields["can_receive_movement"],
                parent=created[parent_pk] if parent_pk else None,
                user_id=user_id,
            )
        return len(created)
