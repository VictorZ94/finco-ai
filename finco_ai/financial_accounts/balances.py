import calendar
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum

from transactions.models import LedgerEntry

from .models import FinancialAccount, Nature

ZERO = Decimal("0")


def _money(value):
    return f"{value:.2f}"


def build_chart_balances(user_id, year, month):
    """The user's whole chart (PUC) with balances as of the month's last day, ordered by code.

    Only sub-accounts hold movements; every parent adds up its children's debits and credits,
    level by level. Each balance is signed by the account's own nature
    (DEBIT: debit − credit, CREDIT: credit − debit).
    """
    as_of = date(year, month, calendar.monthrange(year, month)[1])
    totals = defaultdict(lambda: [ZERO, ZERO])  # account id -> [debit, credit]
    rows = (
        LedgerEntry.objects.filter(transaction__user_id=user_id, transaction__applied_date__lte=as_of)
        .values("account_id")
        .annotate(debit=Sum("debit"), credit=Sum("credit"))
    )
    for row in rows:
        totals[row["account_id"]] = [row["debit"] or ZERO, row["credit"] or ZERO]

    accounts = list(FinancialAccount.objects.filter(user_id=user_id).order_by("code"))
    # Deepest level first, so each parent has its full total before it passes it up.
    for account in sorted(accounts, key=lambda a: a.level, reverse=True):
        if account.parent_id:
            debit, credit = totals[account.id]
            parent = totals[account.parent_id]
            parent[0] += debit
            parent[1] += credit

    result = []
    for account in accounts:
        debit, credit = totals[account.id]
        balance = debit - credit if account.nature == Nature.DEBIT else credit - debit
        result.append(
            {
                "id": str(account.id),
                "code": account.code,
                "name": account.name,
                "level": account.level,
                "nature": account.nature,
                "account_type": account.account_type,
                "parent_id": str(account.parent_id) if account.parent_id else None,
                "can_receive_movement": account.can_receive_movement,
                "debit": _money(debit),
                "credit": _money(credit),
                "balance": _money(balance),
            }
        )
    return {"month": f"{year:04d}-{month:02d}", "as_of": as_of.isoformat(), "accounts": result}
