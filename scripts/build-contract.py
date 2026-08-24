#!/usr/bin/env python3
"""Build the customer contract from its single source of truth.

legal/master-services-agreement.md   <- edit THIS
  -> legal/master-services-agreement.html          (human-readable / upload copy)
  -> supabase/functions/billing/contract-template.ts (shipped with the function)

Run after every contract edit:  python3 scripts/build-contract.py
"""
import html as H
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
MD = ROOT / "legal/master-services-agreement.md"
HTML_OUT = ROOT / "legal/master-services-agreement.html"
TS_OUT = ROOT / "supabase/functions/billing/contract-template.ts"

CSS = (
    "body{font-family:Georgia,serif;font-size:10.5pt;line-height:1.5;margin:52px;color:#111}"
    "h1{font-size:17pt;text-align:center;margin-bottom:4px}"
    "h2{font-size:12.5pt;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:3px}"
    "blockquote{background:#f4f4f7;border-left:3px solid #666;padding:10px 14px;margin:14px 0}"
    "hr{border:0;border-top:1px solid #ccc;margin:18px 0}p{margin:7px 0}p.ack{margin:6px 0 6px 18px}"
)


def render(md: str) -> str:
    out = []
    for raw in md.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            out.append("")
        elif line.startswith("# "):
            out.append(f"<h1>{H.escape(line[2:])}</h1>")
        elif line.startswith("## "):
            out.append(f"<h2>{H.escape(line[3:])}</h2>")
        elif line.strip() == "---":
            out.append("<hr/>")
        elif line.startswith("> "):
            out.append(f"<blockquote>{H.escape(line[2:])}</blockquote>")
        elif re.match(r"^\d+\. ", line):
            out.append(f'<p class="ack">{H.escape(line)}</p>')
        elif line.startswith("*") and line.endswith("*") and line.count("*") == 2:
            out.append(f"<p><em>{H.escape(line.strip('*'))}</em></p>")
        else:
            out.append(f"<p>{H.escape(line)}</p>")
    body = "\n".join(out)
    body = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", body)
    body = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"<em>\1</em>", body)
    return f'<html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'


def main() -> None:
    md = MD.read_text()

    # These are load-bearing: SignWell places the signature/date fields wherever
    # the text tags land, and the function substitutes the business name.
    for token in ("{{signature}}", "{{date}}", "%%BUSINESS_NAME%%"):
        if md.count(token) != 1:
            raise SystemExit(f"expected exactly one {token} in {MD.name}, found {md.count(token)}")
    leftover = set(re.findall(r"\[[A-Z][A-Z _]+\]", md))
    if leftover:
        raise SystemExit(f"unfilled placeholders left in the contract: {sorted(leftover)}")

    doc = render(md)
    HTML_OUT.write_text(doc)
    TS_OUT.write_text(
        "// GENERATED FROM legal/master-services-agreement.md — DO NOT EDIT BY HAND.\n"
        "// Regenerate with: python3 scripts/build-contract.py\n"
        "//\n"
        "// The signature/date boxes are SignWell TEXT TAGS ({{signature}}, {{date}}):\n"
        "// SignWell places the fields wherever the tags land, so editing the contract\n"
        "// can never leave a signature box floating on the wrong page. %%BUSINESS_NAME%%\n"
        "// is substituted per client before upload.\n"
        f"export const CONTRACT_HTML = {json.dumps(doc)};\n"
    )
    print(f"built {HTML_OUT.relative_to(ROOT)} and {TS_OUT.relative_to(ROOT)} ({len(doc)} bytes)")


if __name__ == "__main__":
    main()
