# 🚀 Render 部署清单

## 准备阶段 ✅

- [x] PostgreSQL 数据库已创建
  - Database: `scholarmap_db`
  - User: `scholarmap_db_user`
  - Internal URL: `postgresql://scholarmap_db_user:xxx@dpg-xxx-a/scholarmap_db`

- [x] 代码迁移完成
  - [x] PostgreSQL 数据库层
  - [x] Phase 1 API 异步化
  - [x] Phase 2 API 异步化
  - [x] 配置文件创建

## 部署前检查

### 1. 环境变量准备 ⚠️

#### Backend 需要的环境变量：
```bash
OPENAI_API_KEY=sk-xxx                          # ⚠️ 必需
PUBMED_API_KEY=                                 # 可选
SEMANTIC_SCHOLAR_API_KEY=                       # 可选
OPENALEX_MAILTO=your-email@example.com          # 可选
OPENAI_MODEL=gpt-4                              # 默认值
OPENAI_API_BASE=https://api.openai.com          # 默认值
SCHOLARMAP_ENABLED_SOURCES=pubmed               # 默认值
```

#### Frontend 需要的环境变量：
```bash
NEXT_PUBLIC_API_URL=https://scholarmap-backend.onrender.com  # ⚠️ 更新为你的 Backend URL
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.xxx                       # ⚠️ 必需
NODE_ENV=production
```

### 2. 代码推送

```bash
# 1. 提交所有更改
git add .
git commit -m "Complete PostgreSQL migration for Render"

# 2. 推送到 GitHub
git push origin main
```

## 部署步骤

### 方案 A: 使用 render.yaml（推荐）

#### Step 1: 在 Render 创建 Blueprint
1. 登录 https://dashboard.render.com
2. 点击 "New +" → "Blueprint"
3. 选择 GitHub 仓库
4. Render 会检测到 `render.yaml`
5. 点击 "Apply"

#### Step 2: 配置环境变量
在创建服务后，为每个服务配置环境变量：

**Backend Service**:
- Environment → Add Environment Variable
- 添加上述 Backend 环境变量

**Frontend Service**:
- Environment → Add Environment Variable
- 添加上述 Frontend 环境变量
- **重要**: `NEXT_PUBLIC_API_URL` 需要使用 Backend 的实际 URL

#### Step 3: Link Database
- Backend Service → Settings → Environment
- 找到 "Link a Database" 或确认 `DATABASE_URL` 已自动注入

#### Step 4: 触发部署
- Services 会自动开始部署
- 监控 Logs 查看部署进度

### 方案 B: 手动创建服务

#### Step 1: 创建 Backend Web Service
1. 点击 "New +" → "Web Service"
2. 连接 GitHub 仓库
3. 配置：
   - **Name**: `scholarmap-backend`
   - **Runtime**: Python
   - **Root Directory**: 留空
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && python -m app.db.init_db && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment → Link Database → 选择 `scholarmap-db`
5. 添加环境变量
6. 创建 Service

#### Step 2: 创建 Frontend Web Service
1. 点击 "New +" → "Web Service"
2. 连接 GitHub 仓库
3. 配置：
   - **Name**: `scholarmap-frontend`
   - **Runtime**: Node
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. 添加环境变量（使用 Backend 的实际 URL）
5. 创建 Service

## 部署后验证

### 1. Backend 健康检查
```bash
curl https://YOUR-BACKEND-URL.onrender.com/healthz

# 预期输出: {"status":"ok"}
```

### 2. 数据库连接测试
在 Render Shell 中运行：
```bash
cd backend
python test_db_connection.py
```

### 3. 创建测试项目
```bash
curl -X POST https://YOUR-BACKEND-URL.onrender.com/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project"}'
```

### 4. 前端访问测试
访问 `https://YOUR-FRONTEND-URL.onrender.com`
- [ ] 首页加载成功
- [ ] 可以创建项目
- [ ] 可以创建运行

### 5. 完整流程测试
1. 创建新项目
2. 创建新运行
3. 输入研究描述
4. 执行 Phase 1:
   - Parse & Generate Framework
   - Build Database Queries
   - Execute Query
5. 执行 Phase 2:
   - Run Ingestion Pipeline
   - Open Interactive Map
6. 验证地图显示正常

## 常见问题

### Q1: Backend 服务启动失败
**检查**:
- Logs 中是否有 `DATABASE_URL not configured`
- 确认数据库已正确 Link
- 确认 `OPENAI_API_KEY` 已配置

### Q2: Frontend 无法连接 Backend
**检查**:
- `NEXT_PUBLIC_API_URL` 是否正确（注意 https:// 前缀）
- Backend URL 末尾不要有 `/`
- Backend 服务是否正在运行

### Q3: 数据库错误 "relation does not exist"
**解决**:
```bash
# 在 Backend Shell 中
cd backend
python -m app.db.init_db
```

### Q4: Map 不显示
**检查**:
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` 是否正确
- 浏览器控制台是否有错误
- Backend API 是否返回数据

## 性能优化建议

### 数据库
- [ ] 考虑升级到 PostgreSQL Standard 计划（更好的性能）
- [ ] 设置定期备份

### Backend
- [ ] 升级到付费计划避免休眠
- [ ] 考虑添加 Redis 缓存层

### Frontend
- [ ] 启用 CDN
- [ ] 优化图片和静态资源

## 回滚计划

如果部署出现问题：

1. **Backend 回滚**:
   - Render Dashboard → Backend Service → Settings
   - Deploy → Rollback to previous deployment

2. **Frontend 回滚**:
   - 同样操作

3. **数据库回滚**:
   - 如果数据库被破坏，使用 Render 的备份恢复功能

## 完成确认

部署成功后，请确认：

- [ ] Backend `/healthz` 返回 OK
- [ ] 可以创建项目和运行
- [ ] Phase 1 完整流程正常
- [ ] Phase 2 ingestion 正常
- [ ] 地图可视化正常
- [ ] 数据持久化正常（刷新页面后数据仍在）

---

**所有步骤完成后，你的 ScholarMap 应用就成功部署到 Render 了！** 🎉

