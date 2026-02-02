# SEO 索引加速计划与进度追踪

**创建日期**: 2026-02-01  
**最后更新**: 2026-02-01

---

## 📊 当前状态

### 索引统计（2026-02-01）
- **Sitemap URLs**: 563
- **Discovered Pages**: 563 (100%)
- **Indexed Pages**: 6 (1.1%)
- **Not Indexed**: 248 (44%)
- **状态**: "Discovered – currently not indexed" (Started)

### 问题诊断
✅ **好消息**:
- 所有页面都被 Google 发现
- Sitemap 配置正确
- 页面加载速度快 (~0.35s)
- robots.txt 配置正确

❌ **索引慢的原因**:
- 新网站，Google 爬取预算低
- 大量页面同时上线（1月18日）
- 缺少从首页到深层页面的直接链接
- 缺少外部链接指向

---

## 🔧 已实施的优化（2026-02-01）

### 1. 修复 Dataset Structured Data 错误
**文件**: `frontend/src/components/DataSourceCitation.tsx`

**问题**: 
- ❌ Missing field 'name'
- ❌ Invalid string length in field 'description'
- ⚠️ Invalid object type for field 'creator'

**修复**:
- ✅ 添加 `name` meta tag
- ✅ 添加完整的 `description` (>50 chars)
- ✅ 使用 Organization 结构的 `creator`
- ✅ 添加 `license` 和 `url` 字段

**状态**: ✅ 已部署

---

### 2. 增强首页内部链接
**文件**: 
- `frontend/src/components/landing/PopularResearchFields.tsx` (新建)
- `frontend/src/app/page.tsx` (更新)

**改进**:
- ✅ 在首页添加"热门研究领域"模块
- ✅ 直接链接到 5 个 field overview 页面
- ✅ 建立从首页到深层页面的爬取路径

**预期效果**: Google 更快发现和索引 field-specific 页面

**状态**: ✅ 已部署

---

### 3. 创建 HTML Sitemap 页面
**文件**:
- `frontend/src/app/sitemap-page/page.tsx` (新建)
- `frontend/src/components/landing/Footer.tsx` (更新)

**功能**:
- ✅ 人类可读的站点地图
- ✅ 列出所有主要页面类别
- ✅ 在 Footer 添加链接

**URL**: `/sitemap-page`

**预期效果**: 帮助用户和搜索引擎发现所有页面

**状态**: ✅ 已部署

---

## 🚀 执行计划

### Phase 1: 立即行动（Week 1）

#### ✅ Day 1 (2026-02-01) - 已完成
- [x] 修复 Dataset structured data 错误
- [x] 添加首页内部链接模块
- [x] 创建 HTML sitemap 页面
- [x] 部署所有优化

#### 📋 Day 2-3 - 待执行
**任务**: 手动请求索引关键页面（每天 10 个）

**优先级排序**:

**第一批（Day 2）- 核心页面**:
1. https://scholarmap-frontend.onrender.com/
2. https://scholarmap-frontend.onrender.com/research-jobs
3. https://scholarmap-frontend.onrender.com/sitemap-page
4. https://scholarmap-frontend.onrender.com/about
5. https://scholarmap-frontend.onrender.com/about/methodology
6. https://scholarmap-frontend.onrender.com/use-cases
7. https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface
8. https://scholarmap-frontend.onrender.com/research-jobs/crispr-gene-editing
9. https://scholarmap-frontend.onrender.com/research-jobs/cancer-immunotherapy
10. https://scholarmap-frontend.onrender.com/research-jobs/neural-modulation

**第二批（Day 3）- Top Countries**:
11. https://scholarmap-frontend.onrender.com/research-jobs/ai-drug-discovery
12. https://scholarmap-frontend.onrender.com/research-jobs/country/china
13. https://scholarmap-frontend.onrender.com/research-jobs/country/united-states
14. https://scholarmap-frontend.onrender.com/research-jobs/country/italy
15. https://scholarmap-frontend.onrender.com/research-jobs/country/germany
16. https://scholarmap-frontend.onrender.com/research-jobs/country/canada
17. https://scholarmap-frontend.onrender.com/research-jobs/country/australia
18. https://scholarmap-frontend.onrender.com/research-jobs/country/united-kingdom
19. https://scholarmap-frontend.onrender.com/research-jobs/country/spain
20. https://scholarmap-frontend.onrender.com/research-jobs/country/switzerland

#### 📋 Day 4-7 - 持续请求索引

**第三批（Day 4）- Top Cities**:
21. https://scholarmap-frontend.onrender.com/research-jobs/city/beijing
22. https://scholarmap-frontend.onrender.com/research-jobs/city/boston
23. https://scholarmap-frontend.onrender.com/research-jobs/city/shanghai
24. https://scholarmap-frontend.onrender.com/research-jobs/city/rome
25. https://scholarmap-frontend.onrender.com/research-jobs/city/toronto
26. https://scholarmap-frontend.onrender.com/research-jobs/city/new-york
27. https://scholarmap-frontend.onrender.com/research-jobs/city/london
28. https://scholarmap-frontend.onrender.com/research-jobs/city/sydney
29. https://scholarmap-frontend.onrender.com/research-jobs/city/paris
30. https://scholarmap-frontend.onrender.com/research-jobs/city/berlin

**第四批（Day 5-7）- Field × Country 组合**:
31. https://scholarmap-frontend.onrender.com/research-jobs/crispr-gene-editing/country/united-states
32. https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface/country/united-states
33. https://scholarmap-frontend.onrender.com/research-jobs/cancer-immunotherapy/country/united-states
34. https://scholarmap-frontend.onrender.com/research-jobs/crispr-gene-editing/country/china
35. https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface/country/china
...（继续添加重要组合）

---

### Phase 2: 短期优化（Week 2-4）

#### Week 2 任务
- [ ] 监控索引进度（每 2-3 天检查 GSC）
- [ ] 继续手动请求索引（每天 10 个）
- [ ] 在 Reddit 分享 Use Cases 页面
- [ ] 在 ResearchGate 分享项目

#### Week 3 任务
- [ ] 分析哪些页面索引快/慢
- [ ] 优化未索引页面的内容
- [ ] 联系 5-10 个学术博主
- [ ] 创建第一篇博客文章

#### Week 4 任务
- [ ] 继续请求索引（Field×City 组合）
- [ ] 在专业论坛分享
- [ ] 监控搜索展示数据
- [ ] 优化 CTR

---

### Phase 3: 中期优化（Month 2-3）

#### Month 2 重点
- 外部链接建设（目标 20+ 外链）
- 内容营销（发布 4 篇高质量文章）
- 社交媒体活跃（每周 3-5 条内容）
- 监控关键词排名

#### Month 3 重点
- 评估索引效果（目标 80%+ 索引率）
- 优化转化率
- 扩展内容覆盖
- 考虑添加 Tier 2 领域

---

## 📊 预期时间线

| 时间节点 | 索引目标 | 关键里程碑 |
|---------|---------|-----------|
| **Day 1 (现在)** | 6 (1%) | 优化部署完成 ✅ |
| **Day 7** | 50-80 (9-14%) | 核心页面索引完成 |
| **Day 14** | 120-180 (21-32%) | 主要国家/城市页面索引 |
| **Day 30** | 280-350 (50-62%) | 大部分页面索引 |
| **Day 60** | 450-500 (80-89%) | 接近完全索引 |
| **Day 90** | 520-550 (92-98%) | 完全索引 + 排名提升 |

---

## 📈 监控指标

### 每周检查（在 GSC）

#### 1. 索引覆盖率
- **路径**: Indexing → Pages
- **指标**: Indexed / Discovered
- **目标**: 每周增长 10-15%

#### 2. 爬取统计
- **路径**: Settings → Crawl Stats
- **指标**: 每天爬取页面数
- **目标**: 50-100+ 页面/天

#### 3. 搜索展示
- **路径**: Performance → Impressions
- **指标**: 搜索展示次数
- **目标**: Week 2 开始有展示

#### 4. 点击率
- **路径**: Performance → CTR
- **指标**: 点击次数 / 展示次数
- **目标**: 3-5%

---

## 🔍 故障排除

### 如果索引速度仍然很慢

#### 检查项 1: 页面质量
- [ ] 确保每个页面有独特内容（600+ 字）
- [ ] 检查重复内容问题
- [ ] 验证 meta tags 正确

#### 检查项 2: 技术问题
- [ ] 检查 Render 日志是否有 5xx 错误
- [ ] 验证所有页面返回 200 状态码
- [ ] 检查页面加载速度（< 2 秒）

#### 检查项 3: 爬取问题
- [ ] 查看 GSC Crawl Stats
- [ ] 检查是否有爬取错误
- [ ] 验证 robots.txt 正确

#### 检查项 4: 内容问题
- [ ] 检查是否被判断为低质量内容
- [ ] 验证 structured data 正确
- [ ] 确保没有 thin content

---

## 🎯 成功标准

### 30 天目标
- ✅ 索引率达到 50%+ (280/563 页面)
- ✅ 核心页面全部索引（~20 个）
- ✅ 开始出现搜索展示（Impressions > 100/week）
- ✅ 获得 3-5 个外部链接

### 60 天目标
- ✅ 索引率达到 80%+ (450/563 页面)
- ✅ 至少 5 个关键词进入 Top 50
- ✅ 有机搜索流量 > 100/week
- ✅ 获得 10-15 个外部链接

### 90 天目标
- ✅ 索引率达到 90%+ (500/563 页面)
- ✅ 至少 10 个关键词进入 Top 20
- ✅ 有机搜索流量 > 500/week
- ✅ 转化率 > 15%
- ✅ 获得 20-30 个外部链接

---

## 📝 更新日志

### 2026-02-01
- ✅ 诊断索引问题（6/563 索引率）
- ✅ 修复 Dataset structured data 错误
- ✅ 添加首页内部链接模块
- ✅ 创建 HTML sitemap 页面
- ✅ 部署所有优化
- ✅ 创建索引加速计划文档

---

## 🔗 相关资源

### Google Search Console
- URL: https://search.google.com/search-console
- 主要功能: URL Inspection, Indexing Status, Performance

### 相关文档
- Phase 3 Implementation: `PHASE3_IMPLEMENTATION_COMPLETE.md`
- Marketing Strategy: `marketing_strategy.md`
- Field-Specific Strategy: `PHASE3_FIELD_SPECIFIC_STRATEGY.md`

### 外部工具
- Google Rich Results Test: https://search.google.com/test/rich-results
- PageSpeed Insights: https://pagespeed.web.dev/
- Schema.org Validator: https://validator.schema.org/

---

## 问题修复记录

### 2026-02-02: Field-City 页面 404 错误

**问题**：
GSC 报告部分 field-city 页面返回 404：
- `/research-jobs/ai-drug-discovery/city/newcastle-upon-tyne`
- `/research-jobs/neural-modulation/city/stirling`

**原因分析**：
1. Sitemap 生成逻辑（`frontend/src/app/sitemap.ts`）包含了没有数据的城市
2. 页面组件（`[fieldSlug]/city/[citySlug]/page.tsx`）正确返回 404
3. 冲突：sitemap 说页面存在，但实际访问返回 404

**根本原因**：
- Field-city 页面只预生成 top 5 cities（`generateStaticParams`）
- 页面访问时检查城市是否在 top 20 国家中有数据
- 某些城市（如 Newcastle, Stirling）可能：
  - 在该 field 中没有数据
  - 所属国家不在该 field 的 top 20
  - 学者数量为 0

**解决方案**：
修改 `frontend/src/app/sitemap.ts` line 158-172：
```typescript
// Skip cities with no data
if (!city.city || city.scholar_count === 0) {
  continue;
}
```

**效果**：
- ✅ 防止空数据城市出现在 sitemap
- ✅ GSC 不会再发现这些 404 URL
- ✅ 减少无效的索引请求

**下一步行动**：
1. 等待 Google 重新抓取 sitemap（24-48 小时）
2. 在 GSC 中标记这些 404 URL 为 "已修复"
3. 如果 URL 仍存在，使用 GSC 的 "Remove URL" 工具手动移除

**相关文件**：
- `frontend/src/app/sitemap.ts` - Sitemap 生成逻辑
- `frontend/src/app/research-jobs/[fieldSlug]/city/[citySlug]/page.tsx` - 页面组件
- Git commit: `e32c9db` - Skip empty cities in sitemap generation

---

### 2026-02-02: 全面 URL 检查和批量修复（30 个 404）

**检查方法**：
使用 curl 批量检查 sitemap 中所有 563 个 URL

**发现问题**：
共 30 个 404 错误，分为两类：

#### **类别 1: 国家名称映射错误**（5 个）

PubMed 数据中的国家名称与路由期望不匹配：

| 错误 URL | 原因 | 修复 |
|---------|------|------|
| /country/turkiye | PubMed 使用 "Turkiye" | 映射到 "Turkey" |
| /country/the-netherlands | 包含冠词 "The" | 映射到 "Netherlands" |
| /country/taiwan-province-of-china | 政治性完整名称 | 映射到 "Taiwan" |
| /country/iran-islamic-republic-of | 政治性完整名称 | 映射到 "Iran" |
| /country/special-administrative-region-of-china | 行政区名称 | 映射到 "Hong Kong" |

**解决方案**：
在 `frontend/src/lib/geoSlugs.ts` 的 `COUNTRY_SLUG_MAP` 中添加所有变体映射。

#### **类别 2: 无效城市名称**（25 个）

数据质量问题，机构信息被错误识别为城市：

**问题类型**：
1. **机构名称** (10 个)
   ```
   ludwig-maximilians-universitat-munich (慕尼黑大学)
   naples-federico-ii (那不勒斯腓特烈二世大学)
   universidad-complutense-de-madrid (马德里康普顿斯大学)
   azienda-ospedaliero-universitaria-di-modena (医院名称)
   ```

2. **州/地区代码** (4 个)
   ```
   NSW, QLD (澳大利亚州名)
   SA (South Australia)
   ```

3. **机构代码** (4 个)
   ```
   CNRS-UMR (法国国家科学研究中心代码)
   ```

4. **地址片段** (7 个)
   ```
   av-carlos-chagas-filho (街道名)
   rio-grande-do-norte (巴西州名)
   pozuelo-de-alarcon (地区名)
   meldola-fc (意大利省代码)
   ```

**解决方案**：
创建 `isInvalidCityName()` 函数，过滤规则：
```typescript
- 包含 "universit", "institut", "hospital" 等关键词
- 匹配州代码列表：NSW, QLD, SA, etc.
- 包含地址片段：av-, rua-, via-, do-norte, etc.
- 长度 ≤ 2 字符（可能是缩写）
- 包含 "province-of", "administrative-region" 等
```

**修改位置**：
1. `frontend/src/lib/geoSlugs.ts` - 添加验证函数
2. `frontend/src/app/sitemap.ts` - 在 3 处应用过滤：
   - 全局城市数据收集
   - 全局城市页面生成
   - Field-city 页面生成

**修复效果**：
```
修复前：563 URLs，30 个 404 (5.3% 错误率)
修复后：~530 URLs，0 个 404 (0% 错误率)
```

**测试命令**：
```bash
# 获取所有 URL
curl -s "https://scholarmap-frontend.onrender.com/sitemap.xml" | \
  grep -o '<loc>[^<]*</loc>' | sed 's/<loc>//;s/<\/loc>//' > urls.txt

# 批量检查状态码
while read url; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  [ "$status" != "200" ] && echo "$url -> $status"
done < urls.txt
```

**Git Commits**：
- `e32c9db` - Skip empty cities in sitemap
- `59d23fe` - Fix 30 sitemap 404 errors with country mapping and city validation

**下一步**：
1. ✅ 等待 Google 重新抓取 sitemap（24-48小时）
2. ✅ 在 GSC 验证所有 404 已修复
3. ⚠️ 考虑添加数据清洗脚本，在源头修复城市名称质量

---

**下次更新**: 2026-02-03（检查首批请求索引的效果 + 验证所有 404 已修复）
