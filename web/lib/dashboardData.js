"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { getSupabase, callDashboard, supabaseConfigured } from "@/lib/supabase";
import { DEMO_PROFILE, demoCalls } from "@/lib/demoData";

// Demo mode = the public "Live demo" tour. Set when ?demo=1 is seen, remembered in
// sessionStorage so it survives client-side navigation and refreshes within the tab.
const DEMO_KEY = "dispango_demo";
function detectDemo() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("demo") === "1") {
      sessionStorage.setItem(DEMO_KEY, "1");
      return true;
    }
    return sessionStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}
export function exitDemo() {
  try { sessionStorage.removeItem(DEMO_KEY); } catch {}
}

const DashboardContext = createContext(null);

// Columns the customer's browser reads from `calls` directly (under RLS — the DB
// returns only rows for the shop linked to this login). No raw_payload / no PII of
// other tenants can come back; RLS guarantees it.
const CALL_COLS =
  "vapi_call_id, client_id, started_at, ended_at, duration_seconds, caller_phone, " +
  "caller_name, service_address, door_type, damage_description, urgency, vehicle_info, " +
  "outcome, summary, transcript, notified_at, notified_phone";

export function DashboardProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    session: null,
    profile: null,
    calls: [],
    demo: false,
  });

  const load = useCallback(async () => {
    if (detectDemo()) {
      setState({ loading: false, error: null, session: null, profile: DEMO_PROFILE, calls: demoCalls(), demo: true });
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setState((s) => ({ ...s, loading: false, error: "not-configured" }));
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState((s) => ({ ...s, loading: false, session: null, error: "no-session" }));
      return;
    }
    // Profile (also links this login to its shop on first sign-in).
    const me = await callDashboard("/me");
    if (!me.ok) {
      setState((s) => ({
        ...s, loading: false, session, profile: null,
        error: me.status === 403 ? (me.data?.error || "no-shop") : "profile-failed",
      }));
      return;
    }
    // Leads/calls straight from Supabase under RLS.
    const { data: calls } = await supabase
      .from("calls").select(CALL_COLS)
      .not("ended_at", "is", null)
      .order("ended_at", { ascending: false })
      .limit(500);
    setState({ loading: false, error: null, session, profile: me.data.client, calls: calls || [] });
  }, []);

  useEffect(() => {
    load();
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (detectDemo()) return; // demo tour never depends on a session
      if (!session) setState((s) => ({ ...s, session: null, error: "no-session" }));
    });
    return () => sub?.subscription?.unsubscribe();
  }, [load]);

  const setProfile = useCallback((profile) => setState((s) => ({ ...s, profile })), []);

  return (
    <DashboardContext.Provider value={{ ...state, configured: supabaseConfigured, refresh: load, setProfile }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
