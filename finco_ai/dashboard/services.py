import calendar
from datetime import date
from decimal import Decimal

from django.db.models import Case, DecimalField, F, Q, Sum, Value, When
from django.db.models.functions import Coalesce, TruncMonth

from financial_accounts.models import AccountType
from transactions.models import LedgerEntry

TREND_MONTHS = 6
ZERO = Decimal("0")
MONEY = DecimalField(max_digits=20, decimal_places=2)


def _money(value):
    return f"{(value or ZERO):.2f}"


def _shift_month(year, month, delta):
    """(year, month) moved by `delta` months."""
    index = year * 12 + (month - 1) + delta
    return index // 12, index % 12 + 1


def _month_key(year, month):
    return f"{year:04d}-{month:02d}"


def _month_bounds(year, month):
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


def _signed_sum(account_type, positive_side):
    """Σ(positive_side − other side) over lines of one account type (0 when there are none)."""
    negative_side = "credit" if positive_side == "debit" else "debit"
    return Coalesce(
        Sum(
            Case(
                When(account__account_type=account_type, then=F(positive_side) - F(negative_side)),
                default=Value(ZERO),
                output_field=MONEY,
            )
        ),
        Value(ZERO),
        output_field=MONEY,
    )


def _income_and_expenses(lines, start, end):
    return lines.filter(transaction__applied_date__range=(start, end)).aggregate(
        income=_signed_sum(AccountType.INCOME, "credit"),
        expenses=_signed_sum(AccountType.EXPENSE, "debit"),
    )


def build_summary(user_id, year, month):
    """Dashboard figures for one user and month. Amounts are decimal strings.

    Income/expenses cover the month; assets, liabilities and net worth are balances
    as of the month's last day. Everything is filtered by the entry's applied_date.
    """
    lines = LedgerEntry.objects.filter(transaction__user_id=user_id)
    start, end = _month_bounds(year, month)

    current = _income_and_expenses(lines, start, end)
    prev_year, prev_month = _shift_month(year, month, -1)
    previous = _income_and_expenses(lines, *_month_bounds(prev_year, prev_month))

    balances = lines.filter(transaction__applied_date__lte=end).aggregate(
        assets=_signed_sum(AccountType.ASSET, "debit"),
        liabilities=_signed_sum(AccountType.LIABILITY, "credit"),
    )

    # Trend: one grouped query over the 6-month window, zero-filled.
    first_year, first_month = _shift_month(year, month, -(TREND_MONTHS - 1))
    trend_rows = (
        lines.filter(
            transaction__applied_date__range=(_month_bounds(first_year, first_month)[0], end),
            account__account_type__in=[AccountType.INCOME, AccountType.EXPENSE],
        )
        .annotate(period=TruncMonth("transaction__applied_date"))
        .values("period")
        .annotate(
            income=_signed_sum(AccountType.INCOME, "credit"),
            expenses=_signed_sum(AccountType.EXPENSE, "debit"),
        )
    )
    by_month = {_month_key(row["period"].year, row["period"].month): row for row in trend_rows}
    trend = []
    for offset in range(TREND_MONTHS):
        key = _month_key(*_shift_month(first_year, first_month, offset))
        row = by_month.get(key, {})
        trend.append({"month": key, "income": _money(row.get("income")), "expenses": _money(row.get("expenses"))})

    return {
        "month": _month_key(year, month),
        "income": _money(current["income"]),
        "expenses": _money(current["expenses"]),
        "net": _money(current["income"] - current["expenses"]),
        "previous": {
            "month": _month_key(prev_year, prev_month),
            "income": _money(previous["income"]),
            "expenses": _money(previous["expenses"]),
        },
        "assets": _money(balances["assets"]),
        "liabilities": _money(balances["liabilities"]),
        "net_worth": _money(balances["assets"] - balances["liabilities"]),
        "trend": trend,
    }
