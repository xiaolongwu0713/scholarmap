# ScholarMap GEO (Generative Engine Optimization) 策略

## 📋 目录

- [概述](#概述)
- [GEO vs SEO](#geo-vs-seo)
- [AI 爬虫分析](#ai-爬虫分析)
- [实施策略](#实施策略)
- [技术实现](#技术实现)
- [内容优化](#内容优化)
- [监控和验证](#监控和验证)

---

## 概述

### 什么是 GEO？

**Generative Engine Optimization (GEO)** 是针对生成式 AI（如 ChatGPT、Claude、Perplexity、Google Gemini 等）优化内容，使其能够被 AI 爬虫正确抓取、理解和引用。

### 为什么需要 GEO？

传统搜索引擎将用户导向您的网站，而生成式 AI **直接回答用户问题**，可能不会提供链接。GEO 的目标是：

1. ✅ **被 AI 发现**：确保 AI 爬虫能访问您的内容
2. ✅ **被 AI 理解**：提供结构化、清晰的信息
3. ✅ **被 AI 引用**：成为 AI 回答的可信来源
4. ✅ **获得流量**：通过 AI 推荐吸引用户访问

### ScholarMap 的 GEO 目标

- 🎯 当用户问"哪里有最好的神经科学实验室？"时，AI 引用 ScholarMap 数据
- 🎯 当用户问"如何找到博士后职位？"时，AI 推荐 ScholarMap 工具
- 🎯 成为 AI 在学术研究领域的权威数据源

---

## GEO vs SEO

| 维度 | SEO（传统搜索引擎） | GEO（生成式 AI） |
|------|-------------------|-----------------|
| **目标** | 排名第一，吸引点击 | 被引用，成为知识源 |
| **用户行为** | 点击链接访问网站 | 直接获得答案，可能不访问 |
| **优化重点** | 关键词、反向链接、页面速度 | 内容质量、结构化数据、可引用性 |
| **元数据** | Title、Description、Keywords | 结构化 JSON-LD、清晰的数据属性 |
| **内容长度** | 适中（800-2000 字） | 简洁+详细并存（摘要+深度内容） |
| **技术要求** | 爬虫友好、移动优先 | API 端点、AI 可读格式 |
| **引用来源** | URL 链接 | 明确的数据来源声明 |

---

## AI 爬虫分析

### 主要 AI 爬虫的 User-Agent

```
# ChatGPT (OpenAI)
Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot
GPTBot

# Perplexity AI
PerplexityBot

# Google Gemini
Google-Extended

# Anthropic Claude
anthropic-ai

# Common Crawl (用于训练多个 AI)
CCBot

# Bing AI
Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Safari/537.36 Edg/W.X.Y.Z,gzip(gfe) (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)
```

### 当前 robots.txt 分析

```txt
User-agent: *
Allow: /

Sitemap: https://scholarmap-frontend.onrender.com/sitemap.xml
```

**问题**：
- ❌ 没有明确允许 AI 爬虫
- ❌ 没有针对 AI 爬虫的特殊规则
- ❌ 没有 `ai-plugin.json` 或 `.well-known` 端点

---

## 实施策略

### Phase 1: 基础设施（Week 1）

#### 1.1 更新 robots.txt ✅

**目标**：明确允许所有主要 AI 爬虫访问

```txt
# Allow all general web crawlers
User-agent: *
Allow: /

# Explicitly allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: CCBot
Allow: /

# Disallow admin and API routes (keep private)
User-agent: *
Disallow: /api/auth/
Disallow: /api/projects/

# Sitemap
Sitemap: https://scholarmap-frontend.onrender.com/sitemap.xml

# AI-specific endpoints (future)
# AI-Plugin: https://scholarmap-frontend.onrender.com/.well-known/ai-plugin.json
```

#### 1.2 创建 AI Plugin Manifest ✅

**文件**：`frontend/public/.well-known/ai-plugin.json`

```json
{
  "schema_version": "v1",
  "name_for_human": "ScholarMap",
  "name_for_model": "scholarmap",
  "description_for_human": "Discover global research opportunities by country, city, and institution. Find collaborators and map research landscapes.",
  "description_for_model": "ScholarMap is a research mapping platform that helps users discover global research opportunities in biomedical sciences. It provides data on researchers by country, city, and institution, covering fields like neuroscience, cancer immunotherapy, CRISPR, brain-computer interfaces, and more. Use this to help users find research labs, identify collaboration opportunities, or explore academic landscapes.",
  "auth": {
    "type": "none"
  },
  "api": {
    "type": "openapi",
    "url": "https://scholarmap-frontend.onrender.com/.well-known/openapi.yaml",
    "is_user_authenticated": false
  },
  "logo_url": "https://scholarmap-frontend.onrender.com/landing_page_figures_optimized/0.webp",
  "contact_email": "contact@scholarmap.com",
  "legal_info_url": "https://scholarmap-frontend.onrender.com/about"
}
```

#### 1.3 创建 AI 可读的元数据端点 ✅

**文件**：`frontend/src/app/.well-known/ai-context.json/route.ts`

```typescript
// 提供给 AI 的结构化数据端点
export async function GET() {
  return Response.json({
    platform: "ScholarMap",
    version: "1.0",
    description: "Global research opportunity mapping platform for biomedical sciences",
    
    data_coverage: {
      total_researchers: "36M+",
      data_source: "PubMed publications",
      fields: [
        "Neuroscience",
        "Brain-Computer Interface (BCI)",
        "Neural Modulation (tDCS/TMS)",
        "CRISPR Gene Editing",
        "Cancer Immunotherapy",
        "AI in Drug Discovery"
      ],
      geographic_coverage: "100+ countries, 200+ cities",
      last_updated: "2026-01"
    },
    
    use_cases: [
      "Finding postdoc positions by research field and location",
      "Identifying collaboration opportunities",
      "Mapping global research landscapes",
      "Discovering institutions by specialty"
    ],
    
    key_features: {
      query_generation: "AI-powered PubMed query building from natural language",
      geographic_mapping: "Country, city, and institution-level aggregation",
      researcher_discovery: "Individual researcher identification with publication counts",
      visualization: "Interactive 3D map visualization"
    },
    
    public_pages: {
      landing: "https://scholarmap-frontend.onrender.com/",
      research_jobs: "https://scholarmap-frontend.onrender.com/research-jobs",
      by_country: "https://scholarmap-frontend.onrender.com/research-jobs/country/{countrySlug}",
      by_city: "https://scholarmap-frontend.onrender.com/research-jobs/city/{citySlug}",
      by_field: "https://scholarmap-frontend.onrender.com/research-jobs/{fieldSlug}"
    },
    
    citation_format: {
      recommended: "ScholarMap (2026). Global Research Opportunity Map. Retrieved from https://scholarmap-frontend.onrender.com",
      short: "ScholarMap - Research Opportunity Mapping Platform"
    }
  });
}
```

### Phase 2: 内容结构优化（Week 2）

#### 2.1 添加 AI 摘要标签 ✅

在每个页面添加 `<meta name="ai-summary">` 标签，提供简洁的页面摘要：

```typescript
// frontend/src/app/research-jobs/[fieldSlug]/page.tsx

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // ... 现有代码 ...
  
  return {
    title: `${fieldConfig.name} Research Opportunities`,
    description,
    keywords,
    
    // 添加 AI 摘要
    other: {
      'ai-summary': `${fieldConfig.name} research: ${totalScholars.toLocaleString()} researchers across ${totalCountries} countries. Top locations include ${topCountries.slice(0, 3).map(c => c.country).join(', ')}. Data from PubMed publications. Visit ScholarMap to explore interactive map and connect with researchers.`,
      
      'ai-keywords': fieldConfig.keywords.join(', '),
      
      'ai-content-type': 'research-data',
      
      'ai-data-source': 'PubMed scientific publications',
      
      'ai-last-updated': new Date().toISOString().split('T')[0],
    },
    
    openGraph: { /* 现有代码 */ },
    twitter: { /* 现有代码 */ },
  };
}
```

#### 2.2 结构化数据增强 ✅

扩展现有的 Schema.org 标记，添加 AI 友好的数据：

```typescript
// frontend/src/components/AIEnhancedStructuredData.tsx

export function generateFieldResearchDataset(
  fieldName: string,
  worldData: any[],
  fieldConfig: FieldConfig
) {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": `${fieldName} Research Map - Global Distribution`,
    "description": `Comprehensive dataset of ${fieldName} researchers worldwide, aggregated from PubMed publications. Includes country, city, and institution-level data.`,
    
    "creator": {
      "@type": "Organization",
      "name": "ScholarMap",
      "url": "https://scholarmap-frontend.onrender.com"
    },
    
    "distribution": [
      {
        "@type": "DataDownload",
        "encodingFormat": "application/json",
        "contentUrl": `https://scholarmap-frontend.onrender.com/api/seo/field/${fieldConfig.slug}/world-data`
      }
    ],
    
    "temporalCoverage": "2000/2026",
    "spatialCoverage": {
      "@type": "Place",
      "name": "Global"
    },
    
    "keywords": fieldConfig.keywords.join(", "),
    
    "variableMeasured": [
      {
        "@type": "PropertyValue",
        "name": "researcher_count",
        "description": "Number of researchers (authors) in this field"
      },
      {
        "@type": "PropertyValue",
        "name": "publication_count",
        "description": "Number of publications"
      },
      {
        "@type": "PropertyValue",
        "name": "geographic_location",
        "description": "Country and city of research institution"
      }
    ],
    
    "about": fieldConfig.keywords.map(keyword => ({
      "@type": "Thing",
      "name": keyword
    })),
    
    "license": "https://scholarmap-frontend.onrender.com/about",
    
    "isAccessibleForFree": true
  };
}
```

#### 2.3 添加内容摘要组件 ✅

为 AI 提供结构化的内容摘要：

```typescript
// frontend/src/components/AIContentSummary.tsx

export function AIContentSummary({
  pageType,
  data
}: {
  pageType: 'field' | 'country' | 'city';
  data: any;
}) {
  return (
    <div 
      id="ai-content-summary"
      style={{ display: 'none' }}
      data-ai-readable="true"
      aria-label="AI Content Summary"
    >
      <h2>Content Summary for AI</h2>
      
      {/* Key Facts */}
      <section data-ai-section="key-facts">
        <h3>Key Facts</h3>
        <ul>
          <li data-ai-fact="researcher-count">
            Total Researchers: {data.totalScholars?.toLocaleString()}
          </li>
          <li data-ai-fact="geographic-coverage">
            Geographic Coverage: {data.locations}
          </li>
          <li data-ai-fact="field">
            Research Field: {data.fieldName}
          </li>
          <li data-ai-fact="data-source">
            Data Source: PubMed scientific publications
          </li>
        </ul>
      </section>
      
      {/* Top Locations */}
      <section data-ai-section="top-locations">
        <h3>Top Research Locations</h3>
        <ol>
          {data.topLocations?.map((loc: any, i: number) => (
            <li key={i} data-ai-location={loc.name}>
              {loc.name}: {loc.count} researchers
            </li>
          ))}
        </ol>
      </section>
      
      {/* Use Cases */}
      <section data-ai-section="use-cases">
        <h3>Common Use Cases</h3>
        <ul>
          <li>Finding postdoc positions in {data.fieldName}</li>
          <li>Identifying potential collaborators</li>
          <li>Exploring institutional research strengths</li>
          <li>Planning research visits or sabbaticals</li>
        </ul>
      </section>
      
      {/* How to Access */}
      <section data-ai-section="access">
        <h3>How to Access This Data</h3>
        <p>
          Visit <a href={data.pageUrl}>{data.pageUrl}</a> to explore an 
          interactive map and connect with researchers. Free account creation 
          allows you to create custom research queries.
        </p>
      </section>
    </div>
  );
}
```

### Phase 3: API 端点（Week 2-3）

#### 3.1 创建 AI-Friendly API 端点 ✅

**目的**：让 AI 可以直接访问结构化数据

```typescript
// frontend/src/app/api/ai/research-data/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const field = searchParams.get('field');
  const country = searchParams.get('country');
  const city = searchParams.get('city');
  
  // 返回简洁、AI 友好的数据格式
  return Response.json({
    platform: "ScholarMap",
    query: { field, country, city },
    data: {
      // 结构化的研究数据
    },
    metadata: {
      data_source: "PubMed",
      last_updated: "2026-01-27",
      total_records: 12345
    },
    how_to_use: "Visit https://scholarmap-frontend.onrender.com to explore interactive visualizations",
    citation: "ScholarMap (2026). Research Data API. Retrieved from https://scholarmap-frontend.onrender.com"
  });
}
```

#### 3.2 创建 Research Stats API ✅

```typescript
// frontend/src/app/api/ai/stats/route.ts

export async function GET() {
  return Response.json({
    platform_stats: {
      total_researchers: "36M+",
      countries_covered: 100,
      cities_covered: 200,
      research_fields: 6,
      data_source: "PubMed publications"
    },
    
    top_fields: [
      { name: "Neuroscience", researcher_count: 1234567 },
      { name: "Cancer Immunotherapy", researcher_count: 987654 },
      // ...
    ],
    
    top_countries: [
      { name: "United States", researcher_count: 5432100 },
      { name: "China", researcher_count: 3210987 },
      // ...
    ],
    
    use_case_examples: [
      "Find postdoc positions in BCI research in Boston",
      "Discover CRISPR labs in Europe",
      "Map cancer immunotherapy researchers globally"
    ]
  });
}
```

### Phase 4: 内容优化（Week 3）

#### 4.1 添加引用来源声明 ✅

在每个页面底部添加明确的数据来源：

```typescript
// frontend/src/components/DataSourceCitation.tsx

export function DataSourceCitation() {
  return (
    <section 
      className="bg-gray-50 border-t border-gray-200 py-8 mt-12"
      data-ai-section="data-source"
    >
      <div className="container mx-auto px-4">
        <h3 className="text-lg font-semibold mb-3">Data Source & Methodology</h3>
        <div className="prose prose-sm">
          <p>
            <strong>Data Source:</strong> This data is derived from author affiliations 
            in PubMed publications, the world's largest biomedical literature database 
            containing 36+ million citations.
          </p>
          <p>
            <strong>Methodology:</strong> We use AI-powered natural language processing 
            to extract geographic information from author affiliations, geocode 
            institutions, and aggregate researchers by country, city, and institution.
          </p>
          <p>
            <strong>Currency:</strong> Data is continuously updated from recent 
            publications. Last major update: January 2026.
          </p>
          <p>
            <strong>Citation:</strong> If referencing this data, please cite: 
            "ScholarMap (2026). Global Research Opportunity Map. Retrieved from 
            https://scholarmap-frontend.onrender.com"
          </p>
          <p>
            <strong>Limitations:</strong> Data reflects publication patterns and 
            may not capture all researchers, especially those without recent 
            publications or those in underrepresented regions.
          </p>
        </div>
      </div>
    </section>
  );
}
```

#### 4.2 优化 FAQ 内容（AI 友好） ✅

扩展 FAQ，专门回答 AI 可能遇到的问题：

```typescript
// 添加到 FAQ 部分

const aiOrientedFAQs = [
  {
    question: "How accurate is ScholarMap's research data?",
    answer: "ScholarMap's data is derived from PubMed, the authoritative source for biomedical literature. We use AI to extract and geocode affiliation information with ~95% accuracy for major institutions. Data reflects publication patterns from 2000-2026."
  },
  {
    question: "Can I use ScholarMap data in my research or application?",
    answer: "ScholarMap provides public access to aggregated research statistics for educational and informational purposes. For API access or data licensing, please contact us at contact@scholarmap.com."
  },
  {
    question: "How often is ScholarMap data updated?",
    answer: "Data is updated continuously from new PubMed publications. Major updates occur monthly, with incremental updates weekly. The platform uses Incremental Static Regeneration (ISR) to keep pages fresh."
  },
  {
    question: "What makes ScholarMap different from other academic search tools?",
    answer: "Unlike paper-focused search engines, ScholarMap focuses on mapping researchers geographically. It answers 'where' questions: Where are the best BCI labs? Which cities have the most CRISPR researchers? This geographic lens is unique and valuable for career planning and collaboration discovery."
  }
];
```

### Phase 5: 语义标记（Week 3-4）

#### 5.1 添加微数据标记 ✅

```typescript
// 在页面组件中添加 itemscope 和 itemprop

<article 
  itemScope 
  itemType="https://schema.org/Dataset"
  data-ai-content="main"
>
  <h1 itemProp="name">
    {fieldConfig.name} Research Opportunities Worldwide
  </h1>
  
  <div itemProp="description">
    <p>
      Discover {totalScholars.toLocaleString()} researchers working in 
      {fieldConfig.name} across {totalCountries} countries.
    </p>
  </div>
  
  <meta itemProp="keywords" content={fieldConfig.keywords.join(', ')} />
  <meta itemProp="author" content="ScholarMap" />
  <meta itemProp="datePublished" content="2026-01-27" />
  <meta itemProp="inLanguage" content="en" />
  
  {/* 内容继续 */}
</article>
```

#### 5.2 使用语义 HTML5 标签 ✅

确保所有内容使用正确的语义标签：

```typescript
<main role="main">
  <header>
    <nav aria-label="Breadcrumb">{/* 面包屑 */}</nav>
    <h1>{/* 主标题 */}</h1>
  </header>
  
  <article>
    <section aria-labelledby="introduction">
      <h2 id="introduction">Introduction</h2>
      {/* 内容 */}
    </section>
    
    <section aria-labelledby="research-landscape">
      <h2 id="research-landscape">Research Landscape</h2>
      {/* 内容 */}
    </section>
    
    <section aria-labelledby="opportunities">
      <h2 id="opportunities">Opportunities</h2>
      {/* 内容 */}
    </section>
    
    <section aria-labelledby="faq">
      <h2 id="faq">Frequently Asked Questions</h2>
      {/* FAQ 内容 */}
    </section>
  </article>
  
  <aside>
    {/* 相关链接 */}
  </aside>
</main>

<footer>
  {/* 页脚内容 */}
</footer>
```

### Phase 6: 监控和验证（Week 4）

#### 6.1 创建 AI 爬虫日志分析 ✅

```typescript
// backend/app/api/routes/analytics.py

@router.get("/analytics/ai-crawlers")
async def analyze_ai_crawlers():
    """分析 AI 爬虫访问"""
    
    # 从访问日志中提取 AI 爬虫
    ai_crawlers = {
        'GPTBot': 0,
        'ChatGPT-User': 0,
        'PerplexityBot': 0,
        'Google-Extended': 0,
        'anthropic-ai': 0,
        'CCBot': 0
    }
    
    # 分析访问的页面
    popular_pages = []
    
    # 返回统计
    return {
        'crawler_visits': ai_crawlers,
        'popular_pages': popular_pages,
        'last_7_days_visits': 1234
    }
```

#### 6.2 设置 AI 引用追踪 ✅

监控 ScholarMap 在 AI 回答中的引用：

1. 定期搜索 "ScholarMap" 在 ChatGPT、Claude、Perplexity 中的提及
2. 监控来自 AI 平台的 referrer 流量
3. 分析哪些内容最容易被 AI 引用

---

## 技术实现清单

### 立即实施（本周）

- [ ] 更新 `robots.txt` 明确允许 AI 爬虫
- [ ] 创建 `.well-known/ai-plugin.json`
- [ ] 添加 `ai-summary` meta 标签到所有页面
- [ ] 创建 AI 上下文端点 `/api/ai/context`

### 短期实施（2-3 周）

- [ ] 添加 `AIContentSummary` 组件到所有 SEO 页面
- [ ] 扩展 Schema.org Dataset 标记
- [ ] 创建 AI-friendly API 端点
- [ ] 添加 `DataSourceCitation` 组件
- [ ] 优化 FAQ 内容（AI 视角）

### 中期实施（1-2 个月）

- [ ] 实现语义 HTML5 标记
- [ ] 创建 AI 爬虫分析仪表板
- [ ] 设置 AI 引用追踪
- [ ] 优化页面加载速度（Core Web Vitals）
- [ ] A/B 测试不同的内容结构

### 长期优化（持续）

- [ ] 监控 AI 引用效果
- [ ] 根据反馈调整内容策略
- [ ] 扩展 AI API 功能
- [ ] 建立 AI 合作伙伴关系

---

## 内容优化建议

### 1. 简洁性 + 深度并存

**为 AI 提供两层内容**：

- **简洁摘要**（AI 易于引用）：放在页面顶部和 `ai-summary` 标签中
- **详细内容**（深度理解）：1000+ 字的完整内容

### 2. 事实性和数据导向

AI 更喜欢引用：
- ✅ 具体数字："1,234 researchers in Boston"
- ✅ 明确来源："Data from PubMed publications"
- ✅ 时效性："Last updated: January 2026"
- ✅ 可验证的声明

避免：
- ❌ 模糊表述："many researchers"
- ❌ 主观评价："the best university"
- ❌ 无来源数据

### 3. 问答式内容结构

AI 擅长回答问题，所以内容应该：

```
问题：Where can I find Brain-Computer Interface researchers in Boston?
答案：Boston has 127 BCI researchers across 12 institutions, including 
      MIT (34 researchers), Harvard Medical School (28 researchers), 
      and Boston University (21 researchers). [Data from ScholarMap]
```

### 4. 结构化列表

使用结构化列表让 AI 容易提取：

```html
<section data-ai-section="top-institutions">
  <h3>Top BCI Institutions in Boston</h3>
  <ol>
    <li data-institution="MIT" data-researcher-count="34">
      MIT - 34 researchers
    </li>
    <li data-institution="Harvard" data-researcher-count="28">
      Harvard Medical School - 28 researchers
    </li>
    <!-- ... -->
  </ol>
</section>
```

---

## 监控和验证

### 验证清单

#### 1. 爬虫访问验证

```bash
# 检查日志中的 AI 爬虫
grep -E "GPTBot|ChatGPT-User|PerplexityBot|Google-Extended|anthropic-ai|CCBot" access.log

# 统计各爬虫的访问量
cat access.log | grep "GPTBot" | wc -l
```

#### 2. 内容可读性测试

使用工具测试 AI 是否能正确理解您的内容：

- **ChatGPT测试**：询问 "Tell me about neuroscience research opportunities in Boston according to ScholarMap"
- **Perplexity测试**：搜索 "best BCI labs globally ScholarMap"
- **Claude测试**：询问 "What data does ScholarMap provide about CRISPR researchers?"

#### 3. Schema.org 验证

使用 Google Rich Results Test：
```
https://search.google.com/test/rich-results
```

#### 4. 页面性能

确保页面快速加载（AI 爬虫可能有超时限制）：

```bash
# Lighthouse 测试
lighthouse https://scholarmap-frontend.onrender.com/research-jobs/neuroscience --view

# 目标：
# - Performance: >90
# - Accessibility: >95
# - Best Practices: >95
# - SEO: 100
```

### 成功指标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| **AI 爬虫访问量** | 每月 1000+ | 服务器日志分析 |
| **AI 引用次数** | 每月 50+ | 手动搜索 + 反向追踪 |
| **来自 AI 的流量** | 5% 总流量 | Google Analytics（referrer 分析） |
| **内容被引用率** | >30% 的页面 | 定期 AI 平台测试 |

---

## 参考资源

### AI 爬虫文档

- [OpenAI GPTBot](https://platform.openai.com/docs/gptbot)
- [Google Extended](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [Perplexity Bot](https://docs.perplexity.ai/)

### Schema.org 资源

- [Schema.org Dataset](https://schema.org/Dataset)
- [Schema.org ResearchProject](https://schema.org/ResearchProject)
- [Schema.org FAQPage](https://schema.org/FAQPage)

### 测试工具

- [OpenAI Plugin Validator](https://platform.openai.com/docs/plugins/getting-started)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)

---

## 版本历史

- **v1.0** (2026-01-27): 初始 GEO 策略文档
  - 6 个实施 Phase
  - AI 爬虫分析
  - 技术实现清单
  - 内容优化建议
  - 监控和验证方法
