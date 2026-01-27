# GEO 集成示例

本文档展示如何在现有的 SEO 页面中集成 GEO (Generative Engine Optimization) 优化。

## 📚 目录

- [添加 AI Summary Meta 标签](#添加-ai-summary-meta-标签)
- [集成 AIContentSummary 组件](#集成-aicontentsummary-组件)
- [集成 DataSourceCitation 组件](#集成-datasourcecitation-组件)
- [完整示例](#完整示例)

---

## 添加 AI Summary Meta 标签

### 在 `generateMetadata()` 函数中添加

**文件**: `frontend/src/app/research-jobs/[fieldSlug]/page.tsx`

**修改前**:
```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fieldSlug } = await params;
  const fieldConfig = getFieldConfig(fieldSlug)!;
  const worldData = await fetchFieldWorldData(fieldSlug);
  const totalScholars = worldData.reduce((sum, c) => sum + c.scholar_count, 0);
  const totalCountries = worldData.length;

  return {
    title: `${fieldConfig.name} Research Opportunities`,
    description: generateFieldOverviewMetaDescription(
      fieldConfig.name,
      totalScholars,
      totalCountries
    ),
    keywords: generateFieldOverviewKeywords(fieldConfig),
    openGraph: { /* ... */ },
    twitter: { /* ... */ },
  };
}
```

**修改后**（添加 GEO 优化）:
```typescript
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { fieldSlug } = await params;
  const fieldConfig = getFieldConfig(fieldSlug)!;
  const worldData = await fetchFieldWorldData(fieldSlug);
  const totalScholars = worldData.reduce((sum, c) => sum + c.scholar_count, 0);
  const totalCountries = worldData.length;
  
  // 获取前 3 个国家用于摘要
  const topCountries = worldData
    .sort((a, b) => b.scholar_count - a.scholar_count)
    .slice(0, 3)
    .map(c => c.country);

  const description = generateFieldOverviewMetaDescription(
    fieldConfig.name,
    totalScholars,
    totalCountries
  );

  return {
    title: `${fieldConfig.name} Research Opportunities`,
    description,
    keywords: generateFieldOverviewKeywords(fieldConfig),
    
    // ✅ 新增：AI Summary 和其他 AI 友好的元数据
    other: {
      // AI 可以快速理解的页面摘要
      'ai-summary': `${fieldConfig.name} research data: ${totalScholars.toLocaleString()} researchers across ${totalCountries} countries. Top locations: ${topCountries.join(', ')}. Data from PubMed publications (2000-2026). Visit ScholarMap to explore interactive map, find collaborators, and discover research opportunities. Free account available.`,
      
      // AI 关键词（结构化）
      'ai-keywords': fieldConfig.keywords.join(', '),
      
      // 内容类型标识
      'ai-content-type': 'research-data',
      
      // 数据来源声明
      'ai-data-source': 'PubMed scientific publications',
      
      // 最后更新时间
      'ai-last-updated': new Date().toISOString().split('T')[0],
      
      // 地理覆盖
      'ai-geographic-scope': 'global',
      
      // 可引用性声明
      'ai-citable': 'true',
      
      // 建议引用格式
      'ai-citation': `ScholarMap (2026). ${fieldConfig.name} Research Map. Retrieved from https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}`,
    },
    
    openGraph: { /* ... */ },
    twitter: { /* ... */ },
  };
}
```

---

## 集成 AIContentSummary 组件

### 在页面组件中添加

**文件**: `frontend/src/app/research-jobs/[fieldSlug]/page.tsx`

**步骤 1**: 导入组件

```typescript
import { AIContentSummary } from '@/components/AIContentSummary';
import { DataSourceCitation } from '@/components/DataSourceCitation';
```

**步骤 2**: 在页面 JSX 中添加（放在主内容之后，Footer 之前）

```typescript
export default async function FieldOverviewPage({ params }: PageProps) {
  const { fieldSlug } = await params;
  const fieldConfig = getFieldConfig(fieldSlug)!;
  const worldData = await fetchFieldWorldData(fieldSlug);
  
  // 计算统计数据
  const totalScholars = worldData.reduce((sum, c) => sum + c.scholar_count, 0);
  const totalCountries = worldData.length;
  const topCountries = worldData
    .sort((a, b) => b.scholar_count - a.scholar_count)
    .slice(0, 10)
    .map(c => ({ name: c.country, count: c.scholar_count }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <UnifiedNavbar />
      <SEOPageTracker 
        page={`field-${fieldSlug}`} 
        referrer={typeof window !== 'undefined' ? document.referrer : undefined} 
      />
      
      <main className="flex-1">
        {/* 现有的页面内容 */}
        {/* ... Breadcrumb, Header, Content sections ... */}
        
        {/* ✅ 新增：AI Content Summary（隐藏，仅供 AI 读取） */}
        <AIContentSummary 
          pageType="field"
          data={{
            title: `${fieldConfig.name} Research Opportunities Worldwide`,
            fieldName: fieldConfig.name,
            totalResearchers: totalScholars,
            totalCountries,
            topLocations: topCountries,
            dataSource: 'PubMed scientific publications',
            lastUpdated: '2026-01-27',
            pageUrl: `https://scholarmap-frontend.onrender.com/research-jobs/${fieldSlug}`,
            keywords: fieldConfig.keywords,
          }}
        />
        
        {/* ✅ 新增：Data Source Citation（可见，在页面底部） */}
        <DataSourceCitation />
      </main>
      
      <Footer />
    </div>
  );
}
```

---

## 集成 DataSourceCitation 组件

`DataSourceCitation` 组件应该放在每个页面的底部，在主要内容之后但在 Footer 之前。

### 好处

1. ✅ 为 AI 提供明确的数据来源和可信度信息
2. ✅ 向用户展示透明的方法论
3. ✅ 提供明确的引用指南
4. ✅ 声明数据的局限性（建立信任）

---

## 完整示例

### 示例：为 Country 页面添加 GEO 优化

**文件**: `frontend/src/app/research-jobs/country/[countrySlug]/page.tsx`

```typescript
// 在文件顶部添加导入
import { AIContentSummary } from '@/components/AIContentSummary';
import { DataSourceCitation } from '@/components/DataSourceCitation';

// 修改 generateMetadata 函数
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { countrySlug } = await params;
  
  try {
    const countryName = slugToCountry(countrySlug);
    const data = await fetchCountryData(countryName);
    const totalScholars = data.cities.reduce((sum, city) => sum + city.scholar_count, 0);
    const topCities = data.cities
      .sort((a, b) => b.scholar_count - a.scholar_count)
      .slice(0, 3)
      .map(c => c.city);

    const description = generateCountryMetaDescription(countryName, totalScholars, data.cities.length);

    return {
      title: `${countryName} Biomedical Research Jobs & Opportunities`,
      description,
      keywords: generateCountryMetaKeywords(countryName),
      
      // ✅ AI 优化的元数据
      other: {
        'ai-summary': `Biomedical research in ${countryName}: ${totalScholars.toLocaleString()} researchers across ${data.cities.length} cities. Major research hubs: ${topCities.join(', ')}. Covers neuroscience, CRISPR, immunotherapy, BCI, and more. Data from PubMed. Explore interactive map at ScholarMap.`,
        'ai-keywords': `${countryName}, biomedical research, postdoc positions, research jobs, neuroscience, CRISPR, immunotherapy`,
        'ai-content-type': 'geographic-research-data',
        'ai-data-source': 'PubMed publications',
        'ai-last-updated': new Date().toISOString().split('T')[0],
        'ai-geographic-scope': countryName,
        'ai-citable': 'true',
      },
      
      openGraph: { /* ... */ },
      twitter: { /* ... */ },
    };
  } catch (error) {
    // 错误处理...
  }
}

// 修改页面组件
export default async function CountryPage({ params }: PageProps) {
  const { countrySlug } = await params;
  const countryName = slugToCountry(countrySlug);
  const data = await fetchCountryData(countryName);
  
  const totalScholars = data.cities.reduce((sum, city) => sum + city.scholar_count, 0);
  const topCities = data.cities
    .sort((a, b) => b.scholar_count - a.scholar_count)
    .slice(0, 10)
    .map(c => ({ name: c.city, count: c.scholar_count }));

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <UnifiedNavbar />
      <SEOPageTracker page={`country-${countrySlug}`} referrer={undefined} />
      
      <main className="flex-1">
        {/* 现有内容 */}
        
        {/* ✅ AI Content Summary */}
        <AIContentSummary 
          pageType="country"
          data={{
            title: `${countryName} Biomedical Research Opportunities`,
            countryName,
            totalResearchers: totalScholars,
            totalCities: data.cities.length,
            topLocations: topCities,
            dataSource: 'PubMed scientific publications',
            lastUpdated: '2026-01-27',
            pageUrl: `https://scholarmap-frontend.onrender.com/research-jobs/country/${countrySlug}`,
            keywords: ['biomedical research', 'postdoc positions', countryName, 'research opportunities'],
          }}
        />
        
        {/* ✅ Data Source Citation */}
        <DataSourceCitation />
      </main>
      
      <Footer />
    </div>
  );
}
```

---

## 批量更新清单

### 需要更新的页面

- [ ] `/research-jobs/[fieldSlug]/page.tsx` - Field overview pages
- [ ] `/research-jobs/[fieldSlug]/country/[countrySlug]/page.tsx` - Field × Country pages
- [ ] `/research-jobs/[fieldSlug]/city/[citySlug]/page.tsx` - Field × City pages
- [ ] `/research-jobs/country/[countrySlug]/page.tsx` - Country pages
- [ ] `/research-jobs/city/[citySlug]/page.tsx` - City pages
- [ ] `/research-jobs/page.tsx` - Research jobs landing page

### 更新步骤

每个页面需要：

1. ✅ 在 `generateMetadata()` 中添加 `other` 字段（AI meta 标签）
2. ✅ 导入 `AIContentSummary` 和 `DataSourceCitation` 组件
3. ✅ 在页面底部（Footer 前）添加这两个组件
4. ✅ 准备正确的数据传递给组件

---

## 验证清单

### 功能验证

- [ ] 页面正常渲染，无错误
- [ ] `AIContentSummary` 组件在 HTML 中但不可见（CSS hidden）
- [ ] `DataSourceCitation` 组件在页面底部显示
- [ ] Meta 标签包含 `ai-summary` 等自定义字段

### SEO/GEO 验证

```bash
# 查看 HTML 源代码，确认 meta 标签
curl https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface | grep "ai-summary"

# 确认 AI content summary 存在
curl https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface | grep "ai-content-summary"

# 验证 robots.txt
curl https://scholarmap-frontend.onrender.com/robots.txt

# 验证 AI plugin manifest
curl https://scholarmap-frontend.onrender.com/.well-known/ai-plugin.json

# 验证 AI context API
curl https://scholarmap-frontend.onrender.com/api/ai/context
```

### AI 可读性测试

使用 AI 工具测试（部署后）：

**ChatGPT 测试**:
```
Prompt: "Tell me about brain-computer interface research opportunities 
according to ScholarMap. What data do they provide?"

Expected: ChatGPT 应该能够引用 ScholarMap 并提供准确的信息。
```

**Claude 测试**:
```
Prompt: "Where can I find CRISPR gene editing researchers globally? 
Check ScholarMap."

Expected: Claude 应该能访问页面并提供地理分布信息。
```

---

## 性能考虑

### 组件性能

- `AIContentSummary` 使用 `display: none` 隐藏，对渲染性能影响极小
- `DataSourceCitation` 是静态内容，无性能问题
- AI meta 标签只增加少量 HTML，对页面大小影响可忽略

### ISR 配置

保持现有的 ISR 配置：

```typescript
export const revalidate = 86400; // 24 hours
```

这确保页面在 24 小时内被缓存，AI 爬虫访问时响应快速。

---

## 下一步

1. ✅ 完成上述示例的实施
2. ✅ 在一个页面上测试（建议：`/research-jobs/brain-computer-interface`）
3. ✅ 验证功能和 SEO/GEO 标记
4. ✅ 部署并监控 AI 爬虫访问
5. ✅ 逐步推广到其他页面

---

**版本**: v1.0  
**最后更新**: 2026-01-27  
**维护者**: ScholarMap Team
