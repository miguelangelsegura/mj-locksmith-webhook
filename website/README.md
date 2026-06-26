# Dispango marketing site

A one-page, self-contained marketing site whose job is to make Dispango look
legit when a prospect Googles it. Plain static HTML/CSS — no build step, no
framework. Files:

- `index.html` — the one-pager (hero, how-it-works, benefits, FAQ, book-a-demo, footer).
- `privacy.html` — short PIPEDA privacy policy (template — get it reviewed).

## Editing the placeholders (the only thing you need to change)

Open `index.html` and find the **`window.DISPANGO = { ... }`** block near the top
of `<body>`. Change these and re-host — nothing else to touch:

| Field | What it is |
|-------|-----------|
| `calendly` | Your Calendly event link, e.g. `https://calendly.com/yourname/demo`. Until you set it, "Book a demo" falls back to an email link. |
| `email` | Contact email (ideally on your domain, e.g. `hello@dispango.com`). |
| `phone` | Contact phone. |
| `legalName` | Legal/operating business name (footer + privacy). |
| `address` | Physical mailing address (legitimacy + CASL/PIPEDA). |

Then update the same details in the small config block at the bottom of
`privacy.html`, and — once you own a domain — replace `REPLACE-WITH-YOUR-DOMAIN`
in the `<title>`/`og:url`/JSON-LD of `index.html`.

## Hosting (Netlify, custom domain later)

1. Go to https://app.netlify.com/drop and drag the **`website`** folder in.
   The site root serves `index.html`.
2. Claim the site (sign in) so the URL sticks, then rename it under
   **Site configuration → Change site name**.
3. **Custom domain later:** Site → Domain management → add your domain and follow
   the DNS steps. Then update the `REPLACE-WITH-YOUR-DOMAIN` spots above.

> Heads up: do NOT enable Netlify's "Password protection" — that locks the whole
> site behind a password, which you don't want for a public marketing page.

## Brand

- **Wordmark:** "Dispango" + a rounded-square mark with white broadcast arcs
  rising from a dot (inline SVG in the header; also the favicon).
- **Palette:** ink navy `#0e1a2b`, slate body `#48566a`, brand blue
  `#2f6bed → #1f51c4`, emerald `#10b981` accents, soft section `#f5f8fd`,
  hairline `#e7edf6`.

## Looks-legit-on-Google checklist (beyond this page)

- Custom domain + matching email (biggest trust lever).
- Set up a **Google Business Profile** (name/address/phone identical to the footer).
- Add a 1200×630 `og:image` once you have brand art.
