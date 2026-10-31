"""Financial statements and books, built from the ledger. Amounts are decimal strings.

There are no closing entries: the balance sheet derives the period result from Ingresos and Gastos.
"""

from datetime import date, timedelta

from django.db.models import Case, DecimalField, F, Sum, Value, When, Window
from django.db.models.functions import Coalesce

from financial_accounts.balances import ZERO, account_totals, money, signed
from financial_accounts.models import FinancialAccount, Nature
from transactions.models import LedgerEntry, Transaction
from transactions.serializers import TransactionSerializer

MONEY = DecimalField(max_digits=20, decimal_places=2)

# PUC groups behind the income statement subtotals.
OPERATING_INCOME = ("41",)
OPERATING_EXPENSES = ("51", "52")
INCOME_TAX = ("54",)


class UnknownAccount(Exception):
    pass


def _chart(user_id):
    return list(FinancialAccount.objects.filter(user_id=user_id).order_by("code"))


def _tree(accounts, totals, class_code):
    """The Clase `class_code` subtree with signed amounts; zero rows are dropped unless they hold non-zero ones."""
    by_parent = {}
    for account in accounts:
        by_parent.setdefault(account.parent_id, []).append(account)

    def node(account):
        debit, credit = totals[account.id]
        children = [child for child in map(node, by_parent.get(account.id, [])) if child]
        amount = signed(account.nature, debit, credit)
        if amount == ZERO and not children:
            return None
        return {
            "id": str(account.id),
            "code": account.code,
            "name": account.name,
            "level": account.level,
            "amount": money(amount),
            "children": children,
        }

    root = next((a for a in accounts if a.code == class_code and a.parent_id is None), None)
    return node(root) if root else None


def _amount(accounts, totals, code):
    """Signed amount of the account with `code` (0 when the user has no such account)."""
    account = next((a for a in accounts if a.code == code), None)
    return signed(account.nature, *totals[account.id]) if account else ZERO


def _sum(accounts, totals, codes):
    return sum((_amount(accounts, totals, code) for code in codes), ZERO)


def income_statement(user_id, start, end):
    accounts = _chart(user_id)
    totals = account_totals(user_id, start=start, end=end, accounts=accounts)
    total_income = _amount(accounts, totals, "4")
    total_expenses = _amount(accounts, totals, "5")

    operating_income = _sum(accounts, totals, OPERATING_INCOME)
    operating_expenses = _sum(accounts, totals, OPERATING_EXPENSES)
    income_tax = _sum(accounts, totals, INCOME_TAX)
    # Everything outside the operating groups (and taxes) counts as non-operating, so the subtotals always add up.
    other_income = total_income - operating_income
    other_expenses = total_expenses - operating_expenses - income_tax
    operating_profit = operating_income - operating_expenses
    profit_before_tax = operating_profit + other_income - other_expenses

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "income": _tree(accounts, totals, "4"),
        "expenses": _tree(accounts, totals, "5"),
        "summary": {
            "operating_income": money(operating_income),
            "operating_expenses": money(operating_expenses),
            "operating_profit": money(operating_profit),
            "other_income": money(other_income),
            "other_expenses": money(other_expenses),
            "profit_before_tax": money(profit_before_tax),
            "income_tax": money(income_tax),
            "net_income": money(profit_before_tax - income_tax),
        },
        "total_income": money(total_income),
        "total_expenses": money(total_expenses),
    }


def balance_sheet(user_id, as_of):
    accounts = _chart(user_id)
    totals = account_totals(user_id, end=as_of, accounts=accounts)
    year_start = date(as_of.year, 1, 1)
    before_year = account_totals(user_id, end=year_start - timedelta(days=1), accounts=accounts)

    def result(t):
        return _amount(accounts, t, "4") - _amount(accounts, t, "5")

    prior_results = result(before_year)
    current_result = result(totals) - prior_results
    assets = _amount(accounts, totals, "1")
    liabilities = _amount(accounts, totals, "2")
    equity_accounts = _amount(accounts, totals, "3")
    total_equity = equity_accounts + prior_results + current_result
    difference = assets - liabilities - total_equity

    return {
        "as_of": as_of.isoformat(),
        "assets": _tree(accounts, totals, "1"),
        "liabilities": _tree(accounts, totals, "2"),
        "equity": _tree(accounts, totals, "3"),
        "current_result": money(current_result),
        "prior_results": money(prior_results),
        "total_assets": money(assets),
        "total_liabilities": money(liabilities),
        "total_equity": money(total_equity),
        "total_liabilities_and_equity": money(liabilities + total_equity),
        "difference": money(difference),
        "balanced": difference == ZERO,
    }


def journal(user_id, start, end):
    entries = (
        Transaction.objects.filter(user_id=user_id, applied_date__range=(start, end))
        .prefetch_related("ledger_entries__account")
        .order_by("applied_date", "numbering")
    )
    sums = LedgerEntry.objects.filter(
        transaction__user_id=user_id, transaction__applied_date__range=(start, end)
    ).aggregate(
        debit=Coalesce(Sum("debit"), Value(ZERO), output_field=MONEY),
        credit=Coalesce(Sum("credit"), Value(ZERO), output_field=MONEY),
    )
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "entries": TransactionSerializer(entries, many=True).data,
        "total_debit": money(sums["debit"]),
        "total_credit": money(sums["credit"]),
    }


def _signed_line():
    """A line's amount as its account's nature reads it."""
    return Case(
        When(account__nature=Nature.DEBIT, then=F("debit") - F("credit")),
        default=F("credit") - F("debit"),
        output_field=MONEY,
    )


def general_ledger(user_id, start, end, account_id=None):
    accounts = FinancialAccount.objects.filter(user_id=user_id, can_receive_movement=True).order_by("code")
    if account_id is not None:
        accounts = accounts.filter(pk=account_id)
        if not accounts.exists():
            raise UnknownAccount()
    accounts = list(accounts)
    ids = [account.pk for account in accounts]
    mine = LedgerEntry.objects.filter(transaction__user_id=user_id, account_id__in=ids)

    opening = {
        row["account_id"]: row["amount"]
        for row in mine.filter(transaction__applied_date__lt=start)
        .values("account_id")
        .annotate(amount=Sum(_signed_line()))
    }
    lines = (
        mine.filter(transaction__applied_date__range=(start, end))
        .annotate(
            running=Window(
                Sum(_signed_line()),
                partition_by=[F("account_id")],
                order_by=[F("transaction__applied_date").asc(), F("transaction__numbering").asc(), F("id").asc()],
            )
        )
        .values(
            "id",
            "account_id",
            "debit",
            "credit",
            "running",
            "transaction_id",
            "transaction__applied_date",
            "transaction__numbering",
            "transaction__description",
            "transaction__supplier",
        )
        .order_by("transaction__applied_date", "transaction__numbering", "id")
    )
    by_account = {}
    for line in lines:
        by_account.setdefault(line["account_id"], []).append(line)

    result = []
    for account in accounts:
        start_balance = opening.get(account.pk) or ZERO
        movements = by_account.get(account.pk, [])
        if not movements and start_balance == ZERO:
            continue
        debit = sum((line["debit"] for line in movements), ZERO)
        credit = sum((line["credit"] for line in movements), ZERO)
        result.append(
            {
                "id": str(account.pk),
                "code": account.code,
                "name": account.name,
                "nature": account.nature,
                "opening": money(start_balance),
                "debit": money(debit),
                "credit": money(credit),
                "closing": money(start_balance + signed(account.nature, debit, credit)),
                "lines": [
                    {
                        "id": str(line["id"]),
                        "transaction_id": str(line["transaction_id"]),
                        "date": line["transaction__applied_date"].isoformat(),
                        "numbering": line["transaction__numbering"],
                        "description": line["transaction__description"] or "",
                        "supplier": line["transaction__supplier"],
                        "debit": money(line["debit"]),
                        "credit": money(line["credit"]),
                        "balance": money(start_balance + line["running"]),
                    }
                    for line in movements
                ],
            }
        )
    return {"from": start.isoformat(), "to": end.isoformat(), "accounts": result}
