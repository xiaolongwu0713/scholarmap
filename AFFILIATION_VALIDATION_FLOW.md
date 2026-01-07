# Affiliation 提取验证和 LLM 兜底修复流程

## 概述

本文档描述了在 Phase 2 ingestion 完成后，自动检测和修复 rule-based affiliation 提取错误的流程。该流程通过检查 geocoding 失败来识别提取错误，并使用 LLM 进行批量修复。

## 问题背景

### 问题描述

在使用 rule-based 方法提取 affiliations 时，可能会遇到以下问题：

1. **城市名提取错误**：将州缩写（如 "MD", "OH"）误识别为城市名
2. **机构名误识别**：将机构名误识别为城市名
3. **国家提取错误**：无法识别非标准格式的国家名
4. **格式解析错误**：对于非标准格式的 affiliation 字符串解析失败

这些问题会导致：
- `geocoding_cache` 中出现大量 `null` 坐标记录
- 地图聚合统计不准确
- 地理位置可视化缺失

### 解决方案

在 ingestion 完成后，自动执行以下步骤：

1. **验证阶段**：检查所有 authorships 的地理位置 geocoding 结果
2. **错误检测**：通过 geocoding 失败识别提取错误
3. **批量修复**：使用 LLM 重新提取错误的 affiliations
4. **缓存更新**：更新 `affiliation_cache` 和 `geocoding_cache`
5. **数据修正**：更新数据库中的 authorship 记录

---

## 工作流程

### 完整流程图

```
Ingestion 完成
    │
    ├─> Rule-based 提取 affiliations
    │   ├─> 检查 affiliation_cache（如果存在）
    │   ├─> 提取地理信息（country, city, institution）
    │   └─> 写入 affiliation_cache
    │
    └─> 自动触发验证流程（仅 rule-based 模式）
        │
        ├─> 步骤 1: 获取所有 authorships
        │   └─> 从数据库读取 run 的所有 authorships
        │
        ├─> 步骤 2-4: 验证 geocoding
        │   └─> 对每个 authorship:
        │       ├─> 检查 geocoding_cache[country, city]
        │       │   ├─> 缓存命中 + 坐标有效 → ✅ 成功，跳过
        │       │   ├─> 缓存命中 + 坐标为 null → 📝 记录日志，跳过（不调用 Nominatim）
        │       │   └─> 缓存未命中 → 调用 Nominatim
        │       │       ├─> Nominatim 成功 → ✅ 成功
        │       │       └─> Nominatim 失败 → ❌ 标记为错误
        │       └─> 收集错误 affiliation + PMID
        │
        ├─> 步骤 5: LLM 批量修复
        │   ├─> 收集所有唯一错误 affiliations
        │   ├─> 批量调用 LLM 重新提取
        │   └─> 获取修正后的 country, city, institution
        │
        ├─> 步骤 6: 更新缓存和数据库
        │   ├─> 更新 affiliation_cache（覆盖 rule-based 错误）
        │   ├─> 使用新 country/city 重新 geocoding
        │   └─> 更新 authorship 记录
        │
        └─> 完成 ✅
```

---

## 详细步骤

### 步骤 1: 获取 Authorships

**位置**: `backend/app/phase2/affiliation_validator.py::validate_and_fix_run()`

**操作**:
- 根据 `run_id` 查询 `run_papers` 表获取所有 PMIDs
- 查询 `authorship` 表获取这些 PMIDs 的所有 authorships
- 统计总数用于后续报告

### 步骤 2-4: 验证 Geocoding

**位置**: `backend/app/phase2/affiliation_validator.py::validate_and_fix_run()`

**验证逻辑**:

```python
for each authorship:
    if not country:
        continue  # 跳过没有国家的情况
    
    location_key = make_location_key(country, city)
    
    # 检查 geocoding_cache
    cached = geocoding_cache.get(location_key)
    
    if cached:
        if cached.latitude and cached.longitude:
            # 缓存命中 + 坐标有效 → 成功
            continue
        else:
            # 缓存命中但坐标为 null → 记录日志，不调用 Nominatim
            log(affiliation, country, city, pmid)
            continue
    
    # 缓存未命中 → 调用 Nominatim
    coords = nominatim.geocode(country, city)
    
    if coords:
        # Nominatim 成功 → 成功
        continue
    else:
        # Nominatim 失败 → 标记为错误
        collect_error(affiliation, pmid)
```

**关键决策**:
- **缓存命中（null）**: 不调用 Nominatim，因为之前已经失败过，再次调用很可能也会失败
- **缓存未命中**: 首次遇到，调用 Nominatim 尝试 geocoding
- **Nominatim 失败**: 说明提取的 country/city 可能错误，收集用于 LLM 修复

### 步骤 5: LLM 批量修复

**位置**: `backend/app/phase2/affiliation_validator.py::_fix_errors_with_llm()`

**操作**:

1. **收集错误 affiliations**:
   - 从 `error_affiliations` 字典中提取所有唯一的 affiliation 字符串
   - 记录每个 affiliation 关联的 PMIDs 和 authorship IDs

2. **批量调用 LLM**:
   - 使用 `AffiliationExtractor`（LLM-based）批量提取
   - 批次大小：20 个 affiliations/batch
   - 不使用 `affiliation_cache`（因为我们要修复缓存中的错误）

3. **获取修正结果**:
   - LLM 返回修正后的 `GeoData`（country, city, institution, confidence）

### 步骤 6: 更新缓存和数据库

**位置**: `backend/app/phase2/affiliation_validator.py::_fix_errors_with_llm()`

**更新操作**:

1. **更新 affiliation_cache**:
   ```python
   affiliation_cache.update({
       affiliation_raw: {
           country: llm_result.country,
           city: llm_result.city,
           institution: llm_result.institution,
           confidence: llm_result.confidence
       }
   })
   ```
   - 用 LLM 结果覆盖 rule-based 的错误提取
   - 确保下次遇到相同 affiliation 时使用正确结果

2. **重新 Geocoding**:
   ```python
   for each fixed affiliation:
       coords = geocoder.get_coordinates(
           llm_result.country,
           llm_result.city
       )
       # 结果自动写入 geocoding_cache
   ```
   - 使用修正后的 country/city 重新 geocoding
   - 如果成功，`geocoding_cache` 会存储有效坐标
   - 如果失败，缓存 null（避免重复调用）

3. **更新 Authorship 记录**:
   ```python
   for each authorship_id in error_authorships:
       authorship.country = llm_result.country
       authorship.city = llm_result.city
       authorship.institution = llm_result.institution
       authorship.affiliation_confidence = llm_result.confidence
   ```
   - 更新数据库中所有受影响的 authorship 记录
   - 确保数据一致性

---

## 关键组件

### 1. AffiliationValidator 类

**文件**: `backend/app/phase2/affiliation_validator.py`

**主要方法**:

- `validate_and_fix_run(run_id, project_id)`: 主入口，执行完整验证和修复流程
- `_fix_errors_with_llm(error_affiliations, project_id, run_id)`: LLM 修复逻辑

**依赖**:
- `PostgresGeocoder`: 用于 geocoding
- `AffiliationExtractor`: 用于 LLM 提取
- `GeocodingCacheRepository`: 访问 geocoding_cache
- `AffiliationCacheRepository`: 更新 affiliation_cache
- `AuthorshipRepository`: 更新 authorship 记录

### 2. PostgresIngestionPipeline 集成

**文件**: `backend/app/phase2/pg_ingest.py`

**修改内容**:

1. **启用 affiliation_cache**:
   ```python
   # 提取时检查缓存
   geo_map = await self.extractor.extract_affiliations(
       affiliation_list,
       cache_lookup=self.db.get_cached_affiliation
   )
   
   # 缓存提取结果
   await self.db.cache_affiliations(geo_map)
   ```

2. **自动触发验证**:
   ```python
   # Ingestion 完成后
   if settings.affiliation_extraction_method == "rule_based":
       validator = AffiliationValidator()
       validation_stats = await validator.validate_and_fix_run(run_id, project_id)
   ```

---

## 数据流

### 数据表关系

```
run_papers (run_id, pmid)
    │
    └─> authorship (pmid, country, city, institution, affiliations_raw)
            │
            ├─> geocoding_cache (location_key, latitude, longitude)
            │   └─> location_key = "city:{city},{country}" or "country:{country}"
            │
            └─> affiliation_cache (affiliation_raw, country, city, institution)
```

### 数据更新流程

```
原始数据:
  affiliation_cache[aff_raw] = {country: "错误", city: "错误"}
  geocoding_cache["city:错误,错误"] = {lat: null, lng: null}
  authorship.country = "错误"
  authorship.city = "错误"

验证阶段:
  检测到 geocoding 失败
  收集错误 affiliation

修复阶段:
  LLM 提取 → {country: "正确", city: "正确"}
  
更新后:
  affiliation_cache[aff_raw] = {country: "正确", city: "正确"}  ← 覆盖
  geocoding_cache["city:正确,正确"] = {lat: 40.7, lng: -74.0}  ← 新增
  authorship.country = "正确"  ← 更新
  authorship.city = "正确"     ← 更新
```

---

## 配置和触发

### 触发条件

- **仅 rule-based 模式**: 当 `settings.affiliation_extraction_method == "rule_based"` 时触发
- **自动触发**: 在 `PostgresIngestionPipeline.ingest_run()` 完成后自动执行
- **非阻塞**: 验证失败不会影响 ingestion 的成功（只记录日志）

### 日志输出

**成功示例**:
```
Validation complete: 15 geocoding failures, 8 unique error affiliations
Fixing 8 error affiliations with LLM
Updated affiliation_cache with 8 LLM results
Fixed 8 affiliations: 25 authorships updated, 8 locations re-geocoded
Validation and fixes complete: 8 affiliations fixed, 15 geocoding failures found
```

**缓存命中（null）示例**:
```
Geocoding cache hit with null coordinates - affiliation: 'Department of Neurology, Harvard Medical School, Boston, MA, USA', country: 'United States', city: 'MD', PMID: 12345678
```

---

## 统计信息

验证流程返回的统计信息：

```python
{
    "total_authorships": 1000,           # 总 authorship 数量
    "geocoding_cache_hits": 800,         # 缓存命中（包括 null）
    "geocoding_cache_misses": 150,       # 缓存未命中
    "nominatim_successes": 120,          # Nominatim 成功
    "nominatim_failures": 30,            # Nominatim 失败（新错误）
    "llm_fixes": 20,                     # LLM 修复的数量
    "error_affiliations": 20,            # 唯一错误 affiliation 数量
    "error_pmids": 15,                   # 涉及错误的 PMID 数量
    "llm_batches": 1,                    # LLM 调用批次
    "cache_updates": 20,                 # affiliation_cache 更新数
    "authorship_updates": 50,            # authorship 记录更新数
    "geocoding_updates": 18,             # 重新 geocoding 成功数
}
```

---

## 优势

1. **自动检测错误**: 通过 geocoding 失败自动识别 rule-based 提取错误
2. **批量修复**: 收集错误后批量调用 LLM，降低成本
3. **持久化修复**: 更新 `affiliation_cache`，后续相同 affiliation 自动使用正确结果
4. **数据一致性**: 同时更新 `authorship` 表和 `geocoding_cache`
5. **非侵入式**: 验证失败不影响 ingestion 流程
6. **避免重复请求**: 缓存命中（null）时不重复调用 Nominatim

---

## 未来改进建议

1. **配置开关**: 添加配置项控制是否启用自动验证（默认启用）
2. **手动触发 API**: 添加 API 端点允许手动触发验证和修复
3. **监控指标**: 记录修复率，评估 rule-based 提取质量
4. **错误分类**: 对不同类型的提取错误进行分类统计
5. **阈值控制**: 设置错误率阈值，超过阈值时自动切换到 LLM 模式

---

## 相关文件

- **实现代码**: `backend/app/phase2/affiliation_validator.py`
- **集成代码**: `backend/app/phase2/pg_ingest.py`
- **Geocoding**: `backend/app/phase2/pg_geocoding.py`
- **LLM 提取**: `backend/app/phase2/affiliation_extractor.py`
- **Rule-based 提取**: `backend/app/phase2/rule_based_extractor.py`
- **数据库模型**: `backend/app/db/models.py` (AffiliationCache, GeocodingCache, Authorship)
- **数据库操作**: `backend/app/db/repository.py`

---

## 版本历史

- **v1.0** (2024): 初始实现
  - 自动验证和 LLM 兜底修复流程
  - 启用 affiliation_cache
  - 缓存命中（null）时跳过 Nominatim 调用

