# Fix China (Mainland) Country Name

## 问题描述
`institution_geo` 表中存在 `country='China (Mainland)'` 的记录，需要统一改为 `country='China'`。但直接更新可能会导致重复记录（相同的 normalized_name + country + city 组合）。

## 解决方案

提供两个SQL脚本：

### 选项1: 完整合并版本 `fix_china_mainland_country.sql`（推荐）
会智能合并冲突记录：

1. **识别冲突**：查找会导致重复的记录
2. **合并记录**：
   - 保留 `country='China'` 的记录
   - 将 `China (Mainland)` 记录的 aliases 合并到 China 记录
   - 如果 China (Mainland) 有更好的 QS 排名，则更新
   - 如果 China 记录缺少 ROR ID，从 China (Mainland) 复制
3. **删除冲突记录**：删除已合并的 `China (Mainland)` 记录
4. **更新剩余记录**：将其余的 `China (Mainland)` 直接改为 `China`

### 选项2: 简化版本 `fix_china_mainland_country_simple.sql`
快速简单，但会直接删除冲突记录：

1. **删除冲突**：直接删除会导致重复的 `China (Mainland)` 记录
2. **更新剩余**：将其余的 `China (Mainland)` 改为 `China`

⚠️ **注意**：简化版本不会保留冲突记录的信息（如aliases、QS rank等）

## 执行步骤

### 1. 先查看受影响的记录（可选但推荐）
```sql
-- 查看所有 China (Mainland) 记录
SELECT institution_id, primary_name, normalized_name, country, city, qs_rank, source 
FROM institution_geo 
WHERE country = 'China (Mainland)';

-- 查看可能的冲突
SELECT 
    cm.institution_id as mainland_id,
    cm.primary_name as mainland_name,
    c.institution_id as china_id,
    c.primary_name as china_name,
    cm.city
FROM institution_geo cm
INNER JOIN institution_geo c 
    ON cm.normalized_name = c.normalized_name
    AND (cm.city = c.city OR (cm.city IS NULL AND c.city IS NULL))
    AND c.country = 'China'
WHERE cm.country = 'China (Mainland)';
```

### 2. 执行修复脚本

#### 方法1: 使用psql命令行（推荐）
```bash
# 连接到数据库并执行SQL文件
psql "postgresql://user:password@host:port/database" -f scripts/fix_china_mainland_country.sql

# 或者使用环境变量中的DATABASE_URL
psql "$DATABASE_URL" -f scripts/fix_china_mainland_country.sql
```

#### 方法2: 使用Python脚本（需要backend环境）
```bash
# 确保在backend虚拟环境中
cd backend
source venv/bin/activate  # 或者你的虚拟环境激活命令

# 执行脚本（先dry-run查看）
python3 ../scripts/run_sql_script.py ../scripts/fix_china_mainland_country.sql --dry-run

# 确认无误后真正执行
python3 ../scripts/run_sql_script.py ../scripts/fix_china_mainland_country.sql
```

#### 方法3: 使用数据库管理工具
- 使用 pgAdmin, DBeaver, DataGrip 等工具
- 打开 `scripts/fix_china_mainland_country.sql` 文件
- 连接到目标数据库
- 执行整个脚本

### 3. 验证结果
```sql
-- 应该返回0条记录
SELECT COUNT(*) FROM institution_geo WHERE country = 'China (Mainland)';

-- 查看所有China记录
SELECT COUNT(*) FROM institution_geo WHERE country = 'China';

-- 查看更新后的具体记录
SELECT institution_id, primary_name, city, qs_rank, source 
FROM institution_geo 
WHERE country = 'China' 
ORDER BY qs_rank NULLS LAST;
```

## 注意事项

1. **备份建议**：虽然脚本使用了事务（BEGIN/COMMIT），建议在执行前备份数据库
2. **冲突处理**：如果有冲突，脚本会自动合并记录，优先保留 `country='China'` 的记录
3. **关联表影响**：此脚本只更新 `institution_geo` 表，不影响其他表（如 `authorship`）
4. **重新运行**：脚本是幂等的，可以安全地多次运行

## 相关修复

此修复配合后端代码修复（commit: 2aec4a5），确保：
- **已有数据**：通过此SQL统一 institution_geo 表
- **聚合数据**：通过后端代码在运行时合并统计
- **新数据**：通过更新的 extractor 避免产生新的 "China (Mainland)"
