const CONFIG = {
  email: "hello@dispango.com",
  legalName: "Jam Works Inc.",
  address: "", // TODO(Phase 7): registered mailing address — omitted until set
  price: "199",
};

export const metadata = {
  title: "Terms of Service — Dispango",
  description: "The terms governing your use of the Dispango AI receptionist service.",
};

export default function Terms() {
  const Section = ({ h, children }) => (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ink">{h}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-body">
      <a href="/" className="text-sm font-medium text-brand hover:underline">← Back to Dispango</a>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">
        This is a starting template. It complements — and does not replace — the service agreement you
        e-sign at signup. Have both reviewed by a professional before relying on them.
      </p>

      <Section h="1. Who we are & acceptance">
        <p>
          {CONFIG.legalName} operates Dispango, an AI call-answering and lead-dispatch service for home
          and trade-service businesses. By signing up, signing the service agreement, or using the
          service, you agree to these terms.
        </p>
      </Section>

      <Section h="2. The service">
        <p>
          Dispango answers calls forwarded to your assigned number, captures caller and job details, and
          texts them to you. It is a lead-capture assistant — not an emergency dispatch, security, or
          life-safety service. You remain responsible for contacting and serving your customers.
        </p>
      </Section>

      <Section h="3. Fees & billing">
        <p>
          Dispango is a flat ${CONFIG.price} CAD per month, billed through our payment processor (Stripe)
          on a recurring subscription. New accounts include a 14-day free trial. You may cancel anytime,
          effective at the end of the current billing period; fees already paid are non-refundable except
          where required by law. Prices may change with reasonable notice.
        </p>
      </Section>

      <Section h="4. Your responsibilities">
        <p>
          You are responsible for forwarding your business line to your Dispango number, for using the
          service lawfully, and for any consent or notice required in your province for call recording and
          the handling of your callers&apos; information. You confirm you are authorized to forward the
          number you connect.
        </p>
      </Section>

      <Section h="5. Acceptable use">
        <p>
          Don&apos;t use Dispango for unlawful, deceptive, or abusive purposes, or to place a load on the
          service through automated or bad-faith calling. We may suspend accounts that do.
        </p>
      </Section>

      <Section h="6. Availability">
        <p>
          We aim for reliable, around-the-clock answering but do not guarantee uninterrupted service.
          Carrier, network, or third-party outages can affect call handling. The service is provided
          &quot;as is.&quot;
        </p>
      </Section>

      <Section h="7. Privacy">
        <p>
          Caller information is handled per our{" "}
          <a className="text-brand hover:underline" href="/privacy">Privacy Policy</a> and shared only with
          your business.
        </p>
      </Section>

      <Section h="8. Termination">
        <p>
          You may cancel anytime. We may suspend or end service for non-payment or breach of these terms.
          On termination, call answering stops and your assigned number is released.
        </p>
      </Section>

      <Section h="9. Liability">
        <p>
          To the maximum extent permitted by law, {CONFIG.legalName} is not liable for indirect or
          consequential losses, including missed or mishandled calls or lost business. Our total liability
          is limited to the fees you paid in the prior three months.
        </p>
      </Section>

      <Section h="10. Governing law & contact">
        <p>
          These terms are governed by the laws of Ontario and Canada. Questions:{" "}
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
          <br />{CONFIG.legalName}{CONFIG.address && <><br />{CONFIG.address}</>}
        </p>
      </Section>
    </main>
  );
}
