# Company Name Parsing Fix (Ltd & Variants)

## 问题描述

在机构解析过程中，包含公司后缀（如 Ltd, Inc., Corp. 等）的公司名称被错误解析。

**错误示例**：
- **输入**: `"Neuroxess Co., Ltd., Shanghai, 200023, China."`
- **错误结果**: 
  - Institution: `"Ltd"` ❌
  - City: `"Ltd"` ❌
- **期望结果**:
  - Institution: `"Neuroxess Co Ltd"` ✅
  - City: `"Shanghai"` ✅

**根本原因**：
- 公司后缀识别模式不完善，无法处理带逗号的格式（如 `Co., Ltd.`）
- 机构提取逻辑只提取包含后缀的单个 token，而不是完整的公司名称

---

## 解决方案

### 1️⃣ 改进公司后缀识别模式

**位置**: `backend/app/phase2/rule_based_extractor.py` → `_choose_institution()`

**改进前**:
```python
company_patterns = [
    r"\b(co\.?\s*ltd\.?|ltd\.?|inc\.?|...)\b",  # 无法匹配带逗号的格式
    ...
]
```

**改进后**:
```python
company_suffix_patterns = [
    r"co[.,]?\s*ltd[.,]?",  # ✅ 匹配: Co., Ltd. / Co. Ltd / Co Ltd / Co, Ltd
    r"co[.,]?\s*limited",   # ✅ 匹配: Co., Limited / Co Limited
    r"ltd[.,]?",            # ✅ 匹配: Ltd. / Ltd
    r"inc[.,]?",            # ✅ 匹配: Inc. / Inc
    r"corp[.,]?",           # ✅ 匹配: Corp. / Corp
    r"corporation",         # ✅ Corporation
    r"llc",                 # ✅ LLC
    r"gmbh",                # ✅ GmbH
    r"ag",                  # ✅ AG
    r"s[.,]a[.,]",          # ✅ S.A. / SA
    r"s[.,]p[.,]a[.,]",     # ✅ S.P.A. / SPA
    r"plc",                 # ✅ PLC
    r"bv",                  # ✅ BV
    r"nv",                  # ✅ NV
    r"limited",             # ✅ Limited
    r"incorporated",        # ✅ Incorporated
]
```

**关键改进**:
- 使用 `[.,]?` 来匹配可选的逗号或句号
- 覆盖各种公司后缀的国际变体

---

### 2️⃣ 重构完整公司名称

**策略**:
当检测到公司后缀时，向前查找最多 2 个 token 来重构完整的公司名称。

**伪代码逻辑**:
```python
if has_company_suffix:
    # 向前查找最多 2 个 token
    company_parts = []
    for i in range(max(0, idx - 2), idx):
        prev_token = tokens[i]
        # 停止条件：遇到位置关键词或国家名
        if is_location(prev_token):
            break
        company_parts.append(prev_token)
    
    # 添加包含后缀的当前 token
    company_parts.append(current_token)
    
    best = " ".join(company_parts)
```

**示例**:
- **输入 tokens**: `["Neuroxess", "Co., Ltd.", "Shanghai", "200023", "China"]`
- **检测**: `"Co., Ltd."` 包含公司后缀 ✅
- **向前查找**: `"Neuroxess"` (idx-1)
- **重构**: `"Neuroxess Co Ltd"` ✅

---

### 3️⃣ 更新城市名验证

**位置**: `backend/app/phase2/rule_based_extractor.py` → `_is_valid_city_name()`

**目的**: 确保包含公司后缀的 token 不会被误识别为城市名。

**改进后**:
```python
company_patterns = [
    r"\bco[.,]?\s*ltd[.,]?\b",
    r"\bltd[.,]?\b",
    r"\binc[.,]?\b",
    r"\bcorp[.,]?\b",
    r"\bcorporation\b",
    r"\bllc\b",
    r"\bgmbh\b",
    # ... 所有公司后缀变体
]

for pattern in company_patterns:
    if re.search(pattern, city_lower, re.IGNORECASE):
        return False  # 不是有效的城市名
```

---

## 测试结果 ✅

**测试用例**: 7 个公司名称解析场景

| 输入 | 期望机构 | 期望城市 | 期望国家 | 结果 |
|------|---------|---------|---------|------|
| `Neuroxess Co., Ltd., Shanghai, 200023, China.` | `Neuroxess Co Ltd` | `Shanghai` | `China` | ✅ PASSED |
| `NeuroTech Co. Ltd, Beijing, 100000, China` | `NeuroTech Co. Ltd` | `Beijing` | `China` | ✅ PASSED |
| `BrainWave Co Ltd, Shenzhen, China` | `BrainWave Co Ltd` | `Shenzhen` | `China` | ✅ PASSED |
| `MindTech Ltd., Tokyo, Japan` | `MindTech Ltd` | `Tokyo` | `Japan` | ✅ PASSED |
| `CogniSoft Inc., New York, NY, USA` | `CogniSoft Inc` | `New York` | `United States` | ✅ PASSED |
| `NeuroSolutions Corp., Boston, MA, USA` | `NeuroSolutions Corp` | `Boston` | `United States` | ✅ PASSED |
| `BioMed Limited, London, UK` | `BioMed Limited` | `London` | `United Kingdom` | ✅ PASSED |

**结果**: **7/7 测试全部通过** ✅

---

## 支持的公司后缀格式

现在支持以下公司后缀及其所有变体：

| 后缀 | 变体示例 | 国家/地区 |
|------|---------|----------|
| **Ltd** | `Ltd.`, `Ltd`, `Co., Ltd.`, `Co. Ltd`, `Co Ltd`, `Co, Ltd` | 国际通用 |
| **Inc** | `Inc.`, `Inc` | 美国 |
| **Corp** | `Corp.`, `Corp`, `Corporation` | 美国 |
| **LLC** | `LLC` | 美国 |
| **Limited** | `Limited`, `Co., Limited` | 英国 |
| **PLC** | `PLC` | 英国 |
| **GmbH** | `GmbH` | 德国 |
| **AG** | `AG` | 德国/瑞士 |
| **S.A.** | `S.A.`, `SA` | 法国/西班牙 |
| **S.P.A.** | `S.P.A.`, `SPA` | 意大利 |
| **BV** | `BV` | 荷兰 |
| **NV** | `NV` | 荷兰/比利时 |

---

## 关于标点符号规范化

**行为**: 
- 末尾的标点符号（`.`, `,`, `;`）会被 `_norm_token()` 函数自动移除
- 这是设计行为，确保机构名称的一致性

**示例**:
- **输入**: `"Neuroxess Co., Ltd."`
- **输出**: `"Neuroxess Co Ltd"` (移除了 `.` 和 `,`)

**影响**:
- ✅ 不影响机构匹配和搜索
- ✅ 提高数据一致性（避免因标点差异导致重复）
- ✅ 保留了核心信息（公司名称主体 + 后缀类型）

---

## 修改的文件

1. **`backend/app/phase2/rule_based_extractor.py`**:
   - `_choose_institution()`: 改进公司名称提取逻辑
   - `_is_valid_city_name()`: 更新公司后缀检测模式

---

## 后续建议

### 1. 监控自动添加的机构

修复后，更多公司名称能被正确识别并自动添加到 `institution_geo` 表。建议：
- 定期检查自动添加的公司机构
- 验证地理信息的准确性
- 必要时手动校正

### 2. 扩展支持的后缀

如果发现新的公司后缀格式，可以轻松添加到 `company_suffix_patterns` 列表中。

**添加步骤**:
1. 在 `_choose_institution()` 中添加新模式
2. 在 `_is_valid_city_name()` 中同步添加
3. 运行测试验证

### 3. 处理特殊情况

某些边缘情况可能需要特殊处理：
- 公司名称包含地名（如 "Shanghai Tech Ltd"）
- 多个公司后缀（如 "Co., Ltd., Inc."）
- 非英语公司名称

---

## 总结

✅ **问题已修复**: 公司名称（如 Neuroxess Co., Ltd.）不再被错误解析为 "Ltd"

✅ **功能增强**: 支持多种国际公司后缀格式

✅ **测试验证**: 7/7 测试用例全部通过

✅ **向后兼容**: 不影响现有的学术机构解析逻辑
