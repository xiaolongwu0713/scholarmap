# 配额功能测试清单

## ✅ 测试场景

### 1. 配额显示测试
- [ ] 登录普通用户后，主页显示配额面板
- [ ] 配额面板显示用户等级（Regular User）
- [ ] 配额面板显示Projects限制（X / 10）
- [ ] 配额面板显示Runs限制（X / 20）
- [ ] 配额面板显示Papers限制（1,000）
- [ ] 进度条颜色正确（0-70%绿色，70-90%橙色，90-100%红色）

### 2. Project配额限制测试
- [ ] 当前projects < 10时，可以创建新project
- [ ] 创建project后，配额面板立即更新（刷新页面后）
- [ ] 当projects = 10时，尝试创建第11个project
- [ ] 应该显示错误：
  ```
  "You have reached the maximum number of projects allowed for your account tier."
  ```
- [ ] HTTP状态码应该是 403 Forbidden

### 3. Run配额限制测试
- [ ] 在一个project中，当runs < 20时，可以创建新run
- [ ] 创建run后，配额面板更新（刷新页面后）
- [ ] 当runs = 20时，尝试创建第21个run
- [ ] 应该显示错误：
  ```
  "You have reached the maximum number of runs allowed for this project."
  ```
- [ ] HTTP状态码应该是 403 Forbidden

### 4. Paper配额测试（警告模式）
- [ ] 执行query检索，返回>1000篇论文
- [ ] 查询应该成功执行（不被阻塞）
- [ ] 检查返回结果是否包含 `quota_warning` 字段
- [ ] 后端日志应该记录警告信息

### 5. Super User豁免测试
- [ ] 以super user登录（xiaolongwu0713@gmail.com）
- [ ] 主页**不显示**配额面板
- [ ] 主页显示"系统资源监控"面板（绿色边框）
- [ ] 可以创建unlimited projects
- [ ] 可以创建unlimited runs

### 6. 配额API测试
打开浏览器控制台，执行：
```javascript
fetch('http://localhost:8000/api/user/quota', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
```

预期返回：
```json
{
  "tier": "regular_user",
  "quotas": {
    "max_projects": {
      "limit": 10,
      "current": 3,
      "remaining": 7,
      "unlimited": false
    },
    "max_runs_per_project": {
      "limit": 20,
      "current": 5,
      "remaining": 15,
      "unlimited": false
    },
    ...
  }
}
```

---

## 🐛 常见问题排查

### 配额面板不显示
1. 确认已登录（不是super user）
2. 清除浏览器缓存
3. 硬刷新页面（Cmd+Shift+R / Ctrl+Shift+R）
4. 检查浏览器控制台是否有错误

### 创建project/run时无限制
1. 检查是否以super user登录
2. 检查后端日志确认配额检查是否执行
3. 检查 `config.py` 中的配额配置

### API返回401错误
1. 确认已登录
2. 检查localStorage中的token是否存在
3. 重新登录获取新token

---

## 📊 测试数据记录

### 当前配额使用情况
- Projects创建数：_____
- 单个project中的runs数：_____
- 单次查询的papers数：_____

### 错误消息验证
- Project超限错误：✅ / ❌
- Run超限错误：✅ / ❌
- Paper超限警告：✅ / ❌

### UI/UX验证
- 配额面板显示：✅ / ❌
- 进度条颜色：✅ / ❌
- 错误提示友好：✅ / ❌
- Super user豁免：✅ / ❌

---

## 🔧 调试命令

### 查看后端日志
```bash
tail -f /Users/xiaowu/local_code/scholarmap/backend/log.txt | grep -i quota
```

### 检查数据库中的项目数
```python
# 在Python中执行
import asyncio
from app.db.connection import db_manager
from app.db.repository import ProjectRepository

async def check_projects(user_id):
    async with db_manager.session() as session:
        repo = ProjectRepository(session)
        count = await repo.count_user_projects(user_id)
        print(f"User {user_id} has {count} projects")

# 执行
asyncio.run(check_projects("YOUR_USER_ID"))
```

### 手动测试配额检查
```python
from app.quota import check_quota

# 测试project配额
can_create, msg = check_quota("user@example.com", "max_projects", 10)
print(f"Can create: {can_create}, Message: {msg}")
```
