# 数据质量清洗系统 - Cron 任务配置

## 📋 目录

- [概述](#概述)
- [安装和配置](#安装和配置)
- [运行模式](#运行模式)
- [调度策略](#调度策略)
- [日志管理](#日志管理)
- [监控和告警](#监控和告警)
- [故障排除](#故障排除)

---

## 概述

数据清洗系统通过 Cron 定时任务自动运行，无需人工干预。系统支持三种运行模式，可以根据需要灵活调度。

### 系统要求

- **操作系统**: Linux/Unix/macOS
- **Python**: 3.11+
- **数据库**: PostgreSQL
- **可选**: Ollama（本地 LLM）

---

## 安装和配置

### 1. 创建清洗脚本

**文件**: `cron_job/data_cleaning.py`

```python
#!/usr/bin/env python3
"""
数据质量清洗任务

用法:
    python data_cleaning.py --mode incremental
    python data_cleaning.py --mode full --use-local-llm
    python data_cleaning.py --mode validation_only
"""

import sys
import os
import argparse
import asyncio
from datetime import datetime

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.cleaning.data_cleaning_job import DataCleaningJob, CleaningConfig
from backend.app.core.logger import get_logger

logger = get_logger(__name__)


async def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='数据质量清洗任务')
    
    parser.add_argument(
        '--mode',
        choices=['full', 'incremental', 'validation_only'],
        default='incremental',
        help='清洗模式: full (全量), incremental (增量), validation_only (仅验证)'
    )
    
    parser.add_argument(
        '--use-local-llm',
        action='store_true',
        help='使用本地 LLM (Ollama) 而不是 OpenAI'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='试运行模式（不修复错误，不更新数据库）'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=20,
        help='LLM 批量处理大小'
    )
    
    parser.add_argument(
        '--max-errors',
        type=int,
        default=None,
        help='最多处理多少个错误（用于测试）'
    )
    
    args = parser.parse_args()
    
    # 记录开始时间
    start_time = datetime.now()
    logger.info("=" * 80)
    logger.info(f"🧹 数据质量清洗任务开始")
    logger.info(f"   模式: {args.mode}")
    logger.info(f"   使用本地 LLM: {args.use_local_llm}")
    logger.info(f"   试运行: {args.dry_run}")
    logger.info(f"   开始时间: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 80)
    
    try:
        # 创建配置
        config = CleaningConfig(
            use_local_llm=args.use_local_llm,
            enable_fix=not args.dry_run,
            batch_size=args.batch_size,
            max_errors_to_process=args.max_errors
        )
        
        # 创建清洗任务
        job = DataCleaningJob(config)
        
        # 运行清洗
        report = await job.run(mode=args.mode)
        
        # 输出报告
        logger.info("\n" + report)
        
        # 记录结束时间
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("=" * 80)
        logger.info(f"✅ 数据质量清洗任务完成")
        logger.info(f"   结束时间: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"   总耗时: {duration:.1f} 秒 ({duration/60:.1f} 分钟)")
        logger.info("=" * 80)
        
        return 0
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"❌ 数据质量清洗任务失败")
        logger.error(f"   错误: {str(e)}")
        logger.error("=" * 80)
        logger.exception(e)
        return 1


if __name__ == '__main__':
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### 2. 创建 Shell 包装脚本

**文件**: `cron_job/data_cleaning.sh`

```bash
#!/bin/bash
#
# 数据质量清洗任务 Shell 包装脚本
#
# 用法:
#   ./data_cleaning.sh incremental
#   ./data_cleaning.sh full
#   ./data_cleaning.sh validation_only
#

set -e  # 遇到错误立即退出

# ==================== 配置 ====================

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Python 解释器
PYTHON="${PROJECT_ROOT}/venv/bin/python"

# 日志目录
LOG_DIR="${PROJECT_ROOT}/logs/cleaning"
mkdir -p "$LOG_DIR"

# 清洗脚本
CLEANING_SCRIPT="${PROJECT_ROOT}/cron_job/data_cleaning.py"

# 环境变量
export PYTHONPATH="$PROJECT_ROOT"
export PYTHONUNBUFFERED=1

# 加载 .env 文件（如果存在）
if [ -f "${PROJECT_ROOT}/.env" ]; then
    export $(cat "${PROJECT_ROOT}/.env" | grep -v '^#' | xargs)
fi

# ==================== 参数 ====================

MODE="${1:-incremental}"  # 默认增量模式
USE_LOCAL_LLM="${USE_LOCAL_LLM:-false}"  # 从环境变量读取

# 日志文件
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/cleaning_${MODE}_${TIMESTAMP}.log"

# ==================== 执行 ====================

echo "🧹 开始数据清洗任务..."
echo "   模式: $MODE"
echo "   日志: $LOG_FILE"

# 构建命令
CMD="$PYTHON $CLEANING_SCRIPT --mode $MODE"

if [ "$USE_LOCAL_LLM" = "true" ]; then
    CMD="$CMD --use-local-llm"
fi

# 运行清洗任务，输出到日志文件
$CMD 2>&1 | tee "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

# 检查退出码
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ 数据清洗任务完成"
else
    echo "❌ 数据清洗任务失败 (退出码: $EXIT_CODE)"
    
    # 发送告警邮件（可选）
    if command -v mail &> /dev/null; then
        echo "数据清洗任务失败，请检查日志: $LOG_FILE" | \
            mail -s "[ScholarMap] 数据清洗失败" admin@scholarmap.com
    fi
fi

# ==================== 清理 ====================

# 删除 7 天前的日志文件
find "$LOG_DIR" -name "cleaning_*.log" -mtime +7 -delete

exit $EXIT_CODE
```

### 3. 设置权限

```bash
# 给脚本添加执行权限
chmod +x cron_job/data_cleaning.sh
chmod +x cron_job/data_cleaning.py
```

---

## 运行模式

### 1. Full Mode（全量清洗）

检查数据库中**所有** authorships 的数据质量。

**特点**:
- ✅ 最彻底的清洗
- ✅ 发现所有历史错误
- ❌ 耗时长（可能数小时）
- ❌ 资源消耗大

**适用场景**:
- 初次部署清洗系统
- 大规模数据质量审计
- 提取算法重大更新后

**运行频率**: 每周一次（建议周末凌晨）

**示例**:
```bash
./cron_job/data_cleaning.sh full
```

### 2. Incremental Mode（增量清洗）

只检查**最近 N 天**的 authorships。

**特点**:
- ✅ 速度快
- ✅ 资源消耗小
- ✅ 适合日常维护
- ❌ 不覆盖历史数据

**配置**:
```python
# backend/app/cleaning/config.py
class CleaningConfig:
    incremental_days: int = 7  # 检查最近 7 天的数据
```

**适用场景**:
- 日常数据质量维护
- 新增数据的质量检查

**运行频率**: 每天一次（建议凌晨）

**示例**:
```bash
./cron_job/data_cleaning.sh incremental
```

### 3. Validation Only Mode（仅验证）

只检测错误，**不进行修复**。

**特点**:
- ✅ 速度快
- ✅ 无副作用
- ✅ 适合监控
- ❌ 不修复问题

**适用场景**:
- 数据质量监控
- 生成质量报告
- 评估清洗效果

**运行频率**: 每小时一次

**示例**:
```bash
./cron_job/data_cleaning.sh validation_only
```

---

## 调度策略

### 推荐的 Cron 配置

编辑 crontab：

```bash
crontab -e
```

添加以下配置：

```bash
# ==================== 数据质量清洗任务 ====================

# 设置环境变量
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
PROJECT_ROOT=/app/scholarmap

# 每天凌晨 2 点运行增量清洗（周一到周六）
0 2 * * 1-6 cd $PROJECT_ROOT && ./cron_job/data_cleaning.sh incremental

# 每周日凌晨 3 点运行全量清洗
0 3 * * 0 cd $PROJECT_ROOT && ./cron_job/data_cleaning.sh full

# 每小时运行一次验证（生成质量报告）
0 * * * * cd $PROJECT_ROOT && ./cron_job/data_cleaning.sh validation_only

# ==================== 可选: 使用本地 LLM ====================

# 如果使用本地 LLM，设置环境变量
# USE_LOCAL_LLM=true

# ==================== 可选: 监控清洗任务健康状态 ====================

# 每小时检查一次清洗任务是否正常
0 * * * * cd $PROJECT_ROOT && ./cron_job/check_cleaning_health.sh
```

### Cron 时间说明

| Cron 表达式 | 说明 | 频率 |
|------------|------|------|
| `0 2 * * 1-6` | 周一到周六凌晨 2 点 | 每天（工作日） |
| `0 3 * * 0` | 周日凌晨 3 点 | 每周 |
| `0 * * * *` | 每小时整点 | 每小时 |
| `*/30 * * * *` | 每 30 分钟 | 每半小时 |
| `0 0 1 * *` | 每月 1 号凌晨 | 每月 |

### 调度策略建议

#### 小型项目（< 10,000 authorships）

```bash
# 每天全量清洗
0 2 * * * ./cron_job/data_cleaning.sh full
```

#### 中型项目（10,000 - 100,000 authorships）

```bash
# 每天增量清洗
0 2 * * * ./cron_job/data_cleaning.sh incremental

# 每周全量清洗
0 3 * * 0 ./cron_job/data_cleaning.sh full
```

#### 大型项目（> 100,000 authorships）

```bash
# 每天增量清洗（最近 3 天）
0 2 * * * ./cron_job/data_cleaning.sh incremental

# 每周增量清洗（最近 30 天）
0 3 * * 0 INCREMENTAL_DAYS=30 ./cron_job/data_cleaning.sh incremental

# 每月全量清洗
0 4 1 * * ./cron_job/data_cleaning.sh full
```

---

## 日志管理

### 日志结构

```
logs/cleaning/
├── cleaning_incremental_20260127_020000.log
├── cleaning_incremental_20260128_020000.log
├── cleaning_full_20260126_030000.log
├── cleaning_validation_only_20260127_100000.log
└── ...
```

### 日志格式

```
================================================================================
🧹 数据质量清洗任务开始
   模式: incremental
   使用本地 LLM: False
   试运行: False
   开始时间: 2026-01-27 02:00:00
================================================================================

🔍 Step 1: Selecting authorships to check...
   Selected 1,234 authorships (from last 7 days)

🔍 Step 2: Detecting errors...
   Running ExtractionQualityDetector...
   Running GeocodingQualityDetector...
   Running ConsistencyDetector...
   Detected 156 errors

📊 Step 3: Classifying errors...
   Error distribution:
   - extraction_error: 89 (57.1%)
   - geocoding_error: 54 (34.6%)
   - consistency_error: 13 (8.3%)

💾 Step 4: Recording errors...
   Recorded 156 errors to database

🔧 Step 5: Fixing errors...
   Fixing extraction errors: 89
   Using OpenAI GPT-4 for re-extraction...
   Fixed 76/89 (85.4%)
   
   Fixing geocoding errors: 54
   Retrying geocoding...
   Fixed 48/54 (88.9%)

📝 Step 6: Generating report...
   Report saved to batch clean_20260127_020000

================================================================================
✅ 数据质量清洗任务完成
   结束时间: 2026-01-27 02:15:32
   总耗时: 932.4 秒 (15.5 分钟)
================================================================================
```

### 日志清理

自动删除 7 天前的日志：

```bash
# 在 data_cleaning.sh 中已包含
find "$LOG_DIR" -name "cleaning_*.log" -mtime +7 -delete
```

手动清理：

```bash
# 删除 30 天前的日志
find logs/cleaning/ -name "*.log" -mtime +30 -delete

# 删除大于 100MB 的日志
find logs/cleaning/ -name "*.log" -size +100M -delete
```

---

## 监控和告警

### 1. 健康检查脚本

**文件**: `cron_job/check_cleaning_health.sh`

```bash
#!/bin/bash
#
# 检查数据清洗任务的健康状态
#

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PROJECT_ROOT}/venv/bin/python"

# 运行健康检查
$PYTHON <<EOF
import sys
sys.path.insert(0, "$PROJECT_ROOT")

from backend.app.cleaning.monitoring.health_check import check_cleaning_health
import asyncio

async def main():
    health = await check_cleaning_health()
    
    if not health['healthy']:
        print(f"❌ 清洗任务不健康: {health['reason']}")
        # 发送告警
        return 1
    
    print(f"✅ 清洗任务健康")
    return 0

exit_code = asyncio.run(main())
sys.exit(exit_code)
EOF
```

**健康检查逻辑**:

```python
# backend/app/cleaning/monitoring/health_check.py

async def check_cleaning_health() -> Dict:
    """检查清洗任务健康状态"""
    
    # 1. 检查最近的批次
    recent_batch = await get_most_recent_batch()
    
    if not recent_batch:
        return {
            'healthy': False,
            'reason': 'No recent batch found'
        }
    
    # 2. 检查批次是否太久远（超过 2 天）
    age = datetime.now() - recent_batch.completed_at
    if age.total_seconds() > 2 * 24 * 3600:
        return {
            'healthy': False,
            'reason': f'Last batch was {age.days} days ago'
        }
    
    # 3. 检查错误率是否过高
    if recent_batch.errors_detected / recent_batch.total_authorships_checked > 0.3:
        return {
            'healthy': False,
            'reason': f'Error rate too high: {recent_batch.errors_detected / recent_batch.total_authorships_checked:.1%}'
        }
    
    # 4. 检查修复成功率是否过低
    if recent_batch.fix_success_rate < 0.7:
        return {
            'healthy': False,
            'reason': f'Fix success rate too low: {recent_batch.fix_success_rate:.1%}'
        }
    
    return {
        'healthy': True,
        'reason': 'All checks passed'
    }
```

### 2. 告警通知

#### 邮件告警

```python
# backend/app/cleaning/notifications/email_notifier.py

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

async def send_alert_email(subject: str, body: str):
    """发送告警邮件"""
    
    msg = MIMEMultipart()
    msg['From'] = 'noreply@scholarmap.com'
    msg['To'] = 'admin@scholarmap.com'
    msg['Subject'] = f'[ScholarMap Alert] {subject}'
    
    msg.attach(MIMEText(body, 'plain'))
    
    # 发送邮件
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('user', 'password')
        server.send_message(msg)
```

#### Slack 告警（可选）

```python
# backend/app/cleaning/notifications/slack_notifier.py

import httpx

async def send_slack_alert(message: str):
    """发送 Slack 告警"""
    
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    
    payload = {
        'text': message,
        'channel': '#data-quality',
        'username': 'Data Cleaning Bot',
        'icon_emoji': ':broom:'
    }
    
    async with httpx.AsyncClient() as client:
        await client.post(webhook_url, json=payload)
```

---

## 故障排除

### 问题 1: Cron 任务没有运行

**症状**: 日志中没有新的清洗记录

**排查步骤**:

1. 检查 Cron 是否在运行
   ```bash
   sudo systemctl status cron  # Linux
   # 或
   sudo launchctl list | grep cron  # macOS
   ```

2. 检查 Crontab 配置
   ```bash
   crontab -l
   ```

3. 检查 Cron 日志
   ```bash
   tail -f /var/log/syslog | grep CRON  # Linux
   # 或
   tail -f /var/log/system.log | grep cron  # macOS
   ```

4. 手动运行脚本测试
   ```bash
   cd /app/scholarmap
   ./cron_job/data_cleaning.sh incremental
   ```

### 问题 2: 清洗任务失败

**症状**: 日志显示错误或异常退出

**排查步骤**:

1. 查看最新的日志文件
   ```bash
   tail -100 logs/cleaning/cleaning_*.log | less
   ```

2. 检查数据库连接
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. 检查 Python 环境
   ```bash
   ./venv/bin/python --version
   ./venv/bin/pip list | grep sqlalchemy
   ```

4. 以调试模式运行
   ```bash
   export DEBUG=1
   ./cron_job/data_cleaning.sh incremental
   ```

### 问题 3: 本地 LLM 无法连接

**症状**: 错误信息包含 "Failed to connect to Ollama"

**排查步骤**:

1. 检查 Ollama 服务是否运行
   ```bash
   ps aux | grep ollama
   curl http://localhost:11434/api/version
   ```

2. 启动 Ollama 服务
   ```bash
   ollama serve
   ```

3. 检查模型是否已下载
   ```bash
   ollama list
   ```

4. 下载模型
   ```bash
   ollama pull llama3.1:8b
   ```

### 问题 4: 内存不足

**症状**: 进程被 OOM killer 终止

**解决方案**:

1. 减小批次大小
   ```bash
   ./cron_job/data_cleaning.py --mode incremental --batch-size 10
   ```

2. 限制处理的错误数量
   ```bash
   ./cron_job/data_cleaning.py --mode incremental --max-errors 100
   ```

3. 增加系统内存或使用 swap

---

## 版本历史

- **v1.0** (2026-01-27): 初始 Cron 配置文档
  - 三种运行模式
  - 调度策略
  - 日志管理
  - 监控和告警
  - 故障排除
