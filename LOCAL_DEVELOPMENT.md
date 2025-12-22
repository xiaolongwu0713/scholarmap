# 🛠️ 本地开发环境指南

## 📋 前提条件

- ✅ Conda 环境 `maker` 已激活
- ✅ PostgreSQL 数据库连接信息已配置在 `.env` 文件中
- ✅ Node.js 和 npm 已安装

## 🚀 快速启动

### 1. 启动 Backend（终端 1）

```bash
cd backend
./start_local.sh
```

或者手动启动：
```bash
conda activate maker
cd backend
python -m app.db.init_db  # 首次运行或数据库结构变化时
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Backend 将在**：http://localhost:8000
**API 文档**：http://localhost:8000/docs

### 2. 启动 Frontend（终端 2）

```bash
cd frontend
./start_local.sh
```

或者手动启动：
```bash
cd frontend
npm run dev
```

**Frontend 将在**：http://localhost:3000

## 🔍 验证环境

### 检查 Backend

1. **健康检查**：
   ```bash
   curl http://localhost:8000/healthz
   ```
   应该返回：`{"status":"ok"}`

2. **API 文档**：
   打开浏览器访问：http://localhost:8000/docs

3. **测试创建项目**：
   ```bash
   curl -X POST http://localhost:8000/api/projects \
     -H "Content-Type: application/json" \
     -d '{"name":"Test Project"}'
   ```

### 检查 Frontend

1. **访问首页**：http://localhost:3000
2. **检查控制台**：打开浏览器开发者工具（F12），应该没有错误
3. **测试创建项目**：在页面上创建一个测试项目

## 🐛 调试 Aggregated 结果问题

### 步骤 1: 重现问题

1. 在 Frontend 创建一个项目
2. 创建一个运行
3. 输入研究描述
4. 点击 "Parse & Generate Framework"
5. 点击 "Build Database Queries"
6. 点击 "Execute Query"
7. 检查 Aggregated 标签是否显示结果

### 步骤 2: 检查后端数据

在浏览器控制台（F12）运行：

```javascript
// 替换为你的实际 project_id 和 run_id
const projectId = 'YOUR_PROJECT_ID';
const runId = 'YOUR_RUN_ID';

// 检查 aggregated 数据
fetch(`http://localhost:8000/api/projects/${projectId}/runs/${runId}/files/results_aggregated.json`)
  .then(r => r.json())
  .then(data => {
    console.log('Aggregated data:', data);
    console.log('Items:', data.data?.items);
    console.log('Items count:', data.data?.items?.length);
  })
  .catch(console.error);

// 检查完整的 results.json
fetch(`http://localhost:8000/api/projects/${projectId}/runs/${runId}/files/results.json`)
  .then(r => r.json())
  .then(data => {
    console.log('Full results:', data);
    console.log('Has aggregated?', !!data.data?.aggregated);
  })
  .catch(console.error);
```

### 步骤 3: 检查数据库

在 Backend 终端中运行 Python 调试脚本：

```python
# 在 backend 目录下创建临时调试脚本
python << EOF
import asyncio
from app.db.connection import db_manager
from app.core.config import settings
from app.db.repository import RunRepository

async def check_data():
    db_manager.initialize(settings.database_url)
    async with db_manager.session() as session:
        repo = RunRepository(session)
        # 替换为你的 run_id
        run = await repo.get_run('YOUR_RUN_ID')
        if run:
            print("Run found!")
            print("Results keys:", list((run.results or {}).keys()))
            if run.results:
                aggregated = run.results.get('aggregated')
                if aggregated:
                    print("Aggregated items count:", aggregated.get('count', 0))
                    print("Aggregated items:", len(aggregated.get('items', [])))
                else:
                    print("No aggregated key in results")
        else:
            print("Run not found")

asyncio.run(check_data())
EOF
```

## 🔧 常见问题

### 问题 1: 数据库连接失败

**错误**：`DATABASE_URL not configured` 或连接错误

**解决**：
1. 检查 `.env` 文件中的 `DATABASE_URL`
2. 确保使用 External Database URL（不是 Internal）
3. 格式应该是：`postgresql://user:password@host:port/database`

### 问题 2: Frontend 无法连接 Backend

**错误**：`Failed to fetch` 或 CORS 错误

**解决**：
1. 确认 Backend 正在运行（http://localhost:8000/healthz）
2. 检查 Frontend `.env.local` 中的 `NEXT_PUBLIC_API_URL`
3. 确保 Backend CORS 配置允许 `http://localhost:3000`

### 问题 3: 模块导入错误

**错误**：`Module not found` 或导入错误

**解决**：
1. Backend: 确保在 `backend` 目录下运行，conda 环境已激活
2. Frontend: 运行 `npm install` 安装依赖

### 问题 4: 数据库表不存在

**错误**：`relation "projects" does not exist`

**解决**：
```bash
cd backend
conda activate maker
python -m app.db.init_db
```

## 📝 开发工作流

1. **修改代码** → 保存文件
2. **Backend 自动重载**（如果使用 `--reload`）
3. **Frontend 自动重载**（Next.js 开发模式）
4. **测试功能** → 发现问题
5. **调试修复** → 重复步骤 1-4
6. **确认无误后提交**：
   ```bash
   git add .
   git commit -m "Fix: ..."
   git push origin main
   ```

## 🎯 当前调试任务

**问题**：Aggregated 结果为空，但 PubMed 有 105 条结果

**调试重点**：
1. 检查 `step_retrieve()` 是否正确写入 `results_aggregated.json`
2. 检查 `DatabaseStore.write_run_file()` 是否正确存储数据
3. 检查 `DatabaseStore.read_run_file()` 是否正确读取数据
4. 检查前端 `loadResults()` 是否正确处理数据

**预期结果**：
- PubMed: 105 条 ✅
- Aggregated: 应该也是 105 条（因为只有 PubMed 一个源）

---

**开始调试吧！** 🚀

