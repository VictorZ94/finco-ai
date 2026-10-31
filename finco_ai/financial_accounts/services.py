import re

from django.db import transaction

from .models import FinancialAccount

_SUFFIX = re.compile(r"-(\d+)$")


def child_code(parent_code, sibling_codes):
    """Next free sub-account code: "5135" with 5135-01..03 taken -> "5135-04"."""
    suffixes = [int(match.group(1)) for code in sibling_codes if (match := _SUFFIX.search(code))]
    return f"{parent_code}-{max(suffixes, default=0) + 1:02d}"


def next_child_code(parent):
    """Next free sub-account code under `parent`, read from the database."""
    siblings = FinancialAccount.objects.filter(user_id=parent.user_id, parent=parent).values_list("code", flat=True)
    return child_code(parent.code, siblings)


def create_child_account(parent, name):
    """Create a postable sub-account (level 4) under a level-3 account, inheriting its type and nature."""
    with transaction.atomic():
        # Lock the parent so two creations can't pick the same code.
        parent = FinancialAccount.objects.select_for_update().get(pk=parent.pk)
        return FinancialAccount.objects.create(
            user_id=parent.user_id,
            parent=parent,
            code=next_child_code(parent),
            name=name.strip(),
            level=FinancialAccount.Level.SUBCUENTA,
            nature=parent.nature,
            account_type=parent.account_type,
            can_receive_movement=True,
        )
