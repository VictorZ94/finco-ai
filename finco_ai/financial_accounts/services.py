import re

from django.db import transaction

from .models import FinancialAccount

MAX_SUFFIX = 99


def child_code(parent_code, sibling_codes):
    """Next free PUC sub-account code: "5135" with 513501..03 taken -> "513504".

    Raises ValueError once the parent's 99 two-digit slots are used up.
    """
    pattern = re.compile(rf"^{re.escape(parent_code)}(\d{{2}})$")
    suffixes = [int(match.group(1)) for code in sibling_codes if (match := pattern.match(code))]
    suffix = max(suffixes, default=0) + 1
    if suffix > MAX_SUFFIX:
        raise ValueError(f"{parent_code} has no free sub-account codes left.")
    return f"{parent_code}{suffix:02d}"


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
