"use client";

import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase. The ANON key is safe in the browser BY DESIGN — every
// read it can make is gated by Row-Level Security in the database, so a customer
// only ever sees their own rows. The service-role key is NEVER shipped here.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// The authed write API (settings, test-text). Defaults to the same project's
// `dashboard` Edge Function.
export const DASHBOARD_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_URL ||
  (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/dashboard` : "");

// True once the env is wired. Pages check this so the site still builds/renders
// with a friendly "not configured yet" state when the keys aren't set.
export const supabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client = null;
export function getSupabase() {
  if (!supabaseConfigured) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _client;
}

// Call the authed dashboard API with the current session's access token attached.
// Returns { ok, status, data }. Throws only on network failure.
export async function callDashboard(path, { method = "GET", body } = {}) {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, status: 0, data: { error: "not configured" } };
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, status: 401, data: { error: "not signed in" } };
  const res = await fetch(`${DASHBOARD_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
