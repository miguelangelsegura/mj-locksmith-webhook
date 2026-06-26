const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const INK = "0C1726", BLUE = "2F6BED", BLUE_DK = "1F51C4", EMERALD = "0FAE7A";
const SOFT = "F4F8FD", LINE = "E7EDF6", TEXT = "44505F", MUTED = "8A97A8";
const ICE = "CADCFC", WHITE = "FFFFFF", BRAND50 = "EEF3FE";
const FONT = "Arial";
const W = 8.5, H = 11, MX = 0.55;
const sh = () => ({ type: "outer", color: "0C1726", blur: 8, offset: 2, angle: 90, opacity: 0.10 });

function svg(inner, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
async function png(inner, color) {
  return "image/png;base64," + (await sharp(Buffer.from(svg(inner, color))).png().toBuffer()).toString("base64");
}
const I = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  repeat: '<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/>',
};
const markSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2f6bed"/><circle cx="11" cy="22" r="2.4" fill="#fff"/><path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';

async function main() {
  const mark = "image/png;base64," + (await sharp(Buffer.from(markSvg)).png().toBuffer()).toString("base64");
  const ic = {};
  for (const k of Object.keys(I)) ic[k] = { b: await png(I[k], "#2f6bed"), w: await png(I[k], "#ffffff"), e: await png(I[k], "#0fae7a") };

  const p = new pptxgen();
  p.defineLayout({ name: "BRO", width: W, height: H });
  p.layout = "BRO";
  const s = p.addSlide(); s.background = { color: WHITE };

  // header band
  s.addShape(p.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 1.45, fill: { color: INK } });
  s.addImage({ data: mark, x: MX, y: 0.46, w: 0.5, h: 0.5 });
  s.addText("Dispango", { x: MX + 0.62, y: 0.44, w: 3, h: 0.54, fontFace: FONT, fontSize: 20, bold: true, color: WHITE, valign: "middle", margin: 0 });
  s.addText("AI receptionist for locksmiths", { x: 4.0, y: 0.5, w: W - 4 - MX, h: 0.45, align: "right", fontFace: FONT, fontSize: 12, color: ICE, valign: "middle", margin: 0 });

  // headline
  s.addText("Every missed call is a job that\nwent to someone else.", { x: MX, y: 1.7, w: W - 2 * MX, h: 1.05, fontFace: FONT, fontSize: 23, bold: true, color: INK, lineSpacingMultiple: 1.02, margin: 0 });
  s.addText("Dispango answers in a natural voice, captures the job, and texts you the lead in seconds — 24/7, even when your hands are full.", { x: MX, y: 2.82, w: W - 2 * MX, h: 0.7, fontFace: FONT, fontSize: 12, color: TEXT, lineSpacingMultiple: 1.2, margin: 0 });

  // how it works row
  const steps = [["phone", "Call comes in"], ["chat", "It gathers the job"], ["send", "You get a text"], ["repeat", "It remembers"]];
  steps.forEach((st, i) => {
    const cx = MX + i * 1.85 + 0.925;
    s.addShape(p.shapes.OVAL, { x: cx - 0.34, y: 3.7, w: 0.68, h: 0.68, fill: { color: BRAND50 } });
    s.addImage({ data: ic[st[0]].b, x: cx - 0.18, y: 3.86, w: 0.36, h: 0.36 });
    s.addText(st[1], { x: cx - 0.925, y: 4.45, w: 1.85, h: 0.5, align: "center", fontFace: FONT, fontSize: 11, bold: true, color: INK, margin: 0 });
  });

  // left: lead text card
  const cx0 = MX, cy0 = 5.35, cw = 3.35, ch = 3.95;
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: cx0, y: cy0, w: cw, h: ch, rectRadius: 0.14, fill: { color: "0E1A2B" }, shadow: sh() });
  s.addText("WHAT LANDS ON YOUR PHONE", { x: cx0 + 0.28, y: cy0 + 0.25, w: cw - 0.56, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: "8597AD", charSpacing: 1, margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: cx0 + 0.28, y: cy0 + 0.62, w: cw - 0.56, h: 0.75, rectRadius: 0.1, fill: { color: "152538" } });
  s.addImage({ data: ic.phone.w, x: cx0 + 0.45, y: cy0 + 0.82, w: 0.28, h: 0.28 });
  s.addText("Missed call · 2:14 AM", { x: cx0 + 0.82, y: cy0 + 0.7, w: 2.0, h: 0.25, fontFace: FONT, fontSize: 8.5, color: "8597AD", margin: 0 });
  s.addText("(416) 555-0142", { x: cx0 + 0.82, y: cy0 + 0.95, w: 2.0, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: "DBE6F3", margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: cx0 + 0.28, y: cy0 + 1.5, w: cw - 0.56, h: 2.2, rectRadius: 0.12, fill: { color: "1B3050" } });
  s.addImage({ data: mark, x: cx0 + 0.45, y: cy0 + 1.68, w: 0.24, h: 0.24 });
  s.addText("DISPANGO", { x: cx0 + 0.76, y: cy0 + 1.68, w: 1.8, h: 0.26, fontFace: FONT, fontSize: 9.5, bold: true, color: "88AAFF", margin: 0 });
  s.addText([
    { text: "URGENT — car lockout\n", options: { bold: true, color: WHITE } },
    { text: "Call back: (416) 555-0142\n", options: {} },
    { text: "Where: Queen St W & Bathurst\n", options: {} },
    { text: "Name: Marcus\n", options: {} },
    { text: "Notes: keys locked in running car, toddler inside.", options: {} },
  ], { x: cx0 + 0.45, y: cy0 + 2.02, w: cw - 0.9, h: 1.55, fontFace: FONT, fontSize: 9.5, color: "DFE8F5", lineSpacingMultiple: 1.25, margin: 0 });

  // right: benefits
  const rx = 4.25;
  s.addText("Why locksmiths choose Dispango", { x: rx, y: cy0 + 0.05, w: W - rx - MX, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0 });
  const bens = [
    ["Catch every lead", "Answer after hours or while on a job."],
    ["Keeps your number", "Works with the line already on your truck."],
    ["Sounds human", "A natural voice, not a robot."],
    ["Filters the junk", "Wrong numbers handled — only real jobs."],
    ["Live in a day", "We set it up; you forward your calls."],
  ];
  bens.forEach((b, i) => {
    const y = cy0 + 0.6 + i * 0.66;
    s.addImage({ data: ic.check.e, x: rx, y: y + 0.02, w: 0.26, h: 0.26 });
    s.addText(b[0], { x: rx + 0.4, y: y - 0.04, w: W - rx - MX - 0.4, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: INK, margin: 0 });
    s.addText(b[1], { x: rx + 0.4, y: y + 0.24, w: W - rx - MX - 0.4, h: 0.3, fontFace: FONT, fontSize: 10, color: TEXT, margin: 0 });
  });

  // footer band
  s.addShape(p.shapes.RECTANGLE, { x: 0, y: 9.55, w: W, h: H - 9.55, fill: { color: INK } });
  s.addText("Ready to stop missing calls?", { x: MX, y: 9.78, w: 5.4, h: 0.5, fontFace: FONT, fontSize: 17, bold: true, color: WHITE, margin: 0 });
  s.addText("Book a 15-minute demo — watch Dispango handle a real call.", { x: MX, y: 10.28, w: 5.4, h: 0.4, fontFace: FONT, fontSize: 11, color: ICE, margin: 0 });
  s.addText("hello@dispango.example   ·   (000) 000-0000   ·   dispango.com", { x: MX, y: 10.62, w: 5.6, h: 0.35, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 });
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 6.15, y: 9.95, w: 1.8, h: 0.66, rectRadius: 0.1, fill: { color: BLUE } });
  s.addText("Book a demo", { x: 6.15, y: 9.95, w: 1.8, h: 0.66, align: "center", valign: "middle", fontFace: FONT, fontSize: 13, bold: true, color: WHITE, margin: 0 });

  await p.writeFile({ fileName: "Dispango-brochure.pptx" });
  console.log("WROTE Dispango-brochure.pptx");
}
main().catch(e => { console.error(e); process.exit(1); });
