import uuid
from django.db import models

# Create your models here.
class Nature(models.TextChoices):
    DEBIT = "DEBIT", "Debit"
    CREDIT = "CREDIT", "Credit"

class AccountType(models.TextChoices):
    ASSET = "ASSET", "Asset"
    LIABILITY = "LIABILITY", "Liability"
    EQUITY = "EQUITY", "Equity"
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"

class FinancialAccount(models.Model):
    class Level(models.IntegerChoices):
        CLASE = 1, "Clase"
        GRUPO = 2, "Grupo"
        CUENTA = 3, "Cuenta"
        SUBCUENTA = 4, "Subcuenta"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20)  # e.g. "1", "11", "1105", "1105-05"; unique per user (see Meta)
    name = models.CharField(max_length=255)
    nature = models.CharField(max_length=20, choices=Nature.choices)
    level = models.PositiveSmallIntegerField(choices=Level.choices)

    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    account_type = models.CharField(max_length=20, choices=AccountType.choices)

    can_receive_movement = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    user_id = models.CharField(max_length=128, db_index=True)  # Firebase UID

    class Meta:
        db_table = "financial_accounts"
        constraints = [
            models.UniqueConstraint(
                fields=["user_id", "code"], name="uniq_financial_account_user_code"
            ),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"