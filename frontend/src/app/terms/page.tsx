import { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { CONTACT_EMAIL, OPERATOR_NAME, PLANS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the use of LabScout, including subscriptions, billing through Paddle, acceptable use and limitations of liability.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of LabScout (the &quot;Service&quot;), available at
          labscout.io. The Service is operated by {OPERATOR_NAME}, an individual (&quot;we&quot;, &quot;us&quot;).
          By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>1. The Service</h2>
        <p>
          LabScout helps users discover biomedical researchers, laboratories and institutions by analysing publicly
          available publication metadata (primarily from PubMed) and presenting it as maps, rankings and lists.
          Results are generated automatically, may contain errors or omissions (for example in affiliation or location
          parsing), and are provided for informational purposes only.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <ul>
          <li>You must provide a valid email address and keep your password confidential.</li>
          <li>You are responsible for all activity under your account.</li>
          <li>One person per account. Accounts may not be shared or resold.</li>
          <li>You must be at least 16 years old to create an account.</li>
        </ul>
      </section>

      <section>
        <h2>3. Plans, usage limits and billing</h2>
        <p>
          The Service offers a free plan and a paid Pro plan. A &quot;search&quot; means creating one new custom
          search run. Limits are counted over a rolling 7-day window. The Free plan includes{' '}
          {PLANS.free.searchesPerWeek} searches per 7 days; the Pro plan includes {PLANS.pro.searchesPerWeek} searches
          per 7 days plus Pro-only features described on the <Link href="/pricing">Pricing</Link> page. We may adjust
          limits or features with reasonable notice.
        </p>
        <p>
          <strong>
            Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for
            all our orders.
          </strong>{' '}
          Paddle provides all customer service inquiries related to payment and handles returns. Payments, taxes and
          invoices are processed by Paddle under{' '}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
            Paddle&apos;s Buyer Terms
          </a>
          . We do not receive or store your full payment card details.
        </p>
        <ul>
          <li>Subscriptions renew automatically at the end of each billing period until cancelled.</li>
          <li>You can cancel at any time from your account; access continues until the end of the paid period.</li>
          <li>Prices are shown in US dollars and may be subject to applicable taxes collected by Paddle.</li>
          <li>Refunds are handled under our <Link href="/refund">Refund Policy</Link>.</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the Service to harass, spam or send unsolicited bulk messages to researchers listed in it;</li>
          <li>scrape, crawl or systematically download data beyond the features and limits of your plan;</li>
          <li>resell, sublicense or redistribute exported data as a standalone dataset;</li>
          <li>attempt to bypass usage limits, access other users&apos; data, or disrupt the Service;</li>
          <li>use the Service in violation of any applicable law, including data-protection law.</li>
        </ul>
        <p>We may suspend or terminate accounts that violate these rules.</p>
      </section>

      <section>
        <h2>5. Data and content</h2>
        <p>
          Researcher and publication information shown in the Service is derived from public sources and remains subject
          to those sources&apos; terms. Research descriptions you submit remain yours; you grant us the right to process
          them to operate the Service. Our handling of personal data is described in the{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. Disclaimer and limitation of liability</h2>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. To the
          maximum extent permitted by law, we are not liable for indirect, incidental or consequential damages, or for
          decisions made based on information from the Service. Our total liability for any claim is limited to the
          amount you paid for the Service in the 12 months before the claim.
        </p>
      </section>

      <section>
        <h2>7. Changes and termination</h2>
        <p>
          We may update these Terms; material changes will be announced on the website or by email. You may stop using the
          Service and delete your account at any time by contacting us.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Questions about these Terms: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </section>
    </LegalPage>
  );
}
