# 数据质量清洗系统 - 实施计划

## 📋 目录

- [总体时间表](#总体时间表)
- [Phase 1: 基础架构](#phase-1-基础架构)
- [Phase 2: 检测系统](#phase-2-检测系统)
- [Phase 3: 修复系统](#phase-3-修复系统)
- [Phase 4: 报告和监控](#phase-4-报告和监控)
- [Phase 5: 集成和测试](#phase-5-集成和测试)
- [Phase 6: 部署和优化](#phase-6-部署和优化)

---

## 总体时间表

| Phase | 任务 | 预估时间 | 依赖 |
|-------|------|---------|------|
| **Phase 1** | 基础架构 | 2-3 天 | 无 |
| **Phase 2** | 检测系统 | 3-4 天 | Phase 1 |
| **Phase 3** | 修复系统 | 3-4 天 | Phase 1, 2 |
| **Phase 4** | 报告和监控 | 2-3 天 | Phase 1, 2, 3 |
| **Phase 5** | 集成和测试 | 2-3 天 | Phase 1-4 |
| **Phase 6** | 部署和优化 | 持续 | Phase 1-5 |

**总计**: 12-17 天（约 2-3 周）

---

## Phase 1: 基础架构

### 目标
建立数据清洗系统的基础设施，包括数据模型、配置和核心类。

### 任务清单

#### 1.1 创建数据模型 ✅

**文件**: `backend/app/db/models.py`

```python
# 添加新的模型类
- DataQualityLog
- DataCleaningBatch
- GeocodingValidation
```

**检查清单**:
- [ ] 定义所有字段和类型
- [ ] 添加索引
- [ ] 添加关系（外键）
- [ ] 添加 `__table_args__`

#### 1.2 创建数据库迁移 ✅

```bash
# 创建迁移脚本
alembic revision --autogenerate -m "Add data cleaning tables"

# 检查生成的迁移脚本
# 编辑 alembic/versions/xxxx_add_data_cleaning_tables.py

# 应用迁移
alembic upgrade head
```

**检查清单**:
- [ ] 创建 data_quality_logs 表
- [ ] 创建 data_cleaning_batches 表
- [ ] 创建 geocoding_validations 表
- [ ] 创建所有索引
- [ ] 测试迁移（upgrade 和 downgrade）

#### 1.3 创建 Repository 类 ✅

**文件**: `backend/app/db/repository.py`

```python
# 添加新的 Repository 类
class DataQualityLogRepository:
    async def create(...)
    async def batch_create(...)
    async def get_by_batch_id(...)
    async def get_by_authorship_id(...)
    async def update(...)

class DataCleaningBatchRepository:
    async def create(...)
    async def update(...)
    async def get_by_id(...)
    async def get_recent(...)

class GeocodingValidationRepository:
    async def upsert(...)
    async def get_by_location_key(...)
    async def get_unvalidated(...)
```

**检查清单**:
- [ ] 实现所有 CRUD 方法
- [ ] 添加批量操作方法
- [ ] 添加查询方法（按 batch_id, authorship_id 等）
- [ ] 测试所有方法

#### 1.4 创建配置类 ✅

**文件**: `backend/app/cleaning/config.py`

```python
class CleaningConfig:
    # LLM 配置
    use_local_llm: bool
    local_llm_model: str
    local_llm_url: str
    openai_model: str
    
    # 检测配置
    enable_extraction_check: bool
    enable_geocoding_check: bool
    enable_consistency_check: bool
    
    # 修复配置
    enable_fix: bool
    batch_size: int
    rate_limit_delay: float
    
    # 验证配置
    enable_reverse_geocoding: bool
    validation_sample_rate: float
```

**检查清单**:
- [ ] 定义所有配置项
- [ ] 添加默认值
- [ ] 从环境变量读取
- [ ] 添加配置验证

#### 1.5 创建基础模型类 ✅

**文件**: `backend/app/cleaning/models.py`

```python
@dataclass
class ErrorRecord:
    authorship_id: int
    pmid: str
    error_type: str
    error_category: str
    severity: str
    detection_method: str
    detection_reason: str
    original_affiliation: str
    original_country: str | None
    original_city: str | None
    original_institution: str | None
    original_coordinates: dict | None = None

@dataclass
class FixResult:
    error_id: int
    success: bool
    fix_method: str
    fixed_country: str | None = None
    fixed_city: str | None = None
    fixed_institution: str | None = None
    fixed_coordinates: dict | None = None
    failure_reason: str | None = None
```

**检查清单**:
- [ ] 定义 ErrorRecord
- [ ] 定义 FixResult
- [ ] 添加类型注解
- [ ] 添加辅助方法

### Phase 1 完成标准

- [x] 所有数据模型创建完成
- [x] 数据库迁移成功应用
- [x] 所有 Repository 类实现并测试
- [x] 配置系统完成
- [x] 基础模型类定义完成

---

## Phase 2: 检测系统

### 目标
实现三层检测机制，能够自动检测各类数据质量问题。

### 任务清单

#### 2.1 实现 ExtractionQualityDetector ✅

**文件**: `backend/app/cleaning/detectors/extraction_detector.py`

**功能**:
- [ ] 州缩写检测
- [ ] 机构名检测
- [ ] 部门名检测
- [ ] 低置信度检测
- [ ] 国家城市不匹配检测
- [ ] 缺失地理数据检测
- [ ] 城市名包含数字检测
- [ ] 城市名过短检测

**测试**:
```python
# tests/cleaning/test_extraction_detector.py
def test_detect_state_as_city():
    # 测试州缩写检测
    pass

def test_detect_institution_as_city():
    # 测试机构名检测
    pass

# ... 其他测试
```

#### 2.2 实现 GeocodingQualityDetector ✅

**文件**: `backend/app/cleaning/detectors/geocoding_detector.py`

**功能**:
- [ ] Null 坐标检测
- [ ] 反向 geocoding 验证
- [ ] 坐标异常检测
- [ ] 批量获取缓存坐标
- [ ] 坐标规范化

**测试**:
```python
# tests/cleaning/test_geocoding_detector.py
def test_detect_null_coordinates():
    pass

def test_reverse_geocoding_validation():
    pass

def test_coordinate_anomaly_detection():
    pass
```

#### 2.3 实现 ConsistencyDetector ✅

**文件**: `backend/app/cleaning/detectors/consistency_detector.py`

**功能**:
- [ ] 缓存一致性检测
- [ ] 重复坐标检测
- [ ] Affiliation 变体检测

**测试**:
```python
# tests/cleaning/test_consistency_detector.py
def test_detect_cache_inconsistency():
    pass

def test_detect_duplicate_coordinates():
    pass
```

#### 2.4 实现错误分类器 ✅

**文件**: `backend/app/cleaning/classifier.py`

```python
class ErrorClassifier:
    def classify_and_prioritize(
        self,
        errors: List[ErrorRecord]
    ) -> Dict[str, List[ErrorRecord]]:
        """按严重程度和类型分类"""
        pass
    
    def calculate_priority_score(
        self,
        error: ErrorRecord
    ) -> float:
        """计算优先级分数"""
        pass
```

**功能**:
- [ ] 按严重程度分类
- [ ] 按错误类型分组
- [ ] 计算优先级分数
- [ ] 排序错误列表

### Phase 2 完成标准

- [x] ExtractionQualityDetector 实现并测试
- [x] GeocodingQualityDetector 实现并测试
- [x] ConsistencyDetector 实现并测试
- [x] ErrorClassifier 实现并测试
- [x] 所有检测器能正确识别错误
- [x] 检测性能达标（处理 1000 个 authorships < 30s）

---

## Phase 3: 修复系统

### 目标
实现多种修复策略，能够自动修复检测到的错误。

### 任务清单

#### 3.1 实现本地 LLM 集成 ✅

**文件**: `backend/app/cleaning/llm/local_llm.py`

**功能**:
- [ ] Ollama API 调用
- [ ] Prompt 构建
- [ ] 响应解析
- [ ] 批量提取
- [ ] 错误处理和重试

**测试**:
```python
# tests/cleaning/test_local_llm.py
def test_ollama_connection():
    pass

def test_extract_batch():
    pass

def test_parse_response():
    pass
```

**前置条件**:
```bash
# 安装 Ollama
brew install ollama

# 下载模型
ollama pull llama3.1:8b

# 启动服务
ollama serve
```

#### 3.2 实现 DataFixer ✅

**文件**: `backend/app/cleaning/fixers/data_fixer.py`

**功能**:
- [ ] 修复提取错误（LLM）
- [ ] 修复 geocoding 错误（重试）
- [ ] 修复一致性错误（规则）
- [ ] LLM 结果验证
- [ ] 坐标验证
- [ ] 数据库更新

**测试**:
```python
# tests/cleaning/test_data_fixer.py
def test_fix_extraction_errors():
    pass

def test_fix_geocoding_errors():
    pass

def test_validate_llm_result():
    pass
```

#### 3.3 实现规则修复器 ✅

**文件**: `backend/app/cleaning/fixers/rule_fixer.py`

**功能**:
- [ ] 州缩写规则修复
- [ ] 常见错误映射
- [ ] 规则可配置

#### 3.4 实现修复验证器 ✅

**文件**: `backend/app/cleaning/validators/fix_validator.py`

```python
class FixValidator:
    async def validate_fix(
        self,
        fix_result: FixResult
    ) -> bool:
        """验证修复结果"""
        pass
    
    def _is_valid_geo_data(...)
    def _is_valid_coordinates(...)
    async def _reverse_geocode_validate(...)
```

### Phase 3 完成标准

- [x] 本地 LLM 集成完成并测试
- [x] DataFixer 实现所有修复策略
- [x] 修复成功率 >80%
- [x] 修复验证机制完善
- [x] 数据库更新逻辑正确

---

## Phase 4: 报告和监控

### 目标
实现报告生成和质量监控系统。

### 任务清单

#### 4.1 实现报告生成器 ✅

**文件**: `backend/app/cleaning/reporting/quality_reporter.py`

```python
class QualityReporter:
    async def generate_report(
        self,
        batch_id: str,
        errors: List[ErrorRecord],
        fixes: List[FixResult]
    ) -> str:
        """生成 Markdown 格式的报告"""
        pass
    
    def _generate_summary(...)
    def _generate_error_distribution(...)
    def _generate_fix_details(...)
    def _generate_trends(...)
    def _generate_recommendations(...)
```

**功能**:
- [ ] 总体统计
- [ ] 错误分类分布
- [ ] 修复详情
- [ ] 成功/失败案例
- [ ] 质量趋势图表
- [ ] 改进建议

#### 4.2 实现质量指标追踪 ✅

**文件**: `backend/app/cleaning/metrics/quality_metrics.py`

```python
class QualityMetrics:
    async def calculate_metrics(
        self,
        batch_id: str
    ) -> Dict:
        """计算质量指标"""
        return {
            'error_rate': ...,
            'fix_success_rate': ...,
            'data_completeness': ...,
            'geocoding_success_rate': ...,
            'extraction_accuracy': ...
        }
    
    async def get_trend_data(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """获取趋势数据"""
        pass
```

**功能**:
- [ ] 错误率计算
- [ ] 修复成功率计算
- [ ] 数据完整度计算
- [ ] 趋势数据生成
- [ ] 对比分析

#### 4.3 实现通知系统 ✅

**文件**: `backend/app/cleaning/notifications/notifier.py`

```python
class CleaningNotifier:
    async def send_batch_complete_notification(
        self,
        batch_id: str,
        summary: Dict
    ):
        """发送完成通知"""
        pass
    
    async def send_error_alert(
        self,
        error_count: int,
        severity: str
    ):
        """发送错误告警"""
        pass
```

**功能**:
- [ ] 邮件通知（可选）
- [ ] Slack 通知（可选）
- [ ] 日志记录

### Phase 4 完成标准

- [x] 报告生成器实现
- [x] 质量指标追踪实现
- [x] 报告格式美观清晰
- [x] 趋势图表准确
- [x] 改进建议有价值

---

## Phase 5: 集成和测试

### 目标
将所有组件集成为完整的清洗任务，并进行全面测试。

### 任务清单

#### 5.1 实现 DataCleaningJob ✅

**文件**: `backend/app/cleaning/data_cleaning_job.py`

```python
class DataCleaningJob:
    async def run(
        self,
        mode: str = 'full'
    ) -> str:
        """运行清洗任务"""
        # 1. 创建批次
        # 2. 选择数据
        # 3. 检测错误
        # 4. 修复错误
        # 5. 生成报告
        pass
    
    async def _select_authorships(...)
    async def _detect_all_errors(...)
    async def _fix_all_errors(...)
    async def _generate_and_save_report(...)
```

**功能**:
- [ ] 支持三种模式（full/incremental/validation_only）
- [ ] 批次管理
- [ ] 错误处理和恢复
- [ ] 进度追踪
- [ ] 日志记录

#### 5.2 创建 CLI 工具 ✅

**文件**: `cron_job/data_cleaning.py`

```python
import argparse
import asyncio
from backend.app.cleaning.data_cleaning_job import DataCleaningJob

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=['full', 'incremental', 'validation_only'])
    parser.add_argument('--use-local-llm', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    
    # ... 运行清洗任务
```

**功能**:
- [ ] 命令行参数解析
- [ ] 模式选择
- [ ] 配置覆盖
- [ ] Dry-run 模式

#### 5.3 单元测试 ✅

**测试文件结构**:
```
tests/cleaning/
├── __init__.py
├── test_extraction_detector.py
├── test_geocoding_detector.py
├── test_consistency_detector.py
├── test_data_fixer.py
├── test_local_llm.py
├── test_quality_reporter.py
├── test_data_cleaning_job.py
└── fixtures.py
```

**测试覆盖率目标**: >80%

#### 5.4 集成测试 ✅

**文件**: `tests/cleaning/test_integration.py`

```python
async def test_full_cleaning_workflow():
    """测试完整的清洗流程"""
    # 1. 创建测试数据
    # 2. 运行清洗任务
    # 3. 验证结果
    # 4. 检查报告
    pass

async def test_incremental_mode():
    pass

async def test_validation_only_mode():
    pass
```

#### 5.5 性能测试 ✅

**文件**: `tests/cleaning/test_performance.py`

```python
async def test_detection_performance():
    """测试检测性能"""
    # 生成 10,000 个 authorships
    # 测量检测时间
    # 验证 < 5 分钟完成
    pass

async def test_fixing_performance():
    """测试修复性能"""
    # 生成 1,000 个错误
    # 测量修复时间
    # 验证合理范围
    pass
```

### Phase 5 完成标准

- [x] DataCleaningJob 完整实现
- [x] CLI 工具可用
- [x] 单元测试覆盖率 >80%
- [x] 集成测试通过
- [x] 性能测试达标
- [x] 端到端测试通过

---

## Phase 6: 部署和优化

### 目标
将清洗系统部署到生产环境，并持续优化。

### 任务清单

#### 6.1 配置 Cron Job ✅

**文件**: `cron_job/data_cleaning.sh`

```bash
#!/bin/bash

# 设置环境
export PYTHONPATH=/app
export DATABASE_URL="..."

# 记录日志
LOG_DIR="/app/logs/cleaning"
mkdir -p $LOG_DIR

# 运行清洗任务
python /app/cron_job/data_cleaning.py \
    --mode incremental \
    --use-local-llm \
    > "$LOG_DIR/cleaning_$(date +%Y%m%d_%H%M%S).log" 2>&1
```

**Crontab 配置**:
```bash
# 每天凌晨 2 点运行增量清洗
0 2 * * * /app/cron_job/data_cleaning.sh incremental

# 每周日凌晨 3 点运行全量清洗
0 3 * * 0 /app/cron_job/data_cleaning.sh full

# 每小时运行一次验证
0 * * * * /app/cron_job/data_cleaning.sh validation_only
```

#### 6.2 设置监控和告警 ✅

**文件**: `backend/app/cleaning/monitoring/monitor.py`

```python
class CleaningMonitor:
    async def check_job_health():
        """检查清洗任务健康状态"""
        # 检查最近的批次
        # 检查错误率
        # 检查失败率
        # 发送告警
        pass
```

**Grafana Dashboard**（可选）:
- 错误数量趋势
- 修复成功率
- 清洗任务执行时间
- 数据质量指标

#### 6.3 文档和培训 ✅

**文档**:
- [x] OVERVIEW.md - 系统概述
- [x] DATA_MODELS.md - 数据模型
- [x] DETECTION_STRATEGIES.md - 检测策略
- [x] FIXING_STRATEGIES.md - 修复策略
- [x] IMPLEMENTATION_PLAN.md - 实施计划（本文件）
- [x] CRON_CONFIGURATION.md - Cron 配置
- [x] REPORTING.md - 报告系统
- [ ] TROUBLESHOOTING.md - 故障排除
- [ ] API.md - API 文档

**培训材料**:
- [ ] 系统架构讲解
- [ ] 配置和使用指南
- [ ] 报告解读指南
- [ ] 常见问题解答

#### 6.4 优化和改进 🔄

**持续优化项目**:

1. **检测规则优化**
   - 根据报告调整规则
   - 添加新的检测规则
   - 优化检测性能

2. **修复策略优化**
   - 提高修复成功率
   - 优化 LLM prompt
   - 添加新的修复策略

3. **性能优化**
   - 数据库查询优化
   - 批量操作优化
   - 缓存策略优化

4. **报告改进**
   - 添加更多可视化
   - 改进建议更具体
   - 添加导出功能

### Phase 6 完成标准

- [x] Cron job 配置完成
- [x] 监控和告警设置
- [x] 文档完善
- [x] 系统稳定运行
- [x] 数据质量持续提升

---

## 里程碑

### Milestone 1: MVP 完成
- Phase 1-3 完成
- 基本的检测和修复功能可用
- 可以手动运行清洗任务

**目标日期**: 第 10 天

### Milestone 2: 完整功能
- Phase 1-4 完成
- 报告系统完善
- 所有测试通过

**目标日期**: 第 14 天

### Milestone 3: 生产就绪
- Phase 1-5 完成
- 集成测试通过
- 性能达标

**目标日期**: 第 17 天

### Milestone 4: 生产部署
- Phase 1-6 完成
- 系统稳定运行
- 持续优化

**目标日期**: 第 21 天

---

## 风险和缓解

### 风险 1: 本地 LLM 性能不足

**影响**: 修复速度慢，效果不佳

**缓解措施**:
- 提前测试本地 LLM 效果
- 准备 OpenAI 作为备选
- 优化 prompt 提高准确度

### 风险 2: 检测规则过于严格

**影响**: 误报太多，浪费修复资源

**缓解措施**:
- 逐步启用检测规则
- 监控误报率
- 及时调整阈值

### 风险 3: 数据库性能问题

**影响**: 查询慢，清洗任务超时

**缓解措施**:
- 优化数据库索引
- 使用批量操作
- 分批处理大量数据

### 风险 4: Nominatim 限流

**影响**: Geocoding 失败，无法验证坐标

**缓解措施**:
- 严格遵守 rate limit
- 使用缓存避免重复请求
- 考虑使用备用服务

---

## 下一步行动

### 立即开始（Day 1-3）

1. **创建数据模型**
   ```bash
   # 编辑 backend/app/db/models.py
   # 添加 DataQualityLog, DataCleaningBatch, GeocodingValidation
   ```

2. **创建数据库迁移**
   ```bash
   alembic revision --autogenerate -m "Add data cleaning tables"
   alembic upgrade head
   ```

3. **实现 Repository 类**
   ```bash
   # 编辑 backend/app/db/repository.py
   # 添加 DataQualityLogRepository, DataCleaningBatchRepository, GeocodingValidationRepository
   ```

4. **创建配置和基础类**
   ```bash
   mkdir -p backend/app/cleaning
   touch backend/app/cleaning/config.py
   touch backend/app/cleaning/models.py
   ```

### 本周目标（Day 1-7）

- ✅ Phase 1 完成（基础架构）
- ✅ Phase 2 开始（检测系统）
- ✅ 至少完成 ExtractionQualityDetector

### 下周目标（Day 8-14）

- ✅ Phase 2 完成（检测系统）
- ✅ Phase 3 完成（修复系统）
- ✅ Phase 4 开始（报告和监控）

### 第三周目标（Day 15-21）

- ✅ Phase 4 完成（报告和监控）
- ✅ Phase 5 完成（集成和测试）
- ✅ Phase 6 开始（部署）

---

## 成功标准

系统上线后，我们期望看到：

### 数据质量指标

- **提取准确率**: 从 ~85% 提升至 >95%
- **Geocoding 成功率**: 从 ~70% 提升至 >90%
- **地图可视化完整度**: 从 ~60% 提升至 >85%

### 运维指标

- **自动清洗覆盖率**: 100%（所有数据定期清洗）
- **修复成功率**: >80%
- **清洗任务成功率**: >95%
- **任务执行时间**: < 2 小时（增量模式）

### 业务指标

- **用户投诉减少**: 数据错误相关投诉减少 >50%
- **地图使用率提升**: 用户使用地图功能频率提升
- **平台可信度提升**: 用户满意度调查分数提升

---

## 版本历史

- **v1.0** (2026-01-27): 初始实施计划
  - 6 个 Phase 的详细计划
  - 任务清单和检查清单
  - 里程碑和风险分析
