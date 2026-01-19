/**
 * Google Analytics 4 event tracking utilities
 * Custom events for SEO page tracking and conversion funnel
 * 
 * Note: gtag types are defined globally in src/types/gtag.d.ts
 */

/**
 * Track SEO page view
 * Use this to track when users land on SEO pages
 */
export function trackSEOPageView(pageName: string, location: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_page_view', {
      page_name: pageName,
      location: location,
      event_category: 'SEO',
      event_label: `${pageName} - ${location}`,
    });
  }
}

/**
 * Track demo map clicks from SEO pages
 * Important conversion event: SEO page → Interactive demo
 */
export function trackDemoMapClick(
  source: string, 
  country?: string, 
  city?: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_demo_click', {
      source: source, // 'country_page', 'city_page', 'landing_page'
      country: country || '',
      city: city || '',
      event_category: 'Conversion',
      event_label: `Demo Click from ${source}`,
    });
  }
}

/**
 * Track signup button clicks from SEO pages
 */
export function trackSignupStart(source: string, location?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_start', {
      source: source,
      location: location || '',
      event_category: 'Conversion',
      event_label: `Signup Start from ${source}`,
    });
  }
}

/**
 * Track successful signup completion
 */
export function trackSignupComplete(source: string, location?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_complete', {
      source: source,
      location: location || '',
      event_category: 'Conversion',
      event_label: `Signup Complete from ${source}`,
      value: 1, // Can be used for conversion value in GA4
    });
  }
}

/**
 * Track internal navigation (e.g., country → city page)
 */
export function trackInternalNavigation(
  from: string,
  to: string,
  linkText?: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'internal_navigation', {
      from_page: from,
      to_page: to,
      link_text: linkText || '',
      event_category: 'Engagement',
      event_label: `${from} → ${to}`,
    });
  }
}

/**
 * Track outbound links (e.g., to external resources)
 */
export function trackOutboundLink(url: string, linkText?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'outbound_link', {
      link_url: url,
      link_text: linkText || '',
      event_category: 'Engagement',
      event_label: url,
    });
  }
}

/**
 * Track search/filter actions on SEO pages
 */
export function trackSearchAction(
  searchType: string, // 'country_search', 'city_filter', etc.
  searchTerm?: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: searchTerm || '',
      search_type: searchType,
      event_category: 'Engagement',
    });
  }
}

/**
 * Track CTA button impressions (for A/B testing)
 */
export function trackCTAImpression(
  ctaId: string,
  ctaText: string,
  location: string
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'cta_impression', {
      cta_id: ctaId,
      cta_text: ctaText,
      location: location,
      event_category: 'Engagement',
    });
  }
}

/**
 * Track scroll depth on long SEO content pages
 */
export function trackScrollDepth(page: string, depth: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'scroll_depth', {
      page: page,
      depth_percentage: depth,
      event_category: 'Engagement',
      event_label: `${page} - ${depth}%`,
    });
  }
}
