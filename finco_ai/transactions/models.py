import uuid

from django.db import models
from django.utils import timezone


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numbering = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user_id = models.CharField(max_length=128, db_index=True)  # Firebase UID
    # TODO: swap for a ForeignKey(on_delete=CASCADE) once the Message model exists
    message_id = models.UUIDField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "transactions"

    def __str__(self):
        return f"{self.numbering} - {self.description or ''}".strip(" -")


class LedgerEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    debit = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )
    account = models.ForeignKey(
        "financial_accounts.FinancialAccount",
        on_delete=models.CASCADE,
        related_name="ledger_entries",
    )

    class Meta:
        db_table = "ledger_entries"

    def __str__(self):
        return f"{self.account}: D {self.debit} / C {self.credit}"
