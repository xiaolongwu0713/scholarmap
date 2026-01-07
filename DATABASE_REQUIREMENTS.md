# Affiliation 验证功能 - 数据库需求

## 结论

✅ **不需要数据库迁移或修改**。所有需要的表和字段都已经存在于数据库中。

## 使用的数据库表和字段

### 1. `affiliation_cache` 表

**用途**: 缓存 affiliation 提取结果（rule-based 或 LLM）

**使用的字段**:
- `affiliation_raw` (PRIMARY KEY, Text) - affiliation 字符串
- `country` (String(255), nullable) - 提取的国家名
- `city` (String(255), nullable) - 提取的城市名
- `institution` (String(500), nullable) - 提取的机构名
- `confidence` (String(20), not null) - 置信度（high/medium/low/none）
- `created_at` (DateTime, not null) - 创建时间

**操作**:
- ✅ 读取：检查缓存是否存在
- ✅ 写入：更新/覆盖错误的提取结果（LLM 修复后）

**状态**: ✅ 已存在（`backend/app/db/models.py::AffiliationCache`）

---

### 2. `geocoding_cache` 表

**用途**: 缓存地理位置坐标（country, city → latitude, longitude）

**使用的字段**:
- `location_key` (PRIMARY KEY, String(500)) - 格式: `"city:{city},{country}"` 或 `"country:{country}"`
- `latitude` (Float, nullable) - 纬度
- `longitude` (Float, nullable) - 经度
- `created_at` (DateTime, not null) - 创建时间

**操作**:
- ✅ 读取：检查是否已有 geocoding 结果（包括 null）
- ✅ 写入：存储新的 geocoding 结果（LLM 修复后重新 geocoding）

**状态**: ✅ 已存在（`backend/app/db/models.py::GeocodingCache`）

---

### 3. `authorship` 表

**用途**: 存储作者信息及其 affiliation 提取结果

**使用的字段**:
- `id` (PRIMARY KEY, Integer) - 用于更新特定记录
- `pmid` (String(32), indexed) - 论文 ID
- `country` (String(255), nullable, indexed) - 国家（可更新）
- `city` (String(255), nullable, indexed) - 城市（可更新）
- `institution` (String(500), nullable) - 机构（可更新）
- `affiliation_confidence` (String(20), not null) - 置信度（可更新）
- `affiliations_raw` (Text, not null) - 原始 affiliation JSON 数组（用于回溯）

**操作**:
- ✅ 读取：获取所有 authorships 用于验证
- ✅ 更新：修正错误的 country, city, institution, affiliation_confidence

**状态**: ✅ 已存在（`backend/app/db/models.py::Authorship`）

---

### 4. `run_papers` 表

**用途**: 关联 run 和 papers

**使用的字段**:
- `run_id` (String(64), indexed) - Run ID
- `pmid` (String(32), indexed) - 论文 ID

**操作**:
- ✅ 读取：获取指定 run 的所有 PMIDs

**状态**: ✅ 已存在（`backend/app/db/models.py::RunPaper`）

---

## 数据库初始化

### 当前状态

如果数据库已初始化，所有表应该已经存在。表通过以下方式创建：

1. **SQLAlchemy ORM**: 使用 `Base.metadata.create_all()` 创建表
2. **初始化脚本**: `backend/app/db/init_db.py`

### 验证表是否存在

可以运行以下命令验证：

```bash
# 在 backend 目录下
python -m app.db.init_db
```

或者如果表已经存在，SQLAlchemy 会跳过创建（不会报错）。

### 检查现有表

如果需要检查表是否已经创建，可以查询数据库：

```sql
-- PostgreSQL
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('affiliation_cache', 'geocoding_cache', 'authorship', 'run_papers');
```

或者通过 Python 代码：

```python
from app.db.connection import db_manager
from app.db.models import Base
from sqlalchemy import inspect

# 检查表是否存在
inspector = inspect(db_manager.engine)
tables = inspector.get_table_names()
print("Existing tables:", tables)
```

---

## 索引检查

所有需要的索引都已经定义在模型中：

1. **authorship 表**:
   - `idx_authorship_pmid_order` on (pmid, author_order)
   - `idx_authorship_country_city` on (country, city)

2. **run_papers 表**:
   - `idx_run_papers_unique` on (run_id, pmid) - unique constraint

---

## 迁移检查清单

### ✅ 不需要的操作

- ❌ 不需要创建新表
- ❌ 不需要添加新字段
- ❌ 不需要修改字段类型
- ❌ 不需要创建新索引
- ❌ 不需要数据库迁移脚本

### ✅ 需要确认的操作

1. **表已创建**: 确认 `affiliation_cache` 和 `geocoding_cache` 表已创建
   - 如果数据库是新创建的，运行 `init_db.py` 即可
   - 如果数据库已存在，表应该已经在之前的迁移中创建

2. **数据完整性**: 如果数据库中有旧数据，新功能会：
   - 自动使用现有的 `affiliation_cache` 数据
   - 检测和修复错误的提取结果
   - 不会破坏现有数据

---

## 测试建议

### 1. 功能测试

运行一次 ingestion 并检查：

```python
# 验证表存在且可访问
from app.db.connection import db_manager
from app.db.repository import (
    AffiliationCacheRepository,
    GeocodingCacheRepository,
    AuthorshipRepository,
)

async with db_manager.session() as session:
    aff_repo = AffiliationCacheRepository(session)
    geo_repo = GeocodingCacheRepository(session)
    auth_repo = AuthorshipRepository(session)
    
    # 测试读取（表应该存在）
    cached = await aff_repo.get_cached("test_affiliation")
    print("AffiliationCache table accessible:", cached is None)  # Should not raise error
```

### 2. 验证流程测试

执行一次 ingestion，检查日志中是否有：

```
Validation complete: X geocoding failures, Y unique error affiliations
Fixing Y error affiliations with LLM
Updated affiliation_cache with Y LLM results
Fixed Y affiliations: Z authorships updated, W locations re-geocoded
```

---

## 总结

**结论**: 🎉 **无需任何数据库修改或迁移**

所有需要的表和字段都已经存在，新功能可以直接使用现有数据库结构。只需要确保：

1. ✅ 数据库已初始化（表已创建）
2. ✅ 表结构与模型定义一致

如果数据库是新安装的，只需运行初始化脚本即可。

