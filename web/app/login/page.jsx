"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/app/components/Logo";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

const MODES = {
  signin: { title: "Welcome back", cta: "Sign in", alt: "signup", altLabel: "Create one" },
  signup: { title: "Create your login", cta: "Create account", alt: "signin", altLabel: "Sign in" },
  forgot: { title: "Reset your password", cta: "Send reset link", alt: "signin", altLabel: "Back to sign in" },
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { tone: 'error'|'ok', text }

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/dashboard");
    });
  }, [router]);

  const cfg = MODES[mode];

  async function onSubmit(e) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        router.replace("/dashboard");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/dashboard");
          return;
        }
        setMsg({ tone: "ok", text: "Check your email to confirm your address, then sign in. Use the same email your Dispango account is under." });
        setMode("signin");
      }
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/login/reset`,
        });
        if (error) throw error;
        setMsg({ tone: "ok", text: "If that email has an account, a reset link is on its way." });
      }
    } catch (err) {
      setMsg({ tone: "error", text: friendlyAuthError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="glow-soft flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <a href="/" className="mb-8"><Logo /></a>

      <div className="reveal in w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-2xl shadow-ink/10">
        <h1 className="text-xl font-extrabold text-ink">{cfg.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signup"
            ? "Use the email your Dispango account is under."
            : mode === "forgot"
              ? "We'll email you a link to set a new password."
              : "Sign in to see your leads and calls."}
        </p>

        {!supabaseConfigured && (
          <p className="mt-4 rounded-xl bg-warm-50 px-3 py-2.5 text-xs font-medium text-warm-amber">
            The customer portal isn't switched on yet. Please check back shortly.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          <Field label="Email">
            <input
              type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourshop.com"
              className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
            />
          </Field>
          {mode !== "forgot" && (
            <Field label="Password">
              <input
                type="password" required minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                className="w-full rounded-xl border border-line bg-soft px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
              />
            </Field>
          )}

          {mode === "signin" && (
            <button type="button" onClick={() => { setMode("forgot"); setMsg(null); }}
              className="text-xs font-semibold text-brand hover:underline">
              Forgot password?
            </button>
          )}

          {msg && (
            <p className={`rounded-xl px-3 py-2.5 text-xs font-medium ${
              msg.tone === "error" ? "bg-danger-50 text-danger" : "bg-emerald-50 text-emerald"
            }`}>{msg.text}</p>
          )}

          <button
            type="submit" disabled={busy || !supabaseConfigured}
            className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "One moment…" : cfg.cta}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          {mode === "signup" ? "Already have a login? " : mode === "forgot" ? "" : "No login yet? "}
          <button type="button" onClick={() => { setMode(cfg.alt); setMsg(null); }}
            className="font-bold text-brand hover:underline">
            {cfg.altLabel}
          </button>
        </p>

        <div className="mt-5 border-t border-line pt-4 text-center">
          <a href="/dashboard?demo=1"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
            Just exploring? See the live demo
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Trouble getting in? Email <a href="mailto:hello@dispango.com" className="font-semibold text-brand">hello@dispango.com</a>
      </p>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-body">{label}</span>
      {children}
    </label>
  );
}

function friendlyAuthError(err) {
  const m = String(err?.message || err || "").toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again, or reset your password.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with that email already exists — try signing in.";
  if (m.includes("rate") || m.includes("too many")) return "Too many attempts — please wait a minute and try again.";
  if (m.includes("password")) return "Password must be at least 8 characters.";
  return err?.message || "Something went wrong. Please try again.";
}
