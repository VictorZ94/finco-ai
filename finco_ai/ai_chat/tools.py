"""The agent's tools. They only stage results in runtime.context.effects (see ai_chat.context)."""

from typing import Literal

from langchain.tools import ToolRuntime, tool

from .context import ChatContext, StagedMovement
from .rules import check_movement, check_proposal

Kind = Literal[
    "expense",
    "income",
    "gift_given",
    "gift_received",
    "loan_received",
    "loan_given",
    "debt_payment",
    "transfer",
]


@tool(parse_docstring=True)
def record_movement(
    kind: Kind,
    amount: str,
    category_code: str,
    payment_code: str,
    category_evidence: str,
    payment_evidence: str,
    description: str,
    runtime: ToolRuntime[ChatContext],
    applied_date: str | None = None,
    supplier: str = "",
) -> str:
    """Save one money movement as a balanced ledger entry. Call it only when the user has said the amount,
    what it was for, and how they paid or where the money went.

    Args:
        kind: What happened: expense, income, gift_given, gift_received, loan_received, loan_given,
            debt_payment or transfer.
        amount: Digits with "." for decimals and no thousands separators, e.g. "80000".
        category_code: Code of the account for WHAT the money was for (expense, income, loan...), from the list.
        payment_code: Code of the cash, bank or card account the money moved through, from the list.
        category_evidence: The user's own words that name the category, e.g. "gasolina".
        payment_evidence: The user's own words that name how they paid or where it went, e.g. "con la Nubank".
        description: A clear one-line description of the movement in the user's language, built from what
            they said, e.g. "Gasolina para la moto" or "Almuerzo con clientes en El Corral". Never empty.
        applied_date: YYYY-MM-DD when the user gave another date; null for today.
        supplier: Who was paid or who paid, if the user said it.
    """
    result = check_movement(
        runtime.context,
        kind=kind,
        amount=amount,
        category_code=category_code,
        payment_code=payment_code,
        category_evidence=category_evidence,
        payment_evidence=payment_evidence,
        applied_date=applied_date,
        supplier=supplier,
        description=description,
    )
    if not isinstance(result, StagedMovement):
        return result
    runtime.context.effects.movement = result
    return (
        f"Saved: {result.category.code} {result.category.name} / {result.payment.code} {result.payment.name}, "
        f"{result.amount:.2f}. Tell the user briefly that it is saved; the app shows the entry number."
    )


@tool(parse_docstring=True)
def propose_new_account(
    parent_code: str,
    name: str,
    role: Literal["category", "payment"],
    runtime: ToolRuntime[ChatContext],
) -> str:
    """Offer to create a new account when none of the user's accounts fits. The user must confirm it
    by tapping a button, so never record with it in the same turn.

    Args:
        parent_code: Code of the group it goes under, from the list of groups, e.g. "5135".
        name: Short name in the style of the existing accounts, e.g. "Taxi".
        role: "category" for what money is spent on or earned from; "payment" for cash, bank or card accounts.
    """
    result = check_proposal(runtime.context, parent_code=parent_code, name=name, role=role)
    if isinstance(result, str):
        return result
    runtime.context.effects.proposal = result
    return (
        f"The user now sees a card offering to create {result['code']} {result['name']} with Create account / No "
        "buttons. Tell them briefly and wait for their answer; don't record with this account yet."
    )


TOOLS = [record_movement, propose_new_account]
