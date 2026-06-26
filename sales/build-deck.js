const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

// ---------- palette ----------
const INK = "0C1726", BLUE = "2F6BED", BLUE_DK = "1F51C4", EMERALD = "0FAE7A";
const SOFT = "F4F8FD", LINE = "E7EDF6", TEXT = "44505F", MUTED = "8A97A8";
const ICE = "CADCFC", WHITE = "FFFFFF", BRAND50 = "EEF3FE";
const FONT = "Arial";

const W = 13.333, H = 7.5, MX = 0.7;
const shadow = () => ({ type: "outer", color: "0C1726", blur: 9, offset: 3, angle: 90, opacity: 0.10 });

// ---------- icons ----------
function svg(inner, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
async function png(inner, color) {
  const buf = await sharp(Buffer.from(svg(inner, color))).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
const I = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  repeat: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  bolt: '<path d="M13 2L3 14h7l-1 8 10-12h-7z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
};
const markSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2f6bed"/><circle cx="11" cy="22" r="2.4" fill="#fff"/><path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

async function main() {
  const mark = "image/png;base64," + (await sharp(Buffer.from(markSvg)).png().toBuffer()).toString("base64");
  const markInk = "image/png;base64," + (await sharp(Buffer.from(markSvg.replace('fill="#2f6bed"', 'fill="#0c1726"'))).png().toBuffer()).toString("base64");
  const ic = {};
  for (const k of Object.keys(I)) { ic[k] = { [BLUE]: await png(I[k], "#2f6bed"), [WHITE]: await png(I[k], "#ffffff"), [EMERALD]: await png(I[k], "#0fae7a") }; }

  const p = new pptxgen();
  p.defineLayout({ name: "WIDE", width: W, height: H });
  p.layout = "WIDE";
  p.author = "Dispango"; p.title = "Dispango — demo deck";

  const logo = (s, dark) => {
    s.addImage({ data: mark, x: MX, y: 0.42, w: 0.4, h: 0.4 });
    s.addText("Dispango", { x: MX + 0.5, y: 0.4, w: 3, h: 0.44, fontFace: FONT, fontSize: 15, bold: true, color: dark ? WHITE : INK, valign: "middle", margin: 0 });
  };
  const title = (s, t, y = 1.15) => s.addText(t, { x: MX, y, w: W - 2 * MX, h: 1.0, fontFace: FONT, fontSize: 34, bold: true, color: INK, margin: 0 });

  // ---- Slide 1: Title ----
  let s = p.addSlide(); s.background = { color: INK };
  s.addImage({ data: mark, x: (W - 1.15) / 2, y: 1.55, w: 1.15, h: 1.15 });
  s.addText("Dispango", { x: 0, y: 2.95, w: W, h: 0.9, align: "center", fontFace: FONT, fontSize: 52, bold: true, color: WHITE });
  s.addText("The AI receptionist that answers every call your shop misses.", { x: 1.5, y: 3.95, w: W - 3, h: 0.8, align: "center", fontFace: FONT, fontSize: 21, color: ICE });
  s.addText("Built for locksmiths  ·  24/7 call answering & instant lead dispatch", { x: 1.5, y: 4.75, w: W - 3, h: 0.5, align: "center", fontFace: FONT, fontSize: 13, color: MUTED });
  s.addNotes("Warm open. 'Thanks for the time — in the next 15 minutes I'll show you exactly how Dispango answers the calls you're missing and turns them into texted leads.' Confirm their name/shop and that they do emergency/after-hours work.");

  // ---- Slide 2: Problem ----
  s = p.addSlide(); s.background = { color: WHITE }; logo(s, false);
  title(s, "Every missed call is a job that\nwent to someone else.");
  s.addText("Locksmith calls are urgent — lockouts, break-ins, lost keys. They come after hours and while you're already on a job. Callers rarely leave a voicemail. They just dial the next shop on Google.", { x: MX, y: 2.9, w: 6.1, h: 2.2, fontFace: FONT, fontSize: 16, color: TEXT, lineSpacingMultiple: 1.25, margin: 0 });
  const stat = (x, n, l, col) => {
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.75, w: 1.95, h: 2.25, rectRadius: 0.12, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
    s.addText(n, { x, y: 3.15, w: 1.95, h: 1.0, align: "center", fontFace: FONT, fontSize: 40, bold: true, color: col, margin: 0 });
    s.addText(l, { x: x + 0.15, y: 4.15, w: 1.65, h: 0.7, align: "center", fontFace: FONT, fontSize: 12.5, color: MUTED, margin: 0 });
  };
  stat(7.2, "2 AM", "when lockouts\nactually happen", INK);
  stat(9.25, "1st", "to answer\nwins the job", BLUE);
  stat(11.3, "0", "voicemails most\ncallers leave", EMERALD);
  s.addNotes("Make it visceral: 'When someone's locked out at 2am, do they leave a voicemail and wait? No — they call the next number.' Ask: 'Roughly how many calls a week do you think you miss after hours or when you're on a job?' Let them say the number — it sells the rest.");

  // ---- Slide 3: Solution statement ----
  s = p.addSlide(); s.background = { color: BLUE };
  s.addImage({ data: markInk, x: MX, y: 0.55, w: 0.5, h: 0.5 });
  s.addText("Meet Dispango", { x: MX, y: 2.05, w: W - 2 * MX, h: 0.9, fontFace: FONT, fontSize: 40, bold: true, color: WHITE, margin: 0 });
  s.addText([
    { text: "An AI receptionist that answers in a natural voice, captures the job, and ", options: {} },
    { text: "texts the lead to your phone in seconds", options: { bold: true } },
    { text: " — 24/7, even when your hands are full.", options: {} },
  ], { x: MX, y: 3.05, w: 10.6, h: 1.8, fontFace: FONT, fontSize: 24, color: WHITE, lineSpacingMultiple: 1.25, margin: 0 });
  s.addNotes("The one-liner. Say it slowly. 'It's not voicemail and it's not a call centre — it's an AI that actually has the conversation and hands you a ready-to-work lead.' Then transition: 'Here's how it works.'");

  // ---- Slide 4: How it works ----
  s = p.addSlide(); s.background = { color: WHITE }; logo(s, false);
  title(s, "A receptionist that never sleeps");
  const steps = [
    ["phone", "The call comes in", "If you're busy or it's after hours, Dispango answers your number."],
    ["chat", "It gathers the job", "Natural voice — name, location, the problem, how urgent it is."],
    ["send", "You get a text", "The full lead lands on your phone in seconds. Call back or roll out."],
    ["repeat", "It remembers", "Repeat callers are greeted by name. No re-explaining the job."],
  ];
  steps.forEach((st, i) => {
    const x = MX + i * 3.02;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.7, w: 2.8, h: 3.2, rectRadius: 0.12, fill: { color: WHITE }, line: { color: LINE, width: 1 }, shadow: shadow() });
    s.addShape(p.shapes.OVAL, { x: x + 0.35, y: 3.05, w: 0.78, h: 0.78, fill: { color: BRAND50 } });
    s.addImage({ data: ic[st[0]][BLUE], x: x + 0.54, y: 3.24, w: 0.4, h: 0.4 });
    s.addText(`${i + 1}`, { x: x + 1.95, y: 3.0, w: 0.7, h: 0.7, align: "right", fontFace: FONT, fontSize: 30, bold: true, color: LINE, margin: 0 });
    s.addText(st[1], { x: x + 0.32, y: 4.0, w: 2.2, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0 });
    s.addText(st[2], { x: x + 0.32, y: 4.5, w: 2.25, h: 1.3, fontFace: FONT, fontSize: 12.5, color: TEXT, lineSpacingMultiple: 1.18, margin: 0 });
  });
  s.addNotes("Walk left to right, one sentence each. Emphasise step 3 — 'in seconds' — and step 4, the memory: 'A repeat customer calls and it already knows them. That's the kind of service that keeps people off Google next time.'");

  // ---- Slide 5: The lead text ----
  s = p.addSlide(); s.background = { color: SOFT }; logo(s, false);
  title(s, "Here's what lands on your phone");
  s.addText("No dashboard to check, no app to learn. Just a text with everything you need to win the job.", { x: MX, y: 2.35, w: 6.0, h: 1.4, fontFace: FONT, fontSize: 17, color: TEXT, lineSpacingMultiple: 1.3, margin: 0 });
  ["Who's calling and their number", "Where they are", "What the job is and how urgent", "A short summary in plain English"].forEach((t, i) => {
    s.addImage({ data: ic.check[EMERALD], x: MX, y: 3.95 + i * 0.55, w: 0.3, h: 0.3 });
    s.addText(t, { x: MX + 0.45, y: 3.9 + i * 0.55, w: 5.5, h: 0.45, fontFace: FONT, fontSize: 15, color: INK, valign: "middle", margin: 0 });
  });
  // phone
  const px = 8.4, py = 1.55;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: px, y: py, w: 3.4, h: 5.4, rectRadius: 0.35, fill: { color: "0A1320" }, shadow: shadow() });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: px + 0.18, y: py + 0.18, w: 3.04, h: 5.04, rectRadius: 0.22, fill: { color: "0E1A2B" } });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: px + 0.42, y: py + 0.5, w: 2.56, h: 1.0, rectRadius: 0.12, fill: { color: "152538" } });
  s.addImage({ data: ic.phone[WHITE], x: px + 0.6, y: py + 0.72, w: 0.32, h: 0.32 });
  s.addText("Missed call · 2:14 AM", { x: px + 1.05, y: py + 0.6, w: 1.9, h: 0.3, fontFace: FONT, fontSize: 9, color: "8597AD", margin: 0 });
  s.addText("(416) 555-0142", { x: px + 1.05, y: py + 0.92, w: 1.9, h: 0.35, fontFace: FONT, fontSize: 12, bold: true, color: "DBE6F3", margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: px + 0.42, y: py + 1.75, w: 2.56, h: 3.05, rectRadius: 0.14, fill: { color: "1B3050" } });
  s.addImage({ data: mark, x: px + 0.62, y: py + 1.95, w: 0.26, h: 0.26 });
  s.addText("DISPANGO", { x: px + 0.95, y: py + 1.95, w: 1.8, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: "88AAFF", margin: 0 });
  s.addText([
    { text: "URGENT — car lockout\n", options: { bold: true, color: WHITE } },
    { text: "Call back: (416) 555-0142\n", options: {} },
    { text: "Where: Queen St W & Bathurst\n", options: {} },
    { text: "Name: Marcus\n", options: {} },
    { text: "Notes: keys locked in running car, toddler inside.", options: {} },
  ], { x: px + 0.62, y: py + 2.35, w: 2.2, h: 2.3, fontFace: FONT, fontSize: 11, color: "DFE8F5", lineSpacingMultiple: 1.3, margin: 0 });
  s.addNotes("This is the 'aha' slide — let it land. 'That text arrived 8 seconds after the call ended, at 2am, while you were asleep. You wake up, see a real job with an address, and call Marcus back before your competitor's voicemail even gets checked.'");

  // ---- Slide 6: Benefits ----
  s = p.addSlide(); s.background = { color: WHITE }; logo(s, false);
  title(s, "Why locksmiths choose Dispango");
  const bens = [
    ["phone", "Catch every lead", "Answer at 2am, on a job, or while driving — without picking up."],
    ["hash", "Keeps your number", "Works with the number already on your truck and your ads."],
    ["mic", "Sounds human", "A natural voice that asks the right questions, not a robot."],
    ["shield", "Filters the junk", "Wrong numbers and robocalls handled — you only hear real jobs."],
    ["dollar", "Cheaper than a service", "Flat monthly rate. No per-minute operators, no voicemail tag."],
    ["bolt", "Live in a day", "We handle setup. Forward your calls and leads start arriving."],
  ];
  bens.forEach((b, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = MX + col * 4.05, y = 2.55 + row * 1.95;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.8, h: 1.75, rectRadius: 0.1, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
    s.addShape(p.shapes.OVAL, { x: x + 0.28, y: y + 0.32, w: 0.68, h: 0.68, fill: { color: WHITE }, line: { color: LINE, width: 1 } });
    s.addImage({ data: ic[b[0]][BLUE], x: x + 0.44, y: y + 0.48, w: 0.36, h: 0.36 });
    s.addText(b[1], { x: x + 1.15, y: y + 0.28, w: 2.5, h: 0.4, fontFace: FONT, fontSize: 15, bold: true, color: INK, margin: 0 });
    s.addText(b[2], { x: x + 1.15, y: y + 0.7, w: 2.5, h: 0.9, fontFace: FONT, fontSize: 11.5, color: TEXT, lineSpacingMultiple: 1.15, margin: 0 });
  });
  s.addNotes("Don't read all six — hit the two that matched their pain from slide 2. If they said after-hours, lead with 'catch every lead.' If they worried about robots, lead with 'sounds human.' Make it about them.");

  // ---- Slide 7: Pricing ----
  s = p.addSlide(); s.background = { color: WHITE }; logo(s, false);
  title(s, "Simple, flat monthly pricing");
  s.addText("No per-call charges. No long contracts. One predictable price — and a single missed job usually covers the month.", { x: MX, y: 2.3, w: 6.0, h: 1.6, fontFace: FONT, fontSize: 16, color: TEXT, lineSpacingMultiple: 1.3, margin: 0 });
  ["Answers your calls 24/7", "Captures & texts every lead", "Returning-caller memory", "Setup & support included"].forEach((t, i) => {
    s.addImage({ data: ic.check[EMERALD], x: MX, y: 4.05 + i * 0.55, w: 0.3, h: 0.3 });
    s.addText(t, { x: MX + 0.45, y: 4.0 + i * 0.55, w: 5.4, h: 0.45, fontFace: FONT, fontSize: 14.5, color: INK, valign: "middle", margin: 0 });
  });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 8.0, y: 2.4, w: 4.2, h: 3.9, rectRadius: 0.16, fill: { color: INK }, shadow: shadow() });
  s.addText("Locksmith plan", { x: 8.4, y: 2.8, w: 3.4, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: ICE, margin: 0 });
  s.addText([{ text: "$XXX", options: { fontSize: 46, bold: true, color: WHITE } }, { text: " /mo", options: { fontSize: 18, color: MUTED } }], { x: 8.4, y: 3.25, w: 3.4, h: 1.0, fontFace: FONT, margin: 0 });
  s.addText("Set your price here — replace before presenting.", { x: 8.4, y: 4.35, w: 3.4, h: 0.6, fontFace: FONT, fontSize: 11, italic: true, color: MUTED, margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 8.4, y: 5.2, w: 3.4, h: 0.7, rectRadius: 0.1, fill: { color: BLUE } });
  s.addText("Book a demo", { x: 8.4, y: 5.2, w: 3.4, h: 0.7, align: "center", valign: "middle", fontFace: FONT, fontSize: 15, bold: true, color: WHITE, margin: 0 });
  s.addNotes("PLACEHOLDER PRICE — set $XXX before any real call. Anchor on value, not cost: 'One after-hours lockout is usually $150–$250. The plan pays for itself the first job you'd have otherwise missed.' Then go quiet and let them react.");

  // ---- Slide 8: Social proof ----
  s = p.addSlide(); s.background = { color: SOFT }; logo(s, false);
  title(s, "Built for working locksmiths");
  s.addText("Placeholder — drop in real customer quotes once a few shops are live. Social proof is the strongest trust lever on a sales call.", { x: MX, y: 2.05, w: 9.5, h: 0.6, fontFace: FONT, fontSize: 13, italic: true, color: MUTED, margin: 0 });
  for (let i = 0; i < 3; i++) {
    const x = MX + i * 4.05;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.95, w: 3.8, h: 3.4, rectRadius: 0.12, fill: { color: WHITE }, line: { color: LINE, width: 1 }, shadow: shadow() });
    s.addText("★★★★★", { x: x + 0.35, y: 3.25, w: 3.1, h: 0.4, fontFace: FONT, fontSize: 16, color: "F5B301", margin: 0 });
    s.addText("“Replace with a real customer quote — ideally a specific result, like jobs won after hours.”", { x: x + 0.35, y: 3.7, w: 3.1, h: 1.7, fontFace: FONT, fontSize: 13.5, color: INK, lineSpacingMultiple: 1.25, margin: 0 });
    s.addShape(p.shapes.OVAL, { x: x + 0.35, y: 5.5, w: 0.6, h: 0.6, fill: { color: BRAND50 } });
    s.addText(["AB", "CD", "EF"][i], { x: x + 0.35, y: 5.5, w: 0.6, h: 0.6, align: "center", valign: "middle", fontFace: FONT, fontSize: 13, bold: true, color: BLUE_DK, margin: 0 });
    s.addText([{ text: "Add customer name\n", options: { bold: true, color: INK } }, { text: "Shop name · City", options: { color: MUTED, fontSize: 11 } }], { x: x + 1.1, y: 5.5, w: 2.5, h: 0.6, fontFace: FONT, fontSize: 12.5, margin: 0, valign: "middle" });
  }
  s.addNotes("If you have a real testimonial or even a screenshot of a happy text from a customer, use it here instead. Until then, you can skip this slide live or speak to early results. Never present fabricated quotes as real.");

  // ---- Slide 9: Onboarding ----
  s = p.addSlide(); s.background = { color: WHITE }; logo(s, false);
  title(s, "Up and running in a day");
  const on = [
    ["calendar", "We set it up", "We configure your AI receptionist and dispatch number for you."],
    ["phone", "You forward your calls", "A quick setting with your carrier — your number stays the same."],
    ["send", "Leads start arriving", "Missed calls turn into texts on your phone, starting the same day."],
  ];
  on.forEach((o, i) => {
    const x = MX + i * 4.05;
    s.addShape(p.shapes.ROUNDED_RECTANGLE, { x, y: 2.8, w: 3.8, h: 3.0, rectRadius: 0.12, fill: { color: SOFT }, line: { color: LINE, width: 1 } });
    s.addShape(p.shapes.OVAL, { x: x + 0.35, y: 3.15, w: 0.8, h: 0.8, fill: { color: BLUE } });
    s.addImage({ data: ic[o[0]][WHITE], x: x + 0.55, y: 3.35, w: 0.4, h: 0.4 });
    s.addText(`Step ${i + 1}`, { x: x + 1.3, y: 3.25, w: 2.2, h: 0.4, fontFace: FONT, fontSize: 12, bold: true, color: BLUE, margin: 0 });
    s.addText(o[1], { x: x + 0.35, y: 4.15, w: 3.1, h: 0.5, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0 });
    s.addText(o[2], { x: x + 0.35, y: 4.65, w: 3.1, h: 1.0, fontFace: FONT, fontSize: 12.5, color: TEXT, lineSpacingMultiple: 1.2, margin: 0 });
  });
  s.addNotes("Kill the #1 objection — 'this sounds complicated.' It isn't. 'We do the setup, you flip one forwarding setting, and you're getting leads the same day. Your number and your workflow don't change.'");

  // ---- Slide 10: CTA ----
  s = p.addSlide(); s.background = { color: INK };
  s.addImage({ data: mark, x: (W - 0.9) / 2, y: 1.5, w: 0.9, h: 0.9 });
  s.addText("Let's get your phone answered.", { x: 0, y: 2.7, w: W, h: 0.9, align: "center", fontFace: FONT, fontSize: 38, bold: true, color: WHITE });
  s.addText("Start a free trial demo and see Dispango handle a real call.", { x: 1.5, y: 3.7, w: W - 3, h: 0.6, align: "center", fontFace: FONT, fontSize: 18, color: ICE });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: (W - 3) / 2, y: 4.55, w: 3, h: 0.78, rectRadius: 0.12, fill: { color: BLUE } });
  s.addText("Book a demo", { x: (W - 3) / 2, y: 4.55, w: 3, h: 0.78, align: "center", valign: "middle", fontFace: FONT, fontSize: 17, bold: true, color: WHITE, margin: 0 });
  s.addText("hello@dispango.example   ·   (000) 000-0000   ·   dispango.com", { x: 0, y: 5.7, w: W, h: 0.5, align: "center", fontFace: FONT, fontSize: 13, color: MUTED });
  s.addNotes("Close with a clear next step: 'I'll set you up with a quick trial so you can hear it answer your own number.' Confirm the follow-up and put time on the calendar before you hang up. Replace contact details on this slide before presenting.");

  await p.writeFile({ fileName: "Dispango-demo-deck.pptx" });
  console.log("WROTE Dispango-demo-deck.pptx");
}
main().catch(e => { console.error(e); process.exit(1); });
