import uuid

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from finco_ai.identity import get_user_id
from finco_ai.months import date_param, date_range_param

from . import services


class IncomeStatementView(APIView):
    """GET /api/reports/income-statement/?from=YYYY-MM-DD&to=YYYY-MM-DD"""

    def get(self, request):
        start, end = date_range_param(request)
        return Response(services.income_statement(get_user_id(request), start, end))


class BalanceSheetView(APIView):
    """GET /api/reports/balance-sheet/?as_of=YYYY-MM-DD (default today)"""

    def get(self, request):
        as_of = date_param(request, "as_of", timezone.localdate())
        return Response(services.balance_sheet(get_user_id(request), as_of))


class JournalView(APIView):
    """GET /api/reports/journal/?from=&to= — libro diario."""

    def get(self, request):
        start, end = date_range_param(request)
        return Response(services.journal(get_user_id(request), start, end))


class GeneralLedgerView(APIView):
    """GET /api/reports/general-ledger/?from=&to=[&account=<id>] — libro mayor."""

    def get(self, request):
        start, end = date_range_param(request)
        raw = request.query_params.get("account")
        account_id = None
        if raw:
            try:
                account_id = uuid.UUID(raw)
            except ValueError:
                raise ValidationError({"account": "Unknown account."}) from None
        try:
            data = services.general_ledger(get_user_id(request), start, end, account_id)
        except services.UnknownAccount:
            raise ValidationError({"account": "Unknown account."}) from None
        return Response(data)
