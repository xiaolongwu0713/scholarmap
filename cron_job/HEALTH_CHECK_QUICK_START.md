# 健康检查系统 - 快速开始

**版本**: v2.1  
**新功能**: 
- ✅ 自动邮件报告（发送到 xiaolongwu0713@gmail.com）
- ✅ 集成资源快照
- ✅ 一键完成所有监控任务

## 🚀 **3 分钟快速上手**

### **基础用法**

```bash
# 生产环境完整检查（推荐）
./cron_job/health_check.sh production

# 生产环境快速检查（跳过性能测试）
./cron_job/health_check.sh production --skip-slow

# 本地环境检查
./cron_job/health_check.sh local

# 详细输出模式
./cron_job/health_check.sh production --verbose
```

---

## 📊 **检查项目一览**（共 57 项）

### ✅ **P0 - 关键检查**（37 项）
| 类别 | 检查项 | 说明 |
|------|--------|------|
| 系统 | 5 项 | Backend, Frontend, Demo, API, HTTPS |
| SEO  | 29 项 | 5 fields + 10 countries + 10 cities + robots + sitemap |
| 性能 | 3 项 | 首页, SEO 页面, Demo 页面加载时间 |

### ⚡ **P1 - 重要检查**（14 项）
| 类别 | 检查项 | 说明 |
|------|--------|------|
| SEO  | 2 项 | Meta tags, Sitemap 内容 |
| API  | 3 项 | 健康端点, Map API, Country API |
| 认证 | 3 项 | 密码要求, 邮件验证, 配置端点 |
| 错误 | 2 项 | 404 页面, Favicon |
| 安全 | 4 项 | 端点保护验证 |

### 🔧 **P2 - 建议检查**（6 项）
| 类别 | 检查项 | 说明 |
|------|--------|------|
| 优化 | 2 项 | Sitemap 大小, HTML 大小 |
| 安全 | 3 项 | Security Headers |
| 配置 | 1 项 | CORS |

---

## 📈 **输出示例**

### 成功案例
```
╔════════════════════════════════════════╗
║  PRODUCTION Environment Health Check  ║
╚════════════════════════════════════════╝

═══ P0: Critical System Availability ═══
→ Backend Service
✓ Backend is healthy (HTTP 200, 0.234s)

→ Frontend Service
✓ Frontend is healthy (HTTP 200, 0.156s)

... (more checks)

═══ Health Check Summary ═══
Total Checks:   57
Passed:         54
Failed:         0
Warnings:       3
Skipped:        0

Success Rate:   95%

╔════════════════════════════════════════╗
║  ✓ All Critical Checks Passed!        ║
╚════════════════════════════════════════╝
```

### 失败案例
```
→ Backend Service
✗ Backend health check failed (HTTP 401)
  Response: {"detail":"Not authenticated"}

→ Country Pages (Top 10)
✗ Too many country pages failing (3/10)

═══ Health Check Summary ═══
Total Checks:   57
Passed:         47
Failed:         5
Warnings:       4
Skipped:        1

Success Rate:   82%

╔════════════════════════════════════════╗
║  ✗ Some Checks Failed                  ║
╚════════════════════════════════════════╝
```

---

## 🎯 **常见使用场景**

### 1. 部署后验证
```bash
# Render 部署完成后立即运行
./cron_job/health_check.sh production --skip-slow

# 5 分钟后运行完整检查
sleep 300 && ./cron_job/health_check.sh production
```

### 2. 定期监控
```bash
# 添加到 crontab
crontab -e

# 每小时快速检查
0 * * * * /path/to/health_check.sh production --skip-slow >> /var/log/health.log 2>&1

# 每天凌晨完整检查
0 0 * * * /path/to/health_check.sh production --verbose >> /var/log/health_daily.log 2>&1
```

### 3. CI/CD 集成
```yaml
# .github/workflows/health-check.yml
- name: Health Check
  run: ./cron_job/health_check.sh production --skip-slow
```

### 4. 调试特定问题
```bash
# 详细查看所有页面状态
./cron_job/health_check.sh production --verbose

# 只检查快速项目
./cron_job/health_check.sh production --skip-slow
```

---

## 📧 **邮件报告功能**

### 自动发送

生产环境检查完成后自动发送报告到：**xiaolongwu0713@gmail.com**

### 邮件内容
- ✅ 检查摘要（通过/失败/警告）
- ✅ 执行时间和环境
- ✅ Backend/Frontend 状态
- ⚠️ 失败详情（如有）

### 邮件示例

**主题**: `✓ ScholarMap Health Check Passed - 2026-02-01`

**正文**:
```
Total Checks:   54
Passed:         52
Failed:         0
Warnings:       2
Success Rate:   96%

✓ All Critical Checks Passed!
```

### 配置邮件命令

需要 `mail` 或 `sendmail` 命令：

```bash
# macOS (通常已安装)
command -v mail

# Linux
sudo apt-get install mailutils  # Ubuntu
sudo yum install mailx          # CentOS
```

---

## 💾 **资源快照功能**

### 自动记录

生产环境检查时自动记录数据库资源使用情况。

### 快照内容
- 📊 数据表行数
- 💿 磁盘使用情况
- 📅 时间戳

### 用途
- 📈 趋势分析
- ⚠️ 异常检测
- 📊 容量规划

### 查看快照

```bash
# 通过 admin API 查看（需要认证）
curl -H "Authorization: Bearer TOKEN" \
  https://scholarmap-q1k1.onrender.com/api/admin/resource-monitor/stats?days=30
```

---

## ⚠️ **故障排除**

### 问题 1: Backend 401 错误
```
✗ Backend health check failed (HTTP 401)
```

**解决**: 
1. 检查 `backend/app/auth/middleware.py`
2. 确保 `/healthz` 在 `PUBLIC_PATHS` 中
3. 重新部署 backend

### 问题 2: 大量 SEO 页面 404
```
✗ Too many field pages failing (2/5)
```

**解决**:
1. 检查 frontend 部署日志
2. 验证 `frontend/src/app` 目录结构
3. 重新部署 frontend

### 问题 3: Backend 休眠（Render 免费层）
```
✗ Backend health check failed (HTTP 404)
Note: Backend might be sleeping
```

**解决**: 等待 10-30 秒后重试，这是 Render 免费层的正常行为。

### 问题 4: 性能超时
```
⚠ Demo page loads slowly: 15s (>= 8s)
```

**解决**:
1. 使用 `--skip-slow` 跳过性能检查
2. 检查数据库查询性能
3. 优化慢 API

---

## 📋 **性能基准**

### 页面加载时间

| 页面 | 优秀 | 良好 | 需改进 |
|------|------|------|--------|
| 首页 | < 1s | < 2s | >= 2s |
| SEO | < 1.5s | < 3s | >= 3s |
| Demo | < 3s | < 5s | >= 5s |

### API 响应时间

| API | 优秀 | 良好 | 需改进 |
|-----|------|------|--------|
| /healthz | < 0.5s | < 2s | >= 2s |
| Map API | < 1s | < 2s | >= 2s |

---

## 🔗 **相关命令**

```bash
# 查看帮助
./cron_job/health_check.sh --help

# 检查脚本语法
bash -n cron_job/health_check.sh

# 查看完整文档
cat cron_job/health_check_README.md
```

---

## 📞 **需要帮助？**

- 📖 完整文档: `cron_job/health_check_README.md`
- 🐛 报告问题: GitHub Issues
- 💬 讨论: GitHub Discussions

---

## 🎓 **最佳实践**

### ✅ 推荐做法
1. **部署后立即检查**: `--skip-slow` 快速验证
2. **每天定时检查**: 完整检查发现问题
3. **CI/CD 集成**: 自动化健康检查
4. **监控告警**: 失败时发送通知

### ❌ 避免做法
1. 不要在高峰期运行完整检查（影响性能）
2. 不要忽略 Warning（可能是潜在问题）
3. 不要过于频繁运行（每 15 分钟已足够）

---

## 📊 **退出码**

- `0` - 所有检查通过（可能有 Warning）
- `1` - 一个或多个检查失败

**注意**: Warning 不会导致退出码为 1

---

**版本**: v2.0  
**最后更新**: 2026-02-01  
**维护者**: ScholarMap Team
