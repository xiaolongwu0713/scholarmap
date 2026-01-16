# SEO 优化快速检查清单

## 🚀 部署前检查

### 基础 SEO
- [ ] 所有页面都有独特的 `<title>` 标签
- [ ] 所有页面都有 `meta description`（150-160 字符）
- [ ] H1 标签在每个页面只使用一次
- [ ] 标题层级正确（H1 → H2 → H3）
- [ ] 所有图片都有 alt 属性
- [ ] 所有链接都有描述性文本（避免 "点击这里"）
- [ ] URL 结构清晰且包含关键词

### 技术 SEO
- [ ] 网站使用 HTTPS
- [ ] sitemap.xml 已创建并提交
- [ ] robots.txt 已正确配置
- [ ] Canonical URLs 已设置
- [ ] 404 页面已自定义
- [ ] 301 重定向已正确配置
- [ ] 网站速度优化（< 3 秒加载）
- [ ] 移动端友好（响应式设计）

### 结构化数据
- [ ] Schema.org 标记已添加
- [ ] 使用 Google Rich Results Test 验证
- [ ] Organization Schema 已配置
- [ ] WebApplication Schema 已配置
- [ ] FAQ Schema（如适用）
- [ ] BreadcrumbList Schema 已添加

### 内容优化
- [ ] 关键词研究已完成
- [ ] 目标关键词已自然融入内容
- [ ] 内容质量高、原创
- [ ] 内容长度适中（至少 300 字）
- [ ] 内部链接已优化
- [ ] 外部链接已添加（高质量网站）

### 社交媒体
- [ ] Open Graph 标签已配置
- [ ] Twitter Card 标签已配置
- [ ] OG 图片已优化（1200x630px）
- [ ] 社交分享按钮已添加

### Google 工具
- [ ] Google Search Console 已验证
- [ ] Google Analytics 已集成
- [ ] Sitemap 已提交到 GSC
- [ ] 主要页面已请求索引

## 📊 部署后验证

### 立即检查（部署后 5 分钟内）
```bash
# 1. 验证网站可访问
curl -I https://scholarmap-frontend.onrender.com/

# 2. 检查 robots.txt
curl https://scholarmap-frontend.onrender.com/robots.txt

# 3. 检查 sitemap.xml
curl https://scholarmap-frontend.onrender.com/sitemap.xml

# 4. 检查 manifest.json
curl https://scholarmap-frontend.onrender.com/manifest.json
```

### 浏览器检查
- [ ] 打开首页，查看源代码
- [ ] 确认所有 meta 标签存在
- [ ] 检查结构化数据（搜索 "application/ld+json"）
- [ ] 验证 canonical URL
- [ ] 检查 Open Graph 标签

### 工具验证
- [ ] [Google PageSpeed Insights](https://pagespeed.web.dev/)
  - 目标：移动端和桌面端都 > 90 分
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results)
  - 确认结构化数据有效
- [ ] [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
  - 确认移动端友好
- [ ] [Schema Markup Validator](https://validator.schema.org/)
  - 验证 JSON-LD 格式
- [ ] [SEO Site Checkup](https://seositecheckup.com/)
  - 全面的 SEO 审计

### Search Console 设置
- [ ] 添加并验证属性
- [ ] 提交 sitemap
- [ ] 启用电子邮件通知
- [ ] 设置 URL 检查工具
- [ ] 请求索引主要页面

### Analytics 设置
- [ ] 验证 GA 代码工作
- [ ] 设置目标转化
- [ ] 配置事件跟踪
- [ ] 排除内部流量

## 🔍 持续监控（每周）

### Search Console 检查
- [ ] 查看搜索性能报告
  - 展示次数趋势
  - 点击率 (CTR)
  - 平均排名
- [ ] 检查覆盖率问题
  - 索引的页面
  - 排除的页面
  - 错误
- [ ] 查看 Core Web Vitals
  - LCP (< 2.5s)
  - FID (< 100ms)
  - CLS (< 0.1)
- [ ] 检查移动可用性
- [ ] 查看结构化数据报告

### Analytics 检查
- [ ] 查看流量来源
- [ ] 分析用户行为
- [ ] 检查跳出率
- [ ] 查看转化率
- [ ] 识别热门页面

### 性能监控
- [ ] 使用 Lighthouse 运行审计
- [ ] 检查页面加载时间
- [ ] 监控服务器响应时间
- [ ] 检查是否有 404 错误

## 📈 月度任务

### 内容审计
- [ ] 审查页面内容
- [ ] 更新过时信息
- [ ] 添加新内容（博客文章）
- [ ] 优化低表现页面
- [ ] 检查内部链接

### 关键词分析
- [ ] 分析 Search Console 查询数据
- [ ] 识别新的关键词机会
- [ ] 优化现有关键词
- [ ] 更新 meta 描述

### 竞争对手分析
- [ ] 检查竞争对手排名
- [ ] 分析他们的关键词
- [ ] 学习他们的内容策略
- [ ] 识别反向链接机会

### 技术审计
- [ ] 检查断开的链接
- [ ] 验证重定向
- [ ] 审查 sitemap 更新
- [ ] 检查 robots.txt
- [ ] 验证结构化数据

## 🎯 季度目标

### Q1 2026
- [ ] 在 Google 前 10 页获得至少 1 个关键词排名
- [ ] 自然搜索流量增长 50%
- [ ] 索引页面数 > 10

### Q2 2026
- [ ] 在 Google 前 3 页获得至少 3 个关键词排名
- [ ] 自然搜索流量增长 100%
- [ ] 创建 5+ 博客文章

### Q3 2026
- [ ] 在 Google 首页获得至少 5 个关键词排名
- [ ] 自然搜索流量增长 200%
- [ ] 获得 10+ 高质量反向链接

### Q4 2026
- [ ] 在 Google 前 3 位获得至少 2 个关键词排名
- [ ] 自然搜索流量成为主要流量来源
- [ ] 品牌搜索量显著增长

## 🚨 紧急问题处理

### 如果网站突然消失在搜索结果中
1. 检查 Google Search Console 是否有手动操作
2. 验证网站是否可访问
3. 检查 robots.txt 是否意外阻止了爬虫
4. 确认没有 noindex 标签
5. 检查是否有服务器错误

### 如果排名突然下降
1. 检查竞争对手是否有新内容
2. 查看 Search Console 是否有新问题
3. 验证 Core Web Vitals
4. 检查是否有 Google 算法更新
5. 审查最近的网站更改

### 如果流量异常下降
1. 检查 Analytics 是否正常工作
2. 查看是否有技术问题（404、500 错误）
3. 验证所有页面是否正常加载
4. 检查服务器日志
5. 查看 Search Console 的抓取统计

## 📚 有用资源

### 官方文档
- [Google Search Central](https://developers.google.com/search)
- [Next.js SEO 指南](https://nextjs.org/learn/seo/introduction-to-seo)
- [Schema.org](https://schema.org/)

### 工具
- [Google Search Console](https://search.google.com/search-console)
- [Google Analytics](https://analytics.google.com/)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Ahrefs](https://ahrefs.com/) (付费)
- [SEMrush](https://www.semrush.com/) (付费)
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/)

### 社区
- [r/SEO on Reddit](https://www.reddit.com/r/SEO/)
- [r/TechSEO on Reddit](https://www.reddit.com/r/TechSEO/)
- [Moz Blog](https://moz.com/blog)
- [Search Engine Journal](https://www.searchenginejournal.com/)

## ✅ 本次优化完成状态

### ✅ 已完成（2026-01-16）
- [x] 增强的 Metadata（title, description, keywords）
- [x] Open Graph 和 Twitter Card 标签
- [x] 6 种结构化数据 Schema
- [x] 改进的 sitemap.xml
- [x] 动态 sitemap 生成器（sitemap.ts）
- [x] 优化的 robots.txt
- [x] 动态 robots 生成器（robots.ts）
- [x] Canonical URL 组件
- [x] Web App Manifest
- [x] Next.js 配置优化
- [x] SEO 优化文档

### 📋 下一步行动
1. **立即**: 部署并验证所有更改
2. **本周**: 提交 sitemap 到 Google Search Console
3. **下周**: 运行性能测试并优化图片
4. **本月**: 创建博客/资源页面，添加更多内容

---

**最后更新**: 2026-01-16  
**下次审查**: 2026-01-23

