# 产品需求文档（PRD）：基于研究描述的自动文献检索系统 (Actual product is different from this document.)

## 1. 产品概述

本系统旨在让用户通过输入一段简要的研究介绍（research description），系统即可自动生成检索策略、构建关键词与同义词扩展、调用指定学术数据库（如 PubMed、Semantic Scholar、OpenAlex）进行文献检索，并返回结构化、可追踪的文献结果列表。系统设计需通用于不同科研领域，不依赖人工维护的领域词典，而是按需动态生成可用检索词。

本阶段不包含“语料统计/向量召回长尾变体”（原步骤 2.2），将在后续版本作为可选扩展技术。本阶段聚焦权威词表（MeSH）、通用百科（Wikipedia/Wikidata）、数据库本体（OpenAlex Concepts）以及 LLM 驱动的同义词自动扩展。

---

## 2. 用户场景

### 2.1 典型用户

- 科研人员、博士生、临床医生、工程师。
- 期望通过自然语言描述快速获取该研究方向的代表性论文与学术版图，而无需手工设计复杂检索式。
- 需要反复试错与迭代检索策略（输入描述、澄清、关键词修订）并在确认后生成最终结果。

### 2.2 用户触发流程（Project → 多次 Run）

> 本产品以 **Project** 为一次研究方向探索的容器。用户可在同一 Project 内执行多次 **Run**（每次 Run 为一次完整的“理解 → 确认 → Query → 结果”流程），并在 Phase 1 中切换查看不同 Run 的结果。

1. 用户在 Project 中输入研究简介（支持中英文混合）。
2. 系统进入交互式理解流程：输出理解摘要与困惑点，并提出最多 3 个澄清问题；用户回答后可多轮迭代，直到系统与用户确认理解一致。
3. 系统生成并展示关键词（canonical terms）、同义词扩展与各数据库检索式；用户可手动增删改关键词并反复 review。
4. 用户点击 `Query` 按钮触发本次检索，系统并行调用各配置数据库 API（PubMed / Semantic Scholar / OpenAlex），生成 **一个 Run** 的结果快照并保存。
5. Phase 1 以 Tab 表格展示结果：每个数据库一个 tab，另有 **Aggregated tab**（基于 DOI 去重后的聚合结果）。
6. 若结果不满意，用户可重新进入“理解与确认流程”并再次点击 `Query` 生成新的 Run。
7. 用户选定最终满意的 Run，并以该 Run 的 **Aggregated 结果**进入 Phase 2 学术地图展示。

---

## 3. 功能需求

### 3.1 输入

用户在 Project 中输入自然语言形式的研究描述（可多轮补充/澄清），例如：

> "I am working on invasive speech brain-computer interface decoding using ECoG and sEEG."

### 3.2 输出

系统在 Phase 1 与 Phase 2 分别输出：

**Phase 1（按 Run 输出）：**

- 结构化语义槽位（slots）与系统理解摘要
- canonical terms（可编辑）及同义词扩展
- 各数据库可复现的检索式（queries）
- 各数据库检索结果表格（分 tab）
- Aggregated（聚合）结果表格：以 **DOI 为唯一标识**完成跨库去重，并保留来源证据

**Phase 2（基于选定 Run 的 Aggregated 输出）：**

- 世界/国家/城市/机构分层的学术地图
- 机构点击弹窗：学者列表与研究画像（姓名、是否 PI（含置信度）、从业时间估计、研究内容小结）

---

## 4. Phase 1：文献检索与结果确认（Literature Retrieval & Validation）

> **重要设计说明（Phase 1 / Phase 2 数据隔离原则）**\
> 本系统以 **Project** 为最小长期工作单元。每个 Project 内允许用户多次执行检索尝试，每一次完整的“理解 → 确认 → 查询”流程都会生成一个不可变的 **Run**。
>
> - 每个 Run 的检索结果彼此完全隔离；
> - Phase 1 支持在同一 Project 内反复生成多个 Run 并切换查看；
> - Phase 2（学术地图）仅使用**用户最终选定的某一个 Run 的聚合结果**作为输入；
> - 当前版本不复用外部 API 拉取结果，每个 Run 都是一次全量重跑。

### 4.1 模块 A：基于语义槽位的 LLM 解析（Slot-based Term Extraction）

本模块使用 LLM 将用户的研究描述解析为一组固定的语义槽位（slots）。解析结果以 JSON 结构返回，供后续同义词扩展和检索式生成使用。

#### 4.1.1 输入

- 原始研究描述文本（支持中英文混合）

示例：

> "I am working on invasive ECoG-based real-time speech decoding in epilepsy patients."

#### 4.1.2 输出（统一 JSON Schema）

LLM 按固定 Schema 输出结构化结果（所有字段必填，缺失则为空字符串或空数组）：

```json
{
  "research_goal": "",
  "task": [],
  "method_measurement": [],
  "method_algorithm": [],
  "subject_population": [],
  "signal_feature": [],
  "output_target": [],
  "context": []
}
```

- **research\_goal**：整体研究目标 / 目的（如 "real-time decoding of speech from brain signals"）
- **task**：任务类型（如 speech decoding、speech reconstruction、motor imagery）
- **method\_measurement**：采集/实验方法（如 ECoG、sEEG、Utah array、EEG、fMRI）
- **method\_algorithm**：算法/建模方法（如 RNN、transformer、Kalman filter）
- **subject\_population**：研究对象（如 human、epilepsy patients、ALS patients、macaque）
- **signal\_feature**：信号/特征类型（如 high-gamma、phase、single-unit activity）
- **output\_target**：模型输出目标（如 speech acoustics、phonemes、words、cursor position）
- **context**：研究场景与应用背景（如 invasive BCI、clinical presurgical mapping、rehabilitation）

#### 4.1.3 LLM 调用要求与标准 Prompt

- 使用温度较低的配置（例如 0–0.2），避免幻觉和过度发挥。
- 禁用/降低随机性相关参数（如 top\_p）以保证可重复性。
- 单轮调用，不允许模型联想扩写，不做对话风格回答。

**调用约束：**

- 只从原始文本中抽取信息，不得凭空添加事实；
- 如果某一类信息在文本中未出现，对应字段留空字符串或空数组；
- 必须严格按指定 JSON schema 输出，不添加任何额外字段或注释；
- 输出内容必须是合法 JSON（UTF-8，无注释，无尾逗号）。

**系统端负责：**

- 校验 JSON 合法性（不可解析则自动重试一次）；
- 统一中英文术语方向（如将“脑机接口”规范为 "brain-computer interface"）。

**标准 Prompt 文本（供开发直接使用）：**

> 用途：将用户输入的“研究描述”解析为结构化语义槽位（slots），用于后续关键词扩展和文献检索。

```text
You are a scientific research description parser.

Your task:
- Read the user-provided research description (which may be in Chinese, English, or mixed).
- Extract the core semantic information into a fixed set of slots.
- ONLY use information explicitly present in the input text. Do NOT invent or assume new facts.
- If some slot is not mentioned in the text, leave it as an empty string "" (for scalar fields) or an empty array [] (for list fields).
- Output MUST be a valid JSON object matching the schema below. Do NOT add any extra fields, comments, or explanations.

JSON schema:
{
  "research_goal": "",          // Overall research goal or purpose (string)
  "task": [],                    // List of task types, e.g. ["speech decoding"]
  "method_measurement": [],      // List of measurement / recording methods, e.g. ["ECoG", "sEEG"]
  "method_algorithm": [],        // List of algorithms / models, e.g. ["RNN", "transformer"]
  "subject_population": [],      // List of subject types, e.g. ["human", "epilepsy patients"]
  "signal_feature": [],          // List of signal / feature types, e.g. ["high-gamma", "phase"]
  "output_target": [],           // List of model outputs / prediction targets, e.g. ["speech acoustics", "phonemes"]
  "context": []                  // List of context / application descriptions, e.g. ["intracranial BCI", "clinical presurgical mapping"]
}

Constraints:
- Do NOT translate technical terms: keep ECoG, sEEG, BCI, etc. in their original form if they appear in the input.
- If the user writes in Chinese (e.g. “脑机接口”), you may convert it to its standard English technical term (e.g. "brain-computer interface").
- If the input is ambiguous, prefer shorter and more generic phrasing rather than making up specific details.

Output format:
- Return ONLY the JSON object, with no markdown, no code fences, and no additional text.

Now I will provide the research description as `input_text`.

input_text:
"""
<USER_RESEARCH_DESCRIPTION_HERE>
"""

Return the JSON object now.
```

开发时将 `<USER_RESEARCH_DESCRIPTION_HERE>` 替换为真实的用户研究描述文本，并直接将该 Prompt 作为 LLM 调用的 `prompt` 内容即可。

#### 4.1.4 规范化（Canonicalization）

在获得初始 slots 后，可由同一 LLM 或第二次调用对各字段中的自然语言短语进行**规范化**。这一阶段旨在：

- 将口语化或混合语言表达统一为标准英文专业术语；
- 去除冗余修饰词（如 based on、approach to），保留核心技术名词；
- 对每个字段输出去重后的 canonical term 列表；
- 为后续同义词扩展与检索式构建提供更稳定的输入。

以下为开发可直接使用的 **规范化 Prompt（Normalization Prompt）**：

```
You are a scientific term normalization engine.
Your task is to normalize scientific phrases extracted from a research description.
You MUST follow these rules:

1. Convert informal or mixed-language expressions into standard English scientific terminology.
   - Example: "脑机接口" → "brain-computer interface"
   - Example: "脑表面电极" → "Electrocorticography (ECoG)"
   - Example: "皮层深部电极" → "stereoelectroencephalography (sEEG)"

2. Remove non-essential modifiers such as:
   - "based on"
   - "approach to"
   - "using"
   - "method for"

3. Keep only domain-relevant and technically meaningful terms.

4. DO NOT invent any new concepts — only normalize what is explicitly provided.

5. Produce deduplicated canonical terms.

Input schema (JSON):
{
  "research_goal": "",
  "task": [],
  "method_measurement": [],
  "method_algorithm": [],
  "subject_population": [],
  "signal_feature": [],
  "output_target": [],
  "context": []
}

Your output MUST:
- Keep the exact same JSON structure as input.
- Replace each field with a normalized, deduplicated list of canonical English terms.
- Be a valid JSON object only — no commentary, no markdown, no explanation.

Below is the input JSON to normalize:
<INPUT_JSON_HERE>

Return ONLY the normalized JSON.
```

开发时将 `<INPUT_JSON_HERE>` 替换为上一阶段槽位抽取生成的 JSON 对象，即可完成可重复、可控的术语规范化流程。

规范化后的示例输出（简化）：

```json
{
  "research_goal": "real-time decoding of speech from brain signals",
  "task": ["speech decoding"],
  "method_measurement": ["Electrocorticography (ECoG)", "invasive recording"],
  "method_algorithm": [],
  "subject_population": ["human", "epilepsy patients"],
  "signal_feature": ["high-gamma activity"],
  "output_target": ["speech acoustics"],
  "context": ["intracranial BCI", "clinical presurgical evaluation"]
}
```

---

### 4.2 模块 B：同义词扩展（Synonym Expansion Pipeline）

本模块根据 canonical term 自动扩展检索同义词。**不依赖人工词典**。

扩展来源包括：

1. **权威本体 / 受控词表（Ontology）**

   - 如果 term 在 PubMed MeSH 中存在：
     - 使用 MeSH Descriptor + Entry Terms
   - 如果 term 在 OpenAlex Concepts 中存在：
     - 使用其 `display_name` + `synonyms`

2. **通用百科（Wikipedia/Wikidata）**

   - 查询“also known as”
   - 解析 redirect 页面名称

3. **LLM 生成候选（LLM Candidate Generator）**

   - 任务：生成专业领域常用写法、缩写、变体
   - 输出需经过后续验证，不直接使用

4. **自动形态扩展（Morphological Variants）**

   - 单复数：interface ↔ interfaces
   - 连字符/空格：brain computer interface / brain-computer interface
   - 缩写：自动识别首字母缩写（如 brain‑computer interface → BCI）

5. **验证（Validation）**

   - 调用数据库轻量检索统计频次
   - 过滤 0 命中或极端异常的写法

示例扩展（任务为“brain‑computer interface”）：

```
主词：brain-computer interface
权威词表：Brain-Computer Interfaces (MeSH)，brain-machine interface，neural interface technology
LLM：BCI，BMI，brain machine interface，BCI systems
形态扩展：brain computer interface(s)，brain-machine interface(s)
```

最终输出是一个**小而可信的同义词列表**。

---

### 4.3 模块 C：检索式生成（Query Builder）

系统根据数据库类型自动构建检索式。

#### PubMed：

- 优先使用 MeSH（如果存在）
- MeSH + 自由词（tiab）组合成 OR 块
- 再用 AND 连接各主题模块

示例：

```
("Brain-Computer Interfaces"[Mesh] OR "brain-computer interface*"[tiab] OR BCI[tiab] OR BMI[tiab])
AND ("Electrocorticography"[Mesh] OR ECoG[tiab] OR "intracranial EEG"[tiab] OR sEEG[tiab] OR "Electrodes, Implanted"[Mesh])
AND ("Speech"[Mesh] OR "speech decoding"[tiab] OR "imagined speech"[tiab])
```

#### Semantic Scholar：

- 使用关键词 OR 同义词列表
- 可使用 `fieldsOfStudy` 限定领域（如 Neuroscience, Computer Science）

#### OpenAlex：

- 使用 concepts + keywords
- 用 OR 连接所有概念写法

---

### 4.4 模块 D：文献获取（API Aggregator）

系统支持以下数据源：

- PubMed E-Utilities API（ESearch + EFetch）
- Semantic Scholar API
- OpenAlex Works API

负责：

- 并发调用
- 分页处理
- 去重（基于 DOI / PMID / title）
- 标准化文献结构（title, authors, year, venue, abstract, identifiers）

---

### 4.5 模块 E：结果排序（Ranking）

可使用以下信号组合：

- 数据库权重（PubMed > Semantic Scholar > OpenAlex，可配置）
- 发表年份
- LLM 评估“与用户研究描述的语义相关度”
- 引用量（可选）

---

### 4.6 模块 F：结果展示（UI / API）

输出格式包括：

- 文献列表（title + authors + year + source + link）
- 自动生成的检索词
- 自动生成的检索式

---

### 4.7 模块 G：交互式用户理解与确认流程（Interactive Understanding & Review UI）

本模块负责与用户的多轮交互，确保系统在检索前充分理解研究描述，并允许用户确认或补充关键信息。

#### 4.7.1 用户输入界面（Input UI）

- 提供一个文本输入框，用户输入研究简介（1–10 句话）。
- 点击“提交”后进入系统理解阶段。

#### 4.7.2 系统对研究描述的理解与困惑输出

系统对用户输入进行 LLM 初步解析，并输出：

1. **系统的理解摘要（system interpretation）**：系统对用户研究描述的整体理解。
2. **系统的困惑点（uncertainties）**：系统列出缺失的信息、可能存在的歧义、以及无法确定的研究细节。
3. **澄清问题（clarification questions，最多 3 个）**：如果系统认为关键信息不足，将自动提出最多 3 个问题，引导用户补充研究任务、方法、对象、场景等信息。

#### 4.7.3 多轮交互（Iterative Clarification Loop）

- 用户回答澄清问题后，系统重新解析研究描述。
- 若仍有信息不足，系统继续提出下一轮问题（最多 3 个）。
- 该过程循环进行，直到系统认为已充分理解用户研究意图。

#### 4.7.4 用户确认阶段（User Confirmation）

当系统确认理解充分后，将呈现：

- 系统最终理解摘要（final interpretation）
- 语义槽位（slots）解析结果及对应 canonical terms

用户可以选择：

- **“确认无误”** → 系统进入后续关键词提取与审阅阶段（模块 H）
- **“需要修改”** → 用户重新输入研究描述或补充内容，系统再次进入理解流程

---

### 4.8 模块 H：关键词展示、用户审阅与迭代优化（Keyword Review & Iteration）

> 本模块属于 **Run 内流程**。任何对关键词、同义词或检索式的修改，只有在用户点击 `Query` 按钮后，才会生成一个新的 Run；系统不会修改已有 Run 的结果。

在用户确认系统理解正确后，本模块负责展示关键词、同义词和检索式，并支持用户编辑与再次生成。

#### 4.8.1 关键词提取结果展示

系统将展示：

- **自动识别的研究主题关键词（canonical terms）**
- **每个关键词的同义词扩展（synonym sets）**
- **各数据库对应的检索式（PubMed / S2 / OpenAlex）**

所有结果以结构化面板呈现，用户可展开/折叠细节。

#### 4.8.2 用户可手动修订关键词

用户可以：

- 添加新的关键词
- 删除系统自动生成但不相关的词
- 修改 canonical term

系统根据用户修改自动重新生成：

- 同义词扩展
- 检索式

系统再次展示更新后的版本，直到用户满意为止。

#### 4.8.3 用户最终确认

用户点击“确认关键词与检索式”，进入下一步：数据库检索。

---

### 4.9 模块 I：检索结果展示 UI（Search Results UI）

当用户确认关键词正确、检索式准备就绪后，系统会执行所有配置数据库的文献检索。

#### 4.9.1 多数据库检索

系统会并行查询：

- PubMed
- Semantic Scholar
- OpenAlex （未来可扩展更多）

#### 4.9.2 多标签页结果展示（Tabbed Results View）

检索结果基于**当前选中的 Run**进行展示。切换 Run 时，所有 tab 中的内容将随之整体更新。

- UI 以表格形式呈现文献结果。

- 每个数据库对应一个独立的 tab，例如：

  - PubMed
  - Semantic Scholar
  - OpenAlex

- 额外提供一个 **Aggregated（聚合）** tab，用于展示当前 Run 下来自所有数据库的去重后论文集合。

- 用户可以自由切换查看不同数据源的检索结果。

#### 4.9.3 表格字段包括：

- 论文标题（可点击跳转）
- 作者列表
- 发表年份
- 期刊/会议名称
- **DOI（作为唯一论文标识）**
- 摘要（可选折叠）
- 数据来源（PubMed / Semantic Scholar / OpenAlex）

> **去重规则说明**：\
> Aggregated tab 中的论文基于 DOI 进行去重。同一 DOI 在多个数据库中命中时，仅保留一条记录，并保留其来源证据。TODO: DOI可能有缺失，需要测试验证。

---

### 4.10 模块 J：Run 管理与 Phase 2 入口（Run Management & Promotion）

### 4.10.1 Run 的定义

- 一个 **Run** 表示一次完整的 Phase 1 执行过程：
  - 包含一次完整的“交互式用户理解与确认流程”（模块 G）；
  - 包含用户最终确认的关键词、同义词与检索式；
  - 包含一次点击 `Query` 后产生的多数据库检索结果与聚合结果。
- Run 一经生成即视为**不可变快照**，后续修改将产生新的 Run。

### 4.10.2 Run 的保存形式

- 每个 Project 对应一个目录；
- Project 内每个 Run 使用独立子目录保存；
- 每个 Run 至少包含以下 JSON 文件：

```
run_<id>/
  ├── understanding.json          # 用户研究描述 + 澄清问答 + 最终理解
  ├── keywords.json               # canonical terms + synonyms
  ├── queries.json                # 各数据库检索式
  ├── results_pubmed.json
  ├── results_semantic_scholar.json
  ├── results_openalex.json
  └── results_aggregated.json     # 基于 DOI 去重后的最终论文集
```

### 4.10.3 进入 Phase 2（学术地图）

- 用户在 Phase 1 中选定某一个 Run；
- 系统将该 Run 的 `results_aggregated.json` 作为 Phase 2 的唯一输入；
- Phase 2 不支持跨 Run 合并或对比，仅展示当前 Run 对应的一张学术地图。

---

## 5. Phase 2：学术地图与研究生态展示（Academic Research Map）

### 5.1 概述

Phase 2 以 **Phase 1 中用户最终确认的某一个 Run 的聚合论文集合（results\_aggregated.json）** 为唯一输入，构建该研究领域的 **学术地图（Academic Map）**。

该地图用于回答如下问题：

- 该研究方向在全球范围内主要分布在哪些国家和地区？
- 各国家/城市中活跃的研究机构有哪些？
- 每个机构中有哪些代表性学者？

Phase 2 的目标是帮助科研人员**快速形成对某一研究领域学术版图的整体认知**，而非提供全量、永久的全球统计。

---

### 5.2 输入与数据约束

#### 5.2.1 输入数据

Phase 2 的输入严格限定为：

- 一个 Run 的 `results_aggregated.json`
- 该文件中的论文以 **DOI 为唯一标识**，且已完成跨数据库去重

Phase 2 **不直接访问外部文献数据库 API**，也不依赖其他 Run 的结果。

#### 5.2.2 数据语义说明

学术地图展示的是：

> “基于当前检索策略和数据源覆盖范围下，该研究方向的学术分布情况”。

系统在 UI 中需明确提示该语义边界。

---

### 5.3 核心处理流程

#### 5.3.1 实体抽取（Entity Extraction）

系统从聚合论文中解析以下实体：

- 作者（Author）
- 机构（Institution / University / Research Center）
- 国家（Country）
- 城市（City）

作者与机构信息优先使用结构化字段；若缺失，则从 affiliation 字符串中解析。

---

#### 5.3.2 实体归一化（Entity Normalization）

为保证统计一致性，系统需进行基础归一化：

- 机构名称规范化（如全称/简称合并）
- 国家与城市名称标准化
- 同一作者在同一机构下的合并（基于姓名 + 机构）

当前版本不要求全局作者消歧，仅在 Run 内保证一致性。

---

#### 5.3.3 学术身份推断（Derived Attributes）

系统在 Phase 2 中可推断以下属性（均基于当前 Run 的论文集合）：

- **是否 PI（Principal Investigator）**：

  - 基于作者位次（如 last author）、通讯作者信息（若可得）
  - 输出需包含置信度说明

- **从业时间（Career Length）**：

  - 以该作者在当前 Run 中最早发表论文的年份作为估计

- **研究内容小结（Research Summary）**：

  - 使用 LLM 对作者相关论文标题/摘要进行简要总结

上述推断结果仅在当前 Run 语境下成立。

---

### 5.4 学术地图可视化（Map Visualization）()

#### 5.4.1 分层地图结构

学术地图支持以下层级的逐级展开：

1. **世界层级**：按国家聚合学者数量
2. **国家层级**：按城市显示研究机构分布
3. **城市层级**：显示具体学校/研究机构
4. **机构层级**：展示该机构内的学者列表

---

#### 5.4.2 机构与学者展示

- 每个机构以地图标记显示
- 用户点击机构标记后，弹出信息窗口，包含：
  - 学校/机构名称
  - 学者列表（姓名）
  - 是否 PI（若可推断）
  - 从业时间（估计）
  - 研究方向小结

---

### 5.5 产品边界

- Phase 2 仅展示 **一个 Run 对应的一张学术地图**
- 不支持多个 Run 的地图对比或合并
- 不声明“该领域全球全量分布”，而是基于当前检索结果的分析

---

## 6. 可选未来扩展（V2+）

### 6.1 长尾变体扩展（暂不实现）

通过：

- 大规模语料分布式向量（embedding）
- PMI/co-occurrence统计
- 子词分析

挖掘不在本体、不在百科、不在 LLM 模板中的真实学术变体。
