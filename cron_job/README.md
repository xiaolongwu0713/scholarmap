# Cron Job & Monitoring Scripts

本目录包含所有定时任务和监控相关的脚本。

---

## 📁 文件说明

### 🎯 主要脚本

#### `health_check.sh` ⭐ 主要监控脚本
**功能**: 全面的系统健康检查（57+ 检查项）

**包含功能**:
- ✅ 系统可用性检查（Backend, Frontend, Demo）
- ✅ SEO 页面状态检查（25 个关键页面）
- ✅ 性能监控（页面加载时间、API 响应时间）
- ✅ 安全检查（端点保护、Security Headers）
- ✅ **资源快照**（数据库使用情况记录）
- ✅ **邮件报告**（自动发送到 xiaolongwu0713@gmail.com）

**使用**:
```bash
# 完整检查（含邮件和资源快照）
./cron_job/health_check.sh production

# 快速检查（跳过慢测试）
./cron_job/health_check.sh production --skip-slow

# 本地环境测试
./cron_job/health_check.sh local
```

**Cron 配置**:
```bash
# 每天早上 9 点执行完整检查
0 9 * * * /path/to/scholarmap/cron_job/health_check.sh production >> /var/log/health.log 2>&1
```

---

#### `take_resource_snapshot.py` 📊 资源快照脚本
**功能**: 记录数据库资源使用情况

**内容**:
- 数据表行数统计
- 磁盘使用情况
- 时间戳记录

**使用**:
```bash
python cron_job/take_resource_snapshot.py
```

**注意**: 此脚本已集成到 `health_check.sh` 中，通常不需要单独运行。

---

### 📚 文档

#### `health_check_README.md` 📖 完整文档
- 所有检查项的详细说明
- 配置指南
- CI/CD 集成
- 故障排除
- 邮件和资源快照配置

#### `HEALTH_CHECK_QUICK_START.md` 🚀 快速开始
- 3 分钟快速上手
- 常见使用场景
- 快速参考

#### `DEPLOYMENT_COMPLETE.md` 📋 部署完成记录
- 资源监控部署历史
- Cron job 配置记录

---

## 🚀 **快速开始**

### 1. 运行健康检查

```bash
# 进入项目目录
cd /path/to/scholarmap

# 运行生产环境检查
./cron_job/health_check.sh production
```

### 2. 查看结果

脚本会输出：
- ✓ 绿色 - 检查通过
- ✗ 红色 - 检查失败
- ⚠ 黄色 - 警告
- ⊘ 青色 - 跳过

并在最后显示摘要：
```
Total Checks:   57
Passed:         54
Failed:         0
Warnings:       3
Success Rate:   95%

✓ All Critical Checks Passed!
```

### 3. 接收邮件报告

如果在生产环境运行，你会收到包含摘要的邮件。

---

## ⏰ **设置定时任务**

### 推荐 Cron 配置

```bash
# 编辑 crontab
crontab -e

# 添加以下行

# 每天早上 9 点：完整检查 + 邮件报告 + 资源快照
0 9 * * * /Users/xiaowu/local_code/scholarmap/cron_job/health_check.sh production >> /var/log/scholarmap_health.log 2>&1

# 每 6 小时：快速检查（仅日志，不发邮件）
0 */6 * * * /Users/xiaowu/local_code/scholarmap/cron_job/health_check.sh production --skip-slow >> /var/log/scholarmap_health_quick.log 2>&1
```

### 验证 Cron 设置

```bash
# 查看当前 cron jobs
crontab -l

# 测试脚本执行
./cron_job/health_check.sh production --skip-slow
```

---

## 📊 **监控内容**

### 系统层面
- Backend API 可用性
- Frontend 应用可用性
- Demo 功能正常性
- HTTPS 配置

### SEO 层面
- 25 个关键页面状态
- robots.txt 和 sitemap.xml
- Meta tags 完整性

### 性能层面
- 页面加载时间
- API 响应时间
- 资源文件大小

### 安全层面
- 端点认证保护
- Security Headers
- CORS 配置

### 数据库层面
- 资源使用快照
- 表行数统计
- 磁盘使用情况

---

## 🔧 **配置说明**

### 修改邮件地址

编辑 `health_check.sh` 中的这一行：

```bash
ADMIN_EMAIL="xiaolongwu0713@gmail.com"
```

改为你的邮箱地址。

### 修改 Demo Run ID

如果 demo run 改变，编辑：

```bash
DEMO_PROJECT_ID="6af7ac1b6254"
DEMO_RUN_ID="53e099cdb74e"
```

### 修改性能基准

在脚本中调整性能阈值：

```bash
# 页面加载时间（秒）
HOMEPAGE_GOOD=2
SEO_PAGE_GOOD=3
DEMO_PAGE_GOOD=5

# API 响应时间（秒）
API_FAST=0.5
API_GOOD=2
```

---

## 📚 **相关资源**

### 文档
- 📖 [完整文档](./health_check_README.md)
- 🚀 [快速开始](./HEALTH_CHECK_QUICK_START.md)
- 📋 [部署记录](./DEPLOYMENT_COMPLETE.md)

### 相关工具
- Python 快照脚本: `take_resource_snapshot.py`
- 测试报告: `../documents/SEO/HEALTH_CHECK_TEST_REPORT.md`

---

## 🎯 **最佳实践**

### ✅ 推荐做法
1. 每天至少运行一次完整检查
2. 每 6 小时运行快速检查
3. 设置邮件告警（已内置）
4. 定期查看资源快照趋势
5. 部署后立即运行验证

### ❌ 避免做法
1. 不要过于频繁运行完整检查（影响服务器）
2. 不要在高峰期运行性能测试
3. 不要忽略警告信息
4. 不要禁用邮件报告（重要告警机制）

---

## 🆘 **获取帮助**

### 遇到问题？

1. 查看 [完整文档](./health_check_README.md)
2. 查看 [快速排查](./HEALTH_CHECK_QUICK_START.md#故障排除)
3. 运行 `./cron_job/health_check.sh production --verbose` 获取详细信息

### 联系方式
- Email: xiaolongwu0713@gmail.com
- GitHub: https://github.com/xiaolongwu0713/scholarmap

---

**版本**: v2.1  
**最后更新**: 2026-02-01  
**维护者**: ScholarMap Team
