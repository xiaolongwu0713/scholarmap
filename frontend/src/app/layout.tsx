import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { CanonicalURL } from "@/components/CanonicalURL";

export const metadata: Metadata = {
  metadataBase: new URL('https://scholarmap-frontend.onrender.com'),
  title: {
    default: "ScholarMap - Discover Global Research Opportunities",
    template: "%s | ScholarMap"
  },
  description: "Map global research opportunities by country, city, and institution. Auto-build literature queries, find collaborators, and discover your dream research destination in seconds.",
  keywords: [
    "research opportunities",
    "academic collaboration",
    "literature search",
    "research mapping",
    "global scholars",
    "academic institutions",
    "research collaboration",
    "PubMed search",
    "scholar discovery",
    "research visualization",
    "academic networking",
    "institution ranking"
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
    title: "ScholarMap - Discover Global Research Opportunities",
    description: "Map global research opportunities by country, city, and institution. Find collaborators and discover your dream research destination.",
    images: [
      {
        url: "/landing_page_figures/0.png",
        width: 1200,
        height: 630,
        alt: "ScholarMap - Global Research Network Visualization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarMap - Discover Global Research Opportunities",
    description: "Map global research opportunities by country, city, and institution. Find collaborators and discover your dream research destination.",
    images: ["/landing_page_figures/0.png"],
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
