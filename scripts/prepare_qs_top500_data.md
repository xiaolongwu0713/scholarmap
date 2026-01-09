# QS Top 500 数据准备指南

## 数据来源

QS 世界大学排名数据可以从以下来源获取：

1. **QS 官网**：https://www.topuniversities.com/university-rankings/world-university-rankings
2. **QS API**（如果有访问权限）
3. **第三方数据源**（如 Kaggle、GitHub 等）

## 数据格式要求

### CSV 格式

必须包含以下列：

```csv
primary_name,country,city,aliases,qs_rank,ror_id,source
```

**字段说明**：
- `primary_name` (必填): 机构正式名称，如 "Massachusetts Institute of Technology"
- `country` (必填): 国家名称，使用标准名称如 "United States", "United Kingdom"
- `city` (可选): 城市名称
- `aliases` (可选): 别名，逗号分隔或 JSON 数组格式，如 "MIT, Massachusetts Institute of Technology" 或 ["MIT", "Massachusetts Institute of Technology"]
- `qs_rank` (可选): QS 排名数字，如 1, 2, 3
- `ror_id` (可选): ROR ID（如果有）
- `source` (可选): 数据来源，默认为 "qs"

### JSON 格式

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
  ...
]
```

## 数据准备步骤

### 方法 1: 手动准备（推荐用于小批量）

1. 从 QS 官网获取排名列表
2. 按照 CSV 格式整理数据
3. 保存为 `data/qs_top500.csv`
4. 运行导入脚本

### 方法 2: 使用脚本处理（如果有原始数据）

如果你有 QS 数据的原始格式（Excel、JSON 等），可以创建一个转换脚本。

## 导入步骤

1. **准备数据文件**：将 QS 前 500 数据整理为 CSV 或 JSON 格式，保存到 `data/qs_top500.csv` 或 `data/qs_top500.json`

2. **验证数据格式**（可选）：
   ```bash
   python scripts/import_institution_geo.py --file data/qs_top500.csv --dry-run
   ```

3. **导入数据**：
   ```bash
   python scripts/import_institution_geo.py --file data/qs_top500.csv
   ```

## 数据质量检查

导入前建议检查：

1. **国家名称标准化**：确保使用标准国家名称（如 "United States" 而不是 "USA"）
2. **城市名称**：尽量填写城市名称以提高匹配准确率
3. **别名**：为常见机构添加别名（如 "MIT" 对应 "Massachusetts Institute of Technology"）
4. **排名**：确保 qs_rank 字段为数字

## 示例数据转换

如果你有 QS 数据的其他格式，可以参考以下转换逻辑：

```python
# 示例：从 QS 原始数据转换为标准格式
def convert_qs_data(qs_row):
    return {
        'primary_name': qs_row['Institution Name'],
        'country': normalize_country(qs_row['Country']),
        'city': qs_row.get('City', ''),
        'aliases': generate_aliases(qs_row['Institution Name']),
        'qs_rank': int(qs_row['Rank']),
        'source': 'qs'
    }
```

## 注意事项

1. **数据量**：500 条记录导入时间约 1-2 分钟
2. **重复检查**：脚本会自动跳过已存在的机构（基于 primary_name）
3. **错误处理**：导入过程中如有错误，会记录但不会中断整个导入过程

