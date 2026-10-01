# LabScout 监控说明

更新于 2026-10-01。目标：不需要人工巡查，只在需要时收到邮件、审核 PR。

## 一、监控组成

### 1. Sentry 错误采集（实时）

- 组织：`xiaolong-wu`（https://xiaolong-wu.sentry.io）
- 项目：
  - `labscout-frontend`：Next.js 前端（Vercel），DSN 在 Vercel 环境变量 `NEXT_PUBLIC_SENTRY_DSN`，浏览器事件经 `/monitoring` 转发
  - `labscout-backend`：FastAPI 后端（Render），DSN 在 Render 环境变量 `SENTRY_DSN`
- 只采集错误，不开性能追踪和会话回放
- 未配置 `SENTRY_AUTH_TOKEN`（Vercel），生产报错堆栈是压缩后的代码，需要时再补

### 2. Sentry 实时邮件告警（只保留紧急情况）

| 告警 | 触发条件 | 通知 |
|---|---|---|
| Payment errors (billing routes) | 后端 `/api/billing/*` 出现新报错、报错激增或已解决的报错复发（含 Paddle webhook 签名校验失败） | 立即邮件 |
| Backend down (uptime) | 每分钟访问 `https://scholarmap-q1k1.onrender.com/healthz`，连续 3 次失败 | 立即邮件；恢复后也会通知 |

其余报错不实时发邮件，由每日巡检处理。默认的"高优先级问题"告警已停用（未删除，可在 Sentry → Monitors → Alerts 重新启用）。

### 3. Claude 每日巡检（每天 09:00 上海时间 / 01:00 UTC）

- 任务：LabScout daily health check（https://claude.ai/code/routines/trig_01CmYJY9yx3E71ipucEZ2Dqp）
- 运行环境：claude.ai 云端 Default 环境（完全网络访问，环境变量 `SENTRY_AUTH_TOKEN` 为只读令牌），模型 Sonnet 5.5，只连接 Gmail
- 每次运行：
  1. 用 `scripts/check_links.mjs` 逐页爬取全站（sitemap + 页面内所有站内链接），找 4xx/5xx 死链。并发为 1，约 1–2 小时，避免压垮 256 MB 数据库
  2. 通过 Sentry API 读取过去 24 小时未解决的报错
  3. 分类：
     - 代码问题 → 在 `auto-fix/日期` 分支修复，构建/测试通过后开 **一个** PR
     - 数据库容量问题（连接池超时、数据库重启等）→ 只统计报告，不改代码
     - 无关干扰（浏览器插件、爬虫乱访问等）→ 忽略
  4. 不会合并 PR，不会推送到 `main`，不改付款、登录、数据库结构和连接池代码
- 发邮件的条件（发往 xiaolongwu0713@gmail.com，标题 `LabScout daily check: ...`）：
  - 开了 PR；或
  - 数据库容量错误 24 小时内超过 20 次；或
  - 后端健康检查失败
- 一切正常时不发邮件

## 二、需要你做的事

### 日常：只看邮件

| 收到的邮件 | 你要做的 |
|---|---|
| Sentry「Payment errors」 | 尽快处理：可能有用户付款后没开通 Pro。先看 Sentry 报错详情；签名校验失败通常是 Render 上的 `PADDLE_WEBHOOK_SECRET` 与 Paddle 后台不一致 |
| Sentry「Backend down」 | 打开 Render 后台看 `scholarmap-backend` 是否在部署失败或崩溃重启；恢复后会收到恢复通知 |
| 巡检邮件（附 PR 链接） | 打开 PR 看说明，没问题就点 **Merge**，合并后自动部署 |
| 巡检邮件（数据库告警） | 说明 256 MB 数据库扛不住，考虑在 Render 升级 `scholarmap-db` 配置 |

### 偶尔

- **Sentry 令牌到期**：巡检会读不到 Sentry（运行总结里会写明）。到 Sentry → Settings → Account → API → Auth Tokens 新建个人令牌（Project / Issue & Event / Organization 均为 Read），填到 claude.ai/code 的 Default 环境变量 `SENTRY_AUTH_TOKEN`
- **暂停或修改巡检**：在上面的任务页面操作，或让 Claude 修改
- **处理 Sentry 里已修复的问题**：PR 合并后可在 Sentry 把对应 issue 标记为 Resolved（不处理也不影响巡检）

### 不需要做的

- 不用每天登录 Sentry、GitHub、Vercel 或 Render 查看
- 不用手动触发任何检查
- 不用自己排查报错原因，PR 里会写清楚

## 三、注意事项

- 不要提高 `scripts/check_links.mjs` 的并发（`CONCURRENCY = 1`）。2026-10-01 曾因 4 并发全站爬取导致数据库连接池耗尽和多次重启
- 原 GitHub Actions 的每日 Link check 已删除，避免与巡检重复爬取
- 手动跑全站检查：`node scripts/check_links.mjs`（默认检查 https://labscout.io）
