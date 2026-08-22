"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL || "https://REPLACE.supabase.co/functions/v1/billing";

// SignWell returns the signer here the instant they sign — often a beat before its
// webhook has told us. Rather than dead-ending them, wait on our own page and carry
// them to payment as soon as the signature registers.
function Signing() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState("waiting");
  const payUrl = `${BILLING_URL}/onboarding/${encodeURIComponent(token)}/pay`;

  useEffect(() => {
    if (!token) { setState("no-token"); return; }
    let stop = false;
    let tries = 0;

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`${BILLING_URL}/welcome-info/${encodeURIComponent(token)}`);
        if (res.ok) {
          const info = await res.json();
          if (info.subscription_status === "active") { window.location.href = `/welcome?token=${encodeURIComponent(token)}`; return; }
          if (info.contract_status === "signed") { window.location.href = payUrl; return; }
        }
      } catch { /* keep waiting — a transient network blip shouldn't strand them */ }
      tries += 1;
      // Give up gracefully after ~60s and let them continue by hand.
      if (tries > 30) { setState("slow"); return; }
      setTimeout(poll, 2000);
    }
    poll();
    return () => { stop = true; };
  }, [token, payUrl]);

  if (state === "no-token") {
    return <Msg title="Something's missing">We couldn't identify your signup. Please use the link from your email, or contact us and we'll sort it out.</Msg>;
  }
  if (state === "slow") {
    return (
      <Msg title="Taking longer than usual">
        Your signature hasn't come through yet. You can continue to payment here:
        <a className="mt-4 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white" href={payUrl}>Continue to payment</a>
      </Msg>
    );
  }
  return (
    <Msg title="Finalizing your contract…">
      One moment — we're confirming your signature, then we'll take you to payment.
      <a className="mt-4 inline-block text-sm underline" href={payUrl}>Continue now</a>
    </Msg>
  );
}

function Msg({ title, children }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="mt-3 text-muted">{children}</div>
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={null}><Signing /></Suspense>;
}
