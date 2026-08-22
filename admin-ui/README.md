# Admin UI

A single, self-contained page (`index.html`) for the Dispango team to onboard and
manage locksmith clients. It calls the `admin` Supabase Edge Function (validated
create, list, update, test-SMS) using an admin password entered at runtime and kept
only in the browser's localStorage. The page holds no secrets.

## Hosting

This is a static HTML file. **It cannot be served from Supabase** — Supabase
rewrites `text/html` to `text/plain` on both Edge Functions and Storage (an
anti-phishing measure), so a Supabase URL would show the raw source instead of
rendering. Host it on any static host that serves `text/html`:

- **Netlify Drop** (fastest): https://app.netlify.com/drop → drag this `admin-ui`
  folder in → the site root serves the tool (it's named `index.html`).
- **Vercel / Cloudflare Pages / GitHub Pages** — also fine.
- **Locally** — `python3 -m http.server` in this folder, then open
  `http://localhost:8000/`.

The API base URL is hard-coded in `index.html`, so the page works from any origin
(the `admin` function returns `Access-Control-Allow-Origin: *`).

## Use

Open the hosted page, enter the admin password (the `ADMIN_API_TOKEN` value set as a Supabase
secret) once, and you're in.

### Leads (outreach call sheet)

The **Leads** tab is the team's shared prospect list — businesses we are selling *to*,
as opposed to Shops (already live on the product). It is a phone-first call sheet:

- Sorted the way you should work it: **callbacks due today first**, then leads nobody
  has called, then everything else. Closed leads (signed up, not interested, bad number,
  do-not-contact) sink to the bottom and are hidden under the default "Still open" filter.
- **Their time** shows each business's *local* clock, computed from the lead's stored
  timezone, and turns amber outside 8am–7pm — so nobody dials Vancouver at 6am.
- The phone number is a `tel:` link: on a phone, tap it to dial.
- **Log what happened** writes the outcome, who called, an optional call-back date and a
  note. History is **append-only** — your note never overwrites a teammate's.
- **Export CSV** downloads whatever the current filters show.

Leads are created by the `/locksmith-outreach` skill in Claude Code, not by hand here.
