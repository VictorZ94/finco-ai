from rest_framework.response import Response
from rest_framework.views import APIView

from finco_ai.identity import get_user_id
from finco_ai.months import month_param

from .services import build_summary


class DashboardSummaryView(APIView):
    """GET /api/dashboard/summary/?month=YYYY-MM — key figures and a 6-month trend."""

    def get(self, request):
        year, month = month_param(request)
        return Response(build_summary(get_user_id(request), year, month))
