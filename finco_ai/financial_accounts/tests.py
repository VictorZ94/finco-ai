from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from dashboard.tests import post_entry
from users.testing import FirebaseAuthMixin

from .models import FinancialAccount
from .provisioning import seed_default_chart
from .services import child_code, create_child_account

USER = "puc-user"
OTHER = "other-user"


class ChildCodeTests(SimpleTestCase):
    def test_next_two_digit_suffix(self):
        self.assertEqual(child_code("5135", ["513501", "513503"]), "513504")

    def test_first_child(self):
        self.assertEqual(child_code("5135", []), "513501")

    def test_ignores_codes_of_other_parents(self):
        self.assertEqual(child_code("5135", ["513599x", "51350", "514099"]), "513501")

    def test_full_parent_raises(self):
        with self.assertRaises(ValueError):
            child_code("5135", ["513599"])


class DefaultChartTests(APITestCase):
    def test_sub_accounts_use_six_digit_codes(self):
        seed_default_chart(USER)
        for account in FinancialAccount.objects.filter(user_id=USER):
            self.assertEqual(len(account.code), {1: 1, 2: 2, 3: 4, 4: 6}[account.level], account.code)
            if account.parent_id:
                self.assertTrue(account.code.startswith(account.parent.code), account.code)

    def test_new_child_account_gets_next_code(self):
        seed_default_chart(USER)
        parent = FinancialAccount.objects.get(user_id=USER, code="5135")
        self.assertEqual(create_child_account(parent, "Taxi").code, "513504")


class ChartBalancesTests(FirebaseAuthMixin, APITestCase):
    url = reverse("account-balances")

    def setUp(self):
        super().setUp()
        seed_default_chart(USER)
        seed_default_chart(OTHER)
        self.authenticate(USER)

    def balances(self, month):
        response = self.client.get(self.url, {"month": month})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return {row["code"]: row for row in response.data["accounts"]}

    def balance(self, rows, code):
        return Decimal(rows[code]["balance"])

    def test_every_parent_adds_up_its_children(self):
        post_entry(USER, date(2026, 10, 1), "111010", "413505", "3000000")  # salary to Bancolombia
        post_entry(USER, date(2026, 10, 2), "111015", "413505", "200000")  # income to Nubank
        post_entry(USER, date(2026, 10, 3), "110505", "111010", "100000")  # cash withdrawal
        post_entry(USER, date(2026, 10, 4), "512501", "210502", "50000")  # lunch on the card

        rows = self.balances("2026-10")

        self.assertEqual(self.balance(rows, "1110"), Decimal("3100000"))  # 2.9M + 200k
        self.assertEqual(self.balance(rows, "11"), Decimal("3200000"))  # Caja 100k + Bancos
        self.assertEqual(self.balance(rows, "1"), Decimal("3200000"))
        self.assertEqual(self.balance(rows, "2"), Decimal("50000"))  # CREDIT nature: positive
        self.assertEqual(self.balance(rows, "4"), Decimal("3200000"))
        self.assertEqual(self.balance(rows, "5"), Decimal("50000"))
        for code, row in rows.items():
            children = [r for r in rows.values() if r["parent_id"] == row["id"]]
            if children:
                self.assertEqual(Decimal(row["debit"]), sum(Decimal(c["debit"]) for c in children), code)
                self.assertEqual(Decimal(row["credit"]), sum(Decimal(c["credit"]) for c in children), code)

    def test_balance_is_as_of_month_end(self):
        post_entry(USER, date(2026, 9, 30), "111010", "413505", "1000")
        post_entry(USER, date(2026, 11, 1), "111010", "413505", "999")

        self.assertEqual(self.balance(self.balances("2026-09"), "1"), Decimal("1000"))
        self.assertEqual(self.balance(self.balances("2026-10"), "1"), Decimal("1000"))
        self.assertEqual(self.balance(self.balances("2026-11"), "1"), Decimal("1999"))

    def test_only_own_accounts_and_entries(self):
        post_entry(OTHER, date(2026, 10, 1), "111010", "413505", "777")

        response = self.client.get(self.url, {"month": "2026-10"})

        ids = {str(pk) for pk in FinancialAccount.objects.filter(user_id=USER).values_list("pk", flat=True)}
        self.assertEqual({row["id"] for row in response.data["accounts"]}, ids)
        self.assertTrue(all(row["balance"] == "0.00" for row in response.data["accounts"]))

    def test_bad_month_is_400(self):
        response = self.client.get(self.url, {"month": "2026-13"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_auth(self):
        self.client.credentials()
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)
