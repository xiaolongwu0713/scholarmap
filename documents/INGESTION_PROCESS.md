# Ingestion Process Documentation

## 概述

Ingestion 是将 Phase 1 的论文检索结果（PMIDs）转换为结构化作者和地理信息的完整流程。该流程包括从 PubMed 获取 XML、解析作者信息、提取机构地理信息，并将结果存储到 PostgreSQL 数据库中。

## 流程概览

```
Phase 1 Results (PMIDs)
    ↓
Step 1: 加载 PMIDs
    ↓
Step 2: 从 PubMed 获取 XML
    ↓
Step 3: 解析 XML → Papers + Authors + Affiliations
    ↓
Step 4: 提取 Affiliations 地理信息
    ├─→ 检查 affiliation_cache
    ├─→ 尝试 institution_matcher (pubmed机构名归一化，匹配institution_geo 表里的归一化后的机构名或别名)
    ├─→ Rule-based 或 LLM 提取
    └─→ 成功提取后标记为 pending（不立即添加到 institution_geo）
    └─→ 更新affiliation_cache表
    ↓
Step 5: 写入数据库
    ├─→ Papers 表（批量 upsert）
    └─→ Authorship 表（批量 insert）
    ↓
Step 6: 验证和修复（仅 rule-based 模式）
    ├─→ Nominatim geocoding 验证
    ├─→ 将验证通过的机构添加到 institution_geo 表
    └─→ LLM fallback 修复错误
    └─→ 更新affiliation_cache表
```

## 详细流程步骤

### Step 1: 加载 PMIDs（从 Phase 1 结果）

**目的**：从 Phase 1 的检索结果中提取所有 PMIDs

**实现**：`PostgresIngestionPipeline._load_pmids_from_run()`

**数据源**：
- `results_pubmed.json` - PubMed 检索结果
- `results_semantic_scholar.json` - Semantic Scholar 检索结果
- `results_openalex.json` - OpenAlex 检索结果
- `results_aggregated.json` - 聚合结果（备选）

**处理逻辑**：
1. 依次尝试读取各数据源文件
2. 从每个文件中的 `items` 或 `results` 字段提取 PMID
3. 支持多种 PMID 字段名：`pmid`、`pubmed_id`、`identifiers.pmid`
4. 去重并返回唯一的 PMIDs 列表

**输出**：
- `list[str]` - PMIDs 列表
- 统计：`stats.total_pmids = len(pmids)`

**日志示例**：
```
📥 INGESTION STEP 1: Loading PMIDs from Phase 1 results...
   Loaded 300 unique PMIDs from run run_xxx
✅ INGESTION STEP 1 COMPLETE: Found 300 PMIDs
```

---

### Step 2: 从 PubMed 获取 XML

**目的**：通过 PubMed EFetch API 批量获取论文的完整 XML 数据

**实现**：`PubMedFetcher.fetch_batch()`

**API 端点**：
- `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi`
- 使用 `db=pubmed`, `retmode=xml`, `rettype=abstract`

**速率限制**：
- 无 API key：3 requests/second
- 有 API key：10 requests/second

**批次大小**：
- 每次请求最多 150 个 PMIDs（PubMed API 限制）

**处理逻辑**：
1. 将 PMIDs 分成多个批次（每批最多 150 个）
2. 并发发送多个批次请求（遵守速率限制）
3. 处理 HTTP 错误和重试
4. 返回 `dict[pmid, xml_text]` 映射

**输出**：
- `dict[str, str]` - 映射：`pmid -> xml_text`
- 统计：`stats.pmids_fetched = len(xml_results)`

**日志示例**：
```
📥 INGESTION STEP 2: Fetching 300 PMIDs from PubMed...
✅ INGESTION STEP 2 COMPLETE: Fetched 298 PubMed XML records
```

---

### Step 3: 解析 XML → 结构化数据

**目的**：将 PubMed XML 解析为结构化的 Paper 和 Author 对象

**实现**：`PubMedXMLParser.parse_articles()`

**解析内容**：
- **Paper 信息**：
  - `pmid`: PubMed ID
  - `year`: 发表年份
  - `title`: 论文标题
  - `doi`: DOI（如果有）
- **Author 信息**：
  - `name`: AuthorName 对象（last_name, fore_name, initials, suffix, collective_name）
  - `author_order`: 作者顺序（1-based）
  - `affiliations_raw`: 原始 affiliation 字符串列表
- **Affiliation 信息**：
  - 原始 affiliation 字符串（从 XML 中提取）

**处理逻辑**：
1. 解析 XML 结构（使用 `xml.etree.ElementTree`）
2. 提取每个 `<PubmedArticle>` 的信息
3. 提取每个 `<Author>` 的信息
4. 提取每个作者的 `<Affiliation>` 信息
5. 处理集体作者（collective authors）
6. 处理缺失字段（使用默认值）

**输出**：
- `list[ParsedPaper]` - 解析后的论文列表
- 统计：`stats.papers_parsed = len(parsed_papers)`

**日志示例**：
```
📥 INGESTION STEP 3: Parsing XML into structured papers...
✅ INGESTION STEP 3 COMPLETE: Parsed 298 papers
```

---

### Step 4: 提取 Affiliations 地理信息

**目的**：从原始 affiliation 字符串中提取国家、城市、机构等地理信息

**实现**：`PostgresIngestionPipeline._extract_affiliations()`

**提取方法**（根据配置）：
- `rule_based`: 使用规则提取（快速，但准确率较低）
- `llm`: 使用 LLM 提取（慢，但准确率高）

**提取流程**（多层匹配策略）：

#### 4.1 收集唯一 Affiliations

- 从所有论文的所有作者中收集唯一的 affiliation 字符串
- 去重，避免重复处理

#### 4.2 检查缓存（affiliation_cache 表）

**目的**：避免重复提取已处理过的 affiliations

**实现**：`PostgresDatabase.get_batch_cached_affiliations()`

**查询逻辑**：
```sql
SELECT * FROM affiliation_cache 
WHERE affiliation_raw IN (aff1, aff2, ..., affN)
```

**缓存命中**：
- 如果缓存命中，直接返回缓存的 GeoData
- 跳过后续提取步骤

#### 4.3 Institution Matcher（优先匹配）

**目的**：使用 `institution_geo` 表匹配已知机构，提高准确率和速度

**实现**：`InstitutionMatcher.match_institution()`

**匹配策略**（按优先级）：

1. **部分匹配**（主要策略）：
   - 从 affiliation 文本中提取潜在的机构名称
   - 使用正则表达式提取包含 "University", "Institute" 等关键词的片段
   - 对每个提取的潜在名称进行标准化（NFKC + 去除变音符号）
   - 与 `institution_geo.normalized_name` 或 `institution_geo.aliases`（已标准化）进行精确匹配
   - **说明**：不对整个 affiliation 文本进行匹配，因为 affiliation 文本通常包含邮箱、邮编、地址等噪音信息，而 `institution_geo.normalized_name` 是干净的机构名称

2. **模糊匹配**（相似度 ≥ 0.7，可选）：
   - 如果部分匹配失败，且未设置 `skip_fuzzy=True`
   - 使用 `InstitutionGeoRepository.search_by_name()` 进行模糊匹配
   - 返回相似度最高的匹配结果
   - **注意**：批量处理时通常跳过模糊匹配以提高性能

**标准化过程**（`normalize_text()`）：
```
原始文本: "École Polytechnique Fédérale de Lausanne"
    ↓ NFKC 标准化
"Ecole Polytechnique Federale de Lausanne"  (处理兼容字符)
    ↓ NFD + 去除变音符号
"Ecole Polytechnique Federale de Lausanne"  (É → E, é → e)
    ↓ 小写转换
"ecole polytechnique federale de lausanne"
    ↓ 去除标点、标准化空格
"ecole polytechnique federale de lausanne"
```

**匹配成功**：
- 返回 `GeoData(country=matched.country, city=matched.city, institution=matched.primary_name, confidence="high")`
- 提取结果的缓存由 pg_ingest.py 负责写入 affiliation_cache
- 跳过后续提取步骤

**匹配失败**：
- 继续执行后续提取步骤（rule-based 或 LLM）

#### 4.4 Rule-based 提取（如果配置）

**目的**：使用规则和模式匹配提取地理信息（无需 LLM，成本低）

**实现**：`RuleBasedExtractor.extract_batch()`

**提取策略**：

1. **国家检测**：
   - 使用 pycountry 库匹配国家名称
   - 检测国家代码（如 "USA", "UK"）
   - 从地区名称推断国家（如 "California" → "United States"）

2. **城市检测**：
   - 提取城市名称（排除机构名称、部门名称）
   - 验证城市名称的有效性（不是州缩写、不是机构关键词）

3. **机构提取**：
   - 提取包含 "University", "Institute", "College" 等关键词的片段
   - 提取部门信息（Department of ...）

4. **国家/城市名称标准化**（新增 2026-01）：
   - 将常见缩写转换为完整名称：
     - "U.S.A", "USA", "U.S." → "United States"
     - "U.K", "UK" → "United Kingdom"
     - "UAE", "U.A.E" → "United Arab Emirates"
   - 检测并修正错误提取：
     - 如果 city 字段是国家缩写（如 "U.S.A"），设为 None
     - 触发 geocoding 失败 → LLM fallback 修复
   - **作用**：防止 "Morocco, U.S.A" 这类错误组合被 Nominatim 误判

5. **置信度评估**：
   - `high`: 同时提取到 country, city, institution
   - `medium`: 提取到 country 和 (city 或 institution)
   - `low`: 只提取到 country
   - `none`: 未提取到任何信息

**输出**：
- `list[GeoData]` - 每个 affiliation 对应的 GeoData

#### 4.5 LLM 提取（如果配置）

**目的**：使用 LLM 提取地理信息（准确率高，但成本高、速度慢）

**实现**：`AffiliationExtractor.extract_batch()`

**批次大小**：默认 20 个 affiliations 一批

**Prompt 模板**：`prompts/affiliation_extraction.md`

**处理流程**：
1. 将 affiliations 列表格式化为编号列表
2. 替换 prompt 模板中的 `<<<AFFILIATIONS>>>` 占位符
3. 调用 LLM API（OpenAI Chat Completions）
4. 解析 LLM 返回的 JSON 数组
5. 转换为 GeoData 对象列表

**输出**：
- `list[GeoData]` - 每个 affiliation 对应的 GeoData
- 统计：`stats.llm_calls_made = (len(affiliations) + 19) // 20`

#### 4.6 自动添加到 institution_geo 表（延迟添加机制）

**目的**：将成功提取且**经过验证**的机构信息保存到 `institution_geo` 表，供后续匹配使用

**新机制（2026-01）**：
- **提取阶段**（Step 4）：不立即添加到 `institution_geo`，而是标记为"待验证"（`pending_auto_add`）
- **验证阶段**（Step 6）：利用 Nominatim geocoding 验证数据准确性
  - geocoding 成功 → 数据可信 → 批量添加到 `institution_geo`
  - geocoding 失败 → 数据可疑 → 不添加，交由 LLM fallback 修复

**触发条件**：
- Institution matcher 匹配失败
- Rule-based 或 LLM 提取成功（提取到 `country` 和 `institution`）
- 该机构在 `institution_geo` 表中不存在
- **新增**：Nominatim 能成功找到该 (country, city) 的坐标

**实现**：
- 提取阶段：`RuleBasedExtractor/AffiliationExtractor.extract_affiliations(skip_institution_auto_add=True)`
- 验证阶段：`AffiliationValidator._batch_add_to_institution_geo()`

**处理逻辑**：
1. **Step 4 提取阶段**：
   - 记录 pending 机构到 `stats["pending_auto_add"]` 列表
   - 不立即添加到数据库
2. **Step 6 验证阶段**：
   - 将 pending 机构与 geocoding 结果匹配
   - 只添加 geocoding 成功的机构
   - 批量插入，自动去重

**数据字段**：
- `primary_name`: 提取的机构名称
- `normalized_name`: 标准化后的机构名称
- `country`: 提取的国家
- `city`: 提取的城市（可选）
- `aliases`: NULL（暂不提取）
- `source`: `"auto_added"`（标记为自动添加）

**优势**：
- **防止错误数据污染**：避免将错误提取（如 "MA"→Morocco）的机构添加到 `institution_geo` 表
- **零额外成本**：利用现有的 geocoding 验证，无需额外 API 调用
- **自动验证**：只有能被 Nominatim 验证的数据才被认为可信
- **逐渐建立机构知识库**：持续积累经过验证的机构数据

**向后兼容**：
- 设置 `skip_institution_auto_add=False` 可恢复原有的立即添加行为

#### 4.7 缓存提取结果

**目的**：将提取结果缓存到 `affiliation_cache` 表，避免重复提取

**实现**：`PostgresDatabase.cache_affiliations()`

**缓存内容**：
- `affiliation_raw`: 原始 affiliation 字符串（主键）
- `country`: 提取的国家
- `city`: 提取的城市
- `institution`: 提取的机构
- `confidence`: 置信度（high/medium/low/none）

**批量缓存**：使用批量 upsert 操作，提高性能

**输出**：
- `dict[str, GeoData]` - 映射：`affiliation_raw -> GeoData`
- 统计：
  - `stats.unique_affiliations = len(unique_affiliations)`
  - `stats.affiliations_with_country = sum(1 for g in geo_map.values() if g.country)`
  - `stats.llm_calls_made`（仅 LLM 模式）

**日志示例**：
```
📥 INGESTION STEP 4: Extracting affiliations via rule-based...
   Extracting 245 affiliations via rule-based (with cache)
   Extraction complete: 245 affiliations, 198 with country
✅ INGESTION STEP 4 COMPLETE: Extracted 245 affiliations
   Unique affiliations: 245
   With country: 198
   LLM calls: 0
```

---

### Step 5: 写入数据库

**目的**：将解析后的 papers 和 authorships 数据写入 PostgreSQL 数据库

**实现**：`PostgresIngestionPipeline._write_to_database()`

**数据库表**：
1. `papers` - 论文基本信息
2. `authorship` - 作者和地理信息
3. `run_papers` - Run 和 Paper 的关联关系

#### 5.1 清理现有数据

**目的**：允许重新运行 ingestion，避免数据重复

**处理逻辑**：
1. 查询 `run_papers` 表，获取该 run 的所有 PMIDs
2. 删除这些 PMIDs 对应的所有 authorships
3. `run_papers` 记录将在后续步骤中重新创建

#### 5.2 批量 Upsert Papers

**目的**：插入或更新论文基本信息

**实现**：`PaperRepository.bulk_upsert_papers()`

**数据字段**：
- `pmid`: PubMed ID（主键）
- `year`: 发表年份
- `title`: 论文标题
- `doi`: DOI（可选）
- `xml_stored`: NULL（不存储 XML 到 PostgreSQL）

**批量操作**：
- 使用 PostgreSQL `ON CONFLICT DO UPDATE` 进行批量 upsert
- 性能优化：批量大小为 5000 条记录

#### 5.3 批量 Insert Authorships

**目的**：插入作者和地理信息

**实现**：`AuthorshipRepository.bulk_insert_authorships()`

**数据字段**：
- **作者信息**：
  - `pmid`: PubMed ID（外键）
  - `author_order`: 作者顺序（1-based）
  - `author_name_raw`: 作者显示名称
  - `last_name`, `fore_name`, `initials`, `suffix`: 作者姓名组成部分
  - `is_collective`: 是否为集体作者
  - `collective_name`: 集体作者名称（如果有）
- **Affiliation 信息**：
  - `affiliations_raw`: JSON 数组字符串（所有 affiliations）
  - `affiliation_raw_joined`: 合并的 affiliation 字符串（用 " | " 分隔）
  - `has_author_affiliation`: 是否有 affiliation
- **地理信息**（从主 affiliation 提取）：
  - `country`: 国家
  - `city`: 城市
  - `institution`: 机构
  - `affiliation_confidence`: 置信度（high/medium/low/none）
- **时间信息**：
  - `year`: 发表年份（从 paper 复制）

**主 Affiliation 选择**：
- 使用每个作者的第一个 affiliation 作为主 affiliation
- 从该 affiliation 提取地理信息
- 所有 affiliations 都存储在 `affiliations_raw` JSON 数组中

**批量操作**：
- 使用批量 insert 操作，提高性能
- 批量大小为 5000 条记录

#### 5.4 关联 Run 和 Papers

**目的**：建立 run 和 papers 的关联关系

**实现**：`RunPaperRepository.link_run_to_papers()`

**处理逻辑**：
1. 删除该 run 的现有关联记录
2. 批量插入新的关联记录：`(run_id, pmid)`

**输出**：
- 统计：`stats.authorships_created = sum(len(p.authors) for p in parsed_papers)`

**日志示例**：
```
📥 INGESTION STEP 5: Writing to database...
   Clearing existing data for run run_xxx...
   Inserting/updating 298 papers (bulk operation)...
   Papers inserted/updated: 298
   Inserting 1245 authorships (bulk operation)...
   Authorships inserted: 1245
   Linking run run_xxx to 300 papers...
   Database write complete
✅ INGESTION STEP 5 COMPLETE: Created 1245 authorships
```

---

### Step 6: 验证和修复（仅 rule-based 模式）

**目的**：使用 LLM fallback 修复 rule-based 提取的错误

**实现**：`AffiliationValidator.validate_and_fix_run()`

**触发条件**：
- 仅当 `affiliation_extraction_method = "rule_based"` 时执行
- 如果使用 LLM 模式，跳过此步骤（因为已经使用了 LLM）

**验证流程**：

#### 6.1 获取本次 Run 的所有 Authorships

**查询逻辑**：
1. 从 `run_papers` 表获取该 run 的所有 PMIDs
2. 根据这些 PMIDs 查询 `authorship` 表
3. 获取所有需要验证的 authorships

#### 6.2 验证 Geocoding 结果

**目的**：检查地理位置信息是否有问题

**验证逻辑**：
1. 对于每个有 `country` 和 `city` 的 authorship
2. 查询 `geocoding_cache` 表，检查坐标是否有效
3. 如果缓存命中但坐标为 null，视为错误（不调用 Nominatim，因为之前已失败）
4. 如果缓存miss，尝试调用 Nominatim 进行 geocoding，不管成功与否都保存到geocoding_cache。

**错误类型**：
- Geocoding 失败（`geocoding_cache` 中坐标为 null）
- Nominatim 调用返回 null（新的失败）


#### 6.3 LLM Fallback 修复

**目的**：使用 LLM 重新提取有问题的 affiliations

**实现**：`AffiliationValidator._fix_errors_with_llm()`

**修复流程**：

1. **收集错误 Affiliations**：
   - 收集所有有问题的 affiliations（去重）
   - 格式化为 `<raw_affiliation> (PMIDs: pmid1, pmid2, ...)`（如果有多个 PMID）
   - 记录每个 affiliation 对应的 PMIDs 和 authorship IDs

2. **调用 LLM 重新提取**：
   - 以 20 个一批调用 LLM 重新提取（使用 `AffiliationExtractor`）
   - 不使用缓存（`cache_lookup=None`），因为我们要修复缓存中的错误
   - LLM 会返回新的 GeoData（country, city, institution, confidence）

3. **更新 `affiliation_cache` 表**（✅ **重要**）：
   - **会更新 `affiliation_cache` 表**，将 LLM 重新提取的结果缓存
   - 使用 `AffiliationCacheRepository.cache_affiliations()` 批量更新
   - 更新字段：`country`, `city`, `institution`, `confidence`
   - 这样下次提取相同的 affiliation 时，会直接使用修复后的结果

4. **重新 Geocoding**：
   - 使用修复后的 `country` 和 `city` 重新调用 Nominatim
   - 更新 `geocoding_cache` 表的坐标
   - 在 `geocoding_cache.affiliations` 数组中添加 affiliation（包含 PMID 信息）

5. **更新 `authorship` 表**：
   - 更新所有使用该 affiliation 的 authorship 记录
   - 更新字段：`country`, `city`, `institution`, `affiliation_confidence`
   - 使用批量更新操作

6. **提交事务**：
   - 提交所有数据库更新

**如果 LLM 提取失败**：
- 保持原样，不更新任何表

**输出**：
- 统计：`validation_stats.llm_fixes` - LLM 修复的 affiliations 数量
- 统计：`validation_stats.cache_updates` - 更新的 `affiliation_cache` 记录数
- 统计：`validation_stats.authorship_updates` - 更新的 authorship 记录数
- 统计：`validation_stats.geocoding_updates` - 更新的 geocoding 记录数
- 统计：`validation_stats.nominatim_failures` - Nominatim 失败的数量

**日志示例**：
```
📥 INGESTION STEP 6: Starting post-ingestion validation and LLM fallback...
🔍 VALIDATION STEP 1: Getting authorships for run run_xxx...
✅ VALIDATION STEP 1 COMPLETE: Found 1245 authorships from 300 papers
✅ VALIDATION STEP 2-4 COMPLETE: Geocoding validation finished
   Total authorships checked: 1245
   Nominatim failures: 45
   Unique error affiliations: 38
🔧 VALIDATION STEP 5: Fixing 38 error affiliations with LLM...
   Updating affiliation_cache with 35 LLM results...
   ✅ Updated affiliation_cache with 35 LLM results
   Re-geocoding and updating authorships...
   ✅ Fixed 35 affiliations
   ✅ Updated 125 authorships
   ✅ Re-geocoded 32 locations
✅ INGESTION STEP 6 COMPLETE: Validation and fixes completed
   Affiliations fixed: 35
   Cache updates: 35
   Authorship updates: 125
   Geocoding updates: 32
```

---

## 数据流和表结构

### 输入数据

**Phase 1 Results**：
```json
{
  "items": [
    {
      "pmid": "12345678",
      "title": "Paper Title",
      ...
    }
  ]
}
```

### 中间数据结构

**ParsedPaper**：
```python
ParsedPaper(
    pmid: str,
    year: int | None,
    title: str,
    doi: str | None,
    authors: list[ParsedAuthor]
)

ParsedAuthor(
    name: AuthorName,
    author_order: int,
    affiliations_raw: list[str]
)
```

**GeoData**：
```python
GeoData(
    country: str | None,
    city: str | None,
    institution: str | None,
    confidence: Literal["high", "medium", "low", "none"]
)
```

### 输出数据（数据库表）

#### `papers` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `pmid` | VARCHAR(32) PK | PubMed ID |
| `year` | INTEGER | 发表年份 |
| `title` | TEXT | 论文标题 |
| `doi` | VARCHAR(255) | DOI（可选） |
| `xml_stored` | TEXT | NULL（不存储 XML） |

#### `authorship` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | SERIAL PK | 自增主键 |
| `pmid` | VARCHAR(32) FK | PubMed ID |
| `author_order` | INTEGER | 作者顺序（1-based） |
| `author_name_raw` | VARCHAR(500) | 作者显示名称 |
| `last_name` | VARCHAR(255) | 姓氏 |
| `fore_name` | VARCHAR(255) | 名字 |
| `initials` | VARCHAR(50) | 首字母 |
| `suffix` | VARCHAR(50) | 后缀 |
| `is_collective` | BOOLEAN | 是否为集体作者 |
| `collective_name` | VARCHAR(500) | 集体作者名称 |
| `year` | INTEGER | 发表年份 |
| `affiliations_raw` | TEXT | JSON 数组字符串 |
| `affiliation_raw_joined` | TEXT | 合并的 affiliation 字符串 |
| `has_author_affiliation` | BOOLEAN | 是否有 affiliation |
| `country` | VARCHAR(255) | 国家 |
| `city` | VARCHAR(255) | 城市 |
| `institution` | VARCHAR(500) | 机构 |
| `affiliation_confidence` | VARCHAR(20) | 置信度 |

#### `run_papers` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `run_id` | VARCHAR(255) FK | Run ID |
| `pmid` | VARCHAR(32) FK | PubMed ID |
| `created_at` | TIMESTAMPTZ | 创建时间 |

#### `affiliation_cache` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `affiliation_raw` | TEXT PK | 原始 affiliation 字符串 |
| `country` | VARCHAR(255) | 提取的国家 |
| `city` | VARCHAR(255) | 提取的城市 |
| `institution` | VARCHAR(500) | 提取的机构 |
| `confidence` | VARCHAR(20) | 置信度 |

#### `institution_geo` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `institution_id` | SERIAL PK | 自增主键 |
| `primary_name` | TEXT | 机构正式名称 |
| `normalized_name` | TEXT | 标准化名称（用于匹配） |
| `aliases` | JSONB | 别名数组（已标准化） |
| `country` | VARCHAR(255) | 国家 |
| `city` | VARCHAR(255) | 城市 |
| `qs_rank` | INTEGER | QS 排名（可选） |
| `ror_id` | VARCHAR(50) | ROR ID（可选） |
| `source` | VARCHAR(50) | 数据来源（'qs', 'ror', 'manual', 'auto_added', 'LLM_high', 'LLM_medium'） |
| `created_at` | TIMESTAMPTZ | 创建时间 |
| `updated_at` | TIMESTAMPTZ | 更新时间 |

## 性能优化

### 批量操作

1. **批量获取 PMIDs**：
   - 从多个数据源一次性读取所有 PMIDs
   - 使用集合去重，避免重复处理

2. **批量获取 XML**：
   - 每批最多 150 个 PMIDs（PubMed API 限制）
   - 并发发送多个批次（遵守速率限制）

3. **批量提取 Affiliations**：
   - LLM 模式：每批 20 个 affiliations
   - Rule-based 模式：一次性处理所有 affiliations

4. **批量缓存查询**：
   - 使用 `get_batch_cached_affiliations()` 批量查询缓存
   - 使用 `IN` 子句，一次查询多个 affiliations

5. **批量数据库操作**：
   - Papers: 批量 upsert（批量大小：5000）
   - Authorships: 批量 insert（批量大小：5000）
   - Affiliation cache: 批量 upsert（批量大小：5000）

### 缓存策略

1. **Affiliation Cache**：
   - 在 `affiliation_cache` 表中缓存提取结果
   - 避免重复提取相同的 affiliations
   - 使用 `affiliation_raw` 作为主键

2. **Geocoding Cache**：
   - 在 `geocoding_cache` 表中缓存坐标信息
   - 使用 `(country, city)` 作为缓存键
   - 避免重复调用 Nominatim API

3. **Institution Matcher 内存缓存**：
   - 在 `InstitutionMatcher` 中维护内存缓存
   - 缓存键：标准化后的 affiliation 文本
   - 避免重复数据库查询

4. **Institution Geo 表**：
   - 预定义机构信息（QS Top 1000）
   - 自动添加成功提取的机构
   - 提高后续匹配成功率

## 错误处理

### 网络错误

- **PubMed API 失败**：
  - 记录错误日志
  - 跳过失败的 PMID，继续处理其他 PMIDs
  - 统计失败的 PMIDs 数量

### 解析错误

- **XML 解析失败**：
  - 记录错误日志（包含 PMID）
  - 跳过该 PMID，继续处理其他 PMIDs
  - 统计解析失败的 PMIDs 数量

### LLM 错误

- **LLM API 失败**：
  - 记录错误日志
  - 返回空 GeoData（confidence="none"）
  - 统计 LLM 失败的 affiliations 数量

### 数据库错误

- **插入失败**：
  - 记录错误日志（包含具体记录）
  - 回滚事务（如果需要）
  - 统计失败的记录数量

## 日志记录

### 日志级别

- **INFO**: 主要步骤和统计信息
- **DEBUG**: 详细信息（匹配结果、缓存命中率等）
- **WARNING**: 警告信息（缓存未命中、LLM 不确定等）
- **ERROR**: 错误信息（API 失败、解析失败等）

### 日志输出

- **控制台输出**：实时显示主要步骤和进度
- **日志文件**：`backend/log.txt`（详细的日志记录）

### 关键日志点

1. **每个步骤开始和结束**：
   ```
   📥 INGESTION STEP N: ...
   ✅ INGESTION STEP N COMPLETE: ...
   ```

2. **统计信息**：
   - 每个步骤处理的数量
   - 缓存命中率
   - LLM 调用次数
   - 错误数量

3. **错误详情**：
   - 失败的 PMID
   - 失败的 affiliation
   - 错误原因和堆栈跟踪

## API 端点

### POST `/api/projects/{project_id}/runs/{run_id}/ingest`

**请求体**（可选）：
```json
{
  "force_refresh": false
}
```

**响应**：
```json
{
  "run_id": "run_xxx",
  "total_pmids": 300,
  "pmids_cached": 0,
  "pmids_fetched": 300,
  "papers_parsed": 298,
  "authorships_created": 1245,
  "unique_affiliations": 245,
  "affiliations_with_country": 198,
  "llm_calls_made": 13,
  "errors": []
}
```

**认证**：
- 需要 JWT token
- 验证项目所有权

## 配置文件

### `config.py`

相关配置项：
```python
affiliation_extraction_method: str = "rule_based"  # "rule_based" 或 "llm"
openai_api_key: str  # OpenAI API key（LLM 模式需要）
openai_model: str = "gpt-4o-mini"  # LLM 模型
database_url: str  # PostgreSQL 连接字符串
```

## 依赖关系

### 外部服务

1. **PubMed EFetch API**：
   - 获取论文 XML 数据
   - 需要网络连接
   - 有速率限制

2. **OpenAI API**（可选，LLM 模式）：
   - 提取 affiliation 地理信息
   - 验证和修复错误
   - 需要 API key

3. **Nominatim API**（可选，geocoding）：
   - 将地点名称转换为坐标
   - 有速率限制（1 request/second）

### 数据库

- **PostgreSQL**：
  - 存储 papers、authorship 等数据
  - 存储 affiliation_cache、geocoding_cache 等缓存
  - 存储 institution_geo 机构信息表

## 性能指标

### 典型性能

- **PMIDs 数量**: 300 个 PMIDs
- **Papers 解析**: 298 个 papers（~99% 成功率）
- **Authorships 创建**: 1245 个 authorships（平均每个 paper 约 4 个作者）
- **Affiliations 提取**: 245 个唯一 affiliations
- **执行时间**: 约 2-5 分钟（取决于网络和 LLM 调用）

### 优化建议

1. **使用 Rule-based 模式**：
   - 速度：快（无需 LLM 调用）
   - 成本：低（无需 API 费用）
   - 准确率：中等（约 60-70%）

2. **使用 LLM 模式**：
   - 速度：慢（需要 LLM 调用）
   - 成本：高（API 费用）
   - 准确率：高（约 85-95%）

3. **混合模式**（推荐）：
   - 使用 Rule-based 模式进行主要提取
   - 使用 LLM fallback 修复错误
   - 平衡速度和准确率

## 故障排除

### 常见问题

1. **PMIDs 未找到**：
   - 检查 Phase 1 结果文件是否存在
   - 检查文件格式是否正确
   - 检查 PMID 字段名是否匹配

2. **XML 获取失败**：
   - 检查网络连接
   - 检查 PubMed API 是否可用
   - 检查速率限制是否超限

3. **Affiliation 提取失败**：
   - 检查 LLM API key 是否正确（LLM 模式）
   - 检查 LLM API 是否可用
   - 检查 prompt 模板是否存在

4. **数据库写入失败**：
   - 检查数据库连接
   - 检查表结构是否正确
   - 检查权限是否足够

## 后续步骤

Ingestion 完成后，可以进行：

1. **Affiliation Validation**：
   - 运行 `/api/projects/{project_id}/runs/{run_id}/validate-affiliations`
   - 验证和修复提取错误

2. **数据可视化**：
   - 使用地图 API 可视化地理分布
   - `/map/world`, `/map/country/{country}`, `/map/city/{country}/{city}`

3. **数据分析**：
   - 查询 `authorship` 表进行统计分析
   - 查询 `institution_geo` 表查看机构信息
