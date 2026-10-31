from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from finco_ai.identity import get_user_id
from finco_ai.months import month_param

from .balances import build_chart_balances
from .models import FinancialAccount
from .serializers import FinancialAccountSerializer


class FinancialAccountListView(generics.ListAPIView):
    """GET /api/accounts/ — the user's chart of accounts; ?postable=true for leaf accounts only."""

    serializer_class = FinancialAccountSerializer

    def get_queryset(self):
        queryset = FinancialAccount.objects.filter(user_id=get_user_id(self.request))
        if self.request.query_params.get("postable") == "true":
            queryset = queryset.filter(can_receive_movement=True)
        return queryset.order_by("code")


class ChartBalancesView(APIView):
    """GET /api/accounts/balances/?month=YYYY-MM — the whole PUC tree with rolled-up balances."""

    def get(self, request):
        year, month = month_param(request)
        return Response(build_chart_balances(get_user_id(request), year, month))
