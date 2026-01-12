# Institution Matching Strategy for QS Top 1000 Data

## 问题分析

### 1. 非英语字符（变音符号）问题

**问题**：
- QS 数据中机构名称包含变音符号：`École Polytechnique Fédérale`, `Ludwig-Maximilians-Universität München`, `Universität zu Köln`
- PubMed 提取的机构名称可能是英语版本：`Ecole Polytechnique Federale`, `Ludwig-Maximilians-Universitat Munchen`
- 当前实现只进行大小写标准化，无法匹配带有/不带有变音符号的同一机构

**影响**：
- 精确匹配失败：`École` ≠ `Ecole`
- 部分匹配失败：`Universität München` 不包含 `Universitat Munchen`

### 2. 别名字段未充分利用

**问题**：
- CSV 中大部分 `aliases` 字段为空
- 没有自动生成标准化别名（无变音符号版本）
- 没有处理常见缩写和变体

**影响**：
- 无法通过别名匹配不同语言版本的机构名称
- 无法匹配缩写（如 `MIT` vs `Massachusetts Institute of Technology`）

### 3. 排版格式差异

**问题**：
- 标点符号：`University of California, Berkeley` vs `University of California Berkeley`
- 空格：`Université Paris-Saclay` vs `Universite Paris Saclay`
- 特殊字符：`Xìan` vs `Xi'an`（拼写错误或不同标准）

**影响**：
- 精确匹配因格式差异失败
- 需要更灵活的匹配策略

### 4. 当前匹配实现的局限性

**`get_by_name` 方法**：
- 只进行大小写不敏感的匹配：`func.lower(primary_name) == name_normalized`
- 不处理变音符号
- aliases 匹配只检查 JSONB array 是否包含原始字符串

**`search_by_name` 方法**：
- 使用简单的字符串包含检查：`name_normalized in primary_lower`
- 相似度计算不准确（使用长度比例，非真正的编辑距离）
- 不处理变音符号问题

## 推荐的匹配策略

### ✅ 策略 1: 字符标准化（Character Normalization）- 已选定实施方案

**目的**：统一处理变音符号、格式差异和兼容字符问题

**实现方式**：
```python
def normalize_text(text: str) -> str:
    """Normalize text by removing diacritics and standardizing format.
    
    This function performs comprehensive text normalization:
    1. NFKC normalization: Handles compatibility characters (full-width, superscript, etc.)
    2. NFD + remove diacritics: Removes accents and diacritical marks
    3. Lowercase conversion
    4. Punctuation and whitespace normalization
    """
    import unicodedata
    import re
    
    # Step 1: NFKC normalization (Normalization Form Compatibility Composition)
    # Handles compatibility characters:
    # - Full-width characters (ＡＢＣ -> ABC)
    # - Superscript/subscript (² -> 2, ₁ -> 1)
    # - Ligatures (ﬁ -> fi, ﬃ -> ffi)
    # - Various compatibility forms
    text = unicodedata.normalize('NFKC', text)
    
    # Step 2: NFD normalization + remove diacritics (accents)
    # É -> E, é -> e, ü -> u, ö -> o, ñ -> n, etc.
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    
    # Step 3: Convert to lowercase
    text = text.lower()
    
    # Step 4: Remove special punctuation (keep spaces and hyphens)
    text = re.sub(r'[^\w\s-]', ' ', text)
    
    # Step 5: Normalize whitespace (multiple spaces -> single space)
    text = ' '.join(text.split())
    
    # Step 6: Normalize hyphens (optional)
    text = text.replace(' - ', ' ').replace('-', ' ')
    
    return text.strip()
```

**NFKC 标准化的作用**：
- **全角/半角字符**：`ＡＢＣ` → `ABC`，`１２３` → `123`
- **上标/下标**：`H₂O` → `H2O`，`x²` → `x2`
- **连字字符**：`ﬁ` → `fi`，`ﬃ` → `ffi`
- **其他兼容字符**：统一处理各种 Unicode 兼容变体

**示例**：
- `"École Polytechnique Fédérale"` → `"ecole polytechnique federale"` (变音符号处理)
- `"Universität zu Köln"` → `"universitat zu koln"` (变音符号处理)
- `"Université Paris-Saclay"` → `"universite paris saclay"` (变音符号处理)
- `"ＡＢＣ University"` → `"abc university"` (全角字符处理，NFKC)
- `"H₂O Institute"` → `"h2o institute"` (下标处理，NFKC)
- `"ﬁnance University"` → `"finance university"` (连字处理，NFKC)

### 策略 2: 别名增强（Alias Enhancement）- 后续优化

**目的**：在数据导入时自动生成别名

**生成规则**：
1. **无变音符号版本**：`École` → `["Ecole"]`
2. **缩写提取**：`Massachusetts Institute of Technology (MIT)` → `["MIT"]`
3. **常见变体**：`University of X` → `["X University", "Univ. of X"]`
4. **拼写修正**：`Xìan` → `["Xi'an", "Xian"]`

**实现位置**：`scripts/import_institution_geo.py`

**状态**：暂不实施，优先使用策略 1（字符标准化）

### 策略 3: 多层匹配策略（Multi-Tier Matching）- 已整合到策略 1

**优先级顺序**：

1. **精确匹配（Exact Match）**：
   - 标准化后的 affiliation 与标准化后的 primary_name 或 aliases 完全匹配
   - 最高置信度（confidence = "high"）

2. **部分匹配（Partial Match）**：
   - 标准化后的 affiliation 包含机构名称，或机构名称包含 affiliation 的子串
   - 高置信度（confidence = "high"）

3. **编辑距离模糊匹配（Fuzzy Match with Edit Distance）**：
   - 使用 Levenshtein 或 Jaro-Winkler 距离
   - 相似度阈值：0.75-0.85
   - 中等置信度（confidence = "medium"）

4. **关键词匹配（Keyword Match）**：
   - 提取机构关键词（如 "University", "Institute"）
   - 进行关键词匹配
   - 低置信度（confidence = "low"）

### 策略 4: 使用真正的编辑距离算法 - 后续优化

**当前问题**：使用长度比例作为相似度，不准确

**改进方案**：
- 使用 `python-Levenshtein` 库的 `ratio()` 函数
- 或使用 `difflib.SequenceMatcher`
- 相似度阈值：0.75-0.85

**示例**：
```python
from Levenshtein import ratio

similarity = ratio("ecole polytechnique", "ecole polytechnique federale")
# similarity ≈ 0.76 (good match)

similarity = ratio("universitat koln", "universitat zu koln")
# similarity ≈ 0.88 (excellent match)
```

**状态**：暂不实施，优先使用策略 1（字符标准化）。字符标准化 + 精确/部分匹配应该能解决大部分问题。

## 具体场景示例

### 场景 1: 变音符号差异
- **QS**: `École Polytechnique Fédérale de Lausanne`
- **PubMed**: `Ecole Polytechnique Federale de Lausanne`
- **标准化后**: `"ecole polytechnique federale de lausanne"` → **精确匹配成功** ✅

### 场景 2: 德语变音符号
- **QS**: `Universität zu Köln`
- **PubMed**: `Universitat zu Koln`
- **标准化后**: `"universitat zu koln"` → **精确匹配成功** ✅

### 场景 3: 缩写匹配
- **QS**: `Massachusetts Institute of Technology (MIT)`, aliases: `["MIT"]`
- **PubMed**: `MIT`
- **匹配**: `"mit"` in aliases → **别名匹配成功** ✅

### 场景 4: 拼写变体
- **QS**: `Xìan Jiaotong University`, aliases: `["Xi'an", "Xian"]`
- **PubMed**: `Xi'an Jiaotong University`
- **匹配**: `"xian jiaotong university"` in aliases → **别名匹配成功** ✅

### 场景 5: 部分匹配
- **QS**: `Ludwig-Maximilians-Universität München`
- **PubMed**: `Department of Physics, Ludwig Maximilians Universitat Munchen`
- **标准化后**: `"ludwig maximilians universitat munchen"` 包含 `"ludwig maximilians universitat munchen"` → **部分匹配成功** ✅

## 实施建议

### ✅ Phase 1: 字符标准化（已选定实施）

**实施方案**：策略 1（字符标准化）

**核心设计**：
- **数据库层面**：在 `institution_geo` 表中添加 `normalized_name` 字段，存储 `primary_name` 的标准化版本
- **匹配策略**：匹配过程**全部在 `normalized_name` 和 `aliases` 上进行**，**不使用 `primary_name`**
- **工作流程**：
  1. 数据导入时：自动生成 `normalized_name`（从 `primary_name`）和别名（可选）
  2. 匹配时：将文献提取的 affiliation 标准化后，与数据库中的 `normalized_name` 和 `aliases`（标准化后）进行比对

#### 1.1 数据库模型修改

**添加字段**：
- `normalized_name`: `TEXT NOT NULL` - 存储 `primary_name` 的标准化版本
- `aliases`: `JSONB` - 存储别名数组（已存在，需要在导入时生成标准化别名）

**索引**：
- 在 `normalized_name` 上创建索引（用于快速精确匹配）
- 在 `aliases` JSONB 上创建 GIN 索引（已存在，用于别名匹配）

#### 1.2 创建 `normalize_text()` 函数

**位置**：新建 `backend/app/phase2/text_utils.py`

**功能**：
- NFKC 标准化：处理兼容字符（全角、上标、连字等）
- NFD + 去除变音符号：处理变音符号（É, ü, ö 等）
- 小写转换
- 标点和空格标准化

**实现要点**：
- 使用 `unicodedata.normalize('NFKC', text)` 作为第一步
- 然后使用 `unicodedata.normalize('NFD', text)` + 去除 Mn 类别字符
- 最后进行格式标准化（小写、空格、标点）

#### 1.3 修改数据导入脚本

**修改 `scripts/import_institution_geo.py`**：
- 导入时自动生成 `normalized_name`（从 `primary_name` 标准化）
- 自动生成别名（可选）：
  - 如果 CSV 中有别名，对别名也进行标准化
  - 如果没有别名，可以生成一些常见变体（可选）
- 确保 `normalized_name` 和 `aliases`（数组中的每个别名）都是标准化后的文本

#### 1.4 修改 `InstitutionGeoRepository.get_by_name()`

**匹配策略**：
- **仅使用 `normalized_name` 和 `aliases` 进行匹配**，不使用 `primary_name`
- 将输入的 `name` 标准化后，与 `normalized_name` 进行精确匹配
- 如果精确匹配失败，检查标准化后的 `name` 是否在 `aliases` 数组（标准化后）中

#### 1.5 修改 `InstitutionGeoRepository.search_by_name()`

**匹配策略**：
- **仅使用 `normalized_name` 和 `aliases` 进行匹配**，不使用 `primary_name`
- 将输入的 `name` 标准化后，与 `normalized_name` 进行部分匹配检查
- 同时检查标准化后的 `name` 是否包含在 `aliases` 数组中
- 保持现有相似度计算方法（暂时）

#### 1.6 修改 `InstitutionMatcher.match_institution()`

**匹配流程**：
1. 将输入的 `affiliation_text` 标准化
2. 提取潜在的机构名称（从 affiliation 文本中）
3. 对每个潜在机构名称：
   - 标准化该名称
   - 调用 `InstitutionGeoRepository.get_by_name()` 或 `search_by_name()`（使用标准化后的名称）
   - 这些方法会与数据库中的 `normalized_name` 和 `aliases`（标准化后）进行匹配

**关键点**：
- 匹配过程**完全基于标准化后的文本**，不涉及 `primary_name`
- `normalized_name` 在数据导入时预计算，提高匹配性能

### Phase 2: 别名增强（可选，在数据导入时自动生成）

**状态**：在数据导入时可以自动生成别名，也可以后期手动添加

**别名生成规则**（可选，在导入时）：
1. **如果 CSV 中有别名**：对每个别名进行标准化，存储在 `aliases` 数组中
2. **自动生成别名**（可选）：
   - 缩写提取：从括号中提取缩写（如 `MIT` from `(MIT)`）
   - 常见变体：生成一些常见变体（如 `University of X` → `X University`）
   - 无变音符号版本：如果 `primary_name` 有变音符号，可以添加无变音符号版本（但通常 `normalized_name` 已处理）

**后期手动添加**：
- 可以通过 `update_institution()` 方法手动添加别名
- 别名在添加时也需要标准化

### Phase 3: 改进模糊匹配（暂不实施）

**状态**：后续优化项

1. **安装依赖**：
   ```bash
   pip install python-Levenshtein
   ```

2. **修改 `InstitutionGeoRepository.search_by_name()`**
   - 使用 Levenshtein 或 Jaro-Winkler 距离
   - 设置合理的相似度阈值（0.75-0.85）

### Phase 4: 性能优化（已包含在 Phase 1）

**状态**：已实施

1. **预计算标准化名称**
   - ✅ 在数据库中添加 `normalized_name` 字段（在数据导入时计算）
   - ✅ 避免在每次匹配时重复计算标准化

2. **索引优化**
   - ✅ 在 `normalized_name` 上创建索引（精确匹配）
   - ✅ 在 `aliases` JSONB 上创建 GIN 索引（别名匹配，已存在）

**性能优势**：
- 匹配时只需要对输入的 affiliation 进行标准化，不需要对数据库中的每条记录进行标准化
- 数据库查询可以直接使用 `normalized_name` 上的索引，查询速度快

## 预期效果（基于策略 1：字符标准化）

### 匹配准确率提升

- **当前估计**：~60-70%（无法处理变音符号和兼容字符）
- **改进后估计**：~80-90%（处理变音符号 + NFKC兼容字符 + 格式标准化）

**说明**：
- 字符标准化（策略 1）应该能解决大部分匹配问题（80-90%）
- 如果还需要进一步提高，可以后续实施别名增强和模糊匹配（策略 2、4）

### 处理能力

- ✅ **处理变音符号差异**（法语、德语、西班牙语等）：É → E, ü → u
- ✅ **处理兼容字符**（NFKC）：全角字符、上标、下标、连字
- ✅ **处理排版格式差异**（标点、空格、连字符）
- ⚠️ **缩写匹配**（MIT, UCLA 等）：通过部分匹配可以实现，但不是最优
- ⚠️ **拼写变体**（Xi'an vs Xian）：通过格式标准化可以处理部分情况

### 性能影响（策略 1）

- **NFKC 标准化**：O(n)，性能开销小
- **NFD + 去除变音符号**：O(n)，性能开销小
- **格式标准化**：O(n)，性能开销小
- **总体影响**：< 2ms per match（可接受）
- **缓存优化**：标准化后的文本可以缓存，避免重复计算

## 注意事项（策略 1）

1. **NFKC 标准化的影响**：
   - NFKC 会将兼容字符转换为标准形式，这对于处理全角字符、上标等非常有用
   - 某些情况下可能会改变字符含义（如 ² → 2），但对于机构名称匹配通常是合理的

2. **去除变音符号可能导致的误匹配**：
   - 某些语言中，去除变音符号后可能与其他词混淆
   - 例如：`résumé` vs `resume`（在机构名称中较少见）
   - 解决方案：结合国家和城市信息进行验证，或使用部分匹配而非完全去除变音符号

3. **标准化顺序的重要性**：
   - **必须先进行 NFKC**，然后再进行 NFD + 去除变音符号
   - 这样可以先处理兼容字符，再处理变音符号
   - 顺序错误可能导致某些字符处理不当

4. **数据质量**：
   - QS 数据中的拼写错误（如 `Xìan`）可能无法通过标准化完全解决
   - NFKC 可以帮助处理一些兼容字符问题
   - 如果标准化后仍有问题，可能需要手动修正或通过别名处理

5. **多语言支持**：
   - NFKC + 去除变音符号主要针对欧洲语言（法语、德语、西班牙语等）
   - 中文、日文、韩文等需要特殊处理（当前数据中较少）
   - 全角字符（如中文标点、数字）会通过 NFKC 转换为半角

6. **性能考虑**：
   - 标准化函数应尽可能高效（避免重复计算）
   - 可以考虑缓存标准化结果
   - 对于大量数据，可以考虑在数据库层面进行标准化（但实现复杂度较高）

## 下一步行动（策略 1：字符标准化）

### 立即实施

1. ✅ **分析问题**（已完成）
2. ⏳ **实现字符标准化函数**（包含 NFKC + NFD + 去除变音符号）
   - 创建 `normalize_text()` 函数
   - 添加 NFKC 标准化步骤
   - 添加 NFD + 去除变音符号步骤
   - 添加格式标准化步骤（小写、空格、标点）
3. ⏳ **修改 `InstitutionMatcher.match_institution()`**
   - 在匹配前对所有文本进行标准化
   - 标准化 affiliation 和机构名称
4. ⏳ **修改 `InstitutionGeoRepository.get_by_name()`**
   - 使用标准化后的文本进行匹配
   - 检查标准化后的 primary_name 和 aliases
5. ⏳ **修改 `InstitutionGeoRepository.search_by_name()`**
   - 使用标准化后的文本进行部分匹配
6. ⏳ **测试验证匹配准确率**
   - 测试变音符号匹配：`École` vs `Ecole`
   - 测试兼容字符：全角字符、上标、下标
   - 测试格式差异：标点、空格
   - 验证匹配准确率提升

### 后续优化（暂不实施）

7. ⏸️ **增强数据导入时的别名生成**（策略 2）
8. ⏸️ **改进模糊匹配算法**（策略 4）