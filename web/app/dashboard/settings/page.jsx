"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/dashboardData";
import { callDashboard } from "@/lib/supabase";
import { formatPhone } from "@/lib/format";
import { PageHeader, Skeleton } from "../ui";

const TIMEZONES = [
  { v: "America/St_Johns", l: "Newfoundland (St. John's)" },
  { v: "America/Halifax", l: "Atlantic (Halifax)" },
  { v: "America/Toronto", l: "Eastern (Toronto / Ottawa)" },
  { v: "America/Winnipeg", l: "Central (Winnipeg)" },
  { v: "America/Regina", l: "Saskatchewan (Regina)" },
  { v: "America/Edmonton", l: "Mountain (Calgary / Edmonton)" },
  { v: "America/Vancouver", l: "Pacific (Vancouver)" },
];
const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];
const DEFAULT_DAY = { on: true, open: "08:00", close: "17:00" };

function defaultHours() {
  const h = {};
  for (const [k] of DAYS) h[k] = k === "sat" || k === "sun" ? { on: false, open: "09:00", close: "17:00" } : { ...DEFAULT_DAY };
  return h;
}

export default function SettingsPage() {
  const { profile, loading, setProfile, demo } = useDashboard();
  if (loading || !profile) return <SettingsSkeleton />;
  return (
    <div className="animate-slideup space-y-5">
      <PageHeader title="Settings" subtitle="Control how your AI receptionist works. Changes take effect immediately." />
      {demo && (
        <p className="rounded-xl bg-warm-50 px-4 py-2.5 text-xs font-semibold text-warm-amber">
          You're viewing the demo — feel free to click around, but changes here aren't saved.
        </p>
      )}
      <AnsweringSection profile={profile} setProfile={setProfile} demo={demo} />
      <LeadNumberSection profile={profile} setProfile={setProfile} demo={demo} />
      <BusinessInfoSection profile={profile} setProfile={setProfile} demo={demo} />
      <RoiSection profile={profile} setProfile={setProfile} demo={demo} />
    </div>
  );
}

/* --- shared bits --- */
function Section({ title, desc, children }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-base font-extrabold text-ink">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SaveBar({ dirty, saving, status, onSave, label = "Save changes" }) {
  return (
    <div className="mt-5 flex items-center gap-3">
      <button type="button" onClick={onSave} disabled={!dirty || saving}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand/25 transition hover:bg-brand-600 disabled:opacity-40">
        {saving ? "Saving…" : label}
      </button>
      {status && (
        <span className={`text-xs font-semibold ${status.tone === "error" ? "text-danger" : "text-emerald"}`}>{status.text}</span>
      )}
    </div>
  );
}

function useSaver(setProfile, demo) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  async function save(patch, onOk) {
    if (demo) { setStatus({ tone: "ok", text: "Demo — changes aren't saved." }); onOk?.(); return; }
    setSaving(true); setStatus(null);
    const res = await callDashboard("/settings", { method: "PATCH", body: patch });
    setSaving(false);
    if (res.ok) {
      setProfile(res.data.client);
      setStatus({ tone: "ok", text: "Saved ✓" });
      onOk?.();
    } else {
      setStatus({ tone: "error", text: res.data?.error || "Couldn't save. Try again." });
    }
  }
  return { saving, status, setStatus, save };
}

/* --- 1. Answering mode + hours + timezone --- */
function AnsweringSection({ profile, setProfile, demo }) {
  const [mode, setMode] = useState(profile.answer_mode === "scheduled" ? "scheduled" : "ai_first");
  const [tz, setTz] = useState(profile.timezone || "America/Edmonton");
  const [hours, setHours] = useState(() => ({ ...defaultHours(), ...(profile.business_hours || {}) }));
  const [dirty, setDirty] = useState(false);
  const { saving, status, setStatus, save } = useSaver(setProfile, demo);

  const mark = () => { setDirty(true); setStatus(null); };
  const detectTz = () => {
    try { const d = Intl.DateTimeFormat().resolvedOptions().timeZone; if (d) { setTz(d); mark(); } } catch {}
  };
  const tzKnown = TIMEZONES.some((t) => t.v === tz);

  function onSave() {
    const patch = { answer_mode: mode, timezone: tz };
    if (mode === "scheduled") patch.business_hours = hours;
    save(patch, () => setDirty(false));
  }

  return (
    <Section title="When your AI answers" desc="Choose whether Dispango answers around the clock or only during set hours.">
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard active={mode === "ai_first"} onClick={() => { setMode("ai_first"); mark(); }}
          title="24/7 — always on" body="Dispango answers every call, day or night. Best for never missing a job." />
        <ModeCard active={mode === "scheduled"} onClick={() => { setMode("scheduled"); mark(); }}
          title="During set hours" body="Dispango answers within your hours below. Outside them, calls ring your own phone instead." />
      </div>

      {/* Timezone — always relevant so times are unambiguous */}
      <div className="mt-4 rounded-xl border border-line bg-soft p-3.5">
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-semibold text-body">
            Your timezone
            <button type="button" onClick={detectTz} className="font-bold text-brand hover:underline">Detect automatically</button>
          </span>
          <select value={tz} onChange={(e) => { setTz(e.target.value); mark(); }}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand">
            {!tzKnown && <option value={tz}>{tz}</option>}
            {TIMEZONES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <span className="mt-1 block text-[11px] text-muted">All the times below are in this zone. Right now it's {nowIn(tz)} there.</span>
        </label>
      </div>

      {mode === "scheduled" && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Your business hours</p>
          {DAYS.map(([key, label]) => (
            <DayRow key={key} label={label} day={hours[key]}
              onChange={(next) => { setHours((h) => ({ ...h, [key]: next })); mark(); }} />
          ))}
          {!profile.fallback_number && (
            <p className="mt-2 rounded-lg bg-warm-50 px-3 py-2 text-[11px] font-medium text-warm-amber">
              Set your shop's phone number below first — that's where after-hours calls will ring.
            </p>
          )}
        </div>
      )}

      <SaveBar dirty={dirty} saving={saving} status={status} onSave={onSave} label="Save answering settings" />
    </Section>
  );
}

function ModeCard({ active, onClick, title, body }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-xl border p-3.5 text-left transition-colors ${active ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${active ? "border-brand" : "border-line"}`}>
          {active && <span className="h-2 w-2 rounded-full bg-brand" />}
        </span>
        <span className="text-sm font-bold text-ink">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-xs text-muted">{body}</p>
    </button>
  );
}

function DayRow({ label, day, onChange }) {
  const d = day || { on: false, open: "08:00", close: "17:00" };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2">
      <button type="button" onClick={() => onChange({ ...d, on: !d.on })} aria-pressed={d.on}
        className={`flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${d.on ? "justify-end bg-brand" : "justify-start bg-line"}`}>
        <span className="h-4 w-4 rounded-full bg-white shadow" />
      </button>
      <span className="w-20 shrink-0 text-sm font-medium text-ink">{label}</span>
      {d.on ? (
        <div className="flex items-center gap-2 text-sm">
          <input type="time" value={d.open} onChange={(e) => onChange({ ...d, open: e.target.value })}
            className="rounded-lg border border-line bg-soft px-2 py-1 text-sm outline-none focus:border-brand" />
          <span className="text-muted">to</span>
          <input type="time" value={d.close} onChange={(e) => onChange({ ...d, close: e.target.value })}
            className="rounded-lg border border-line bg-soft px-2 py-1 text-sm outline-none focus:border-brand" />
        </div>
      ) : (
        <span className="text-sm text-muted">Closed — calls ring your phone</span>
      )}
    </div>
  );
}

/* --- 2. Lead delivery number + shop fallback --- */
function LeadNumberSection({ profile, setProfile, demo }) {
  const [dispatch, setDispatch] = useState(profile.dispatch_phone || "");
  const [fallback, setFallback] = useState(profile.fallback_number || "");
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState(null);
  const { saving, status, save } = useSaver(setProfile, demo);

  async function sendTest() {
    if (demo) { setTestMsg({ tone: "ok", text: "Demo — no real text is sent." }); return; }
    setTesting(true); setTestMsg(null);
    const res = await callDashboard("/test-text", { method: "POST", body: { to: dispatch.trim() } });
    setTesting(false);
    setTestMsg(res.ok
      ? { tone: "ok", text: `Test text sent to ${formatPhone(res.data.to)} — check your phone.` }
      : { tone: "error", text: res.data?.error || "Couldn't send the test." });
  }

  function onSave() {
    const patch = { dispatch_phone: dispatch.trim() };
    if (fallback.trim() !== (profile.fallback_number || "")) patch.fallback_number = fallback.trim();
    save(patch, () => setDirty(false));
  }

  return (
    <Section title="Where your leads go" desc="The number that gets a text the moment a job is captured, and the phone we ring for after-hours calls.">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-body">Lead-delivery number (texts land here)</span>
        <div className="flex flex-wrap gap-2">
          <input value={dispatch} onChange={(e) => { setDispatch(e.target.value); setDirty(true); }}
            placeholder="+14165551234"
            className="min-w-[12rem] flex-1 rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-white" />
          <button type="button" onClick={sendTest} disabled={testing || !dispatch.trim()}
            className="rounded-xl border border-brand px-3.5 py-2.5 text-sm font-bold text-brand transition hover:bg-indigo-50 disabled:opacity-40">
            {testing ? "Sending…" : "Send test text"}
          </button>
        </div>
        <span className="mt-1 block text-[11px] text-muted">Use the full number with country code, e.g. +1 416 555 1234.</span>
        {testMsg && <span className={`mt-1 block text-xs font-semibold ${testMsg.tone === "error" ? "text-danger" : "text-emerald"}`}>{testMsg.text}</span>}
      </label>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold text-body">Your shop's phone (after-hours calls ring here)</span>
        <input value={fallback} onChange={(e) => { setFallback(e.target.value); setDirty(true); }}
          placeholder="+14165551234"
          className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-white" />
        <span className="mt-1 block text-[11px] text-muted">Used when you set specific hours — calls outside them forward here instead of the AI answering.</span>
      </label>

      <SaveBar dirty={dirty} saving={saving} status={status} onSave={onSave} label="Save numbers" />
    </Section>
  );
}

/* --- 3. Business info --- */
function BusinessInfoSection({ profile, setProfile, demo }) {
  const [area, setArea] = useState(profile.service_area || "");
  const [services, setServices] = useState(profile.services_offered || "");
  const [pricing, setPricing] = useState(profile.pricing_notes || "");
  const [dirty, setDirty] = useState(false);
  const { saving, status, save } = useSaver(setProfile, demo);
  const mark = () => setDirty(true);

  function onSave() {
    save({ service_area: area.trim(), services_offered: services.trim(), pricing_notes: pricing.trim() }, () => setDirty(false));
  }

  return (
    <Section title="About your business" desc="Your AI reads this on every call — it'll state your service area and services, and quote a price when you've listed one (otherwise it says the technician confirms on-site). The more you add, the sharper it sounds.">
      <div className="space-y-4">
        <Textarea label="Service area" value={area} onChange={(v) => { setArea(v); mark(); }}
          placeholder="e.g. Calgary and surrounding areas, within 30 km" rows={2} />
        <Textarea label="Services offered" value={services} onChange={(v) => { setServices(v); mark(); }}
          placeholder="e.g. Lockouts, rekeying, lock replacement, car key fobs" rows={3} />
        <Textarea label="Pricing notes" value={pricing} onChange={(v) => { setPricing(v); mark(); }}
          placeholder="e.g. Service call starts at $89. After-hours surcharge $40." rows={3} />
        <p className="rounded-lg bg-soft px-3 py-2 text-[11px] text-muted">
          The AI only quotes prices you write here. For anything not listed, it stays safe and says the tech confirms on-site.
        </p>
      </div>
      <SaveBar dirty={dirty} saving={saving} status={status} onSave={onSave} label="Save business info" />
    </Section>
  );
}

/* --- 4. Reporting: average job value (drives the ROI estimate) --- */
function RoiSection({ profile, setProfile, demo }) {
  const [value, setValue] = useState(profile.avg_job_value != null ? String(profile.avg_job_value) : "150");
  const [dirty, setDirty] = useState(false);
  const { saving, status, save } = useSaver(setProfile, demo);

  function onSave() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) { setValue("150"); return; }
    save({ avg_job_value: n }, () => setDirty(false));
  }

  return (
    <Section title="Your numbers" desc="Used only for the 'Value captured' estimate on your dashboard — not shared with callers.">
      <label className="block max-w-xs">
        <span className="mb-1 block text-xs font-semibold text-body">Average job value</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-muted">$</span>
          <input type="number" min="0" step="10" inputMode="decimal" value={value}
            onChange={(e) => { setValue(e.target.value); setDirty(true); }}
            className="w-32 rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-white" />
        </div>
        <span className="mt-1 block text-[11px] text-muted">Your typical ticket. “Value captured” = jobs captured × this.</span>
      </label>
      <SaveBar dirty={dirty} saving={saving} status={status} onSave={onSave} label="Save" />
    </Section>
  );
}

function Textarea({ label, value, onChange, placeholder, rows }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-body">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full resize-y rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-white" />
    </label>
  );
}

function nowIn(tz) {
  try {
    return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date());
  } catch { return "—"; }
}

function SettingsSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-40" />
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
    </div>
  );
}
