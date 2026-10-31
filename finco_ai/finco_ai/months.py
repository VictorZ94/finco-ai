import re
from datetime import date

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


def date_param(request, name, default):
    """A ?name=YYYY-MM-DD date, or `default` when missing. Raises a 400 on a bad value."""
    raw = request.query_params.get(name)
    if not raw:
        return default
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({name: "Use the format YYYY-MM-DD."}) from None


def date_range_param(request):
    """(start, end) from ?from=&to= (YYYY-MM-DD). Defaults: the current month up to today."""
    today = timezone.localdate()
    start = date_param(request, "from", today.replace(day=1))
    end = date_param(request, "to", today)
    if start > end:
        raise ValidationError({"from": "The start date must be on or before the end date."})
    return start, end
