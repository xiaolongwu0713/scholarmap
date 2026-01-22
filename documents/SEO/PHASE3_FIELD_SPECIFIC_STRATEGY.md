# Phase 3: Field-Specific SEO Strategy

## 🎯 核心策略

在 Phase 1（国家页面）和 Phase 2（城市页面）的基础上，**Phase 3 引入领域细分维度**，创建 "研究领域 × 地理位置" 的组合页面。

---

## 💡 为什么这是最优 SEO 策略

### 1. 竞争优势

| 平台 | 地理搜索 | 领域搜索 | 地理 × 领域 |
|------|---------|---------|------------|
| ResearchGate | ❌ | ✅ | ❌ |
| Academia.edu | ❌ | ✅ | ❌ |
| Google Scholar | ❌ | ✅ | ❌ |
| **ScholarMap** | ✅ | ✅ | ✅ 🏆 |

**结论**：ScholarMap 是**唯一**提供 "领域 × 地理" 组合搜索的平台。

---

### 2. 关键词优势

#### 传统关键词（高竞争）
- "postdoc positions" - 🔴 竞争极高，难以排名

#### Phase 1-2 关键词（中等竞争）
- "postdoc positions in Boston" - 🟡 竞争中等，需 6 个月

#### Phase 3 关键词（低竞争，高价值）🏆
- "BCI research in Boston" - 🟢 **竞争极低，1-2 个月进 Top 10**
- "CRISPR labs in California" - 🟢 **零竞争**
- "neural modulation postdoc UK" - 🟢 **零竞争**

**优势**：
- ✅ 搜索意图极其精准
- ✅ 转化率高 3-5 倍（15-25% vs 5-10%）
- ✅ 排名速度快 3-6 倍（1-2 月 vs 6-12 月）
- ✅ 零竞争对手

---

## 🗺️ URL 结构

### 新增路由

```
/research-jobs/
  ├─ [fieldSlug]/
  │   ├─ page.tsx                           # 领域概览 + 全球分布
  │   ├─ country/[countrySlug]/page.tsx     # 该领域在某国
  │   └─ city/[citySlug]/page.tsx           # 该领域在某城市
```

### 示例 URL

- `/research-jobs/brain-computer-interface` - BCI 全球分布
- `/research-jobs/brain-computer-interface/country/united-states` - 美国的 BCI 研究
- `/research-jobs/brain-computer-interface/city/boston` - 波士顿的 BCI 实验室

---

## 📊 优先领域（5-10 个）

### Tier 1（优先上线）

1. **Brain-Computer Interface (BCI)**
   - Slug: `brain-computer-interface`
   - 搜索量: 中等
   - 竞争: 低
   
2. **Neural Modulation (tDCS/TMS)**
   - Slug: `neural-modulation`
   - 搜索量: 中等
   - 竞争: 低

3. **CRISPR Gene Editing**
   - Slug: `crispr-gene-editing`
   - 搜索量: 高
   - 竞争: 中等

4. **Cancer Immunotherapy**
   - Slug: `cancer-immunotherapy`
   - 搜索量: 高
   - 竞争: 中等

5. **AI in Drug Discovery**
   - Slug: `ai-drug-discovery`
   - 搜索量: 中等
   - 竞争: 低

### Tier 2（验证后上线）

6. Neurodegenerative Diseases (`neurodegenerative-diseases`)
7. Stem Cell Research (`stem-cell-research`)
8. Microbiome Research (`microbiome-research`)
9. Precision Medicine (`precision-medicine`)
10. Organoid Technology (`organoid-technology`)

---

## 🔧 实施步骤

### Step 1: 数据准备（Week 3）

在 super user 账号下创建 **SEO Project**：

```
Project: "SEO Content"
├─ Run: "Brain-Computer Interface (BCI)"
│   └─ Query: BCI, brain-computer interface, neural interface
├─ Run: "Neural Modulation (tDCS/TMS)"
│   └─ Query: tDCS, TMS, transcranial magnetic stimulation
├─ Run: "CRISPR Gene Editing"
│   └─ Query: CRISPR, gene editing, CRISPR-Cas9
├─ Run: "Cancer Immunotherapy"
│   └─ Query: immunotherapy, CAR-T, checkpoint inhibitors
└─ Run: "AI in Drug Discovery"
    └─ Query: AI drug discovery, machine learning pharmacology
```

**Run 配置**：
- Papers per run: 200-500
- Time range: 2020-2025
- `is_public=True`

---

### Step 2: 配置 Field → Run ID 映射

**方案：前端配置文件**（推荐 ⭐⭐⭐⭐⭐）

**已创建的配置文件**：
- `frontend/src/lib/seoFieldConfig.ts` - Field 配置和映射
- `frontend/src/lib/seoFieldApi.ts` - API 封装函数

**更新步骤**：

1. **记录 run IDs**：创建 runs 后，记录每个 run 的 ID

2. **更新配置文件** `seoFieldConfig.ts`：
   ```typescript
   export const SEO_PROJECT_ID = "abc123def456"; // 替换为实际 project ID

   export const FIELD_CONFIGS = {
     "brain-computer-interface": {
       slug: "brain-computer-interface",
       name: "Brain-Computer Interface (BCI)",
       runId: "bci789xyz", // 替换为实际 run ID
       projectId: SEO_PROJECT_ID,
       description: "...",
       keywords: ["BCI", "brain-computer interface", ...],
       priority: 1,
     },
     // ... 其他领域
   };
   ```

**配置文件优势**：
- ✅ 零数据库修改
- ✅ 类型安全（TypeScript）
- ✅ 集中管理
- ✅ 立即可用

---

### Step 3: 前端实现（Week 4）

1. **创建路由结构**
   - `frontend/src/app/research-jobs/[fieldSlug]/page.tsx`
   - `frontend/src/app/research-jobs/[fieldSlug]/country/[countrySlug]/page.tsx`
   - `frontend/src/app/research-jobs/[fieldSlug]/city/[citySlug]/page.tsx`

2. **内容生成器**
   - `frontend/src/lib/seoFieldContent.ts` - 领域内容模板

3. **在页面中使用配置**

   **示例：Field Overview Page**
   ```typescript
   import { getFieldConfig, getAllFieldConfigs } from '@/lib/seoFieldConfig';
   import { fetchFieldWorldData, getFieldDemoRunUrl } from '@/lib/seoFieldApi';

   export async function generateStaticParams() {
     const fields = getAllFieldConfigs();
     return fields.map((field) => ({ fieldSlug: field.slug }));
   }

   export default async function FieldOverviewPage({
     params,
   }: {
     params: { fieldSlug: string };
   }) {
     const { fieldSlug } = params;
     const fieldConfig = getFieldConfig(fieldSlug);
     
     // 自动使用配置中的 run ID 获取数据
     const worldData = await fetchFieldWorldData(fieldSlug);
     const demoRunUrl = getFieldDemoRunUrl(fieldSlug);

     return (
       <div>
         <h1>{fieldConfig.name} Research Opportunities</h1>
         <p>{fieldConfig.description}</p>
         {/* 显示数据 */}
         <a href={demoRunUrl}>Explore Interactive Map</a>
       </div>
     );
   }
   ```

   **示例：Field × Country Page**
   ```typescript
   import { fetchFieldCountryData } from '@/lib/seoFieldApi';
   import { getFieldConfig } from '@/lib/seoFieldConfig';

   export default async function FieldCountryPage({
     params,
   }: {
     params: { fieldSlug: string; countrySlug: string };
   }) {
     const { fieldSlug, countrySlug } = params;
     const fieldConfig = getFieldConfig(fieldSlug);
     const country = slugToCountryName(countrySlug);
     
     // 自动使用正确的 run ID
     const countryData = await fetchFieldCountryData(fieldSlug, country);

     return (
       <div>
         <h1>{fieldConfig.name} Research in {country}</h1>
         {/* 显示数据 */}
       </div>
     );
   }
   ```

4. **Sitemap 扩展**
   - 在 `sitemap.ts` 中使用 `getAllFieldConfigs()` 生成 field URLs
   - 新增约 160 URLs（5 fields × 32 pages/field）

---

### Step 4: SEO 优化（Week 4）

**Metadata**：
- Title: "{Field} Research in {Location} | Top Labs & Opportunities"
- Description: "Discover {scholar_count} researchers in {field} across {institution_count} institutions in {location}"

**Structured Data**：
- `ResearchProject` schema
- `Place` schema
- `BreadcrumbList`
- `FAQPage`

**Internal Linking**：
- 宽泛页面 → 领域页面
- 领域概览 → 领域 × 地理
- 交叉链接：城市页面 ↔ 领域 × 城市页面

---

## 📈 预期效果

### 3 个月内

- 🎯 80%+ 页面被索引
- 🎯 20+ 关键词进入 Top 20
- 🎯 500+ 有机访问/月
- 🎯 转化率 15-20%

### 6 个月内

- 🎯 100% 页面被索引
- 🎯 50+ 关键词进入 Top 10
- 🎯 2,000+ 有机访问/月
- 🎯 转化率 20-25%
- 🎯 多个领域关键词排名第 1

---

## 💰 ROI 分析

| 指标 | Phase 1-2 | Phase 3 | 提升 |
|------|----------|---------|------|
| **平均排名时间** | 6-12 月 | 1-2 月 | **6x 更快** |
| **转化率** | 5-10% | 15-25% | **3x 更高** |
| **关键词竞争** | 中等 | 低/零 | **更易排名** |
| **内容成本** | 中等 | 低 | **模板化** |

**结论**：Phase 3 是**最高 ROI** 的 SEO 投资。

---

## ✅ 成功标准

开始 Phase 4 前，确保：

- [ ] 5 个领域页面上线
- [ ] 至少 3 个领域关键词进入 Top 20
- [ ] 领域页面转化率 > 宽泛页面 10%
- [ ] 无技术 SEO 错误
- [ ] 用户停留时间 > 2 分钟

---

## 🔧 维护流程

### 添加新领域的步骤

1. **在 super user 账号创建新 run**
   - Project: SEO Content
   - Description: 领域描述（如 "Stem Cell Research"）
   - 运行 Phase 1 和 Phase 2
   - 确保 `is_public=True`

2. **记录 run ID**
   - 从 URL 或数据库获取新 run 的 ID

3. **更新 `seoFieldConfig.ts`**
   ```typescript
   "stem-cell-research": {
     slug: "stem-cell-research",
     name: "Stem Cell Research",
     runId: "新run的ID",
     projectId: SEO_PROJECT_ID,
     description: "Stem cell and regenerative medicine research",
     keywords: ["stem cell", "regenerative medicine", ...],
     priority: 6,
   },
   ```

4. **提交代码并部署**
   ```bash
   git add frontend/src/lib/seoFieldConfig.ts
   git commit -m "feat: add stem cell research field config"
   git push origin main
   ```

5. **验证**
   - 访问 `/research-jobs/stem-cell-research`
   - 确认数据正确显示
   - 检查 sitemap 是否包含新 URLs

---

## ⚠️ 注意事项

### Run 配置要求
- **Papers per run**: 200-500 篇（足够生成地理分布）
- **Time range**: 最近 5 年（2020-2025）
- **Public access**: 必须设置 `is_public=True`
- **Description**: 使用清晰的领域描述

### SEO 内容要求
- **每个页面至少 600 字**独特内容
- **避免完全模板化**：每个领域需要独特的介绍
- **关键词自然融入**：不要堆砌关键词
- **定期更新**：每季度检查 run 数据是否需要更新

### 性能考虑
- **ISR 缓存**: 24 小时重新验证
- **API 调用优化**: 使用配置文件避免重复查询
- **Sitemap 大小**: 当前 ~160 URLs，远低于 50,000 限制

---

## 🎯 下一步行动

### 本周（数据准备）
1. ✅ 创建配置文件（已完成）
2. [ ] 在 super user 账号创建 SEO project
3. [ ] 运行 5 个优先领域的搜索：
   - [ ] Brain-Computer Interface (BCI)
   - [ ] Neural Modulation (tDCS/TMS)
   - [ ] CRISPR Gene Editing
   - [ ] Cancer Immunotherapy
   - [ ] AI in Drug Discovery
4. [ ] 验证 run 数据质量（200+ papers，地理分布合理）
5. [ ] 记录所有 project ID 和 run IDs
6. [ ] 更新 `seoFieldConfig.ts`

### 下周（前端实现）
1. [ ] 实现领域页面路由
   - [ ] Field overview page
   - [ ] Field × Country page
   - [ ] Field × City page
2. [ ] 创建内容生成器 `seoFieldContent.ts`
3. [ ] 集成 field config 到页面
4. [ ] 扩展 sitemap（使用 `getAllFieldConfigs()`）
5. [ ] 添加 metadata 和 structured data
6. [ ] 实现 internal linking
7. [ ] GA4 tracking 集成
8. [ ] 本地测试
9. [ ] 部署上线

### Week 3（验证和优化）
1. [ ] Google Search Console 提交 sitemap
2. [ ] 监控索引状态
3. [ ] 检查 Lighthouse SEO 分数
4. [ ] 验证 GA4 事件追踪
5. [ ] 测试用户体验
6. [ ] 收集反馈并优化

---

## 📚 相关文件

### 配置文件
- `frontend/src/lib/seoFieldConfig.ts` - Field 配置映射
- `frontend/src/lib/seoFieldApi.ts` - API 封装函数

### 路由文件（待创建）
- `frontend/src/app/research-jobs/[fieldSlug]/page.tsx`
- `frontend/src/app/research-jobs/[fieldSlug]/country/[countrySlug]/page.tsx`
- `frontend/src/app/research-jobs/[fieldSlug]/city/[citySlug]/page.tsx`

### 内容生成器（待创建）
- `frontend/src/lib/seoFieldContent.ts`

### 参考文档
- `documents/SEO/ScholarMap_Search_Intent_SEO_Plan.md` - 总体 SEO 规划

---

**文档版本**: 1.1  
**创建日期**: 2026-01-22  
**最后更新**: 2026-01-22  
**状态**: 📋 Planning → 🔧 配置完成 → 待数据准备

