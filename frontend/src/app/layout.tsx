import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/GoogleAnalytics";

export const metadata: Metadata = {
  title: "ScholarMap",
  description: "Research-description-driven literature retrieval"
};

const GA_MEASUREMENT_ID = "G-2123ZJ1Y7B";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
        </Suspense>
        {children}
      </body>
    </html>
  );
}
