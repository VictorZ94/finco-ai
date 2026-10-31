"""The bookkeeping rules the tools enforce. Pure: they read the turn's ChatContext and return either
something to stage or an instruction for the model (which then asks the user)."""

from datetime import date

from financial_accounts.models import AccountType

from .context import ChatContext, StagedMovement
from .movements import KINDS, check_accounts, evidence_in, parse_amount

# Where a new account may go, by what it is for.
PROPOSAL_TYPES = {
    "category": {AccountType.ASSET, AccountType.LIABILITY, AccountType.INCOME, AccountType.EXPENSE},
    "payment": {AccountType.ASSET, AccountType.LIABILITY},
}


def _names(accounts):
    return ", ".join(account.name for account in accounts)


def _types(types):
    return " or ".join(sorted(str(value) for value in types))


def payment_options(ctx: ChatContext, kind):
    allowed = KINDS[kind][2]
    return _names(account for account in ctx.postable if account.account_type in allowed)


def check_movement(
    ctx: ChatContext,
    *,
    kind,
    amount,
    category_code,
    payment_code,
    category_evidence,
    payment_evidence,
    applied_date=None,
    supplier="",
    description="",
):
    """A StagedMovement when every rule passes, otherwise a str telling the model what to do."""
    if ctx.effects.movement is not None:
        return "Not saved: one movement was already saved in this turn. Tell the user, then handle the next one."
    if kind not in KINDS:
        return f"Not saved: kind must be one of {', '.join(KINDS)}."

    by_code = ctx.postable_by_code()
    category = by_code.get((category_code or "").strip())
    payment = by_code.get((payment_code or "").strip())

    # Rule: a clear category, in the user's own words.
    if not evidence_in(category_evidence, ctx.user_text):
        return (
            "Not saved: the user has not said what this was for in their own words. "
            "Ask them what it was for (for example petrol, lunch, taxi)."
        )
    if category is None:
        return (
            f"Not saved: {category_code!r} is not one of the user's accounts. Use a code from the account list; "
            "if nothing fits, call propose_new_account."
        )
    if parse_amount(amount) is None:
        return f"Not saved: {amount!r} is not a valid amount. Use digits like 80000, or ask the user how much it was."
    # Rule: never assume the payment method.
    if not evidence_in(payment_evidence, ctx.user_text):
        return (
            "Not saved: the user never said how they paid or where the money went. Do not guess. "
            f"Ask them. Their options are: {payment_options(ctx, kind)}."
        )
    if payment is None:
        return (
            f"Not saved: {payment_code!r} is not one of the user's accounts. Use the code of the account the user "
            f"named. Their options are: {payment_options(ctx, kind)}."
        )

    problem = check_accounts(kind, category, payment)
    _, category_types, payment_types = KINDS[kind]
    if problem == "category":
        return (
            f"Not saved: {category.code} {category.name} is a {category.account_type} account, but for {kind} "
            f"the category must be {_types(category_types)}. Pick another account or ask the user."
        )
    if problem == "payment":
        return (
            f"Not saved: {payment.code} {payment.name} cannot be the payment account for {kind} "
            f"(it must be {_types(payment_types)} and different from the category). "
            f"Their options are: {payment_options(ctx, kind)}."
        )

    try:
        applied = date.fromisoformat(applied_date) if applied_date else ctx.today
    except ValueError:
        return "Not saved: applied_date must be YYYY-MM-DD, or null for today."

    return StagedMovement(
        kind=kind,
        amount=parse_amount(amount),
        category=category,
        payment=payment,
        applied_date=applied,
        supplier=(supplier or "").strip()[:255],
        # Every entry gets a description; without one from the model, the user's own words for the category.
        description=(description or "").strip() or category_evidence.strip().capitalize(),
    )


def check_proposal(ctx: ChatContext, *, parent_code, name, role):
    """The proposal dict to stage when it is valid, otherwise a str telling the model what to do."""
    if ctx.pending_account or ctx.effects.proposal:
        return "Not proposed: a new-account card is already waiting for the user's answer. Wait for it."
    group = next((group for group in ctx.groups if group.code == (parent_code or "").strip()), None)
    if group is None:
        return f"Not proposed: {parent_code!r} is not one of the groups. Use a group code from the list."
    allowed = PROPOSAL_TYPES.get(role)
    if allowed is None:
        return 'Not proposed: role must be "category" or "payment".'
    if group.account_type not in allowed:
        return f"Not proposed: a {role} account can't go under {group.code} {group.name} ({group.account_type})."
    name = (name or "").strip()[:100]
    if not name:
        return "Not proposed: give the new account a short name, like the existing ones."
    existing = ctx.children[group.code].get(name.lower())
    if existing:
        return f"Not proposed: {existing} {name} already exists. Use that account."
    return {
        "parent_code": group.code,
        "parent_name": group.name,
        "account_type": group.account_type,
        "code": ctx.next_codes[group.code],
        "name": name,
        "role": role,
    }
