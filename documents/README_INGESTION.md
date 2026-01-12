# 后台触发 Ingestion 脚本

## ⚠️ 重要提示

**email 和 password 必须是该 run 所属项目的所有者的账户。**

API 会验证项目所有权：
- 如果项目不属于登录的用户，请求会失败并返回 "Project not found" (404)
- 这是安全机制，确保只有项目所有者才能触发 ingestion

**例外：超级用户**
- 超级用户（在 config.py 中配置）可以访问任何项目和 run
- 当前超级用户：xiaolongwu0713@gmail.com

## 使用方法

### 方式 1: 使用邮箱和密码登录

```bash
python scripts/trigger_ingestion.py <project_id> <run_id> --email <email> --password <password>
```

示例：
```bash
python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword
```

### 方式 2: 使用已有的 JWT Token

如果你已经有有效的 JWT token（例如从浏览器开发者工具中获取），可以直接使用：

```bash
python scripts/trigger_ingestion.py <project_id> <run_id> --token <your_jwt_token>
```

### 其他选项

- `--force`: 强制刷新，忽略缓存（重新处理所有数据）
- `--base-url`: 指定后端 URL（默认: http://localhost:8000）

示例：
```bash
# 强制刷新
python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --force

# 使用自定义后端 URL
python scripts/trigger_ingestion.py ad280effc0b8 run_7b1d4766fd27 --email user@example.com --password mypassword --base-url https://your-backend.com
```

## 获取 JWT Token

如果你想获取 token 用于后续使用，可以：

1. 使用脚本登录一次，然后从浏览器开发者工具中复制 token
2. 或者使用 curl：

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'
```

响应中的 `access_token` 字段就是 JWT token。

## 注意事项

1. **数据隔离**: 重新运行 ingestion 会删除并重新创建该 run 的 authorships 数据。如果多个 run 共享相同的 PMIDs，可能会影响其他 run 的数据。详见之前的分析。

2. **执行时间**: Ingestion 可能需要几分钟时间，取决于论文数量和网络速度。

3. **超时设置**: 脚本设置了 10 分钟的超时时间，如果 ingestion 需要更长时间，可能需要调整脚本中的超时设置。

## 输出示例

成功运行后会显示：

```
Logging in as user@example.com...
✅ Login successful

🚀 Triggering ingestion for run run_7b1d4766fd27...

📊 Ingestion Statistics:
============================================================
  Run ID: run_7b1d4766fd27
  Total PMIDs: 300
  PMIDs Cached: 0
  PMIDs Fetched: 300
  Papers Parsed: 298
  Authorships Created: 1245
  Unique Affiliations: 245
  Affiliations with Country: 198
  LLM Calls Made: 13
============================================================

✅ Ingestion completed successfully!
```
