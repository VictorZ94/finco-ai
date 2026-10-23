import uuid

from django.db import models
from django.utils import timezone


class Transaction(models.Model):
    """A journal entry: two or more balanced LedgerEntry lines."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Sequential per user ("0001", "0002", ...), assigned by the server.
    numbering = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)
    # Accounting date the movement applies to; editable by the user.
    applied_date = models.DateField(default=timezone.localdate)
    # Person or company that sold the goods or services.
    supplier = models.CharField(max_length=255, blank=True, default="")

    # created_at is the system "current date" of the entry; never user-editable.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user_id = models.CharField(max_length=128, db_index=True)  # Firebase UID
    # TODO: swap for a ForeignKey(on_delete=CASCADE) once the Message model exists
    message_id = models.UUIDField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "transactions"
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "numbering"], name="uniq_transaction_user_numbering"
            ),
        ]

    def __str__(self):
        return f"{self.numbering} - {self.description or ''}".strip(" -")


class LedgerEntry(models.Model):
    """One line of a journal entry: a debit OR a credit against one account."""

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
        on_delete=models.PROTECT,
        related_name="ledger_entries",
    )

    class Meta:
        db_table = "ledger_entries"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(debit__gte=0) & models.Q(credit__gte=0),
                name="ledger_entry_non_negative",
            ),
            models.CheckConstraint(
                condition=(
                    (models.Q(debit__gt=0) & models.Q(credit=0))
                    | (models.Q(credit__gt=0) & models.Q(debit=0))
                ),
                name="ledger_entry_debit_xor_credit",
            ),
        ]

    def __str__(self):
        return f"{self.account}: D {self.debit} / C {self.credit}"
