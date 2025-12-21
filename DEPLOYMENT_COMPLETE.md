# ✅ Render 部署准备完成

## 已完成的工作

### 1. 数据库层完全迁移 ✅
- ✅ PostgreSQL 数据库模型（Projects, Runs, Papers, Authorship, Caches）
- ✅ 异步数据库连接和会话管理
- ✅ 数据仓库层（Repository pattern）
- ✅ 数据服务层（兼容原有 FileStore 接口）
- ✅ 数据库初始化脚本

### 2. Phase 1 完全迁移 ✅
- ✅ 所有项目/运行管理 API 改为异步+PostgreSQL
- ✅ 数据从文件系统迁移到数据库（JSON 字段存储）
- ✅ 保持与前端的兼容性

### 3. Phase 2 完全迁移 ✅
- ✅ `PostgresIngestionPipeline` - 异步 PubMed 数据摄取
- ✅ `PostgresMapAggregator` - 异步地图聚合查询
- ✅ `PostgresGeocoder` - 异步地理编码+数据库缓存
- ✅ 所有 Phase 2 API 端点更新

### 4. 配置文件 ✅
- ✅ `render.yaml` - Render 服务配置
- ✅ `.env.render.example` - 环境变量模板
- ✅ `test_db_connection.py` - 数据库连接测试脚本

## 部署步骤

### 前提条件
- [x] GitHub 仓库已创建
- [x] Render 账号已创建
- [x] Render PostgreSQL 数据库已创建

### 方案 A: 使用 render.yaml 自动部署（推荐）

#### 1. 推送代码到 GitHub
```bash
cd /path/to/ScholarMap
git add .
git commit -m "Complete PostgreSQL migration for Render deployment"
git push origin main
```

#### 2. 在 Render 创建 Blueprint
1. 登录 Render Dashboard
2. 点击 "New +" → "Blueprint"
3. 连接 GitHub 仓库
4. Render 会自动检测 `render.yaml`
5. 点击 "Apply"

#### 3. 配置环境变量
在 Backend Service 的 Environment 标签添加：
```bash
OPENAI_API_KEY=sk-xxx
PUBMED_API_KEY=  # 可选
SEMANTIC_SCHOLAR_API_KEY=  # 可选
OPENALEX_MAILTO=your-email@example.com
```

在 Frontend Service 的 Environment 标签添加：
```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx
```

**注意**: `DATABASE_URL` 会自动从 PostgreSQL 服务注入，不需要手动配置。

#### 4. 触发部署
- Backend 和 Frontend 服务会自动部署
- 首次部署会自动初始化数据库 schema

### 方案 B: 手动创建服务

#### 1. 创建 Backend Web Service
- **Name**: `scholarmap-backend`
- **Runtime**: Python
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `cd backend && python -m app.db.init_db && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Root Directory**: 留空
- **Environment Variables**: 同方案 A
- **Database**: Link 到已创建的 `scholarmap-db`

#### 2. 创建 Frontend Web Service
- **Name**: `scholarmap-frontend`
- **Runtime**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Root Directory**: `frontend`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=https://scholarmap-backend.onrender.com`
  - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx`
  - `NODE_ENV=production`

## 测试步骤

### 1. 本地测试数据库连接（可选）
如果你想在部署前本地测试 PostgreSQL 连接：

```bash
cd backend

# 设置环境变量
export DATABASE_URL="postgresql://scholarmap_db_user:eA7MfK5KbhHmwORToRe27Xa1ZHkXGRDM@dpg-d5408om3jp1c738ud660-a.virginia-postgres.render.com/scholarmap_db"

# 运行测试
python test_db_connection.py
```

### 2. 部署后测试

#### Backend Health Check
```bash
curl https://scholarmap-backend.onrender.com/healthz
# 应该返回: {"status":"ok"}
```

#### 创建测试项目
```bash
curl -X POST https://scholarmap-backend.onrender.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'
```

#### 列出项目
```bash
curl https://scholarmap-backend.onrender.com/api/projects
```

### 3. 前端测试
访问 `https://scholarmap-frontend.onrender.com`，应该能够：
- 创建项目
- 创建运行
- 执行 Phase 1 流程
- 执行 Phase 2 ingestion
- 查看地图可视化

## 关键变更总结

### 数据存储
- **之前**: 文件系统（JSON 文件）+ SQLite
- **现在**: 完全 PostgreSQL

### API 风格
- **之前**: 同步 API + 文件读写
- **现在**: 异步 API + 数据库操作

### 数据库模式
```
projects (project_id, name, created_at)
runs (run_id, project_id, description, understanding, keywords, queries, results, retrieval_framework)
papers (pmid, year, title, doi, xml_stored)
authorship (id, pmid, author_order, author_name_raw, ..., country, city, institution)
run_papers (run_id, pmid)
affiliation_cache (affiliation_raw, country, city, institution, confidence)
geocoding_cache (location_key, latitude, longitude)
```

## 重要提示

### 数据持久化
✅ **所有数据存储在 PostgreSQL 中**
- 项目和运行元数据
- Phase 1 分析结果（JSON 字段）
- Phase 2 作者和机构数据
- 缓存数据（LLM 提取、地理编码）

### 性能优化
- ✅ 数据库连接池（10 connections + 20 overflow）
- ✅ LLM 调用缓存（避免重复提取）
- ✅ 地理编码缓存（避免重复 API 调用）
- ✅ 异步操作（并发处理）

### 成本考虑
- **PostgreSQL Starter**: $7/月（推荐，数据持久化）
- **Backend Web Service**: 根据计划
- **Frontend Web Service**: 根据计划
- **Free Tier 限制**: 数据库会在 90 天后过期

## 故障排查

### 问题 1: 数据库连接失败
**症状**: `DATABASE_URL not configured` 或连接超时

**解决**:
1. 检查 Backend 服务是否 Link 了 PostgreSQL
2. 在 Environment 中确认 `DATABASE_URL` 变量存在
3. 检查数据库服务状态

### 问题 2: 前端无法连接后端
**症状**: API 调用失败，CORS 错误

**解决**:
1. 确认 `NEXT_PUBLIC_API_URL` 设置正确
2. 确认 Backend URL 格式：`https://your-backend.onrender.com`（不带尾部斜杠）
3. 检查 Backend 健康状态：`/healthz` 端点

### 问题 3: 数据库 Schema 未初始化
**症状**: `relation "projects" does not exist`

**解决**:
```bash
# 在 Render Shell 中运行
cd backend
python -m app.db.init_db
```

### 问题 4: 服务启动缓慢
**症状**: 首次请求需要很长时间

**原因**: Render Free Tier 在闲置后会休眠服务

**解决**: 升级到付费计划或使用 uptime monitor

## 下一步

### 生产环境优化（可选）
- [ ] 添加 Alembic 数据库迁移
- [ ] 实现 API 认证（JWT）
- [ ] 添加 rate limiting
- [ ] 设置 Sentry 错误跟踪
- [ ] 配置 CDN（静态资源）
- [ ] 添加数据库备份策略

### 功能增强
- [ ] 实现 author disambiguation
- [ ] 添加更多数据源（Semantic Scholar, OpenAlex）
- [ ] 实现高级搜索过滤器
- [ ] 添加导出功能（CSV, Excel）

## 支持
如有问题，请检查：
- Render Logs (每个服务的 Logs 标签)
- Database Logs
- 本文档的故障排查部分

---

**部署完成！祝使用愉快！** 🎉

