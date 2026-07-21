const CONFIG = {
  email: "hello@dispango.com",
  legalName: "Jam Works Inc.",
  // TODO(Phase 7 / launch): fill real values before go-live — tracked on the dashboard.
  address: "[ADD REGISTERED MAILING ADDRESS]",
  privacyOfficer: "Jordan Taylor, Privacy Officer",
  effective: "July 15, 2026",
};

export const metadata = {
  title: "Privacy Policy — Dispango",
  description: "How Dispango collects, uses, shares, and protects call information (PIPEDA, Law 25, CCPA).",
};

export default function Privacy() {
  const Section = ({ h, children }) => (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-ink">{h}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
  const Li = ({ children }) => <li className="leading-relaxed">{children}</li>;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-body">
      <a href="/" className="text-sm font-medium text-brand hover:underline">
        ← Back to Dispango
      </a>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">
        Effective {CONFIG.effective}. This policy explains, in plain language, what personal
        information Dispango handles and why. It is written to Canada&apos;s PIPEDA and Quebec&apos;s
        Law 25, and to U.S. state privacy laws (including the CCPA). It is a strong starting point,
        not a substitute for legal advice — have it reviewed by a professional before you rely on it.
      </p>

      <Section h="1. Who we are">
        <p>
          {CONFIG.legalName} operates Dispango (&quot;Dispango&quot;, &quot;we&quot;, &quot;us&quot;),
          an AI call-answering and lead-dispatch service for home and trade-service businesses. When
          you call a business that uses Dispango, our AI receptionist answers on that business&apos;s
          behalf, has a short conversation to understand your request, and passes the details to the
          business so they can call you back.
        </p>
      </Section>

      <Section h="2. Who this policy covers">
        <p>This policy applies to three groups:</p>
        <ul className="list-disc space-y-1 pl-5">
          <Li><strong>Callers</strong> — people who phone a Dispango-powered business line.</Li>
          <Li><strong>Business customers</strong> — the businesses that subscribe to Dispango.</Li>
          <Li><strong>Website visitors</strong> — people who browse our marketing site or sign up.</Li>
        </ul>
      </Section>

      <Section h="3. Our role (controller vs. processor)">
        <p>
          For the details of a call — the recording, transcript, and lead information — we act as a
          <strong> service provider (processor)</strong> handling that information <em>on behalf of and
          on the instructions of</em> the business you called. That business is responsible for its
          own use of the lead once we deliver it. For our own account, billing, security, and
          aggregated/de-identified analytics data, we act as an <strong>independent controller</strong>.
          Under PIPEDA we remain accountable for personal information even after it is passed to the
          service providers listed in Section 8.
        </p>
      </Section>

      <Section h="4. What we collect">
        <p><strong>From callers,</strong> when you call a Dispango-powered line, we may collect:</p>
        <ul className="list-disc space-y-1 pl-5">
          <Li>your phone number and name;</Li>
          <Li>the service address or location you provide;</Li>
          <Li>the details of your request (the problem, urgency, and job details);</Li>
          <Li>an audio recording, a written transcript, and an AI-generated summary of the call.</Li>
        </ul>
        <p><strong>From business customers and website visitors:</strong> account and contact details,
          the forwarding/dispatch phone numbers you register, billing information (processed by our
          payment provider — we do not store full card numbers), and basic site/usage and device data.</p>
      </Section>

      <Section h="5. Why we collect it">
        <p>We use this information only to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <Li>answer the call, understand your request, and deliver the lead to the business you called;</Li>
          <Li>text the lead to the business and let it view its own call history;</Li>
          <Li>operate, secure, and support the service (including fraud and abuse prevention);</Li>
          <Li>bill business customers and comply with our legal obligations.</Li>
        </ul>
        <p>
          <strong>We do not sell your personal information</strong>, and we do not &quot;share&quot; it
          for cross-context behavioural advertising. We do not use the content of your calls to train
          third-party AI models beyond what is needed to provide the service, and we will not use it for
          new, unrelated purposes without your consent.
        </p>
      </Section>

      <Section h="6. Voice data — no voiceprints">
        <p>
          We use call audio <strong>only</strong> to transcribe and summarize what was said.
          <strong> We do not create voiceprints, and we do not use your voice to biometrically identify
          you.</strong> Our system does not perform speaker recognition or voice authentication.
        </p>
      </Section>

      <Section h="7. Call recording and consent">
        <p>
          Calls to a Dispango-powered line are recorded and transcribed. Our AI discloses at the start
          of each call that it is an automated assistant and that the call may be recorded; if you
          continue the call, you consent to that recording. If you do not wish to be recorded, you may
          end the call. The business you are calling is responsible for any additional notice or consent
          required by the laws of its and your location.
        </p>
      </Section>

      <Section h="8. Who we share it with (service providers)">
        <p>
          Call information is shared with the specific business that received your call. To run the
          service we also rely on the following providers, who process data only to perform their
          function for us and are bound to protect it:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <Li><strong>Vapi</strong> — voice-AI call handling (which in turn uses <strong>OpenAI</strong> for speech-to-text and <strong>Anthropic</strong> for the conversational model);</Li>
          <Li><strong>Twilio</strong> — telephone connectivity and outbound SMS;</Li>
          <Li><strong>Supabase</strong> — secure database hosting for call records;</Li>
          <Li><strong>Stripe</strong> — payment processing (business customers only);</Li>
          <Li><strong>Cloudflare</strong> — bot protection and network security.</Li>
        </ul>
        <p>We may also disclose information where required by law, or to protect our rights, users, or
          the public.</p>
      </Section>

      <Section h="9. Where your data is processed">
        <p>
          {CONFIG.legalName} is based in Canada. Several of the providers above process and store data on
          servers in the United States, so your information may be transferred to, and handled in, the
          U.S. and subject to its laws. We use providers that commit to appropriate safeguards.
        </p>
      </Section>

      <Section h="10. How long we keep it">
        <p>We keep personal information only as long as needed for the purposes above:</p>
        <ul className="list-disc space-y-1 pl-5">
          <Li><strong>Call transcripts and summaries</strong> — for the life of the business&apos;s account, so it can reference past leads;</Li>
          <Li><strong>Call audio recordings</strong> — a limited retention window, after which the audio is deleted and only the transcript/summary is kept;</Li>
          <Li><strong>Account and billing records</strong> — as long as the account is active and as required by tax and legal rules afterward.</Li>
        </ul>
        <p>When information is no longer needed, we delete or de-identify it.</p>
      </Section>

      <Section h="11. How we protect it">
        <p>
          We protect personal information with encryption in transit, access controls, and reputable
          hosting providers. No system is perfectly secure, but we take reasonable technical and
          organizational measures appropriate to the sensitivity of the data. If a breach creates a real
          risk of significant harm, we will notify the appropriate regulator and affected individuals as
          required by law, and we keep records of breaches.
        </p>
      </Section>

      <Section h="12. Your privacy rights">
        <p>
          You may request access to, correction of, or deletion of your personal information, ask how it
          has been used or disclosed, or withdraw consent, by emailing{" "}
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>.
          Because we handle call data on behalf of the business you called, we may need to coordinate
          your request with that business. We will respond within the timeframe required by applicable
          law.
        </p>
        <p>
          <strong>California and other U.S. state residents:</strong> depending on your state, you have
          the right to know the categories of personal information we collect (identifiers, phone/audio
          recordings, transcripts, and the job details you provide), the purposes above, to access,
          delete, and correct it, and to not be discriminated against for exercising these rights.
          <strong> We do not sell or &quot;share&quot; your personal information</strong>, so there is no
          opt-out to submit. You may exercise these rights at the email above.
        </p>
      </Section>

      <Section h="13. Quebec residents (Law 25)">
        <p>
          If you are in Quebec, Law 25 gives you additional rights, including data portability and the
          right to be informed when a decision about you is made by automated processing. Our AI captures
          and routes your request but does not make legal or similarly significant decisions about you; a
          person at the business you called follows up. Personal information may be transferred outside
          Quebec to the providers in Section 8. Our Privacy Officer is{" "}
          <strong>{CONFIG.privacyOfficer}</strong>, reachable at{" "}
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>.
        </p>
      </Section>

      <Section h="14. Children">
        <p>
          Dispango is not directed to children, and we do not knowingly collect personal information from
          anyone under 18. If you believe a child&apos;s information has been collected, contact us and we
          will delete it.
        </p>
      </Section>

      <Section h="15. Changes to this policy">
        <p>
          We may update this policy from time to time. We will post the revised version here with a new
          effective date, and, where required, notify you.
        </p>
      </Section>

      <Section h="16. Contact">
        <p>
          Questions, requests, or complaints (including the right to escalate to your privacy regulator):
          <br />
          {CONFIG.legalName}
          <br />
          {CONFIG.address}
          <br />
          Attn: {CONFIG.privacyOfficer}
          <br />
          <a className="text-brand hover:underline" href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
        </p>
      </Section>

      <footer className="mt-12 flex gap-5 border-t border-line pt-6 text-xs text-muted">
        <a href="/" className="hover:text-brand">Home</a>
        <a href="/terms" className="hover:text-brand">Terms of Service</a>
      </footer>
    </main>
  );
}
