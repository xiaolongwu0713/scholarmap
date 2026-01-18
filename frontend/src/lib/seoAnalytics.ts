/**
 * SEO-specific analytics tracking functions
 * Extends Google Analytics 4 with custom events for SEO pages
 */

// gtag is already declared in GoogleAnalytics.tsx, so we just use it

/**
 * Track SEO page view
 * @param pageName - Type of SEO page (e.g., 'country_page', 'city_page')
 * @param location - Geographic location name
 */
export function trackSEOPageView(pageName: string, location: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_page_view', {
      page_name: pageName,
      location: location,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track click from SEO page to demo run
 * @param source - Source page type (e.g., 'country_page', 'city_page', 'guide_page')
 * @param country - Country name (optional)
 * @param city - City name (optional)
 */
export function trackDemoMapClick(
  source: string,
  country?: string,
  city?: string
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_demo_click', {
      source: source,
      country: country || '',
      city: city || '',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track signup initiation from SEO page
 * @param source - Source page URL or identifier
 */
export function trackSignupStart(source: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_start', {
      source: source,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track completed signup from SEO page
 * @param source - Source page URL or identifier
 */
export function trackSignupComplete(source: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_complete', {
      source: source,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track internal navigation (SEO page to SEO page)
 * @param from - Source page type
 * @param to - Destination page type
 * @param fromLocation - Source location name
 * @param toLocation - Destination location name
 */
export function trackInternalNavigation(
  from: string,
  to: string,
  fromLocation?: string,
  toLocation?: string
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_internal_navigation', {
      from: from,
      to: to,
      from_location: fromLocation || '',
      to_location: toLocation || '',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Track search or filter action on SEO pages
 * @param action - Action type (e.g., 'search', 'filter', 'sort')
 * @param value - Search term or filter value
 */
export function trackSEOInteraction(action: string, value: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_interaction', {
      action: action,
      value: value,
      timestamp: new Date().toISOString(),
    });
  }
}
