const CONFIG = {
  email: "hello@dispango.com",
  legalName: "Jam Works Inc.",
  address: "", // TODO(Phase 7): registered mailing address — omitted until set
};

export const metadata = {
  title: "Privacy Policy — Dispango",
  description: "How Dispango collects, uses, and protects call information (PIPEDA).",
};

export default function Privacy() {
  const Section = ({ h, children }) => (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ink">{h}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-body">
      <a href="/" className="text-sm font-medium text-brand hover:underline">
        ← Back to Dispango
      </a>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">
        This is a starting template written to Canada&apos;s PIPEDA. Have it reviewed by a
        professional before relying on it.
      </p>

      <Section h="Who we are">
        <p>
          {CONFIG.legalName} operates Dispango, an AI call-answering and lead-dispatch service
          for home and trade-service businesses. When you call a business that uses Dispango, our AI
          receptionist answers on their behalf.
        </p>
      </Section>

      <Section h="What we collect">
        <p>When you call a Dispango-powered line, we may collect: your phone number, your name,
          the service address or location you provide, the details of your request, and a
          recording, transcript, and summary of the call.</p>
      </Section>

      <Section h="Why we collect it">
        <p>Solely to deliver your request to the business you called, so they can call
          you back and help. We do not sell personal information.</p>
      </Section>

      <Section h="How it's stored and shared">
        <p>Call information is shared only with the specific business that received your
          call. It is stored securely and retained only as long as needed to provide the service.</p>
      </Section>

      <Section h="Your choices">
        <p>You may request access to, correction of, or deletion of your personal information by
          emailing <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>.</p>
      </Section>

      <Section h="Contact">
        <p>{CONFIG.legalName}<br />{CONFIG.address && <>{CONFIG.address}<br /></>}
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a></p>
      </Section>
    </main>
  );
}
