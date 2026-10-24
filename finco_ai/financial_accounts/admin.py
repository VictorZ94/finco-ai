from django.contrib import admin

from .models import FinancialAccount


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "account_type", "nature", "level", "can_receive_movement", "user_id"]
    list_filter = ["account_type", "level", "can_receive_movement"]
    search_fields = ["code", "name", "user_id"]
    ordering = ["user_id", "code"]
    raw_id_fields = ["parent"]
