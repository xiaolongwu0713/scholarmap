import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { CONTACT_EMAIL, PLANS, REFUND_DAYS } from '@/lib/site';
import { checkoutEnabled } from '@/lib/paddle';
import { CheckoutButton } from '@/components/CheckoutButton';
import { PaymentLinkHandler } from '@/components/PaymentLinkHandler';

export const metadata: Metadata = {
  title: 'Pricing - Free and Pro Plans',
  description: `Explore biomedical research maps for free. Upgrade to LabScout Pro for ${PLANS.pro.searchesPerWeek} custom searches per week, full researcher and institution lists, and CSV export — $${PLANS.pro.monthlyPrice}/month or a one-time $${PLANS.pro.passPrice} pass for ${PLANS.pro.passMonths} months.`,
  alternates: { canonical: '/pricing' },
};

const passMonthly = (PLANS.pro.passPrice / PLANS.pro.passMonths).toFixed(2);
const passSavings = Math.round((1 - PLANS.pro.passPrice / (PLANS.pro.monthlyPrice * PLANS.pro.passMonths)) * 100);

const freeFeatures = [
  'Browse all public research maps by field, country and city',
  `${PLANS.free.searchesPerWeek} custom searches every 7 days`,
  'Interactive map for each search',
  'Top 10 researchers and institutions per location',
];

const proFeatures = [
  `${PLANS.pro.searchesPerWeek} custom searches every 7 days`,
  'Full researcher and institution lists',
  'CSV export of researchers, institutions and cities',
  'Everything in Free',
  'Priority email support',
];

const faqs = [
  {
    q: 'What counts as a search?',
    a: 'Creating one new custom search — describing a research topic and letting LabScout build the query, retrieve papers and map the researchers. Refining the description within the same search does not count again. Browsing the public field and country pages is always free and unlimited.',
  },
  {
    q: 'How does the weekly limit reset?',
    a: 'Limits use a rolling 7-day window: each search frees up again 7 days after you ran it.',
  },
  {
    q: 'Which plan should I choose?',
    a: `The ${PLANS.pro.passMonths}-month pass suits a single application season (PhD, postdoc or lab search): you pay once, save ${passSavings}% versus paying monthly, and it simply ends after ${PLANS.pro.passMonths} months — nothing renews. The monthly plan is best if you need LabScout on an ongoing basis.`,
  },
  {
    q: 'Can I pay in Chinese yuan, with WeChat Pay or Alipay?',
    a: `Yes. Buyers in China are charged in yuan: ¥${PLANS.pro.monthlyPriceCny}/month or ¥${PLANS.pro.passPriceCny} for the ${PLANS.pro.passMonths}-month pass. WeChat Pay is available for the pass on desktop (scan the QR code with your phone); cards and PayPal work for both plans.`,
  },
  {
    q: 'Can I cancel or get a refund?',
    a: `Yes. The monthly plan can be cancelled anytime and you keep access until the end of the paid month; the pass never renews, so there is nothing to cancel. New subscriptions and passes have a ${REFUND_DAYS}-day money-back guarantee — see our Refund Policy.`,
  },
  {
    q: 'How is payment handled?',
    a: 'Payments are processed securely by Paddle, our Merchant of Record, which also handles sales tax and VAT and issues invoices. We never see your full card details.',
  },
  {
    q: 'Do you offer team or institutional plans?',
    a: `For teams, recruiters, or custom research-landscape reports, contact us at ${CONTACT_EMAIL}.`,
  },
];

function Check() {
  return (
    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <>
      <UnifiedNavbar variant="landing" />
      <PaymentLinkHandler />
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore global biomedical research for free. Upgrade when you need more searches and the full data.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Free */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900">{PLANS.free.name}</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">Forever</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex gap-2"><Check />{f}</li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="mt-8 block text-center rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-900 hover:bg-gray-50"
              >
                Get started free
              </Link>
            </section>

            {/* Pro monthly */}
            <section className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
              <h2 className="text-xl font-semibold text-gray-900">{PLANS.pro.name} · Monthly</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">${PLANS.pro.monthlyPrice}</span>
                <span className="text-gray-500"> / month</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">Billed monthly · cancel anytime</p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex gap-2"><Check />{f}</li>
                ))}
              </ul>
              <CheckoutButton
                period="monthly"
                className="mt-8 block w-full text-center rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
              >
                Choose monthly
              </CheckoutButton>
            </section>

            {/* Pro pass: one-time, no auto-renew */}
            <section className="relative bg-white rounded-2xl border-2 border-blue-600 p-6 flex flex-col shadow-lg">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Best for application season
              </span>
              <h2 className="text-xl font-semibold text-gray-900">{PLANS.pro.name} · {PLANS.pro.passMonths}-month pass</h2>
              <p className="mt-4">
                <span className="text-4xl font-bold text-gray-900">${PLANS.pro.passPrice}</span>
                <span className="text-gray-500"> once</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ${passMonthly}/month · save {passSavings}% · no auto-renew
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                {proFeatures.map((f) => (
                  <li key={f} className="flex gap-2"><Check />{f}</li>
                ))}
              </ul>
              <CheckoutButton
                period="pass"
                className="mt-8 block w-full text-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Get the {PLANS.pro.passMonths}-month pass
              </CheckoutButton>
            </section>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Prices in USD; in China ¥{PLANS.pro.monthlyPriceCny}/month or ¥{PLANS.pro.passPriceCny} for the pass. Taxes may apply.{' '}
            {checkoutEnabled
              ? 'Secure checkout by Paddle.'
              : 'Pro checkout is launching soon — create a free account now and upgrade when it opens.'}{' '}
            {REFUND_DAYS}-day money-back guarantee on new subscriptions and passes.
          </p>

          <p className="text-center text-gray-700 mt-4">
            Buying for a company team?{' '}
            <Link href="/for-industry" className="text-blue-600 font-semibold hover:underline">
              See LabScout for industry
            </Link>
          </p>

          <section className="mt-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map(({ q, a }) => (
                <details key={q} className="bg-white rounded-lg border border-gray-200 p-5 group">
                  <summary className="font-semibold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                    {q}
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-gray-700 text-sm leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-8">
              By purchasing you agree to our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>,{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> and{' '}
              <Link href="/refund" className="text-blue-600 hover:underline">Refund Policy</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
