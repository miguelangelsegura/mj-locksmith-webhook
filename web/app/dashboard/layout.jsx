"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/app/components/Logo";
import { getSupabase } from "@/lib/supabase";
import { DashboardProvider, useDashboard } from "@/lib/dashboardData";

const NAV = [
  { group: null, items: [{ href: "/dashboard", label: "Overview", icon: IconHome }] },
  { group: "Activity", items: [
    { href: "/dashboard/leads", label: "Leads", icon: IconLeads },
    { href: "/dashboard/calls", label: "Call Logs", icon: IconPhone },
  ] },
  { group: "Insights", items: [{ href: "/dashboard/analytics", label: "Analytics", icon: IconChart }] },
  { group: "Account", items: [{ href: "/dashboard/settings", label: "Settings", icon: IconGear }] },
];

export default function DashboardLayout({ children }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}

function Shell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, error, profile, configured } = useDashboard();

  // Bounce to sign-in the moment there's no session.
  useEffect(() => {
    if (!loading && error === "no-session") router.replace("/login");
  }, [loading, error, router]);

  async function signOut() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!configured) return <FullMessage title="Portal not switched on yet" body="The customer dashboard isn't live just yet. Please check back shortly." />;
  if (loading) return <LoadingShell />;
  if (error === "no-session") return <LoadingShell />; // redirecting
  if (error && error !== null && !profile) {
    return (
      <FullMessage
        title="No shop is linked to this login"
        body={typeof error === "string" && error.includes("@") ? error : "This email isn't attached to a Dispango account yet. Make sure you signed in with the email your account is under, or contact us."}
        action={{ label: "Sign out", onClick: signOut }}
      />
    );
  }

  const active = (href) => href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-soft md:flex">
      {/* Sidebar (desktop) / top chip-scroll (mobile) */}
      <aside className="md:flex md:w-60 md:flex-col md:justify-between bg-ink md:min-h-screen md:sticky md:top-0">
        <div>
          <div className="hidden md:block px-5 pb-2 pt-6"><Logo dark /></div>
          <nav className="flex gap-1.5 overflow-x-auto px-3 py-3 md:mt-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-3" aria-label="Dashboard">
            {NAV.map((g, gi) => (
              <div key={gi} className="flex shrink-0 gap-1.5 md:flex-col md:gap-0.5">
                {g.group && <p className="hidden px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-white/35 md:block">{g.group}</p>}
                {g.items.map((it) => {
                  const on = active(it.href);
                  const Icon = it.icon;
                  return (
                    <Link key={it.href} href={it.href}
                      aria-current={on ? "page" : undefined}
                      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        on ? "bg-brand text-white shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}>
                      <Icon className="h-4 w-4" />
                      {it.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
        <div className="hidden md:block border-t border-white/10 p-3">
          <div className="truncate px-3 pb-2 text-xs text-white/45">{profile?.business_name || "Your shop"}</div>
          <button onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <IconSignOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <Logo />
          <button onClick={signOut} className="text-xs font-semibold text-muted">Sign out</button>
        </div>
        <main className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="min-h-screen bg-soft md:flex">
      <aside className="hidden md:block md:w-60 bg-ink" />
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="skeleton h-8 w-56 rounded-lg" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function FullMessage({ title, body, action }) {
  return (
    <main className="glow-soft flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-8 text-xl font-extrabold text-ink">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-body">{body}</p>
      {action && (
        <button onClick={action.onClick}
          className="mt-6 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-600">
          {action.label}
        </button>
      )}
      <a href="mailto:hello@dispango.com" className="mt-4 text-xs font-semibold text-brand">hello@dispango.com</a>
    </main>
  );
}

/* --- inline icons (stroke, 1.6) --- */
function IconHome({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconLeads({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconPhone({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconChart({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 20V10M10 20V4M16 20v-7M20 20H3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconGear({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 2h-5l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h5l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconSignOut({ className }) { return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 12H4m0 0 3.5-3.5M4 12l3.5 3.5M13 5h4a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
