# Authorship 表扩展性应对策略

## 📊 现状分析

### 当前数据规模（2026-01-12）
- **Runs 数量**: 3
- **Papers 数量**: 999
- **Authorship 记录数**: 8,717
- **磁盘占用**: 7.45 MB
- **平均每篇论文作者数**: 8-9 人（符合学术论文常态）

### 增长预测

| Runs 数量 | Papers 预估 | Authorship 记录预估 | 磁盘占用预估 |
|----------|------------|-------------------|------------|
| 10       | 5,000      | ~40,000           | ~40 MB     |
| 100      | 50,000     | ~400,000          | ~400 MB    |
| 1,000    | 500,000    | ~4,000,000        | ~4 GB      |
| 10,000   | 5,000,000  | ~40,000,000       | ~40 GB     |

### 性能影响分析
- **100 万行以下**: PostgreSQL 无压力，索引良好的情况下查询毫秒级
- **100-1000 万行**: 需要良好索引和查询优化，秒级响应
- **1000 万行以上**: 需要分区、缓存等高级优化技术

---

## 🎯 应对策略（按优先级）

### 策略 1：索引优化 ⭐⭐⭐⭐⭐
**优先级**: 最高（立即实施）

#### 当前索引状态
```sql
-- ✅ 已实施
CREATE INDEX idx_authorship_pmid_order ON authorship(pmid, author_order);
CREATE INDEX idx_authorship_country_city ON authorship(country, city);
```

#### 建议新增索引
```sql
-- 国家级聚合查询优化
CREATE INDEX idx_authorship_country ON authorship(country) 
WHERE country IS NOT NULL;

-- 城市级过滤优化
CREATE INDEX idx_authorship_city ON authorship(city) 
WHERE city IS NOT NULL;

-- 按论文查询优化
CREATE INDEX idx_authorship_pmid ON authorship(pmid);

-- 按年份分析优化
CREATE INDEX idx_authorship_year ON authorship(year) 
WHERE year IS NOT NULL;

-- 复合索引优化（用于 run_papers JOIN 查询）
-- 注意：这个需要在 run_papers 表有索引的前提下
CREATE INDEX idx_authorship_pmid_country_city ON authorship(pmid, country, city);
```

#### 索引维护策略
- **定期 REINDEX**: 每月一次，避免索引膨胀
- **VACUUM ANALYZE**: 每周一次，更新统计信息
- **监控索引使用情况**: 使用 `pg_stat_user_indexes` 检查未使用的索引

---

### 策略 2：表分区 ⭐⭐⭐⭐
**优先级**: 高（100+ runs 时实施）

#### 分区策略：按年份分区
```sql
-- 1. 创建分区表（需要迁移现有数据）
CREATE TABLE authorship_partitioned (
    LIKE authorship INCLUDING ALL
) PARTITION BY RANGE (year);

-- 2. 创建分区
CREATE TABLE authorship_2020 PARTITION OF authorship_partitioned
    FOR VALUES FROM (2020) TO (2021);
    
CREATE TABLE authorship_2021 PARTITION OF authorship_partitioned
    FOR VALUES FROM (2021) TO (2022);
    
CREATE TABLE authorship_2022 PARTITION OF authorship_partitioned
    FOR VALUES FROM (2022) TO (2023);
    
-- ... 继续创建其他年份分区

-- 3. 为 NULL year 创建分区
CREATE TABLE authorship_no_year PARTITION OF authorship_partitioned
    DEFAULT;
```

#### 分区优势
- **查询性能提升**: 查询特定年份时只扫描相关分区
- **维护更简单**: 可以独立维护、归档或删除旧分区
- **备份策略灵活**: 可以只备份热数据分区

#### 分区注意事项
- 需要停机迁移现有数据（或使用在线迁移工具）
- 所有查询都应包含 year 字段以利用分区裁剪
- 外键约束可能需要调整

---

### 策略 3：物化视图 ⭐⭐⭐⭐
**优先级**: 高（50+ runs 时实施）

#### 常用聚合查询物化视图

**1. 国家级统计**
```sql
CREATE MATERIALIZED VIEW mv_country_stats AS
SELECT 
    country,
    COUNT(DISTINCT pmid) as paper_count,
    COUNT(*) as scholar_count,
    COUNT(DISTINCT institution) as institution_count,
    MIN(year) as earliest_year,
    MAX(year) as latest_year
FROM authorship
WHERE country IS NOT NULL
GROUP BY country
WITH DATA;

CREATE UNIQUE INDEX idx_mv_country_stats ON mv_country_stats(country);
```

**2. 城市级统计**
```sql
CREATE MATERIALIZED VIEW mv_city_stats AS
SELECT 
    country,
    city,
    COUNT(DISTINCT pmid) as paper_count,
    COUNT(*) as scholar_count,
    COUNT(DISTINCT institution) as institution_count
FROM authorship
WHERE country IS NOT NULL AND city IS NOT NULL
GROUP BY country, city
WITH DATA;

CREATE UNIQUE INDEX idx_mv_city_stats ON mv_city_stats(country, city);
```

**3. 机构级统计**
```sql
CREATE MATERIALIZED VIEW mv_institution_stats AS
SELECT 
    country,
    city,
    institution,
    COUNT(DISTINCT pmid) as paper_count,
    COUNT(*) as scholar_count
FROM authorship
WHERE institution IS NOT NULL
GROUP BY country, city, institution
WITH DATA;

CREATE UNIQUE INDEX idx_mv_institution_stats 
ON mv_institution_stats(country, city, institution);
```

#### 物化视图刷新策略
```sql
-- 手动刷新（在数据更新后）
REFRESH MATERIALIZED VIEW mv_country_stats;

-- 并发刷新（不锁表，需要 UNIQUE INDEX）
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_country_stats;
```

#### 自动刷新策略
- 每次 ingestion 完成后刷新相关视图
- 使用 cron 或后台任务定期刷新（如每小时一次）
- 考虑使用增量刷新（自定义逻辑）

---

### 策略 4：缓存层 ⭐⭐⭐⭐
**优先级**: 高（立即实施）

#### Redis 缓存架构
```python
# 缓存键设计
cache_key_patterns = {
    "world_map": "map:world:{run_id}:{min_confidence}",
    "country_map": "map:country:{run_id}:{country}:{min_confidence}",
    "city_map": "map:city:{run_id}:{country}:{city}:{min_confidence}",
    "institution": "map:inst:{run_id}:{country}:{city}:{institution}:{min_confidence}",
}

# 缓存过期时间
cache_ttl = {
    "map_data": 3600,  # 1 小时
    "stats": 1800,     # 30 分钟
    "online_users": 60, # 1 分钟
}
```

#### 缓存策略
- **Cache-Aside 模式**: 先查缓存，未命中则查数据库并更新缓存
- **自动失效**: 数据更新（ingestion）时主动清除相关缓存
- **预热**: 系统启动或数据更新后预加载热门查询

#### 当前已有的数据库缓存表
继续优化使用：
- `affiliation_cache`: LLM 提取结果缓存
- `geocoding_cache`: 地理编码结果缓存

---

### 策略 5：查询优化 ⭐⭐⭐⭐
**优先级**: 高（立即实施）

#### 强制分页
```python
# 所有列表查询必须使用分页
MAX_PAGE_SIZE = 1000
DEFAULT_PAGE_SIZE = 100

# 示例
def get_scholars(limit=100, offset=0):
    if limit > MAX_PAGE_SIZE:
        limit = MAX_PAGE_SIZE
    # ... query with LIMIT and OFFSET
```

#### 查询优化规则
1. **WHERE 子句必须使用索引字段**
2. **避免 SELECT ***: 只查询需要的字段
3. **使用 EXPLAIN ANALYZE**: 分析慢查询
4. **避免 N+1 查询**: 使用 JOIN 或批量查询
5. **使用 COUNT 估算**: 大数据集使用近似计数

#### 慢查询示例与优化

**❌ 差的查询**
```sql
-- 全表扫描，无索引
SELECT * FROM authorship WHERE affiliation_raw LIKE '%Harvard%';
```

**✅ 好的查询**
```sql
-- 使用索引字段
SELECT pmid, author_name_raw, country, city, institution 
FROM authorship 
WHERE country = 'United States' AND city = 'Boston'
LIMIT 100;
```

---

### 策略 6：读写分离 ⭐⭐⭐
**优先级**: 中（500+ runs 时实施）

#### 架构设计
```
┌─────────────┐
│   应用层    │
└──────┬──────┘
       │
   ┌───┴────┐
   │  读写  │  写操作
   │  路由  │
   └───┬────┘
       │
  ┌────┴─────────────┐
  │                  │
┌─▼────┐      ┌─────▼──┐
│ 主库 │─────>│  从库  │  读操作
│(写)  │ 同步 │ (读)   │
└──────┘      └────────┘
```

#### 实施方案
- **主库**: 处理所有写入操作（ingestion, validation）
- **从库**: 处理所有读取操作（map API, 统计查询）
- **同步延迟监控**: 确保从库数据新鲜度

#### 注意事项
- 需要应用层路由逻辑（或使用中间件如 PgBouncer）
- 监控主从同步延迟
- 某些场景需要强制读主库（如刚写入后立即读取）

---

### 策略 7：数据归档 ⭐⭐⭐
**优先级**: 中（1000+ runs 时实施）

#### 冷热数据划分策略
- **热数据**: 最近 6 个月访问过的 runs
- **温数据**: 6 个月 - 2 年未访问的 runs
- **冷数据**: 超过 2 年未访问的 runs

#### 归档流程
```python
# 1. 识别冷数据
cold_runs = identify_cold_runs(last_accessed > 2 years)

# 2. 导出到对象存储（S3/OSS）
for run in cold_runs:
    export_run_data(run_id, to_storage='s3')
    
# 3. 从主库删除（保留元数据）
    soft_delete_run_data(run_id)
    
# 4. 标记为已归档
    mark_as_archived(run_id, archive_url)
```

#### 冷数据访问
- 需要时从归档恢复（异步，几分钟延迟）
- 或提供"归档查询"接口直接查询归档存储

---

### 策略 8：垂直分表 ⭐⭐
**优先级**: 低（10000+ runs 时考虑）

#### 拆分方案
```sql
-- 核心表（高频访问字段）
CREATE TABLE authorship_core (
    id INTEGER PRIMARY KEY,
    pmid VARCHAR(32) NOT NULL,
    author_order INTEGER NOT NULL,
    author_name_raw VARCHAR(500) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    fore_name VARCHAR(255) NOT NULL,
    year INTEGER,
    country VARCHAR(255),
    city VARCHAR(255),
    institution VARCHAR(500),
    affiliation_confidence VARCHAR(20) NOT NULL
);

-- 扩展表（低频访问字段）
CREATE TABLE authorship_extended (
    id INTEGER PRIMARY KEY REFERENCES authorship_core(id),
    initials VARCHAR(50),
    suffix VARCHAR(50),
    is_collective BOOLEAN,
    collective_name VARCHAR(500),
    affiliations_raw TEXT,
    affiliation_raw_joined TEXT,
    has_author_affiliation BOOLEAN
);
```

#### 优势与劣势
**优势**:
- 减少常见查询的数据读取量
- 提升热数据缓存命中率

**劣势**:
- 查询逻辑复杂化（需要 JOIN）
- 数据一致性维护更复杂
- 迁移成本高

---

### 策略 9：时间序列数据库 ⭐⭐
**优先级**: 低（特定场景考虑）

#### TimescaleDB 方案
TimescaleDB 是 PostgreSQL 的时间序列扩展，适合：
- 主要用于趋势分析
- 按时间范围查询频繁
- 需要高效的聚合查询

#### 迁移考虑
```sql
-- 创建 hypertable
SELECT create_hypertable('authorship', 'created_at');

-- 自动分区和压缩
ALTER TABLE authorship SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'country,city'
);
```

#### 何时考虑
- 数据量 > 1000 万行
- 主要查询模式是时间序列分析
- 需要自动压缩和数据保留策略

---

## 📈 实施路线图

### 第一阶段：立即实施（当前 - 50 runs）
**时间**: 立即  
**成本**: 低  
**收益**: 基础保障

- [x] ✅ 确认现有索引优化良好
- [ ] 增加建议的单列索引
- [ ] 实施 Redis 缓存（map API 结果）
- [ ] 强制所有列表查询分页
- [ ] 配置慢查询日志和监控

**预期效果**: 支撑到 100 runs，查询性能稳定

---

### 第二阶段：中期优化（50 - 200 runs）
**时间**: 50 runs 时开始  
**成本**: 中  
**收益**: 显著提升

- [ ] 实施表分区（按 year）
- [ ] 创建物化视图（国家/城市/机构级别）
- [ ] 配置自动 VACUUM 和 REINDEX 任务
- [ ] 实施物化视图自动刷新机制
- [ ] 优化批量插入性能（ingestion）

**预期效果**: 支撑到 500 runs，聚合查询亚秒级

---

### 第三阶段：高级优化（200 - 1000 runs）
**时间**: 200 runs 时开始  
**成本**: 高  
**收益**: 长期可扩展性

- [ ] 配置读写分离（主从架构）
- [ ] 实施数据归档策略
- [ ] 考虑垂直分表（如果单表查询仍慢）
- [ ] 实施连接池优化（PgBouncer）
- [ ] 配置自动扩容策略

**预期效果**: 支撑到 5000 runs，系统稳定可扩展

---

### 第四阶段：架构升级（1000+ runs）
**时间**: 1000 runs 时评估  
**成本**: 很高  
**收益**: 企业级可扩展性

- [ ] 评估 TimescaleDB 迁移
- [ ] 考虑微服务架构拆分
- [ ] 实施分布式缓存集群
- [ ] 配置多区域部署（如需要）
- [ ] 实施数据湖架构（长期分析）

**预期效果**: 支撑到 10000+ runs，企业级性能

---

## 🔍 监控与告警

### 关键性能指标（KPI）

| 指标 | 健康阈值 | 警告阈值 | 危险阈值 |
|------|---------|---------|---------|
| 表大小 | < 1 GB | 1-5 GB | > 5 GB |
| 查询平均响应时间 | < 100ms | 100-500ms | > 500ms |
| 慢查询数量（/天） | < 10 | 10-100 | > 100 |
| 索引命中率 | > 99% | 95-99% | < 95% |
| 缓存命中率 | > 80% | 60-80% | < 60% |

### 监控工具
```sql
-- 表大小监控（已在资源监控系统中实施）
SELECT pg_size_pretty(pg_total_relation_size('authorship'));

-- 索引使用情况
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'authorship'
ORDER BY idx_scan DESC;

-- 慢查询统计
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%authorship%'
ORDER BY mean_time DESC
LIMIT 20;
```

### 自动化告警
- 集成到资源监控系统（已实施的 cron 快照）
- 表大小增长速率监控
- 查询性能降级告警
- 磁盘空间预警

---

## 💰 成本效益分析

### 各策略成本对比

| 策略 | 实施难度 | 维护成本 | 性能提升 | ROI |
|------|---------|---------|---------|-----|
| 索引优化 | 低 | 低 | 高 | ⭐⭐⭐⭐⭐ |
| 查询优化 | 低 | 低 | 中 | ⭐⭐⭐⭐⭐ |
| Redis 缓存 | 中 | 中 | 高 | ⭐⭐⭐⭐ |
| 物化视图 | 中 | 中 | 高 | ⭐⭐⭐⭐ |
| 表分区 | 高 | 中 | 中 | ⭐⭐⭐ |
| 读写分离 | 高 | 高 | 高 | ⭐⭐⭐ |
| 数据归档 | 中 | 中 | 低 | ⭐⭐ |
| 垂直分表 | 高 | 高 | 中 | ⭐⭐ |
| TimescaleDB | 很高 | 高 | 高 | ⭐⭐ |

### 推荐优先级
1. **立即实施**: 索引优化、查询优化、分页强制
2. **近期规划**: Redis 缓存、物化视图
3. **中期考虑**: 表分区、读写分离
4. **长期备选**: 数据归档、架构升级

---

## 🎓 最佳实践总结

### DO - 应该做的
✅ **提前规划**: 在问题出现前建立监控和预警  
✅ **渐进优化**: 从低成本策略开始，逐步升级  
✅ **数据驱动**: 基于实际性能指标决策  
✅ **保持简单**: 能用索引解决就不要引入复杂架构  
✅ **文档记录**: 记录所有优化措施和效果

### DON'T - 不应该做的
❌ **过早优化**: 在数据量小时引入复杂方案  
❌ **盲目跟风**: 不考虑实际需求就采用新技术  
❌ **忽视监控**: 没有数据支撑的优化是盲目的  
❌ **一次性解决**: 期望一个方案解决所有问题  
❌ **忽视成本**: 不考虑维护成本的过度优化

---

## 📚 参考资源

### PostgreSQL 官方文档
- [Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Materialized Views](https://www.postgresql.org/docs/current/rules-materializedviews.html)
- [Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)

### 相关项目文档
- `RESOURCE_MONITORING.md` - 资源监控系统文档
- `INGESTION_PROCESS.md` - 数据摄入流程文档
- `README_INSTITUTION_GEO.md` - 机构地理信息文档

### 工具推荐
- **pgAdmin**: PostgreSQL 管理工具
- **pg_stat_statements**: 查询统计扩展
- **PgBouncer**: 连接池工具
- **Redis**: 缓存服务器
- **TimescaleDB**: 时间序列扩展

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2026-01-12 | 1.0 | 初始版本，基于当前系统状态分析 | AI Assistant |

---

## 💡 结论

Authorship 表的快速增长是学术数据系统的常见挑战。通过：
1. **分阶段实施优化策略**
2. **持续监控性能指标**
3. **根据实际数据量调整方案**

可以确保系统在数据量增长 100-1000 倍的情况下仍保持良好性能。

**核心原则**: **在正确的时间做正确的优化，避免过早优化，也避免性能债务积累。**
