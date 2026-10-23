from django.urls import path

from .views import FinancialAccountListView

urlpatterns = [
    path("accounts/", FinancialAccountListView.as_view(), name="account-list"),
]
