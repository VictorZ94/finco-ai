from datetime import date

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from dashboard.tests import post_entry
from financial_accounts.models import FinancialAccount
from financial_accounts.provisioning import seed_default_chart
from users.testing import FirebaseAuthMixin

USER = "reports-user"
OTHER = "other-user"


class ReportTestCase(FirebaseAuthMixin, APITestCase):
    def setUp(self):
        super().setUp()
        seed_default_chart(USER)
        seed_default_chart(OTHER)
        self.authenticate(USER)
        post_entry(USER, date(2025, 12, 15), "111010", "310505", "1000000")  # capital, last year
        post_entry(USER, date(2025, 12, 20), "111010", "413505", "500000")  # income, last year
        post_entry(USER, date(2026, 10, 1), "111010", "413505", "3000000")  # salary
        post_entry(USER, date(2026, 10, 4), "512501", "210502", "50000")  # lunch on the card
        post_entry(USER, date(2026, 10, 5), "513503", "111010", "80000")  # petrol from the bank
        post_entry(USER, date(2026, 11, 2), "512501", "111010", "999")  # after the period
        post_entry(OTHER, date(2026, 10, 1), "111010", "413505", "777")

    def get(self, name, **params):
        response = self.client.get(reverse(name), params)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data


def codes(node):
    """Every code in a statement tree, depth-first."""
    return [node["code"]] + [code for child in node["children"] for code in codes(child)]


class IncomeStatementTests(ReportTestCase):
    def test_period_totals_and_subtotals(self):
        data = self.get("report-income-statement", **{"from": "2026-10-01", "to": "2026-10-31"})

        self.assertEqual(data["total_income"], "3000000.00")
        self.assertEqual(data["total_expenses"], "130000.00")
        summary = data["summary"]
        self.assertEqual(summary["operating_income"], "3000000.00")
        self.assertEqual(summary["operating_expenses"], "130000.00")
        self.assertEqual(summary["operating_profit"], "2870000.00")
        self.assertEqual(summary["other_income"], "0.00")
        self.assertEqual(summary["net_income"], "2870000.00")
        # Zero rows are dropped; parents that hold movements stay.
        self.assertEqual(codes(data["expenses"]), ["5", "51", "5125", "512501", "5135", "513503"])

    def test_empty_period(self):
        data = self.get("report-income-statement", **{"from": "2026-01-01", "to": "2026-01-31"})
        self.assertIsNone(data["income"])
        self.assertEqual(data["summary"]["net_income"], "0.00")

    def test_bad_range_is_400(self):
        for params in ({"from": "2026-10-31", "to": "2026-10-01"}, {"from": "2026-13-01"}):
            with self.subTest(params):
                response = self.client.get(reverse("report-income-statement"), params)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class BalanceSheetTests(ReportTestCase):
    def test_balances_with_the_period_result(self):
        data = self.get("report-balance-sheet", as_of="2026-10-31")

        self.assertEqual(data["total_assets"], "4420000.00")  # 1M + 500k + 3M − 80k
        self.assertEqual(data["total_liabilities"], "50000.00")
        self.assertEqual(data["prior_results"], "500000.00")
        self.assertEqual(data["current_result"], "2870000.00")
        self.assertEqual(data["total_equity"], "4370000.00")  # capital 1M + results
        self.assertEqual(data["total_liabilities_and_equity"], "4420000.00")
        self.assertTrue(data["balanced"])
        self.assertEqual(codes(data["equity"]), ["3", "31", "3105", "310505"])

    def test_last_years_result_is_current_at_its_year_end(self):
        data = self.get("report-balance-sheet", as_of="2025-12-31")
        self.assertEqual((data["current_result"], data["prior_results"]), ("500000.00", "0.00"))
        self.assertTrue(data["balanced"])


class JournalTests(ReportTestCase):
    def test_entries_in_date_order_with_totals(self):
        data = self.get("report-journal", **{"from": "2026-10-01", "to": "2026-10-31"})

        self.assertEqual([e["applied_date"] for e in data["entries"]], ["2026-10-01", "2026-10-04", "2026-10-05"])
        self.assertEqual(len(data["entries"][0]["lines"]), 2)
        self.assertEqual((data["total_debit"], data["total_credit"]), ("3130000.00", "3130000.00"))


class GeneralLedgerTests(ReportTestCase):
    def test_opening_running_and_closing_balances(self):
        data = self.get("report-general-ledger", **{"from": "2026-10-01", "to": "2026-10-31"})
        bank = next(a for a in data["accounts"] if a["code"] == "111010")

        self.assertEqual(bank["opening"], "1500000.00")
        self.assertEqual([line["balance"] for line in bank["lines"]], ["4500000.00", "4420000.00"])
        self.assertEqual((bank["debit"], bank["credit"], bank["closing"]), ("3000000.00", "80000.00", "4420000.00"))
        card = next(a for a in data["accounts"] if a["code"] == "210502")
        self.assertEqual(card["closing"], "50000.00")  # CREDIT nature reads positive
        # Accounts with neither an opening balance nor movements are left out.
        self.assertNotIn("110505", [a["code"] for a in data["accounts"]])

    def test_one_account(self):
        bank = FinancialAccount.objects.get(user_id=USER, code="111010")
        data = self.get("report-general-ledger", account=str(bank.pk), **{"from": "2026-10-01", "to": "2026-10-31"})
        self.assertEqual([a["code"] for a in data["accounts"]], ["111010"])

    def test_someone_elses_account_is_400(self):
        theirs = FinancialAccount.objects.get(user_id=OTHER, code="111010")
        for account in (str(theirs.pk), "not-a-uuid"):
            with self.subTest(account):
                response = self.client.get(reverse("report-general-ledger"), {"account": account})
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthTests(ReportTestCase):
    def test_every_report_requires_auth(self):
        self.client.credentials()
        for name in ("report-income-statement", "report-balance-sheet", "report-journal", "report-general-ledger"):
            with self.subTest(name):
                self.assertEqual(self.client.get(reverse(name)).status_code, status.HTTP_401_UNAUTHORIZED)
