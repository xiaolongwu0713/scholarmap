# 用户配额管理系统

## 📋 概述

用户配额管理系统用于控制不同等级用户的资源使用限制，包括：
- 可创建的 Project 数量
- 每个 Project 可创建的 Run 数量
- 每个 Run 可处理的 Paper 数量（预留）
- 每天可执行的 Ingestion 次数（预留）

---

## 👥 用户等级定义

### 当前实施的用户等级

| 用户等级 | 说明 | 识别方式 | Projects 限制 | Runs 限制 |
|---------|------|---------|-------------|----------|
| **super_user** | 超级管理员 | Email 匹配 `super_user_email` | 无限制 | 无限制 |
| **regular_user** | 普通注册用户 | 默认等级 | 10 | 20/project |

### 预留的用户等级（未来实施）

| 用户等级 | 说明 | Projects 限制 | Runs 限制 |
|---------|------|-------------|----------|
| **premium_user** | 付费订阅用户 | 50 | 100/project |
| **free_user** | 免费套餐用户 | 3 | 5/project |

---

## ⚙️ 配置说明

### 配置文件：`config.py`

```python
# 用户配额配置
USER_QUOTAS: dict[str, dict[str, int]] = {
    "super_user": {
        "max_projects": -1,              # -1 = 无限制
        "max_runs_per_project": -1,      # -1 = 无限制
        "max_papers_per_run": -1,        # 预留
        "max_ingestion_per_day": -1,     # 预留
    },
    "regular_user": {
        "max_projects": 10,
        "max_runs_per_project": 20,
        "max_papers_per_run": 1000,      # 预留
        "max_ingestion_per_day": 5,      # 预留
    },
    # ... 其他等级
}

# 新用户默认等级
default_user_tier: str = "regular_user"
```

### 配额项说明

| 配额名称 | 说明 | 特殊值 |
|---------|------|-------|
| `max_projects` | 用户可创建的最大 Project 数量 | -1 = 无限制 |
| `max_runs_per_project` | 每个 Project 可创建的最大 Run 数量 | -1 = 无限制 |
| `max_papers_per_run` | 每个 Run 可处理的最大 Paper 数量 | -1 = 无限制 |
| `max_ingestion_per_day` | 每天可执行的最大 Ingestion 次数 | -1 = 无限制 |

---

## 🔧 API 集成指南

### 1. 在创建 Project 时检查配额

**位置**: `backend/app/main.py` - `create_project` 端点

```python
from app.quota import check_can_create_project
from app.db.repository import ProjectRepository

@app.post("/api/projects")
async def create_project(request: Request, req: CreateProjectRequest) -> dict:
    user_id = request.state.user_id
    
    # 获取用户 email
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        if not user:
            raise HTTPException(404, "User not found")
        
        # 检查配额
        project_repo = ProjectRepository(session)
        current_project_count = await project_repo.count_user_projects(user_id)
        
        can_create, error_msg = await check_can_create_project(
            user.email, 
            current_project_count
        )
        
        if not can_create:
            raise HTTPException(403, error_msg)
        
        # 创建项目
        project = await store.create_project(user_id, req.name)
        return {"project": project.__dict__}
```

### 2. 在创建 Run 时检查配额

**位置**: `backend/app/main.py` - `create_run` 端点

```python
from app.quota import check_can_create_run

@app.post("/api/projects/{project_id}/runs")
async def create_run(request: Request, project_id: str, req: CreateRunRequest) -> dict:
    user_id = request.state.user_id
    
    # 获取用户 email
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        
        # 检查配额
        run_repo = RunRepository(session)
        current_run_count = await run_repo.count_project_runs(project_id)
        
        can_create, error_msg = await check_can_create_run(
            user.email,
            project_id,
            current_run_count
        )
        
        if not can_create:
            raise HTTPException(403, error_msg)
        
        # 创建 Run
        run = await store.create_run(project_id, req.research_description)
        return {"run": run.__dict__}
```

### 3. 获取用户配额信息（可选）

添加新的 API 端点返回用户的配额信息：

```python
from app.quota import get_user_quota_summary

@app.get("/api/user/quota")
async def get_user_quota(request: Request) -> dict:
    """Get current user's quota information."""
    user_id = request.state.user_id
    
    async with db_manager.session() as session:
        user_repo = UserRepository(session)
        user = await user_repo.get_user_by_id(user_id)
        
        # 获取当前使用情况
        project_repo = ProjectRepository(session)
        run_repo = RunRepository(session)
        
        projects = await project_repo.list_user_projects(user_id)
        total_runs = 0
        for project in projects:
            runs = await run_repo.count_project_runs(project.project_id)
            total_runs += runs
        
        current_counts = {
            "projects": len(projects),
            "runs": total_runs,  # 总 runs（或取最大的 project）
        }
        
        # 获取配额摘要
        quota_info = get_user_quota_summary(user.email, current_counts)
        
        return quota_info
```

---

## 📊 数据库扩展（未来）

### 为用户添加订阅等级字段

当实施付费订阅系统时，需要在 `users` 表添加字段：

```sql
-- 添加订阅相关字段
ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'regular_user';
ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;

-- 创建索引
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
```

### 更新 User 模型

```python
# backend/app/db/models.py
class User(Base):
    __tablename__ = "users"
    
    user_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    # ... 现有字段
    
    # 订阅相关字段
    subscription_tier: Mapped[str] = mapped_column(
        String(50), 
        default="regular_user", 
        nullable=False
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), 
        nullable=True
    )
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
```

### 更新 `get_user_tier` 函数

```python
# backend/app/quota.py
async def get_user_tier_from_db(user: User) -> str:
    """
    Get user tier from database (future implementation).
    """
    from datetime import datetime, timezone
    
    # Check if super user
    settings = config.settings
    if user.email == settings.super_user_email:
        return "super_user"
    
    # Check subscription status
    if user.subscription_tier == "premium_user":
        # Check if subscription is still valid
        if user.subscription_expires_at:
            if user.subscription_expires_at > datetime.now(timezone.utc):
                return "premium_user"
            else:
                # Subscription expired, downgrade to regular
                return "regular_user"
        return "premium_user"
    
    if user.subscription_tier == "free_user":
        return "free_user"
    
    # Default to regular user
    return "regular_user"
```

---

## 🎨 前端集成

### 显示配额信息

在前端显示用户的配额使用情况：

```typescript
// frontend/src/lib/api.ts
export async function getUserQuota(): Promise<QuotaInfo> {
  const res = await fetch(`${baseUrl}/api/user/quota`, {
    cache: "no-store",
    headers: getDefaultHeaders(),
  });
  await throwIfNotOk(res, "getUserQuota");
  return await res.json();
}

// 类型定义
export type QuotaInfo = {
  tier: string;
  quotas: {
    max_projects: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
    max_runs_per_project: {
      limit: number;
      current: number;
      remaining: number;
      unlimited: boolean;
    };
  };
};
```

### 在 UI 中显示配额

```tsx
// frontend/src/components/QuotaDisplay.tsx
export function QuotaDisplay({ quota }: { quota: QuotaInfo }) {
  return (
    <div className="quota-info">
      <h3>Your Account: {quota.tier}</h3>
      
      <div className="quota-item">
        <span>Projects:</span>
        {quota.quotas.max_projects.unlimited ? (
          <span>Unlimited</span>
        ) : (
          <span>
            {quota.quotas.max_projects.current} / {quota.quotas.max_projects.limit}
            ({quota.quotas.max_projects.remaining} remaining)
          </span>
        )}
      </div>
      
      <div className="quota-item">
        <span>Runs per Project:</span>
        {quota.quotas.max_runs_per_project.unlimited ? (
          <span>Unlimited</span>
        ) : (
          <span>
            Up to {quota.quotas.max_runs_per_project.limit} runs
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 升级到付费用户流程（未来）

### 1. 添加支付集成
- 集成 Stripe / PayPal / 支付宝等支付网关
- 创建订阅计划（月付/年付）

### 2. 订阅管理 API
```python
@app.post("/api/user/subscribe")
async def subscribe_to_premium(request: Request, plan: str) -> dict:
    """Upgrade user to premium tier."""
    # 1. 处理支付
    # 2. 更新用户订阅等级
    # 3. 设置过期时间
    # 4. 返回确认
    pass

@app.post("/api/user/cancel-subscription")
async def cancel_subscription(request: Request) -> dict:
    """Cancel premium subscription."""
    # 1. 取消自动续费
    # 2. 保持权益到期末
    # 3. 到期后自动降级
    pass
```

### 3. 定期任务检查订阅状态
```python
# 每天检查过期的订阅
async def check_expired_subscriptions():
    """Downgrade users with expired subscriptions."""
    from datetime import datetime, timezone
    
    async with db_manager.session() as session:
        # 查找过期的 premium 用户
        result = await session.execute(
            select(User).where(
                User.subscription_tier == "premium_user",
                User.subscription_expires_at < datetime.now(timezone.utc)
            )
        )
        expired_users = result.scalars().all()
        
        # 降级到 regular_user
        for user in expired_users:
            user.subscription_tier = "regular_user"
            user.is_premium = False
        
        await session.commit()
```

---

## 🚨 错误处理

### 配额超限错误响应

当用户超出配额时，API 返回 403 状态码和错误消息：

```json
{
  "detail": "You have reached the maximum number of projects allowed for your account tier."
}
```

### 前端错误处理

```typescript
try {
  await createProject(name);
} catch (error) {
  if (error.message.includes("maximum number of projects")) {
    // 显示升级提示
    showUpgradePrompt("You've reached your project limit. Upgrade to create more!");
  }
}
```

---

## 📈 监控和统计

### 配额使用统计

定期统计各等级用户的配额使用情况：

```sql
-- 统计各等级用户数量
SELECT 
    subscription_tier,
    COUNT(*) as user_count
FROM users
GROUP BY subscription_tier;

-- 统计接近配额限制的用户
SELECT 
    u.email,
    u.subscription_tier,
    COUNT(p.project_id) as project_count
FROM users u
LEFT JOIN projects p ON u.user_id = p.user_id
GROUP BY u.email, u.subscription_tier
HAVING COUNT(p.project_id) >= 8;  -- 接近 regular_user 的 10 个限制
```

---

## ✅ 测试

### 单元测试示例

```python
# tests/test_quota.py
import pytest
from app.quota import get_user_tier, check_quota, get_remaining_quota

def test_super_user_unlimited():
    """Test that super user has unlimited quotas."""
    tier = get_user_tier("xiaolongwu0713@gmail.com")
    assert tier == "super_user"
    
    can_create, _ = check_quota("xiaolongwu0713@gmail.com", "max_projects", 1000)
    assert can_create is True

def test_regular_user_quota():
    """Test regular user quota limits."""
    tier = get_user_tier("regular@example.com")
    assert tier == "regular_user"
    
    # Under quota
    can_create, _ = check_quota("regular@example.com", "max_projects", 5)
    assert can_create is True
    
    # At quota limit
    can_create, msg = check_quota("regular@example.com", "max_projects", 10)
    assert can_create is False
    assert "maximum" in msg.lower()

def test_remaining_quota():
    """Test remaining quota calculation."""
    remaining = get_remaining_quota("regular@example.com", "max_projects", 7)
    assert remaining == 3  # 10 - 7 = 3
    
    remaining_super = get_remaining_quota("xiaolongwu0713@gmail.com", "max_projects", 1000)
    assert remaining_super == -1  # Unlimited
```

---

## 📝 总结

### 当前实施状态

✅ **已完成**:
- 配额配置系统（`config.py`）
- 配额管理工具（`app/quota.py`）
- Super user 和 Regular user 区分
- 完整的使用文档

⏳ **待实施**:
- 在 API 端点集成配额检查
- Repository 层添加计数方法
- 前端显示配额信息
- 用户升级/降级流程

🔮 **未来扩展**:
- 数据库添加订阅字段
- 付费订阅系统
- Free tier 实施
- 配额使用统计和监控

### 实施优先级

1. **高优先级**（立即实施）:
   - 在 `create_project` 和 `create_run` API 添加配额检查
   - 添加 Repository 计数方法

2. **中优先级**（近期）:
   - 前端显示配额信息
   - 添加 `/api/user/quota` 端点

3. **低优先级**（长期）:
   - 付费订阅系统
   - 自动降级机制
   - 配额统计分析

---

## 🔗 相关文档

- `config.py` - 配额配置
- `backend/app/quota.py` - 配额管理模块
- `backend/app/db/models.py` - 数据模型（未来需要扩展）
- `backend/app/main.py` - API 端点（需要集成配额检查）
