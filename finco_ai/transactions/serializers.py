from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models import Sum
from rest_framework import serializers

from finco_ai.identity import get_user_id
from financial_accounts.models import FinancialAccount

from .models import LedgerEntry, Transaction

MONEY = {"max_digits": 18, "decimal_places": 2, "min_value": Decimal("0")}


class LedgerEntryLineSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=FinancialAccount.objects.all())
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_name = serializers.CharField(source="account.name", read_only=True)
    debit = serializers.DecimalField(**MONEY, required=False, default=Decimal("0"))
    credit = serializers.DecimalField(**MONEY, required=False, default=Decimal("0"))

    class Meta:
        model = LedgerEntry
        fields = ["id", "account", "account_code", "account_name", "debit", "credit"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        debit, credit = attrs["debit"], attrs["credit"]
        if debit > 0 and credit > 0:
            raise serializers.ValidationError("A line can have a debit or a credit, not both.")
        if debit == 0 and credit == 0:
            raise serializers.ValidationError("A line needs a debit or a credit amount.")
        return attrs


class TransactionSerializer(serializers.ModelSerializer):
    lines = LedgerEntryLineSerializer(many=True, source="ledger_entries", min_length=2)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "numbering",
            "created_at",
            "applied_date",
            "supplier",
            "description",
            "lines",
            "total_debit",
            "total_credit",
        ]
        read_only_fields = ["id", "numbering", "created_at"]
        extra_kwargs = {"applied_date": {"required": False}}

    def get_total_debit(self, obj):
        return self._money(sum((line.debit for line in obj.ledger_entries.all()), Decimal("0")))

    def get_total_credit(self, obj):
        return self._money(sum((line.credit for line in obj.ledger_entries.all()), Decimal("0")))

    @staticmethod
    def _money(value):
        return f"{value:.2f}"

    def validate_lines(self, lines):
        user_id = get_user_id(self.context["request"])
        for index, line in enumerate(lines, start=1):
            account = line["account"]
            if account.user_id != user_id:
                raise serializers.ValidationError(f"Line {index}: account not found.")
            if not account.can_receive_movement:
                raise serializers.ValidationError(
                    f"Line {index}: account {account.code} cannot receive movements."
                )
        return lines

    def validate(self, attrs):
        lines = attrs["ledger_entries"]
        total_debit = sum((line["debit"] for line in lines), Decimal("0"))
        total_credit = sum((line["credit"] for line in lines), Decimal("0"))
        if total_debit != total_credit:
            raise serializers.ValidationError(
                f"Entry is not balanced: debits {total_debit:.2f} vs credits {total_credit:.2f}."
            )
        return attrs

    def create(self, validated_data):
        lines = validated_data.pop("ledger_entries")
        user_id = get_user_id(self.context["request"])
        with db_transaction.atomic():
            # Lock the user's entries so two saves can't get the same number.
            existing = list(
                Transaction.objects.select_for_update()
                .filter(user_id=user_id)
                .values_list("numbering", flat=True)
            )
            next_number = max((int(n) for n in existing if n.isdigit()), default=0) + 1
            entry = Transaction.objects.create(
                user_id=user_id, numbering=f"{next_number:04d}", **validated_data
            )
            LedgerEntry.objects.bulk_create(
                LedgerEntry(transaction=entry, **line) for line in lines
            )
        return entry
