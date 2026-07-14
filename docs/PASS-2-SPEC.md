# Dispango site redesign — PASS 2 SPEC (the "wow" interactives)

**Self-contained build spec.** Everything needed to build Pass 2 is in this file — do not
assume prior chat context. Read this + the current `web/` code, then build.

---

## 0. Background (why this exists)

`web/` is the marketing site for **Dispango** — an AI phone receptionist for **trades**
(locksmith, plumber, HVAC, electrician…). A caller rings the shop; Dispango answers 24/7,
captures the job (name, address, problem, urgency), and **texts the lead to the tradesperson in
seconds**. Flat **$199/mo**. Product path: Vapi voice AI → Supabase → Twilio SMS. **Backend is
off-limits for this work — frontend `web/` only.**

**Positioning (locked):** *trades emergency dispatch*, NOT appointment booking. The hero story is
"You're on the tools. Dispango's on the phone." The product's payoff for trades is **the lead
text hitting your phone**, not a dashboard you check later.

**Benchmark:** competitor **Calio (calio.ca)**. Their winning moves: radical copy economy,
heavy 800-weight headlines, and **every claim *shown* via an interactive product mock**, not told.
**Goal: exceed Calio, don't clone it.** Owner's words: "website design is an art… it should be
bright, colors everywhere… big bold punchlines… interactive animations."

**Pass 1 already shipped** (word-light copy, punchy headlines, "On the tools" hero, Cal.com wired,
2-col comparison, integrations logo-wall, smooth ROI slider). **Pass 2 = the heavy interactive
sections** that make the site genuinely wow.

---

## 1. Design system already in place (REUSE — do not reinvent)

All in `web/app/globals.css` (Tailwind v4 via `@import "tailwindcss"` + `@theme`) and
`web/app/page.jsx`.

### Color tokens (`@theme` in globals.css) — use as Tailwind classes `text-*` / `bg-*`
| token | hex | | token | hex |
|---|---|---|---|---|
| brand | #5b5bf5 | | emerald / -50 | #10b981 / #e7f8f1 |
| brand-600 | #4a45ec | | sky / -50 | #2f9bff / #e8f4ff |
| brand-700 | #3a34c9 | | violet / -50 | #8b5cf6 / #f1ecff |
| warm | #ff7a4d | | pink / -50 | #ff5c8a / #ffe9f0 |
| warm-amber | #ffb020 | | danger / -50 | #ef4444 / #fdeaea |
| warm-50 | #fff1ea | | ink | #0d1220 |
| indigo-50/100/200 | #eef0ff/#e0e3ff/#c6cbff | | body / muted | #4b5468 / #8a93a6 |
| soft | #f6f7ff | | line | #e8eaf6 |

### Reusable CSS classes (globals.css)
- `.glow-hero`, `.glow-soft`, `.glow-dark` — radial-gradient section backgrounds (glow-dark = dark
  ink panel with brand/coral glow, white text).
- `.reveal` + `.reveal.in` — scroll-in (opacity+translateY). Add `style={{transitionDelay:'70ms'}}`
  for stagger. Triggered by `useReveal()` (IntersectionObserver) — already called once in `Page`.
- `.lift` — unified hover (translateY(-4px)+shadow+brand border). Put on cards. `.reveal.lift`
  compound rule already handles the combined transition.
- `.eyebrow` — tiny uppercase brand-color section label.
- `.navlink` — animated underline on hover.
- `.slider` (+ inline `--pct`) — custom range slider (used by Calculator).
- `.text-shimmer` — animated gradient text (brand→warm→brand) for a highlighted headline word.
- Animations: `.animate-floaty .animate-aura .animate-ringpulse .animate-dot .animate-pop
  .animate-glow .animate-slideup .animate-textdrop .animate-ring`; `.caret`, `.voicebars`.
- **Reduced-motion block** at the bottom disables animations — ADD any new keyframe class to it.

### Reusable JS (page.jsx)
- `CONFIG` — `{ getStarted:"/get-started", email:"hello@dispango.com", legalName:"Jam Works Inc.",
  book:"https://cal.com/abdul-zxafqn/30min", portal:"", demoLine:"", sampleAudio:"", phone:"",
  address:"" }`. `PRICE = 199`.
- `Btn({href,variant})` variants: `primary` | `ghost` | `light`. `Arrow`, `Tick({className})`,
  `Logo`.
- `CountUp({to, prefix, className})` — eases 0→to once scrolled into view (respects reduced-motion).
- `useScrolled()`, `useReveal()`.
- `TINTS` map (tint→`bg-*-50 text-*`) and `DOT` map (tint→`bg-*`). **Tailwind v4 gotcha:** it only
  generates classes it sees as *literal strings*. NEVER build class names by string concat — put
  every class literally in a map object (that's why `DOT` exists). Any new dynamic tint→class needs
  a literal map.
- `PhoneCall` component (`components/PhoneCall.jsx`) — the floating iPhone mock with a typed live
  transcript + "lead sent" card. Reusable/adaptable for mocks.

### Conventions
- Section rhythm: `py-20`, centered `eyebrow` → `h2` (800-weight, `text-3xl md:text-5xl
  tracking-tight text-ink`) → one short `<p>` → the interactive. Alternate plain and `.glow-soft`
  section backgrounds.
- Cards: `rounded-2xl border border-line bg-white p-6` + `.lift`.
- All artwork is **original inline SVG** — no third-party logos/images/stock (house rule).
- Mobile-first; **must not overflow at 390px** (wrap wide content in `overflow-x-auto` with a
  `min-w-[…]` inner, like the comparison table).
- Every animation must be disabled/settled under `prefers-reduced-motion` and keyboard-accessible.

---

## 2. What to build (4 components) + where they slot in

Create new client components in `web/app/components/`. Wire them into `web/app/page.jsx` in this
section order (replacing/inserting as noted). Keep existing NAV, hero, USP, How-It-Works,
See-It-In-Action, cost-bar, comparison, Calculator, integrations, pricing, FAQ, contact, CTA, footer.

**New order (insert the 3 big interactives after the USP section, before How-It-Works):**
1. NAV (unchanged)
2. HERO (Pass 1; optional enhancement in §2.4)
3. USP "Four reasons voicemail can't compete" (Pass 1)
4. **★ CallRush** (NEW — §2.1) — the money-shot
5. **★ BuildReceptionist** (NEW — §2.2)
6. **★ CommandCenter** (NEW — §2.3)
7. How It Works (Pass 1) … then the rest unchanged.

Each new component is a `"use client"` component. Import into page.jsx and drop its `<Section>` in.
Each follows the eyebrow→headline→sub→interactive rhythm. Wrap section shells in `.reveal`.

---

### 2.1 ★ `CallRush.jsx` — "You decide" + live $-recovered meter  (HIGHEST PRIORITY)

**Concept:** the interactive, money-anchored version of Calio's passive "5 calls at once" split.
The visitor **chooses** how calls get handled and watches the outcome + money diverge live.

**Copy:** eyebrow `The call rush` · h2 **"Five calls at once. You grab one. Dispango grabs all
five."** (put "Dispango grabs all five." in `.text-shimmer` or brand color) · sub "It doesn't just
answer fast — it answers everyone at the same time, gets the job, and texts it to you before
voicemail even picks up."

**Layout:** a control toggle at top, then a two-column split (mobile: stack). Section on a light or
`.glow-soft` bg.

**The toggle (the "you decide"):** a segmented control with two options:
`Old way — one front desk` | `The Dispango way`. Default = "Old way". Big, obvious, pill-style
(reuse pill styling; selected = `bg-brand text-white`, unselected = `border border-line text-ink`).

**The 5 callers (shared data):**
```
[ { name:"Jamie",  job:"Burst pipe — kitchen",  trade:"plumber",     value:420 },
  { name:"Sarah",  job:"Locked out — no spare",  trade:"locksmith",   value:180 },
  { name:"Noah",   job:"No heat — furnace dead",  trade:"hvac",        value:350 },
  { name:"Mia",    job:"Panel sparking",          trade:"electrician", value:300 },
  { name:"Liam",   job:"Garage door stuck",       trade:"garage",      value:220 } ]
```

**Behaviour:**
- **Old way selected:** caller #1 shows state **"On the call"** (animated `.voicebars` or a small
  waveform, brand color). Callers #2–5 show **"Sent to voicemail"** in red/`danger` with a muted/
  struck style. A red badge "4 sent to voicemail" + big score **"1 / 5 answered"**. The $-meter
  (see below) shows only caller #1's value recovered (e.g. $420) — the rest are **"lost"** (show a
  faded "$180 lost", "$350 lost"… or a single "$1,050 gone to voicemail").
- **Dispango way selected:** ALL five animate to **"Answered"** in sequence (stagger ~180ms each),
  each row flipping to a green check + an outcome fragment: `Texted to you` / `Address captured` /
  `Urgent flagged` / `Callback saved` / `Job logged` (assign one per caller). Green badge
  "5 active · 0 waiting" + big score **"5 / 5 answered"**. The **$-recovered meter counts up** as
  each caller resolves — from $0 to the **sum of all five values ($1,470)** — using an eased
  count-up (reuse `CountUp`'s easing approach, or a small local rAF tween so it re-runs on toggle).
- Switching the toggle re-runs the animation from scratch (reset states, replay). Smooth, no jank.
- Under the split, an outcome strip (3 mini-cards or a row): **"0s hold time"**, **"∞ calls at
  once"**, **"Every job texted to you"**.

**The $-recovered meter (the original "beyond-Calio" move):** a prominent number, e.g. inside a
`.glow-dark` pill or panel: label "Recovered this rush" + a big `$X` that eases to $1,470 on the
Dispango side (and shows the lost figure on the Old way side). This ties the animation to cash —
trades care about money. Make it the visual anchor of the section.

**Interaction detail:** the animation should also auto-play once when the section first scrolls into
view (IntersectionObserver — or reuse the reveal signal) so a non-clicking visitor still sees it.
Respect reduced-motion (show final state instantly, no tween).

**Style:** Old-way column tinted with `danger`/`warm` accents (red = loss); Dispango column with
`emerald`/`brand` (green = win). Use the existing card/`.lift` idioms. Caller rows = small rounded
rows with name (bold ink), job (muted), and the state chip on the right.

---

### 2.2 ★ `BuildReceptionist.jsx` — pick trade + voice → live preview  (merges Calio's 2 sections)

**Concept:** merge Calio's separate "industry picker" and "voice picker" into ONE stronger
interactive. Visitor picks their **trade** and a **voice**, and a live "receptionist card" updates
to show the greeting, what it captures, and the exact lead text it'd send.

**Copy:** eyebrow `Built around your business` · h2 **"Not a script. A receptionist trained on
your shop."** · sub "Your trade, your service area, your hours, your rules — every caller hears
your business, never a generic bot."

**Layout:** left = controls (trade pills + voice options); right = the live preview card. Stacks on
mobile (controls above card).

**Trade pills (horizontally scrollable on mobile):** Locksmith · Plumber · HVAC · Electrician ·
Garage Doors · Roofer. Selected = `bg-brand text-white`; else `border border-line`. Default =
Locksmith.

**Per-trade data** (write real, specific copy for each — example shape):
```
locksmith: {
  shop: "Rapid Lock & Key",
  greeting: "Thanks for calling Rapid Lock & Key — this is Ava. Are you locked out right now?",
  captures: ["Location & unit", "Lock type", "How urgent", "Callback number"],
  rules: ["Flag active lockouts as URGENT", "Always confirm the callback number", "After-hours = surcharge quoted"],
  leadText: "🔑 New job — LOCKOUT (urgent)\nAva captured:\n• 412 Bloor W, Unit 3\n• Deadbolt, no spare key\n• Callback 647-555-0198\nTexted to you 6s after the call.",
},
plumber: { shop:"Rapid Plumbing", greeting:"…burst pipe?…", captures:[…], rules:[…], leadText:"🔧 …BURST PIPE…" },
hvac / electrician / garage / roofer: similar, trade-specific.
```
Write genuinely distinct, believable copy per trade (different shop name, greeting, captured
fields, rules, and a formatted lead-text SMS). This is the "trained on YOUR shop" proof.

**Voice options:** a small row of 4 voices — e.g. `Ava (warm)`, `Cole (calm)`, `Harper (friendly)`,
`Elliot (pro)`. Selecting one: (a) updates the greeting's speaker name in the preview, (b) shows an
animated waveform (`.voicebars` or bars) on the selected voice only, (c) optional: a "▶ Preview"
affordance (no real audio needed — animate a waveform + caption "playing sample…"; do NOT claim
audio that isn't there). Keep honest.

**The live preview card (right):** a phone-ish or app-ish card with:
- Header: avatar circle + "{voice} · AI receptionist for {shop}" + green "Live" pill.
- **Greeting** block (the quoted first line, in the shop's name).
- **What it captures** — the `captures[]` as check-chips.
- **The text you'd get** — render `leadText` as a real-looking **SMS bubble** (green/imessage-ish
  or brand bubble) with monospace-ish lead formatting. THIS is the trades payoff — make it feel
  like a real text. (This folds in the approved "the text you'd actually get" idea.)
- **Special instructions** — the `rules[]` as small bullet lines.
- Crossfade/animate the card when trade or voice changes (fade+slide, ~250ms; reduced-motion =
  instant).

**Key:** switching trade swaps ALL of the above; switching voice swaps the name + waveform. Smooth,
no layout jump (reserve height so the card doesn't jerk).

---

### 2.3 ★ `CommandCenter.jsx` — scrollable dashboard preview (aspirational, LABEL IT)

**Concept:** Calio shows a click-through command center. Ours is a **designed preview** of the
future customer dashboard (the real one is a later phase / not built). **Must be clearly labeled a
preview/mockup** — do not imply it's live.

**Copy:** eyebrow `Your command center` · h2 **"Every call. Logged, summarized, done."** · sub
"Every lead, call and text in one place — so nothing slips." Add a small "Preview" pill on the mock.

**Layout:** a **macOS-style browser window mock** (three traffic-light dots + a fake URL bar
`app.dispango.com`) containing a dark sidebar + a main panel. Sidebar items are **clickable** and
swap the main panel (client-side state, no routing).

**Sidebar items (grouped):**
- Overview
- ACTIVITY: Leads · Call Logs · SMS History
- INSIGHTS: Analytics
- ACCOUNT: Billing · Settings
- (Sign out pinned bottom, non-functional visual)

**Panels (build 3–4 convincingly; others can be lighter):**
- **Overview:** a "Dispango is live and answering" banner + 3 stat tiles (e.g. `248 calls`,
  `91 jobs captured`, `6 this week` — use `CountUp`), + a "today's jobs" short list.
- **Leads:** a list of captured leads (name, trade/job, address, urgency tag, time) → clicking one
  shows a detail pane (fields + a transcript snippet).
- **Call Logs:** filter chips (All/Answered/Missed/Spam) + a list with status tags + a detail pane
  with a short transcript quote.
- **Analytics:** a few stat tiles + a simple original bar/spark visual (inline SVG; est. $ saved,
  calls answered, after-hours %).
- Billing/Settings can be simple stub panels (plan card, a couple toggles) — keep light.

**Interaction:** clicking a sidebar item sets active panel (crossfade the main area). Default =
Overview. Everything is mock data — realistic but clearly a preview. Keyboard-accessible (buttons,
not divs, for the sidebar items).

**Style:** window frame `rounded-2xl border border-line shadow-2xl`; sidebar `bg-ink`/dark with
brand accents; main panel white. On mobile: collapse the sidebar to a horizontal scroll of chips
above the panel (don't force a 2-col that overflows 390px).

---

### 2.4 Hero enhancement (OPTIONAL — do last, only if time)

Pass 1 hero = headline + `PhoneCall` mock. Optionally enrich the "on the tools" concept: add an
original inline-SVG vignette (a wrench / gloved hand / ladder motif) behind or beside the phone, and
a floating "job text" card (`.animate-textdrop`) sliding onto the phone showing the texted lead.
Keep it tasteful; do not regress the clean Pass 1 hero. If short on time, SKIP.

---

## 3. Global quality bar (applies to all)
- **Bright & colorful**, per-section accent variety (brand/sky/violet/emerald/warm/pink). Not dull.
- **Word-light.** Short fragments over sentences. Let the interactive do the talking.
- **Every interactive auto-demos once on scroll-in** so passive visitors still see the magic, AND
  responds to clicks/hover.
- **Reduced-motion:** every new keyframe added to the `@media (prefers-reduced-motion: reduce)`
  block; interactives show their final/default state instantly.
- **Keyboard + a11y:** toggles/tabs/sidebar are real `<button>`s with `aria-pressed`/`aria-selected`;
  visible focus (the global focus-visible ring already exists).
- **390px:** zero horizontal page overflow. Wide mocks scroll inside their own container.
- **Tailwind literal-class rule:** no dynamic class concat — use literal maps (see `DOT`).

---

## 4. Verification (must pass before handing back)
1. `cd web && npm run build` → clean (no errors/type failures).
2. `npm run dev`, then with Playwright at **1440px** and **390px**:
   - Full-page screenshots of each new section (before/after where relevant).
   - Assert **no horizontal overflow** at 390 (`documentElement.scrollWidth <= clientWidth`).
   - **0 console errors** on the real page.
   - Drive each interactive: click the CallRush toggle (both states, meter counts up), switch trades
     + voices in BuildReceptionist (card updates, lead-text changes), click every CommandCenter
     sidebar item (panel swaps). Screenshot each state.
   - Confirm count-ups resolve to real numbers (not stuck at 0).
3. Reduced-motion spot check (emulate) — interactives settle to final state, no infinite jank.

---

## 5. Ship workflow (do this AFTER build+verify; the orchestrator may do this part)
- Branch: `feat/site-redesign-pass2` off latest `main`.
- **Git gotcha:** `main` carries earlier site work as *squashed* commits. If a branch was cut from a
  pre-squash local commit, a plain merge conflicts. Fix by rebasing only your new commits onto real
  `main`: `git fetch origin main && git rebase --onto origin/main <base> <branch>`. Cut the Pass 2
  branch fresh from `origin/main` to avoid this.
- **Do NOT commit** `incorporation/*` or unrelated WIP (`web/app/welcome/page.jsx` provisioning is
  someone else's work). Stage ONLY the Pass 2 files: `git add web/app/components/*.jsx
  web/app/page.jsx web/app/globals.css`.
- Review: `/code-review` (frontend, default effort) → fix must-fix → re-review fixes.
- Commit → PR → squash-merge to `main` → delete branch.
- **Deploy:** `cd web && vercel --prod --yes` (deploys via CLI; git auto-deploy is NOT wired here).
  Screenshots land in repo root — move them to scratchpad, don't commit them.
- **Verify on the Vercel production URL**, NOT `dispango.com` — the domain still serves the OLD
  GoDaddy site until DNS is flipped (a later phase). `curl` the deploy URL to confirm new content.

---

## 6. Decisions already locked (don't re-ask)
- Trades emergency-dispatch framing (not booking).
- Aspirational integrations are fine (owner accepted; keep honest fine-print) — already done Pass 1.
- Dashboard preview MUST be labeled a mockup/preview (real one is a later phase).
- Launch is locksmith-only, but the site markets all trades — feature real trades in the configurator.
- Cal.com link is live and already wired: `https://cal.com/abdul-zxafqn/30min`.
- Reference: Calio teardown lives in the session scratchpad `calio-ref/` (14 screenshots) — optional.
