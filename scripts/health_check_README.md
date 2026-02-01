# ScholarMap Comprehensive Health Check System

## 概述

全面的健康检查脚本，涵盖系统可用性、SEO、性能、安全、用户功能等多个维度。

---

## 🎯 检查项目总览

### **P0: 关键系统可用性**（5 项）
- ✅ Backend 健康状态
- ✅ Frontend 健康状态  
- ✅ Demo Run 公开访问
- ✅ Demo 地图数据 API
- ✅ HTTPS 强制（生产环境）

### **P0: 关键 SEO 页面**（29 项）
- ✅ 5 个研究领域页面
- ✅ 10 个国家页面
- ✅ 10 个城市页面
- ✅ robots.txt 可用性
- ✅ sitemap.xml 可用性
- ✅ Sitemap URL 数量验证

### **P0: 页面加载性能**（3 项）
- ✅ 首页加载时间（< 2s）
- ✅ SEO 页面加载时间（< 3s）
- ✅ Demo 页面加载时间（< 5s）

### **P1: SEO 优化**（2 项）
- ✅ 首页 Meta Tags 完整性
- ✅ Sitemap 内容验证

### **P1: API 性能**（3 项）
- ✅ Backend 健康端点响应时间
- ✅ Map API 响应时间
- ✅ Country Map API 功能

### **P1: 认证 & 用户端点**（3 项）
- ✅ 密码要求端点
- ✅ 邮件验证端点
- ✅ 前端配置端点

### **P1: 错误处理**（2 项）
- ✅ 404 页面
- ✅ Favicon

### **P1: 安全 - 端点保护**（4 项）
- ✅ 受保护端点需要认证
- ✅ 公开端点可访问

### **P2: 资源大小优化**（2 项）
- ✅ Sitemap 文件大小（< 1MB）
- ✅ 首页 HTML 大小（< 500KB）

### **P2: 安全 Headers**（3 项）
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy

### **P2: CORS 配置**（1 项）
- ✅ CORS Headers 检查

**总计**: 50+ 检查项

---

## 🚀 使用方法

### 基本用法

```bash
# 检查生产环境（默认）
./scripts/health_check.sh

# 检查本地环境
./scripts/health_check.sh local

# 详细输出模式
./scripts/health_check.sh production --verbose

# 跳过慢速检查（性能测试、外部服务）
./scripts/health_check.sh production --skip-slow
```

### 环境配置

#### 生产环境
```bash
Backend:  https://scholarmap-q1k1.onrender.com
Frontend: https://scholarmap-frontend.onrender.com
```

#### 本地环境
```bash
Backend:  http://localhost:8000
Frontend: http://localhost:3000
```

---

## 📊 输出示例

### 完整输出结构

```
╔════════════════════════════════════════╗
║  PRODUCTION Environment Health Check  ║
╚════════════════════════════════════════╝

═══════════════════════════════════════════════════════════
  P0: Critical System Availability
═══════════════════════════════════════════════════════════

→ Backend Service
✓ Backend is healthy (HTTP 200, 0.234s)

→ Frontend Service
✓ Frontend is healthy (HTTP 200, 0.156s)

→ Demo Run (Public Access)
✓ Demo run page is accessible (HTTP 200)

→ Demo Map Data API
✓ Demo map API returns valid data (HTTP 200)

→ HTTPS Enforcement
✓ HTTP redirects to HTTPS

═══════════════════════════════════════════════════════════
  P0: Critical SEO Pages
═══════════════════════════════════════════════════════════

→ Research Field Pages (Top 5)
✓ All 5 field pages accessible (5/5)

→ Country Pages (Top 10)
✓ All 10 country pages accessible (10/10)

→ City Pages (Top 10)
✓ All 10 city pages accessible (10/10)

→ robots.txt
✓ robots.txt is accessible and valid (HTTP 200)

→ sitemap.xml
✓ Sitemap accessible with 563 URLs (HTTP 200)

═══════════════════════════════════════════════════════════
  P0: Page Load Performance
═══════════════════════════════════════════════════════════

→ Homepage Load Time
✓ Homepage loads fast: 0.352s (< 2s)

→ SEO Page Load Time
✓ SEO page loads fast: 0.489s (< 3s)

→ Demo Page Load Time
✓ Demo page loads fast: 1.234s (< 5s)

... (more checks)

═══════════════════════════════════════════════════════════
  Health Check Summary
═══════════════════════════════════════════════════════════

Environment: production
Duration:    45s

Total Checks:   57
Passed:         52
Failed:         0
Warnings:       3
Skipped:        2

Success Rate:   91%

╔════════════════════════════════════════╗
║  ✓ All Critical Checks Passed!        ║
╚════════════════════════════════════════╝
```

### 状态指示符

- ✓ 绿色 - 检查通过
- ✗ 红色 - 检查失败（影响退出码）
- ⚠ 黄色 - 警告（不影响退出码）
- ⊘ 青色 - 跳过（依赖项不可用）

---

## ⚙️ 选项说明

### `--verbose`
启用详细输出模式，显示每个单独检查的详细结果。

**示例**:
```bash
./scripts/health_check.sh production --verbose
```

**用途**:
- 调试特定页面问题
- 查看所有页面的响应状态
- 详细的性能数据

### `--skip-slow`
跳过耗时的检查项，适合快速健康检查。

**跳过的检查**:
- 页面加载性能测试
- 资源大小检查
- 部分 API 性能测试

**示例**:
```bash
./scripts/health_check.sh production --skip-slow
```

**用途**:
- 快速部署后验证
- CI/CD 管道中的快速检查
- 频繁的监控任务

---

## 📈 性能基准

### 页面加载时间标准

| 页面类型 | 优秀 | 良好 | 需改进 |
|---------|------|------|--------|
| 首页 | < 1s | < 2s | >= 2s |
| SEO 页面 | < 1.5s | < 3s | >= 3s |
| Demo 页面 | < 3s | < 5s | >= 5s |

### API 响应时间标准

| 端点类型 | 优秀 | 良好 | 需改进 |
|---------|------|------|--------|
| Health | < 0.5s | < 2s | >= 2s |
| Map API | < 1s | < 2s | >= 2s |
| Data API | < 2s | < 5s | >= 5s |

---

## 🔄 CI/CD 集成

### GitHub Actions

```yaml
name: Health Check

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 */6 * * *'  # 每 6 小时

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Health Check
        run: |
          chmod +x scripts/health_check.sh
          ./scripts/health_check.sh production
      
      - name: Notify on Failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Health check failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Cron Job

```bash
# 每小时执行一次
0 * * * * /path/to/scholarmap/scripts/health_check.sh production >> /var/log/scholarmap_health.log 2>&1

# 每 6 小时执行完整检查
0 */6 * * * /path/to/scholarmap/scripts/health_check.sh production --verbose >> /var/log/scholarmap_health_detailed.log 2>&1

# 每 15 分钟执行快速检查
*/15 * * * * /path/to/scholarmap/scripts/health_check.sh production --skip-slow >> /var/log/scholarmap_health_quick.log 2>&1
```

---

## 🚨 告警设置

### Slack 通知脚本

```bash
#!/bin/bash
SCRIPT_DIR="/path/to/scholarmap/scripts"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 运行健康检查
if ! $SCRIPT_DIR/health_check.sh production; then
    # 发送失败通知
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"⚠️ ScholarMap Health Check Failed!"}' \
        $SLACK_WEBHOOK
fi
```

### Email 通知

```bash
#!/bin/bash
SCRIPT_DIR="/path/to/scholarmap/scripts"
ADMIN_EMAIL="admin@scholarmap.com"

$SCRIPT_DIR/health_check.sh production || \
  echo "Health check failed at $(date)" | \
  mail -s "ScholarMap Health Check Alert" $ADMIN_EMAIL
```

---

## 🐛 故障排除

### 常见问题

#### 1. 后端返回 401 错误
**症状**: `✗ Backend health check failed (HTTP 401)`

**原因**: `/healthz` 端点需要认证

**解决**: 确保 `/healthz` 在 `backend/app/auth/middleware.py` 的 `PUBLIC_PATHS` 中

#### 2. 后端返回 404 错误
**症状**: `✗ Backend health check failed (HTTP 404)`

**原因**: 
- Render 免费层服务休眠
- Backend URL 不正确

**解决**:
- 等待几秒后重试
- 验证 backend URL 是否正确

#### 3. 大量页面 404
**症状**: `✗ Too many field pages failing`

**原因**:
- Frontend 部署失败
- 路由配置错误
- 静态生成失败

**解决**:
- 检查 Render 部署日志
- 验证 `frontend/src/app` 目录结构
- 重新部署 frontend

#### 4. 性能检查超时
**症状**: `⚠ Demo page loads slowly: 15s`

**原因**:
- 服务器负载高
- 数据库查询慢
- 冷启动

**解决**:
- 使用 `--skip-slow` 跳过性能检查
- 检查数据库连接池配置
- 优化慢查询

#### 5. CORS 错误
**症状**: `⚠ CORS headers not detected`

**原因**: CORS 可能只在实际跨域请求时返回

**解决**: 这通常是警告，不是错误。可以在浏览器中验证实际的跨域请求。

---

## 📋 检查清单

### 部署前检查
```bash
# 1. 本地环境全面检查
./scripts/health_check.sh local --verbose

# 2. 生产环境快速检查
./scripts/health_check.sh production --skip-slow

# 3. 生产环境完整检查
./scripts/health_check.sh production --verbose
```

### 定期监控
```bash
# 每天早上检查
0 9 * * * /path/to/health_check.sh production

# 部署后立即检查
./scripts/health_check.sh production --skip-slow

# 每周完整检查
0 0 * * 0 /path/to/health_check.sh production --verbose
```

---

## 🔍 详细检查说明

### P0 检查（关键）

#### 系统可用性
- **Backend Health**: 确保后端 API 可访问，响应正常
- **Frontend Health**: 确保前端应用可访问
- **Demo Run**: 验证公开演示功能正常
- **Demo API**: 验证地图数据 API 返回有效数据
- **HTTPS**: 确保 HTTP 强制重定向到 HTTPS

#### SEO 页面
- **Field Pages**: 检查 5 个热门研究领域页面
- **Country Pages**: 检查 10 个主要国家页面
- **City Pages**: 检查 10 个主要城市页面
- **robots.txt**: 防止搜索引擎被阻止
- **sitemap.xml**: 确保搜索引擎能发现所有页面

#### 性能
- **Load Times**: 确保用户体验流畅
- **响应时间**: 验证 API 性能

### P1 检查（重要）

#### SEO 优化
- **Meta Tags**: 确保 SEO 基础完善
- **Sitemap Content**: 验证关键页面都在 sitemap 中

#### API & 认证
- **API Performance**: 监控 API 响应时间
- **Auth Endpoints**: 验证用户注册/登录功能可用

#### 安全
- **Endpoint Protection**: 确保敏感端点受保护
- **Public Access**: 确保公开端点可访问

### P2 检查（建议）

#### 优化
- **Resource Size**: 监控文件大小，防止过大
- **Security Headers**: 提升安全性

#### 配置
- **CORS**: 确保前后端通信正常

---

## 📊 监控仪表板（建议）

### Grafana Dashboard

可以将健康检查结果导出到监控系统：

```bash
# 导出为 JSON 格式
./scripts/health_check.sh production --json > /var/log/health_check.json

# 发送到监控系统
curl -X POST -H "Content-Type: application/json" \
  -d @/var/log/health_check.json \
  http://monitoring.example.com/api/health
```

---

## 🔧 高级用法

### 自定义超时

编辑脚本中的超时值：

```bash
# 修改 HTTP 请求超时（默认 5-15 秒）
http_get "$URL" 30  # 30 秒超时
```

### 添加新检查

在脚本中添加新的检查项：

```bash
# 新检查模板
echo -e "${CYAN}→ 你的检查名称${NC}"
check_start
RESPONSE=$(http_get "$YOUR_URL" 5)
HTTP_CODE=$(extract_code "$RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    check_pass "检查通过"
else
    check_fail "检查失败 (HTTP $HTTP_CODE)"
fi
echo ""
```

---

## 📚 相关文档

- [部署检查清单](../documents/DEPLOYMENT_CHECKLIST.md)
- [SEO 优化策略](../documents/SEO/SEO_INDEXING_ACCELERATION_PLAN.md)
- [性能优化](../documents/PERFORMANCE_OPTIMIZATION.md)
- [Render 部署](../documents/RENDER_DEPLOYMENT_GUIDE.md)

---

## 📝 更新日志

### 2026-02-01 v2.0
- ✅ 添加 P0/P1/P2 全面检查（50+ 项）
- ✅ 按优先级分类组织
- ✅ 性能测量和基准
- ✅ 彩色输出和进度统计
- ✅ `--verbose` 和 `--skip-slow` 选项
- ✅ 完整的错误处理和状态报告

### 2026-02-01 v1.0
- ✅ 基础健康检查
- ✅ 系统可用性
- ✅ 邮件服务
- ✅ robots.txt
