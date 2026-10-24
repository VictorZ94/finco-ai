import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from finco_ai.identity import get_user_id

from .services import build_summary

MONTH_PATTERN = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/?month=YYYY-MM — key figures and a 6-month trend."""

    def get(self, request):
        raw = request.query_params.get("month")
        if raw:
            match = MONTH_PATTERN.match(raw)
            if not match:
                raise ValidationError({"month": "Use the format YYYY-MM."})
            year, month = int(match[1]), int(match[2])
        else:
            today = timezone.localdate()
            year, month = today.year, today.month
        return Response(build_summary(get_user_id(request), year, month))
