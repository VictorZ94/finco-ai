from datetime import date
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from financial_accounts.models import FinancialAccount
from financial_accounts.provisioning import seed_default_chart
from transactions.models import LedgerEntry, Transaction
from users.testing import FirebaseAuthMixin

USER = "dash-user"
OTHER = "other-user"


def post_entry(user_id, applied_date, debit_code, credit_code, amount):
    """Write a balanced 2-line entry directly (the ledger API rules are tested elsewhere)."""
    accounts = FinancialAccount.objects.filter(user_id=user_id)
    count = Transaction.objects.filter(user_id=user_id).count()
    entry = Transaction.objects.create(user_id=user_id, numbering=f"{count + 1:04d}", applied_date=applied_date)
    LedgerEntry.objects.create(transaction=entry, account=accounts.get(code=debit_code), debit=Decimal(amount))
    LedgerEntry.objects.create(transaction=entry, account=accounts.get(code=credit_code), credit=Decimal(amount))


class DashboardSummaryTests(FirebaseAuthMixin, APITestCase):
    url = reverse("dashboard-summary")

    def setUp(self):
        super().setUp()
        seed_default_chart(USER)
        self.authenticate(USER)

    def summary(self, month):
        response = self.client.get(self.url, {"month": month})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def test_new_user_gets_zeros(self):
        data = self.summary("2026-10")

        for key in ("income", "expenses", "net", "assets", "liabilities", "net_worth"):
            self.assertEqual(data[key], "0.00", key)
        self.assertEqual(len(data["trend"]), 6)

    def test_month_figures_and_previous_month(self):
        post_entry(USER, date(2026, 10, 1), "111010", "413505", "3000000")  # salary to Bancolombia
        post_entry(USER, date(2026, 10, 15), "512501", "210502", "50000")  # lunch on Nubank card
        post_entry(USER, date(2026, 9, 20), "512501", "210502", "80000")  # last month's lunch

        data = self.summary("2026-10")

        self.assertEqual(data["income"], "3000000.00")
        self.assertEqual(data["expenses"], "50000.00")
        self.assertEqual(data["net"], "2950000.00")
        self.assertEqual(data["previous"], {"month": "2026-09", "income": "0.00", "expenses": "80000.00"})

    def test_net_worth_is_balance_as_of_month_end(self):
        post_entry(USER, date(2026, 9, 1), "111010", "413505", "1000000")
        post_entry(USER, date(2026, 10, 5), "512501", "210502", "130000")
        post_entry(USER, date(2026, 11, 1), "111010", "413505", "999999")  # after October: excluded

        data = self.summary("2026-10")

        self.assertEqual(data["assets"], "1000000.00")
        self.assertEqual(data["liabilities"], "130000.00")
        self.assertEqual(data["net_worth"], "870000.00")
        self.assertEqual(self.summary("2026-09")["net_worth"], "1000000.00")

    def test_paying_a_card_moves_balances_but_is_not_an_expense(self):
        post_entry(USER, date(2026, 10, 1), "111010", "413505", "500000")
        post_entry(USER, date(2026, 10, 2), "512501", "210502", "100000")
        post_entry(USER, date(2026, 10, 3), "210502", "111010", "100000")  # pay the card from the bank

        data = self.summary("2026-10")

        self.assertEqual(data["expenses"], "100000.00")
        self.assertEqual(data["liabilities"], "0.00")
        self.assertEqual(data["net_worth"], "400000.00")

    def test_trend_covers_six_months_in_order_with_gaps_filled(self):
        post_entry(USER, date(2026, 5, 10), "111010", "413505", "100")
        post_entry(USER, date(2026, 8, 10), "512501", "110505", "40")
        post_entry(USER, date(2026, 4, 30), "111010", "413505", "999")  # before the window

        trend = self.summary("2026-10")["trend"]

        self.assertEqual([t["month"] for t in trend], ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"])
        self.assertEqual(trend[0], {"month": "2026-05", "income": "100.00", "expenses": "0.00"})
        self.assertEqual(trend[1], {"month": "2026-06", "income": "0.00", "expenses": "0.00"})
        self.assertEqual(trend[3]["expenses"], "40.00")

    def test_trend_crosses_year_boundary(self):
        post_entry(USER, date(2025, 11, 3), "512501", "110505", "70")

        trend = self.summary("2026-02")["trend"]

        self.assertEqual(trend[0]["month"], "2025-09")
        self.assertEqual(trend[2], {"month": "2025-11", "income": "0.00", "expenses": "70.00"})

    def test_uses_applied_date_not_created_at(self):
        # Created today, but applied to an earlier month.
        post_entry(USER, date(2025, 3, 15), "512501", "110505", "25000")

        self.assertEqual(self.summary("2025-03")["expenses"], "25000.00")
        self.assertEqual(self.summary("2026-10")["expenses"], "0.00")

    def test_excludes_other_users(self):
        seed_default_chart(OTHER)
        post_entry(OTHER, date(2026, 10, 1), "111010", "413505", "777")

        data = self.summary("2026-10")

        self.assertEqual(data["income"], "0.00")
        self.assertEqual(data["assets"], "0.00")

    def test_defaults_to_current_month(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertRegex(response.data["month"], r"^\d{4}-\d{2}$")

    def test_invalid_month_is_rejected(self):
        for bad in ["2026-13", "2026-1", "oct", "2026-00", "202610"]:
            response = self.client.get(self.url, {"month": bad})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, bad)

    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)
