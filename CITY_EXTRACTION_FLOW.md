# 城市名提取流程说明

## 完整流程概览

从 PubMed XML 解析到最终存储城市名的完整流程如下：

```
PubMed XML → XML 解析 → Affiliation 字符串 → 去重 → 提取地理信息 → 存储到数据库
```

---

## 详细步骤

### 1. XML 解析阶段 (`pubmed_parser.py`)

**位置**: `backend/app/phase2/pubmed_parser.py`

**方法**: `_extract_author_affiliations()`

**流程**:
- 从 PubMed XML 的 `<Author>` 元素中查找 `<AffiliationInfo>/<Affiliation>` 元素
- 提取每个 `<Affiliation>` 的文本内容（原始 affiliation 字符串）
- 返回 affiliation 字符串列表

**示例 XML 结构**:
```xml
<Author>
  <AffiliationInfo>
    <Affiliation>Department of Neurology, Harvard Medical School, Boston, MA, USA</Affiliation>
  </AffiliationInfo>
</Author>
```

**提取结果**: `["Department of Neurology, Harvard Medical School, Boston, MA, USA"]`

---

### 2. Affiliation 去重阶段 (`pg_ingest.py`)

**位置**: `backend/app/phase2/pg_ingest.py`

**方法**: `_extract_affiliations()`

**流程**:
- 遍历所有论文的所有作者的所有 affiliations
- 使用 `set()` 收集唯一的 affiliation 字符串
- 目的：避免对相同的 affiliation 重复提取（节省 LLM 调用或计算资源）

**示例**:
- 如果有 100 个作者，但只有 50 个唯一的 affiliation 字符串
- 只需要对这 50 个进行地理信息提取

---

### 3. 地理信息提取阶段

根据配置 `settings.affiliation_extraction_method` 选择提取方法：

#### 3.1 Rule-Based 提取 (`rule_based_extractor.py`)

**位置**: `backend/app/phase2/rule_based_extractor.py`

**主函数**: `_parse_affiliation(affiliation_raw: str)`

**详细流程**:

##### 步骤 3.1.1: 文本预处理
- `_norm_text()`: 规范化文本（去除多余空格、特殊字符）
- `_preclean_affil()`: 
  - 移除电子邮箱
  - 移除 "Electronic address" 等标记
  - 将分号替换为逗号
  - 规范化逗号和空格

**示例**:
```
输入: "Department of Neurology, Harvard Medical School, Boston, MA, USA"
预处理后: "Department of Neurology, Harvard Medical School, Boston, MA, USA"
```

##### 步骤 3.1.2: Token 分割
- 按逗号分割 affiliation 字符串
- 对每个 token 进行规范化处理 (`_norm_token()`)
- 移除邮政编码 (`_strip_postal()`)

**示例**:
```
输入: "Department of Neurology, Harvard Medical School, Boston, MA, USA"
Tokens: ["Department of Neurology", "Harvard Medical School", "Boston", "MA", "USA"]
```

##### 步骤 3.1.3: 国家检测
- `_detect_country()`: 从 tokens 中识别国家
- 使用 `pycountry` 库匹配国家名
- 支持国家别名（如 "USA" → "United States"）

##### 步骤 3.1.4: 州/省检测
- `_detect_region_with_token()`: 识别州/省（如 "MA", "CA"）
- 支持美国州名和缩写
- 支持加拿大省份

##### 步骤 3.1.5: 城市检测 (`_detect_city()`)

这是**城市名提取的核心逻辑**：

**子步骤 A: Token 扩展**
- 处理 "Washington DC" 这样的格式
- 将其扩展为 ["Washington", "DC"] 两个 token

**子步骤 B: 基于州/省的城市检测**
- 如果找到了州/省（如 "MA"），查找它前面的 token
- 例如：`["Boston", "MA", "USA"]` → 找到 "MA"，返回前面的 "Boston"
- **验证**: 使用 `_is_valid_city_name()` 验证候选城市名

**子步骤 C: Fallback 检测**
- 如果没有找到州/省，反向遍历所有 tokens
- 跳过无效的城市名（使用 `_is_valid_city_name()` 验证）
- 跳过包含数字的 token
- 跳过过短的 token（≤2 个字符且全大写）

**城市名验证规则** (`_is_valid_city_name()`):
- ❌ 州缩写（MD, OH, WV 等）
- ❌ 包含 "USA" 的字符串
- ❌ 机构名（包含 "University", "Department", "Hospital" 等关键词）
- ❌ 部门名（以 "Department", "Division" 等开头）
- ❌ 过短名称（≤2 个字符）
- ❌ 包含多个州缩写的字符串
- ✅ 其他情况视为有效城市名

**示例**:
```
输入 tokens: ["MD", "USA", "United States"]
- "MD" 是州缩写 → 无效
- "USA" → 跳过
- "United States" 是国家 → 跳过
结果: None

输入 tokens: ["Boston", "MA", "United States"]
- 找到 "MA"（州）
- 前面的 token: "Boston"
- 验证 "Boston" → 有效
结果: "Boston"

输入 tokens: ["Department of Physiology", "United States"]
- 反向遍历
- "Department of Physiology" 包含 "department" → 无效
- "United States" 是国家 → 跳过
结果: None
```

##### 步骤 3.1.6: 机构检测
- `_choose_institution()`: 识别机构名
- 优先选择包含 "University", "College", "Hospital" 等的 token

##### 步骤 3.1.7: 部门检测
- `_choose_department()`: 识别部门名
- 选择以 "Department", "Division" 等开头的 token

#### 3.2 LLM-Based 提取 (`affiliation_extractor.py`)

**位置**: `backend/app/phase2/affiliation_extractor.py`

**流程**:
- 读取 prompt 模板 (`prompts/affiliation_extraction.md`)
- 将多个 affiliation 字符串格式化为编号列表
- 调用 LLM (OpenAI) 进行批量提取
- 解析 LLM 返回的 JSON 数组
- 转换为 `GeoData` 对象

**Prompt 规则**:
- 明确要求不要提取州缩写作为城市
- 明确要求不要提取机构名作为城市
- 明确要求不要提取部门名作为城市

---

### 4. 存储到数据库阶段 (`pg_ingest.py`)

**位置**: `backend/app/phase2/pg_ingest.py`

**方法**: `_write_to_database()`

**流程**:
- 对于每个作者，使用**第一个 affiliation** 的地理信息（primary affiliation 策略）
- 从 `geo_map` 中获取对应的 `GeoData` 对象
- 将 `GeoData.city` 存储到 `authorship` 表的 `city` 字段

**数据库字段**:
- `authorship.city`: 存储提取的城市名（可为 NULL）
- `authorship.country`: 存储提取的国家名
- `authorship.institution`: 存储提取的机构名
- `affiliation_confidence`: 存储置信度（high/medium/low/none）

---

## 关键代码位置

1. **XML 解析**: `backend/app/phase2/pubmed_parser.py::_extract_author_affiliations()`
2. **Affiliation 去重**: `backend/app/phase2/pg_ingest.py::_extract_affiliations()`
3. **Rule-Based 城市提取**: `backend/app/phase2/rule_based_extractor.py::_detect_city()`
4. **城市名验证**: `backend/app/phase2/rule_based_extractor.py::_is_valid_city_name()`
5. **LLM 提取**: `backend/app/phase2/affiliation_extractor.py::extract_batch()`
6. **数据库存储**: `backend/app/phase2/pg_ingest.py::_write_to_database()`

---

## 当前配置

根据 `config.py`:
- `affiliation_extraction_method = "rule_based"` (当前使用 rule-based 方法)

---

## 潜在问题点

1. **Token 分割问题**: 如果 affiliation 格式不规范，按逗号分割可能不准确
2. **州缩写误识别**: 如果州缩写单独出现，可能被误识别为城市（已通过 `_is_valid_city_name()` 修复）
3. **机构名误识别**: 如果机构名格式特殊，可能被误识别为城市（已通过验证函数修复）
4. **格式错误**: 如 "MD USA" 这样的格式错误可能被识别为城市（已修复）

---

## 改进建议

1. ✅ **已实现**: 添加了 `_is_valid_city_name()` 验证函数
2. ✅ **已实现**: 更新了 LLM prompt 以明确规则
3. 🔄 **可考虑**: 添加更多城市名验证规则（如检查是否在已知城市列表中）
4. 🔄 **可考虑**: 对于 LLM 提取，添加后处理验证步骤

