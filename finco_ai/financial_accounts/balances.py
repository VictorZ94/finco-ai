import calendar
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum

from transactions.models import LedgerEntry

from .models import FinancialAccount, Nature

ZERO = Decimal("0")


def money(value):
    return f"{value:.2f}"


def signed(nature, debit, credit):
    """A balance as the account's nature reads it (DEBIT: debit − credit, CREDIT: credit − debit)."""
    return debit - credit if nature == Nature.DEBIT else credit - debit


def account_totals(user_id, *, end, start=None, accounts=None):
    """{account id: [debit, credit]} for entries applied in [start, end], rolled up to every parent.

    Only sub-accounts hold movements; each parent adds up its children's raw debits and credits,
    level by level, so contra-nature children still sum correctly. `accounts` (the user's chart)
    may be passed in to save a query.
    """
    lines = LedgerEntry.objects.filter(transaction__user_id=user_id, transaction__applied_date__lte=end)
    if start is not None:
        lines = lines.filter(transaction__applied_date__gte=start)
    totals = defaultdict(lambda: [ZERO, ZERO])
    for row in lines.values("account_id").annotate(debit=Sum("debit"), credit=Sum("credit")):
        totals[row["account_id"]] = [row["debit"] or ZERO, row["credit"] or ZERO]

    if accounts is None:
        accounts = list(FinancialAccount.objects.filter(user_id=user_id))
    # Deepest level first, so each parent has its full total before it passes it up.
    for account in sorted(accounts, key=lambda a: a.level, reverse=True):
        if account.parent_id:
            debit, credit = totals[account.id]
            parent = totals[account.parent_id]
            parent[0] += debit
            parent[1] += credit
    return totals


def build_chart_balances(user_id, year, month):
    """The user's whole chart (PUC) with balances as of the month's last day, ordered by code."""
    as_of = date(year, month, calendar.monthrange(year, month)[1])
    accounts = list(FinancialAccount.objects.filter(user_id=user_id).order_by("code"))
    totals = account_totals(user_id, end=as_of, accounts=accounts)

    result = []
    for account in accounts:
        debit, credit = totals[account.id]
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
                "debit": money(debit),
                "credit": money(credit),
                "balance": money(signed(account.nature, debit, credit)),
            }
        )
    return {"month": f"{year:04d}-{month:02d}", "as_of": as_of.isoformat(), "accounts": result}
