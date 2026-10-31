import uuid
from datetime import date
from decimal import Decimal
from typing import Any
from unittest import mock

import httpx
from django.test import SimpleTestCase, TestCase, override_settings
from django.urls import reverse
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from pydantic import Field
from rest_framework.test import APITestCase

from financial_accounts.models import AccountType, FinancialAccount
from financial_accounts.provisioning import seed_default_chart
from financial_accounts.services import child_code, create_child_account
from transactions.models import Transaction
from users.testing import FirebaseAuthMixin

from . import views
from .context import StagedMovement, load_context
from .models import Conversation, ConversationMemory, Message
from .movements import KINDS, build_lines, check_accounts, evidence_in, parse_amount
from .rules import check_movement, check_proposal

USER = "chat-user"
OTHER = "other-user"
TODAY = "2026-10-27"


class FakeToolModel(GenericFakeChatModel):
    """A chat model that replays scripted AIMessages (text or tool calls) and records what it was sent."""

    calls: list = Field(default_factory=list)
    error: Exception | None = None

    def bind_tools(self, tools: Any, **kwargs: Any):
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if self.error:
            raise self.error
        self.calls.append(list(messages))
        return super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)


def say(text):
    return AIMessage(content=text)


def call(tool, **args):
    return AIMessage(content="", tool_calls=[{"name": tool, "args": args, "id": uuid.uuid4().hex}])


def record(kind, amount, category, payment, category_evidence, payment_evidence, **extra):
    return call(
        "record_movement",
        kind=kind,
        amount=amount,
        category_code=category,
        payment_code=payment,
        category_evidence=category_evidence,
        payment_evidence=payment_evidence,
        **{"description": category_evidence, **extra},
    )


def tool_results(model):
    """Every tool result the model was shown, in order."""
    seen = []
    for messages in model.calls:
        for message in messages:
            if isinstance(message, ToolMessage) and message.content not in seen:
                seen.append(message.content)
    return seen


class ChatApiTests(FirebaseAuthMixin, APITestCase):
    def setUp(self):
        super().setUp()
        seed_default_chart(USER)
        self.authenticate(USER)
        self.conversation = Conversation.objects.create(user_id=USER)
        self.messages_url = reverse("chat-messages", args=[self.conversation.pk])
        self.proposal_url = reverse("chat-account-proposal", args=[self.conversation.pk])

    def use_model(self, *replies, error=None):
        model = FakeToolModel(messages=iter(replies), error=error)
        patcher = mock.patch("ai_chat.agent.get_chat_model", return_value=model)
        patcher.start()
        self.addCleanup(patcher.stop)
        return model

    def send(self, content, conversation=None, **extra):
        url = reverse("chat-messages", args=[(conversation or self.conversation).pk])
        return self.client.post(url, {"content": content, "today": TODAY, **extra}, format="json")

    def account(self, code, user_id=USER):
        return FinancialAccount.objects.get(user_id=user_id, code=code)

    # --- the three rules, enforced by the tools ---------------------------------------------------

    def test_a_question_saves_nothing(self):
        self.use_model(say("¿Cómo pagaste?"))

        response = self.send("Pagué 80.000 de gasolina")

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual([m["role"] for m in response.data["messages"]], ["user", "assistant"])
        self.assertEqual(response.data["messages"][1]["content"], "¿Cómo pagaste?")
        self.assertIsNone(response.data["transaction"])

    def test_a_payment_method_the_user_never_named_is_refused(self):
        # The model guesses the Nubank card; the tool refuses and the model asks.
        model = self.use_model(
            record("expense", "80000", "513503", "210502", "gasolina", "tarjeta Nubank"),
            say("¿Cómo pagaste?"),
        )

        response = self.send("Pagué 80.000 de gasolina")

        self.assertEqual(response.data["messages"][1]["content"], "¿Cómo pagaste?")
        self.assertIsNone(response.data["transaction"])
        self.assertFalse(Transaction.objects.exists())
        result = tool_results(model)[0]
        self.assertIn("never said how they paid", result)
        self.assertIn("Tarjeta de Crédito Nubank", result)  # the options to offer

    def test_a_category_the_user_never_named_is_refused(self):
        model = self.use_model(
            record("expense", "50000", "512501", "110505", "almuerzo", "efectivo"),
            say("¿En qué fue?"),
        )

        self.send("Gasté 50 mil en efectivo")

        self.assertFalse(Transaction.objects.exists())
        self.assertIn("what this was for", tool_results(model)[0])

    def test_records_a_complete_expense_as_a_balanced_entry(self):
        self.use_model(
            say("¿Cómo pagaste?"),
            record("expense", "80000", "513503", "210502", "gasolina", "nubank", supplier="Terpel",
                   description="Gasolina en Terpel"),
            say("¡Listo! Guardé la gasolina."),
        )
        self.send("Pagué 80.000 de gasolina en Terpel")

        response = self.send("Con la tarjeta Nubank")

        self.assertEqual(response.status_code, 201, response.data)
        entry = Transaction.objects.get(user_id=USER)
        self.assertEqual((entry.numbering, entry.supplier, str(entry.applied_date)), ("0001", "Terpel", TODAY))
        self.assertEqual(entry.description, "Gasolina en Terpel")
        lines = {line.account.code: (line.debit, line.credit) for line in entry.ledger_entries.select_related("account")}
        self.assertEqual(lines, {"513503": (Decimal("80000"), 0), "210502": (0, Decimal("80000"))})
        reply = Message.objects.get(pk=response.data["messages"][1]["id"])
        self.assertEqual(entry.message, reply)
        self.assertEqual(reply.content, "¡Listo! Guardé la gasolina.")
        self.assertEqual(reply.data["numbering"], "0001")
        self.assertEqual(reply.data["description"], "Gasolina en Terpel")
        self.assertEqual(reply.data["debit"], {"code": "513503", "name": "Gasolina"})
        self.assertEqual(response.data["transaction"]["total_debit"], "80000.00")

    def test_only_one_entry_per_turn(self):
        model = self.use_model(
            record("expense", "80000", "513503", "210502", "gasolina", "nubank"),
            record("expense", "80000", "513503", "210502", "gasolina", "nubank"),
            say("Guardado."),
        )

        self.send("Gasolina 80.000 con la Nubank")

        self.assertEqual(Transaction.objects.count(), 1)
        self.assertIn("already saved in this turn", tool_results(model)[-1])

    def test_wrong_account_type_and_other_users_accounts_are_refused(self):
        seed_default_chart(OTHER)
        create_child_account(self.account("5135", OTHER), "Taxi")  # 513504 exists only for OTHER
        model = self.use_model(
            record("expense", "100000", "413505", "110505", "salario", "efectivo"),  # an income account
            record("expense", "25000", "513504", "110505", "taxi", "efectivo"),
            say("¿Qué cuenta uso?"),
        )

        self.send("Me pagaron el salario y un taxi, todo en efectivo")

        self.assertFalse(Transaction.objects.exists())
        first, second = tool_results(model)
        self.assertIn("category must be EXPENSE", first)
        self.assertIn("'513504' is not one of the user's accounts", second)

    # --- account proposals ----------------------------------------------------------------------

    def test_accepting_a_proposal_creates_the_account_and_records(self):
        model = self.use_model(
            call("propose_new_account", parent_code="5135", name="Taxi", role="category"),
            say("No tienes cuenta de taxi. ¿La creo?"),
            record("expense", "25000", "513504", "110505", "taxi", "efectivo"),
            say("Listo, guardé el taxi."),
        )
        response = self.send("Tomé un taxi por 25.000 y pagué en efectivo")
        card = response.data["messages"][1]["data"]
        self.assertEqual((card["type"], card["code"], card["name"], card["status"]), ("account_proposal", "513504", "Taxi", "pending"))
        self.assertFalse(FinancialAccount.objects.filter(user_id=USER, code="513504").exists())

        response = self.client.post(self.proposal_url, {"accept": True, "today": TODAY}, format="json")

        self.assertEqual(response.status_code, 200, response.data)
        taxi = self.account("513504")
        self.assertEqual((taxi.level, taxi.account_type, taxi.nature, taxi.can_receive_movement), (4, AccountType.EXPENSE, "DEBIT", True))
        self.assertEqual(response.data["messages"][0]["content"], "Creé la cuenta 513504 Taxi.")
        self.assertEqual(response.data["transaction"]["numbering"], "0001")
        self.assertEqual(Message.objects.get(data__type="account_proposal").data["status"], "accepted")
        self.conversation.refresh_from_db()
        self.assertIsNone(self.conversation.pending_account)
        # The tap reached the agent as a turn, but it is not a stored user message.
        self.assertIn("I tapped Create account", model.calls[2][-1].content)
        self.assertEqual(Message.objects.filter(role="user").count(), 1)

    def test_declining_a_proposal_creates_nothing(self):
        model = self.use_model(
            call("propose_new_account", parent_code="5135", name="Taxi", role="category"),
            say("¿La creo?"),
            say("¿Qué cuenta existente uso?"),
        )
        self.send("Tomé un taxi por 25.000 y pagué en efectivo")

        response = self.client.post(self.proposal_url, {"accept": False}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(FinancialAccount.objects.filter(user_id=USER, code="513504").exists())
        self.assertIn("I tapped No", model.calls[-1][-1].content)
        self.assertEqual(Message.objects.get(data__type="account_proposal").data["status"], "declined")

    def test_answering_without_a_pending_proposal_is_a_400(self):
        response = self.client.post(self.proposal_url, {"accept": True}, format="json")

        self.assertEqual(response.status_code, 400)

    # --- memory ---------------------------------------------------------------------------------

    def test_the_agent_remembers_the_conversation(self):
        model = self.use_model(say("¿Cómo pagaste?"), say("Entendido."))
        self.send("Pagué 80.000 de gasolina")

        self.send("Con la Nubank")

        second_call = model.calls[1]
        contents = [message.content for message in second_call if not isinstance(message, SystemMessage)]
        self.assertEqual(contents, ["Pagué 80.000 de gasolina", "¿Cómo pagaste?", "Con la Nubank"])

    def test_each_conversation_has_its_own_memory(self):
        model = self.use_model(say("¿Cómo pagaste?"), say("¡Hola!"))
        self.send("Pagué 80.000 de gasolina")
        other = Conversation.objects.create(user_id=USER)

        self.send("Hola", conversation=other)

        contents = [message.content for message in model.calls[1] if not isinstance(message, SystemMessage)]
        self.assertEqual(contents, ["Hola"])

    @override_settings(CHAT_SUMMARY_TRIGGER_TOKENS=60, CHAT_SUMMARY_KEEP_MESSAGES=2)
    def test_long_conversations_are_summarized(self):
        model = self.use_model(
            say("¿Cómo pagaste la gasolina?"),
            say("Resumen: gasolina de 80000 pendiente del medio de pago."),  # the summarizer's answer
            say("Gracias, ¿con qué tarjeta?"),
        )
        self.send("Pagué 80.000 de gasolina en la estación Terpel de la avenida, " * 6)

        self.send("Con tarjeta")

        summary = ConversationMemory.objects.get(conversation=self.conversation).summary
        self.assertIn("Resumen: gasolina de 80000", summary)
        # The last model call saw the summary instead of the long first message.
        last = [message.content for message in model.calls[-1] if isinstance(message, HumanMessage)]
        self.assertTrue(any("Resumen" in content for content in last), last)
        self.assertFalse(any("avenida" in content for content in last), last)

    def test_the_prompt_has_the_users_accounts(self):
        model = self.use_model(say("¿Cómo pagaste?"))

        self.send("Pagué 80.000 de gasolina")

        system = model.calls[0][0]
        self.assertIsInstance(system, SystemMessage)
        self.assertIn("Today is 2026-10-27.", system.content)
        self.assertIn("513503 | Gasolina | EXPENSE", system.content)
        self.assertIn("5135 | Servicios | EXPENSE", system.content)

    # --- API robustness ---------------------------------------------------------------------------

    def test_model_down_is_a_503_and_keeps_the_user_message(self):
        self.use_model(error=httpx.ConnectError("no route"))

        response = self.send("Pagué 80.000 de gasolina")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data, views.UNAVAILABLE)
        self.assertEqual(list(Message.objects.values_list("role", flat=True)), ["user"])

    def test_an_empty_answer_asks_to_rephrase(self):
        self.use_model(say(""))

        response = self.send("Hello")

        self.assertEqual(response.data["messages"][1]["content"], "Sorry, I didn't get that. Could you say it in other words?")

    def test_a_retried_request_is_not_run_twice(self):
        model = self.use_model(
            record("expense", "80000", "513503", "210502", "gasolina", "nubank"),
            say("Guardado."),
        )
        client_id = str(uuid.uuid4())

        first = self.send("Gasolina 80.000 con la Nubank", client_id=client_id)
        second = self.send("Gasolina 80.000 con la Nubank", client_id=client_id)

        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.data["messages"], first.data["messages"])
        self.assertEqual(second.data["transaction"]["id"], first.data["transaction"]["id"])
        self.assertEqual(Transaction.objects.count(), 1)
        self.assertEqual(len(model.calls), 2)  # one turn: the tool call and the final answer

    def test_conversations_are_per_user(self):
        Conversation.objects.create(user_id=OTHER)

        listing = self.client.get(reverse("chat-conversations"))
        created = self.client.post(reverse("chat-conversations"))
        foreign = Conversation.objects.get(user_id=OTHER)
        history = self.client.get(reverse("chat-messages", args=[foreign.pk]))

        self.assertEqual([c["id"] for c in listing.data], [str(self.conversation.pk)])
        self.assertEqual(created.status_code, 201)
        self.assertEqual(history.status_code, 404)

    def test_requires_a_token(self):
        self.client.credentials()

        self.assertEqual(self.send("hola").status_code, 401)


class RuleTests(TestCase):
    """The checks behind the tools, on a real snapshot of a seeded user."""

    def setUp(self):
        seed_default_chart(USER)
        conversation = Conversation.objects.create(user_id=USER)
        Message.objects.create(conversation=conversation, role="user", content="Pagué la gasolina con la Nubank")
        self.ctx = load_context(conversation, date(2026, 10, 27))

    def check(self, **overrides):
        args = {
            "kind": "expense",
            "amount": "80000",
            "category_code": "513503",
            "payment_code": "210502",
            "category_evidence": "gasolina",
            "payment_evidence": "Nubank",
            **overrides,
        }
        return check_movement(self.ctx, **args)

    def test_a_valid_movement_is_staged(self):
        result = self.check(applied_date="2026-10-20", supplier=" Terpel ")

        self.assertIsInstance(result, StagedMovement)
        self.assertEqual((result.category.code, result.payment.code), ("513503", "210502"))
        self.assertEqual((result.amount, str(result.applied_date), result.supplier), (Decimal("80000"), "2026-10-20", "Terpel"))

    def test_description_falls_back_to_the_users_words(self):
        self.assertEqual(self.check(description="Gasolina para la moto").description, "Gasolina para la moto")
        self.assertEqual(self.check(description="  ").description, "Gasolina")

    def test_each_rule_has_its_message(self):
        cases = {
            "kind must be one of": {"kind": "theft"},
            "what this was for": {"category_evidence": "almuerzo"},
            "is not one of the user's accounts": {"category_code": "9999"},
            "not a valid amount": {"amount": "mucho"},
            "never said how they paid": {"payment_evidence": "efectivo"},
            "cannot be the payment account": {"payment_code": "513503"},
            "applied_date must be": {"applied_date": "ayer"},
        }
        for expected, overrides in cases.items():
            with self.subTest(expected):
                self.assertIn(expected, self.check(**overrides))

    def test_proposals(self):
        proposal = check_proposal(self.ctx, parent_code="5135", name="Taxi", role="category")
        self.assertEqual((proposal["code"], proposal["parent_name"]), ("513504", "Servicios"))
        self.assertIn("already exists", check_proposal(self.ctx, parent_code="5135", name="gasolina", role="category"))
        self.assertIn("not one of the groups", check_proposal(self.ctx, parent_code="51", name="Taxi", role="category"))
        self.assertIn("can't go under", check_proposal(self.ctx, parent_code="5135", name="Daviplata", role="payment"))
        self.ctx.pending_account = proposal
        self.assertIn("already waiting", check_proposal(self.ctx, parent_code="5155", name="Hotel", role="category"))

    def test_next_code_counts_every_sibling(self):
        # 1225 has two children both named "CDT Bancolombia" (122505 and 122510); the next code must follow the highest.
        self.assertEqual(self.ctx.next_codes["1225"], "122511")
        self.assertEqual(child_code("5135", ["513501", "513503"]), "513504")

    def test_a_full_group_takes_no_proposals(self):
        self.ctx.next_codes["5135"] = None  # all 99 slots used
        self.assertIn("is full", check_proposal(self.ctx, parent_code="5135", name="Taxi", role="category"))


class MovementTests(SimpleTestCase):
    def account(self, pk, account_type):
        return FinancialAccount(pk=uuid.UUID(int=pk), code=str(pk), name=str(pk), account_type=account_type)

    def test_every_kind_is_balanced_and_debits_the_right_side(self):
        for kind, (debit_side, category_types, payment_types) in KINDS.items():
            category = self.account(1, next(iter(category_types)))
            payment = self.account(2, next(iter(payment_types)))
            debit, credit = build_lines(kind, category, payment, Decimal("1500.5"))
            self.assertEqual((debit["debit"], debit["credit"]), ("1500.50", "0"), kind)
            self.assertEqual((credit["debit"], credit["credit"]), ("0", "1500.50"), kind)
            expected = category if debit_side == "category" else payment
            self.assertEqual(debit["account"], str(expected.pk), kind)
            self.assertIsNone(check_accounts(kind, category, payment), kind)

    def test_kind_table(self):
        sides = {kind: spec[0] for kind, spec in KINDS.items()}
        self.assertEqual(
            sides,
            {
                "expense": "category",
                "gift_given": "category",
                "income": "payment",
                "gift_received": "payment",
                "loan_received": "payment",
                "loan_given": "category",
                "debt_payment": "category",
                "transfer": "category",
            },
        )

    def test_check_accounts_rejects_mismatches(self):
        expense = self.account(1, AccountType.EXPENSE)
        income = self.account(2, AccountType.INCOME)
        cash = self.account(3, AccountType.ASSET)
        card = self.account(4, AccountType.LIABILITY)
        self.assertIsNone(check_accounts("expense", expense, card))  # buying with a credit card
        self.assertEqual(check_accounts("expense", income, cash), "category")
        self.assertEqual(check_accounts("income", income, card), "payment")  # income can't land on a card
        self.assertEqual(check_accounts("transfer", cash, cash), "payment")  # same account twice

    def test_parse_amount(self):
        self.assertEqual(parse_amount("80000"), Decimal("80000"))
        self.assertEqual(parse_amount("80000.5"), Decimal("80000.5"))
        self.assertEqual(parse_amount("1.500.000"), Decimal("1500000"))
        self.assertEqual(parse_amount("$ 25.000,50"), Decimal("25000.50"))
        self.assertEqual(parse_amount("1500,5"), Decimal("1500.5"))
        for bad in ("", "0", "-5", "abc", "1.2.3", None):
            self.assertIsNone(parse_amount(bad), bad)

    def test_evidence_must_come_from_the_user(self):
        said = "Pagué con la tarjeta Nubank, fue gasolina"
        self.assertTrue(evidence_in("Nubank", said))
        self.assertTrue(evidence_in("tarjeta nubank", said))
        self.assertTrue(evidence_in("GASOLINA", said))
        self.assertFalse(evidence_in("efectivo", said))
        self.assertFalse(evidence_in("con la", said))  # only filler words
        self.assertFalse(evidence_in("", said))
        self.assertTrue(evidence_in("pagué en efectivo", "lo pague en EFECTIVO"))  # accents/case ignored
