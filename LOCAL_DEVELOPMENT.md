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
