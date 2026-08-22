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
        const res = await fetch(`${BILLING_URL}/onboarding/${encodeURIComponent(token)}/status`);
        if (res.ok) {
          const info = await res.json();
          if (info.subscription_status === "active") { window.location.href = `/welcome?token=${encodeURIComponent(token)}`; return; }
          if (info.contract_status === "signed") { window.location.href = payUrl; return; }
        }
      } catch { /* keep waiting — a transient network blip shouldn't strand them */ }
      tries += 1;
      // Surface a manual button after ~30s, but KEEP POLLING for ~10 minutes —
      // a signature that lands late must still carry them through rather than
      // stranding a customer who intended to pay.
      if (tries === 15) setState("slow");
      setTimeout(poll, tries < 15 ? 2000 : 4000);
      if (tries > 160) return;
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
        <p>Your signature hasn&apos;t come through yet. We&apos;re still checking — or continue to payment now:</p>
        <a className="mt-5 block rounded-lg bg-brand px-5 py-3 font-semibold text-white" href={payUrl}>Continue to payment</a>
      </Msg>
    );
  }
  return (
    <Msg title="Finalizing your contract…">
      <p>One moment — we&apos;re confirming your signature, then we&apos;ll take you to payment.</p>
      <a className="mt-5 block text-sm underline" href={payUrl}>Continue now</a>
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
