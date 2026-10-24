from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ai_chat.models import Conversation
from financial_accounts.models import FinancialAccount
from transactions.models import LedgerEntry, Transaction


class Command(BaseCommand):
    help = (
        "Move all data owned by one user_id to another (e.g. the old 'demo-user' "
        "data to your Firebase UID)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--from", dest="source", required=True, help="Current owner user_id.")
        parser.add_argument("--to", dest="target", required=True, help="New owner (Firebase UID).")
        parser.add_argument(
            "--replace",
            action="store_true",
            help=(
                "Delete the target's existing chart of accounts first (only allowed if it has "
                "no ledger entries, e.g. the default chart seeded on first login)."
            ),
        )

    def handle(self, *args, source, target, replace, **options):
        if source == target:
            raise CommandError("--from and --to must be different.")

        with transaction.atomic():
            target_accounts = FinancialAccount.objects.filter(user_id=target)
            if target_accounts.exists():
                if not replace:
                    raise CommandError(
                        f"{target} already has {target_accounts.count()} accounts. "
                        "Use --replace to delete them first."
                    )
                if LedgerEntry.objects.filter(account__user_id=target).exists():
                    raise CommandError(f"{target}'s accounts have ledger entries; refusing to delete them.")
                if Transaction.objects.filter(user_id=target).exists():
                    raise CommandError(f"{target} already has transactions; refusing to replace.")
                # Children first: parent links are PROTECT.
                for level in (4, 3, 2, 1):
                    target_accounts.filter(level=level).delete()

            moved = {
                "accounts": FinancialAccount.objects.filter(user_id=source).update(user_id=target),
                "transactions": Transaction.objects.filter(user_id=source).update(user_id=target),
                "conversations": Conversation.objects.filter(user_id=source).update(user_id=target),
            }

        summary = ", ".join(f"{count} {name}" for name, count in moved.items())
        self.stdout.write(self.style.SUCCESS(f"Moved {summary} from {source} to {target}."))
