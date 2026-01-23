# 数据库城市记录清理指南

## 问题描述
在查看地图时，发现地图图标的位置不在正确的国际范围里，很有可能就是city的名字解析错了。这是发生在 affiliation 解析过程中，括号中的人名缩写（如 `(R.Z., C.C., M.K.)` 或 `(G.Q.)`）被错误识别为城市名称。

**示例：**
- `Department of Military Health Statistics, Naval Medical University, China (R.Z., C.C., M.K., Y.T., Y.Q., C.W.).`
  - 错误：`C.W.` 被识别为城市
- `Beijing Anzhen Hospital, Capital Medical, Beijing, China (L.Z., G.Q.)`
  - 错误：`G.Q.` 被识别为城市

**代码修复：**
已在 `backend/app/phase2/rule_based_extractor.py` 中添加人名缩写过滤正则，未来数据会自动处理。

**数据清理：**
本文档提供清理现有数据库中错误记录的步骤。

---

## 涉及的表

1. **authorship** - 存储作者及其机构地理信息
2. **affiliation_cache** - 缓存 affiliation 解析结果
3. **institution_geo** - 机构地理信息查找表

---

## 清理步骤

### Step 1: 查询识别错误记录

查找所有疑似人名缩写的城市（1-3个字母 + 点的模式）

```sql
-- 1. authorship 表
SELECT id, pmid, author_name_raw, country, city, affiliation_raw_joined, institution
FROM authorship
WHERE country = 'China' 
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'
ORDER BY city;

-- 2. affiliation_cache 表
SELECT affiliation_raw, country, city, institution, confidence
FROM affiliation_cache
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'
ORDER BY city;

-- 3. institution_geo 表
SELECT institution_id, primary_name, normalized_name, country, city
FROM institution_geo
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'
ORDER BY city;
```

**查询说明：**
- `~` 是 PostgreSQL 的正则匹配操作符
- `^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$` 匹配模式：
  - `^` 开始
  - `[A-Z]\.` 一个大写字母 + 点
  - `[A-Z]?\.?` 可选的第二个大写字母 + 可选的点
  - `[A-Z]?\.?` 可选的第三个大写字母 + 可选的点
  - `$` 结束

### Step 2: 导出备份（推荐）

在修改数据前导出备份，以防需要回滚：

```sql
-- 导出 authorship 错误记录
COPY (
  SELECT * FROM authorship 
  WHERE country = 'China' AND city ~ '^[A-Z]\.[A-Z]?\.[A-Z]?\.?$'
) TO '/tmp/authorship_errors_backup.csv' CSV HEADER;

-- 导出 affiliation_cache 错误记录
COPY (
  SELECT * FROM affiliation_cache
  WHERE country = 'China' AND city ~ '^[A-Z]\.[A-Z]?\.[A-Z]?\.?$'
) TO '/tmp/affiliation_cache_errors_backup.csv' CSV HEADER;

-- 导出 institution_geo 错误记录
COPY (
  SELECT * FROM institution_geo
  WHERE country = 'China' 
    AND city ~ '^[A-Z]\.[A-Z]?\.[A-Z]?\.?$'
) TO '/tmp/institution_geo_errors_backup.csv' CSV HEADER;
```

### Step 3: 清理 affiliation_cache 表

删除缓存中的错误记录，系统会在需要时重新解析（使用新的逻辑）：

```sql
BEGIN;

-- 删除错误的缓存记录
DELETE FROM affiliation_cache
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- 查看删除数量
-- 注意：在 DELETE 后执行此查询应该返回 0
SELECT COUNT(*) as remaining_errors
FROM affiliation_cache
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

COMMIT;
```

### Step 4: 清理 authorship 表

**选项 A：将 city 设为 NULL（用这个，测试work）**

保留记录，只清空错误的 city 字段：

```sql
BEGIN;

UPDATE authorship
SET city = NULL
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- 查看更新数量
SELECT COUNT(*) as updated_count
FROM authorship
WHERE country = 'China'
  AND city IS NULL
  AND affiliation_raw_joined ~ '\([A-Z]\.?[A-Z]?';  -- 原 affiliation 中包含人名缩写

COMMIT;
```

**选项 B：删除整条记录（如果准备重新 ingest）**

如果计划对整个 run 重新运行 ingestion，可以删除记录：

```sql
BEGIN;

DELETE FROM authorship
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- 查看删除数量
SELECT COUNT(*) as deleted_count
FROM authorship
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

COMMIT;
```

**推荐：使用选项 A**，因为：
- 保留其他正确的字段（country, institution 等）
- 避免数据丢失
- city=NULL 会触发后续的 geocoding 或 LLM 修正流程

### Step 5: 清理 institution_geo 表

修正机构地理信息查找表中的错误：

```sql
BEGIN;

UPDATE institution_geo
SET city = NULL
WHERE country = 'China'
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- 查看更新数量
SELECT COUNT(*) as updated_count
FROM institution_geo
WHERE country = 'China'
  AND city IS NULL;

COMMIT;
```

### Step 6: 验证清理结果

确认所有错误记录都已清理：

```sql
-- 统计各表剩余的错误记录
SELECT 'authorship' as table_name, COUNT(*) as remaining_errors
FROM authorship
WHERE country = 'China' AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'

UNION ALL

SELECT 'affiliation_cache', COUNT(*)
FROM affiliation_cache
WHERE country = 'China' AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'

UNION ALL

SELECT 'institution_geo', COUNT(*)
FROM institution_geo
WHERE country = 'China' 
  AND city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';
```

**期望结果：**
所有三行的 `remaining_errors` 应该为 `0`。

### Step 7: 触发重新处理

清理完成后，触发系统重新处理这些记录（使用新的解析逻辑）。

**方式 1：运行 affiliation validation 脚本**

对所有 institution_geo 中 city=NULL 的记录重新验证：

```bash
cd /Users/osb3922/local_code/scholarmap
python scripts/trigger_validation.py 3b9280a68d3d 597675a5f9fb --email xiaolongwu0713@gmail.com --password xiaowu
```

**方式 2：对特定 run 重新运行 ingestion**

如果错误记录集中在某个 run，可以重新 ingest：

```bash
python scripts/trigger_ingestion.py --run-id <run_id>
```

**方式 3：通过 API 手动触发（推荐）**

使用后台任务 API 触发 affiliation validation：

```bash
curl -X POST "http://localhost:8000/api/background-tasks/trigger-affiliation-validation" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}'
```

---

## 扩展清理（其他国家）

如果需要清理所有国家（不仅限于 China）的人名缩写错误：

```sql
-- 查询所有国家的错误记录
SELECT country, city, COUNT(*) as count
FROM authorship
WHERE city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$'
GROUP BY country, city
ORDER BY count DESC;

-- 清理所有国家
BEGIN;

-- affiliation_cache
DELETE FROM affiliation_cache
WHERE city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- authorship
UPDATE authorship
SET city = NULL
WHERE city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

-- institution_geo
UPDATE institution_geo
SET city = NULL
WHERE city ~ '^[A-Z]\.[A-Z]?\.?[A-Z]?\.?$';

COMMIT;
```

---

## 执行顺序总结

1. **查询** (Step 1) - 了解影响范围和记录数量
2. **备份** (Step 2) - 导出错误记录到 CSV
3. **清理缓存** (Step 3) - 删除 affiliation_cache
4. **修正数据** (Step 4 选项A) - authorship 的 city 设为 NULL
5. **修正机构** (Step 5) - 清理 institution_geo
6. **验证** (Step 6) - 确认所有错误已清除
7. **重新处理** (Step 7) - 触发系统使用新逻辑重新解析

---

## 注意事项

1. **始终在 BEGIN/COMMIT 事务中执行修改**，以便出错时可以 ROLLBACK
2. **先备份再修改**，确保可以回滚
3. **逐步执行**，每一步都验证结果
4. **清理后触发重新处理**，让系统使用新的解析逻辑重新提取地理信息
5. **监控日志**，确保重新处理没有引入新的错误

---

## 相关文件

- 解析逻辑：`backend/app/phase2/rule_based_extractor.py`
- 验证脚本：`scripts/trigger_validation.py`
- Ingestion 脚本：`scripts/trigger_ingestion.py`
- 数据库模型：`backend/app/db/models.py`

---

