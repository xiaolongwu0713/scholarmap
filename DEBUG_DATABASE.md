# 🔍 数据库调试指南

## 📋 步骤 1: 找到你的 Run ID

在 Frontend 页面，URL 应该是：
```
http://localhost:3000/projects/{project_id}/runs/{run_id}
```

复制 `run_id`（例如：`fbb331212f9a`）

## 🔍 步骤 2: 查询 Run 数据

在 pgAdmin 的 Query Tool 中运行：

```sql
-- 替换 YOUR_RUN_ID 为你的实际 run_id
SELECT 
    run_id,
    project_id,
    description,
    created_at,
    results  -- 这是 JSON 字段
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

## 📊 步骤 3: 检查 results JSON 结构

运行以下查询查看 results 的详细内容：

```sql
-- 查看 results JSON 的所有键
SELECT 
    run_id,
    jsonb_object_keys(results) as result_key,
    jsonb_typeof(results->jsonb_object_keys(results)) as value_type
FROM runs
WHERE run_id = 'YOUR_RUN_ID'
  AND results IS NOT NULL;

-- 或者更简单的方式，直接查看 results 内容
SELECT 
    run_id,
    results->'pubmed' as pubmed_data,
    results->'semantic_scholar' as s2_data,
    results->'openalex' as oa_data,
    results->'aggregated' as aggregated_data
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

## 🎯 步骤 4: 检查 aggregated 数据

```sql
-- 检查 aggregated 是否存在
SELECT 
    run_id,
    CASE 
        WHEN results->'aggregated' IS NULL THEN '❌ aggregated 不存在'
        WHEN results->'aggregated' = 'null'::jsonb THEN '❌ aggregated 是 null'
        ELSE '✅ aggregated 存在'
    END as aggregated_status,
    results->'aggregated'->>'count' as aggregated_count,
    jsonb_array_length(results->'aggregated'->'items') as aggregated_items_length
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

## 📝 步骤 5: 检查 pubmed 数据

```sql
-- 检查 pubmed 数据
SELECT 
    run_id,
    results->'pubmed'->>'count' as pubmed_count,
    jsonb_array_length(results->'pubmed'->'items') as pubmed_items_length,
    results->'pubmed'->'items'->0 as first_item_sample
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

## 🔧 步骤 6: 手动修复（如果需要）

如果发现 `aggregated` 不存在但 `pubmed` 有数据，可以手动修复：

```sql
-- ⚠️ 警告：这会修改数据，先备份！
-- 备份当前数据
SELECT results INTO TEMP TABLE runs_backup FROM runs WHERE run_id = 'YOUR_RUN_ID';

-- 手动创建 aggregated 数据（从 pubmed 复制）
UPDATE runs
SET results = jsonb_set(
    COALESCE(results, '{}'::jsonb),
    '{aggregated}',
    jsonb_build_object(
        'items', results->'pubmed'->'items',
        'count', results->'pubmed'->>'count',
        'dedupe_key', 'single_source_passthrough'
    )
)
WHERE run_id = 'YOUR_RUN_ID'
  AND results->'pubmed' IS NOT NULL
  AND results->'aggregated' IS NULL;
```

## 🐛 常见问题诊断

### 问题 1: aggregated 完全不存在

**症状**：`results->'aggregated'` 返回 NULL

**原因**：`step_retrieve()` 没有写入 `results_aggregated.json`

**检查**：
```sql
-- 检查是否有其他结果文件
SELECT 
    run_id,
    jsonb_object_keys(results) as keys
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

### 问题 2: aggregated 存在但 items 为空数组

**症状**：`aggregated.items` 是 `[]`

**原因**：`_aggregate_single_source()` 返回了空列表

**检查**：
```sql
-- 检查 pubmed items 是否为空
SELECT 
    jsonb_array_length(results->'pubmed'->'items') as pubmed_items_count,
    jsonb_array_length(results->'aggregated'->'items') as aggregated_items_count
FROM runs
WHERE run_id = 'YOUR_RUN_ID';
```

### 问题 3: 数据写入顺序问题

**症状**：`pubmed` 有数据，但 `aggregated` 写入时丢失了

**原因**：可能是并发写入或事务问题

**检查**：
```sql
-- 查看所有相关运行的数据
SELECT 
    run_id,
    created_at,
    jsonb_object_keys(results) as result_keys,
    results->'pubmed'->>'count' as pubmed_count,
    results->'aggregated'->>'count' as aggregated_count
FROM runs
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY created_at DESC;
```

## 📋 完整诊断查询

运行这个完整的诊断查询：

```sql
WITH run_data AS (
    SELECT 
        run_id,
        project_id,
        description,
        created_at,
        results
    FROM runs
    WHERE run_id = 'YOUR_RUN_ID'
)
SELECT 
    'Run Info' as section,
    run_id,
    project_id,
    description,
    created_at::text
FROM run_data
UNION ALL
SELECT 
    'Results Keys' as section,
    run_id,
    NULL::text as project_id,
    jsonb_object_keys(results)::text as description,
    NULL::text as created_at
FROM run_data
WHERE results IS NOT NULL
UNION ALL
SELECT 
    'PubMed Data' as section,
    run_id,
    (results->'pubmed'->>'count')::text as project_id,
    'count: ' || COALESCE(results->'pubmed'->>'count', 'NULL') || 
    ', items: ' || COALESCE(jsonb_array_length(results->'pubmed'->'items')::text, 'NULL') as description,
    NULL::text as created_at
FROM run_data
WHERE results->'pubmed' IS NOT NULL
UNION ALL
SELECT 
    'Aggregated Data' as section,
    run_id,
    (results->'aggregated'->>'count')::text as project_id,
    'count: ' || COALESCE(results->'aggregated'->>'count', 'NULL') || 
    ', items: ' || COALESCE(jsonb_array_length(results->'aggregated'->'items')::text, 'NULL') as description,
    NULL::text as created_at
FROM run_data
WHERE results->'aggregated' IS NOT NULL;
```

## 🎯 下一步

根据查询结果，告诉我：
1. `results` JSON 中有哪些键？
2. `pubmed` 的 `count` 和 `items` 长度是多少？
3. `aggregated` 是否存在？如果存在，`count` 和 `items` 长度是多少？

这样我就能准确定位问题并修复代码！

