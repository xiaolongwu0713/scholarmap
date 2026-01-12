# Resource Monitoring System

资源监控系统已成功实施，用于追踪 ScholarMap 数据库的资源使用情况。

## 功能概述

### 监控指标

**指标 1-4：历史数据（每日快照）**
1. **所有表格的行数**：users, projects, runs, papers, authorship, run_papers, affiliation_cache, geocoding_cache, institution_geo
2. **所有表占磁盘空间大小（MB）**：每个表的磁盘占用情况
3. **注册用户数量**：users_count
4. **Run 总数**：runs_count

**指标 5：实时数据**
5. **当前在线用户数**：最近 5 分钟活跃的用户数量

### 数据收集策略

- **历史数据**：每天 09:00 自动执行快照（通过 cron）
- **实时数据**：按需查询（通过前端按钮触发）
- **去重逻辑**：同一天多次运行只保留最新的快照（UPSERT by date）

---

## 实施架构

### 1. 数据库表

#### `resource_snapshots` 表
存储每日资源快照数据。

```sql
CREATE TABLE resource_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,  -- 按天去重
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 指标1：表行数
    users_count INTEGER,
    projects_count INTEGER,
    runs_count INTEGER,
    papers_count INTEGER,
    authorship_count INTEGER,
    ...
    
    -- 指标2：磁盘空间（MB）
    total_disk_size_mb FLOAT,
    users_disk_mb FLOAT,
    projects_disk_mb FLOAT,
    ...
);
```

#### `user_activity` 表
追踪用户活动时间，用于计算在线用户数。

```sql
CREATE TABLE user_activity (
    user_id VARCHAR(64) PRIMARY KEY,
    last_active_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ...
);
```

### 2. 后端组件

#### Repository 层
- `ResourceMonitorRepository`：负责查询表统计信息和保存快照
- `UserActivityRepository`：负责更新用户活动时间和查询在线用户

文件位置：`backend/app/db/resource_monitor_repository.py`

#### API 端点
- `POST /api/admin/resource-monitor/snapshot`：手动触发快照（指标1-4）
- `GET /api/admin/resource-monitor/stats?days=30`：获取历史快照数据
- `GET /api/admin/resource-monitor/online-users`：获取在线用户数（指标5）

**权限要求**：仅 super user 可访问（email 验证）

文件位置：`backend/app/main.py`（admin 路由部分）

#### 中间件更新
`AuthMiddleware` 已更新，每次认证请求会自动更新用户活动时间。

文件位置：`backend/app/auth/middleware.py`

### 3. 自动化脚本

#### Python 快照脚本
`scripts/take_resource_snapshot.py`

功能：
- 连接数据库
- 收集表行数和磁盘大小
- 保存快照到 `resource_snapshots` 表（UPSERT）

#### Shell 包装脚本
`scripts/take_resource_snapshot.sh`

功能：
- 激活 conda `maker` 环境
- 执行 Python 快照脚本
- 记录日志到 `logs/resource_snapshot.log`

#### Cron 配置
每天 09:00 自动执行快照：

```cron
0 9 * * * /Users/xiaowu/local_code/scholarmap/scripts/take_resource_snapshot.sh
```

配置方法：
```bash
crontab -e
# 添加上面的 cron 条目
```

详细说明请参考：`CRON_SETUP.md`

### 4. 前端界面

#### 主页监控面板
仅 super user 可见（通过 email 判断）。

**功能按钮：**
1. **🔄 Refresh Resource Snapshot**：手动触发快照（指标1-4）
2. **👥 Check Online Users**：实时查询在线用户数（指标5）

**显示内容：**
- 最新快照时间
- 表行数统计（用户、项目、Run、论文、作者关系等）
- 磁盘空间统计（总计、各表分别）
- 在线用户数（最近5分钟活跃）

文件位置：`frontend/src/app/page.tsx`

---

## 使用指南

### 初次部署

1. **执行数据库迁移**：
```bash
cd /Users/xiaowu/local_code/scholarmap
psql $DATABASE_URL -f scripts/create_resource_monitoring_tables.sql
```

2. **设置 cron 任务**：
```bash
crontab -e
# 添加：
0 9 * * * /Users/xiaowu/local_code/scholarmap/scripts/take_resource_snapshot.sh
```

3. **手动测试脚本**：
```bash
./scripts/take_resource_snapshot.sh
# 检查日志
cat logs/resource_snapshot.log
```

4. **重启后端服务**（应用代码更改）：
```bash
cd backend
./start_local.sh
```

5. **重启前端服务**（如果需要）：
```bash
cd frontend
npm run dev
```

### Super User 访问

1. 使用 super user 账号登录：`xiaolongwu0713@gmail.com`
2. 进入主页，会看到 "System Resource Monitor" 面板（绿色边框）
3. 点击按钮查看资源统计

### 手动触发快照

**方法 1：前端按钮**
- 登录 super user 账号
- 点击 "🔄 Refresh Resource Snapshot" 按钮

**方法 2：命令行**
```bash
./scripts/take_resource_snapshot.sh
```

**方法 3：API 调用**
```bash
curl -X POST http://localhost:8000/api/admin/resource-monitor/snapshot \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

---

## 技术细节

### UPSERT 逻辑
使用 PostgreSQL 的 `ON CONFLICT DO UPDATE` 确保同一天只保留一个快照：

```python
stmt = pg_insert(ResourceSnapshot).values(**snapshot_data)
stmt = stmt.on_conflict_do_update(
    index_elements=["snapshot_date"],
    set_={...}  # 更新所有字段
)
```

### 在线用户计算
定义：最近 5 分钟有 API 活动的用户视为在线。

```sql
SELECT COUNT(DISTINCT user_id) 
FROM user_activity 
WHERE last_active_at > NOW() - INTERVAL '5 minutes';
```

每次认证请求会自动更新 `user_activity` 表：
```python
# 在 AuthMiddleware 中
await activity_repo.update_activity(user_id)
```

### 磁盘空间查询
使用 PostgreSQL 系统函数：

```sql
SELECT 
    tablename,
    pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0) AS size_mb
FROM pg_tables
WHERE schemaname = 'public';
```

`pg_total_relation_size` 包括表数据、索引、TOAST 数据等总大小。

### Super User 验证
前端：
```typescript
function isSuperUser(): boolean {
  const user = getUser();
  return user?.email === "xiaolongwu0713@gmail.com";
}
```

后端：
```python
async def verify_super_user(request: Request):
    user_id = request.state.user_id
    user = await repo.get_user_by_id(user_id)
    if user.email != settings.super_user_email:
        raise HTTPException(403, "Super user access required")
```

---

## 日志和监控

### 日志文件
- **Cron 执行日志**：`logs/resource_snapshot.log`
- **后端 API 日志**：查看终端输出或配置的日志文件

### 日志格式示例
```
========================================
[2026-01-12 09:00:00] Starting resource snapshot cron job
========================================
Activating conda environment 'maker'...
Running snapshot script...
Collecting table row counts...
  users: 10 rows
  projects: 25 rows
  runs: 50 rows
  ...
Collecting disk sizes...
  Total: 125.45 MB
  ...
Saving snapshot...
✅ Snapshot saved successfully!
   Snapshot ID: 42
   Snapshot Date: 2026-01-12
   Total Users: 10
   Total Runs: 50
   Total Disk: 125.45 MB
========================================
[2026-01-12 09:00:05] ✅ Snapshot completed successfully
========================================
```

---

## 维护和扩展

### 数据保留策略
当前实现：快照无限期保留。

建议：定期清理旧数据（如保留 90 天）。

添加清理任务：
```python
# 在 cron 中或单独脚本中调用
async with db_manager.session() as session:
    repo = ResourceMonitorRepository(session)
    deleted = await repo.cleanup_old_snapshots(keep_days=90)
    print(f"Deleted {deleted} old snapshots")
```

### 扩展监控指标
要添加新的监控指标：

1. 修改 `resource_snapshots` 表结构（添加列）
2. 更新 `ResourceMonitorRepository.take_snapshot()` 方法
3. 更新前端类型定义和显示逻辑

### 性能优化
如果磁盘空间查询较慢：
1. 考虑缓存结果（5分钟）
2. 使用 `pg_relation_size` 代替 `pg_total_relation_size`（仅表数据，不含索引）
3. 将查询移至后台任务

---

## 故障排查

### Cron 任务不执行
1. 检查 cron 服务：`ps aux | grep cron`
2. 检查 crontab：`crontab -l`
3. 检查日志：`cat logs/resource_snapshot.log`
4. 验证 conda 路径：确保脚本中的 conda 路径正确

### API 返回 403 Forbidden
- 确认登录的是 super user 账号（`xiaolongwu0713@gmail.com`）
- 检查 JWT token 是否有效

### 数据库连接失败
- 检查 `.env` 文件中的 `DATABASE_URL`
- 测试连接：`python backend/test_db_connection.py`

### 前端不显示监控面板
- 确认用户 email 匹配 super user email
- 检查浏览器控制台错误信息
- 清除浏览器缓存和 localStorage

---

## 文件清单

### 新增文件
- `backend/app/db/models.py` - 添加了 ResourceSnapshot, UserActivity 模型
- `backend/app/db/resource_monitor_repository.py` - Repository 实现
- `scripts/create_resource_monitoring_tables.sql` - 数据库迁移 SQL
- `scripts/take_resource_snapshot.py` - Python 快照脚本
- `scripts/take_resource_snapshot.sh` - Shell 包装脚本
- `CRON_SETUP.md` - Cron 配置指南
- `RESOURCE_MONITORING.md` - 本文档

### 修改文件
- `backend/app/main.py` - 添加 admin 资源监控 API
- `backend/app/auth/middleware.py` - 添加用户活动追踪
- `frontend/src/lib/api.ts` - 添加资源监控 API 函数
- `frontend/src/lib/auth.ts` - 添加 isSuperUser() 函数
- `frontend/src/app/page.tsx` - 添加监控面板 UI

---

## 安全考虑

1. **权限控制**：所有 admin API 都验证 super user 权限
2. **数据访问**：仅 super user 可查看系统级统计信息
3. **日志敏感信息**：日志中不包含敏感数据（密码、token 等）
4. **速率限制**：考虑对 admin API 添加速率限制（防止滥用）

---

## 未来改进

1. **趋势图表**：添加历史数据的可视化图表（使用 recharts 或 Chart.js）
2. **告警系统**：当指标异常时发送通知（如磁盘空间接近上限）
3. **更多指标**：
   - API 请求数量统计
   - 平均响应时间
   - 错误率统计
   - LLM API 调用次数和成本
4. **仪表板**：专门的管理员仪表板页面（而不是嵌入主页）
5. **导出功能**：将历史数据导出为 CSV/Excel
6. **实时刷新**：使用 WebSocket 或轮询实现实时更新

---

## 总结

资源监控系统已完整实施，包括：
- ✅ 数据库表设计（resource_snapshots, user_activity）
- ✅ 后端 Repository 和 API
- ✅ 自动化快照脚本（cron）
- ✅ 前端监控面板（super user 专用）
- ✅ 用户活动追踪（在线用户统计）

系统现在可以：
- 每天 09:00 自动收集资源快照
- Super user 手动触发快照更新
- 实时查询在线用户数
- 显示表行数和磁盘空间统计

所有功能已测试就绪，请按照部署指南进行初次部署。
