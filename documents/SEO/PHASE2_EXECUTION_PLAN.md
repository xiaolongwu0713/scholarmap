# Phase 2 Execution Plan: City Pages

**Status**: 📋 Ready to Start  
**Estimated Time**: 4-6 days  
**Priority**: High (expand SEO coverage)

---

## 📊 Current Status Assessment

### ✅ Phase 1 Achievements
- **52 country pages** live with SSG + ISR
- **Dynamic sitemap** with 56 URLs
- **GA4 tracking** successfully implemented
- **Biomedical field positioning** completed
- **SEO infrastructure** ready for expansion

### 📈 Current Metrics
- **Sitemap**: 56 URLs (52 countries + 4 static)
- **GSC Discovered**: 5 pages (will increase with time)
- **GA4 Events**: Successfully tracking
- **Build Time**: ~10-15 min with SSG

### 🎯 Phase 2 Goals
- Add **200-500 city pages** to expand long-tail keyword coverage
- Increase sitemap to **250-550 URLs**
- Improve internal linking network
- Target city-specific searches (e.g., "postdoc Boston", "research opportunities London")

---

## 🗺️ Phase 2 Strategy

### Why City Pages?

**1. Long-tail Keyword Opportunities**
```
"biomedical research United States" - High competition
"biomedical research Boston" - Medium competition ⭐
"neuroscience postdoc Boston" - Low competition ⭐⭐
"life sciences research Cambridge MA" - Very low competition ⭐⭐⭐
```

**2. Higher Conversion Intent**
- Users searching for specific cities are more likely to take action
- City-level searches indicate serious intent (not just browsing)

**3. Competitive Advantage**
- Most competitors don't have city-level research pages
- Untapped search volume

---

## 📋 Phase 2 Task Breakdown

### Part 1: City Page Implementation (Days 1-3)

#### Task 1.1: Create City Page Template (Day 1)
**File**: `frontend/src/app/research-jobs/city/[citySlug]/page.tsx`

**Structure** (similar to country pages):
```typescript
- generateStaticParams() for top 200 cities
- generateMetadata() with city-specific SEO
- SSR with ISR (24h revalidate)
- Structured data: Place, BreadcrumbList
- GA4 tracking integration
```

**Content Sections**:
1. City overview (200-300 words)
2. Top institutions in city
3. Research statistics
4. Links to country page (parent)
5. CTA to demo map (city pre-filtered)
6. FAQs

**Estimated Time**: 4-6 hours

---

#### Task 1.2: Create City Content Generator (Day 1)
**File**: `frontend/src/lib/seoCityContent.ts`

**Functions**:
```typescript
- generateCityContent(city, country, data)
- generateCityMetaDescription(city, country, data)
- generateCityKeywords(city, country)
- generateCityFAQs(city, country, data)
```

**Estimated Time**: 2-3 hours

---

#### Task 1.3: Create City Components (Day 2)
**New Components**:

1. **CityInstitutionsGrid.tsx**
   - Grid display of top institutions in city
   - Link to demo map with institution filter

2. **CityResearchStats.tsx**
   - Visual stats cards for city
   - Scholar count, institution count, top fields

**Estimated Time**: 3-4 hours

---

#### Task 1.4: Update Slug Utilities (Day 2)
**File**: `frontend/src/lib/geoSlugs.ts`

**Add**:
```typescript
// Handle city + country slug format
export function cityCountryToSlug(city: string, country: string): string {
  return `${cityToSlug(city)}-${countryToSlug(country)}`;
}

// Expand CITY_SLUG_MAP with top 200 cities
export const CITY_SLUG_MAP: Record<string, string> = {
  // Existing cities...
  // Add more from API data
};
```

**Estimated Time**: 1-2 hours

---

### Part 2: Sitemap Expansion (Days 3-4)

#### Task 2.1: Update Dynamic Sitemap (Day 3)
**File**: `frontend/src/app/sitemap.ts`

**Changes**:
```typescript
// Add city pages dynamically
const cityPages = await generateCityUrls();

// Optimize with parallel requests
const cityPromises = topCountries.map(country => 
  fetchCountryMap(country.country)
);
const cityResults = await Promise.all(cityPromises);
```

**Considerations**:
- Limit to top 200-500 cities (by scholar count)
- Use parallel requests to speed up generation
- Add error handling for API failures

**Estimated Time**: 3-4 hours

---

#### Task 2.2: Optimize Sitemap Performance (Day 4)
**Performance targets**:
- Sitemap generation: < 10 seconds
- Build time increase: < 5 minutes
- Memory usage: stable

**Optimizations**:
1. Cache API responses during build
2. Limit concurrent requests (max 10 parallel)
3. Add timeout handling
4. Consider splitting sitemap if > 1000 URLs

**Estimated Time**: 2-3 hours

---

### Part 3: Integration & Links (Day 4)

#### Task 3.1: Add City Links to Country Pages
**File**: `frontend/src/app/research-jobs/country/[countrySlug]/page.tsx`

**Update**:
- Change city list from plain text to links
- Link format: `/research-jobs/city/[citySlug]`
- Add city count in stats

**Estimated Time**: 1 hour

---

#### Task 3.2: Update Landing Page
**File**: `frontend/src/app/research-jobs/page.tsx`

**Add**:
- "Browse by City" section (optional)
- Mention city-level data in description
- Update metadata to include city pages

**Estimated Time**: 1 hour

---

### Part 4: Testing & Validation (Days 5-6)

#### Task 4.1: Build & Performance Test (Day 5)
```bash
# Test build
npm run build

# Check output
- Should see ~200-500 city pages generated
- Build time < 20 minutes
- No errors

# Test sitemap
curl https://scholarmap-frontend.onrender.com/sitemap.xml
- Should have 250-550 URLs
```

**Estimated Time**: 2 hours

---

#### Task 4.2: Page Quality Check (Day 5)
**Test 20 random city pages**:
- [ ] Content renders correctly
- [ ] Stats are accurate
- [ ] Institution list loads
- [ ] Links work (to country, demo, signup)
- [ ] Metadata is unique
- [ ] Structured data validates

**Tools**:
- Browser manual check
- Rich Results Test
- Lighthouse SEO audit

**Estimated Time**: 3 hours

---

#### Task 4.3: GA4 Tracking Verification (Day 6)
**Test tracking events**:
- [ ] City page views tracked
- [ ] Demo clicks from city pages tracked
- [ ] Signup clicks tracked
- [ ] Internal navigation (country → city) tracked

**Estimated Time**: 1 hour

---

#### Task 4.4: Linter & Type Check (Day 6)
```bash
npm run lint
npm run type-check
```

Fix any errors.

**Estimated Time**: 1 hour

---

## 🚧 Implementation Challenges & Solutions

### Challenge 1: City Slug Conflicts
**Problem**: Multiple cities with same name (e.g., "Cambridge, UK" vs "Cambridge, US")

**Solution**:
```typescript
// Option A: Include country in slug
/research-jobs/city/cambridge-united-kingdom
/research-jobs/city/cambridge-united-states

// Option B (Recommended): Unique slug with mapping
const CITY_UNIQUE_SLUGS = {
  'cambridge-uk': { city: 'Cambridge', country: 'United Kingdom' },
  'cambridge-ma': { city: 'Cambridge', country: 'United States' },
};
```

---

### Challenge 2: Too Many Cities
**Problem**: Some countries have 100+ cities, creating too many pages

**Solution**:
- Limit to top 200-500 cities globally (by scholar count)
- Set minimum threshold (e.g., at least 5 scholars)
- Prioritize cities with >10 institutions

---

### Challenge 3: Build Time
**Problem**: Generating 500 static pages increases build time

**Solution**:
- Generate top 200 cities statically
- Use dynamic rendering for long-tail cities
- Consider ISR with longer revalidation (48h for cities)

---

### Challenge 4: Content Quality
**Problem**: Templated content for 500 cities might feel repetitive

**Solution**:
- Vary sentence structures in templates
- Include city-specific data (institution names, stats)
- Focus on unique value (institution list, not just text)
- Add city-specific facts from external data (optional)

---

## 📈 Success Metrics (Phase 2)

### Immediate (After Deployment)
- [ ] 200-500 city pages deployed successfully
- [ ] Sitemap includes all city URLs
- [ ] No build errors
- [ ] All pages pass Lighthouse SEO (>90)

### Week 1-2
- [ ] GSC discovers city pages (50-100 pages)
- [ ] No critical errors in GSC
- [ ] GA4 tracking city page views

### Month 1
- [ ] 100+ city pages indexed by Google
- [ ] Organic traffic from city-specific searches
- [ ] Internal navigation working (country → city)

### Month 2-3
- [ ] 200+ city pages indexed
- [ ] Long-tail keywords ranking (e.g., "postdoc Boston")
- [ ] City pages contributing 20-30% of SEO traffic

---

## 🎯 ROI Analysis

### Why Prioritize City Pages Now?

**Pros**:
- ✅ Highest SEO ROI (low competition keywords)
- ✅ Infrastructure already in place
- ✅ Can reuse country page components
- ✅ Expands total addressable search volume 5-10x

**Cons**:
- ⚠️ More pages = more maintenance
- ⚠️ Longer build times
- ⚠️ Need to manage duplicate city names

**Decision**: Proceed with Phase 2 - benefits outweigh costs.

---

## 🔄 Alternative Approaches

### Option A: Full Phase 2 (Recommended)
- Implement 200-500 city pages
- Time: 4-6 days
- Impact: High SEO coverage

### Option B: Minimal Phase 2
- Implement top 50 cities only
- Time: 2-3 days
- Impact: Medium SEO coverage

### Option C: Skip to Phase 3 (Guide Pages)
- Focus on content-heavy guide pages first
- Time: 3-4 days
- Impact: Different SEO angle

**Recommendation**: **Option A (Full Phase 2)** for maximum SEO impact.

---

## 📅 Timeline Summary

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| **Day 1** | City template + content generator | 6-9h | page.tsx, seoCityContent.ts |
| **Day 2** | Components + slug updates | 4-6h | Components, updated geoSlugs.ts |
| **Day 3** | Sitemap expansion | 3-4h | Updated sitemap.ts |
| **Day 4** | Performance + integration | 3-4h | Optimized build, links |
| **Day 5** | Testing (build + pages) | 5h | Validated pages |
| **Day 6** | Testing (GA4 + lint) | 2h | Clean build, tracking verified |

**Total**: 23-34 hours (4-6 working days)

---

## 🚀 Next Steps After Phase 2

### Phase 3 Preview (Week 3-4)
- Guide pages for top countries
- Enhanced content depth
- HowTo structured data

### Phase 4 Preview (Optional)
- Backend API optimization
- Redis caching
- Performance monitoring

---

## 💡 Quick Wins to Consider

While implementing Phase 2, also consider:

1. **Add "Related Cities" section** on country pages
2. **City comparison feature** (e.g., Boston vs Cambridge)
3. **Top 10 cities landing page** (`/research-jobs/top-cities`)
4. **Search functionality** on research-jobs landing page
5. **Breadcrumb improvements** (clickable, styled)

These can be added incrementally without blocking Phase 2 launch.

---

## ✅ Ready to Start Checklist

Before starting Phase 2 implementation:

- [x] Phase 1 deployed and stable
- [x] No critical bugs in country pages
- [x] GA4 tracking verified
- [x] Sitemap infrastructure working
- [ ] Review city slug strategy (resolve duplicates)
- [ ] Decide on city count limit (200, 300, or 500?)
- [ ] Confirm build time is acceptable
- [ ] Backup current codebase

---

## 📞 Decision Points

Before I start implementing, please confirm:

1. **City count**: Should we target 200, 300, or 500 cities?
   - Recommendation: Start with 200, expand later if needed

2. **City slug format**: How to handle duplicate city names?
   - Recommendation: `cambridge-uk`, `cambridge-ma` format

3. **Build time tolerance**: Max acceptable build time?
   - Current: ~10-15 min
   - With cities: ~15-25 min
   - Acceptable?

4. **Priority**: Proceed with Phase 2 now, or do Phase 3 (guides) first?
   - Recommendation: Phase 2 (higher SEO ROI)

---

**Ready to proceed?** Let me know and I'll start implementing Phase 2!

**Document Version**: 1.0  
**Created**: 2026-01-21  
**Status**: Awaiting approval to start
