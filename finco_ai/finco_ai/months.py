import re

from django.utils import timezone
from rest_framework.exceptions import ValidationError

MONTH_PATTERN = re.compile(r"^(\d{4})-(0[1-9]|1[0-2])$")


def month_param(request):
    """(year, month) from ?month=YYYY-MM, or the current month. Raises a 400 on a bad value."""
    raw = request.query_params.get("month")
    if not raw:
        today = timezone.localdate()
        return today.year, today.month
    match = MONTH_PATTERN.match(raw)
    if not match:
        raise ValidationError({"month": "Use the format YYYY-MM."})
    return int(match[1]), int(match[2])
