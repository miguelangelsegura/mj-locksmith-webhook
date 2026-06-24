# Admin UI

A single, self-contained page (`page.html`) for the Dispango team to onboard and
manage locksmith clients. It calls the `admin` Supabase Edge Function (validated
create, list, update, test-SMS) using an admin token entered at runtime and kept
only in the browser's localStorage. The page holds no secrets.

## Hosting

This is a static HTML file. **It cannot be served from Supabase** — Supabase
rewrites `text/html` to `text/plain` on both Edge Functions and Storage (an
anti-phishing measure), so a Supabase URL would show the raw source instead of
rendering. Host it on any static host that serves `text/html`:

- **Netlify Drop** (fastest): https://app.netlify.com/drop → drag `page.html` in →
  you get an instant URL.
- **Vercel / Cloudflare Pages / GitHub Pages** — also fine.
- **Locally** — `python3 -m http.server` in this folder, then open
  `http://localhost:8000/page.html`.

The API base URL is hard-coded in `page.html`, so the page works from any origin
(the `admin` function returns `Access-Control-Allow-Origin: *`).

## Use

Open the hosted page, paste the `ADMIN_API_TOKEN` (the value set as a Supabase
secret) once, and you're in.
