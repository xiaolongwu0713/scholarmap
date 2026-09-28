import { Metadata } from 'next';
import Link from 'next/link';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { ContactSalesButton } from '@/components/ContactSalesButton';
import { CUSTOM_REPORT, PLANS } from '@/lib/site';

export const metadata: Metadata = {
  title: 'KOL & Investigator Mapping for Biomedical Teams',
  description:
    'Find the researchers and institutions leading any biomedical field, by country and city, from PubMed publication data. Build KOL, investigator, and partner shortlists in minutes.',
  keywords: [
    'KOL mapping',
    'key opinion leader identification',
    'clinical investigator search',
    'clinical trial site selection',
    'biomedical expert finder',
    'academic landscape mapping',
  ],
  alternates: { canonical: '/for-industry' },
  openGraph: {
    title: 'KOL & Investigator Mapping for Biomedical Teams | LabScout',
    description: 'Map the researchers and institutions leading any biomedical field, by country and city.',
  },
};

const USE_CASES = [
  {
    team: 'Medical affairs',
    title: 'Identify key opinion leaders',
    body: 'See who publishes most in a therapeutic area, and where they work, before planning advisory boards or outreach.',
  },
  {
    team: 'Clinical operations',
    title: 'Scout investigators and sites',
    body: 'Find active research groups in the countries and cities you are considering for a study.',
  },
  {
    team: 'BD & licensing',
    title: 'Map the academic landscape',
    body: 'See which institutions lead a modality, target, or disease area before you start partnership conversations.',
  },
  {
    team: 'Talent & recruiting',
    title: 'Find scientific talent',
    body: 'Locate the labs training people in the methods you hire for, anywhere in the world.',
  },
];

const EXAMPLES = [
  { slug: 'cancer-immunotherapy', name: 'Cancer immunotherapy' },
  { slug: 'car-t-cell-therapy', name: 'CAR-T cell therapy' },
  { slug: 'ai-drug-discovery', name: 'AI drug discovery' },
];

export default function ForIndustryPage() {
  return (
    <>
      <UnifiedNavbar variant="landing" />

      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">For Industry</span>
          </nav>

          <header className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-3">For biomedical teams</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              KOL & investigator mapping, from the literature
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto mb-8">
              See who is publishing in any biomedical field, and where. LabScout turns PubMed into shortlists of
              researchers and institutions by country, city, and institution, in minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <ContactSalesButton
                source="industry_hero"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Talk to us
              </ContactSalesButton>
              <Link
                href="/auth/register"
                className="inline-block rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50"
              >
                Try it free
              </Link>
            </div>
          </header>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What teams use it for</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {USE_CASES.map((u) => (
                <div key={u.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{u.team}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{u.title}</h3>
                  <p className="text-gray-600">{u.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">How it works</h2>
            <ol className="grid gap-5 md:grid-cols-3">
              {[
                ['Describe the area', 'A therapeutic area, target, modality, or method, in plain words.'],
                ['LabScout searches PubMed', 'It writes a thorough literature query and retrieves the matching papers.'],
                ['Get the map and the list', 'Authors are mapped to institutions, cities, and countries. Export the lists as CSV.'],
              ].map(([title, body], i) => (
                <li key={title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-600">{body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-14 rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-3">About the data</h2>
            <ul className="list-disc space-y-2 pl-5 text-gray-600">
              <li>Built from PubMed publication records and the author affiliations printed on each paper.</li>
              <li>Publication activity is a signal of expertise, not an endorsement or a measure of availability.</li>
              <li>Affiliations are parsed automatically and can occasionally place an author in the wrong city; verify before outreach.</li>
            </ul>
          </section>

          <section className="mb-14 rounded-xl border-2 border-blue-600 bg-white p-8">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Custom landscape report</h2>
                <p className="text-gray-600 mb-4">
                  Tell us the area, and we map it for you. You get the full researcher and institution lists as
                  CSV, the country and city maps, and a short summary of where the field is concentrated.
                </p>
                <ul className="list-disc space-y-1 pl-5 text-gray-600">
                  <li>One therapeutic area, target, modality, or method per report</li>
                  <li>Delivered within {CUSTOM_REPORT.deliveryBusinessDays} business days</li>
                  <li>One round of adjustments to the scope included</li>
                </ul>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">from</div>
                <div className="text-4xl font-bold text-gray-900 mb-3">${CUSTOM_REPORT.priceFrom}</div>
                <ContactSalesButton
                  source="industry_report"
                  className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                >
                  Request a report
                </ContactSalesButton>
              </div>
            </div>
          </section>

          <section className="mb-14 rounded-2xl bg-blue-600 p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Plans for teams</h2>
            <p className="mx-auto mb-6 max-w-2xl text-blue-50">
              Individual Pro is ${PLANS.pro.monthlyPrice}/month. For teams that need several seats, larger exports, or
              field maps prepared for them, tell us what you need and we will set it up.
            </p>
            <ContactSalesButton
              source="industry_plans"
              className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Talk to us
            </ContactSalesButton>
          </section>

          <section className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-3">See a live field map</h2>
            <p className="text-gray-600">
              {EXAMPLES.map((e, i) => (
                <span key={e.slug}>
                  {i > 0 && ' · '}
                  <Link href={`/research-jobs/${e.slug}`} className="text-blue-600 hover:underline">{e.name}</Link>
                </span>
              ))}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
