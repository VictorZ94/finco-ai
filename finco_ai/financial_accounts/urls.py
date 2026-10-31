from django.urls import path

from .views import ChartBalancesView, FinancialAccountListView

urlpatterns = [
    path("accounts/", FinancialAccountListView.as_view(), name="account-list"),
    path("accounts/balances/", ChartBalancesView.as_view(), name="account-balances"),
]
