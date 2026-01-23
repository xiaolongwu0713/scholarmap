# Background Ingest Implementation Summary

## 概述

实现了方案A（内存状态追踪），在 Query 步骤完成后自动在后台启动 Mapping (Ingestion) 任务，显著提升用户体验。

## 实现日期

2026-01-23

## 修改的文件

### 1. 新增：`backend/app/background_tasks.py` (352 行)

后台任务管理器的核心实现。

**主要组件**：

- `IngestTask`: 数据类，存储任务状态信息
  - `run_id`: 运行ID
  - `status`: pending/running/completed/failed
  - `result`: 完成时的统计结果
  - `error`: 失败时的错误信息
  - `started_at`, `completed_at`: 时间戳
  - `project_id`: 项目ID

- `BackgroundIngestManager`: 任务管理器类
  - `start_ingest_task()`: 启动后台任务
  - `get_task_status()`: 查询任务状态
  - `wait_for_task()`: 等待任务完成
  - `cleanup_old_tasks()`: 清理过期任务
  - `start_periodic_cleanup()`: 启动周期性清理
  - `get_stats()`: 获取管理器统计信息

- `background_ingest_manager`: 全局单例实例

**关键特性**：

- 非阻塞任务执行
- 自动错误处理和日志记录
- 防止重复任务启动
- 周期性清理（默认24小时）

### 2. 修改：`backend/app/main.py`

#### 2.1 启动时初始化 (第 66-80 行)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... database initialization ...
    
    # NEW: Initialize background task manager
    from app.background_tasks import background_ingest_manager
    await background_ingest_manager.start_periodic_cleanup(interval_hours=1)
    print("✅ Background task manager initialized with periodic cleanup")
    
    yield
    # ... shutdown ...
```

#### 2.2 Query Endpoint 修改 (第 534-600 行)

在 `phase1_query()` 函数末尾添加：

```python
# Auto-start background ingest after query completes
from app.background_tasks import background_ingest_manager
from app.phase2.pg_ingest import PostgresIngestionPipeline

async def run_background_ingest():
    """Background ingest coroutine."""
    pipeline = PostgresIngestionPipeline(...)
    return await pipeline.ingest_run(...)

# Start background task (don't await)
try:
    background_ingest_manager.start_ingest_task(
        run_id=run_id,
        project_id=project_id,
        ingest_coroutine=run_background_ingest()
    )
    logger.info(f"🚀 Auto-started background ingest for run {run_id}")
except Exception as e:
    logger.warning(f"⚠️  Failed to start background ingest: {e}")
```

**重要**：使用 try-except 包裹，确保后台任务启动失败不会影响 Query 返回。

#### 2.3 Ingest Endpoint 修改 (第 973-1090 行)

在 `phase2_ingest()` 函数开头添加后台任务检查：

```python
from app.background_tasks import background_ingest_manager

if not req.force_refresh:
    bg_task = background_ingest_manager.get_task_status(run_id)
    
    if bg_task:
        if bg_task.status == "completed":
            # Return immediately - cache hit!
            return {"stats": bg_task.result}
        
        elif bg_task.status == "running":
            # Wait for background task to complete
            result_task = await background_ingest_manager.wait_for_task(run_id)
            if result_task and result_task.status == "completed":
                return {"stats": result_task.result}

# Original synchronous logic follows...
```

**逻辑流程**：

1. 如果 `force_refresh=true`，跳过检查，直接执行
2. 检查后台任务状态：
   - `completed`: 立即返回结果（秒级响应）✨
   - `running`: 等待完成（继承现有进度）
   - `failed` 或不存在: 执行同步逻辑（向后兼容）

#### 2.4 新增：Status Endpoint (第 1092-1150 行)

```python
@app.get("/api/projects/{project_id}/runs/{run_id}/ingest/status")
async def get_ingest_status(request: Request, project_id: str, run_id: str) -> dict:
    """Get background ingest task status."""
    # Check background task manager
    task = background_ingest_manager.get_task_status(run_id)
    
    if task:
        return {
            "status": task.status,
            "background_task": True,
            "started_at": ...,
            "completed_at": ...,
            "stats": ...,  # if completed
            "error": ...   # if failed
        }
    
    # Check database for existing data
    try:
        stats_result = await phase2_authorship_stats(...)
        if stats_result.get("stats"):
            return {"status": "completed", "background_task": False, ...}
    except:
        pass
    
    return {"status": "not_started", "background_task": False}
```

**用途**：
- 前端可选轮询，显示后台进度
- 调试和监控工具
- 健康检查

### 3. 修改：`frontend/src/lib/api.ts`

添加了类型定义和API函数：

```typescript
export interface IngestStatus {
  status: "not_started" | "pending" | "running" | "completed" | "failed";
  background_task: boolean;
  started_at?: string;
  completed_at?: string;
  stats?: IngestStats;
  error?: string;
}

export async function getIngestStatus(
  projectId: string,
  runId: string
): Promise<IngestStatus> {
  // ...
}
```

**注意**：前端代码改动最小，保持向后兼容。现有的 `runIngest()` 调用无需修改。

### 4. 更新：`documents/INGESTION_PROCESS.md`

添加了完整的优化方案文档（第910-1050行），包括：
- 问题背景
- 方案A详细设计
- 方案B设计概览（后续可实现）
- 监控和调试指南

## 工作流程

### 用户场景 1：正常流程（后台任务成功）

```
时间线：
T0: 用户点击 "Query"
T1: Query 完成，返回结果 (2s)
T2: 后台自动启动 Ingest (async, non-blocking)
T3: 用户点击 "Mapping" (5s later)
T4: 检查后台任务 → 已完成! 立即返回 (0.1s) ✨

总等待时间：2s + 0.1s = 2.1s
原等待时间：2s + 120s = 122s
节省：119.9s (98%改善)
```

### 用户场景 2：用户点击时后台还在运行

```
时间线：
T0: 用户点击 "Query"
T1: Query 完成 (2s)
T2: 后台启动 Ingest
T3: 用户立即点击 "Mapping" (1s later)
T4: 检查后台任务 → 运行中，等待完成 (119s)
T5: 后台任务完成，返回结果

总等待时间：2s + 1s + 119s = 122s
原等待时间：2s + 120s = 122s
节省：0s (但不会重复执行，体验一致)
```

### 用户场景 3：后台任务失败

```
时间线：
T0: 用户点击 "Query"
T1: Query 完成 (2s)
T2: 后台启动 Ingest
T3: 后台任务失败 (LLM API error)
T4: 用户点击 "Mapping"
T5: 检查后台任务 → 失败，执行同步 Ingest (120s)
T6: 同步完成，返回结果

总等待时间：2s + wait_time + 120s
降级到原始行为，用户体验不受影响
```

## 日志输出示例

### Query 完成时
```
🚀 Auto-started background ingest for run abc123
```

### 后台任务运行中
```
⚙️  Background ingest running for run abc123
```

### 后台任务完成
```
✅ Background ingest completed for run abc123 in 118.45s
```

### 用户点击时命中缓存
```
================================================================================
⚡ CACHE HIT - Background ingest already completed for run abc123
   Project: proj456
   Completed at: 2026-01-23T12:10:15.123456
================================================================================
```

### 用户点击时等待后台任务
```
================================================================================
⏳ WAITING - Background ingest in progress for run abc123
   Project: proj456
   Started at: 2026-01-23T12:08:00.000000
================================================================================
✅ Background ingest completed after wait for run abc123
```

## 性能指标

**预期改善**：

- **缓存命中率**: 预计 70-90%（取决于用户行为）
- **响应时间**: 缓存命中时从 120s 降至 < 1s
- **用户体验**: 大幅提升，mapping 可能"瞬间"完成

**资源影响**：

- **CPU**: 后台任务会提前占用 CPU（LLM调用、数据处理）
- **内存**: 每个任务约 1-10KB（可忽略）
- **LLM Quota**: 提前消耗（用户点击前就开始调用）
- **数据库**: 提前写入数据

**建议监控**：

```python
# 获取管理器统计
from app.background_tasks import background_ingest_manager
stats = background_ingest_manager.get_stats()

# 输出：
{
    "total_tasks": 42,
    "pending": 0,
    "running": 3,
    "completed": 38,
    "failed": 1,
    "active_handles": 3
}
```

## 测试建议

### 手动测试

1. **正常流程测试**：
   ```bash
   # 1. Create run and query
   curl -X POST .../runs/{run_id}/query
   
   # 2. Wait 2-3 minutes (让后台完成)
   
   # 3. Check status (optional)
   curl .../runs/{run_id}/ingest/status
   # 应该看到 status: "completed"
   
   # 4. Click mapping
   curl -X POST .../runs/{run_id}/ingest
   # 应该立即返回 (< 1s)
   ```

2. **快速点击测试**：
   ```bash
   # 1. Query
   curl -X POST .../runs/{run_id}/query
   
   # 2. 立即点击 Mapping (不等待)
   curl -X POST .../runs/{run_id}/ingest
   # 应该等待后台任务完成，但不会重复执行
   ```

3. **Force refresh 测试**：
   ```bash
   # 应该绕过缓存，重新执行
   curl -X POST .../runs/{run_id}/ingest \
     -d '{"force_refresh": true}'
   ```

### 日志检查

搜索以下日志关键词：
- `🚀 Auto-started background ingest`
- `⚡ CACHE HIT`
- `⏳ WAITING - Background ingest in progress`
- `❌ Background ingest failed`

## 已知限制

1. **服务器重启丢失状态**
   - 后台任务状态保存在内存中
   - 服务器重启后，所有任务状态丢失
   - 用户需要重新点击 Mapping 按钮
   - **解决方案**：升级到 Redis 方案B

2. **不支持多实例部署**
   - 每个服务器实例独立追踪任务
   - 可能导致重复执行
   - **解决方案**：升级到 Redis 方案B

3. **内存占用**
   - 每个任务约 1-10KB
   - 24小时自动清理
   - 预计影响很小（1000个任务 = 10MB）

4. **资源抢占**
   - 后台任务会占用服务器资源
   - 在高负载时期可能需要监控
   - **建议**：监控服务器 CPU/内存使用率

## 未来改进

### 短期（可选）

1. **前端进度显示**
   - 轮询 `/ingest/status` endpoint
   - 显示"后台正在处理..."提示
   - 预估完成时间

2. **更细粒度的统计**
   - 记录缓存命中率
   - 记录平均节省时间
   - 生成性能报告

### 长期（生产环境）

3. **升级到 Redis 方案B**
   - 支持多实例部署
   - 状态持久化
   - 分布式锁
   - 详见 `INGESTION_PROCESS.md`

4. **WebSocket 实时推送**
   - 后台任务完成时主动通知前端
   - 避免轮询
   - 更好的用户体验

5. **智能调度**
   - 根据系统负载决定是否启动后台任务
   - 高峰期延迟启动
   - 低谷期提前预热

## 回滚计划

如果需要禁用此功能：

1. **临时禁用**（保留代码）：
   ```python
   # 在 phase1_query() 中注释掉后台任务启动代码
   # try:
   #     background_ingest_manager.start_ingest_task(...)
   # except:
   #     ...
   ```

2. **完全回滚**：
   ```bash
   # 恢复到实现前的版本
   git revert <commit_hash>
   ```

系统会自动降级到原始同步行为。

## 相关文档

- [INGESTION_PROCESS.md](./INGESTION_PROCESS.md) - 完整的 Ingestion 流程文档
- [trigger_INGESTION.md](./trigger_INGESTION.md) - 手动触发 Ingestion 的方法

## 维护者

- 实现日期: 2026-01-23
- 最后更新: 2026-01-23
