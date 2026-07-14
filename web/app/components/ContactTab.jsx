"use client";

import { useState } from "react";

/* Floating bottom-right "Contact Us" tab. Opens a small panel with the quick
   ways to reach us. Holds no secrets; all links come from props. */
export default function ContactTab({ email, phone, bookHref }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open && (
        <div className="animate-slideup w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-line bg-white p-5 shadow-2xl shadow-ink/10">
          <p className="text-sm font-bold text-ink">Talk to a human</p>
          <p className="mt-1 text-xs text-body">Real people, same-day replies. Pick whatever's easiest.</p>
          <div className="mt-4 space-y-2">
            <a href={bookHref} className="flex items-center justify-between rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5">
              Book a demo
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-brand">
              <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand" fill="none"><rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 5l7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              {email}
            </a>
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-brand">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-brand" fill="none"><path d="M5 3h3l1.5 4-2 1.5a10 10 0 0 0 4 4l1.5-2 4 1.5v3a1 1 0 0 1-1.1 1A14 14 0 0 1 4 4.1 1 1 0 0 1 5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                {phone}
              </a>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact panel" : "Contact us"}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-brand/30 transition-transform hover:-translate-y-0.5 ${open ? "bg-ink" : "animate-glow bg-brand"}`}
      >
        {open ? (
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6A1.5 1.5 0 0 1 14.5 13H8l-3.5 3v-3H5.5A1.5 1.5 0 0 1 4 11.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
        )}
        {open ? "Close" : "Contact us"}
      </button>
    </div>
  );
}
