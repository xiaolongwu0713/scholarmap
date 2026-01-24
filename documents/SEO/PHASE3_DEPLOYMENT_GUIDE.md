# Phase 3 部署和验证指南

**快速参考** - 部署 Phase 3 领域特定 SEO 页面

---

## 🚀 部署步骤

### 1. 本地测试 (5-10 分钟)

在部署前,先在本地测试:

```bash
cd /Users/xiaowu/local_code/scholarmap/frontend
npm run dev
```

**测试这些 URLs**:
```
http://localhost:3000/research-jobs/brain-computer-interface
http://localhost:3000/research-jobs/brain-computer-interface/country/united-states
http://localhost:3000/research-jobs/brain-computer-interface/city/boston
http://localhost:3000/sitemap.xml
```

**检查点**:
- [ ] 页面正常渲染,无 404 错误
- [ ] 内容显示正确 (researcher count, institution count)
- [ ] "View Interactive Map" 按钮链接到正确的 demo run
- [ ] 交叉链接工作正常
- [ ] Sitemap 包含新的领域页面
- [ ] 控制台无错误

---

### 2. Git Commit 和 Push

确认本地测试通过后,提交代码:

```bash
cd /Users/xiaowu/local_code/scholarmap

# 查看修改
git status

# 添加所有修改
git add frontend/src/lib/seoFieldContent.ts
git add frontend/src/app/research-jobs/\[fieldSlug\]/
git add frontend/src/app/sitemap.ts
git add frontend/src/app/research-jobs/country/\[countrySlug\]/page.tsx
git add frontend/src/app/research-jobs/city/\[citySlug\]/page.tsx
git add documents/SEO/

# 提交
git commit -m "feat: implement Phase 3 field-specific SEO pages

- Add 5 research fields (BCI, Neural Modulation, CRISPR, Immunotherapy, AI Drug Discovery)
- Create field overview pages (5 URLs)
- Create field × country pages (~50 URLs)
- Create field × city pages (~25 URLs)
- Add field content generator with 800-1000 word templates
- Expand sitemap to include field-specific pages
- Add cross-links between country/city and field pages
- Implement full metadata, structured data, and GA4 tracking
- Total: ~80 new SEO pages targeting long-tail keywords"

# Push 到远程
git push origin main
```

---

### 3. 部署到生产环境

如果使用 Render 或类似平台:
- Push 后会自动触发部署
- 等待构建完成 (~5-10 分钟)
- 查看构建日志确认无错误

---

### 4. 生产环境验证 (10-15 分钟)

部署完成后,立即验证:

**测试 URLs** (替换为你的域名):
```
https://scholarmap-frontend.onrender.com/research-jobs/brain-computer-interface
https://scholarmap-frontend.onrender.com/research-jobs/crispr-gene-editing
https://scholarmap-frontend.onrender.com/research-jobs/cancer-immunotherapy
https://scholarmap-frontend.onrender.com/research-jobs/neural-modulation/country/united-states
https://scholarmap-frontend.onrender.com/research-jobs/ai-drug-discovery/city/boston
```

**验证检查点**:
- [ ] 页面加载速度 < 3 秒
- [ ] 所有统计数据正确显示
- [ ] Demo run 链接正确 (点击测试)
- [ ] GA4 事件正常触发 (检查开发者工具 Network tab)
- [ ] 移动端显示正常
- [ ] SEO meta tags 正确 (查看页面源码)

**Sitemap 验证**:
```
https://scholarmap-frontend.onrender.com/sitemap.xml
```
- [ ] 包含 ~336 URLs (之前 256 + 新增 80)
- [ ] 所有 field URLs 格式正确
- [ ] 没有重复 URLs

---

### 5. Google Search Console 提交 (5 分钟)

**立即提交新 sitemap**:

1. 访问 [Google Search Console](https://search.google.com/search-console)
2. 选择你的网站
3. 左侧菜单 → **Sitemaps**
4. 输入: `sitemap.xml`
5. 点击 **Submit**

**请求索引关键页面**:

在 GSC 中,使用 **URL Inspection** 工具请求索引这些页面:
```
/research-jobs/brain-computer-interface
/research-jobs/crispr-gene-editing
/research-jobs/cancer-immunotherapy
/research-jobs/neural-modulation
/research-jobs/ai-drug-discovery
```

对每个页面:
1. 输入完整 URL
2. 点击 "Request Indexing"
3. 等待确认

---

## 📊 监控和分析

### Google Analytics 4

**查看 GA4 事件** (24h 后):
1. 访问 [Google Analytics](https://analytics.google.com)
2. Reports → Engagement → Events
3. 查找这些事件:
   - `seo_field_to_demo_click`
   - `seo_field_country_link_click`
   - `seo_field_city_link_click`
   - `seo_to_signup_start`

### Google Search Console

**监控索引状态** (每周检查):
1. Coverage → Valid pages (应该增加 ~80)
2. Performance → 查看新页面的 impressions
3. Enhancements → 确保无错误

---

## 🔍 常见问题排查

### 问题 1: 页面显示 404
**原因**: 静态参数生成失败或 API 调用错误

**排查**:
```bash
# 检查构建日志
# 查找 "Error generating static params" 错误

# 测试 API 调用
curl https://scholarmap-backend.onrender.com/api/projects/3b9280a68d3d/runs/b6b977aeeed1/map/world
```

**解决**:
- 确认所有 run IDs 在 `seoFieldConfig.ts` 中正确
- 确认 runs 的 `is_public=True`
- 检查 API 是否可访问

---

### 问题 2: 页面无数据显示
**原因**: API 响应为空或格式不对

**排查**:
- 打开浏览器开发者工具 → Network tab
- 刷新页面,查看 API 调用
- 检查响应数据格式

**解决**:
- 确认 run 中有足够的数据 (200+ papers)
- 检查 run 的地理数据是否正确提取

---

### 问题 3: Demo run 链接不正确
**原因**: Project ID 或 Run ID 配置错误

**排查**:
- 查看页面源码,检查 demo run URL
- 对比 `seoFieldConfig.ts` 中的配置

**解决**:
- 更新 `seoFieldConfig.ts` 中的 `projectId` 和 `runId`
- 重新部署

---

### 问题 4: Sitemap 生成慢或超时
**原因**: API 调用过多,顺序执行导致超时

**解决**:
- Sitemap 已优化为批量并行处理
- 如果仍超时,考虑减少 `generateStaticParams` 中的数量
- 或使用完全动态路由 (删除 `generateStaticParams`)

---

## 📈 预期时间线

### 第 1 天 (部署后)
- ✅ 页面可访问
- ✅ Sitemap 已提交
- ✅ 主要页面请求索引

### 第 1 周
- 🔄 Google 开始爬取新页面
- 🔄 部分页面开始被索引
- 🔄 GSC 显示新页面数据

### 第 2-4 周
- 📈 50-80% 页面被索引
- 📈 开始出现在搜索结果 (长尾关键词)
- 📈 有机流量小幅增长

### 第 2-3 月
- 🎯 大部分页面排名稳定
- 🎯 长尾关键词进入 Top 10-20
- 🎯 有机流量显著增长
- 🎯 转化率提升

---

## ✅ 验证清单

### 部署前
- [x] 本地测试通过
- [x] 无 linter 错误
- [x] 代码已 commit

### 部署后 (立即)
- [ ] 生产环境页面可访问
- [ ] Sitemap 正确生成
- [ ] Demo run 链接正确
- [ ] 无控制台错误
- [ ] 移动端正常

### 第 1 天
- [ ] GSC sitemap 已提交
- [ ] 5 个领域页面请求索引
- [ ] GA4 事件正常触发

### 第 1 周
- [ ] GSC 开始显示新页面数据
- [ ] Lighthouse SEO 分数 > 90
- [ ] 页面性能正常

### 第 1 月
- [ ] 至少 40 个页面被索引
- [ ] 部分关键词开始排名
- [ ] 有机流量增长

---

## 🎯 成功指标

### 技术指标
- ✅ 80+ 新页面部署
- ✅ Sitemap 包含所有新 URLs
- ✅ 所有页面 < 3s 加载时间
- ✅ Lighthouse SEO > 90

### SEO 指标 (3 个月)
- 🎯 80% 页面被 Google 索引
- 🎯 20+ 关键词进入 Top 20
- 🎯 500+ 有机访问/月
- 🎯 10+ featured snippets

### 业务指标 (3 个月)
- 🎯 SEO → Demo 转化率 15-20%
- 🎯 SEO → Signup 转化率 5-10%
- 🎯 有机流量占比 +10%

---

## 🆘 需要帮助?

如果遇到问题:
1. 查看 [PHASE3_IMPLEMENTATION_COMPLETE.md](./PHASE3_IMPLEMENTATION_COMPLETE.md)
2. 检查 [PHASE3_FIELD_SPECIFIC_STRATEGY.md](./PHASE3_FIELD_SPECIFIC_STRATEGY.md)
3. 查看构建日志和控制台错误
4. 测试 API 端点响应

---

**Document Version**: 1.0  
**Created**: 2026-01-24  
**Type**: Deployment Guide  
**Next Step**: Deploy to production!
