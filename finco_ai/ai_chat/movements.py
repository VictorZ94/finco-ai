"""Turns a described movement into two balanced ledger lines. Pure functions, no DB writes."""

import re
import unicodedata
from decimal import Decimal, InvalidOperation

from financial_accounts.models import AccountType

ASSET, LIABILITY, INCOME, EXPENSE = AccountType.ASSET, AccountType.LIABILITY, AccountType.INCOME, AccountType.EXPENSE

# kind -> (which side is debited, allowed category types, allowed payment types).
# "category" is WHAT the money was for; "payment" is the cash/bank/card account it moved through.
KINDS = {
    "expense": ("category", {EXPENSE}, {ASSET, LIABILITY}),
    "gift_given": ("category", {EXPENSE}, {ASSET, LIABILITY}),
    "income": ("payment", {INCOME}, {ASSET}),
    "gift_received": ("payment", {INCOME}, {ASSET}),
    "loan_received": ("payment", {LIABILITY}, {ASSET}),
    "loan_given": ("category", {ASSET}, {ASSET}),
    "debt_payment": ("category", {LIABILITY}, {ASSET}),
    "transfer": ("category", {ASSET}, {ASSET}),
}

_PLAIN = re.compile(r"^\d{1,16}(\.\d{1,2})?$")
_GROUPED = re.compile(r"^\d{1,3}(\.\d{3})+(,\d{1,2})?$")  # 1.500.000 or 1.500.000,50 (es-CO)


def parse_amount(text):
    """A positive Decimal from "80000", "80000.5" or "1.500.000"; None when it isn't one."""
    value = (text or "").strip().replace("$", "").replace(" ", "")
    if _GROUPED.match(value):
        value = value.replace(".", "").replace(",", ".")
    elif "," in value and "." not in value:
        value = value.replace(",", ".")
    if not _PLAIN.match(value):
        return None
    try:
        amount = Decimal(value)
    except InvalidOperation:
        return None
    return amount if amount > 0 else None


def check_accounts(kind, category, payment):
    """None when the two accounts fit the kind; otherwise which one doesn't ("category"/"payment")."""
    _, category_types, payment_types = KINDS[kind]
    if category.account_type not in category_types:
        return "category"
    if payment.account_type not in payment_types or payment.pk == category.pk:
        return "payment"
    return None


def build_lines(kind, category, payment, amount):
    """The two lines for the serializer: always balanced, one debit and one credit."""
    debit_side = KINDS[kind][0]
    debit_account, credit_account = (category, payment) if debit_side == "category" else (payment, category)
    value = f"{amount:.2f}"
    return [
        {"account": str(debit_account.pk), "debit": value, "credit": "0"},
        {"account": str(credit_account.pk), "debit": "0", "credit": value},
    ]


# Words too common to prove the user named a payment method or a category.
_STOPWORDS = {
    "con", "de", "del", "la", "el", "los", "las", "mi", "mis", "por", "para", "en", "un", "una", "y", "que",
    "the", "with", "my", "by", "from", "a", "an", "and", "of", "to", "in", "on", "for", "it", "i",
    "pague", "pagado", "pagar", "paid", "pay", "cuenta", "account",
}


def normalize(text):
    """Lowercase, accents removed, words only: "Pagué con la Tarjeta" -> "pague con la tarjeta"."""
    decomposed = unicodedata.normalize("NFKD", text or "")
    plain = "".join(char for char in decomposed if not unicodedata.combining(char))
    return " ".join(re.findall(r"\w+", plain.lower()))


def evidence_in(evidence, user_text):
    """True when a meaningful word of `evidence` appears in what the user actually wrote."""
    words = set(normalize(user_text).split())
    keywords = [word for word in normalize(evidence).split() if len(word) >= 3 and word not in _STOPWORDS]
    return any(word in words for word in keywords)
