from django.db import migrations
from django.db.models import F, Func, Value


def to_six_digits(apps, schema_editor):
    """PUC sub-accounts: "1110-10" -> "111010"."""
    FinancialAccount = apps.get_model("financial_accounts", "FinancialAccount")
    FinancialAccount.objects.filter(code__contains="-").update(
        code=Func(F("code"), Value("-"), Value(""), function="REPLACE")
    )


def to_dashed(apps, schema_editor):
    """Reverse: level-4 "111010" -> "1110-10"."""
    FinancialAccount = apps.get_model("financial_accounts", "FinancialAccount")
    for account in FinancialAccount.objects.filter(level=4).exclude(code__contains="-"):
        account.code = f"{account.code[:4]}-{account.code[4:]}"
        account.save(update_fields=["code"])


class Migration(migrations.Migration):

    dependencies = [
        ("financial_accounts", "0002_code_unique_per_user_only"),
    ]

    operations = [
        migrations.RunPython(to_six_digits, to_dashed),
    ]
