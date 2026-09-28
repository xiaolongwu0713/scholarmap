"use client";

import { useEffect, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { TrackedLink } from "@/components/TrackedLink";

interface MapYourFieldCTAProps {
  fieldName: string;
  /** Where "explore this map" goes (the field's public demo run). */
  demoHref: string;
  /** Analytics source, e.g. "field_overview_crispr". */
  source: string;
  /** Region the visitor is looking at, e.g. "Germany" or "Boston". */
  place?: string;
}

/**
 * Main call to action on SEO field pages: build this kind of map for your own topic.
 * Visitors land here from search; signing up to map their own area is the step that leads to Pro.
 */
export function MapYourFieldCTA({ fieldName, demoHref, source, place }: MapYourFieldCTAProps) {
  // Decided after mount: the server can't see the login token.
  const [startHref, setStartHref] = useState("/auth/register?next=/projects");
  useEffect(() => {
    if (isAuthenticated()) setStartHref("/projects");
  }, []);

  const scope = place ? `${fieldName} in ${place}` : fieldName;

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 mb-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Map your own research area</h3>
      <p className="text-gray-700 mb-4">
        This page covers {scope}. Describe your own topic (a disease, method, or target) and LabScout builds the
        same map for it: the labs and researchers publishing on it, by country, city, and institution.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <TrackedLink
          href={startHref}
          trackingType="signup"
          trackingSource={source}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Create a map for my research — free
        </TrackedLink>
        <TrackedLink
          href={demoHref}
          trackingType="demo"
          trackingSource={source}
          className="text-blue-700 font-medium hover:underline"
        >
          or explore this field&apos;s map →
        </TrackedLink>
      </div>
    </div>
  );
}
