from rest_framework import generics

from finco_ai.identity import get_user_id

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
