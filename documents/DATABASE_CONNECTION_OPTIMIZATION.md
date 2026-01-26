# 数据库连接池优化方案

## 🚨 当前问题

### 问题描述
单个用户访问一个页面就能耗尽 30-50 个数据库连接，导致：
- 多用户并发时系统崩溃
- 连接超时错误频繁
- 不可扩展的架构

### 根本原因
1. **连接管理不当**：每个方法多次创建新 session（3+ 次/API 调用）
2. **缺乏连接池监控**：无法追踪连接使用情况
3. **查询效率低**：慢查询长时间占用连接
4. **缺乏缓存**：重复查询每次都访问数据库

---

## 🔧 解决方案

### P0 - 立即修复（今天）

#### 1. 修复连接泄漏
**问题**：`pg_aggregations.py` 中的方法多次创建 session

**修复方式**：传递 session 作为参数，复用连接

```python
# 修改前 (bad)
async def get_country_map(self, run_id: str, ...):
    async with db_manager.session() as session:  # 连接 1
        pmids = await self._get_run_pmids(session, run_id)
    
    async with db_manager.session() as session:  # 连接 2
        cached_items = await cache_repo.get_batch_cached(city_keys)
    
    async with db_manager.session() as session:  # 连接 3
        await cache_repo.cache_locations_batch(...)

# 修改后 (good)
async def get_country_map(self, session: AsyncSession, run_id: str, ...):
    # 使用传入的 session，整个请求只用 1 个连接
    pmids = await self._get_run_pmids(session, run_id)
    cached_items = await cache_repo.get_batch_cached(city_keys)
    await cache_repo.cache_locations_batch(...)
```

**影响范围**：
- `app/phase2/pg_aggregations.py` - 3 个主要方法
- `app/main.py` - 对应的 API endpoints

**工作量**：2-3 小时

---

#### 2. 增加连接池大小（临时）
**当前配置**：
```python
pool_size=20       # 基础连接
max_overflow=30    # 额外连接
# 总共 50 个连接
```

**推荐配置**（生产环境）：
```python
pool_size=50       # 基础连接
max_overflow=50    # 额外连接
pool_timeout=90    # 等待时间
pool_recycle=1800  # 30 分钟回收
# 总共 100 个连接
```

**注意**：这只是临时方案，不解决根本问题！

---

### P1 - 短期优化（本周）

#### 3. 添加 Redis 缓存
**目标**：缓存常用查询结果，减少数据库访问

**实现**：
```python
# 添加 Redis 缓存层
import redis.asyncio as redis

class CachedMapAggregator:
    def __init__(self):
        self.redis = redis.from_url("redis://localhost:6379")
    
    async def get_world_map(self, run_id: str, ...):
        cache_key = f"world_map:{run_id}:{min_confidence}"
        
        # 尝试从缓存获取
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # 缓存未命中，查询数据库
        data = await self._query_database(...)
        
        # 缓存结果（10 分钟）
        await self.redis.setex(cache_key, 600, json.dumps(data))
        return data
```

**缓存策略**：
- World map: 缓存 1 小时
- Country map: 缓存 30 分钟
- City map: 缓存 10 分钟

**依赖**：
```bash
pip install redis
```

**工作量**：4-6 小时

---

#### 4. 查询优化
**目标**：减少查询执行时间，释放连接更快

**优化点**：
1. **添加索引**：
```sql
CREATE INDEX idx_authorship_pmid_country ON authorship(pmid, country);
CREATE INDEX idx_authorship_pmid_city ON authorship(pmid, country, city);
CREATE INDEX idx_authorship_confidence ON authorship(affiliation_confidence);
```

2. **查询优化**：
- 使用 `EXPLAIN ANALYZE` 分析慢查询
- 避免 N+1 查询
- 批量操作替代循环

**工作量**：2-3 小时

---

#### 5. 添加请求限流
**目标**：防止单个用户发起过多请求

**实现**：使用 `slowapi`
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/projects/{project_id}/runs/{run_id}/map/world")
@limiter.limit("10/minute")  # 每分钟最多 10 次
async def phase2_map_world(...):
    ...
```

**限流配置**：
- 世界地图：10 次/分钟
- 国家地图：20 次/分钟
- 城市地图：30 次/分钟

**工作量**：2 小时

---

### P2 - 中期优化（2 周内）

#### 6. 连接池监控
**目标**：实时监控连接池使用情况

**实现**：
```python
import logging

async def monitor_connection_pool():
    """定期监控连接池状态"""
    while True:
        pool = db_manager.engine.pool
        logger.info(f"Connection Pool Stats:")
        logger.info(f"  Size: {pool.size()}")
        logger.info(f"  Checked out: {pool.checkedout()}")
        logger.info(f"  Overflow: {pool.overflow()}")
        logger.info(f"  Checked in: {pool.checkedin()}")
        await asyncio.sleep(60)  # 每分钟检查一次
```

**告警**：
- 连接使用率 > 80%：发送警告
- 连接使用率 > 95%：发送紧急告警

**工作量**：3-4 小时

---

#### 7. 异步任务队列
**目标**：将非关键任务移到后台处理

**实现**：使用 Celery + Redis
```python
from celery import Celery

celery = Celery('tasks', broker='redis://localhost:6379/0')

@celery.task
def geocode_cities_batch(cities: list[str]):
    """后台批量地理编码"""
    # 不占用 Web 请求的连接
    ...
```

**适用场景**：
- 地理编码（非实时）
- 数据预聚合
- 缓存预热

**工作量**：1 天

---

### P3 - 长期架构（1 个月）

#### 8. 读写分离
**目标**：分离读写流量，提高并发能力

**架构**：
```
主数据库（写）
    ↓
只读副本 1 ─┐
只读副本 2 ─┼─→ 负载均衡 → API 读请求
只读副本 3 ─┘
```

**配置**：
```python
# 主库（写）
MASTER_DB = "postgresql://..."

# 只读副本（读）
REPLICA_DBS = [
    "postgresql://replica1...",
    "postgresql://replica2...",
    "postgresql://replica3...",
]
```

**工作量**：3-5 天

---

#### 9. CDN + 静态化
**目标**：将热门查询结果静态化，直接从 CDN 返回

**实现**：
1. 预生成热门查询的 JSON 文件
2. 上传到 S3/CloudFront
3. API 请求先检查 CDN，未命中再查数据库

**示例**：
```
https://cdn.scholarmap.com/world-map/crispr/low.json
https://cdn.scholarmap.com/country-map/united-states/crispr/low.json
```

**优势**：
- 零数据库负载
- 超快响应（< 50ms）
- 无限扩展性

**工作量**：1 周

---

#### 10. PostgreSQL Connection Pooler
**目标**：使用专用连接池管理器

**工具**：PgBouncer
```bash
# 安装 PgBouncer
apt-get install pgbouncer

# 配置
[databases]
scholarmap = host=localhost port=5432 dbname=scholarmap

[pgbouncer]
pool_mode = transaction  # 连接在事务级别复用
max_client_conn = 1000   # 最多 1000 个客户端连接
default_pool_size = 25   # 实际数据库连接只需 25 个！
```

**优势**：
- 1000 个客户端连接 → 25 个数据库连接
- 连接复用更高效
- 专业级连接管理

**工作量**：2-3 天

---

## 📊 预期效果

### 修复后的连接使用

| 场景 | 修复前 | 修复后 | 改善 |
|------|--------|--------|------|
| 单个 API 调用 | 3-5 个连接 | 1 个连接 | 70-80% ↓ |
| 单页加载（4 个 API） | 12-20 个连接 | 4 个连接 | 75% ↓ |
| 10 个并发用户 | 120-200 个连接 | 40 个连接 | 70% ↓ |
| 100 个并发用户 | 💥 崩溃 | 400 个连接 | ✅ 可用 |

### 加上缓存后

| 场景 | 无缓存 | 有缓存 | 改善 |
|------|--------|--------|------|
| 10 个并发用户 | 40 个连接 | 5-10 个连接 | 75-87% ↓ |
| 100 个并发用户 | 400 个连接 | 50-100 个连接 | 75-87% ↓ |
| 响应时间 | 500-2000ms | 50-200ms | 75-90% ↓ |

---

## 🎯 实施计划

### Week 1（紧急）
- [ ] Day 1: 修复连接泄漏（P0.1）
- [ ] Day 2: 增加连接池大小（P0.2）
- [ ] Day 3: 查询优化 + 索引（P1.4）
- [ ] Day 4-5: 添加 Redis 缓存（P1.3）

### Week 2（重要）
- [ ] Day 1-2: 请求限流（P1.5）
- [ ] Day 3-4: 连接池监控（P2.6）
- [ ] Day 5: 测试和调优

### Month 1（优化）
- [ ] Week 3: 异步任务队列（P2.7）
- [ ] Week 4: 读写分离调研

### Long-term（架构）
- [ ] 读写分离（P3.8）
- [ ] CDN 静态化（P3.9）
- [ ] PgBouncer 部署（P3.10）

---

## 🔍 监控指标

### 关键指标（必须监控）
1. **连接池使用率**：< 70% 正常，> 90% 告警
2. **连接等待时间**：< 100ms 正常，> 1s 告警
3. **API 响应时间**：< 500ms 正常，> 2s 告警
4. **缓存命中率**：> 80% 目标
5. **数据库 CPU**：< 60% 正常，> 80% 告警

### 告警规则
```yaml
- alert: ConnectionPoolHigh
  expr: db_pool_usage > 0.9
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool usage > 90%"

- alert: ConnectionTimeout
  expr: db_connection_timeout_count > 10
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Multiple connection timeouts detected"
```

---

## 💰 成本估算

| 优化项 | 开发时间 | 基础设施成本/月 | ROI |
|--------|----------|----------------|-----|
| 连接泄漏修复 | 2-3h | $0 | 立即见效 |
| Redis 缓存 | 4-6h | $10-20 | 非常高 |
| 查询优化 | 2-3h | $0 | 高 |
| 读写分离 | 3-5 天 | $50-100 | 中 |
| CDN 静态化 | 1 周 | $20-50 | 高 |

**总成本**：< $200/月 可支撑 **1000+ 并发用户**

---

## ✅ 验收标准

### P0 完成标准
- [ ] 单个 API 调用 ≤ 1 个数据库连接
- [ ] 连接池使用率 < 70%（10 并发用户）
- [ ] 无连接超时错误（正常使用场景）

### P1 完成标准
- [ ] 缓存命中率 > 70%
- [ ] API 响应时间 < 500ms (p95)
- [ ] 支持 50+ 并发用户

### P2 完成标准
- [ ] 完整的监控 Dashboard
- [ ] 自动告警系统
- [ ] 支持 100+ 并发用户

### P3 完成标准
- [ ] 支持 1000+ 并发用户
- [ ] CDN 覆盖率 > 90%
- [ ] 数据库负载 < 50%

---

## 📞 需要帮助？

如果需要实施任何优化，按优先级顺序执行：
1. **先修 P0**（连接泄漏）- 否则增加连接数只是治标不治本
2. **再做 P1**（缓存 + 限流）- 大幅减少数据库压力
3. **最后 P2/P3**（监控 + 架构）- 长期可持续发展

**立即开始**: 修复连接泄漏（预计 2-3 小时，效果立竿见影）
