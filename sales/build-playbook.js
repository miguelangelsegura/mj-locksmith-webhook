const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const INK = "0C1726", BLUE = "2F6BED", EMERALD = "0FAE7A";
const SOFT = "F4F8FD", LINE = "E7EDF6", TEXT = "44505F", MUTED = "8A97A8";
const ICE = "CADCFC", WHITE = "FFFFFF", BRAND50 = "EEF3FE";
const FONT = "Arial";
const W = 8.5, H = 11, MX = 0.6;

const markSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2f6bed"/><circle cx="11" cy="22" r="2.4" fill="#fff"/><path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

async function main() {
  const mark = "image/png;base64," + (await sharp(Buffer.from(markSvg)).png().toBuffer()).toString("base64");
  const markInk = "image/png;base64," + (await sharp(Buffer.from(markSvg.replace('fill="#2f6bed"', 'fill="#0c1726"'))).png().toBuffer()).toString("base64");

  const p = new pptxgen();
  p.defineLayout({ name: "PB", width: W, height: H });
  p.layout = "PB";
  const RR = p.shapes.ROUNDED_RECTANGLE, RECT = p.shapes.RECTANGLE, OVAL = p.shapes.OVAL;

  const header = (s, label) => {
    s.addImage({ data: mark, x: MX, y: 0.5, w: 0.32, h: 0.32 });
    s.addText("Dispango Sales Playbook", { x: MX + 0.42, y: 0.48, w: 4.5, h: 0.36, fontFace: FONT, fontSize: 11, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(label, { x: W - MX - 2.6, y: 0.48, w: 2.6, h: 0.36, align: "right", fontFace: FONT, fontSize: 10, color: MUTED, valign: "middle", margin: 0 });
    s.addShape(RECT, { x: MX, y: 0.95, w: W - 2 * MX, h: 0.014, fill: { color: LINE } });
  };

  // ---------- Cover ----------
  let s = p.addSlide(); s.background = { color: INK };
  s.addImage({ data: mark, x: MX, y: 0.7, w: 0.5, h: 0.5 });
  s.addText("Dispango", { x: MX + 0.62, y: 0.68, w: 4, h: 0.54, fontFace: FONT, fontSize: 20, bold: true, color: WHITE, valign: "middle", margin: 0 });
  s.addText("Sales Playbook", { x: MX, y: 2.7, w: W - 2 * MX, h: 1.0, fontFace: FONT, fontSize: 44, bold: true, color: WHITE, margin: 0 });
  s.addText("How we turn locksmiths into customers — find them, call them, follow up, close, and get them live.", { x: MX, y: 3.9, w: 6.6, h: 0.9, fontFace: FONT, fontSize: 14, color: ICE, lineSpacingMultiple: 1.25, margin: 0 });
  const stages = ["Identify", "Cold call", "Follow up", "Close", "Onboard"];
  stages.forEach((t, i) => {
    const y = 5.7 + i * 0.62;
    s.addShape(OVAL, { x: MX, y, w: 0.4, h: 0.4, fill: { color: BLUE } });
    s.addText(`${i + 1}`, { x: MX, y, w: 0.4, h: 0.4, align: "center", valign: "middle", fontFace: FONT, fontSize: 12, bold: true, color: WHITE, margin: 0 });
    s.addText(t, { x: MX + 0.6, y, w: 4, h: 0.4, fontFace: FONT, fontSize: 15, bold: true, color: WHITE, valign: "middle", margin: 0 });
  });
  s.addText("Internal use only", { x: MX, y: H - 0.8, w: 4, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });

  // ---------- Overview ----------
  s = p.addSlide(); s.background = { color: WHITE }; header(s, "Overview");
  s.addText("The sales motion", { x: MX, y: 1.15, w: W - 2 * MX, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK, margin: 0 });
  s.addText("Five stages. Each has one job: move the prospect to the next stage.", { x: MX, y: 1.8, w: W - 2 * MX, h: 0.4, fontFace: FONT, fontSize: 12, color: TEXT, margin: 0 });
  const ow = (W - 2 * MX);
  stages.forEach((t, i) => {
    const cw = ow / 5, cx = MX + i * cw + cw / 2;
    s.addShape(OVAL, { x: cx - 0.3, y: 2.5, w: 0.6, h: 0.6, fill: { color: BRAND50 } });
    s.addText(`${i + 1}`, { x: cx - 0.3, y: 2.5, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: FONT, fontSize: 16, bold: true, color: BLUE, margin: 0 });
    s.addText(t, { x: cx - cw / 2, y: 3.2, w: cw, h: 0.35, align: "center", fontFace: FONT, fontSize: 11, bold: true, color: INK, margin: 0 });
    if (i < 4) s.addShape(RECT, { x: cx + 0.32, y: 2.79, w: cw - 0.64, h: 0.014, fill: { color: LINE } });
  });
  const col = (title, items, x) => {
    s.addText(title, { x, y: 4.05, w: 3.45, h: 0.35, fontFace: FONT, fontSize: 13, bold: true, color: INK, margin: 0 });
    s.addText(items.map(t => ({ text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })), { x, y: 4.5, w: 3.45, h: 4.0, valign: "top", fontFace: FONT, fontSize: 11, color: TEXT, margin: 0 });
  };
  col("Principles", [
    "One goal per stage — always advance to the next.",
    "Lead with their pain (missed, after-hours calls), not features.",
    "CASL always: only published-email consent, footer on every email, honor opt-outs.",
    "Track every prospect's stage and outcome.",
    "The cold call sells the demo; the demo sells the service.",
  ], MX);
  col("Tools we use", [
    "Identify — the /locksmith-outreach skill + outreach/contacted.csv",
    "Book — Calendly",
    "Close — the demo deck + one-page brochure",
    "Onboard — the admin tool (admin-ui → admin API)",
    "Legitimacy — the dispango.com website",
  ], 4.55);

  // ---------- Phase template ----------
  const phase = (num, name, goal, steps, tips, callout) => {
    const s = p.addSlide(); s.background = { color: WHITE };
    header(s, `Stage ${num} of 5`);
    s.addText([{ text: `0${num}   `, options: { color: BLUE, bold: true } }, { text: name, options: { color: INK, bold: true } }], { x: MX, y: 1.15, w: W - 2 * MX, h: 0.6, fontFace: FONT, fontSize: 26, margin: 0 });
    s.addShape(RR, { x: MX, y: 1.9, w: W - 2 * MX, h: 0.8, rectRadius: 0.1, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
    s.addText([{ text: "GOAL   ", options: { bold: true, color: BLUE, fontSize: 10 } }, { text: goal, options: { color: INK, fontSize: 12 } }], { x: MX + 0.28, y: 1.9, w: W - 2 * MX - 0.56, h: 0.8, valign: "middle", fontFace: FONT, margin: 0 });
    const ly = 3.0, lh = callout ? 4.4 : 6.0;
    s.addText("DO THIS", { x: MX, y: ly, w: 3.5, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: INK, charSpacing: 1, margin: 0 });
    s.addText(steps.map(t => ({ text: t, options: { bullet: { type: "number" }, breakLine: true, paraSpaceAfter: 9 } })), { x: MX, y: ly + 0.42, w: 3.5, h: lh, valign: "top", fontFace: FONT, fontSize: 10.5, color: TEXT, margin: 0 });
    s.addText("TIPS", { x: 4.5, y: ly, w: 3.4, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: INK, charSpacing: 1, margin: 0 });
    s.addText(tips.map(t => ({ text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 9 } })), { x: 4.5, y: ly + 0.42, w: 3.4, h: lh, valign: "top", fontFace: FONT, fontSize: 10.5, color: TEXT, margin: 0 });
    if (callout) {
      s.addShape(RR, { x: MX, y: 8.7, w: W - 2 * MX, h: 1.75, rectRadius: 0.1, fill: { color: INK } });
      s.addImage({ data: mark, x: MX + 0.3, y: 8.92, w: 0.26, h: 0.26 });
      s.addText(callout.t, { x: MX + 0.66, y: 8.9, w: W - 2 * MX - 1, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: ICE, margin: 0 });
      s.addText(callout.b, { x: MX + 0.3, y: 9.3, w: W - 2 * MX - 0.6, h: 1.05, fontFace: FONT, fontSize: 10.5, color: WHITE, lineSpacingMultiple: 1.2, italic: !!callout.i, margin: 0 });
    }
  };

  phase(1, "Identify prospects", "Build a steady list of locksmith shops worth calling.",
    ["Pick one city or region — start local and Canadian.",
     "Mine Google Maps + directories for shop names (search alone misses locals).",
     "Visit each shop's own site; grab phone, published email, hours, services.",
     "Log to the sheet; dedup by domain and email.",
     "Prioritize 24/7, emergency, mobile, owner-run shops."],
    ["Use the /locksmith-outreach skill to find shops and draft emails.",
     "CASL: only use a conspicuously published email — never guess info@.",
     "Note one hook per shop (their after-hours claims, reviews).",
     "Build a batch before you start dialing — volume matters."],
    { t: "Tool", b: "/locksmith-outreach finds shops by city, grabs their published email, and creates CASL-compliant Gmail drafts. The dedup ledger is outreach/contacted.csv — reruns never double-contact." });

  phase(2, "Cold call", "Book a 15-minute demo. Nothing more.",
    ["Call during work hours; avoid the obvious emergency rush.",
     "Open with your name and the pain you solve, not the product.",
     "Hook: 'When someone's locked out at 2am, do they leave a voicemail?'",
     "One line: AI answers, captures the job, texts you the lead — 24/7.",
     "Ask for the demo and book it live on Calendly."],
    ["The call's only goal is the demo — don't over-explain.",
     "Lead with their pain; features come in the demo.",
     "Have the Calendly link open and book on the call.",
     "Log the outcome: booked / call back / not interested / no answer."],
    { i: true, t: "Opener script", b: "“Hi [name], it's [you] with Dispango. Quick one — when you're on a job or it's after hours and a call comes in, what happens to it right now?”  …  “That's exactly what we fix. Can I show you in 15 minutes how it'd answer your number — does Thursday or Friday work?”" });

  phase(3, "Follow up (missed call)", "Reconnect when the cold call didn't land.",
    ["Same day: a short voicemail — who you are, 'I'll text you the details.'",
     "Right after: SMS or email with the one-liner, Calendly link, and brochure.",
     "Day 2-3: second touch, a new angle (a stat or the lead-text example).",
     "Day 5-7: the breakup — 'should I close your file?'",
     "Stop after 3-4 touches; mark the status."],
    ["Reference the missed call ('tried you earlier today').",
     "Attach the one-page brochure PDF.",
     "Every email carries the CASL footer; honor opt-outs immediately.",
     "Space the touches — persistent, not spammy."],
    { t: "Assets", b: "Attach sales/Dispango-brochure.pdf and send the Calendly link. Every commercial email must include the CASL footer: sender identity, a physical mailing address, and a working unsubscribe." });

  phase(4, "Close", "Turn the demo into a yes.",
    ["Run the demo deck; tailor it to the pain they named.",
     "Show the lead-text example — that's the 'aha'.",
     "State pricing simply; anchor on the value, not the cost.",
     "Offer a trial demo on their own number.",
     "Ask for the close: 'Want me to set you up today?'",
     "Lock the onboarding step before you hang up."],
    ["Don't discount on reflex — sell the cost of a missed job.",
     "'Sounds like a robot?' — it's a natural voice; most don't notice.",
     "'I answer my own calls' — it only steps in when you can't.",
     "'Too complicated?' — we set it up; you're live in a day."],
    { i: true, t: "Value anchor", b: "“One after-hours lockout is usually $150-$250. The plan pays for itself the first job you'd otherwise have missed.”  Then stop talking and let them react." });

  phase(5, "Onboard", "Get them live and getting leads the same day.",
    ["Collect: business and agent name, inbound number, dispatch phone, hours.",
     "Create the client in the admin tool (it validates the number).",
     "Hit 'Send test SMS' to confirm the dispatch phone receives texts.",
     "Have them forward busy/no-answer calls to the Dispango number.",
     "Place a test call; confirm the lead text arrives.",
     "Confirm go-live; book a check-in for day 3-5."],
    ["Use the admin UI — never raw SQL (it broke prod twice).",
     "Phones in E.164 (+1…); business/agent name feed the greeting.",
     "Their number doesn't change — only call forwarding does.",
     "Verify a real test call before you call it done."],
    { t: "Tool", b: "The admin tool (admin-ui page → admin API): create the client, send a test SMS, toggle active. Onboarding done = a correct clients row plus call forwarding set on their line." });

  // ---------- Cadence & metrics ----------
  s = p.addSlide(); s.background = { color: WHITE }; header(s, "Cadence & metrics");
  s.addText("Run it on a rhythm", { x: MX, y: 1.15, w: W - 2 * MX, h: 0.6, fontFace: FONT, fontSize: 26, bold: true, color: INK, margin: 0 });
  s.addShape(RR, { x: MX, y: 1.95, w: 3.55, h: 3.4, rectRadius: 0.12, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
  s.addText("Weekly rhythm", { x: MX + 0.3, y: 2.2, w: 3.0, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0 });
  s.addText([
    "Mon — build/refresh the prospect list",
    "Tue-Thu — cold-call blocks (aim for volume)",
    "Daily — work the follow-up queue",
    "Wed-Fri — run booked demos",
    "Fri — onboard closes, review the funnel",
  ].map(t => ({ text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } })), { x: MX + 0.3, y: 2.7, w: 2.95, h: 2.5, valign: "top", fontFace: FONT, fontSize: 11, color: TEXT, margin: 0 });
  s.addShape(RR, { x: 4.45, y: 1.95, w: 3.45, h: 3.4, rectRadius: 0.12, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
  s.addText("Funnel to track", { x: 4.75, y: 2.2, w: 3.0, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0 });
  s.addText([
    "Lists built  →  calls made",
    "Calls  →  demos booked",
    "Booked  →  demos held",
    "Held  →  closed",
    "Closed  →  onboarded (time-to-live)",
  ].map(t => ({ text: t, options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } })), { x: 4.75, y: 2.7, w: 2.9, h: 2.5, valign: "top", fontFace: FONT, fontSize: 11, color: TEXT, margin: 0 });
  s.addShape(RR, { x: MX, y: 5.65, w: W - 2 * MX, h: 1.5, rectRadius: 0.12, fill: { color: INK } });
  s.addText("The one number that matters", { x: MX + 0.3, y: 5.85, w: 6, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: ICE, margin: 0 });
  s.addText("Demos booked per week. Everything upstream (lists, calls, follow-ups) exists to grow it; everything downstream (close, onboard) converts it. Review it every Friday.", { x: MX + 0.3, y: 6.22, w: W - 2 * MX - 0.6, h: 0.8, fontFace: FONT, fontSize: 11, color: WHITE, lineSpacingMultiple: 1.2, margin: 0 });

  await p.writeFile({ fileName: "Dispango-sales-playbook.pptx" });
  console.log("WROTE Dispango-sales-playbook.pptx");
}
main().catch(e => { console.error(e); process.exit(1); });
