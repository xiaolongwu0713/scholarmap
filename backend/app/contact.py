"""Team/industry contact form: emails each lead to the team inbox (reply goes to the sender)."""
from __future__ import annotations

import time
from collections import defaultdict, deque

from pydantic import BaseModel, Field

import config
from app.auth.auth import _send_email

settings = config.settings

# Per-IP limit; in memory, so it resets on deploy, which is fine for a contact form
MAX_PER_IP = 5
WINDOW_SECONDS = 3600
_recent: dict[str, deque[float]] = defaultdict(deque)


class ContactRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str = Field(min_length=3, max_length=255)
    company: str = Field(default="", max_length=200)
    message: str = Field(min_length=1, max_length=5000)
    source: str = Field(default="", max_length=60)  # which button opened the form
    first_touch: str = Field(default="", max_length=300)  # how the visitor first found the site
    website: str = Field(default="", max_length=200)  # honeypot: hidden from people, filled by bots


def allow(ip: str, now: float | None = None) -> bool:
    now = time.time() if now is None else now
    hits = _recent[ip]
    while hits and hits[0] <= now - WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= MAX_PER_IP:
        return False
    hits.append(now)
    return True


async def send_lead(req: ContactRequest, email: str) -> None:
    """Email the lead to the team inbox. Raises if sending fails."""
    who = req.company.strip() or req.name.strip()
    text = (
        f"Name: {req.name.strip()}\n"
        f"Email: {email}\n"
        f"Company / team: {req.company.strip() or '-'}\n"
        f"Form: {req.source or '-'}\n"
        f"First visit source: {req.first_touch or '-'}\n\n"
        f"{req.message.strip()}\n\n"
        "Reply to this email to answer them directly."
    )
    await _send_email(settings.contact_email, f"LabScout for my team: {who}"[:150], text, reply_to=email)
