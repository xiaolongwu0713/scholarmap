# Phase 1 Quick Reference Guide

Quick guide for developers working with the new SEO infrastructure.

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── sitemap.ts                              # ✨ NEW: Dynamic sitemap
│   │   ├── research-jobs/
│   │   │   ├── page.tsx                            # Landing page with tracking
│   │   │   └── country/[countrySlug]/page.tsx      # Country pages with SSG+ISR
│   ├── lib/
│   │   ├── analytics.ts                            # ✨ NEW: GA4 tracking functions
│   │   ├── seoApi.ts                               # API wrappers for demo run
│   │   ├── seoContent.ts                           # Content generation
│   │   └── geoSlugs.ts                             # Slug conversion utilities
│   └── components/
│       ├── SEOPageTracker.tsx                      # ✨ NEW: Page view tracker
│       └── TrackedLink.tsx                         # ✨ NEW: Link click tracker
```

---

## 🔧 Key Features

### 1. Dynamic Sitemap
**File**: `frontend/src/app/sitemap.ts`

Automatically generates sitemap with:
- Static pages (home, research-jobs, demo run)
- All country pages from demo run API
- Updates daily with ISR

**Usage**:
```bash
# View sitemap locally
http://localhost:3000/sitemap.xml

# Production
https://scholarmap-frontend.onrender.com/sitemap.xml
```

---

### 2. Static Site Generation (SSG) + ISR

**File**: `frontend/src/app/research-jobs/country/[countrySlug]/page.tsx`

**Key settings**:
```typescript
export const revalidate = 86400; // 24 hour cache

export async function generateStaticParams() {
  // Generates static pages for top 100 countries
}
```

**How it works**:
- Top 100 countries pre-rendered at build time
- Other countries generated on first visit (dynamic)
- All pages revalidate every 24 hours
- ISR ensures fresh data without rebuilding entire site

---

### 3. Google Analytics Tracking

**File**: `frontend/src/lib/analytics.ts`

**Available functions**:

```typescript
// Track page views
trackSEOPageView('country_page', 'United States');

// Track demo map clicks
trackDemoMapClick('country_page', 'United States');

// Track signup clicks
trackSignupStart('country_page', 'United States');

// Track internal navigation
trackInternalNavigation('/research-jobs', '/research-jobs/country/usa');

// Track search actions
trackSearchAction('country_search', 'United States');
```

**Usage in components**:

```typescript
// Server Component - use SEOPageTracker
import { SEOPageTracker } from '@/components/SEOPageTracker';

export default function Page() {
  return (
    <>
      <SEOPageTracker pageName="my_page" location="context" />
      {/* ... rest of page */}
    </>
  );
}

// Use TrackedLink for CTAs
import { TrackedLink } from '@/components/TrackedLink';

<TrackedLink
  href="/auth/register"
  trackingType="signup"
  trackingSource="country_page"
  country="United States"
>
  Sign Up
</TrackedLink>
```

---

## 🚀 Common Tasks

### Add tracking to a new page

1. Import the tracker:
```typescript
import { SEOPageTracker } from '@/components/SEOPageTracker';
```

2. Add to your component:
```typescript
export default function MyPage() {
  return (
    <>
      <SEOPageTracker pageName="my_page_name" location="page_context" />
      {/* Your content */}
    </>
  );
}
```

### Add tracked CTA button

```typescript
import { TrackedLink } from '@/components/TrackedLink';

<TrackedLink
  href="/target-url"
  trackingType="demo" // or "signup" or "none"
  trackingSource="source_page_name"
  country="Country Name" // optional
  city="City Name" // optional
  className="your-tailwind-classes"
>
  Button Text
</TrackedLink>
```

### Add a new country to slug mapping

**File**: `frontend/src/lib/geoSlugs.ts`

```typescript
export const COUNTRY_SLUG_MAP: Record<string, string> = {
  'united-states': 'United States',
  'your-new-country': 'Your New Country Name', // Add here
  // ...
};
```

### Test GA tracking locally

1. Open DevTools → Network tab
2. Filter by "collect" or "analytics"
3. Navigate pages and click buttons
4. Should see `gtag` requests with event data

---

## 🧪 Testing Commands

### Build test
```bash
cd frontend
npm run build
# Should see: "Generating static pages (100/100)"
```

### Dev server
```bash
npm run dev
# Visit http://localhost:3000/sitemap.xml
# Visit http://localhost:3000/research-jobs/country/united-states
```

### Check build output
```bash
npm run build
# Look for:
# ○ /research-jobs (static)
# ● /research-jobs/country/[countrySlug] (100 pages, ISR: 86400)
```

---

## 📊 GA4 Dashboard Setup

### Custom Events to Monitor

In GA4, create custom reports for:

1. **SEO Page Views**
   - Event: `seo_page_view`
   - Dimensions: `page_name`, `location`

2. **Demo Click Conversion**
   - Event: `seo_to_demo_click`
   - Dimensions: `source`, `country`

3. **Signup Funnel**
   - Event: `seo_to_signup_start`
   - Event: `seo_to_signup_complete`
   - Create funnel visualization

### Real-time Testing

1. Go to GA4 → Reports → Realtime
2. Navigate to your site
3. Events should appear within seconds
4. Check event parameters are correct

---

## 🐛 Troubleshooting

### Sitemap not generating
- Check backend API is responding: `curl https://scholarmap-backend.onrender.com/api/projects/6af7ac1b6254/runs/53e099cdb74e/map/world`
- Check console for errors during build
- Verify `fetchWorldMap()` function works

### Country pages not found (404)
- Check slug conversion: `countryToSlug('United States')` should return `'united-states'`
- Verify country name matches API response exactly
- Add special cases to `COUNTRY_SLUG_MAP`

### GA events not firing
- Check browser console for errors
- Verify `window.gtag` is defined (should be loaded in layout)
- Use GA4 DebugView for detailed event inspection
- Check GA_MEASUREMENT_ID is correct in layout.tsx

### Build takes too long
- Reduce number of static pages in `generateStaticParams`
- Change `slice(0, 100)` to `slice(0, 50)`
- Consider deploying with fewer pre-rendered pages initially

### ISR not revalidating
- Check `revalidate` is set correctly
- Verify cache headers in network tab
- May need to manually clear Render cache
- Wait full 24 hours for first revalidation

---

## 📈 Performance Tips

### Optimize sitemap generation
```typescript
// Use parallel requests for city pages (Phase 2)
const cityPromises = countries.map(country => fetchCountryMap(country));
const cityResults = await Promise.all(cityPromises);
```

### Reduce build time
- Pre-render only top 50 countries initially
- Use ISR for less popular countries
- Monitor build times in Render dashboard

### Improve page load speed
- Images already optimized (webp)
- Use Next.js Image component
- Minimize client-side JavaScript
- Keep most content server-rendered

---

## 🔗 Related Documentation

- Main SEO Plan: `ScholarMap_Search_Intent_SEO_Plan.md`
- Completion Checklist: `PHASE1_COMPLETION_CHECKLIST.md`
- Next.js ISR Docs: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- GA4 Events Guide: https://developers.google.com/analytics/devguides/collection/ga4/events

---

**Version**: 1.0  
**Last Updated**: 2026-01-19
