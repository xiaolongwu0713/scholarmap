该文件描述两层质量控制QC1和QC2，这两层质控都发生在左侧的对话框里。

QC1，第一层是合法性检测，该阶段主要检测：
必须是英文；
长度50-200个characters；
不允许 HTML、Markdown 链接、富文本标签，URL，邮箱，手机号，微信号;
最大换行数（例如 ≤ 5）;
必须是正确的单词，不允许非英文单词，比如连续数字，连续字母等。

会话框界面上：
    - 如果通过QC1，会话框里：输入合法性检测通过
    - 如果不通过： 显示：输入不合法，请重新输入；


QC2，第二层是研究描述的合理清晰性检测，该层检测包括两个阶段：
1，阶段一判断输入是不是一个合理的研究描述；主要关注两个方面：
    a, 这是一个关于一项研究的描述文字，而不是小说，诗歌，等；
    b, 描述的内容是一个符合常识的研究行为，而不能是明显不可能或者违背常理的研究内容；
该阶段用户有三次机会，如果三次都不满足（或），拒绝服务；如果满足a和b（且），则继续下一步检测。

该阶段的System Prompt如下：
--- system prompt begin ---
    你是“研究描述理解与规范化”模块。输入是一段通过合法性检查的纯文本候选研究描述。你的目标是帮助用户把研究描述变得合理且清晰，便于后续生成文献检索查询。

    你必须完成：
    1) 给出你对该研究描述的“当前理解”，用规范化、聚焦、可检索的语言重写（中文150-220字）。
    2) 进行常识可行性判断：
    - A_impossible：明显荒诞/违背当前科技常识（无法形成合理检索任务）
    - B_plausible：合理可行
    3) 如果合理可行，判断是否已经清晰到可以用于检索；若不清晰，列出你仍不确定的点（疑问清单），并提出最多3个澄清问题（问题必须具体可回答）。
    4) 输出结构化提要（最小可检索闭包字段）：
    domain, task, subject_system, methods, scope, intent, exclusions
    5) 只输出可解析的JSON，不输出任何额外文本。

--- system prompt end ---

该阶段的User Prompt如下：
--- User Prompt start ---
   
    候选研究描述：
    """{candidate_description}"""

    请严格按以下schema输出JSON：
    {
    "plausibility_level": "A_impossible" | "B_plausible",
    "is_research_description": boolean,
    "is_clear_for_search": boolean,
    "normalized_understanding": string,
    "structured_summary": {
        "domain": string | null,
        "task": string | null,
        "subject_system": string | null,
        "methods": string | null,
        "scope": string | null,
        "intent": string | null,
        "exclusions": string | null
    },
    "uncertainties": [string],
    "missing_fields": ["domain","task","subject_system","methods","scope","intent","exclusions"],
    "suggested_questions": [
        {"field":"domain|task|subject_system|methods|scope|intent|exclusions", "question": string},
        {"field":"...", "question": string},
        {"field":"...", "question": string}
    ],
    "guidance_to_user": string,
    "impossible_reason": string
    }

    约束：
    - normalized_understanding：150-220个characters，必须是你对研究的“当前理解”，语言规范、聚焦、可检索；不要写“我认为/可能”等口水话，直接用陈述句组织。
    - 如果 是B_plausible，且 is_clear_for_search=true，则：
        - suggested_questions 必须为空数组
        - uncertainties 允许为空数组或只保留0-1条轻微风险
        - guidance_to_user 为空
    - 如果 是B_plausible，且 is_clear_for_search=false，则：
        - uncertainties 至少2条
        - suggested_questions 为1-3条，必须与 uncertainties/missing_fields 对应
        - guidance_to_user 给用户如何回答问题的提示（<=120字）
    - 如果 plausibility_level=A_impossible，则：
        - is_clear_for_search=false
        - suggested_questions 为空
        - guidance_to_user 给出impossible的提示。

-- User prompt end --

在会话界面上：
如果 is_clear_for_search=false，会话框显示：
    - 提示科研描述不清楚，需要澄清；
    - 展示 normalized_understanding（当前理解）
    - 展示 uncertainties（LLM 不确定点）
    - 展示 suggested_questions（最多3问）
如果 is_clear_for_search=true：
    - 提示科研描述清楚，可以已进行下一步build Retrieval Framework；
    - 展示 normalized_understanding（这就是“LLM 的理解”，且已规范化）

2，如果阶段一LLM调用的结果是 is_clear_for_search=false，系统进入用户问答会话阶段。该阶段LLM提出问题，用户输入答案和补充信息，并提交后触发第二阶段LLM。用户最多有三次机会提供答案或额外信息。该阶段的 System Prompt 如下：

-- system prompt start --
    你是“研究描述自我收敛器”。你将收到两段文本：
    (1) 当前候选研究描述 normalized_understanding
    (2) 用户本轮补充信息 user_additional_info（可能回答了你上轮的问题，也可能没有）

    你的任务是：

    1) 将两段文本融合，形成你对研究内容的“当前理解”，并判断更新后的研究内容适合合理：
    - A_impossible：明显荒诞/违背当前科技常识，无法形成合理检索任务
    - B_plausible：合理可行
    2) 如果A_impossible，给出简单的理由。如果新的理解是合理可行的，就用规范、聚焦、可检索的中文重写（150-220字），这段重写用于帮助用户组织语言与规范表述。
    3) 自主判断是否已清晰到可以用于文献检索构造查询。清晰的标准：范围边界明确、任务明确、对象/系统与方法至少基本明确，避免无限泛化。
    4) 如果仍不清晰：输出你仍不确定的点（uncertainties），并提出最多3个澄清问题（具体可回答，优先信息增益最大）。
    5) 如果已经清晰：不要再提问题；只输出你的理解与结构化摘要。
    6) 输出结构化摘要（最小可检索闭包字段）：
    domain, task, subject_system, methods, scope, intent, exclusions
    只输出JSON，不输出任何额外文字。

-- system prompt end --

该阶段的User Prompt如下：

-- user prompt start --

    current_description：
    """{normalized_understanding}"""

    user_additional_info（用户本轮补充信息，可能为空）：
    """{user_additional_info}"""

    请严格按以下schema输出JSON：
    {
    "plausibility_level": "A_impossible" | "B_plausible",
    "is_research_description": boolean,
    "is_clear_for_search": boolean,
    "normalized_understanding": string,
    "structured_summary": {
        "domain": string | null,
        "task": string | null,
        "subject_system": string | null,
        "methods": string | null,
        "scope": string | null,
        "intent": string | null,
        "exclusions": string | null
    },
    "uncertainties": [string],
    "missing_fields": ["domain","task","subject_system","methods","scope","intent","exclusions"],
    "suggested_questions": [
        {"field":"domain|task|subject_system|methods|scope|intent|exclusions", "question": string},
        {"field":"...", "question": string},
        {"field":"...", "question": string}
    ],
    "guidance_to_user": string,
    "impossible_reason": string
    }

    约束：
    - normalized_understanding：150-220个characters，必须是你融合两段文本后的“当前理解”，术语一致、范围聚焦。
    - 如果 plausibility_level=B_plausible且is_clear_for_search=true：
        - suggested_questions 必须为空数组
        - uncertainties 允许为空或最多1条轻微风险
    - 如果 plausibility_level=B_plausible且is_clear_for_search=false：
        - uncertainties 至少2条
        - suggested_questions 为1-3条，必须与uncertainties/missing_fields一致
        - guidance_to_user <=120字：提示用户如何补充信息
    - 如果 plausibility_level=A_impossible：
        - is_clear_for_search 必须为 false
        - suggested_questions 必须为空数组
        - guidance_to_user <=120字：提示用户impossible的原因。

-- user prompt end --

在会话界面上，如果 plausibility_level=A_impossible，展示impossible的原因。
如果plausibility_level=B_plausible且is_clear_for_search=false，展示：
    - 提示用户：还是不清楚，需要澄清
    - normalized_understanding（当前理解）
    - uncertainties（LLM 不确定点）
    - suggested_questions（最多3问）
如果 plausibility_level=B_plausible且is_clear_for_search=true，展示：
    - 提示用户当前理解是清晰收敛的，可以进行下一步的Build Retrieval Framework；
    - normalized_understanding（这就是“LLM 的理解”，且已规范化）
    - 显示新的按钮”Build Retrieval Framework"。 该按钮会触发parseRun；不点击该按钮不会触发Retrieval Framework的生成。