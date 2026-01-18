# ScholarMap - Content-Driven SEO Expansion Plan (Search-Intent Pages)

This plan updates the search-intent SEO work to match the current ScholarMap codebase.

- Frontend: Next.js App Router (Next 15) in `frontend/src/app`
- Backend: FastAPI in `backend/app/main.py`
- Database: PostgreSQL (hosted on Render)
- Deployment: Render (Frontend + Backend + Database)
- Current SEO: metadata + structured data + dynamic sitemap + robots already implemented

---

## 0. Code Reality Snapshot (Current Baseline)

### Public pages that exist today
- `/` (landing page with structured data)
- `/auth/login`
- `/auth/register`
- `/projects` (app landing, requires auth)
- `/projects/[projectId]` (project detail, requires auth)
- `/projects/[projectId]/runs/[runId]` (core map UI, auth configurable)
- **Demo run**: `/projects/6af7ac1b6254/runs/53e099cdb74e` (可公开访问，通过 `share_run_auth_check_enabled=False` 配置)

**Note**: `share_run_auth_check_enabled` 在 `config.py` 中设置为 `False`，这意味着所有 run 页面和数据 API 当前都是**公开可访问**的（无需登录）。这是 SEO 的一个重要基础。

### Existing SEO infrastructure (already in code)
- **Metadata and OG tags**: `frontend/src/app/layout.tsx`
  - Title template: "%s | ScholarMap"
  - Description, keywords, Open Graph, Twitter Cards
  - Google verification: `c1b2e25f626eceac`
  - Metadata base URL: `https://scholarmap-frontend.onrender.com`
- **Structured data**: `frontend/src/components/StructuredData.tsx` 
  - Used on landing page (`frontend/src/app/page.tsx`)
  - Includes: Organization, WebApplication, SoftwareApplication, FAQ, HowTo, BreadcrumbList schemas
- **Robots.txt**: `frontend/src/app/robots.ts`
  - Allows all user agents
  - Disallows: `/api/`, `/projects/*/runs/*/edit`
- **Dynamic sitemap**: `frontend/src/app/sitemap.ts`
  - Includes: landing page, projects page, demo run, auth pages
  - Auto-updates `lastModified` timestamps
- **Google Analytics**: Configured with ID `G-2123ZJ1Y7B` in `layout.tsx`
- **Canonical URL**: `frontend/src/components/CanonicalURL.tsx` auto-generates canonical URLs

### Existing geo aggregation APIs (already auth-configurable)

**Phase 2B Map Visualization APIs** (Lines 1081-1306 in `backend/app/main.py`):

1. **World Map** - `GET /api/projects/{projectId}/runs/{runId}/map/world`
   - Returns: `[{country, scholar_count, paper_count, institution_count, latitude, longitude}, ...]`
   - Query params: `min_confidence` (high/medium/low/none)
   
2. **Country Map** - `GET /api/projects/{projectId}/runs/{runId}/map/country/{country}`
   - Returns: `[{city, scholar_count, institution_count, latitude, longitude}, ...]`
   - Query params: `min_confidence`
   
3. **City Map** - `GET /api/projects/{projectId}/runs/{runId}/map/city/{country}/{city}`
   - Returns: `[{institution, scholar_count}, ...]`
   - Query params: `min_confidence`
   
4. **Institution Scholars** - `GET /api/projects/{projectId}/runs/{runId}/map/institution`
   - Returns: `{scholars: [{scholar_name, paper_count}, ...]}`
   - Query params: `institution`, `country`, `city` (required), `min_confidence`

**重要**: 这些 APIs 通过 `AuthMiddleware` 保护，但 `share_run_auth_check_enabled=False` 意味着它们当前对公开 runs 可访问。

### Database models (完整的 Phase 2 数据层)

**核心表** (`backend/app/db/models.py`):

1. **Authorship** - 作者-论文关联 + 地理信息
   - Fields: `pmid`, `author_name_raw`, `country`, `city`, `institution`, `affiliation_confidence`
   - Indexes: `(pmid, author_order)`, `(country, city)`
   - 包含从 affiliation 中提取的地理数据
   
2. **Paper** - 论文元数据
   - Fields: `pmid`, `title`, `year`, `doi`, `xml_stored`
   
3. **RunPaper** - Run 和 Paper 的多对多关联
   - Fields: `run_id`, `pmid`
   - Unique index on `(run_id, pmid)`
   
4. **AffiliationCache** - Affiliation 提取缓存
   - Primary key: `affiliation_raw` (text)
   - Cached fields: `country`, `city`, `institution`, `confidence`
   
5. **GeocodingCache** - 地理编码缓存
   - Primary key: `location_key` (e.g., "United States|Boston")
   - Fields: `latitude`, `longitude`, `affiliations` (JSONB array)
   
6. **InstitutionGeo** - 机构地理信息 (QS Top 500 + 主要研究机构)
   - Fields: `primary_name`, `normalized_name`, `aliases` (JSONB), `country`, `city`, `qs_rank`, `ror_id`
   - Sources: 'qs', 'ror', 'manual', 'auto_added'

这些表已经包含了构建 SEO 页面所需的所有数据，无需额外的数据聚合工作。

---

## 1. Why Search-Intent Pages Still Matter (Based on Current Code)

### Current SEO limitations

虽然 `share_run_auth_check_enabled=False` 允许公开访问 run 页面，但存在以下 SEO 局限性：

1. **Run 页面是动态交互式界面**，大部分内容由 JavaScript 渲染，搜索引擎爬虫难以索引
2. **Run URL 不具备语义性**：`/projects/6af7ac1b6254/runs/53e099cdb74e` 对搜索引擎和用户都不友好
3. **缺乏静态文本内容**：Run 页面主要是地图可视化，缺少搜索引擎需要的描述性文本
4. **没有针对搜索意图优化**：用户搜索 "postdoc positions in Boston" 时，不会找到当前的 run 页面

### Search-intent pages 的价值

通过创建专门的 SEO landing pages：

1. **服务端渲染的 HTML 内容**：确保搜索引擎可以完整索引
2. **语义化 URL**：`/research-jobs/country/united-states`, `/research-jobs/city/boston`
3. **丰富的描述性文本**：800-1500 字的静态内容 + 动态数据
4. **针对长尾关键词优化**：匹配真实的用户搜索意图
5. **内部链接网络**：国家 → 城市 → 机构 → Demo run 的自然流量导向

**关键优势**：SEO pages 作为"前台"吸引有机流量，Demo run 作为"展厅"展示产品能力，形成完整的转化漏斗。

---

## 2. Search-Intent Page Types (Aligned to Current Routes)

### 2.1 Geo Landing Pages (Highest ROI)

**Recommended URLs**
- `/research-jobs/country/[countrySlug]`
- `/research-jobs/city/[citySlug]`
- (optional) `/research-jobs/institution/[institutionSlug]`

**Each page should include**
- Server-rendered text (800-1500 words total, template-driven)
- Quantitative summaries (from aggregation APIs):
  - Scholar count
  - Institution count
  - Top cities or institutions
- CTA to open the **public demo run** for interactive map exploration
- Structured data: `Place`, `ItemList`, `BreadcrumbList`

### 2.2 Guide / Question-Based Pages

**URLs**
- `/guides/how-to-find-postdoc-in-[countrySlug]`
- `/guides/best-cities-for-[fieldSlug]-research`

These pages can be static text that link to the geo pages and the demo run.

---

## 3. Backend Data Strategy (Code-Aligned Implementation)

### ✅ 推荐方案：基于 Demo Run 的 SEO API 包装层

由于现有的 map aggregation APIs 已经非常完善，我们采用**轻量级 API 包装**策略：

#### Phase 1: 简化版（最小化实现）

**核心思路**：直接在 SEO 页面的 `getServerSideProps` 或 `generateStaticParams` 中调用现有的 map APIs

**优势**：
- ✅ 零后端开发成本
- ✅ 直接复用现有的 `PostgresMapAggregator` 逻辑
- ✅ 数据始终是最新的（来自 demo run）

**实现**：
```typescript
// frontend/src/app/research-jobs/country/[countrySlug]/page.tsx
export async function generateMetadata({ params }) {
  const countryName = slugToCountryName(params.countrySlug);
  const data = await fetch(
    `${API_BASE}/api/projects/6af7ac1b6254/runs/53e099cdb74e/map/country/${countryName}`
  );
  return { title: `Research Opportunities in ${countryName}` };
}
```

#### Phase 2: SEO 专用 API 端点（可选，长期优化）

如果需要更好的控制和缓存，可以添加专用的 SEO API：

**新增端点** (in `backend/app/main.py`):

```python
@app.get("/api/seo/countries")
async def seo_list_countries() -> dict:
    """
    Get list of all countries with research data (for SEO sitemap generation).
    Uses demo run as data source.
    Returns: [{slug, name, scholar_count}, ...]
    """
    # Call existing world map API internally
    # Add slug generation logic
    # Add caching layer (Redis or in-memory)
    pass

@app.get("/api/seo/country/{country_slug}")
async def seo_get_country(country_slug: str) -> dict:
    """
    Get country detail for SEO page (slug-based, no auth required).
    Returns: {country, cities: [...], stats: {...}, top_institutions: [...]}
    """
    pass

@app.get("/api/seo/cities")
async def seo_list_cities(country_slug: str | None = None) -> dict:
    """
    Get list of cities (for sitemap).
    Returns: [{slug, name, country_slug, scholar_count}, ...]
    """
    pass
```

**数据流**：
```
SEO API → PostgresMapAggregator (existing) → Authorship table (via demo run_id)
```

**缓存策略**：
- Redis 缓存（TTL: 24 hours）
- 或使用 FastAPI's `lru_cache` decorator
- Demo run 数据相对稳定，无需实时更新

#### Phase 3: 跨 Run 聚合（未来扩展，暂时不做）

如果未来要展示所有公开 runs 的聚合数据：

**新增表**：
```sql
CREATE TABLE public_run_aggregates (
  country VARCHAR(255),
  city VARCHAR(255),
  institution VARCHAR(500),
  scholar_count INT,
  paper_count INT,
  last_updated TIMESTAMP,
  PRIMARY KEY (country, city, institution)
);
```

**定时任务**：每天运行一次，聚合所有公开 runs 的数据到这个表

**当前不推荐**：因为目前只有一个 demo run，等有多个公开 runs 后再考虑

---

### 数据源对比

| 方案 | 开发成本 | 数据新鲜度 | SEO 友好度 | 推荐度 |
|------|---------|-----------|-----------|--------|
| **Phase 1: 直接调用现有 APIs** | 极低 | 实时 | 高 | ⭐⭐⭐⭐⭐ |
| **Phase 2: SEO 专用 API + 缓存** | 低 | 近实时 (24h) | 极高 | ⭐⭐⭐⭐ |
| **Phase 3: 跨 Run 聚合表** | 高 | 每日更新 | 极高 | ⭐⭐ (未来) |

**建议**：从 Phase 1 开始，根据流量和性能需求逐步演进到 Phase 2。

---

## 4. Frontend Implementation (App Router Structure)

### 新增路由结构

在 `frontend/src/app` 下添加：

```
frontend/src/app/
  research-jobs/
    page.tsx                           # Landing page: 浏览所有国家
    country/
      [countrySlug]/
        page.tsx                       # Country detail page
        layout.tsx                     # (可选) 共享 layout
    city/
      [citySlug]/
        page.tsx                       # City detail page
    institution/
      [institutionSlug]/
        page.tsx                       # (可选) Institution detail page
  guides/
    page.tsx                           # Guides landing page
    how-to-find-postdoc-in-[countrySlug]/
      page.tsx                         # Dynamic guide pages
```

### 核心页面实现

#### 1. Country Page (`research-jobs/country/[countrySlug]/page.tsx`)

```typescript
import { Metadata } from 'next';

const DEMO_PROJECT_ID = '6af7ac1b6254';
const DEMO_RUN_ID = '53e099cdb74e';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://scholarmap-backend.onrender.com';

// Static generation for top countries
export async function generateStaticParams() {
  const response = await fetch(
    `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/world`
  );
  const { data } = await response.json();
  
  // Top 100 countries by scholar count
  const topCountries = data
    .sort((a, b) => b.scholar_count - a.scholar_count)
    .slice(0, 100)
    .map(c => ({ countrySlug: countryToSlug(c.country) }));
  
  return topCountries;
}

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const countryName = slugToCountryName(params.countrySlug);
  const data = await fetchCountryData(countryName);
  
  return {
    title: `${countryName} Research Opportunities - ${data.scholar_count} Scholars`,
    description: `Explore ${data.scholar_count} scholars across ${data.city_count} cities in ${countryName}. Find postdoc positions, research collaborators, and academic institutions.`,
    keywords: [
      `research opportunities ${countryName}`,
      `postdoc ${countryName}`,
      `academic jobs ${countryName}`,
      `PhD positions ${countryName}`
    ],
    openGraph: {
      title: `Research Map: ${countryName}`,
      description: `${data.scholar_count} active researchers in ${countryName}`,
      images: [`/og-images/country-${params.countrySlug}.png`],
    },
  };
}

// Page component
export default async function CountryPage({ params }) {
  const countryName = slugToCountryName(params.countrySlug);
  const countryData = await fetchCountryData(countryName);
  const cities = countryData.data;
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <a href="/">Home</a> → 
        <a href="/research-jobs">Research Jobs</a> → 
        <span>{countryName}</span>
      </nav>
      
      {/* H1 with keyword */}
      <h1>Research Opportunities in {countryName}</h1>
      
      {/* Stats summary */}
      <div className="stats-grid">
        <StatCard title="Scholars" value={countryData.scholar_count} />
        <StatCard title="Cities" value={cities.length} />
        <StatCard title="Institutions" value={countryData.institution_count} />
      </div>
      
      {/* SEO text content (800-1500 words) */}
      <section className="prose max-w-none">
        <h2>About Research in {countryName}</h2>
        <p>
          {countryName} is home to {countryData.scholar_count} active researchers
          across {cities.length} major cities. Whether you're looking for postdoctoral
          positions, research collaborations, or academic job opportunities, this page
          provides comprehensive coverage of the research landscape in {countryName}.
        </p>
        
        {/* More SEO-friendly content */}
        <h3>Top Research Cities in {countryName}</h3>
        <p>
          The most active research hubs include {cities.slice(0, 5).map(c => c.city).join(', ')}.
          Each city offers unique opportunities in various research fields...
        </p>
        
        {/* CTA to interactive map */}
        <div className="cta-box">
          <h3>Explore the Interactive Research Map</h3>
          <p>
            View real-time distribution of scholars, institutions, and research papers
            on our interactive map.
          </p>
          <a 
            href={`/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}?country=${countryName}`}
            className="btn-primary"
          >
            Open Interactive Map for {countryName} →
          </a>
        </div>
      </section>
      
      {/* Cities list with internal links */}
      <section>
        <h2>Research Cities in {countryName}</h2>
        <div className="grid grid-cols-3 gap-4">
          {cities.map(city => (
            <a 
              href={`/research-jobs/city/${cityToSlug(city.city)}`}
              className="city-card"
            >
              <h3>{city.city}</h3>
              <p>{city.scholar_count} scholars</p>
              <p>{city.institution_count} institutions</p>
            </a>
          ))}
        </div>
      </section>
      
      {/* Related guides */}
      <section>
        <h2>Helpful Guides</h2>
        <ul>
          <li>
            <a href={`/guides/how-to-find-postdoc-in-${params.countrySlug}`}>
              How to Find Postdoc Positions in {countryName}
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

// Helper functions
async function fetchCountryData(countryName: string) {
  const response = await fetch(
    `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/country/${countryName}`,
    { next: { revalidate: 86400 } } // Cache for 24 hours
  );
  return response.json();
}

function countryToSlug(country: string): string {
  return country.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function slugToCountryName(slug: string): string {
  // Maintain a mapping of slugs to proper country names
  const slugMap = {
    'united-states': 'United States',
    'united-kingdom': 'United Kingdom',
    // ... more mappings
  };
  return slugMap[slug] || slug.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}
```

#### 2. City Page (`research-jobs/city/[citySlug]/page.tsx`)

类似结构，但展示：
- 城市简介
- 该城市的所有研究机构
- 学者统计
- CTA 到 demo run（预设 city filter）

#### 3. Research Jobs Landing Page (`research-jobs/page.tsx`)

```typescript
export const metadata = {
  title: 'Global Research Opportunities by Country',
  description: 'Browse research jobs, postdoc positions, and academic collaborations across 150+ countries.',
};

export default async function ResearchJobsLanding() {
  // Fetch all countries from world map API
  const worldData = await fetchWorldMap();
  
  return (
    <div>
      <h1>Discover Research Opportunities Worldwide</h1>
      <p>
        Explore research activity in {worldData.length} countries. Find postdoc positions,
        research collaborators, and academic job opportunities.
      </p>
      
      {/* Countries grid with internal links */}
      <div className="countries-grid">
        {worldData.map(country => (
          <a href={`/research-jobs/country/${countryToSlug(country.country)}`}>
            <h3>{country.country}</h3>
            <p>{country.scholar_count} scholars</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

### 关键技术要点

1. **Static Site Generation (SSG)**：使用 `generateStaticParams()` 预渲染 top 100 国家
2. **Incremental Static Regeneration (ISR)**：使用 `revalidate: 86400` (24h) 定期更新
3. **SEO-friendly HTML**：所有内容服务端渲染，确保爬虫可索引
4. **Internal linking**：国家 → 城市 → 机构 → demo run 的链接网络
5. **Structured data**：每个页面添加 Place 和 BreadcrumbList schema

---

## 5. Sitemap Expansion (Dynamic Generation)

### Current sitemap structure (`frontend/src/app/sitemap.ts`)

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://scholarmap-frontend.onrender.com';
  const currentDate = new Date().toISOString();

  return [
    { url: baseUrl, lastModified: currentDate, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/projects`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/projects/6af7ac1b6254/runs/53e099cdb74e`, lastModified: currentDate, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/auth/login`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/auth/register`, lastModified: currentDate, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
```

### 扩展后的 sitemap (动态生成 SEO pages)

```typescript
import { MetadataRoute } from 'next';

const DEMO_PROJECT_ID = '6af7ac1b6254';
const DEMO_RUN_ID = '53e099cdb74e';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://scholarmap-backend.onrender.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://scholarmap-frontend.onrender.com';
  const currentDate = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/research-jobs`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/projects/6af7ac1b6254/runs/53e099cdb74e`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Consider removing auth pages if you don't want them indexed
    // {
    //   url: `${baseUrl}/auth/login`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly',
    //   priority: 0.3,
    // },
  ];

  // Fetch all countries from demo run
  const worldResponse = await fetch(
    `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/world`,
    { next: { revalidate: 86400 } }
  );
  const { data: countries } = await worldResponse.json();

  // Country pages (all countries)
  const countryPages: MetadataRoute.Sitemap = countries.map((country) => ({
    url: `${baseUrl}/research-jobs/country/${countryToSlug(country.country)}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // City pages (top 500 cities by scholar count)
  const cityPromises = countries.slice(0, 50).map(async (country) => {
    try {
      const cityResponse = await fetch(
        `${API_BASE}/api/projects/${DEMO_PROJECT_ID}/runs/${DEMO_RUN_ID}/map/country/${country.country}`,
        { next: { revalidate: 86400 } }
      );
      const { data: cities } = await cityResponse.json();
      return cities.map((city) => ({
        url: `${baseUrl}/research-jobs/city/${cityToSlug(city.city)}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    } catch (error) {
      console.error(`Failed to fetch cities for ${country.country}:`, error);
      return [];
    }
  });

  const cityPagesNested = await Promise.all(cityPromises);
  const cityPages: MetadataRoute.Sitemap = cityPagesNested.flat();

  // Guide pages (top 20 countries)
  const guidePages: MetadataRoute.Sitemap = countries
    .slice(0, 20)
    .map((country) => ({
      url: `${baseUrl}/guides/how-to-find-postdoc-in-${countryToSlug(country.country)}`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));

  return [...staticPages, ...countryPages, ...cityPages, ...guidePages];
}

function countryToSlug(country: string): string {
  return country.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
```

### Sitemap 预期规模

- Static pages: ~5 URLs
- Country pages: ~150-200 URLs (所有有数据的国家)
- City pages: ~500-1000 URLs (top cities)
- Guide pages: ~20 URLs
- **Total**: ~675-1225 URLs

**注意**: Google 每个 sitemap 最多支持 50,000 URLs，当前规模完全在范围内。

### Robots.txt 更新（可选）

当前 robots.txt 已经允许所有爬虫访问。如果要优化：

```typescript
// frontend/src/app/robots.ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/research-jobs/',
        '/guides/',
        '/projects/6af7ac1b6254/runs/53e099cdb74e',
      ],
      disallow: [
        '/api/',
        '/projects/*/runs/*/edit',
        '/auth/',  // 可选：不索引登录注册页
      ],
    },
    sitemap: 'https://scholarmap-frontend.onrender.com/sitemap.xml',
  };
}
```

---

## 6. Internal Linking Strategy (SEO 链接网络)

### 链接流向图

```
Landing Page (/)
    ↓
Research Jobs Landing (/research-jobs)
    ↓
Country Pages (/research-jobs/country/[slug])
    ↓
City Pages (/research-jobs/city/[slug])
    ↓
Demo Run (Interactive Map) (/projects/.../runs/...)
    ↓
Sign Up / Registration
```

### 具体链接策略

#### 1. Landing Page → Research Jobs
在首页 (`frontend/src/app/page.tsx`) 添加：
```typescript
<section className="explore-research-section">
  <h2>Explore Research by Location</h2>
  <a href="/research-jobs">Browse by Country →</a>
</section>
```

#### 2. Research Jobs Landing → Country Pages
```typescript
// /research-jobs/page.tsx
<div className="countries-grid">
  {countries.map(c => (
    <a href={`/research-jobs/country/${countryToSlug(c.country)}`}>
      {c.country} ({c.scholar_count} scholars)
    </a>
  ))}
</div>
```

#### 3. Country Page → City Pages + Demo Run
```typescript
// /research-jobs/country/[slug]/page.tsx

// Link to cities
<div className="cities-section">
  <h2>Cities in {countryName}</h2>
  {cities.map(city => (
    <a href={`/research-jobs/city/${cityToSlug(city.city)}`}>
      {city.city}
    </a>
  ))}
</div>

// CTA to interactive map
<a 
  href={`/projects/6af7ac1b6254/runs/53e099cdb74e?country=${countryName}`}
  className="cta-button"
>
  Explore Interactive Map for {countryName} →
</a>
```

#### 4. City Page → Country Page + Demo Run
```typescript
// Breadcrumb links
<nav>
  <a href="/research-jobs">All Countries</a> → 
  <a href={`/research-jobs/country/${countrySlug}`}>{countryName}</a> → 
  {cityName}
</nav>

// CTA to demo run with city preset
<a href={`/projects/.../runs/...?country=${country}&city=${city}`}>
  View {cityName} on Interactive Map →
</a>
```

#### 5. Guide Pages → Geo Pages + Demo Run
```typescript
// /guides/how-to-find-postdoc-in-[country]/page.tsx
<p>
  Explore <a href={`/research-jobs/country/${countrySlug}`}>research opportunities in {country}</a>
  or <a href={`/projects/.../runs/...`}>view the interactive map</a>.
</p>
```

### SEO 价值

- **爬虫可发现性**：所有 SEO 页面通过 HTML links 连接，爬虫可以轻松发现所有页面
- **Link equity 传递**：首页 → Research Jobs → Countries → Cities 的层级结构传递 PageRank
- **用户导航**：自然的浏览路径，降低跳出率
- **转化漏斗**：信息页面 → 交互式工具 → 注册

---

## 7. Analytics and Measurement (Google Analytics 4)

### Current GA Setup
- **GA ID**: `G-2123ZJ1Y7B`
- **Location**: `frontend/src/app/layout.tsx`
- **Type**: Google Analytics 4 (GA4)

### 新增事件跟踪

在 SEO 页面添加自定义事件：

```typescript
// frontend/src/lib/analytics.ts
export function trackSEOPageView(pageName: string, location: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_page_view', {
      page_name: pageName,
      location: location,
    });
  }
}

export function trackDemoMapClick(source: string, country?: string, city?: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_demo_click', {
      source: source,  // 'country_page', 'city_page', 'guide_page'
      country: country,
      city: city,
    });
  }
}

export function trackSignupStart(source: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_start', {
      source: source,
    });
  }
}

export function trackSignupComplete(source: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'seo_to_signup_complete', {
      source: source,
    });
  }
}
```

### 在页面中使用

```typescript
// /research-jobs/country/[slug]/page.tsx
'use client';

import { useEffect } from 'react';
import { trackSEOPageView, trackDemoMapClick } from '@/lib/analytics';

export default function CountryPage({ params }) {
  useEffect(() => {
    trackSEOPageView('country_page', slugToCountryName(params.countrySlug));
  }, [params.countrySlug]);

  return (
    <div>
      {/* ... */}
      <a 
        href={`/projects/.../runs/...`}
        onClick={() => trackDemoMapClick('country_page', countryName)}
      >
        Explore Interactive Map →
      </a>
    </div>
  );
}
```

### GA4 关键指标

在 Google Analytics 中监控：

1. **流量指标**：
   - SEO pages 的 pageviews
   - Organic search traffic 增长
   - Top landing pages (by country/city)

2. **转化指标**：
   - `seo_to_demo_click` 转化率
   - `seo_to_signup_start` 转化率
   - `seo_to_signup_complete` 转化率

3. **用户行为**：
   - Bounce rate on SEO pages
   - Time on page
   - Pages per session
   - Navigation flow (Country → City → Demo)

4. **SEO 效果**：
   - Organic search queries (from Search Console)
   - Landing page performance by location
   - Top referring keywords

### Search Console 集成

结合 Google Search Console (已验证) 监控：

- **Search performance**: 展示次数、点击次数、CTR、平均排名
- **Top queries**: 用户搜索的关键词
- **Top pages**: 哪些 SEO 页面获得最多流量
- **Index coverage**: 确保所有 SEO 页面被索引
- **Core Web Vitals**: 页面性能指标

---

## 8. Execution Plan (分阶段实施)

### Phase 1: MVP (Week 1) - Country Pages

**目标**：上线核心的国家级 SEO 页面

**Day 1-2: 基础设施**
- [ ] 创建 `/research-jobs` 路由结构
- [ ] 实现 slug 转换工具函数 (`countryToSlug`, `slugToCountryName`)
- [ ] 创建 `fetchCountryData` 等 API 调用函数
- [ ] 设置 ISR 缓存策略 (`revalidate: 86400`)

**Day 3-4: Country Landing Page**
- [ ] 实现 `/research-jobs/page.tsx` (所有国家列表)
- [ ] 添加 metadata 和 structured data
- [ ] 实现国家网格展示
- [ ] 添加搜索和排序功能

**Day 5-7: Country Detail Pages**
- [ ] 实现 `/research-jobs/country/[countrySlug]/page.tsx`
- [ ] 实现 `generateStaticParams()` (top 100 countries)
- [ ] 实现 `generateMetadata()` (动态 title/description)
- [ ] 添加 SEO 文本内容模板 (800-1500 words)
- [ ] 添加城市列表和 CTA to demo run
- [ ] 添加 Place schema 和 BreadcrumbList schema

**Week 1 结束目标**:
- ✅ 100+ country pages 上线
- ✅ 动态 sitemap 生成
- ✅ GA 事件跟踪

---

### Phase 2: City Pages (Week 2)

**Day 8-10: City Pages**
- [ ] 实现 `/research-jobs/city/[citySlug]/page.tsx`
- [ ] 实现 `generateStaticParams()` (top 500 cities)
- [ ] 添加机构列表
- [ ] 添加 city-level metadata 和 schema

**Day 11-12: Sitemap 扩展**
- [ ] 在 `sitemap.ts` 中添加 city pages
- [ ] 优化 sitemap 生成性能（并发请求）

**Day 13-14: 测试和优化**
- [ ] 测试所有页面的 SSR 输出
- [ ] 验证 metadata 和 structured data
- [ ] 运行 Lighthouse 审计
- [ ] 修复性能问题

**Week 2 结束目标**:
- ✅ 500+ city pages 上线
- ✅ 完整的 sitemap (country + city)
- ✅ 性能优化完成

---

### Phase 3: Guide Pages & Polish (Week 3-4)

**Week 3: Guide Pages**
- [ ] 实现 `/guides/how-to-find-postdoc-in-[countrySlug]/page.tsx`
- [ ] 编写 guide 内容模板
- [ ] 添加 HowTo schema
- [ ] 创建 10-20 个 top country guides

**Week 4: 优化和监控**
- [ ] 优化 SEO 文本内容
- [ ] 添加更多 internal links
- [ ] 创建 OG 图片（country/city specific）
- [ ] 设置 Search Console 监控
- [ ] 创建 GA4 dashboard

---

### Phase 4: 后端 API 优化（可选，Week 5+）

如果性能需求，可以添加专用 SEO APIs：

- [ ] 实现 `/api/seo/countries` endpoint
- [ ] 实现 `/api/seo/country/{slug}` endpoint
- [ ] 实现 `/api/seo/cities` endpoint
- [ ] 添加 Redis 缓存层
- [ ] 监控 API 性能和缓存命中率

---

## 9. Technical Considerations (技术注意事项)

### 1. Slug Mapping 策略

**问题**：国家/城市名称可能包含特殊字符、空格、Unicode 字符

**解决方案**：维护一个 slug mapping 文件

```typescript
// frontend/src/lib/geoSlugs.ts
export const COUNTRY_SLUG_MAP: Record<string, string> = {
  'united-states': 'United States',
  'united-kingdom': 'United Kingdom',
  'south-korea': 'South Korea',
  'cote-divoire': "Côte d'Ivoire",
  // ... more mappings
};

export const CITY_SLUG_MAP: Record<string, string> = {
  'new-york': 'New York',
  'sao-paulo': 'São Paulo',
  // ... more mappings
};

export function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .normalize('NFD')  // Decompose unicode characters
    .replace(/[\u0300-\u036f]/g, '')  // Remove diacritics
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function slugToCountryName(slug: string): string {
  return COUNTRY_SLUG_MAP[slug] || toTitleCase(slug.replace(/-/g, ' '));
}
```

### 2. Content Generation Strategy

**Static template approach**：

```typescript
// frontend/src/lib/seoContent.ts
export function generateCountryContent(country: string, data: CountryData): string {
  return `
    ${country} is a leading hub for academic research, with ${data.scholar_count} active 
    researchers contributing to various fields. The research community in ${country} spans 
    ${data.city_count} major cities, including ${data.top_cities.slice(0, 5).join(', ')}.
    
    Whether you're looking for postdoctoral positions, research collaborations, or academic 
    job opportunities, ${country} offers diverse options across ${data.institution_count} 
    institutions...
  `;
}
```

**Future enhancement**：使用 LLM 生成更自然的内容（但需要注意成本和质量控制）

### 3. Performance Optimization

- **ISR (Incremental Static Regeneration)**: 24 hour revalidation
- **Image optimization**: 使用 Next.js `<Image>` component
- **Code splitting**: 动态 import 非关键组件
- **CDN caching**: Render 自动提供，确保设置正确的 `Cache-Control` headers

### 4. Monitoring and Maintenance

**每日检查**：
- Search Console errors
- 404 pages
- Server errors

**每周检查**：
- Top performing pages
- Organic search traffic trends
- Bounce rate analysis

**每月更新**：
- Refresh demo run data (if stale)
- Update top cities list
- Add new guide pages

---

## 10. Expected Outcomes & KPIs

### Short-term (1-3 months)

**索引效果**：
- ✅ 500-1000 pages indexed by Google
- ✅ Sitemap submitted and verified
- ✅ No critical SEO errors

**流量增长**：
- 🎯 Organic traffic: +50% month-over-month
- 🎯 Top 10 country pages: 100+ visits/month each
- 🎯 Average position: <50 for target keywords

**转化指标**：
- 🎯 SEO → Demo click rate: 15-20%
- 🎯 SEO → Signup rate: 5-10%

### Medium-term (3-6 months)

**搜索排名**：
- 🎯 Target keywords in top 20 positions
- 🎯 Long-tail keywords (e.g., "postdoc positions in Boston") in top 10
- 🎯 Featured snippets for 10+ queries

**流量规模**：
- 🎯 Organic traffic: 10,000+ visits/month
- 🎯 Top 50 pages: 80% of organic traffic
- 🎯 Average session duration: 2+ minutes

**业务影响**：
- 🎯 SEO-driven signups: 20-30% of total signups
- 🎯 Demo run engagement: 40%+ from SEO pages
- 🎯 Brand awareness: ranking for "research mapping" keywords

### Long-term (6-12 months)

**SEO 权威性**：
- 🎯 Domain authority increase
- 🎯 Backlinks from academic institutions
- 🎯 Featured in academic resource lists

**内容扩展**：
- 🎯 1000+ indexed pages
- 🎯 Institution-level pages (top 500 institutions)
- 🎯 Field-specific pages (e.g., "AI research in United States")

**可持续增长**：
- 🎯 Organic traffic: 50,000+ visits/month
- 🎯 SEO as primary acquisition channel (50%+ of signups)
- 🎯 Reduced CAC through organic growth

---

## 11. Risk Mitigation

### Risk 1: Demo Run 数据过时

**影响**：SEO 页面显示的数据不再准确

**缓解措施**：
- 定期更新 demo run 数据（每季度）
- 或创建 public aggregation table（长期方案）
- 在页面添加 "Last updated" 时间戳

### Risk 2: Google 索引延迟

**影响**：新页面上线后几周才被索引

**缓解措施**：
- 主动在 Search Console 请求索引
- 确保 sitemap 正确配置
- 添加 internal links from high-authority pages (landing page)

### Risk 3: Content 质量问题

**影响**：Low-quality content 导致排名下降

**缓解措施**：
- 每个页面至少 800 words 独特内容
- 避免完全模板化的内容
- 添加 user-generated signals (demo map views)

### Risk 4: 性能问题

**影响**：Large sitemap 生成导致部署慢或超时

**缓解措施**：
- 使用 ISR 而非完全 SSG
- 分批生成 sitemap（如果超过 10,000 URLs）
- 优化 API 调用（并发 + 缓存）

---

## 12. Next Steps

### Immediate Actions (This Week)

1. **Review and approve this plan**
2. **Set up development environment**
   - Create feature branch: `feature/seo-pages`
   - Set up local testing
3. **Begin Phase 1 implementation**
   - Start with `/research-jobs` landing page
   - Implement slug utilities

### Decision Points

需要确认的技术决策：

- [ ] 是否需要后端 SEO APIs，还是直接调用现有 map APIs？
  - **建议**：Phase 1 直接调用，Phase 4 可选优化
- [ ] City pages 的数量限制？
  - **建议**：Top 500 cities（按 scholar_count 排序）
- [ ] 是否添加 institution-level pages？
  - **建议**：Phase 5（长期规划）
- [ ] Auth pages (`/auth/login`, `/auth/register`) 是否保留在 sitemap？
  - **建议**：移除，降低优先级

### Success Criteria for Phase 1

在开始 Phase 2 之前，确保：

- ✅ 100+ country pages 成功部署
- ✅ 所有页面通过 Lighthouse SEO audit (score > 90)
- ✅ Sitemap 正确生成并可访问
- ✅ Search Console 无 critical errors
- ✅ GA 事件正确跟踪
- ✅ 至少 10 个页面被 Google 索引（1 week 后检查）

---

## 13. Appendix: Useful Resources

### SEO Tools
- **Google Search Console**: https://search.google.com/search-console
- **Google PageSpeed Insights**: https://pagespeed.web.dev/
- **Rich Results Test**: https://search.google.com/test/rich-results
- **Schema Validator**: https://validator.schema.org/

### Documentation
- **Next.js Metadata API**: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- **Next.js Sitemap**: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- **Schema.org Place**: https://schema.org/Place
- **Schema.org BreadcrumbList**: https://schema.org/BreadcrumbList

### Inspiration
- **Academic job sites**: 
  - HigherEdJobs.com
  - AcademicPositions.com
  - ResearchGate Jobs
- **Location-based SEO**:
  - Numbeo.com (city data)
  - Nomad List (digital nomad rankings)

---

## 14. Database Query Optimization (数据库层面优化)

### Current Database Indexes

根据 `backend/app/db/models.py`，已有的索引：

```python
# Authorship table
Index("idx_authorship_pmid_order", "pmid", "author_order")
Index("idx_authorship_country_city", "country", "city")

# RunPaper table  
Index("idx_run_papers_unique", "run_id", "pmid", unique=True)

# InstitutionGeo table
Index on "normalized_name"
# GIN index on "aliases" (created via SQL)
# Composite index on (country, city) (created via SQL)
```

### 为 SEO APIs 推荐的新索引

如果未来添加专用 SEO APIs，考虑以下索引优化：

```sql
-- 优化 world map aggregation (按国家统计)
CREATE INDEX idx_authorship_country_confidence 
ON authorship(country, affiliation_confidence);

-- 优化 country map aggregation (按城市统计)
CREATE INDEX idx_authorship_country_city_confidence 
ON authorship(country, city, affiliation_confidence);

-- 优化 scholar name 查询
CREATE INDEX idx_authorship_author_name 
ON authorship(author_name_raw);

-- 如果需要按年份筛选
CREATE INDEX idx_authorship_year 
ON authorship(year) WHERE year IS NOT NULL;
```

### Query Performance Considerations

当前 `PostgresMapAggregator` 的查询模式：

1. **World map**: 全表扫描 + GROUP BY country
   - 对于 demo run：通过 `run_id` JOIN `run_papers` 过滤
   - 性能瓶颈：如果 authorship 表很大（百万级），需要优化

2. **Country map**: 单国家过滤 + GROUP BY city
   - 利用 `idx_authorship_country_city` 索引
   - 性能通常较好

3. **City map**: 双重过滤 (country + city) + GROUP BY institution
   - 利用复合索引
   - 性能最好

**优化建议**：

如果 SEO 流量增加导致数据库压力：
- 添加 **materialized view** 缓存聚合结果
- 或使用 Redis 缓存 API 响应（TTL: 24h）
- 或在数据库层面添加 **query result cache**

---

## 15. Internationalization (i18n) Considerations

### Current Status
- 当前网站只有英文版本
- 数据库中的 country/city names 都是英文

### Future Multi-language Support

如果未来需要支持多语言（如中文、西班牙语）：

#### URL Structure Options

**Option 1: Subdirectory** (推荐)
```
/en/research-jobs/country/united-states
/zh/research-jobs/country/united-states  (显示中文内容)
/es/research-jobs/country/united-states
```

**Option 2: Subdomain**
```
en.scholarmap.com/research-jobs/country/united-states
zh.scholarmap.com/research-jobs/country/united-states
```

#### Hreflang Tags

```typescript
// In metadata
export async function generateMetadata({ params }) {
  return {
    alternates: {
      canonical: `https://scholarmap.com/en/research-jobs/country/${params.slug}`,
      languages: {
        'en': `https://scholarmap.com/en/research-jobs/country/${params.slug}`,
        'zh': `https://scholarmap.com/zh/research-jobs/country/${params.slug}`,
        'es': `https://scholarmap.com/es/research-jobs/country/${params.slug}`,
      },
    },
  };
}
```

#### Database Changes

需要添加翻译表：

```sql
CREATE TABLE geo_translations (
  location_id INT,
  location_type VARCHAR(20),  -- 'country', 'city', 'institution'
  language_code VARCHAR(5),   -- 'en', 'zh', 'es'
  translated_name VARCHAR(500),
  PRIMARY KEY (location_id, location_type, language_code)
);

-- Example data
INSERT INTO geo_translations VALUES 
  (1, 'country', 'en', 'United States'),
  (1, 'country', 'zh', '美国'),
  (1, 'country', 'es', 'Estados Unidos');
```

**当前建议**：专注于英文版本，i18n 可作为 Phase 6 长期规划。

---

## 16. A/B Testing Strategy

### Key Elements to Test

一旦 SEO 页面上线，可以进行 A/B 测试优化转化率：

#### Test 1: CTA 位置和文案

**Variant A (Baseline)**:
```html
<a href="/demo-run">Explore Interactive Map →</a>
```

**Variant B**:
```html
<div class="cta-box">
  <h3>See Real-Time Research Data</h3>
  <p>Interactive map with 10,000+ scholars</p>
  <a href="/demo-run" class="btn-large">Try the Map Now (Free) →</a>
</div>
```

**Metric**: Click-through rate to demo run

#### Test 2: Content Length

- **Variant A**: 800 words
- **Variant B**: 1500 words
- **Metric**: Bounce rate, time on page, SEO ranking

#### Test 3: 数据展示方式

- **Variant A**: 纯文本 + 数字
- **Variant B**: 添加数据可视化（charts, mini maps）
- **Metric**: Engagement, conversion rate

### Implementation

使用 Google Optimize 或 Vercel Edge Config：

```typescript
// frontend/src/app/research-jobs/country/[slug]/page.tsx
import { useABTest } from '@/lib/abTest';

export default function CountryPage({ params }) {
  const variant = useABTest('country-page-cta', ['control', 'variant-b']);
  
  return (
    <div>
      {variant === 'control' ? <CTAControl /> : <CTAVariantB />}
    </div>
  );
}
```

---

## 17. Competitive Analysis

### Similar Platforms

#### 1. **ResearchGate**
- **SEO Strategy**: Profile pages, publication pages
- **URL Pattern**: `/profile/{user-id}`, `/publication/{pub-id}`
- **Learning**: Strong internal linking, rich user-generated content

#### 2. **Academia.edu**
- **SEO Strategy**: Author pages, paper pages, topic pages
- **URL Pattern**: `/people/{name}`, `/papers/{title}`
- **Learning**: Heavy focus on long-tail keywords

#### 3. **Google Scholar**
- **SEO Strategy**: Minimal (rely on brand)
- **Learning**: Data freshness and comprehensiveness matter more than SEO

### Differentiation Opportunities

| Feature | ResearchGate | Academia.edu | ScholarMap |
|---------|--------------|--------------|------------|
| **Location-based search** | ❌ | ❌ | ✅ (核心优势) |
| **Institution aggregation** | ⚠️ | ⚠️ | ✅ |
| **Interactive map** | ❌ | ❌ | ✅ |
| **Public data** | ⚠️ | ⚠️ | ✅ (无需登录) |

**SEO 优势**：ScholarMap 是唯一提供地理维度研究机会搜索的平台，这是一个 **未被满足的搜索意图**。

### Target Keywords Analysis

#### High-volume keywords (难度高)
- "research opportunities" (10K+ searches/month) - 难度: 🔴 高
- "academic jobs" (50K+ searches/month) - 难度: 🔴 极高
- "postdoc positions" (20K+ searches/month) - 难度: 🔴 高

#### Long-tail keywords (ScholarMap 优势)
- "postdoc positions in [city]" (100-1K searches/month) - 难度: 🟢 低
- "research opportunities in [country]" (100-1K searches/month) - 难度: 🟢 低
- "academic institutions in [city]" (50-500 searches/month) - 难度: 🟢 低
- "[field] researchers in [country]" (10-100 searches/month) - 难度: 🟢 极低

**策略**：
1. **Short-term**: 专注长尾关键词（低竞争，高转化）
2. **Medium-term**: 逐步积累权威性
3. **Long-term**: 竞争高流量关键词

---

## 18. Content Quality Guidelines

### Writing Guidelines for SEO Content

为确保 SEO 内容的质量和一致性：

#### 1. 内容结构模板

**Country Page 标准结构**：

```markdown
# H1: Research Opportunities in {Country}

## H2: Overview
- 200-300 words introduction
- Include: scholar count, city count, top research fields

## H2: Top Research Cities in {Country}
- 300-400 words
- List top 5-10 cities with brief descriptions
- Internal links to city pages

## H2: Leading Institutions in {Country}
- 200-300 words
- Highlight top universities/research institutes
- Link to demo run

## H2: Research Trends and Opportunities
- 200-300 words
- Discuss current research landscape
- Mention hot research areas

## H2: How to Connect with Researchers in {Country}
- 100-200 words
- CTA to interactive map
- CTA to sign up

## H2: Frequently Asked Questions
- 3-5 FAQs about research in this country
```

**Total word count**: 800-1500 words

#### 2. 语言风格

- **Tone**: Professional but accessible
- **Voice**: Second person ("you can explore...")
- **Keywords**: Natural integration, avoid keyword stuffing
- **Readability**: Aim for 8th-10th grade reading level

#### 3. 数据引用

所有统计数据应该：
- 标注数据来源："Based on our analysis of 10,000+ publications from 2020-2024"
- 添加更新时间："Last updated: January 2026"
- 保持透明："Data aggregated from PubMed publications"

#### 4. 避免的内容

❌ **不要**：
- 承诺工作机会（"Get a job in..."）
- 过度营销语言
- 完全模板化的内容（每个页面应有独特信息）
- 误导性标题

✅ **应该**：
- 提供有价值的信息
- 展示真实数据
- 引导用户探索工具
- 保持内容更新

---

## 19. Maintenance Checklist

### Daily Tasks (Automated)
- [ ] Monitor server errors (500s)
- [ ] Check sitemap accessibility
- [ ] Track GA4 events

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
- [ ] Review and respond to user feedback

### Quarterly Tasks (Half day)
- [ ] Comprehensive SEO audit
- [ ] Update demo run data (if needed)
- [ ] Refresh top cities/institutions
- [ ] Review and update content templates
- [ ] Analyze conversion funnel
- [ ] Plan next quarter's SEO initiatives

---

## 20. Emergency Procedures

### If Organic Traffic Drops >20%

1. **Check indexing**:
   - Search Console → Coverage → Check for new errors
   - Manually search: `site:scholarmap.com/research-jobs`

2. **Check technical issues**:
   - Sitemap accessible?
   - Robots.txt blocking crawlers?
   - Server errors or downtime?

3. **Check Google updates**:
   - Recent algorithm updates?
   - Manual actions in Search Console?

4. **Roll back recent changes** (if applicable)

### If Key Pages Not Indexing

1. **Request indexing** in Search Console
2. **Check for `noindex` tags** in metadata
3. **Verify canonical URLs** are correct
4. **Add internal links** from high-authority pages
5. **Check for duplicate content** issues

### If Performance Degrades

1. **Check API response times** (map APIs)
2. **Review database query performance**
3. **Check ISR cache hit rate**
4. **Scale backend if needed** (Render dashboard)

---

**文档版本**: 2.0  
**最后更新**: 2026-01-17  
**维护者**: ScholarMap Development Team  
**下次审查**: 2026-04-17 (每季度更新)
