#!/usr/bin/env python3
"""Reads the mailbox that e-mail bounces come back to and hands them to the website (/api/cron/mail-bounces).

Run by .github/workflows/mail-bounces.yml. Settings (environment variables):
  BOUNCE_IMAP_HOST, BOUNCE_IMAP_USER, BOUNCE_IMAP_PASSWORD   the mailbox (the one the website sends from)
  BOUNCE_IMAP_PORT (default 993), BOUNCE_IMAP_SSL (default 1)
  REMINDER_KEY    the key from Admin -> Email -> Daily reminders
  SITE_URL        default https://theuniqueexpo.com
Only unread messages that look like bounces are sent; a message is marked read only after the website accepted it, so nothing is lost
when the site is down. Nothing is deleted or moved.
"""
import imaplib
import json
import os
import re
import sys
import urllib.error
import urllib.request

host = os.environ.get("BOUNCE_IMAP_HOST", "")
user = os.environ.get("BOUNCE_IMAP_USER", "")
password = os.environ.get("BOUNCE_IMAP_PASSWORD", "")
key = os.environ.get("REMINDER_KEY", "")
site = os.environ.get("SITE_URL", "https://theuniqueexpo.com").rstrip("/")
if not (host and user and password and key):
    print("BOUNCE_IMAP_HOST / BOUNCE_IMAP_USER / BOUNCE_IMAP_PASSWORD / REMINDER_KEY are not all set: nothing to do.")
    sys.exit(0)

LOOKS_LIKE_BOUNCE = re.compile(rb"(mailer-daemon|postmaster|delivery status|undeliver|returned mail|failure notice|delivery failure|delivery has failed|not delivered|could not be delivered)", re.I)
BATCH = 40

port = int(os.environ.get("BOUNCE_IMAP_PORT", "993"))
use_ssl = os.environ.get("BOUNCE_IMAP_SSL", "1") != "0"
mail = imaplib.IMAP4_SSL(host, port) if use_ssl else imaplib.IMAP4(host, port)
mail.login(user, password)
mail.select("INBOX")
status, data = mail.search(None, "UNSEEN")
ids = data[0].split() if status == "OK" and data and data[0] else []
print(f"{len(ids)} unread messages")

candidates = []
for num in ids:
    status, parts = mail.fetch(num, "(BODY.PEEK[])")
    if status != "OK" or not parts or not isinstance(parts[0], tuple):
        continue
    raw = parts[0][1]
    if LOOKS_LIKE_BOUNCE.search(raw[:4000]):
        candidates.append((num, raw))
print(f"{len(candidates)} look like bounces")

sent = 0
for start in range(0, len(candidates), BATCH):
    chunk = candidates[start:start + BATCH]
    body = json.dumps({"messages": [raw.decode("utf-8", "replace") for _, raw in chunk]}).encode("utf-8")
    request = urllib.request.Request(site + "/api/cron/mail-bounces", data=body, headers={"Content-Type": "application/json", "x-reminder-key": key}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            print(response.read().decode("utf-8"))
    except urllib.error.URLError as err:
        print(f"The website did not accept the messages: {err}", file=sys.stderr)
        mail.logout()
        sys.exit(1)
    for num, _ in chunk:
        mail.store(num, "+FLAGS", "\\Seen")
    sent += len(chunk)
mail.logout()
print(f"Done: {sent} bounce messages handed over.")
