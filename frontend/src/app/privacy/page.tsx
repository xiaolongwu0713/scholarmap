import { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { CONTACT_EMAIL, OPERATOR_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How LabScout collects, uses and protects personal data, including account data and public researcher information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          This policy explains how LabScout (&quot;we&quot;), operated by {OPERATOR_NAME}, handles personal data. It covers
          two groups of people: <strong>users</strong> who visit the website or create an account, and{' '}
          <strong>researchers</strong> whose public publication information appears in the Service.
        </p>
      </section>

      <section>
        <h2>1. Data we collect from users</h2>
        <ul>
          <li><strong>Account data:</strong> email address and a hashed password (we never store your password in plain text).</li>
          <li><strong>Content you submit:</strong> research descriptions and the searches, keywords and results generated for them.</li>
          <li><strong>Usage data:</strong> when you were last active, how many searches you have run, and basic technical logs (such as request timestamps and errors).</li>
          <li><strong>Analytics:</strong> we use Google Analytics to understand aggregate traffic (pages visited, referrers, approximate location, device type).</li>
          <li><strong>Billing:</strong> if you subscribe, Paddle (our Merchant of Record) collects your payment details and billing address. We receive only your subscription status, plan, and a customer identifier — never your full card number.</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <ul>
          <li>to provide the Service, run your searches and enforce plan limits;</li>
          <li>to send account emails such as verification codes and billing-related notices;</li>
          <li>to secure the Service and prevent abuse;</li>
          <li>to improve the product using aggregate statistics.</li>
        </ul>
        <p>We do not sell your personal data and do not use it for third-party advertising.</p>
      </section>

      <section>
        <h2>3. Service providers</h2>
        <p>We share data only with providers that help us run the Service:</p>
        <ul>
          <li>Vercel (website hosting), Render (application servers and database), Cloudflare (DNS and email forwarding);</li>
          <li>OpenAI (processes the research descriptions you submit to interpret your search);</li>
          <li>SendGrid (sends verification emails);</li>
          <li>Paddle (payments, tax and invoicing);</li>
          <li>Google Analytics (traffic analytics); Mapbox (map display).</li>
        </ul>
        <p>These providers may process data in the United States and other countries.</p>
      </section>

      <section>
        <h2>4. Public researcher information</h2>
        <p>
          The Service processes publicly available publication metadata, mainly from PubMed: author names, the
          institutions and locations listed in their affiliations, and publication identifiers. We use it to show where
          research in a field takes place. We do not collect private information about researchers, and we do not include
          email addresses that may appear in affiliation text in exports.
        </p>
        <p>
          If you are a researcher and want your information corrected or removed from LabScout, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with the name and publication(s) concerned. We will
          respond within 30 days.
        </p>
      </section>

      <section>
        <h2>5. Cookies and local storage</h2>
        <p>
          We store your login token in your browser&apos;s local storage so you stay signed in. Google Analytics sets
          cookies to measure traffic. You can clear these at any time in your browser settings.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>
          We keep account data and your searches while your account is active. If you ask us to delete your account, we
          delete your account data and searches within 30 days, except where we must keep limited records (for example
          billing records held by Paddle) to meet legal obligations.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete or export your personal data, or
          to object to certain processing. To make a request, email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>8. Security and children</h2>
        <p>
          We use encrypted connections (HTTPS), hashed passwords and restricted database access. The Service is not
          directed to children under 16, and we do not knowingly collect their data.
        </p>
      </section>

      <section>
        <h2>9. Changes and contact</h2>
        <p>
          We may update this policy and will post the new version here. Questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
