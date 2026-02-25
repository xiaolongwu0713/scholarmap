# ScholarMap GEO 实施计划

## 📋 执行优先级

### 🔴 Phase 1: 基础设施（立即实施 - 本周）

**预计时间**: 4-6 小时  
**影响**: 高 - 让 AI 爬虫能够访问网站

#### 任务清单

- [ ] **Task 1.1**: 更新 `robots.txt`
  - **文件**: `frontend/public/robots.txt`
  - **时间**: 15 分钟
  - **优先级**: 🔴 最高
  
- [ ] **Task 1.2**: 创建 AI Plugin Manifest
  - **文件**: `frontend/public/.well-known/ai-plugin.json`
  - **时间**: 30 分钟
  - **优先级**: 🟠 高
  
- [ ] **Task 1.3**: 创建 AI Context 端点
  - **文件**: `frontend/src/app/api/ai/context/route.ts`
  - **时间**: 1 小时
  - **优先级**: 🟠 高
  
- [ ] **Task 1.4**: 添加 AI Summary Meta 标签
  - **文件**: 所有 research-jobs 页面的 `generateMetadata()` 函数
  - **时间**: 2 小时
  - **优先级**: 🟠 高

---

### 🟠 Phase 2: 内容优化（1-2 周）

**预计时间**: 12-16 小时  
**影响**: 中高 - 提升内容质量和可引用性

#### 任务清单

- [ ] **Task 2.1**: 创建 `AIContentSummary` 组件
  - **文件**: `frontend/src/components/AIContentSummary.tsx`
  - **时间**: 2 小时
  - **优先级**: 🟠 高
  
- [ ] **Task 2.2**: 集成到所有 SEO 页面
  - **文件**: 6 个 research-jobs 页面
  - **时间**: 3 小时
  - **优先级**: 🟠 高
  
- [ ] **Task 2.3**: 创建 `DataSourceCitation` 组件
  - **文件**: `frontend/src/components/DataSourceCitation.tsx`
  - **时间**: 1 小时
  - **优先级**: 🟡 中
  
- [ ] **Task 2.4**: 扩展 Schema.org Dataset 标记
  - **文件**: `frontend/src/components/AIEnhancedStructuredData.tsx`
  - **时间**: 2 小时
  - **优先级**: 🟡 中
  
- [ ] **Task 2.5**: 优化 FAQ 内容（AI 视角）
  - **文件**: `frontend/src/lib/seoFieldContent.ts` 和其他内容生成文件
  - **时间**: 4 小时
  - **优先级**: 🟡 中

---

### 🟡 Phase 3: API 端点（2-3 周）

**预计时间**: 8-12 小时  
**影响**: 中 - 为 AI 提供直接数据访问

#### 任务清单

- [ ] **Task 3.1**: 创建 Research Data API
  - **文件**: `frontend/src/app/api/ai/research-data/route.ts`
  - **时间**: 3 小时
  - **优先级**: 🟡 中
  
- [ ] **Task 3.2**: 创建 Stats API
  - **文件**: `frontend/src/app/api/ai/stats/route.ts`
  - **时间**: 2 小时
  - **优先级**: 🟡 中
  
- [ ] **Task 3.3**: 创建 OpenAPI 规范
  - **文件**: `frontend/public/.well-known/openapi.yaml`
  - **时间**: 3 小时
  - **优先级**: 🟢 低

---

### 🟢 Phase 4: 监控和验证（持续）

**预计时间**: 4-6 小时 设置 + 持续监控  
**影响**: 低 - 但对长期优化重要

#### 任务清单

- [ ] **Task 4.1**: 设置 AI 爬虫日志分析
  - **位置**: 后端分析脚本
  - **时间**: 2 小时
  - **优先级**: 🟢 低
  
- [ ] **Task 4.2**: 创建监控仪表板
  - **文件**: `frontend/src/app/admin/geo-analytics/page.tsx`
  - **时间**: 4 小时
  - **优先级**: 🟢 低
  
- [ ] **Task 4.3**: 设置 AI 引用追踪
  - **工具**: Google Alerts + 手动测试
  - **时间**: 持续
  - **优先级**: 🟢 低

---

## 📁 文件结构

### 新增文件

```
frontend/
├── public/
│   ├── robots.txt (更新)
│   └── .well-known/
│       ├── ai-plugin.json (新建)
│       └── openapi.yaml (新建)
│
├── src/
│   ├── app/
│   │   └── api/
│   │       └── ai/
│   │           ├── context/
│   │           │   └── route.ts (新建)
│   │           ├── research-data/
│   │           │   └── route.ts (新建)
│   │           └── stats/
│   │               └── route.ts (新建)
│   │
│   └── components/
│       ├── AIContentSummary.tsx (新建)
│       ├── AIEnhancedStructuredData.tsx (新建)
│       └── DataSourceCitation.tsx (新建)
│
documents/
├── GEO_STRATEGY.md (已创建)
└── GEO_IMPLEMENTATION_PLAN.md (本文件)
```

---

## 🎯 快速开始

### Step 1: 立即可以做的（5 分钟）

更新 `robots.txt`：

```bash
cd frontend/public
# 备份现有文件
cp robots.txt robots.txt.backup

# 使用新内容（见下方完整文件）
```

**新的 `robots.txt` 内容**：

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
```

### Step 2: 创建目录结构（2 分钟）

```bash
# 创建 .well-known 目录
mkdir -p frontend/public/.well-known

# 创建 AI API 目录
mkdir -p frontend/src/app/api/ai/context
mkdir -p frontend/src/app/api/ai/research-data
mkdir -p frontend/src/app/api/ai/stats
```

### Step 3: 测试 AI 爬虫访问（10 分钟）

部署更改后，测试 AI 爬虫是否能访问：

```bash
# 模拟 GPTBot
curl -H "User-Agent: GPTBot" https://scholarmap-frontend.onrender.com/research-jobs

# 模拟 PerplexityBot
curl -H "User-Agent: PerplexityBot" https://scholarmap-frontend.onrender.com/research-jobs/neuroscience

# 检查 robots.txt
curl https://scholarmap-frontend.onrender.com/robots.txt
```

---

## 📊 效果预测

### 短期效果（1-2 个月）

| 指标 | 当前 | 预期 | 提升 |
|------|------|------|------|
| AI 爬虫访问 | 0 | 500+/月 | ∞ |
| AI 引用次数 | 0 | 20+/月 | ∞ |
| 来自 AI 的流量 | 0% | 2-3% | +2-3% |

### 中期效果（3-6 个月）

| 指标 | 当前 | 预期 | 提升 |
|------|------|------|------|
| AI 爬虫访问 | 0 | 2000+/月 | ∞ |
| AI 引用次数 | 0 | 100+/月 | ∞ |
| 来自 AI 的流量 | 0% | 5-8% | +5-8% |
| 品牌认知度 | 低 | 中 | +50% |

### 长期效果（6-12 个月）

| 指标 | 当前 | 预期 | 提升 |
|------|------|------|------|
| AI 引用次数 | 0 | 500+/月 | ∞ |
| 来自 AI 的流量 | 0% | 10-15% | +10-15% |
| 权威性评分 | 未知 | 高 | 显著提升 |
| 用户注册（来自 AI） | 0 | 100+/月 | ∞ |

---

## ✅ 验证清单

### Phase 1 验证（基础设施）

- [ ] `robots.txt` 更新并部署
- [ ] AI 爬虫能访问 `/research-jobs` 路由
- [ ] `.well-known/ai-plugin.json` 可访问
- [ ] `/api/ai/context` 返回正确 JSON
- [ ] 所有 SEO 页面有 `ai-summary` meta 标签

### Phase 2 验证（内容优化）

- [ ] `AIContentSummary` 组件在所有页面渲染
- [ ] `DataSourceCitation` 组件显示
- [ ] Schema.org Dataset 标记验证通过
- [ ] FAQ 包含 AI 友好问答

### Phase 3 验证（API 端点）

- [ ] `/api/ai/research-data` 返回数据
- [ ] `/api/ai/stats` 返回统计
- [ ] OpenAPI 规范可访问

### Phase 4 验证（监控）

- [ ] 能够从日志中识别 AI 爬虫
- [ ] 监控仪表板显示访问数据
- [ ] 定期测试 AI 引用效果

---

## 🚨 常见问题

### Q1: 为什么要允许 AI 爬虫？

**A**: AI 爬虫（如 GPTBot）会访问您的网站来训练模型或获取实时信息。如果您的内容被 AI 理解和引用，用户可能通过 AI 对话发现您的平台。

### Q2: 会增加服务器负载吗？

**A**: 会有轻微增加，但 AI 爬虫通常遵守 robots.txt 的 `Crawl-delay` 指令。我们可以设置：

```txt
User-agent: GPTBot
Crawl-delay: 1
```

### Q3: AI 会"窃取"我们的内容吗？

**A**: AI 会学习您的内容但不会直接复制。通过 GEO 优化，目标是让 AI **引用**您的网站作为来源，这会带来流量和品牌认知。

### Q4: 需要多久才能看到效果？

**A**: 
- **AI 爬虫访问**: 1-2 周后开始出现在日志中
- **AI 引用**: 1-3 个月后可能被 AI 模型引用
- **流量增长**: 3-6 个月后开始看到来自 AI 的流量

### Q5: 如果不想被某个 AI 爬虫访问怎么办？

**A**: 在 `robots.txt` 中添加：

```txt
User-agent: GPTBot
Disallow: /
```

---

## 📖 参考资源

### 内部文档

- [GEO_STRATEGY.md](./GEO_STRATEGY.md) - 完整 GEO 策略
- [SEO 文档目录](./SEO/) - 现有 SEO 实现

### 外部资源

- [OpenAI GPTBot 文档](https://platform.openai.com/docs/gptbot)
- [Google AI Crawlers](https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers)
- [Perplexity Documentation](https://docs.perplexity.ai/)

---

## 🎬 下一步行动

### 本周必做

1. ✅ 更新 `robots.txt`
2. ✅ 创建 `.well-known/ai-plugin.json`
3. ✅ 添加 AI Context API
4. ✅ 在 1-2 个页面测试 AI Summary meta 标签

### 下周计划

1. 创建 `AIContentSummary` 组件
2. 在所有 SEO 页面集成
3. 开始监控 AI 爬虫访问

### 月度目标

1. 完成 Phase 1 和 Phase 2 所有任务
2. 开始看到 AI 爬虫访问日志
3. 测试 ChatGPT 对 ScholarMap 的理解

---

**版本**: v1.0  
**最后更新**: 2026-01-27  
**维护者**: ScholarMap Team
