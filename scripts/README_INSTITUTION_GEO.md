# Institution Geographic Data Import Guide

## 概述

Institution Geographic Data 功能通过维护一个全球主要研究机构的地理信息表，显著提高 affiliation 解析的准确率。该功能优先匹配已知机构，避免常见的解析错误（如 "Boston, MA" 被误解析为 "MA" 国家）。

## 功能特点

1. **提高准确率**：知名机构（如 Harvard、MIT、Stanford）可直接匹配，避免规则或 LLM 解析错误
2. **减少 LLM 调用**：匹配到机构时可直接使用，节省成本和时间
3. **一致性保证**：同一机构总是返回相同的地理信息
4. **优先级策略**：Institution 表匹配 > affiliation_cache > rule-based/LLM

## 数据库表结构

表名：`institution_geo`

字段：
- `institution_id`: 主键
- `primary_name`: 机构正式名称（必填）
- `aliases`: 机构别名/变体（JSONB 数组，可选）
- `country`: 国家（必填）
- `city`: 城市（可选）
- `qs_rank`: QS 世界大学排名（可选）
- `ror_id`: Research Organization Registry ID（可选）
- `source`: 数据来源（'qs', 'ror', 'manual'）
- `created_at`, `updated_at`: 时间戳

## 数据导入

### 1. 准备数据文件

支持 CSV 或 JSON 格式。

#### CSV 格式示例

```csv
primary_name,country,city,aliases,qs_rank,ror_id,source
Massachusetts Institute of Technology,United States,Cambridge,"MIT, Massachusetts Institute of Technology",1,,qs
Harvard University,United States,Cambridge,"Harvard, Harvard University",4,,qs
```

**字段说明**：
- `primary_name`: 机构正式名称（必填）
- `country`: 国家名称（必填）
- `city`: 城市名称（可选）
- `aliases`: 别名，可以是逗号分隔的字符串或 JSON 数组格式（可选）
- `qs_rank`: QS 排名数字（可选）
- `ror_id`: ROR ID（可选）
- `source`: 数据来源，默认为 'qs'（可选）

#### JSON 格式示例

```json
[
  {
    "primary_name": "Massachusetts Institute of Technology",
    "country": "United States",
    "city": "Cambridge",
    "aliases": ["MIT", "Massachusetts Institute of Technology"],
    "qs_rank": 1,
    "source": "qs"
  },
  {
    "primary_name": "Harvard University",
    "country": "United States",
    "city": "Cambridge",
    "aliases": ["Harvard", "Harvard University"],
    "qs_rank": 4,
    "source": "qs"
  }
]
```

### 2. 运行导入脚本

```bash
# 从 CSV 文件导入
python scripts/import_institution_geo.py --file data/institutions.csv

# 从 JSON 文件导入
python scripts/import_institution_geo.py --file data/institutions.json --format json

# 干运行（预览，不实际导入）
python scripts/import_institution_geo.py --file data/institutions.csv --dry-run
```

### 3. 示例数据

示例数据文件：`data/institutions_sample.csv`

包含约 50 个知名大学的地理信息，可作为模板使用。

## 匹配策略

InstitutionMatcher 使用以下策略（按优先级）：

1. **精确匹配**：机构名称完全匹配 `primary_name` 或 `aliases`
2. **部分匹配**：affiliation 文本包含机构名称
3. **模糊匹配**：使用相似度算法（相似度 > 0.7）

## 集成位置

Institution matching 已集成到以下提取器：

1. **RuleBasedExtractor**：在规则解析之前尝试机构匹配
2. **AffiliationExtractor**：在 LLM 调用之前尝试机构匹配

## 数据维护

### 定期更新

建议：
- 每年更新 QS 排名数据
- 每季度检查 ROR 更新
- 根据实际使用情况手动补充常见机构

### 添加新机构

可以通过以下方式添加：

1. **通过脚本导入**：准备 CSV/JSON 文件，使用导入脚本
2. **手动添加**：直接操作数据库（不推荐）
3. **程序化添加**：使用 `InstitutionGeoRepository.insert_institution()`

## 性能考虑

- Institution matching 在内存中缓存结果，避免重复数据库查询
- 批量匹配时，会先批量查询数据库，然后进行匹配
- 匹配成功时，跳过 rule-based 和 LLM 提取，显著提升性能

## 故障排查

### 导入失败

1. 检查文件格式是否正确
2. 确保必填字段（primary_name, country）存在
3. 检查数据库连接是否正常

### 匹配失败

1. 检查机构名称是否正确添加到数据库
2. 检查别名是否包含常见的变体
3. 查看日志了解匹配过程

## 相关文件

- 数据库模型：`backend/app/db/models.py` (InstitutionGeo)
- 数据访问层：`backend/app/db/repository.py` (InstitutionGeoRepository)
- 匹配逻辑：`backend/app/phase2/institution_matcher.py`
- 集成点：`backend/app/phase2/rule_based_extractor.py`, `backend/app/phase2/affiliation_extractor.py`

