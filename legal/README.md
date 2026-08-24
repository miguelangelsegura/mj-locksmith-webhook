# Customer contract

**Source of truth: [master-services-agreement.md](master-services-agreement.md).** Edit that file
and nothing else, then run:

```
python3 scripts/build-contract.py
```

which regenerates `master-services-agreement.html` (readable/upload copy) and
`../supabase/functions/billing/contract-template.ts` (shipped with the billing function).
Deploy with `supabase functions deploy billing`.

## How a contract reaches a customer

`signwellCreateDocument` POSTs the built HTML to SignWell's `/documents` endpoint per signup —
there is **no dashboard template**. This account's API key cannot create templates (401), and a
dashboard template is an unversioned copy that drifts (the previous one sat in one founder's
account carrying nine unfilled blanks and the wrong company name).

Signature placement uses **SignWell text tags** — `{{signature}}` and `{{date}}` in the signature
block. SignWell places the fields wherever the tags land, so editing the contract can never strand
a signature box on the wrong page. `%%BUSINESS_NAME%%` is substituted (escaped, braces stripped)
before upload. The build script fails if any of those three tokens goes missing.

## Files

- `master-services-agreement.md` — the contract. Edit this.
- `master-services-agreement.html` — generated. Do not edit.
- `SUPERSEDED-Dispango-Master-SaaS-Agreement.docx` — the old US-law draft with unfilled brackets,
  kept only for reference. **Never send this to a customer.**

## Not legal advice

This was drafted in-house and reviewed for completeness and internal consistency, not by counsel.
Have a lawyer review before relying on it — particularly the liability cap (7.1), the exclusions
(6, 7.2, 7.3), and the arbitration/limitation-period terms (9.3, 9.4).
