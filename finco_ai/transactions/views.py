from rest_framework import generics

from finco_ai.identity import get_user_id

from .models import Transaction
from .serializers import TransactionSerializer


class TransactionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/transactions/ — the user's journal entries, newest first."""

    serializer_class = TransactionSerializer

    def get_queryset(self):
        return (
            Transaction.objects.filter(user_id=get_user_id(self.request))
            .prefetch_related("ledger_entries__account")
            .order_by("-created_at")
        )
