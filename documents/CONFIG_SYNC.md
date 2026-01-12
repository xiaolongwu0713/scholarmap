# Frontend-Backend Configuration Synchronization

## 概述

前端配置现在从后端 API 动态读取，确保前后端始终使用相同的限制值。这消除了配置不一致的风险，并实现了单一数据源（Single Source of Truth）原则。

## 架构

```
┌─────────────────────┐
│ Backend             │
│ guardrail_config.py │ ← Single Source of Truth
│                     │
│ - PARSE_STAGE1_MAX  │
│ - PARSE_STAGE2_MAX  │
│ - TEXT_VALIDATION   │
│ - FRAMEWORK_ADJUST  │
└──────────┬──────────┘
           │
           │ /api/config (public endpoint)
           │
           ▼
┌─────────────────────┐
│ Frontend            │
│ parseConfig.ts      │
│                     │
│ getConfig()         │ ← Fetches from API
│ - Caching           │
│ - Fallback defaults │
└─────────────────────┘
```

## 实现细节

### 1. 后端 API 端点

**位置**: `backend/app/main.py`

```python
@app.get("/api/config")
def get_frontend_config() -> dict:
    """
    Get frontend configuration constants from backend.
    This ensures frontend and backend always use the same limits.
    Public endpoint - no authentication required.
    """
    from app.guardrail_config import (
        TEXT_VALIDATION_MAX_ATTEMPTS,
        PARSE_STAGE1_MAX_ATTEMPTS,
        PARSE_STAGE2_MAX_TOTAL_ATTEMPTS,
        PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL,
        RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS,
    )
    
    return {
        "text_validation_max_attempts": TEXT_VALIDATION_MAX_ATTEMPTS,
        "parse_stage1_max_attempts": PARSE_STAGE1_MAX_ATTEMPTS,
        "parse_stage2_max_total_attempts": PARSE_STAGE2_MAX_TOTAL_ATTEMPTS,
        "parse_stage2_max_consecutive_unhelpful": PARSE_STAGE2_MAX_CONSECUTIVE_UNHELPFUL,
        "retrieval_framework_adjust_max_attempts": RETRIEVAL_FRAMEWORK_ADJUST_MAX_ATTEMPTS,
    }
```

**特点**:
- ✅ 公开端点（无需认证）
- ✅ 直接从 `guardrail_config.py` 导入
- ✅ 返回 JSON 格式配置

### 2. 前端配置管理器

**位置**: `frontend/src/lib/parseConfig.ts`

```typescript
import { getFrontendConfig, type FrontendConfig } from "./api";

let configCache: FrontendConfig | null = null;
let configPromise: Promise<FrontendConfig> | null = null;

export async function getConfig(): Promise<FrontendConfig> {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  // If a request is already in progress, wait for it
  if (configPromise) {
    return configPromise;
  }

  // Fetch config from backend
  configPromise = getFrontendConfig().then((config) => {
    configCache = config;
    configPromise = null;
    return config;
  }).catch((error) => {
    console.error("Failed to load config from backend:", error);
    
    // Fallback to default values if API fails
    const fallbackConfig: FrontendConfig = {
      text_validation_max_attempts: 3,
      parse_stage1_max_attempts: 2,
      parse_stage2_max_total_attempts: 3,
      parse_stage2_max_consecutive_unhelpful: 2,
      retrieval_framework_adjust_max_attempts: 2,
    };
    
    configCache = fallbackConfig;
    return fallbackConfig;
  });

  return configPromise;
}
```

**特点**:
- ✅ 缓存机制（避免重复 API 调用）
- ✅ 去重请求（多个组件同时请求时只发一次）
- ✅ 容错机制（API 失败时使用默认值）

### 3. 前端 API 客户端

**位置**: `frontend/src/lib/api.ts`

```typescript
export interface FrontendConfig {
  text_validation_max_attempts: number;
  parse_stage1_max_attempts: number;
  parse_stage2_max_total_attempts: number;
  parse_stage2_max_consecutive_unhelpful: number;
  retrieval_framework_adjust_max_attempts: number;
}

export async function getFrontendConfig(): Promise<FrontendConfig> {
  const res = await fetch(`${baseUrl}/api/config`);
  await throwIfNotOk(res, "getFrontendConfig");
  return await res.json();
}
```

### 4. 前端页面组件

**位置**: `frontend/src/app/projects/[projectId]/runs/[runId]/page.tsx`

```typescript
import { getConfig, type FrontendConfig } from "@/lib/parseConfig";

function RunDetailsPage({ params }: { params: { projectId: string; runId: string } }) {
  // Load configuration from backend (with fallback defaults)
  const [config, setConfig] = useState<FrontendConfig>({
    text_validation_max_attempts: 3,
    parse_stage1_max_attempts: 2,
    parse_stage2_max_total_attempts: 3,
    parse_stage2_max_consecutive_unhelpful: 2,
    retrieval_framework_adjust_max_attempts: 2,
  });
  
  // Load configuration from backend on mount
  useEffect(() => {
    getConfig().then(setConfig).catch((e) => {
      console.error("Failed to load config:", e);
      // Config will fallback to defaults
    });
  }, []);
  
  // Use config values throughout the component
  if (parseStage1Attempts >= config.parse_stage1_max_attempts) {
    // ...
  }
}
```

**特点**:
- ✅ 组件挂载时自动加载配置
- ✅ 使用状态管理配置值
- ✅ 默认值确保即使加载失败也能正常运行

## 配置同步状态

| 配置项 | 后端值 | 前端默认值 | 状态 |
|--------|--------|-----------|------|
| `parse_stage1_max_attempts` | 2 | 2 | ✅ 同步 |
| `parse_stage2_max_total_attempts` | 3 | 3 | ✅ 同步 |
| `parse_stage2_max_consecutive_unhelpful` | 2 | 2 | ✅ 同步 |
| `text_validation_max_attempts` | 3 | 3 | ✅ 同步 |
| `retrieval_framework_adjust_max_attempts` | 2 | 2 | ✅ 同步 |

## 优势

### 1. 单一数据源
- ✅ 配置只在 `backend/app/guardrail_config.py` 中定义
- ✅ 前端自动使用后端值
- ✅ 消除配置不一致风险

### 2. 易于维护
- ✅ 修改配置只需改后端一处
- ✅ 无需手动同步前后端
- ✅ 减少人为错误

### 3. 动态更新
- ✅ 后端配置修改后，前端刷新即可获取最新值
- ✅ 无需重新部署前端

### 4. 向后兼容
- ✅ API 失败时使用默认值
- ✅ 不影响现有功能
- ✅ 渐进式增强

## 测试

### 1. 测试 API 端点

```bash
curl http://localhost:8000/api/config
```

**预期输出**:
```json
{
  "text_validation_max_attempts": 3,
  "parse_stage1_max_attempts": 2,
  "parse_stage2_max_total_attempts": 3,
  "parse_stage2_max_consecutive_unhelpful": 2,
  "retrieval_framework_adjust_max_attempts": 2
}
```

### 2. 测试前端加载

1. 打开浏览器开发者工具（Network 标签）
2. 访问任何 run 详情页
3. 查看是否发起了 `/api/config` 请求
4. 验证响应数据是否正确

### 3. 测试缓存机制

1. 刷新页面
2. 检查 `/api/config` 只被调用一次
3. 后续页面访问不再发起请求（使用缓存）

### 4. 测试容错机制

1. 停止后端服务
2. 刷新前端页面
3. 验证前端使用默认值，不崩溃
4. 检查控制台是否有错误日志

### 5. 测试配置更新

1. 修改 `backend/app/guardrail_config.py` 中的值
   ```python
   PARSE_STAGE1_MAX_ATTEMPTS = 5  # 改为 5
   ```

2. 重启后端
   ```bash
   cd backend
   ./start_local.sh
   ```

3. 清除前端缓存（硬刷新：Cmd+Shift+R）

4. 验证前端显示新的限制值（5）

## 未来扩展

### 可以添加的配置项

1. **UI 配置**
   - 主题颜色
   - 布局设置
   - 默认语言

2. **功能开关**
   - 实验性功能
   - A/B 测试
   - 区域限制

3. **性能参数**
   - 请求超时
   - 重试次数
   - 缓存时长

### 示例：添加新配置项

**后端** (`guardrail_config.py`):
```python
# New config
MAX_CONCURRENT_REQUESTS = 5
```

**后端** (`main.py`):
```python
@app.get("/api/config")
def get_frontend_config() -> dict:
    return {
        # ... existing configs
        "max_concurrent_requests": MAX_CONCURRENT_REQUESTS,  # Add new config
    }
```

**前端** (`api.ts`):
```typescript
export interface FrontendConfig {
  // ... existing fields
  max_concurrent_requests: number;  // Add new field
}
```

**前端** (`parseConfig.ts`):
```typescript
const fallbackConfig: FrontendConfig = {
  // ... existing defaults
  max_concurrent_requests: 5,  // Add default value
};
```

## 故障排查

### 问题 1: 前端显示的限制值不正确

**原因**: 缓存未清除

**解决方案**:
```typescript
import { clearConfigCache } from "@/lib/parseConfig";
clearConfigCache();  // Clear cache manually
```

### 问题 2: API 请求失败

**原因**: CORS 或网络问题

**解决方案**:
1. 检查后端是否运行
2. 检查 CORS 配置
3. 查看浏览器控制台错误信息

### 问题 3: 配置修改后未生效

**原因**: 
- 后端未重启
- 前端使用缓存

**解决方案**:
1. 重启后端服务
2. 硬刷新前端（Cmd+Shift+R）
3. 或清除浏览器缓存

## 总结

通过这个改进，我们实现了：

✅ **单一数据源**: 配置只在后端定义
✅ **自动同步**: 前端动态读取后端配置
✅ **容错机制**: API 失败时使用默认值
✅ **缓存优化**: 避免重复 API 调用
✅ **易于维护**: 修改配置只需改一处

这确保了前后端配置的一致性，减少了维护成本和人为错误。
