import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { CanonicalURL } from "@/components/CanonicalURL";

export const metadata: Metadata = {
  metadataBase: new URL('https://scholarmap-frontend.onrender.com'),
  title: {
    default: "ScholarMap - Global Biomedical Research Network",
    template: "%s | ScholarMap"
  },
  description: "ScholarMap is a global research opportunity map for biomedical and life science researchers. Explore labs, institutions, and collaborators by country, city, and institution using PubMed data.",
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
  authors: [{ name: "ScholarMap Team" }],
  creator: "ScholarMap",
  publisher: "ScholarMap",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scholarmap-frontend.onrender.com",
    siteName: "ScholarMap",
    title: "ScholarMap - Global Biomedical Research Network",
    description: "ScholarMap is a global research opportunity map for biomedical and life science researchers. Explore labs, institutions, and collaborators by country, city, and institution.",
    images: [
      {
        url: "/landing_page_figures_optimized/0.webp",
        width: 1200,
        height: 630,
        alt: "ScholarMap - Global Research Network Visualization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarMap - Global Biomedical Research Network",
    description: "Global research opportunity map for biomedical and life science researchers. Explore labs, institutions, and collaborators by location.",
    images: ["/landing_page_figures_optimized/0.webp"],
    creator: "@scholarmap",
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

const GA_MEASUREMENT_ID = "G-2123ZJ1Y7B";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <Suspense fallback={null}>
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
          <CanonicalURL />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
