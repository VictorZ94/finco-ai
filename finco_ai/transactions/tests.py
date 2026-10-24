from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from financial_accounts.models import AccountType, FinancialAccount, Nature
from users.testing import FirebaseAuthMixin

from .models import LedgerEntry, Transaction

USER = "test-user"


def make_account(code, nature=Nature.DEBIT, postable=True, user_id=USER):
    return FinancialAccount.objects.create(
        code=code,
        name=f"Account {code}",
        nature=nature,
        level=4 if postable else 3,
        account_type=AccountType.ASSET,
        can_receive_movement=postable,
        user_id=user_id,
    )


class TransactionApiTests(FirebaseAuthMixin, APITestCase):
    url = reverse("transaction-list")

    def setUp(self):
        super().setUp()
        self.authenticate(USER)
        self.expense = make_account("5125-01")
        self.card = make_account("2105-02", nature=Nature.CREDIT)
        self.group = make_account("5125", postable=False)
        self.foreign = make_account("9999-01", user_id="someone-else")

    def entry(self, lines=None, **extra):
        if lines is None:
            lines = [
                {"account": str(self.expense.id), "debit": "50000"},
                {"account": str(self.card.id), "credit": "50000"},
            ]
        return {"supplier": "Restaurante El Sabor", "lines": lines, **extra}

    def post(self, payload):
        return self.client.post(self.url, payload, format="json")

    def test_balanced_entry_is_saved(self):
        response = self.post(self.entry())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["numbering"], "0001")
        self.assertEqual(response.data["applied_date"], timezone.localdate().isoformat())
        self.assertIsNotNone(response.data["created_at"])
        self.assertEqual(response.data["supplier"], "Restaurante El Sabor")
        self.assertEqual(response.data["total_debit"], "50000.00")
        self.assertEqual(response.data["total_credit"], "50000.00")
        self.assertEqual(len(response.data["lines"]), 2)
        self.assertEqual(Transaction.objects.get().user_id, USER)

    def test_numbering_is_sequential(self):
        self.post(self.entry())
        response = self.post(self.entry())

        self.assertEqual(response.data["numbering"], "0002")

    def test_applied_date_is_editable(self):
        response = self.post(self.entry(applied_date="2026-01-15"))

        self.assertEqual(response.data["applied_date"], "2026-01-15")

    def test_server_fields_are_ignored(self):
        response = self.post(
            self.entry(numbering="9999", created_at="2000-01-01T00:00:00Z")
        )

        self.assertEqual(response.data["numbering"], "0001")
        self.assertFalse(response.data["created_at"].startswith("2000"))

    def test_supplier_is_optional(self):
        payload = self.entry()
        del payload["supplier"]

        response = self.post(payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["supplier"], "")

    def assert_rejected(self, lines):
        response = self.post(self.entry(lines=lines))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Transaction.objects.count(), 0)
        return response

    def test_unbalanced_entry_is_rejected(self):
        response = self.assert_rejected([
            {"account": str(self.expense.id), "debit": "50000"},
            {"account": str(self.card.id), "credit": "40000"},
        ])
        self.assertIn("not balanced", str(response.data))

    def test_line_with_debit_and_credit_is_rejected(self):
        self.assert_rejected([
            {"account": str(self.expense.id), "debit": "100", "credit": "100"},
            {"account": str(self.card.id), "credit": "0"},
        ])

    def test_line_without_amount_is_rejected(self):
        self.assert_rejected([
            {"account": str(self.expense.id), "debit": "100"},
            {"account": str(self.card.id), "credit": "100"},
            {"account": str(self.card.id)},
        ])

    def test_single_line_is_rejected(self):
        self.assert_rejected([{"account": str(self.expense.id), "debit": "100"}])

    def test_negative_amount_is_rejected(self):
        self.assert_rejected([
            {"account": str(self.expense.id), "debit": "-100"},
            {"account": str(self.card.id), "credit": "-100"},
        ])

    def test_non_postable_account_is_rejected(self):
        self.assert_rejected([
            {"account": str(self.group.id), "debit": "100"},
            {"account": str(self.card.id), "credit": "100"},
        ])

    def test_other_users_account_is_rejected(self):
        self.assert_rejected([
            {"account": str(self.foreign.id), "debit": "100"},
            {"account": str(self.card.id), "credit": "100"},
        ])

    def test_list_returns_only_own_entries_with_totals(self):
        self.post(self.entry())
        Transaction.objects.create(user_id="someone-else", numbering="0001")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["total_debit"], "50000.00")
        self.assertEqual(response.data[0]["lines"][0]["account_code"], "5125-01")


class LedgerEntryConstraintTests(TestCase):
    """The database enforces the line rules even when the API is bypassed."""

    def setUp(self):
        self.account = make_account("1105-05")
        self.entry = Transaction.objects.create(user_id=USER, numbering="0001")

    def assert_db_rejects(self, debit, credit):
        with self.assertRaises(IntegrityError), transaction.atomic():
            LedgerEntry.objects.create(
                transaction=self.entry, account=self.account, debit=debit, credit=credit
            )

    def test_debit_and_credit_together(self):
        self.assert_db_rejects(Decimal("10"), Decimal("10"))

    def test_zero_line(self):
        self.assert_db_rejects(Decimal("0"), Decimal("0"))

    def test_negative_amount(self):
        self.assert_db_rejects(Decimal("-10"), Decimal("0"))


class AccountApiTests(FirebaseAuthMixin, APITestCase):
    def test_postable_filter_returns_only_leaf_accounts(self):
        self.authenticate(USER)
        make_account("5125", postable=False)
        make_account("5125-01")
        make_account("5125-02", user_id="someone-else")

        url = reverse("account-list")
        all_codes = [a["code"] for a in self.client.get(url).data]
        postable_codes = [a["code"] for a in self.client.get(url, {"postable": "true"}).data]

        self.assertEqual(all_codes, ["5125", "5125-01"])
        self.assertEqual(postable_codes, ["5125-01"])
