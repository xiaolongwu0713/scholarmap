import Link from 'next/link';
import type { ReactNode } from 'react';
import { UnifiedNavbar } from '@/components/UnifiedNavbar';
import { Footer } from '@/components/landing/Footer';
import { LEGAL_EFFECTIVE_DATE } from '@/lib/site';

interface LegalPageProps {
  title: string;
  children: ReactNode;
}

/** Shared shell for Terms / Privacy / Refund pages. */
export function LegalPage({ title, children }: LegalPageProps) {
  return (
    <>
      <UnifiedNavbar variant="landing" />
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <nav className="text-sm text-gray-600 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">{title}</span>
          </nav>
          <header className="mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-sm text-gray-500">Effective date: {LEGAL_EFFECTIVE_DATE}</p>
          </header>
          <article className="space-y-8 text-gray-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-blue-600 [&_a:hover]:underline">
            {children}
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
