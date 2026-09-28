"use client";

import { CONTACT_EMAIL } from "@/lib/site";
import { trackConversion } from "@/lib/analytics";

const SUBJECT = "LabScout for my team";
const BODY = [
  "Hi LabScout team,",
  "",
  "Company / team:",
  "Research area(s) we want mapped:",
  "What we would use it for (e.g. KOL mapping, investigator scouting):",
  "",
].join("\n");

/** Mail link to the team inbox, counted as an industry lead. */
export function ContactSalesButton({ source, className, children }: {
  source: string;
  className?: string;
  children: React.ReactNode;
}) {
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
  return (
    <a href={href} className={className} onClick={() => trackConversion("industry_contact_click", { source })}>
      {children}
    </a>
  );
}
