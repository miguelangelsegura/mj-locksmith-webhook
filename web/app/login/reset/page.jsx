"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/app/components/Logo";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

// Landing page for the password-reset email link. Supabase (detectSessionInUrl)
// turns the recovery link into a temporary session; the customer sets a new
// password, then we send them to the dashboard.
export default function ResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    // Give detectSessionInUrl a tick to consume the recovery token.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session);
      if (!data.session) setMsg({ tone: "error", text: "This reset link is invalid or has expired. Request a new one." });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg({ tone: "ok", text: "Password updated. Taking you to your dashboard…" });
      setTimeout(() => router.replace("/dashboard"), 900);
    } catch (err) {
      setMsg({ tone: "error", text: err?.message || "Couldn't update the password. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="glow-soft flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <a href="/" className="mb-8"><Logo /></a>
      <div className="reveal in w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-2xl shadow-ink/10">
        <h1 className="text-xl font-extrabold text-ink">Set a new password</h1>
        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-body">New password</span>
            <input
              type="password" required minLength={8} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" disabled={!ready}
              className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white disabled:opacity-50"
            />
          </label>
          {msg && (
            <p className={`rounded-xl px-3 py-2.5 text-xs font-medium ${
              msg.tone === "error" ? "bg-danger-50 text-danger" : "bg-emerald-50 text-emerald"
            }`}>{msg.text}</p>
          )}
          <button
            type="submit" disabled={busy || !ready || !supabaseConfigured}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted">
          <a href="/login" className="font-bold text-brand hover:underline">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
