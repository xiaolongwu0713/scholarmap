import { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';
import { CONTACT_EMAIL, REFUND_DAYS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: `LabScout offers a ${REFUND_DAYS}-day money-back guarantee on Pro subscriptions. Learn how to cancel and request a refund.`,
  alternates: { canonical: '/refund' },
};

export default function RefundPage() {
  return (
    <LegalPage title="Refund Policy">
      <section>
        <h2>{REFUND_DAYS}-day money-back guarantee</h2>
        <p>
          If LabScout Pro is not right for you, you can request a full refund within <strong>{REFUND_DAYS} days</strong> of your
          first payment for a new subscription or of a 3-month pass — no questions asked.
        </p>
      </section>

      <section>
        <h2>Renewals</h2>
        <p>
          Renewal payments can be refunded if you request it within {REFUND_DAYS} days of the renewal charge and have not run more
          than 5 searches since that renewal. Outside these conditions, renewal payments are non-refundable, but you can
          cancel at any time to stop future charges.
        </p>
      </section>

      <section>
        <h2>Cancelling</h2>
        <p>
          You can cancel your subscription at any time from your account. After cancelling you keep Pro access until the
          end of the period you already paid for, and you will not be charged again.
        </p>
      </section>

      <section>
        <h2>How to request a refund</h2>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address on your account, or
          contact Paddle, our Merchant of Record, via the link in your payment receipt. Approved refunds are issued by
          Paddle to your original payment method, usually within 5–10 business days depending on your bank.
        </p>
        <p>
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
