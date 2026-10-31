"""What the tools may read during a turn, loaded up front in the request thread.

LangGraph runs tools in worker threads, where Django would open separate DB connections. So the tools
never touch the ORM: they check the user's request against this snapshot and *stage* what to save in
`effects`; ai_chat.agent writes it to the database after the agent finishes.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from financial_accounts.models import AccountType, FinancialAccount
from financial_accounts.services import child_code

from .models import Conversation, Message


@dataclass
class StagedMovement:
    kind: str
    amount: Decimal
    category: FinancialAccount
    payment: FinancialAccount
    applied_date: date
    supplier: str
    description: str


@dataclass
class Effects:
    """What the tools decided this turn; saved by the agent afterwards."""

    movement: StagedMovement | None = None
    proposal: dict | None = None


@dataclass
class ChatContext:
    user_id: str
    today: date
    postable: list  # the user's accounts that can receive movements, by code
    groups: list  # level-3 accounts where a new sub-account can go
    next_codes: dict  # group code -> the code a new sub-account would get
    children: dict  # group code -> {lowercased name: code} of its sub-accounts
    user_text: str  # everything the user wrote in this conversation: the only valid evidence
    pending_account: dict | None
    effects: Effects = field(default_factory=Effects)

    def postable_by_code(self):
        return {account.code: account for account in self.postable}


def load_context(conversation: Conversation, today: date) -> ChatContext:
    accounts = list(FinancialAccount.objects.filter(user_id=conversation.user_id).order_by("code"))
    groups = [
        account
        for account in accounts
        if account.level == FinancialAccount.Level.CUENTA and account.account_type != AccountType.EQUITY
    ]
    children = {
        group.code: {a.name.strip().lower(): a.code for a in accounts if a.parent_id == group.pk} for group in groups
    }
    # From every child's code (names may repeat, e.g. two "CDT Bancolombia" under 1225).
    next_codes = {
        group.code: child_code(group.code, [a.code for a in accounts if a.parent_id == group.pk]) for group in groups
    }
    user_text = "\n".join(
        conversation.messages.filter(role=Message.Role.USER).order_by("created_at").values_list("content", flat=True)
    )
    return ChatContext(
        user_id=conversation.user_id,
        today=today,
        postable=[account for account in accounts if account.can_receive_movement],
        groups=groups,
        next_codes=next_codes,
        children=children,
        user_text=user_text,
        pending_account=conversation.pending_account,
    )
