# is_answered 更新完成总结

## ✅ 更新概述

已成功将系统从原有的 `is_research_description` 和 `is_helpful` 两步判断，简化为只使用 `is_answered` 判断。

---

## 🔄 核心变化

### 原有逻辑（已删除）
1. **Stage 1**: `is_research_description` - 判断是否为研究描述
2. **Stage 2**: `is_helpful` - 判断用户回答是否有帮助

### 新逻辑
1. **Stage 1**: 只检查 `plausibility_level` - 判断研究是否合理
2. **Stage 2**: 检查 `is_answered` - 判断用户是否正面回答了问题

---

## 📝 已更新的文件

### 后端（Python）

#### 1. `backend/app/phase1/parse.py`
- **Line 91-102**: 删除 Stage 1 的 `is_research_description` 字段检查
- **Line 193-205**: 将 Stage 2 的 `is_research_description` 改为 `is_answered`

#### 2. `backend/app/parse_protection.py`
- **Line 23**: 导入配置改为 `BACKEND_STAGE2_MAX_CONSECUTIVE_UNANSWERED`
- **Line 37-58**: `get_attempt_counts()` - 变量名改为 `stage2_consecutive_unanswered`
- **Line 75-105**: `increment_stage2_attempt()` - 参数和逻辑改为使用 `is_answered`
- **Line 113-125**: `check_stage2_limit()` - 使用新的配置常量

#### 3. `backend/app/guardrail_config.py`
- **Line 24-36**: Stage 2 注释更新 - `is_helpful` → `is_answered`
- **Line 57**: 常量名改为 `PARSE_STAGE2_MAX_CONSECUTIVE_UNANSWERED`
- **Line 92**: 后端配置改为 `BACKEND_STAGE2_MAX_CONSECUTIVE_UNANSWERED`

#### 4. `backend/app/main.py`
- **Line 718-719**: 从 LLM 返回中获取 `is_answered` 而非 `is_helpful`

---

### 前端（TypeScript/React）

#### 1. `frontend/src/app/projects/[projectId]/runs/[runId]/page.tsx`

**类型定义**：
- **Line 57-62**: `ChatMessage` 类型 - status 改为 `"answered" | "not_answered"`
- **Line 64-84**: `ParseResult` 类型 - 删除 `is_research_description` 和 `is_helpful`，添加 `is_answered`

**函数更新**：
- **Line 356-385**: `formatSystemUnderstanding()` - 完全重写
  - Stage 2: 检查 `is_answered` 而非 `is_helpful`
  - `is_answered=false` 时显示 LLM 原因（从 `uncertainties` 获取）
  - Stage 1: 只检查 `plausibility_level`，删除 `is_research_description` 检查

**变量名批量替换**：
- `is_helpful` → `is_answered`
- `consecutiveFalse` → `consecutiveUnanswered`
- `consecutiveUnhelpful` → `consecutiveUnanswered`
- `parse_stage2_max_consecutive_unhelpful` → `parse_stage2_max_consecutive_unanswered`

**UI 更新**：
- **Line 1942-1949**: 状态颜色 - `"helpful"` → `"answered"`, `"not_helpful"` → `"not_answered"`
- **Line 985**: Stage 1 失败检查 - 删除 `is_research_description`
- **Line 1091**: Stage 2 锁定检查 - 删除 `is_research_description`
- **Line 2002-2004**: 条件渲染 - 删除 `is_research_description` 检查
- **Line 2164**: 按钮显示 - `is_helpful` → `is_answered`

#### 2. `frontend/src/lib/api.ts`
- **Line 45**: `FrontendConfig` 接口 - `parse_stage2_max_consecutive_unhelpful` → `parse_stage2_max_consecutive_unanswered`

#### 3. `frontend/src/lib/parseConfig.ts`
- **Line 56**: 默认配置值 - `parse_stage2_max_consecutive_unanswered: 2`
- **Line 103**: 导出常量 - `PARSE_STAGE2_MAX_CONSECUTIVE_UNANSWERED`

---

## 🎯 新的行为逻辑

### is_answered=false 的处理

当用户没有正面回答问题时（`is_answered=false`）：

1. **显示原因**：
   - 从 `result.uncertainties` 字段获取 LLM 给出的原因
   - 在前端对话框显示：`"{reason}\n\nPlease provide a more direct answer to the question. You have {2 - consecutiveUnanswered} chance(s) left."`

2. **计数追踪**：
   - `consecutiveUnanswered` 计数器加 1
   - 连续 2 次 `is_answered=false` 后锁定输入

3. **用户体验**：
   - 用户清楚知道为什么被拒绝
   - 知道还剩几次机会
   - 可以调整回答方式

### Stage 1 简化

- **删除**：不再检查 `is_research_description`
- **保留**：只检查 `plausibility_level === "A_impossible"`
- **好处**：减少误判，简化逻辑

---

## 🧪 测试要点

### 后端测试
1. **Stage 1**: 
   - ✅ 合理的研究描述应该通过
   - ✅ 荒诞的研究应该被拒绝（`A_impossible`）

2. **Stage 2**:
   - ✅ 正面回答问题：`is_answered=true`，计数器重置
   - ✅ 没有回答问题：`is_answered=false`，计数器+1，显示原因
   - ✅ 连续 2 次 `is_answered=false`：锁定输入

### 前端测试
1. **对话显示**:
   - ✅ `is_answered=true`: 绿色背景，"Your answer is helpful..."
   - ✅ `is_answered=false`: 红色背景，显示具体原因 + 剩余机会

2. **锁定机制**:
   - ✅ 连续 2 次未回答：输入框禁用
   - ✅ 显示提示：超过最大尝试次数

3. **按钮状态**:
   - ✅ 只有 `is_answered=true` 时才显示 "Use the latest understanding" 按钮

---

## 📊 配置值

### 前后端一致的配置
- `PARSE_STAGE2_MAX_CONSECUTIVE_UNANSWERED = 2`
- 用户有 **2 次** `is_answered=false` 的机会

---

## ✅ 验证清单

- [x] 后端 Python 代码无 linter 错误
- [x] 前端 TypeScript 代码无 linter 错误
- [x] 所有变量名已统一更新
- [x] Prompt 文件已更新（`parse_stage2_converge.md`）
- [x] 配置文件已同步（前后端）
- [x] 类型定义已更新
- [x] UI 消息已更新

---

## 🚀 部署建议

### 部署步骤
1. 提交所有更改到 git
2. 部署后端（FastAPI）
3. 部署前端（Next.js）
4. 验证配置 API (`/api/frontend-config`) 返回正确值
5. 测试完整的 Stage 1 → Stage 2 流程

### 兼容性注意
- **向后兼容**：老的 `is_helpful` 字段在后端默认为 `True`（`main.py` Line 718）
- **数据迁移**：无需迁移，新字段 `is_answered` 自动生效

---

**更新完成时间**: 2026-01-22  
**更新文件数**: 7 个（4 后端 + 3 前端）  
**测试状态**: ✅ Linter 通过，待功能测试

---

## 📝 后续微调

### 消息文本优化
- **Line 364**: `is_answered=true` 消息改为更友好的措辞
  - **Before**: "Your answer is helpful."
  - **After**: "Thanks for the feedback."

