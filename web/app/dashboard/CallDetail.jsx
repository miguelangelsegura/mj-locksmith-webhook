"use client";

import { Badge } from "./ui";
import {
  displayName, jobLine, formatPhone, formatDateTime, formatDuration,
  titleCase, callStatus, urgencyTone,
} from "@/lib/format";

function Row({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-24 shrink-0 text-xs font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

// The full record for one call — shared by the Leads and Call Logs master-detail
// views. Shows only what RLS handed us for this shop.
export default function CallDetail({ call, tz }) {
  if (!call) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 p-6 text-center text-sm text-muted">
        Select a call to see the full details.
      </div>
    );
  }
  const status = callStatus(call);
  const texted = !!call.notified_at;

  return (
    <div className="animate-slideup rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-ink">{displayName(call)}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {formatDateTime(call.ended_at, tz)}
            {call.duration_seconds != null && <> · {formatDuration(call.duration_seconds)}</>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={status.tone}>{status.label}</Badge>
          {call.urgency && <Badge tone={urgencyTone(call.urgency)}>{call.urgency}</Badge>}
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line/70">
        <Row label="Call back">
          {call.caller_phone ? <a href={`tel:${call.caller_phone}`} className="font-semibold text-brand">{formatPhone(call.caller_phone)}</a> : null}
        </Row>
        <Row label="Job">{jobLine(call)}</Row>
        <Row label="Service">{call.door_type ? titleCase(call.door_type) : null}</Row>
        <Row label="Where">{call.service_address}</Row>
        <Row label="Vehicle">{call.vehicle_info}</Row>
        <Row label="Details">{call.damage_description}</Row>
      </dl>

      {call.summary && (
        <div className="mt-4 rounded-xl bg-soft px-3.5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Call summary</p>
          <p className="mt-1 text-sm leading-relaxed text-body">{call.summary}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span className={`h-2 w-2 rounded-full ${texted ? "bg-emerald" : "bg-muted"}`} />
        <span className="text-muted">
          {texted ? `Lead texted to ${call.notified_phone ? formatPhone(call.notified_phone) : "you"}` : "Not texted (spam or info-only call)"}
        </span>
      </div>

      {call.transcript && (
        <details className="group mt-4">
          <summary className="cursor-pointer list-none text-xs font-bold text-brand hover:underline">
            <span className="group-open:hidden">Show transcript</span>
            <span className="hidden group-open:inline">Hide transcript</span>
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-ink/95 p-3.5 text-[11px] leading-relaxed text-white/85">{call.transcript}</pre>
        </details>
      )}
    </div>
  );
}
