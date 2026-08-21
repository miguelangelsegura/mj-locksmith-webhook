#!/usr/bin/env python3
"""One-time import of the retired outreach/contacted.csv ledger into the shared
`leads` table. Safe to re-run: POST /leads enriches instead of duplicating.

  ADMIN_API_TOKEN=… python3 scripts/import-legacy-leads.py [--dry-run]
"""
import csv, json, os, sys, urllib.request

BASE = os.environ.get(
    "ADMIN_API_BASE",
    "https://yqyvybukyfokyfsjzyso.supabase.co/functions/v1/admin",
)
TOKEN = os.environ.get("ADMIN_API_TOKEN")
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "outreach", "contacted.csv")

# v1 statuses were email-only. The call pipeline starts everyone at `new`;
# only an explicit opt-out carries over as a hard block.
EMAIL_STATUS = {"found": "none", "drafted": "drafted", "no_email": "none",
                "skipped_dupe": "none", "replied": "replied", "unsubscribed": "sent"}


def main() -> int:
    dry = "--dry-run" in sys.argv
    if not TOKEN and not dry:
        print("ADMIN_API_TOKEN is not set", file=sys.stderr)
        return 1

    with open(CSV_PATH, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    leads = []
    for r in rows:
        lead = {
            "business_name": (r.get("business_name") or "").strip(),
            "website": (r.get("website") or "").strip() or None,
            "phone": (r.get("phone") or "").strip() or None,
            "city": (r.get("city") or "").strip() or None,
            "trade": "locksmith",
            "hours": (r.get("hours") or "").strip() or None,
            "timezone": (r.get("timezone") or "").strip() or None,
            "description": (r.get("description") or "").strip() or None,
            "email": (r.get("email") or "").strip() or None,
            "email_source_url": (r.get("email_source_url") or "").strip() or None,
            "email_status": EMAIL_STATUS.get((r.get("status") or "").strip(), "none"),
            "drafted_at": (r.get("drafted_at") or "").strip() or None,
            "notes": (r.get("notes") or "").strip() or None,
            "source": "legacy contacted.csv",
        }
        if (r.get("status") or "").strip() == "unsubscribed":
            lead["status"] = "do_not_contact"
        if lead["business_name"]:
            leads.append(lead)

    print(f"{len(leads)} rows read from contacted.csv")
    if dry:
        print(json.dumps(leads[:2], indent=2))
        return 0

    req = urllib.request.Request(
        f"{BASE}/leads",
        data=json.dumps({"leads": leads}).encode(),
        headers={"x-admin-token": TOKEN, "content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        body = json.load(resp)
    print(f"created={body['created']} enriched={body['enriched']} skipped={body['skipped']}")
    for item in body["results"]:
        if item["action"] in ("error", "duplicate"):
            print(f"  {item['action']}: {item['business_name']} {item.get('reason','')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
