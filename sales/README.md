# Sales collateral

## `Dispango-demo-deck.pptx`

A 10-slide pitch deck for the Dispango team to present on Calendly demo calls
with locksmith prospects. Editable in PowerPoint / Keynote / Google Slides.
Each slide has **speaker notes** (talking points) in Presenter View.

Slides: title → the problem (missed calls) → "Meet Dispango" → how it works →
the instant lead text → benefits → pricing → social proof → setup → book-a-demo.

### Edit before presenting
- **Slide 7 — price:** replace the `$XXX/mo` placeholder with your real price.
- **Slide 8 — testimonials:** swap the placeholder quotes for real ones once you
  have them (don't present invented quotes as real).
- **Slide 10 — contact:** replace the email / phone / domain placeholders.

## `build-deck.js`

The generator that produced the deck (Node + `pptxgenjs` + `sharp`). You don't
need it to use or edit the deck — it's here so the deck can be regenerated or
restyled in code. To rebuild:

```bash
npm install pptxgenjs sharp
node build-deck.js          # writes Dispango-demo-deck.pptx
```

Brand: navy `#0C1726`, brand blue `#2F6BED`, emerald `#0FAE7A` — matches the
marketing site and admin tool.
