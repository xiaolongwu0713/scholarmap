# 数据质量清洗系统 - 数据模型设计

## 📋 目录

- [概述](#概述)
- [新增数据表](#新增数据表)
- [数据流](#数据流)
- [表关系图](#表关系图)
- [索引设计](#索引设计)

---

## 概述

本文档定义数据质量清洗系统所需的新数据表。这些表用于记录错误检测、修复过程和质量报告。

### 设计原则

1. **可追溯性**：记录每个错误的完整生命周期
2. **可分析性**：支持错误趋势分析和质量监控
3. **可扩展性**：易于添加新的错误类型和检测方法
4. **性能优化**：合理的索引设计，支持高效查询

---

## 新增数据表

### 1. data_quality_logs

记录每个检测到的错误的详细信息。

```python
class DataQualityLog(Base):
    """数据质量日志表 - 记录每次检测到的错误和修复过程"""
    __tablename__ = "data_quality_logs"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 批次信息
    batch_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    # 关联信息
    authorship_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    pmid: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    
    # ==================== 错误信息 ====================
    
    # 错误类型：'extraction_error', 'geocoding_error', 'consistency_error'
    error_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    
    # 错误类别（具体子类型）
    error_category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # 可能的值：
    # - extraction_error: 'state_as_city', 'institution_as_city', 'department_as_city', 
    #                     'country_city_mismatch', 'low_confidence', 'missing_geo_data'
    # - geocoding_error: 'geocoding_null', 'wrong_coordinates', 'coordinate_anomaly'
    # - consistency_error: 'cache_inconsistent', 'duplicate_coordinates'
    
    # 严重程度：'critical', 'high', 'medium', 'low'
    severity: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    
    # ==================== 原始数据 ====================
    
    # 原始 affiliation 字符串
    original_affiliation: Mapped[str] = mapped_column(Text, nullable=False)
    
    # 原始提取的地理信息
    original_country: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_institution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # 原始坐标（JSON: {lat: float, lng: float}）
    original_coordinates: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    # ==================== 检测信息 ====================
    
    # 检测方法
    detection_method: Mapped[str] = mapped_column(String(100), nullable=False)
    # 可能的值：'geocoding_failure', 'validation_rule', 'confidence_threshold', 
    #           'reverse_geocoding', 'consistency_check'
    
    # 检测原因（详细描述）
    detection_reason: Mapped[str] = mapped_column(Text, nullable=False)
    
    # 检测时间
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    
    # ==================== 修复信息 ====================
    
    # 是否尝试修复
    fix_attempted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # 修复方法
    fix_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 可能的值：'llm_openai', 'llm_local', 'geocoding_retry', 
    #           'rule_correction', 'manual'
    
    # 修复后的地理信息
    fixed_country: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fixed_city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fixed_institution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # 修复后的坐标（JSON: {lat: float, lng: float}）
    fixed_coordinates: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    # 修复时间
    fixed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # 修复是否成功
    fix_success: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # 修复失败原因
    fix_failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # ==================== 验证信息 ====================
    
    # 是否已验证
    validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # 验证方法
    validation_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 可能的值：'reverse_geocoding', 'manual_review', 'cross_reference'
    
    # 验证置信度（0.0-1.0）
    validation_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )
    
    # 验证备注
    validation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # ==================== 元数据 ====================
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # 索引
    __table_args__ = (
        Index("idx_dql_batch_error_type", "batch_id", "error_type"),
        Index("idx_dql_severity_detected", "severity", "detected_at"),
        Index("idx_dql_fix_success", "fix_success", "fix_attempted"),
    )
```

### 2. data_cleaning_batches

记录每次清洗任务的汇总信息。

```python
class DataCleaningBatch(Base):
    """数据清洗批次表 - 记录每次清洗任务的汇总信息"""
    __tablename__ = "data_cleaning_batches"
    
    # 主键
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # 批次 ID（唯一标识符）
    batch_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    
    # ==================== 执行信息 ====================
    
    # 清洗模式：'full', 'incremental', 'validation_only'
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # 状态：'running', 'completed', 'failed'
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    
    # 时间
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # 执行时长（秒）
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # ==================== 统计信息 ====================
    
    # 检查的 authorships 总数
    total_authorships_checked: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # 检测到的错误总数
    errors_detected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # 按错误类型分组统计（JSON）
    errors_by_type: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    # 格式：{"extraction_error": 100, "geocoding_error": 50, "consistency_error": 10}
    
    # 按错误类别分组统计（JSON）
    errors_by_category: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    # 格式：{"state_as_city": 40, "geocoding_null": 30, ...}
    
    # 按严重程度分组统计（JSON）
    errors_by_severity: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    # 格式：{"critical": 10, "high": 50, "medium": 80, "low": 20}
    
    # 尝试修复的数量
    fixes_attempted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # 修复成功的数量
    fixes_successful: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # 修复失败的数量
    fixes_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # 修复成功率（0.0-1.0）
    fix_success_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # ==================== 配置信息 ====================
    
    # 检测配置（JSON）
    detection_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    # 格式：{"enable_extraction_check": true, "enable_geocoding_check": true, ...}
    
    # 修复配置（JSON）
    fix_config: Mapped[dict] = mapped_column(JSONB, nullable=False, default={})
    # 格式：{"use_local_llm": true, "llm_model": "llama3.1:8b", ...}
    
    # ==================== 报告 ====================
    
    # 汇总报告（Markdown 格式）
    summary_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # 错误日志文件路径（如果生成）
    error_log_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # ==================== 元数据 ====================
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # 索引
    __table_args__ = (
        Index("idx_dcb_status_started", "status", "started_at"),
    )
```

### 3. geocoding_validations

验证 geocoding 结果的正确性。

```python
class GeocodingValidation(Base):
    """Geocoding 验证表 - 验证坐标的正确性"""
    __tablename__ = "geocoding_validations"
    
    # 主键（location_key）
    location_key: Mapped[str] = mapped_column(String(500), primary_key=True)
    
    # 地理信息
    country: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    
    # ==================== Nominatim 结果 ====================
    
    # Nominatim 返回的坐标
    nominatim_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    nominatim_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # Nominatim 返回的完整地址
    nominatim_display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Nominatim 返回的详细信息（JSON）
    nominatim_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # 格式：{"country": "United States", "state": "Massachusetts", "city": "Boston", ...}
    
    # ==================== 验证信息 ====================
    
    # 是否已验证
    is_validated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    
    # 验证方法
    validation_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 可能的值：'reverse_geocoding', 'alternative_geocoder', 'manual_review', 'cross_reference'
    
    # 验证置信度（0.0-1.0）
    validation_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # 验证结果：'correct', 'incorrect', 'uncertain'
    validation_result: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
    # 验证备注
    validation_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # ==================== 修正信息 ====================
    
    # 如果发现错误，记录正确的坐标
    correct_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    correct_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    # 修正的来源
    correction_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # 可能的值：'google_maps', 'mapbox', 'manual', 'alternative_geocoder'
    
    # 修正时间
    corrected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # ==================== 元数据 ====================
    
    # 验证时间
    validated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
    
    # 索引
    __table_args__ = (
        Index("idx_gv_country_city", "country", "city"),
        Index("idx_gv_validated", "is_validated", "validation_result"),
    )
```

---

## 数据流

### 完整数据流图

```
┌─────────────────────────────────────────────────────────────┐
│                    数据清洗任务启动                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─> 创建 data_cleaning_batches 记录
                  │   （batch_id, mode, status='running'）
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              步骤 1: 选择要检查的 authorships               │
│  - full: 所有数据                                            │
│  - incremental: 最近 N 天的数据                             │
│  - validation_only: 有问题的数据                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              步骤 2: 检测错误                                │
│  - ExtractionQualityDetector                                 │
│  - GeocodingQualityDetector                                 │
│  - ConsistencyDetector                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─> 发现错误 → 创建 data_quality_logs 记录
                  │   （authorship_id, error_type, error_category, 
                  │    detection_method, original_data）
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              步骤 3: 修复错误（可选）                        │
│  - LLM 重新提取                                              │
│  - Geocoding 重试                                           │
│  - 验证修复结果                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─> 修复成功 → 更新 data_quality_logs
                  │   （fix_attempted=true, fix_method, fixed_data,
                  │    fix_success=true）
                  │
                  ├─> 修复失败 → 更新 data_quality_logs
                  │   （fix_attempted=true, fix_success=false,
                  │    fix_failure_reason）
                  │
                  ├─> 更新 affiliation_cache（修复的提取结果）
                  │
                  ├─> 更新 geocoding_cache（修复的坐标）
                  │   └─> 同时更新 geocoding_validations
                  │
                  └─> 更新 authorship 表（修复的地理信息）
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              步骤 4: 生成报告                                │
│  - 统计错误数量                                             │
│  - 分析错误趋势                                             │
│  - 评估修复效果                                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ├─> 更新 data_cleaning_batches
                  │   （status='completed', statistics, 
                  │    summary_report）
                  │
                  └─> 完成
```

---

## 表关系图

```
┌─────────────────────────────┐
│  data_cleaning_batches      │
│  ─────────────────────────  │
│  id (PK)                    │
│  batch_id (UNIQUE)          │
│  mode                       │
│  status                     │
│  statistics (JSONB)         │
│  summary_report (TEXT)      │
└──────────────┬──────────────┘
               │
               │ 1:N
               │
               ▼
┌─────────────────────────────┐        ┌──────────────────────┐
│  data_quality_logs          │ N:1    │  authorship          │
│  ─────────────────────────  │───────▶│  ──────────────────  │
│  id (PK)                    │        │  id (PK)             │
│  batch_id (FK)              │        │  pmid                │
│  authorship_id (FK)         │◀───────│  country             │
│  pmid                       │        │  city                │
│  error_type                 │        │  institution         │
│  error_category             │        └──────────────────────┘
│  severity                   │
│  original_data (JSONB)      │
│  fixed_data (JSONB)         │
│  fix_success                │
└─────────────────────────────┘
               │
               │
               │
               ▼
┌─────────────────────────────┐        ┌──────────────────────┐
│  geocoding_validations      │        │  geocoding_cache     │
│  ─────────────────────────  │        │  ──────────────────  │
│  location_key (PK)          │◀───────│  location_key (PK)   │
│  country                    │        │  latitude            │
│  city                       │        │  longitude           │
│  nominatim_lat              │        └──────────────────────┘
│  nominatim_lng              │
│  is_validated               │        ┌──────────────────────┐
│  validation_result          │        │  affiliation_cache   │
│  correct_lat (nullable)     │        │  ──────────────────  │
│  correct_lng (nullable)     │        │  affiliation_raw(PK) │
└─────────────────────────────┘        │  country             │
                                        │  city                │
                                        │  institution         │
                                        └──────────────────────┘
```

---

## 索引设计

### data_quality_logs 索引

```sql
-- 按批次和错误类型查询
CREATE INDEX idx_dql_batch_error_type ON data_quality_logs (batch_id, error_type);

-- 按严重程度和检测时间查询（用于趋势分析）
CREATE INDEX idx_dql_severity_detected ON data_quality_logs (severity, detected_at);

-- 按修复结果查询
CREATE INDEX idx_dql_fix_success ON data_quality_logs (fix_success, fix_attempted);

-- 按 authorship 查询（查看单个 authorship 的错误历史）
CREATE INDEX idx_dql_authorship_id ON data_quality_logs (authorship_id);

-- 按 PMID 查询（查看单个论文的所有错误）
CREATE INDEX idx_dql_pmid ON data_quality_logs (pmid);

-- 按错误类型查询
CREATE INDEX idx_dql_error_type ON data_quality_logs (error_type);

-- 按错误类别查询
CREATE INDEX idx_dql_error_category ON data_quality_logs (error_category);
```

### data_cleaning_batches 索引

```sql
-- 按批次 ID 查询（唯一索引）
CREATE UNIQUE INDEX idx_dcb_batch_id ON data_cleaning_batches (batch_id);

-- 按状态和开始时间查询
CREATE INDEX idx_dcb_status_started ON data_cleaning_batches (status, started_at);
```

### geocoding_validations 索引

```sql
-- 按国家和城市查询
CREATE INDEX idx_gv_country_city ON geocoding_validations (country, city);

-- 按验证结果查询
CREATE INDEX idx_gv_validated ON geocoding_validations (is_validated, validation_result);
```

---

## 数据库迁移

使用 Alembic 创建迁移脚本：

```bash
# 创建新的迁移
alembic revision --autogenerate -m "Add data cleaning tables"

# 应用迁移
alembic upgrade head
```

迁移脚本示例：

```python
"""Add data cleaning tables

Revision ID: xxxx
Revises: yyyy
Create Date: 2026-01-27

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'xxxx'
down_revision = 'yyyy'

def upgrade():
    # 创建 data_quality_logs 表
    op.create_table(
        'data_quality_logs',
        # ... 列定义 ...
    )
    
    # 创建索引
    op.create_index('idx_dql_batch_error_type', 'data_quality_logs', ['batch_id', 'error_type'])
    # ... 其他索引 ...
    
    # 创建 data_cleaning_batches 表
    op.create_table(
        'data_cleaning_batches',
        # ... 列定义 ...
    )
    
    # 创建 geocoding_validations 表
    op.create_table(
        'geocoding_validations',
        # ... 列定义 ...
    )

def downgrade():
    op.drop_table('geocoding_validations')
    op.drop_table('data_cleaning_batches')
    op.drop_table('data_quality_logs')
```

---

## 查询示例

### 1. 查询特定批次的所有错误

```python
async def get_batch_errors(batch_id: str) -> List[DataQualityLog]:
    """获取特定批次的所有错误"""
    result = await session.execute(
        select(DataQualityLog)
        .where(DataQualityLog.batch_id == batch_id)
        .order_by(DataQualityLog.severity.desc(), DataQualityLog.detected_at)
    )
    return result.scalars().all()
```

### 2. 统计错误类型分布

```python
async def get_error_distribution(start_date: datetime, end_date: datetime) -> Dict:
    """统计时间段内的错误类型分布"""
    result = await session.execute(
        select(
            DataQualityLog.error_category,
            func.count(DataQualityLog.id).label('count')
        )
        .where(DataQualityLog.detected_at.between(start_date, end_date))
        .group_by(DataQualityLog.error_category)
        .order_by(func.count(DataQualityLog.id).desc())
    )
    return {row.error_category: row.count for row in result}
```

### 3. 查询修复成功率

```python
async def get_fix_success_rate(batch_id: str) -> float:
    """计算特定批次的修复成功率"""
    result = await session.execute(
        select(
            func.count(DataQualityLog.id).filter(DataQualityLog.fix_attempted).label('attempted'),
            func.count(DataQualityLog.id).filter(DataQualityLog.fix_success).label('successful')
        )
        .where(DataQualityLog.batch_id == batch_id)
    )
    row = result.one()
    return row.successful / row.attempted if row.attempted > 0 else 0.0
```

### 4. 查询需要人工审核的错误

```python
async def get_errors_requiring_manual_review() -> List[DataQualityLog]:
    """查询需要人工审核的错误（修复失败或高严重度）"""
    result = await session.execute(
        select(DataQualityLog)
        .where(
            and_(
                DataQualityLog.fix_attempted == True,
                DataQualityLog.fix_success == False,
                DataQualityLog.severity.in_(['critical', 'high'])
            )
        )
        .order_by(DataQualityLog.severity.desc(), DataQualityLog.detected_at.desc())
    )
    return result.scalars().all()
```

---

## 版本历史

- **v1.0** (2026-01-27): 初始数据模型设计
  - data_quality_logs 表
  - data_cleaning_batches 表
  - geocoding_validations 表
