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

## `Dispango-sales-playbook.pdf` (internal)

An 8-page internal playbook that defines the sales motion end to end:
**identify → cold call → follow up → close → onboard**. Cover, a one-page
overview (the five stages + principles + which tool we use at each), one page per
stage with **goal / do-this steps / tips** and a script-or-tool callout, and a
closing cadence-and-metrics page. Internal use — not for prospects. Edit the
source `Dispango-sales-playbook.pptx` and re-export to PDF.

## `Dispango-brochure.pdf`

A one-page (letter-size) brochure to **email or print as a leave-behind** after a
demo call — same brand, condensed: headline, how-it-works, the lead-text example,
benefits, and a book-a-demo footer. Edit the source `Dispango-brochure.pptx` (or
`build-brochure.js`) and re-export to PDF. **Replace the contact placeholders in
the footer** (email / phone / domain) before sending.

To re-export the PDF after editing the `.pptx`:

```bash
soffice --headless --convert-to pdf Dispango-brochure.pptx
```

## `build-deck.js` / `build-brochure.js`

The generators that produced the deck and brochure (Node + `pptxgenjs` +
`sharp`). You don't need them to use or edit the files — they're here so the
assets can be regenerated or restyled in code. To rebuild:

```bash
npm install pptxgenjs sharp
node build-deck.js          # writes Dispango-demo-deck.pptx
node build-brochure.js      # writes Dispango-brochure.pptx (then export to PDF)
node build-playbook.js      # writes Dispango-sales-playbook.pptx (then export to PDF)
```

Brand: navy `#0C1726`, brand blue `#2F6BED`, emerald `#0FAE7A` — matches the
marketing site and admin tool.
