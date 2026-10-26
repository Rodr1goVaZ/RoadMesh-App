"""Shared UTC timestamps and UUIDs for authentication and business records."""
from datetime import datetime, timezone
from uuid import uuid4


def now():
    return datetime.now(timezone.utc)


def timestamp():
    return now().isoformat()


def identifier():
    return str(uuid4())
