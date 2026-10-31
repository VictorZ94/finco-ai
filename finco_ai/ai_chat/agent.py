"""One chat turn with a LangChain agent (create_agent + tools + conversation memory).

The model talks to the user and calls tools; the tools check every bookkeeping rule against a snapshot
of the user's data and stage what to save (ai_chat.context). This module then writes it in the request
thread: the entry through TransactionSerializer (balance, ownership, numbering) and any account proposal.
"""

import json
import re

from django.conf import settings
from django.db import transaction as db_transaction
from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, SummarizationMiddleware, dynamic_prompt
from langchain_core.messages import AIMessage
from langgraph.errors import GraphRecursionError

from financial_accounts.models import FinancialAccount
from financial_accounts.services import create_child_account
from transactions.serializers import TransactionSerializer

from .context import ChatContext, load_context
from .llm import LLM_ERRORS, LLMUnavailable, get_chat_model
from .memory import open_checkpointer, save_summary
from .models import Message
from .movements import KINDS, build_lines, normalize
from .prompts import SUMMARY_PROMPT, SYSTEM_PROMPT, build_context
from .tools import TOOLS

# Model calls + tool calls per turn; a turn needing more is stuck in a loop.
RECURSION_LIMIT = 12

TEXTS = {
    "en": {
        "rephrase": "Sorry, I didn't get that. Could you say it in other words?",
        "saved": "Saved entry #{numbering}.",
        "save_failed": "I couldn't save that entry: {errors}",
        "created": "Created account {code} {name}.",
    },
    "es": {
        "rephrase": "Perdón, no te entendí. ¿Puedes decirlo de otra forma?",
        "saved": "Listo, guardé el asiento #{numbering}.",
        "save_failed": "No pude guardar el asiento: {errors}",
        "created": "Creé la cuenta {code} {name}.",
    },
}

_SPANISH_WORDS = {
    "de", "el", "la", "con", "que", "en", "por", "para", "mi", "pague", "compre", "gaste", "fue", "si",
    "tarjeta", "efectivo", "cuenta", "me", "un", "una", "gracias", "hola", "presto", "prestaron", "regalo",
}


def language(text):
    """"es" for Spanish-looking text, else "en" (only for the few messages the server writes itself)."""
    if re.search(r"[ñáéíóú¿¡]", (text or "").lower()):
        return "es"
    return "es" if set(normalize(text).split()) & _SPANISH_WORDS else "en"


class NoPendingProposal(Exception):
    pass


class TurnResult:
    def __init__(self, messages, transaction=None):
        self.messages = messages  # assistant messages created this turn
        self.transaction = transaction


@dynamic_prompt
def finco_prompt(request: ModelRequest) -> str:
    ctx: ChatContext = request.runtime.context
    return SYSTEM_PROMPT + "\n" + build_context(ctx.today, ctx.postable, ctx.groups, ctx.pending_account)


def build_agent(model, checkpointer):
    return create_agent(
        model,
        tools=TOOLS,
        middleware=[
            finco_prompt,
            # Memory stays small: older messages are replaced by a summary; recent ones are kept as they are.
            SummarizationMiddleware(
                model,
                trigger=("tokens", settings.CHAT_SUMMARY_TRIGGER_TOKENS),
                keep=("messages", settings.CHAT_SUMMARY_KEEP_MESSAGES),
                summary_prompt=SUMMARY_PROMPT,
            ),
        ],
        context_schema=ChatContext,
        checkpointer=checkpointer,
    )


def _final_text(messages):
    last = next((message for message in reversed(messages) if isinstance(message, AIMessage)), None)
    return last.text.strip() if last else ""


def run_turn(conversation, request, today, text=None, model=None):
    """Answer the user's latest message (or `text`, for button taps). Raises LLMUnavailable."""
    ctx = load_context(conversation, today)
    texts = TEXTS[language(ctx.user_text.rsplit("\n", 1)[-1])]
    if text is None:
        text = conversation.messages.filter(role=Message.Role.USER).latest("created_at").content

    state_messages = []
    try:
        with open_checkpointer() as checkpointer:
            agent = build_agent(model or get_chat_model(), checkpointer)
            state = agent.invoke(
                {"messages": [{"role": "user", "content": text}]},
                config={"configurable": {"thread_id": str(conversation.pk)}, "recursion_limit": RECURSION_LIMIT},
                context=ctx,
            )
            state_messages = state["messages"]
    except GraphRecursionError:
        ctx.effects.movement = None  # never save from a turn that didn't finish
        ctx.effects.proposal = None
    except LLM_ERRORS as error:
        raise LLMUnavailable(str(error)) from error

    save_summary(conversation, state_messages)
    reply = _final_text(state_messages)
    return _persist(conversation, request, ctx, reply, texts)


def _persist(conversation, request, ctx, reply, texts):
    """Write the assistant message plus whatever the tools staged, all or nothing."""
    movement, proposal = ctx.effects.movement, ctx.effects.proposal
    with db_transaction.atomic():
        message = Message.objects.create(
            conversation=conversation, role=Message.Role.ASSISTANT, content=reply or texts["rephrase"]
        )
        entry = None
        if movement:
            serializer = TransactionSerializer(
                data={
                    "applied_date": movement.applied_date.isoformat(),
                    "supplier": movement.supplier,
                    "description": movement.description,
                    "lines": build_lines(movement.kind, movement.category, movement.payment, movement.amount),
                },
                context={"request": request},
            )
            if serializer.is_valid():
                entry = serializer.save(message=message)
                debit, credit = (
                    (movement.category, movement.payment)
                    if KINDS[movement.kind][0] == "category"
                    else (movement.payment, movement.category)
                )
                message.data = {
                    "type": "recorded",
                    "transaction_id": str(entry.pk),
                    "numbering": entry.numbering,
                    "applied_date": entry.applied_date.isoformat(),
                    "supplier": entry.supplier,
                    "description": entry.description or "",
                    "amount": f"{movement.amount:.2f}",
                    "debit": {"code": debit.code, "name": debit.name},
                    "credit": {"code": credit.code, "name": credit.name},
                }
                if not reply:
                    message.content = texts["saved"].format(numbering=entry.numbering)
            else:
                # The tools checked everything the serializer does, so this means a bug: say so plainly.
                message.content = texts["save_failed"].format(errors=json.dumps(serializer.errors))
        elif proposal:
            conversation.pending_account = proposal
            conversation.save(update_fields=["pending_account", "updated_at"])
            message.data = {"type": "account_proposal", **proposal, "status": "pending"}
        message.save(update_fields=["content", "data", "updated_at"])
    return TurnResult(messages=[message], transaction=entry)


def answer_proposal(conversation, request, today, accept, model=None):
    """The user tapped Create account / No on the pending card; then the agent continues."""
    pending = conversation.pending_account
    if not pending:
        raise NoPendingProposal()
    card = (
        conversation.messages.filter(data__type="account_proposal", data__status="pending")
        .order_by("-created_at")
        .first()
    )
    notes = []
    with db_transaction.atomic():
        if accept:
            parent = FinancialAccount.objects.get(
                user_id=conversation.user_id, code=pending["parent_code"], level=FinancialAccount.Level.CUENTA
            )
            account = create_child_account(parent, pending["name"])
            texts = TEXTS[language(card.content if card else "")]
            notes.append(
                Message.objects.create(
                    conversation=conversation,
                    role=Message.Role.ASSISTANT,
                    content=texts["created"].format(code=account.code, name=account.name),
                )
            )
            # Told to the agent as the user's turn; not stored as a Message, so it isn't evidence of anything.
            tap = (
                f"(I tapped Create account: {account.code} {account.name} now exists. "
                "Record the pending movement with it if you have everything; otherwise ask what is missing.)"
            )
        else:
            tap = (
                f"(I tapped No: don't create {pending['code']} {pending['name']}. "
                "Ask me which existing account to use instead.)"
            )
        if card:
            card.data = {**card.data, "status": "accepted" if accept else "declined"}
            if accept:
                card.data["code"] = account.code
            card.save(update_fields=["data", "updated_at"])
        conversation.pending_account = None
        conversation.save(update_fields=["pending_account", "updated_at"])
    result = run_turn(conversation, request, today, text=tap, model=model)
    return TurnResult(messages=notes + result.messages, transaction=result.transaction)
