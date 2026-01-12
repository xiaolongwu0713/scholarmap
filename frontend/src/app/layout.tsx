import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ScholarMap",
  description: "Research-description-driven literature retrieval"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
