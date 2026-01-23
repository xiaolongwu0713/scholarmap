# ScholarMap - Content-Driven SEO Expansion Plan (Search-Intent Pages)

This plan outlines the strategy for creating search-intent-optimized pages to drive organic traffic.

- Frontend: Next.js App Router (Next 15) in `frontend/src/app`
- Backend: FastAPI in `backend/app/main.py`
- Database: PostgreSQL (hosted on Render)
- Deployment: Render (Frontend + Backend + Database)
- Current SEO: metadata + structured data + dynamic sitemap + robots already implemented

---

## 0. Current Baseline

### Public pages that exist today
- `/` (landing page with structured data)
- `/auth/login`, `/auth/register`
- `/projects` (requires auth)
- `/projects/[projectId]` (requires auth)
- `/projects/[projectId]/runs/[runId]` (auth configurable)
- **Demo run**: `/projects/6af7ac1b6254/runs/53e099cdb74e` (publicly accessible)

**Note**: `share_run_auth_check_enabled` is set to `False` in `config.py`, meaning all run pages are currently **publicly accessible** (no login required). This is an important SEO foundation.

### Existing SEO infrastructure
- **Metadata and OG tags**: `frontend/src/app/layout.tsx`
  - Google verification: `c1b2e25f626eceac`
  - Metadata base URL: `https://scholarmap-frontend.onrender.com`
- **Structured data**: `frontend/src/components/StructuredData.tsx` 
  - Organization, WebApplication, SoftwareApplication, FAQ, HowTo, BreadcrumbList schemas
- **Robots.txt**: `frontend/src/app/robots.ts`
  - Allows all user agents
  - Disallows: `/api/`, `/projects/*/runs/*/edit`
- **Dynamic sitemap**: `frontend/src/app/sitemap.ts`
- **Google Analytics**: ID `G-2123ZJ1Y7B`
- **Canonical URL**: Auto-generates canonical URLs

### Existing geo aggregation APIs

**Phase 2B Map Visualization APIs** (in `backend/app/main.py`):

1. **World Map** - `GET /api/projects/{projectId}/runs/{runId}/map/world`
   - Returns: country-level scholar counts and locations
   
2. **Country Map** - `GET /api/projects/{projectId}/runs/{runId}/map/country/{country}`
   - Returns: city-level data within a country
   
3. **City Map** - `GET /api/projects/{projectId}/runs/{runId}/map/city/{country}/{city}`
   - Returns: institution-level data within a city
   
4. **Institution Scholars** - `GET /api/projects/{projectId}/runs/{runId}/map/institution`
   - Returns: individual scholars at an institution

**Important**: These APIs are protected by `AuthMiddleware`, but `share_run_auth_check_enabled=False` means they're currently accessible for public runs.

### Database models

**Core tables** (`backend/app/db/models.py`):

1. **Authorship** - Author-paper associations + geo information
2. **Paper** - Paper metadata
3. **RunPaper** - Many-to-many relationship between runs and papers
4. **AffiliationCache** - Affiliation extraction cache
5. **GeocodingCache** - Geocoding cache
6. **InstitutionGeo** - Institution geographic information (QS Top 500 + major research institutions)

These tables contain all the data needed to build SEO pages without additional data aggregation work.

---

## 1. Why Search-Intent Pages Matter

### Current SEO limitations

Despite `share_run_auth_check_enabled=False` allowing public access to run pages:

1. **Run pages are dynamic interactive interfaces** - mostly JavaScript-rendered, hard for search engines to index
2. **Run URLs are not semantic**: `/projects/6af7ac1b6254/runs/53e099cdb74e` is unfriendly to both search engines and users
3. **Lack of static text content**: Run pages are primarily map visualizations, lacking descriptive text
4. **Not optimized for search intent**: Users searching "postdoc positions in Boston" won't find current run pages

### Value of search-intent pages

By creating dedicated SEO landing pages:

1. **Server-rendered HTML content**: Ensures search engines can fully index
2. **Semantic URLs**: `/research-jobs/country/united-states`, `/research-jobs/city/boston`
3. **Rich descriptive text**: 800-1500 words of static content + dynamic data
4. **Optimized for long-tail keywords**: Matches real user search intent
5. **Internal linking network**: Country → City → Institution → Demo run traffic flow

**Key advantage**: SEO pages act as the "front door" attracting organic traffic, Demo run acts as the "showroom" demonstrating product capabilities, forming a complete conversion funnel.

---

## 2. Search-Intent Page Types

### 2.1 Geo Landing Pages (Highest ROI)

**Recommended URLs**
- `/research-jobs/country/[countrySlug]`
- `/research-jobs/city/[citySlug]`
- (optional) `/research-jobs/institution/[institutionSlug]`

**Each page includes**
- Server-rendered text (800-1500 words, template-driven)
- Quantitative summaries from aggregation APIs (scholar count, institution count, top cities/institutions)
- CTA to open the **public demo run** for interactive exploration
- Structured data: `Place`, `ItemList`, `BreadcrumbList`

### 2.2 Field-Specific Geo Pages (Very High ROI) ⭐ NEW

**Recommended URLs**
- `/research-jobs/[fieldSlug]` - Field overview + global distribution
- `/research-jobs/[fieldSlug]/country/[countrySlug]` - Field in specific country
- `/research-jobs/[fieldSlug]/city/[citySlug]` - Field in specific city

**Priority research fields** (5-10 fields):
1. Brain-Computer Interface (BCI)
2. Neural Modulation (tDCS/TMS)
3. CRISPR Gene Editing
4. Cancer Immunotherapy
5. AI in Drug Discovery
6. Neurodegenerative Diseases
7. Stem Cell Research
8. Microbiome Research

**Each page includes**
- Field-specific introduction (600-1000 words)
- Top 10 countries for this field
- Top 5 cities for this field
- Scholar and institution counts specific to this field
- CTA to field-specific demo run
- Structured data: `ResearchProject`, `Place`, `BreadcrumbList`

**Key advantages**:
- ✅ **Long-tail keywords**: "BCI research in Boston" (low competition, high conversion)
- ✅ **Competitive gap**: No other platform offers "field + geography" combination
- ✅ **Fast ranking**: 1-2 months to top 10 (vs 6-12 months for broad keywords)
- ✅ **Higher conversion**: 15-25% (vs 5-10% for broad pages)

**Data source**: Dedicated runs in SEO project, one run per research field

### 2.3 Guide / Question-Based Pages

**URLs**
- `/guides/how-to-find-postdoc-in-[countrySlug]`
- `/guides/best-cities-for-[fieldSlug]-research`

These pages are static text linking to geo pages and demo run.

---

## 3. Backend Data Strategy

### ✅ Recommended: SEO API Wrapper Based on Demo Run

Since existing map aggregation APIs are already comprehensive, we adopt a **lightweight API wrapper** strategy:

#### Phase 1: Simplified (Minimal Implementation) ⭐⭐⭐⭐⭐

**Core idea**: Directly call existing map APIs in SEO page's `getServerSideProps` or `generateStaticParams`

**Advantages**:
- ✅ Zero backend development cost
- ✅ Directly reuse existing `PostgresMapAggregator` logic
- ✅ Data is always up-to-date (from demo run)

#### Phase 2: Dedicated SEO API Endpoints (Optional) ⭐⭐⭐⭐

For better control and caching, add dedicated SEO APIs:
- `/api/seo/countries` - List all countries with data
- `/api/seo/country/{slug}` - Country details
- `/api/seo/cities` - List all cities

**Caching strategy**:
- Redis cache (TTL: 24 hours)
- Or use FastAPI's `lru_cache` decorator

#### Phase 3: Cross-Run Aggregation (Future) ⭐⭐

For aggregating data across all public runs - not recommended now, wait until we have multiple public runs.

**Recommendation**: Start with Phase 1, gradually evolve to Phase 2 based on traffic and performance needs.

---

## 4. Frontend Implementation

### New route structure

Add under `frontend/src/app`:
```
research-jobs/
  page.tsx                                    # All countries landing
  country/
    [countrySlug]/
      page.tsx                                # Country detail
  city/
    [citySlug]/
      page.tsx                                # City detail
  
  # Phase 3: Field-specific pages
  [fieldSlug]/
    page.tsx                                  # Field overview + global map
    country/
      [countrySlug]/
        page.tsx                              # Field in specific country
    city/
      [citySlug]/
        page.tsx                              # Field in specific city

guides/
  how-to-find-postdoc-in-[countrySlug]/
    page.tsx
  best-cities-for-[fieldSlug]-research/
    page.tsx
```

### Key technical points

1. **Static Site Generation (SSG)**: Use `generateStaticParams()` to pre-render top 100 countries
2. **Incremental Static Regeneration (ISR)**: Use `revalidate: 86400` (24h) for periodic updates
3. **SEO-friendly HTML**: All content server-rendered, ensuring crawler indexability
4. **Internal linking**: Country → City → Institution → Demo run linking network
5. **Structured data**: Add Place and BreadcrumbList schema to each page

---

## 5. Sitemap Expansion

### Expected sitemap scale

- Static pages: ~5 URLs
- Country pages: ~150-200 URLs (Phase 1) ✅
- City pages: ~200 URLs (Phase 2) ✅
- Field overview pages: ~10 URLs (Phase 3)
- Field × Country pages: ~100 URLs (10 fields × 10 countries)
- Field × City pages: ~50 URLs (10 fields × 5 cities)
- Guide pages: ~20 URLs (Phase 4)
- **Total**: ~535-585 URLs (current) → ~700-800 URLs (after Phase 3)

**Note**: Google supports up to 50,000 URLs per sitemap, current scale is well within limits.

---

## 6. Internal Linking Strategy

### Link flow diagram

```
Landing Page (/)
    ↓
Research Jobs Landing (/research-jobs)
    ↓
    ├─────────────────────┬────────────────────┐
    ↓                     ↓                    ↓
Country Pages      City Pages         Field Pages (NEW)
(/country/*)       (/city/*)          (/[field]/)
    ↓                     ↓                    ↓
    └─────────────────────┴────────────────────┘
                         ↓
              Field × Geography Pages (NEW)
              (/[field]/country/*)
              (/[field]/city/*)
                         ↓
               Demo Run (field-specific)
               (/projects/seo-project/runs/*)
                         ↓
                  Signup (/auth/register)
```

**Internal linking strategy**:
1. **Broad → Specific**: General geo pages link to field-specific versions
2. **Field hub**: Each field overview page links to its top countries/cities
3. **Cross-linking**: "BCI in Boston" links to both "Boston" page and "BCI" page
4. **Demo run targeting**: Each field page links to its dedicated demo run

### SEO value

- **Crawler discoverability**: All SEO pages connected via HTML links
- **Link equity transfer**: Homepage → Research Jobs → Countries → Cities hierarchy passes PageRank
- **User navigation**: Natural browsing path, reduces bounce rate
- **Conversion funnel**: Information pages → Interactive tool → Registration

---

## 7. Analytics and Measurement

### Current GA Setup
- **GA ID**: `G-2123ZJ1Y7B`
- **Type**: Google Analytics 4 (GA4)

### Key events to track

- `seo_page_view` - SEO page views
- `seo_to_demo_click` - Click from SEO page to demo run
- `seo_to_signup_start` - Click signup from SEO page
- `seo_to_signup_complete` - Complete signup from SEO flow

### GA4 key metrics

Monitor in Google Analytics:

1. **Traffic metrics**:
   - SEO page pageviews
   - Organic search traffic growth
   - Top landing pages (by country/city)

2. **Conversion metrics**:
   - `seo_to_demo_click` conversion rate
   - `seo_to_signup_complete` conversion rate

3. **User behavior**:
   - Bounce rate on SEO pages
   - Time on page
   - Navigation flow (Country → City → Demo)

4. **SEO effectiveness**:
   - Organic search queries (from Search Console)
   - Top referring keywords

---

## 8. Execution Plan

### Phase 1: MVP - Country Pages ✅ COMPLETED (2026-01-19)

**Goal**: Launch core country-level SEO pages

**Completed**:
- ✅ Created `/research-jobs` route structure
- ✅ Implemented slug conversion utilities
- ✅ Created API call functions
- ✅ Implemented country landing page
- ✅ Implemented country detail pages
- ✅ Added metadata and structured data
- ✅ Dynamic sitemap generation
- ✅ GA4 event tracking
- ✅ 100+ country pages online

**Results**:
- Sitemap currently shows 5 indexed pages in GSC (waiting for Google to crawl new pages)
- GA4 events successfully tracked
- Conversion funnels created in GA4

---

### Phase 2: City Pages ✅ COMPLETED (2026-01-21)

**Goal**: Launch city-level SEO pages

**Completed**:
- ✅ Implemented `/research-jobs/city/[citySlug]/page.tsx`
- ✅ `generateStaticParams()` for top 200 cities
- ✅ City institutions grid component
- ✅ City-level metadata and schema (Place, Breadcrumb, FAQ)
- ✅ Full biomedical/life sciences content positioning
- ✅ Sitemap expansion (~256 URLs total, 4.5x increase)
- ✅ Internal linking network (country ↔ city)
- ✅ GA4 tracking integration
- ✅ Performance optimization (batch processing)

**Results**:
- 200 city pages online
- Complete sitemap (country + city)
- Zero linter errors

---

### Phase 3: Field-Specific Pages (Week 3-4) 🆕 HIGH PRIORITY

**Goal**: Launch field-specific SEO pages for targeted long-tail keywords

**Week 3: Infrastructure & Data**
- [ ] Create SEO project in super user account
- [ ] Run dedicated searches for priority fields:
  - [ ] Brain-Computer Interface (BCI)
  - [ ] Neural Modulation (tDCS/TMS)
  - [ ] CRISPR Gene Editing
  - [ ] Cancer Immunotherapy
  - [ ] AI in Drug Discovery
- [ ] Verify run data quality and coverage

**Week 4: Page Implementation**
- [ ] Implement `/research-jobs/[fieldSlug]/page.tsx` (field overview)
- [ ] Implement `/research-jobs/[fieldSlug]/country/[countrySlug]/page.tsx`
- [ ] Implement `/research-jobs/[fieldSlug]/city/[citySlug]/page.tsx`
- [ ] Create field content generator (`seoFieldContent.ts`)
- [ ] Add field-specific metadata and structured data
- [ ] Implement `generateStaticParams()` for 5-10 priority fields
- [ ] Expand sitemap to include field pages (~160 new URLs)
- [ ] Add cross-linking between broad and field-specific pages
- [ ] GA4 tracking for field pages

**Week 4 目标**:
- [ ] 5-10 field overview pages online
- [ ] ~100 field × country pages
- [ ] ~50 field × city pages
- [ ] Total new URLs: ~160
- [ ] Full internal linking network

**Expected outcomes**:
- 🎯 Rank for long-tail keywords within 1-2 months
- 🎯 Higher conversion rate (15-25% vs 5-10%)
- 🎯 Unique competitive advantage

---

### Phase 4: Guide Pages & Polish (Week 5-6)

**Week 5: Guide Pages**
- [ ] Implement `/guides/how-to-find-postdoc-in-[countrySlug]/page.tsx`
- [ ] Implement `/guides/best-cities-for-[fieldSlug]-research/page.tsx`
- [ ] Write guide content templates
- [ ] Add HowTo schema
- [ ] Create 10-20 top country/field guides

**Week 6: Optimization and Monitoring**
- [ ] Optimize SEO text content
- [ ] Add more internal links
- [ ] Create country/city/field-specific OG images
- [ ] Set up Search Console monitoring dashboard
- [ ] Create GA4 custom reports
- [ ] A/B test CTAs and content length

---

### Phase 5: Backend API Optimization (Optional, Week 7+)

If performance demands arise:

- [ ] Implement `/api/seo/countries` endpoint
- [ ] Implement `/api/seo/country/{slug}` endpoint
- [ ] Implement `/api/seo/cities` endpoint
- [ ] Add Redis caching layer
- [ ] Monitor API performance and cache hit rate

---

## 9. Expected Outcomes & KPIs

### Short-term (1-3 months)

**Indexing**:
- ✅ 500-1000 pages indexed by Google
- ✅ Sitemap submitted and verified
- ✅ No critical SEO errors

**Traffic growth**:
- 🎯 Organic traffic: +50% month-over-month
- 🎯 Top 10 country pages: 100+ visits/month each
- 🎯 Average position: <50 for target keywords

**Conversion metrics**:
- 🎯 SEO → Demo click rate: 15-20%
- 🎯 SEO → Signup rate: 5-10%

### Medium-term (3-6 months)

**Search ranking**:
- 🎯 Target keywords in top 20 positions
- 🎯 Long-tail keywords (e.g., "postdoc positions in Boston") in top 10
- 🎯 Featured snippets for 10+ queries

**Traffic scale**:
- 🎯 Organic traffic: 10,000+ visits/month
- 🎯 Top 50 pages: 80% of organic traffic
- 🎯 Average session duration: 2+ minutes

**Business impact**:
- 🎯 SEO-driven signups: 20-30% of total signups
- 🎯 Demo run engagement: 40%+ from SEO pages

### Long-term (6-12 months)

**SEO authority**:
- 🎯 Domain authority increase
- 🎯 Backlinks from academic institutions
- 🎯 Featured in academic resource lists

**Content expansion**:
- 🎯 1000+ indexed pages
- 🎯 Institution-level pages (top 500 institutions)
- 🎯 Field-specific pages (e.g., "AI research in United States")

**Sustainable growth**:
- 🎯 Organic traffic: 50,000+ visits/month
- 🎯 SEO as primary acquisition channel (50%+ of signups)
- 🎯 Reduced CAC through organic growth

---

## 10. Phase 3 Implementation Details

### Field Selection Criteria

**Priority fields** (launch first):
1. **Brain-Computer Interface (BCI)** - High search volume, emerging field
2. **Neural Modulation (tDCS/TMS)** - Active research area, clear applications
3. **CRISPR Gene Editing** - Hot topic, high public interest
4. **Cancer Immunotherapy** - Major funding area, many institutions
5. **AI in Drug Discovery** - Trending intersection of AI + biomedical

**Secondary fields** (launch after validation):
6. Neurodegenerative Diseases (Alzheimer's, Parkinson's)
7. Stem Cell Research
8. Microbiome Research
9. Precision Medicine
10. Organoid Technology

### Data Preparation

**SEO Project Structure**:
```
Project: "SEO Content" (under super user)
├─ Run: "Brain-Computer Interface (BCI)"
├─ Run: "Neural Modulation (tDCS/TMS)"
├─ Run: "CRISPR Gene Editing"
├─ Run: "Cancer Immunotherapy"
└─ Run: "AI in Drug Discovery"
```

**Run Configuration**:
- Each run queries PubMed for field-specific literature
- Target: 200-500 papers per field (sufficient for geographic distribution)
- Time range: Last 5 years (2020-2025) for current landscape
- Ensure runs are set to `is_public=True` for API access

### URL Structure and Slug Mapping

**Field slugs**:
- `brain-computer-interface` (BCI)
- `neural-modulation` (tDCS/TMS)
- `crispr-gene-editing`
- `cancer-immunotherapy`
- `ai-drug-discovery`

**URL examples**:
- `/research-jobs/brain-computer-interface` - Global BCI distribution
- `/research-jobs/brain-computer-interface/country/united-states` - BCI in USA
- `/research-jobs/brain-computer-interface/city/boston` - BCI in Boston

### Content Strategy

**Field overview page** (800-1000 words):
1. Field introduction (100 words)
2. Why this field matters (150 words)
3. Current trends and applications (200 words)
4. Global distribution summary (150 words)
5. Top countries for this field (200 words)
6. Top cities for this field (150 words)
7. CTA to explore interactive map (50 words)

**Field × Country page** (600-800 words):
1. Field in this country overview (150 words)
2. Leading institutions (200 words)
3. Top cities in this country for this field (150 words)
4. Funding and opportunities (150 words)
5. CTA to drill down by city (50 words)

**Field × City page** (500-700 words):
1. Field in this city overview (150 words)
2. Major institutions and labs (250 words)
3. Key researchers (if available) (150 words)
4. CTA to view detailed map (50 words)

### API Integration

**Data fetching**:
- Reuse existing map aggregation APIs
- Replace demo run ID with field-specific run ID
- Example: `/api/projects/{seo_project_id}/runs/{bci_run_id}/map/world`

**Caching**:
- ISR revalidation: 24 hours (same as Phase 1-2)
- Field data changes less frequently than broad data

### SEO Optimization

**Meta titles**:
- Field overview: "{Field} Research Opportunities | Find Labs & Institutions Globally"
- Field × Country: "{Field} Research in {Country} | Top Institutions & Opportunities"
- Field × City: "{Field} Research in {City} | Leading Labs & Researchers"

**Meta descriptions**:
- Include: field name, location, scholar count, institution count
- Length: 150-160 characters
- CTA: "Explore interactive map"

**Structured data**:
- `ResearchProject` schema for field overview
- `Place` schema for geo-specific pages
- `BreadcrumbList` for navigation
- `FAQPage` for common questions about the field

### Expected Performance

| Metric | Target (3 months) | Target (6 months) |
|--------|------------------|-------------------|
| **Pages indexed** | 80%+ of field pages | 100% of field pages |
| **Avg. position** | Top 20 for ultra long-tail | Top 10 for ultra long-tail |
| **Organic traffic** | 500+ visits/month | 2,000+ visits/month |
| **Conversion rate** | 15-20% | 20-25% |
| **Top ranking keywords** | 20+ in top 10 | 50+ in top 10 |

### Success Metrics

**Before starting Phase 4**, verify:
- [ ] 5+ field overview pages indexed
- [ ] At least 3 field pages ranking in top 20
- [ ] Field pages have 10%+ higher conversion than broad pages
- [ ] No technical SEO errors
- [ ] Positive user engagement metrics (time on page > 2 min)

---

## 11. Competitive Analysis

### Target Keywords Analysis

#### High-volume keywords (high difficulty)
- "research opportunities" (10K+ searches/month) - Difficulty: 🔴 High
- "academic jobs" (50K+ searches/month) - Difficulty: 🔴 Very High
- "postdoc positions" (20K+ searches/month) - Difficulty: 🔴 High

#### Long-tail keywords - Geo only (ScholarMap advantage)
- "postdoc positions in [city]" (100-1K searches/month) - Difficulty: 🟢 Low
- "research opportunities in [country]" (100-1K searches/month) - Difficulty: 🟢 Low
- "academic institutions in [city]" (50-500 searches/month) - Difficulty: 🟢 Low

#### Ultra long-tail keywords - Field × Geo (Phase 3 - HIGHEST VALUE) 🆕
- "BCI research in Boston" (10-100 searches/month) - Difficulty: 🟢 Very Low
- "CRISPR labs in United States" (10-50 searches/month) - Difficulty: 🟢 Very Low
- "neural modulation postdoc California" (5-50 searches/month) - Difficulty: 🟢 Very Low
- "immunotherapy research institutions Boston" (5-30 searches/month) - Difficulty: 🟢 Very Low
- "AI drug discovery researchers UK" (10-50 searches/month) - Difficulty: 🟢 Very Low

**Why Field × Geo keywords are golden** 🏆:
- ✅ **Zero competition**: No existing pages target these combinations
- ✅ **High intent**: Users searching these terms know exactly what they want
- ✅ **Fast ranking**: Can reach top 3 within 1-2 months
- ✅ **High conversion**: 3-5x higher than broad geo pages

**Strategy**:
1. **Phase 1-2 (Done)**: Broad geo pages - Build foundation
2. **Phase 3 (High Priority)**: Field × Geo pages - Capture high-intent traffic ⭐
3. **Phase 4**: Guide pages - Content marketing
4. **Long-term**: Gradually compete for high-volume keywords

---

## 12. Risk Mitigation

### Risk 1: Demo Run data becomes stale

**Impact**: SEO pages show inaccurate data

**Mitigation**:
- Update demo run data quarterly
- Or create public aggregation table (long-term)
- Add "Last updated" timestamp to pages

### Risk 2: Google indexing delay

**Impact**: New pages take weeks to be indexed

**Mitigation**:
- Proactively request indexing in Search Console
- Ensure sitemap is correctly configured
- Add internal links from high-authority pages

### Risk 3: Content quality issues

**Impact**: Low-quality content leads to ranking decline

**Mitigation**:
- Each page has at least 800 words of unique content
- Avoid fully templated content
- Add user-generated signals (demo map views)

### Risk 4: Performance issues

**Impact**: Large sitemap generation causes deployment slowdown or timeout

**Mitigation**:
- Use ISR instead of full SSG
- Batch generate sitemap (if exceeds 10,000 URLs)
- Optimize API calls (concurrency + caching)

---

## 13. Maintenance Checklist

### Weekly Tasks (15 min)
- [ ] Review Search Console errors
- [ ] Check top 10 performing pages
- [ ] Monitor organic traffic trends
- [ ] Review new indexed pages

### Monthly Tasks (1-2 hours)
- [ ] Analyze keyword rankings
- [ ] Review bounce rate and time on page
- [ ] Update underperforming pages
- [ ] Add new guide pages (1-2 per month)
- [ ] Check competitor rankings

### Quarterly Tasks (Half day)
- [ ] Comprehensive SEO audit
- [ ] Update demo run data (if needed)
- [ ] Refresh top cities/institutions
- [ ] Review and update content templates
- [ ] Analyze conversion funnel
- [ ] Plan next quarter's SEO initiatives

---

## 14. Success Criteria for Phase 1

Before starting Phase 2, ensure:

- ✅ 100+ country pages successfully deployed
- ✅ All pages pass Lighthouse SEO audit (score > 90)
- ✅ Sitemap correctly generated and accessible
- ✅ Search Console has no critical errors
- ✅ GA events correctly tracked
- ✅ At least 10 pages indexed by Google (check after 1 week)

---

**Document Version**: 3.0 (Added Phase 3: Field-Specific Pages)  
**Last Updated**: 2026-01-22  
**Maintainer**: ScholarMap Development Team  
**Next Review**: 2026-04-22 (quarterly update)

---

## Changelog

**v3.0 (2026-01-22)**:
- ✨ Added Phase 3: Field-Specific Pages strategy
- 🎯 Added ultra long-tail keywords (Field × Geography)
- 📊 Updated URL structure to include field-specific routes
- 🔗 Enhanced internal linking strategy
- 📈 Updated sitemap scale projections
- 🏆 Highlighted competitive advantages of field segmentation

**v2.1 (2026-01-22)**:
- 📝 Simplified document (removed code examples)
- ✅ Marked Phase 1 and Phase 2 as completed

**v2.0 (2026-01-17)**:
- 📋 Initial comprehensive SEO plan
- 🗺️ Phase 1: Country pages
- 🏙️ Phase 2: City pages
