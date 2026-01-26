# ScholarMap Marketing 执行手册
## 聚焦版 30/60/90 天实施方案

**目标**: 在 90 天内建立可持续的获客体系，实现流量翻倍、注册率提升 50%

**原则**: 
- 每周只做 3 件核心任务，做到 100 分
- 先建立信任资产，再放大流量
- 所有动作可测量、可复制

---

## 📊 90 天目标概览

| 指标 | 当前 | 30天目标 | 60天目标 | 90天目标 |
|------|------|----------|----------|----------|
| SEO 月流量 | 基线 | +30% | +80% | +150% |
| 注册用户 | 基线 | +20% | +50% | +100% |
| 外链数量 | 0 | 3-5 | 10-15 | 20-30 |
| 内容发布 | 0 | 4篇 | 8篇 | 12篇 |
| 自然分享 | 0 | 5次/周 | 15次/周 | 30次/周 |

---

## 🚀 Phase 1: Day 0-30 建立基础资产

### Week 1: 信任基建（16小时）

#### 任务 1.1: 创建 Methodology 页面（6小时）

**目标**: 让用户理解数据来源和可信度

**执行步骤**:

1. **创建页面文件**（30分钟）
   ```bash
   创建: frontend/src/app/about/methodology/page.tsx
   ```

2. **编写内容**（3小时）
   
   **必须包含的 7 个部分**:
   
   ```markdown
   ## 数据来源
   - PubMed（美国国家医学图书馆）
   - 覆盖范围：Biomedical & Life Sciences
   - 时间范围：2020-2025
   
   ## 数据收集方法
   - 查询构建：基于研究领域关键词
   - 论文抓取：使用 PubMed API
   - 作者识别：从论文元数据提取
   
   ## 地理信息提取
   - 机构识别：从作者署名提取
   - 地理编码：机构 → 城市/国家
   - 验证机制：多源交叉验证
   
   ## 数据处理流程
   [流程图]
   PubMed 查询 → 论文列表 → 作者提取 → 
   机构识别 → 地理编码 → 聚合统计
   
   ## 更新频率
   - 数据更新：和PubMed保持同步
   
   ## 覆盖与限制
   ✅ 涵盖：医学、生物、神经科学、药理学、公共卫生
   ❌ 不含：经济学、社会科学、工程学（非生物医学）
   
   ## 数据质量保证
   - 去重机制
   - 异常值检测
   - 人工抽查验证
   ```

3. **添加视觉元素**（2小时）
   - 流程图（用 Mermaid 或截图）
   - 数据覆盖范围图
   - 示例数据卡片

4. **SEO 优化**（30分钟）
   - Title: "Methodology - How We Map Biomedical Research | ScholarMap"
   - Meta description: 150 字说明数据来源和方法
   - Add to sitemap

**验收标准**:
- [ ] 页面加载 < 2 秒
- [ ] 包含所有 7 个必需部分
- [ ] 至少 1 个视觉元素
- [ ] 可从主页/footer 访问

---

#### 任务 1.2: 创建 Use Cases 页面（8小时）

**目标**: 展示 3 个核心使用场景，降低理解成本

**执行步骤**:

1. **创建页面文件**（30分钟）
   ```bash
   创建: frontend/src/app/use-cases/page.tsx
   ```

2. **Use Case 1: 找博后职位**（2小时）
   
   **内容结构**:
   ```markdown
   ## Use Case 1: Find Postdoc Positions in Your Field
   
   ### The Problem
   "I'm a PhD student in CRISPR research. I want to find postdoc 
   opportunities in cities with strong gene editing labs, but I don't 
   know where to start."
   
   ### The Solution
   [GIF 动图: 选择 CRISPR → 查看全球分布 → 点击 Boston → 
    看到 12 个机构 → 点击某机构 → 看到研究人员列表]
   
   ### Step-by-Step
   1. Go to CRISPR Gene Editing page
   2. View global distribution map
   3. Click on your target city (e.g., Boston)
   4. Browse institutions and researchers
   5. Export the list for further research
   
   ### Try It Yourself
   [按钮: Explore CRISPR Research in Boston]
   → 链接到: /research-jobs/crispr-gene-editing/city/boston
   
   ### What You'll Get
   - 75 researchers in gene editing
   - 12 institutions with active programs
   - Contact information for further research
   ```

3. **Use Case 2: 识别合作机会**（2小时）
   
   ```markdown
   ## Use Case 2: Identify Research Collaboration Opportunities
   
   ### The Problem
   "I'm at MIT studying immunotherapy. I want to find nearby labs 
   working on similar topics for potential collaborations."
   
   ### The Solution
   [GIF 动图: 选择 Cancer Immunotherapy → Boston → 
    看到同城其他机构 → 对比研究密度]
   
   ### Step-by-Step
   1. Select your research field
   2. Choose your city or nearby cities
   3. View institutions by research density
   4. Identify potential collaboration partners
   
   ### Try It Yourself
   [按钮: Find Immunotherapy Collaborators]
   
   ### What You'll Get
   - City-level research landscape
   - Institution comparisons
   - Cross-institution opportunities
   ```

4. **Use Case 3: 比较城市研究环境**（2小时）
   
   ```markdown
   ## Use Case 3: Compare Cities for Your Research Area
   
   ### The Problem
   "I'm deciding between Boston, San Francisco, and New York for 
   my postdoc. Which city has the strongest BCI research community?"
   
   ### The Solution
   [对比表格]
   | City | Researchers | Institutions | Top Labs |
   |------|-------------|--------------|----------|
   | Boston | 45 | 8 | MIT, Harvard |
   | San Francisco | 32 | 6 | Stanford, UCSF |
   | New York | 28 | 7 | Columbia, NYU |
   
   ### Step-by-Step
   1. Go to field overview page
   2. Check top cities ranking
   3. Click each city for detailed view
   4. Compare institutions and density
   
   ### Try It Yourself
   [按钮: Compare BCI Research Cities]
   
   ### What You'll Get
   - Multi-city comparison
   - Research density analysis
   - Informed location decision
   ```

5. **添加导航和 CTA**（1小时）
   - 页面顶部：3 个 use case 快速导航
   - 每个 use case 底部：相关 demo 链接
   - 页面底部：注册 CTA

**验收标准**:
- [ ] 3 个 use case 完整
- [ ] 每个有 GIF/截图
- [ ] 每个有"Try It"链接（带 UTM）
- [ ] 页面停留时间 > 2 分钟

---

#### 任务 1.3: 创建 About/Team 页面（2小时）

**执行步骤**:

1. **创建页面**（30分钟）
   ```bash
   创建: frontend/src/app/about/page.tsx
   ```

2. **编写内容**（1小时）
   
   ```markdown
   ## About ScholarMap
   
   ScholarMap helps biomedical researchers discover global research 
   opportunities by visualizing PubMed data geographically.
   
   ### Why We Built This
   [100-200 字说明创建动机]
   
   ### Our Mission
   Make biomedical research networks transparent and accessible to 
   researchers worldwide.
   
   ### Contact
   - Email: contact@scholarmap.com
   - GitHub: [链接]
   - Twitter: [链接]
   
   ### Feedback
   We're continuously improving. Share your thoughts: [反馈表单]
   ```

3. **添加信任信号**（30分钟）
   - 数据来源标识（PubMed logo）
   - 更新频率说明
   - 隐私政策链接

**验收标准**:
- [ ] 内容简洁专业
- [ ] 有联系方式
- [ ] 可从 footer 访问

---

### Week 2: 内容引擎启动（12小时）

#### 任务 2.1: 撰写第 1 篇内容 - CRISPR 全球分布（6小时）

**目标**: 创建可分享的深度内容，展示数据价值

**执行步骤**:

1. **数据准备**（1小时）
   ```bash
   访问: /projects/3b9280a68d3d/runs/16d4c49fc4f6
   导出数据:
   - Top 10 国家（含研究人员数、机构数）
   - Top 10 城市
   - 增长趋势（如果有历史数据）
   ```

2. **内容撰写**（3小时）
   
   **标题**: "Global CRISPR Gene Editing Research Hubs: A 2026 Data Analysis"
   
   **大纲** (1200-1500 字):
   ```markdown
   ## Introduction (150 字)
   - CRISPR 重要性
   - 为什么要了解全球分布
   - 数据来源说明
   
   ## Methodology (150 字)
   - PubMed 查询方法
   - 数据时间范围
   - 筛选标准
   
   ## Key Findings (600 字)
   
   ### Top Countries
   1. United States (XXX researchers, XXX institutions)
      - Leading institutions: [列举]
      - Why it leads: [分析]
   
   2. China (XXX researchers, XXX institutions)
      - Growth rate: [数据]
      - Key cities: [列举]
   
   [... Top 5 国家]
   
   ### Top Cities
   [表格 + 分析]
   
   ### Regional Trends
   - North America: [趋势]
   - Europe: [趋势]
   - Asia: [趋势]
   
   ## Implications for Researchers (300 字)
   - 找博后：优先考虑哪些城市
   - 找合作：如何利用这个分布
   - 职业规划：新兴 vs 成熟市场
   
   ## How to Explore Further (150 字)
   - 介绍交互式地图
   - [CTA 按钮: Explore CRISPR Research Map]
   - 说明可以按城市/机构深入
   
   ## Conclusion (100 字)
   - 总结关键发现
   - 鼓励使用工具
   ```

3. **创建视觉素材**（1.5小时）
   - 全球分布热力图（截图 + 标注）
   - Top 10 国家柱状图
   - Top 10 城市对比表

4. **SEO 优化**（30分钟）
   - 关键词: "CRISPR research", "gene editing hubs", "global CRISPR distribution"
   - Meta description
   - 添加 schema.org Article markup

**输出格式**:
- Markdown 文件（可发布到 Medium/博客）
- 短版本（LinkedIn - 500 字 + 1 图）
- 讨论版本（Reddit - 问题式 + 核心数据）

---

#### 任务 2.2: 撰写第 2 篇内容 - 如何用领域×城市找博后（6小时）

**标题**: "How to Find Postdoc Positions Using Field × City Research Mapping"

**大纲** (1000-1200 字):
```markdown
## The Old Way (Pain Points)
- 问题 1: Google 搜索效率低
- 问题 2: 排名不等于适配度
- 问题 3: 难以发现新兴机构

## The New Way: Data-Driven Approach
- 使用 PubMed 数据判断研究活跃度
- 地理 × 领域交叉筛选
- 从城市 → 机构 → 研究人员的路径

## Case Study: Finding BCI Postdoc in Boston
[步骤截图]
1. 查看 BCI 全球分布 → Boston 排名第 X
2. 点击 Boston → 看到 X 个机构
3. 对比机构研究人员数量
4. 导出目标机构列表
5. 后续研究：查看 PI 网站、最近论文

## 5 Tips for Using Research Mapping
1. 不要只看 Top 城市，考虑生活成本
2. 关注"研究人员密度"而非总数
3. 查看多个相关领域（交叉机会）
4. 结合其他信息（实验室网站、招聘信息）
5. 定期更新你的目标清单

## Try It Yourself
[多个领域的示例链接]

## Conclusion
工具是辅助，不是替代。用数据缩小范围，用研究确认选择。
```

**验收标准**:
- [ ] 内容对读者有实际价值
- [ ] 包含具体案例和截图
- [ ] 自然融入工具介绍（不超过 20%）
- [ ] 可读性强（短段落、小标题）

---

#### 任务 2.3: 内容发布与分发（2小时）

**平台 1: Medium/个人博客**
```
发布: 完整长文
标签: #Research #PhD #Postdoc #CRISPR #Academia
时间: 周二上午（美国东部时间）
```

**平台 2: LinkedIn**
```
格式: 500 字摘要 + 1 张核心图表 + 链接
文案开头: "I analyzed PubMed data to find where CRISPR research 
         is most active globally. Here's what I found..."
时间: 周三上午
```

**平台 3: Reddit**
- r/GradSchool
- r/labrats
- r/bioinformatics

```
标题: "Mapped global CRISPR research hubs using PubMed data - 
       thought you might find this useful"
       
正文: 
"Hi r/labrats,

I was curious about where CRISPR research is most active globally, 
so I analyzed PubMed data and created some visualizations.

Key findings:
- Top 3 countries: [数据]
- Top 5 cities: [数据]
- Surprising finding: [洞察]

I also made an interactive map where you can explore by city and 
institution: [链接]

Happy to discuss the methodology or findings. What's your take on 
these distributions?

[Mod note: Not promoting anything, just sharing data analysis]"

时间: 周四（避开周末）
```

**平台 4: Twitter/X**
```
Tweet 1: 核心发现 + 图表
"Analyzed 1,000+ CRISPR papers in PubMed. 

Top 5 research hubs:
1. Boston
2. San Francisco
3. [...]

Interactive map 👇
[链接]"

Tweet 2-3: 展开有趣的发现
```

**追踪指标**:
- 每个平台浏览量
- 点击率（链接点击/浏览）
- 注册转化（来自每个渠道）

---

### Week 3: 外联启动（10小时）

#### 任务 3.1: 准备外联目标清单（2小时）

**目标**: 筛选出 30 个高质量外联对象

**执行步骤**:

1. **搜索目标网站**（1小时）
   
   **搜索词**:
   ```
   "biomedical career resources"
   "PhD student resources" + university
   "postdoc resources" + biomedical
   "research tools" + bioinformatics
   "academic job search tools"
   ```

2. **筛选标准**（30分钟）
   - ✅ 有 resources/tools 页面
   - ✅ 内容定期更新（非僵尸站）
   - ✅ 与生物医学相关
   - ✅ 有联系方式
   - ⚠️ 域名权重 DR > 20（可选）

3. **分类整理**（30分钟）
   
   **创建表格** (Google Sheets/Excel):
   ```
   | 名称 | URL | 类型 | 联系邮箱 | 优先级 | 状态 | 备注 |
   |------|-----|------|----------|--------|------|------|
   | Johns Hopkins Career | [URL] | 大学 | xxx@jhu.edu | P0 | 待发送 | 生物医学强校 |
   | ASCB Resources | [URL] | 学会 | xxx@ascb.org | P1 | 待发送 | 细胞生物学会 |
   | ... | ... | ... | ... | ... | ... | ... |
   ```

**目标清单** (30 个):
- 10 个 Top 大学（生物医学强校）
- 10 个学术协会/学会
- 5 个研究工具目录
- 5 个 Newsletter/博主

---

#### 任务 3.2: 撰写外联邮件模板（2小时）

**模板 A: 大学 Career Center**

```
Subject: Free Research Mapping Tool for Biomedical Students

Hi [Name],

I noticed [University] has an excellent biomedical research program 
and a comprehensive career resources page for graduate students.

I wanted to share a free tool we built that might be useful for your 
PhD students and postdocs. It helps visualize global biomedical 
research opportunities by field and location using PubMed data.

For example:
- A student interested in CRISPR can see which cities have the 
  highest concentration of gene editing labs
- They can drill down to specific institutions and researchers
- All based on actual publication data (PubMed)

Here's what it looks like: [demo link with UTM]

Would this be appropriate to list on your resources page? I'd be 
happy to:
• Provide a brief description for your page
• Create a custom landing page for [University] students
• Share our methodology documentation

No pressure at all - just thought it might be helpful for students 
exploring postdoc or collaboration opportunities.

Best regards,
[Your Name]

P.S. We just published a report on global CRISPR research hubs 
that might interest you: [link]

---
ScholarMap - Biomedical Research Network Mapping
[URL] | Based on PubMed Data
```

**模板 B: 学术协会/学会**

```
Subject: Research Mapping Tool for [Association] Members

Dear [Association] Team,

As a tool supporting biomedical research community, I wanted to 
reach out about a resource that might benefit [Association] members.

ScholarMap is a free tool that visualizes global biomedical research 
networks using PubMed data. Members can:
- Discover research hotspots in their field by geography
- Identify potential collaboration partners
- Explore postdoc opportunities by location and specialty

Given [Association]'s focus on [specific field], this could be 
particularly useful for members working in [relevant areas].

Here's an example for [field]: [demo link]

Would you be interested in:
• Listing this in your resources section?
• Mentioning it in your newsletter?
• Collaborating on a field-specific analysis report?

I can provide any additional information needed, including 
methodology, user guides, or customized landing pages.

Thank you for considering,
[Your Name]

---
ScholarMap
[URL]
```

**模板 C: 研究工具目录/博主**

```
Subject: Tool Suggestion for Your Research Resources List

Hi [Name],

I'm a fan of your [blog/directory] - it's been incredibly helpful 
for the biomedical research community.

I wanted to suggest a tool for your [resources page/next roundup]: 
ScholarMap, a free biomedical research network mapper.

What it does:
• Visualizes where research happens by field + geography
• Uses PubMed publication data
• Helps researchers find collaborators, labs, or postdoc opportunities

What makes it unique:
• First tool to combine "field × geography" (e.g., "CRISPR in Boston")
• Focuses specifically on biomedical/life sciences
• Free and open access

Live demo: [link]

If you'd like to include it, I'm happy to:
• Provide screenshots/description
• Write a guest post about using research mapping
• Share usage data or case studies

Let me know if you need anything else!

Best,
[Your Name]
```

**使用指南**:
- 每封邮件个性化前 2 句话
- 根据对象选择合适模板
- 附上相关的 demo 链接（不同对象用不同领域）
- 跟进时间：3 天后（如果未回复）

---

#### 任务 3.3: 执行外联（6小时）

**执行节奏**:

**Week 3**:
- 每天发送 3-5 封邮件
- 目标：20 封

**具体步骤** (每封耗时 10-15 分钟):

1. **个性化邮件**
   - 访问目标网站
   - 找到具体联系人（如果可能）
   - 修改邮件前 2 句话，提及具体内容
   - 选择最相关的 demo 链接

2. **发送并记录**
   - 发送邮件
   - 在表格更新状态："已发送 - [日期]"
   - 设置 3 天后提醒

3. **跟进策略**
   
   **首次跟进** (3 天后):
   ```
   Subject: Re: [原主题]
   
   Hi [Name],
   
   Just wanted to follow up on my email from [day]. I understand 
   you're probably busy, so no worries if this isn't a priority.
   
   In case it's helpful, here's a direct link to our methodology 
   page: [link]
   
   Thanks for your time!
   [Your Name]
   ```
   
   **如果仍无回复**: 不再跟进（避免打扰）

**期望结果**:
- 发送：20 封
- 回复率：10-15% (2-3 封)
- 合作率：5-10% (1-2 个链接)

---

### Week 4: 英雄页面优化（12小时）

#### 任务 4.1: 选择 5 个英雄页面

**选择标准**:
- 搜索热度高
- 有竞争优势
- 内容可以深化

**推荐选择**:
1. `/research-jobs/crispr-gene-editing` (概览)
2. `/research-jobs/cancer-immunotherapy/country/united-states`
3. `/research-jobs/brain-computer-interface/city/boston`
4. `/research-jobs/neural-modulation/country/united-kingdom`
5. `/research-jobs/ai-drug-discovery/city/san-francisco`

---

#### 任务 4.2: 为每个页面添加差异化模块（每个 2 小时）

**差异化模块清单**（选 2-3 个添加）:

**模块 1: 领域趋势解读**
```tsx
<section className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
  <h3>📈 Research Trends in [Field]</h3>
  <p>
    Recent publications show [trend data]. Key areas of growth include:
    - [Subfield 1]: +X% in publications
    - [Subfield 2]: Emerging collaborations with [related field]
  </p>
  <Link href="/about/methodology">How we analyze trends →</Link>
</section>
```

**模块 2: 选择策略指南**
```tsx
<section>
  <h3>💡 How to Choose Your Target City</h3>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="border p-4 rounded">
      <h4>Consider Research Density</h4>
      <p>More researchers = more opportunities, but also more competition</p>
    </div>
    <div className="border p-4 rounded">
      <h4>Check Related Fields</h4>
      <p>Cities strong in adjacent fields offer interdisciplinary opportunities</p>
    </div>
    <div className="border p-4 rounded">
      <h4>Balance with Cost of Living</h4>
      <p>High-density cities often have higher living costs</p>
    </div>
  </div>
</section>
```

**模块 3: 相邻城市对比**
```tsx
<section>
  <h3>🗺️ Compare with Nearby Cities</h3>
  <table>
    <tr>
      <th>City</th>
      <th>Researchers</th>
      <th>Institutions</th>
      <th>Avg Cost of Living</th>
    </tr>
    <tr>
      <td>Boston</td>
      <td>127</td>
      <td>15</td>
      <td>$$$</td>
    </tr>
    <tr>
      <td>Cambridge</td>
      <td>89</td>
      <td>8</td>
      <td>$$$</td>
    </tr>
    <!-- ... -->
  </table>
</section>
```

**模块 4: 扩展 FAQ**
```tsx
<section>
  <h3>❓ Frequently Asked Questions</h3>
  
  <details>
    <summary>How often is this data updated?</summary>
    <p>We update our data monthly based on new PubMed publications. 
       Last update: [date]</p>
  </details>
  
  <details>
    <summary>Does this include all researchers in the field?</summary>
    <p>We include researchers with recent publications (2020-2025) 
       indexed in PubMed. This may not capture all researchers, 
       especially those in early career stages or clinical-only positions.</p>
  </details>
  
  <details>
    <summary>How should I use this data for postdoc applications?</summary>
    <p>Use this as a starting point to identify active research groups. 
       Follow up by checking lab websites, recent publications, and 
       funding status.</p>
  </details>
</section>
```

**模块 5: 相关资源链接**
```tsx
<section>
  <h3>🔗 Related Resources</h3>
  <ul>
    <li>
      <a href="[external]">CRISPR.org - Gene Editing Resources</a>
      <span className="text-gray-500"> - Official resources and guidelines</span>
    </li>
    <li>
      <a href="[external]">NIH Postdoc Database</a>
      <span className="text-gray-500"> - Search open positions</span>
    </li>
    <li>
      <a href="/use-cases">How to Use ScholarMap for Postdoc Search</a>
      <span className="text-gray-500"> - Step-by-step guide</span>
    </li>
  </ul>
</section>
```

**实施指南**:
- 每个页面添加 2-3 个模块
- 保持页面总长度 800-1200 字
- 确保模块内容独特（不要完全模板化）
- 添加内部链接（指向 methodology, use-cases, 其他领域页面）

---

## 🔄 Phase 2: Day 31-60 外链加速 + PLG（产品内增长（PLG）：让用户自传播）

### Week 5-6: 季度报告制作（12小时）

#### 任务 5.1: 选择报告主题

**推荐**: "Global Cancer Immunotherapy Research Landscape 2026"

**原因**:
- 热门话题（CAR-T, 免疫检查点抑制剂）
- 有临床转化价值
- 数据完整（已有 run）

---

#### 任务 5.2: 报告大纲

**结构** (10-12 页 PDF):

```markdown
封面
- 标题：Global Cancer Immunotherapy Research Landscape 2026
- 副标题：A PubMed Data Analysis
- 作者：ScholarMap
- 日期：[季度]

Executive Summary (1 页)
- 关键发现 5 条
- 方法论简述
- 数据范围

Methodology (1 页)
- 数据来源
- 时间范围
- 筛选条件
- 分析方法

Global Overview (2 页)
- 全球分布地图
- Top 10 国家
- 总体趋势

Regional Deep Dive (3 页)
- North America
  - Top 5 城市
  - 主要机构
  - 研究热点
- Europe
- Asia

Emerging Hubs (1 页)
- 增长最快的城市/国家
- 新兴研究方向

Implications for Researchers (1 页)
- 对博后申请的启示
- 对合作寻找的建议
- 对职业规划的参考

How to Explore Further (1 页)
- 交互式地图介绍
- 使用指南
- 联系方式

Appendix (1 页)
- 完整数据表
- 参考文献
- 致谢
```

---

#### 任务 5.3: 报告制作工具

**选项 1: Canva** (推荐 - 易用)
- 使用 "Research Report" 模板
- 品牌颜色：蓝色系
- 导出为 PDF

**选项 2: Google Slides**
- 逐页设计
- 导出为 PDF

**选项 3: LaTeX** (专业)
- 使用学术报告模板
- 适合有技术背景的团队

---

#### 任务 5.4: 报告发布与分发

**发布渠道**:

1. **ScholarMap 网站**
   - 创建 landing page: `/reports/immunotherapy-2026-q1`
   - 包含：报告摘要 + 下载按钮 + 交互图表

2. **Medium**
   - 发布博客版本（完整内容）
   - 标题："2026 Global Cancer Immunotherapy Hotspots: Data Analysis"

3. **ResearchGate / Academia.edu**
   - 上传 PDF（如果允许）
   - 标签：immunotherapy, cancer research, research mapping

4. **Social Media**
   - LinkedIn: 发布报告 + 核心图表
   - Twitter: 线程展示关键发现
   - Reddit: 发帖到 r/labrats, r/immunology

5. **Email Outreach**
   - 发送给之前外联过的对象
   - 邮件主题："New Report: Global Immunotherapy Research Landscape 2026"
   - 正文：摘要 + 下载链接 + "可以分享给你们的学生/成员"

**追踪指标**:
- 下载次数
- 社交分享次数
- 外链获取数（引用该报告的网站）

---

### Week 7-8: PLG 功能（产品内增长（PLG）：让用户自传播） - 分享卡片（8小时开发 + 2小时测试）

#### 任务 7.1: 功能设计

**目标**: 用户可以一键生成并分享页面卡片

**功能要求**:

```typescript
// 在每个页面添加"分享"按钮
// 点击后生成可下载的图片卡片

卡片内容:
┌─────────────────────────────────┐
│ 🧬 CRISPR Research in Boston    │
│                                  │
│ 📊 127 Researchers               │
│    15 Institutions               │
│                                  │
│ Top Labs:                        │
│ • MIT                            │
│ • Harvard Medical School         │
│ • Boston University              │
│                                  │
│ 🔗 scholarmap.com/crispr/boston │
│    #ScholarMap #CRISPR #Boston  │
└─────────────────────────────────┘

尺寸: 1200x630 (适合社交分享)
格式: PNG
```

**实现方案**:

**选项 A: html-to-image 库** (推荐)
```typescript
import { toPng } from 'html-to-image';

const generateShareCard = async () => {
  const node = document.getElementById('share-card');
  const dataUrl = await toPng(node);
  downloadImage(dataUrl, 'scholarmap-share.png');
};
```

**选项 B: Canvas API**
```typescript
// 使用 canvas 绘制卡片
// 优点：更灵活
// 缺点：开发时间长
```

---

#### 任务 7.2: 实现步骤

1. **创建分享组件**（4小时）
   ```bash
   创建: frontend/src/components/ShareCard.tsx
   ```

2. **添加到页面**（2小时）
   - 在领域/城市页面标题旁添加"分享"按钮
   - 点击弹出预览 + 下载选项
   - 添加"复制链接"功能

3. **样式优化**（2小时）
   - 设计美观的卡片模板
   - 适配不同内容长度
   - 添加 ScholarMap logo/品牌元素

4. **测试**（2小时）
   - 不同页面类型（领域/国家/城市）
   - 不同浏览器
   - 移动端适配

**验收标准**:
- [ ] 卡片生成 < 2 秒
- [ ] 图片质量清晰
- [ ] 包含正确的数据
- [ ] 在 Twitter/LinkedIn 预览正常

---

### Week 7-8: 持续内容发布（8小时）

**目标**: 保持每周 1 篇内容的节奏

**第 5-8 篇内容建议**:

1. **Week 5**: "Brain-Computer Interface Research: Global Hotspots 2026"
2. **Week 6**: "How to Use PubMed Data for Academic Job Search"
3. **Week 7**: "Comparing US and Europe for Biomedical Postdocs"
4. **Week 8**: "Emerging Research Hubs in Asia: CRISPR and Beyond"

**执行**: 复用 Week 2 的内容创作 SOP (Standard Operating Procedure（标准操作流程），就是可重复使用的标准化执行步骤)

---

## 🚀 Phase 3: Day 61-90 PLG 完善 + 自传播

### Week 9-10: "保存收藏"功能（10小时）

#### 功能设计

**用户流程**:
```
浏览城市页面 → 点击"保存" → 
  → 未登录：提示注册 → 注册后自动保存 →
  → 已登录：直接保存 →
  → 查看"我的收藏"页面（列表）
```

**数据模型**:
```typescript
interface SavedItem {
  userId: string;
  itemType: 'country' | 'city' | 'field' | 'field-city';
  itemId: string;
  itemName: string;
  savedAt: Date;
  notes?: string;
}
```

#### 实现步骤

1. **后端 API**（4小时）
   - POST `/api/saved-items` - 保存
   - GET `/api/saved-items` - 列表
   - DELETE `/api/saved-items/:id` - 删除

2. **前端组件**（4小时）
   - "保存"按钮（每个页面）
   - "我的收藏"页面
   - 登录/注册提示

3. **测试与优化**（2小时）

**关键指标**:
- 保存功能使用率
- 通过保存功能引导的注册率

---

### Week 11-12: 数据分析与优化（10小时）

#### 任务 11.1: 设置分析仪表盘

**工具**: Google Looker Studio (免费)

**数据源**: 连接 GA4

**仪表盘结构**:

**页面 1: 流量概览**
- SEO 月流量趋势
- Top Landing Pages
- 流量来源分布

**页面 2: 转化漏斗**
- SEO 流量 → Demo 点击 → 注册
- 各步骤转化率
- 按来源分组

**页面 3: 内容效果**
- 各平台发布内容的流量
- 外链来源流量
- 社交分享追踪

**页面 4: 用户行为**
- 停留时间（按页面类型）
- 跳出率
- 用户路径分析

---

#### 任务 11.2: 深度分析与优化

**分析维度**:

1. **页面性能**
   - 找出转化率最高的页面（加强推广）
   - 找出跳出率最高的页面（优化内容）

2. **流量来源**
   - 哪个平台带来最多流量？
   - 哪个渠道注册转化率最高？

3. **用户路径**
   - 大多数用户如何浏览网站？
   - 哪些内容引导注册最有效？

**优化动作**:
- 调整内容发布策略
- 优化低效页面
- 加强高效渠道投入

---

### Week 11-12: 月度邮件系统设计（8小时）

#### 功能设计

**订阅机制**:
```
用户在领域页面看到:
"🔔 Get monthly updates on [Field] research hotspots"
[输入邮箱] [订阅]

或：
注册用户可以在设置中订阅感兴趣的领域/城市
```

**邮件内容模板**:
```
主题: [Field] Research Update - [Month] 2026

Hi [Name],

Here's your monthly update on [Field] research activity:

📈 This Month's Highlights
• New active researchers: +X
• Top growing city: [City] (+Y%)
• Featured institution: [Institution]

🗺️ Global Snapshot
[小地图截图]

💡 Spotlight: [City Name]
[简短描述本月该城市的变化]

🔗 Explore More
[按钮: View Full Map]

---
Unsubscribe | Update Preferences
```

#### 实现步骤

1. **选择邮件服务**（1小时）
   - 推荐: SendGrid (免费额度: 100/天)
   - 或: Mailchimp, ConvertKit

2. **设计订阅流程**（3小时）
   - 前端订阅表单
   - 后端 API
   - 确认邮件

3. **设计邮件模板**（2小时）
   - HTML 邮件模板
   - 移动端适配
   - 品牌一致性

4. **自动化设置**（2小时）
   - 每月 1 号自动发送
   - 数据自动填充（或手动编辑）

**首次发送目标**:
- 订阅者 > 50
- 打开率 > 25%
- 点击率 > 5%

---

## 📊 指标追踪

### 每周必查的 8 个指标

**获客**:
1. SEO 月流量（同比上周）
2. Google Search Console - Impressions & CTR

**激活**:
3. SEO → Demo 点击率
4. Demo 停留时间 > 1 分钟比例

**转化**:
5. 注册率（按来源分组）
6. 24h 内激活率（创建项目/保存收藏）

**留存**:
7. 7 天回访率

**传播**:
8. 自然分享次数（通过 UTM 追踪）

### 月度复盘模板

```markdown
## [Month] 增长复盘

### 目标 vs 实际
| 指标 | 目标 | 实际 | 达成率 |
|------|------|------|--------|
| SEO 流量 | +30% | +X% | X% |
| 注册用户 | +20% | +X% | X% |
| 外链数量 | 3-5 | X | X% |
| 内容发布 | 4 篇 | X | X% |

### 做得好的 3 件事
1. [...]
2. [...]
3. [...]

### 需要改进的 3 件事
1. [...]
2. [...]
3. [...]

### 下月重点
1. [...]
2. [...]
3. [...]
```

---

## 📋 快速参考：每周检查清单

### Week 1 ✅
- [ ] Methodology 页面上线
- [ ] Use Cases 页面上线
- [ ] About 页面上线

### Week 2 ✅
- [ ] 第 1 篇内容完成并发布到 3 个平台
- [ ] 第 2 篇内容完成并发布到 3 个平台

### Week 3 ✅
- [ ] 外联目标清单完成（30 个）
- [ ] 发送 20 封外联邮件
- [ ] 跟进上周邮件

### Week 4 ✅
- [ ] 5 个英雄页面优化完成
- [ ] 每个页面添加 2-3 个差异化模块

### Week 5-6 ✅
- [ ] 季度报告完成
- [ ] 报告发布到 5 个渠道
- [ ] 第 3-4 篇内容发布

### Week 7-8 ✅
- [ ] 分享卡片功能上线
- [ ] 第 5-6 篇内容发布
- [ ] 持续外联（30 个）

### Week 9-10 ✅
- [ ] 保存收藏功能上线
- [ ] 第 7-8 篇内容发布
- [ ] 分析仪表盘设置完成

### Week 11-12 ✅
- [ ] 月度邮件系统上线
- [ ] 第 9-10 篇内容发布
- [ ] 90 天复盘完成
- [ ] 制定下季度计划

---

## 🎯 成功标准

### 30 天成功标志
- ✅ 3 个信任页面上线
- ✅ 4 篇高质量内容发布
- ✅ 获得 2-4 个外链
- ✅ SEO 流量 +30%

### 60 天成功标志
- ✅ 季度报告发布并获得 100+ 下载
- ✅ 累计 10-15 个外链
- ✅ 分享卡片功能使用 > 20 次/周
- ✅ SEO 流量 +80%

### 90 天成功标志
- ✅ SEO 流量翻倍
- ✅ 注册率提升 50%+
- ✅ 建立自传播机制（月度邮件 + 保存功能）
- ✅ 20-30 个外链
- ✅ 部分关键词进入 Top 20

---

## 📞 需要帮助？

**问题**: 某个任务不知道怎么做？
**解决**: 查看该任务的详细 SOP，或参考"资源模板"部分

**问题**: 时间不够？
**解决**: 优先完成标记为 P0 的任务，P1/P2 可以延后

**问题**: 效果不如预期？
**解决**: 每周查看指标，及时调整策略。记住：做 3 件事到 100 分，比做 10 件事各 30 分好得多

---

**最后提醒**: 

这是一个 90 天的马拉松，不是冲刺。保持节奏，持续执行，数据会说话。

**开始第一步**: 立即创建 Methodology 页面（今天 6 小时）。完成它，你就走出了最关键的一步。

---

**文档版本**: 2.0 - 执行版  
**创建日期**: 2026-01-24  
**适用对象**: 小团队/个人开发者  
**预计投入**: 每周 10-15 小时
