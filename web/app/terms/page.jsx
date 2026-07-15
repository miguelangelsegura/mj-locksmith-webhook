const CONFIG = {
  email: "hello@dispango.com",
  legalName: "Jam Works Inc.",
  // TODO(Phase 7 / launch): fill real values before go-live — tracked on the dashboard.
  address: "[ADD REGISTERED MAILING ADDRESS]",
  price: "199",
  arbBody: "the ADR Institute of Canada",
  effective: "July 15, 2026",
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
  const Li = ({ children }) => <li className="leading-relaxed">{children}</li>;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-body">
      <a href="/" className="text-sm font-medium text-brand hover:underline">← Back to Dispango</a>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">
        Effective {CONFIG.effective}. These terms govern the business&apos;s use of Dispango. They
        complement — and do not replace — the service agreement you e-sign at signup; if the two
        conflict, the signed agreement controls. This is a strong starting template, not legal advice —
        have it reviewed by a professional before you rely on it.
      </p>

      <Section h="1. Who we are, definitions & acceptance">
        <p>
          {CONFIG.legalName} operates Dispango (&quot;Dispango&quot;, &quot;we&quot;, &quot;us&quot;), an
          AI call-answering and lead-dispatch service for home and trade-service businesses. In these
          terms, <strong>&quot;you&quot;</strong> or <strong>&quot;Customer&quot;</strong> means the
          business that subscribes, and <strong>&quot;Caller&quot;</strong> means a person who phones a
          line you connect to Dispango. By signing up, signing the service agreement, or using the
          service, you agree to these terms on behalf of your business.
        </p>
      </Section>

      <Section h="2. The service">
        <p>
          Dispango answers calls forwarded to your assigned number using an <strong>automated AI
          assistant</strong>, captures caller and job details, records and transcribes the call, and
          texts the lead to you. It is a lead-capture assistant — <strong>not</strong> an emergency
          dispatch, security, medical, or life-safety service (see Section 10). You remain responsible
          for contacting and serving your customers.
        </p>
      </Section>

      <Section h="3. Fees & billing">
        <p>
          Dispango is a flat ${CONFIG.price} CAD per month, billed through our payment processor (Stripe)
          on a recurring subscription. New accounts include a 14-day free trial. You may cancel anytime,
          effective at the end of the current billing period; fees already paid are non-refundable except
          where required by law. Prices may change with reasonable notice. You consent to receive
          operational SMS and email from us — including the lead-dispatch texts that are the core of the
          service — at the numbers and addresses you register.
        </p>
      </Section>

      <Section h="4. Your responsibilities & consent (important)">
        <p>You are responsible for lawful, authorized use of the service. Specifically, you represent,
          warrant, and agree that:</p>
        <ul className="list-disc space-y-1 pl-5">
          <Li>you own or are authorized to forward and connect the phone number(s) you link to Dispango;</Li>
          <Li>
            you have all rights, notices, and consents required to have calls to your number(s)
            <strong> answered, recorded, transcribed, and processed</strong> by an AI on your behalf —
            including any consent required under call-recording, wiretap/two-party-consent, biometric,
            anti-spam (CASL/TCPA), and privacy laws of the jurisdictions in which you operate and receive
            calls;
          </Li>
          <Li>you will not use the service to mislead any Caller about the artificial (AI) nature of the assistant, and you will disclose your use of AI to your Callers where the law requires it;</Li>
          <Li>you will handle any lead information we deliver to you in compliance with applicable privacy law, and maintain your own privacy practices toward your Callers;</Li>
          <Li>your use of the service, and your business, comply with all applicable laws.</Li>
        </ul>
      </Section>

      <Section h="5. Recording & AI disclosure by the service">
        <p>
          Our AI is configured to announce, at the start of each call, that it is an automated assistant
          and that the call may be recorded. You must keep this disclosure feature enabled.
          <strong> Dispango does not obtain call-recording or any other consent on your behalf, and makes
          no representation that your consent practices comply with the laws that apply to you.</strong>
          Meeting those legal requirements is your responsibility under Section 4.
        </p>
      </Section>

      <Section h="6. Acceptable use">
        <p>
          Don&apos;t use Dispango for unlawful, deceptive, harassing, or abusive purposes, to record calls
          you are not permitted to record, or to place a load on the service through automated or
          bad-faith calling. We may suspend or terminate accounts that do.
        </p>
      </Section>

      <Section h="7. Third-party providers">
        <p>
          The service depends on third parties — including Vapi, OpenAI, Anthropic, Twilio, Supabase,
          Stripe, and Cloudflare — as well as telephone carriers and networks. We are not responsible for
          their outages, errors, changes, or acts, though we use commercially reasonable efforts to keep
          the service running.
        </p>
      </Section>

      <Section h="8. Availability">
        <p>
          We aim for reliable, around-the-clock answering but do not guarantee uninterrupted or error-free
          service. Carrier, network, AI-provider, or other third-party issues can affect call handling,
          transcription accuracy, and delivery of leads.
        </p>
      </Section>

      <Section h="9. Privacy">
        <p>
          Caller information is handled per our{" "}
          <a className="text-brand hover:underline" href="/privacy">Privacy Policy</a>. For call and lead
          data we act as your service provider (processor), using it only to provide the service and
          relying on the sub-processors listed there.
        </p>
      </Section>

      <Section h="10. Not an emergency or life-safety service">
        <p>
          The service is <strong>not</strong> a substitute for 911 or any emergency, security, medical, or
          other safety-critical service, and the AI is not equipped to identify or respond to emergencies.
          You are solely responsible for ensuring that Callers with an emergency are directed to dial 911
          (or their local emergency number) directly, and you will not rely on the service for
          time-critical or life-safety situations. To the maximum extent permitted by law, we disclaim all
          liability arising from use of the service in such contexts.
        </p>
      </Section>

      <Section h="11. Disclaimer of warranties">
        <p>
          The service is provided <strong>&quot;as is&quot; and &quot;as available,&quot;</strong> with
          all faults. To the maximum extent permitted by law, we disclaim all warranties, express or
          implied, including merchantability, fitness for a particular purpose, and non-infringement. We
          do not warrant that the service will be uninterrupted, secure, or error-free, that every call
          will be captured, or that transcripts, summaries, or lead details will be accurate or complete.
        </p>
      </Section>

      <Section h="12. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {CONFIG.legalName} is not liable for indirect,
          incidental, special, consequential, or punitive damages, or for lost profits, lost business, or
          missed or mishandled calls or leads. Our total aggregate liability for all claims relating to
          the service is limited to the greater of (a) the fees you paid us in the 12 months before the
          claim arose, or (b) CAD $100. Nothing in these terms limits liability that cannot be limited by
          law (for example, for gross negligence, wilful misconduct, or fraud).
        </p>
      </Section>

      <Section h="13. Indemnification">
        <p>
          You will indemnify, defend, and hold harmless {CONFIG.legalName} and its officers, employees, and
          service providers from and against any third-party claim, demand, loss, liability, damage, or
          cost (including reasonable legal fees) arising out of or related to: (a) your breach of the
          representations and responsibilities in Section 4 — including your failure to provide any notice
          or obtain any consent required by applicable call-recording, wiretap, biometric, anti-spam, or
          privacy law; (b) your use of the service or of any lead information we deliver to you; or (c)
          your violation of any law or of the rights of any Caller or third party.
        </p>
      </Section>

      <Section h="14. Dispute resolution — arbitration & class-action waiver">
        <p>
          Please read this section carefully — it affects how disputes are resolved. Except for claims for
          intellectual-property infringement or a request for injunctive relief, any dispute between you
          and {CONFIG.legalName} arising out of or relating to these terms or the service will be resolved
          by <strong>final and binding individual arbitration</strong> administered by {CONFIG.arbBody}
          {" "}under its rules, rather than in court.
        </p>
        <p>
          <strong>You and {CONFIG.legalName} each waive any right to a jury trial and to participate in a
          class, collective, consolidated, or representative action.</strong> Disputes will be brought only
          in an individual capacity. If this class-action waiver is found unenforceable for a particular
          claim, that claim (and only that claim) will be severed and heard in court.
        </p>
      </Section>

      <Section h="15. Termination">
        <p>
          You may cancel anytime. We may suspend or end service for non-payment or breach of these terms.
          On termination, call answering stops and your assigned number is released. Sections that by their
          nature should survive (including 4, 11, 12, 13, 14, and 16) survive termination.
        </p>
      </Section>

      <Section h="16. Governing law & general">
        <p>
          These terms are governed by the laws of the Province of Ontario and the federal laws of Canada
          applicable there, without regard to conflict-of-laws rules. Mandatory privacy laws — including
          Quebec&apos;s Law 25 and U.S. state laws — still apply to the personal information they protect,
          regardless of this clause. If any provision is found unenforceable, the rest remains in effect.
          These terms, together with the service agreement you e-sign, are the entire agreement between us.
        </p>
      </Section>

      <Section h="17. Changes & contact">
        <p>
          We may update these terms with reasonable notice; continued use after changes means you accept
          them. Questions:{" "}
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
          <br />
          {CONFIG.legalName}
          <br />
          {CONFIG.address}
        </p>
      </Section>
    </main>
  );
}
