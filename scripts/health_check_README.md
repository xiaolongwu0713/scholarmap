# Health Check Script

## 概述

`health_check.sh` 是一个全面的健康检查脚本，用于监控 ScholarMap 系统的关键功能。

## 检查项目

### 1. 系统可用性
- **Backend Service**: 检查后端 API 健康状态（`/healthz` 端点）
- **Frontend Service**: 检查前端应用健康状态（`/health` 端点）
- **Sitemap**: 验证 sitemap.xml 可访问性和 URL 数量

### 2. 邮件服务
- 测试注册验证邮件发送功能（SendGrid）
- 检查 `/api/auth/send-verification-code` 端点
- 验证 SendGrid API 配置状态

### 3. robots.txt 可用性
- 验证 robots.txt 文件可访问（HTTP 200）
- 检查必需的指令（User-agent, Sitemap）
- 确保 Google 爬虫不会被阻止（防止 401 错误）

## 使用方法

### 基本用法

```bash
# 检查生产环境（默认）
./scripts/health_check.sh

# 或显式指定生产环境
./scripts/health_check.sh production

# 检查本地开发环境
./scripts/health_check.sh local
```

### 环境配置

#### 生产环境
- Backend: `https://scholarmap-backend.onrender.com`
- Frontend: `https://scholarmap-frontend.onrender.com`

#### 本地环境
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

## 输出说明

### 状态指示符
- ✓ 绿色：检查通过
- ⚠ 黄色：警告（非致命问题）
- ✗ 红色：检查失败

### 退出代码
- `0`: 所有检查通过
- `1`: 一个或多个检查失败

## 示例输出

### 成功案例
```
=== Check 1: System Availability ===
1.1 Backend Service:
✓ Backend is healthy (HTTP 200)
✓ Backend status: OK

1.2 Frontend Service:
✓ Frontend is healthy (HTTP 200)
✓ Frontend status: OK

1.3 Sitemap:
✓ sitemap.xml is accessible (HTTP 200)
✓ Sitemap contains 563 URLs

=== Check 2: Email Service ===
✓ Email service is responding (HTTP 200)
✓ Verification code sent successfully

=== Check 3: robots.txt Availability ===
✓ robots.txt is accessible (HTTP 200)
✓ robots.txt contains required directives

=== Health Check Summary ===
✓ All health checks passed!
```

### 后端休眠（Render 免费层）
```
=== Check 1: System Availability ===
1.1 Backend Service:
✗ Backend health check failed (HTTP 404)
  Note: Backend might be sleeping (Render free tier)

=== Check 2: Email Service ===
⚠ Skipping email check - backend is not available
```

### 邮件服务开发模式
```
=== Check 2: Email Service ===
✓ Email service is responding (HTTP 200)
⚠ Email service in DEV mode (SendGrid not configured)
  This is OK for local development
```

### robots.txt 授权错误
```
=== Check 3: robots.txt Availability ===
✗ robots.txt returned 401 Unauthorized
  This is CRITICAL - Google crawler will be blocked!
```

## 常见问题

### Q: 为什么后端检查失败（404）？
**A**: Render 免费层服务在不活跃时会自动休眠。这是正常现象，不影响前端和 robots.txt。

### Q: 邮件检查为什么显示 DEV 模式？
**A**: 本地开发环境通常不配置 SendGrid API key。邮件服务会将验证码打印到控制台而不是发送邮件。

### Q: robots.txt 返回 401 怎么办？
**A**: 这是严重问题，会阻止 Google 爬虫。通常是部署期间的临时问题，等待几分钟后重试。

### Q: 如何在 CI/CD 中使用？
**A**: 脚本可以直接集成到 CI/CD 流程中：

```yaml
# GitHub Actions 示例
- name: Health Check
  run: |
    chmod +x scripts/health_check.sh
    ./scripts/health_check.sh production
```

## 定时监控

### Cron 设置

每小时执行一次健康检查并记录日志：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每小时执行）
0 * * * * /path/to/scholarmap/scripts/health_check.sh production >> /var/log/scholarmap_health.log 2>&1
```

### 通知设置

结合邮件通知：

```bash
#!/bin/bash
SCRIPT_DIR="/path/to/scholarmap/scripts"
EMAIL="admin@scholarmap.com"

$SCRIPT_DIR/health_check.sh production || \
  echo "Health check failed at $(date)" | \
  mail -s "ScholarMap Health Check Alert" $EMAIL
```

## 依赖要求

- `bash` (版本 4.0+)
- `curl` (用于 HTTP 请求)
- `grep` (用于文本匹配)

## 故障排除

### 无法连接到服务器
```bash
# 检查网络连接
ping scholarmap-frontend.onrender.com

# 检查 DNS 解析
nslookup scholarmap-frontend.onrender.com
```

### 脚本权限问题
```bash
# 确保脚本可执行
chmod +x scripts/health_check.sh

# 检查文件权限
ls -l scripts/health_check.sh
```

## 相关文档

- [部署文档](../documents/DEPLOYMENT_CHECKLIST.md)
- [SEO 索引优化](../documents/SEO/SEO_INDEXING_ACCELERATION_PLAN.md)
- [Render 部署指南](../documents/RENDER_DEPLOYMENT_GUIDE.md)

## 更新日志

### 2026-02-01
- ✅ 创建健康检查脚本
- ✅ 支持本地和生产环境
- ✅ 检查系统可用性、邮件服务、robots.txt
- ✅ 智能跳过不可用服务的检查
- ✅ 彩色输出和详细状态报告
