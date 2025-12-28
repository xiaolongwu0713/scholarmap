# ScholarMap 技术堆栈总结

## 项目架构
- **架构模式**: 前后端分离 (Monorepo)
- **后端**: Python FastAPI (RESTful API)
- **前端**: Next.js (React SSR/SSG)
- **数据库**: PostgreSQL

---

## 后端技术栈

### 核心框架
- **FastAPI** (v0.115+): 现代Python Web框架，提供异步API
- **Uvicorn** (v0.30+): ASGI服务器，支持异步请求处理
- **Pydantic** (v2.7+): 数据验证和序列化
- **Pydantic Settings** (v2.4+): 配置管理

### 数据库与ORM
- **PostgreSQL**: 主数据库
- **SQLAlchemy** (v2.0+): ORM框架，支持异步操作
- **asyncpg** (v0.29+): PostgreSQL异步驱动
- **psycopg2-binary** (v2.9+): PostgreSQL同步驱动（备用）
- **Alembic** (v1.13+): 数据库迁移工具
- **greenlet** (v3.0+): 异步SQLAlchemy依赖

### HTTP客户端
- **httpx** (v0.27+): 异步HTTP客户端，用于调用外部API

### 地理编码
- **geopy** (v2.4+): 地理编码库
  - **Nominatim** (OpenStreetMap): 地理坐标查询服务

### XML处理
- **lxml** (v5.0+): XML解析库（用于解析PubMed XML）

### 重试机制
- **tenacity** (v9.0+): 提供重试逻辑和指数退避

### 环境配置
- **python-dotenv** (v1.0+): 环境变量管理

---

## 前端技术栈

### 核心框架
- **Next.js** (v15.0+): React全栈框架（App Router）
- **React** (v19.0+): UI库
- **React DOM** (v19.0+): React渲染
- **TypeScript** (v5.6+): 类型安全的JavaScript

### 地图可视化
- **Mapbox GL JS** (v3.0+): 地图渲染引擎
- **react-map-gl** (v7.1.7+): React Mapbox GL封装

### 数据可视化
- **Recharts** (v2.10.0+): 基于React的图表库

### 开发工具
- **ESLint** (v9.0+): 代码质量检查
- **eslint-config-next** (v15.0+): Next.js ESLint配置
- **@types/node**, **@types/react**, **@types/react-dom**: TypeScript类型定义

---

## 外部服务与API

### AI/LLM服务
- **OpenAI API**: 
  - 支持GPT-4及其他模型
  - 支持Responses API（thinking模式）
  - 用于研究描述解析、术语标准化、同义词生成、查询构建、地理位置提取

### 学术文献数据库
- **PubMed API** (EFetch): 医学文献检索与XML获取
- **Semantic Scholar API**: 学术论文检索
- **OpenAlex API**: 开放学术数据库

### 地理服务
- **Nominatim** (OpenStreetMap): 免费地理编码服务
- **Mapbox**: 地图瓦片和样式服务（需要API Token）

---

## 数据库模型

### 核心表
- `projects`: 项目表
- `runs`: 运行记录表（存储Phase 1的JSON结果）

### Phase 2 表
- `papers`: 论文元数据（PMID, 标题, 年份, DOI）
- `authorship`: 作者-论文关联表（包含地理位置信息）
- `run_papers`: 运行-论文关联表

### 缓存表
- `affiliation_cache`: LLM提取的地理信息缓存
- `geocoding_cache`: 地理坐标缓存（全局共享）

---

## 部署环境

### 平台
- **Render**: 云平台部署
  - Backend: Python运行时
  - Frontend: Node.js运行时
  - Database: PostgreSQL服务

### 环境变量
- `DATABASE_URL`: PostgreSQL连接字符串
- `OPENAI_API_KEY`: OpenAI API密钥
- `PUBMED_API_KEY`: PubMed API密钥（可选）
- `SEMANTIC_SCHOLAR_API_KEY`: Semantic Scholar API密钥（可选）
- `OPENALEX_MAILTO`: OpenAlex邮箱（可选）
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`: Mapbox访问令牌
- `NEXT_PUBLIC_API_URL`: 前端API基础URL

---

## 关键特性

### 异步处理
- 全栈异步架构（FastAPI + asyncpg）
- 并发HTTP请求（httpx异步客户端）
- 批量地理编码缓存

### 性能优化
- 全局地理坐标缓存（跨项目/运行共享）
- 批量数据库查询
- LLM调用去重（减少成本）
- 数据库连接池

### 数据流
1. **Phase 1**: 研究描述 → LLM解析 → 查询构建 → 多源文献检索
2. **Phase 2**: 论文元数据提取 → 作者/机构解析 → 地理位置提取 → 地图可视化

---

## 开发工具

### 本地开发
- Python 3.11+ (推荐)
- Node.js 18+ (推荐)
- Conda环境管理（可选）
- npm/pip包管理

### 代码组织
- Monorepo结构
- 模块化设计（Phase 1/Phase 2分离）
- Repository模式（数据访问层）
- Service层（业务逻辑）

