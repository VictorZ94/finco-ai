from django.contrib import admin

from .models import LedgerEntry, Transaction


class LedgerEntryInline(admin.TabularInline):
    model = LedgerEntry
    extra = 0
    fields = ["account", "debit", "credit"]
    raw_id_fields = ["account"]


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """Read-mostly: entries should be created through the API so the ledger rules apply."""

    list_display = ["numbering", "applied_date", "supplier", "description", "user_id", "created_at"]
    list_filter = ["applied_date"]
    search_fields = ["numbering", "supplier", "description", "user_id"]
    ordering = ["-created_at"]
    readonly_fields = ["numbering", "user_id", "created_at", "updated_at"]
    inlines = [LedgerEntryInline]
