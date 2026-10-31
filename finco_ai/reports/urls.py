from django.urls import path

from .views import BalanceSheetView, GeneralLedgerView, IncomeStatementView, JournalView

urlpatterns = [
    path("reports/income-statement/", IncomeStatementView.as_view(), name="report-income-statement"),
    path("reports/balance-sheet/", BalanceSheetView.as_view(), name="report-balance-sheet"),
    path("reports/journal/", JournalView.as_view(), name="report-journal"),
    path("reports/general-ledger/", GeneralLedgerView.as_view(), name="report-general-ledger"),
]
