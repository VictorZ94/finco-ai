from rest_framework import serializers

from .models import FinancialAccount


class FinancialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAccount
        fields = ["id", "code", "name", "nature", "account_type", "level", "can_receive_movement"]
        read_only_fields = fields
