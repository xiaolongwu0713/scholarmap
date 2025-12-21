# Render 部署指南

## 已完成的工作 ✅

### 1. 数据库层改造
- ✅ 添加 PostgreSQL 依赖（sqlalchemy, asyncpg, psycopg2-binary, alembic）
- ✅ 创建 SQLAlchemy 数据库模型（`app/db/models.py`）
  - Project, Run, Paper, Authorship
  - RunPaper, AffiliationCache, GeocodingCache
- ✅ 创建数据库连接管理（`app/db/connection.py`）
- ✅ 创建数据仓库层（`app/db/repository.py`）
- ✅ 创建数据服务层（`app/db/service.py`）- FileStore 兼容接口

### 2. 应用改造
- ✅ 更新配置支持 `DATABASE_URL`（`app/core/config.py`）
- ✅ 添加应用生命周期管理（数据库启动/关闭）
- ✅ 创建数据库初始化脚本（`app/db/init_db.py`）
- ✅ 部分 API 端点已改为异步

### 3. Phase 2 改造
- ✅ 创建 PostgreSQL 适配器（`app/phase2/pg_database.py`）

### 4. 部署配置
- ✅ 创建 `render.yaml` 配置文件

## 待完成的工作 ⚠️

### 1. API 端点迁移（高优先级）
**位置**: `backend/app/main.py`

需要将所有剩余的 Phase 2 端点改为使用 PostgreSQL：
- `phase2_authorship_stats` (line 285)
- `phase2_ingest` (line 348)  
- `phase2_map_world` (line 390)
- `phase2_map_country` (line 429)
- `phase2_map_city` (line 472)
- `phase2_map_institution` (line 517)

### 2. Phase 2 ingestion 和 aggregations 迁移
**需要修改的文件**:
- `backend/app/phase2/ingest.py` - 使用 PostgresDatabase 替代 Database
- `backend/app/phase2/aggregations.py` - SQL 查询改为 PostgreSQL 语法
- `backend/app/phase2/geocoding.py` - 使用 PostgreSQL 缓存

### 3. 数据库初始化
在 Render 部署前，需要初始化数据库 schema：
```bash
cd backend
python -m app.db.init_db
```

### 4. 环境变量配置
在 Render Dashboard 配置以下环境变量：
- `DATABASE_URL` - 从 PostgreSQL 自动注入
- `OPENAI_API_KEY`
- `PUBMED_API_KEY` (可选)
- `SEMANTIC_SCHOLAR_API_KEY` (可选)
- `OPENALEX_MAILTO` (可选)
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (Frontend)

### 5. Phase 1 steps 适配
**需要检查**: `backend/app/phase1/steps.py`
- 确保所有 `store` 操作都使用 `await`
- 可能需要将同步函数改为异步

## 部署步骤

### 方案 A: 使用 render.yaml（推荐）
1. 将代码推送到 GitHub
2. 在 Render Dashboard: "New" → "Blueprint"
3. 连接 GitHub 仓库，选择 `render.yaml`
4. 配置环境变量
5. 部署

### 方案 B: 手动创建服务
1. **创建 PostgreSQL**（已完成）
   - 名称: `scholarmap-db`
   - 计划: Starter (数据持久化)

2. **创建 Backend Web Service**
   - Runtime: Python
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m app.db.init_db && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Link Database: `scholarmap-db`
   - 配置环境变量

3. **创建 Frontend Web Service**
   - Runtime: Node
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - 环境变量:
     - `NEXT_PUBLIC_API_URL=https://<backend-url>.onrender.com`
     - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

## 关键问题

### 1. 异步迁移未完成
许多端点仍然是同步的或混合异步/同步调用，需要全面异步化。

### 2. Phase 2 逻辑需要重构
现有的 Phase 2 代码使用 SQLite 连接对象（`conn`），需要改为使用 SQLAlchemy 会话。

### 3. SQL 语法差异
SQLite 和 PostgreSQL 的 SQL 语法有差异，特别是：
- JSON 类型处理
- 布尔类型（SQLite 用 0/1，PostgreSQL 用 TRUE/FALSE）
- 自增主键（AUTOINCREMENT vs SERIAL）

### 4. 事务管理
需要确保所有批量操作使用数据库事务。

## 下一步建议

**选项 1: 完成迁移后再部署（推荐）**
1. 完成所有 TODO 项
2. 本地测试 PostgreSQL 连接
3. 部署到 Render

**选项 2: 分步部署**
1. 先部署 Phase 1 功能（项目/运行管理）
2. 测试基本功能
3. 再迁移 Phase 2

**选项 3: 混合模式（不推荐）**
- Phase 1 使用 PostgreSQL
- Phase 2 暂时保留 SQLite（需要额外配置持久化存储）

## 测试清单

部署前需要测试：
- [ ] 数据库连接和初始化
- [ ] 项目创建和列表
- [ ] 运行创建和管理
- [ ] Phase 1 完整流程
- [ ] Phase 2 ingestion
- [ ] Phase 2 map 聚合
- [ ] 前端与后端集成

## 预估工作量

- 完成剩余迁移: 2-4 小时
- 测试和调试: 1-2 小时
- 部署和验证: 0.5-1 小时

**总计: 3.5-7 小时**

