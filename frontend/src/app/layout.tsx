import { SITE_URL } from '@/lib/site';
import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { FirstTouchTracker } from "@/components/FirstTouchTracker";
import { Analytics } from "@vercel/analytics/next";
import { CanonicalURL } from "@/components/CanonicalURL";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LabScout – Find Biomedical Labs and PIs Worldwide",
    template: "%s | LabScout"
  },
  description: "Find the biomedical and life-science labs working on your research, and who leads them. LabScout maps labs, PIs, and institutions by country and city from PubMed data, for PhD, postdoc, and collaboration searches.",
  keywords: [
    // Field-specific keywords
    "biomedical research opportunities",
    "life sciences research",
    "medical research collaboration",
    "PubMed researchers",
    "biomedical institutions",
    "neuroscience research network",
    "pharmacology research",
    "public health researchers",
    "clinical research opportunities",
    "biology research mapping",
    "medical research visualization",
    // Keep relevant general terms
    "academic collaboration",
    "literature search",
    "research mapping",
    "PubMed search",
    "scholar discovery",
  ],
  authors: [{ name: "LabScout Team" }],
  creator: "LabScout",
  publisher: "LabScout",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "LabScout",
    title: "LabScout – Find Biomedical Labs and PIs Worldwide",
    description: "LabScout is a global research opportunity map for biomedical and life science researchers. Explore labs, institutions, and collaborators by country, city, and institution.",
    images: [
      {
        url: "/landing_page_figures_optimized/0.webp",
        width: 1200,
        height: 630,
        alt: "LabScout - Global Research Network Visualization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LabScout – Find Biomedical Labs and PIs Worldwide",
    description: "Global research opportunity map for biomedical and life science researchers. Explore labs, institutions, and collaborators by location.",
    images: ["/landing_page_figures_optimized/0.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "c1b2e25f626eceac",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <CanonicalURL />
        </Suspense>
        {children}
        <Analytics />
        <FirstTouchTracker />
      </body>
    </html>
  );
}
