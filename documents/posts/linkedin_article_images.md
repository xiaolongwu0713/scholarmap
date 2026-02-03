# LinkedIn 文章图片需求清单

为 ScholarMap LinkedIn 文章准备的图片规格和内容建议

---

## 📋 图片清单（共 11 张）

### 1. Hero Image - 主图
**位置**: 文章开头  
**尺寸**: 1200x627px（LinkedIn 推荐）  
**内容**: 
- 世界地图背景（深蓝色）
- 在主要研究城市标注发光点
- 标题叠加: "Mapping Global Biomedical Research"
- ScholarMap logo 在右下角

**设计建议**:
- 专业、科技感
- 使用蓝色、白色主色调
- 高对比度便于在移动设备查看

---

### 2. Interactive Map Screenshot
**位置**: "Introducing ScholarMap" 部分  
**尺寸**: 1200x675px  
**内容**:
- ScholarMap 实际界面截图
- 显示交互式 3D 地图
- 包含国家聚合视图
- 高亮一些数据点

**如何获取**:
```
访问: https://scholarmap-frontend.onrender.com/projects/3b9280a68d3d/runs/b6b977aeeed1
截图主地图界面
```

---

### 3. Process Infographic
**位置**: "How It Works" 部分  
**尺寸**: 1200x400px（横向信息图）  
**内容**:
四步流程图，每步包含：
1. **Parse** - 图标: 🔍 放大镜 + 文本
2. **Extract** - 图标: 📚 书籍 + 地图标记
3. **Map** - 图标: 🗺️ 世界地图 + 定位点
4. **Visualize** - 图标: 📊 图表 + 3D 效果

**设计元素**:
- 箭头连接各步骤
- 蓝色渐变背景
- 白色图标和文字
- 简洁现代风格

---

### 4. Country Comparison View
**位置**: "PhD Students" 用例  
**尺寸**: 1200x600px  
**内容**:
- ScholarMap 的国家对比视图截图
- 显示 United States vs China vs Germany
- 包含研究者数量、城市数量
- 柱状图或卡片对比

**如何获取**:
```
访问: https://scholarmap-frontend.onrender.com/research-jobs/
截图 country cards grid 部分
```

---

### 5. Before/After Comparison
**位置**: "Why This Matters" 部分  
**尺寸**: 1200x600px  
**内容**:
左右分屏对比：

**左侧 (Before - 传统方式)**:
- 灰色背景
- 图标: 😰 沮丧表情
- 文字: 
  - "Hours of manual research"
  - "Fragmented information"
  - "Missing opportunities"

**右侧 (After - ScholarMap)**:
- 蓝色渐变背景
- 图标: 😊 开心表情
- 文字:
  - "Minutes to complete view"
  - "Data-driven insights"
  - "Discover all opportunities"

---

### 6. Technology Stack Diagram
**位置**: "The Technology" 部分  
**尺寸**: 1200x800px  
**内容**:
技术架构图：

```
[PubMed API] → [AI Engine] → [Geolocation] → [Interactive Map]
     ↓              ↓              ↓                ↓
  36M+ Papers    NLP/LLM      95% Accuracy    Real-time Updates
```

**设计元素**:
- 流程图风格
- 每个组件用圆角矩形
- 渐变颜色区分层级
- 图标代表技术

---

### 7. Statistics Infographic
**位置**: "Current Coverage" 部分  
**尺寸**: 1200x600px  
**内容**:
4 个大数字卡片：

```
+150        +400         +950          Millions
Countries   Cities    Institutions   Researchers
   🌍         🏙️          🏛️             👥
```

**设计**:
- 白色背景
- 每个数字用大字体（72px+）
- 图标在数字下方
- 蓝色强调色

---

### 8. User Testimonial Cards
**位置**: "What Researchers Say" 部分  
**尺寸**: 1200x400px  
**内容**:
3 个引用卡片，每个包含：
- 引用文字
- 用户头像（可用图标代替）
- 用户身份（PhD Candidate, etc.）
- 5 星评分

**设计**:
- 卡片式布局
- 白色卡片 + 阴影
- 引号图标
- 专业照片或图标

---

### 9. Roadmap Timeline
**位置**: "Looking Forward" 部分  
**尺寸**: 1200x400px  
**内容**:
时间线，包含：
- Q1 2026: Enhanced field coverage
- Q2 2026: Collaboration features
- Q3 2026: API access
- Q4 2026: Mobile app

**设计**:
- 横向时间线
- 每个里程碑用圆圈标记
- 渐变颜色表示进度
- 图标代表功能

---

### 10. Demo Interface Screenshot
**位置**: "Try It Yourself" 部分  
**尺寸**: 1200x675px  
**内容**:
- 完整的 demo 运行界面
- 显示一个具体的研究领域
- 包含地图、统计、筛选器

**如何获取**:
```
访问: https://scholarmap-frontend.onrender.com/projects/3b9280a68d3d/runs/b6b977aeeed1
截图完整界面（包含侧边栏）
```

---

### 11. Footer CTA Banner
**位置**: 文章结尾  
**尺寸**: 1200x300px  
**内容**:
行动号召横幅：

```
Ready to Map Your Research Opportunities?

[Explore Demo]  [Create Free Account]  [Learn More]
```

**设计**:
- 蓝色渐变背景
- 白色文字和按钮
- 大标题（48px）
- 3 个 CTA 按钮

---

## 🎨 设计规范

### 颜色方案
- **主色**: #2563EB (蓝色)
- **辅色**: #3B82F6 (浅蓝)
- **强调色**: #1E40AF (深蓝)
- **背景**: #FFFFFF (白色)
- **文字**: #111827 (深灰)

### 字体
- **标题**: Inter Bold / Montserrat Bold
- **正文**: Inter Regular / Open Sans
- **数字**: Inter / SF Pro Display

### 图标
- 使用 Heroicons 或 Font Awesome
- 统一风格（outline 或 solid）
- 大小: 48px - 64px

---

## 📐 快速创建指南

### 使用 Canva（推荐）
1. 创建自定义尺寸（见上方）
2. 使用 "Technology" 或 "Business" 模板
3. 替换文字和颜色
4. 导出为 PNG（高质量）

### 使用 Figma
1. 导入 ScholarMap 品牌 kit
2. 使用组件和样式
3. 导出为 PNG 2x

### 使用截图
1. 在浏览器中访问 ScholarMap
2. 使用全屏模式（F11）
3. 使用 Chrome DevTools 设备模拟
4. 截图并裁剪到指定尺寸

---

## ✅ 图片检查清单

导出前确保：
- [ ] 尺寸正确（LinkedIn 推荐比例）
- [ ] 文字清晰可读（移动设备测试）
- [ ] 品牌一致（颜色、字体、logo）
- [ ] 高分辨率（至少 72 DPI）
- [ ] 文件大小适中（< 5MB）
- [ ] 格式正确（PNG 或 JPG）

---

## 🚀 优先级

如果时间有限，至少准备这些：

### 必需（优先级 1）
1. ✅ Hero Image
2. ✅ Interactive Map Screenshot
3. ✅ Statistics Infographic
4. ✅ Demo Interface Screenshot

### 重要（优先级 2）
5. ✅ Process Infographic
6. ✅ Before/After Comparison
7. ✅ Footer CTA Banner

### 可选（优先级 3）
8. Country Comparison View
9. Technology Stack Diagram
10. User Testimonial Cards
11. Roadmap Timeline

---

## 📝 替代方案

如果无法制作所有图片：

### 方案 1: 使用 AI 生成
- DALL-E 3 / Midjourney
- 提示词: "Professional infographic for biomedical research platform..."

### 方案 2: 使用 Icon + 文字
- 简单的图标 + 描述文字
- 清晰的排版
- 保持专业感

### 方案 3: 纯文字 + 截图
- 只使用 ScholarMap 实际截图
- 用粗体和引用强调重点
- LinkedIn 原生格式

---

**创建日期**: 2026-01-27  
**用途**: LinkedIn 文章配图  
**维护**: ScholarMap Marketing
