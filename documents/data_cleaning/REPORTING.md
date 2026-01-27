# 数据质量清洗系统 - 报告系统设计

## 📋 目录

- [概述](#概述)
- [报告类型](#报告类型)
- [报告生成器](#报告生成器)
- [报告格式](#报告格式)
- [质量指标](#质量指标)
- [趋势分析](#趋势分析)
- [可视化](#可视化)

---

## 概述

报告系统是数据清洗系统的重要组成部分，提供详细的清洗结果、错误分析和改进建议。

### 报告类型

1. **批次报告**：每次清洗任务的详细报告
2. **周期报告**：按天/周/月汇总的质量报告
3. **趋势报告**：数据质量趋势分析
4. **告警报告**：严重错误或异常情况的即时通知

---

## 报告生成器

### QualityReporter 类

**文件**: `backend/app/cleaning/reporting/quality_reporter.py`

```python
from typing import List, Dict
from datetime import datetime, timedelta
from backend.app.cleaning.models import ErrorRecord, FixResult
from backend.app.db.repository import DataQualityLogRepository, DataCleaningBatchRepository

class QualityReporter:
    """质量报告生成器"""
    
    def __init__(self):
        self.log_repo = DataQualityLogRepository()
        self.batch_repo = DataCleaningBatchRepository()
    
    async def generate_report(
        self,
        batch_id: str,
        errors: List[ErrorRecord],
        fixes: List[FixResult]
    ) -> str:
        """生成批次报告（Markdown 格式）"""
        
        # 1. 总体统计
        summary = self._generate_summary(errors, fixes)
        
        # 2. 错误分布
        error_dist = self._generate_error_distribution(errors)
        
        # 3. 修复详情
        fix_details = self._generate_fix_details(fixes)
        
        # 4. 成功案例
        success_cases = self._format_success_cases(fixes[:5])  # 前 5 个成功案例
        
        # 5. 失败案例
        failed_cases = self._format_failed_cases(
            [f for f in fixes if not f.success][:5]
        )
        
        # 6. 改进建议
        recommendations = self._generate_recommendations(errors, fixes)
        
        # 组装完整报告
        report = f"""
# 数据质量清洗报告

**批次 ID**: `{batch_id}`  
**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

## 📊 总体统计

{summary}

---

## 🔍 错误分布

{error_dist}

---

## 🔧 修复详情

{fix_details}

---

## ✅ 成功案例（Top 5）

{success_cases}

---

## ❌ 失败案例（需要人工介入）

{failed_cases}

---

## 💡 改进建议

{recommendations}

---

**报告生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        
        return report
    
    def _generate_summary(
        self,
        errors: List[ErrorRecord],
        fixes: List[FixResult]
    ) -> str:
        """生成总体统计"""
        
        total_errors = len(errors)
        fixes_attempted = len(fixes)
        fixes_successful = sum(1 for f in fixes if f.success)
        fixes_failed = fixes_attempted - fixes_successful
        success_rate = (fixes_successful / fixes_attempted * 100) if fixes_attempted > 0 else 0
        
        # 按严重程度统计
        critical = sum(1 for e in errors if e.severity == 'critical')
        high = sum(1 for e in errors if e.severity == 'high')
        medium = sum(1 for e in errors if e.severity == 'medium')
        low = sum(1 for e in errors if e.severity == 'low')
        
        return f"""
| 指标 | 数值 |
|------|------|
| **检测到的错误** | {total_errors} |
| **尝试修复** | {fixes_attempted} |
| **修复成功** | {fixes_successful} ({success_rate:.1f}%) |
| **修复失败** | {fixes_failed} |
| **Critical 错误** | {critical} 🔴 |
| **High 错误** | {high} 🟠 |
| **Medium 错误** | {medium} 🟡 |
| **Low 错误** | {low} 🟢 |
"""
    
    def _generate_error_distribution(
        self,
        errors: List[ErrorRecord]
    ) -> str:
        """生成错误分布"""
        
        # 按类型统计
        by_type = {}
        for error in errors:
            by_type[error.error_type] = by_type.get(error.error_type, 0) + 1
        
        # 按类别统计
        by_category = {}
        for error in errors:
            by_category[error.error_category] = by_category.get(error.error_category, 0) + 1
        
        # 生成表格
        type_table = "### 按错误类型\n\n| 类型 | 数量 | 占比 |\n|------|------|------|\n"
        total = len(errors)
        for error_type, count in sorted(by_type.items(), key=lambda x: x[1], reverse=True):
            pct = count / total * 100
            type_table += f"| {error_type} | {count} | {pct:.1f}% |\n"
        
        category_table = "\n### 按错误类别\n\n| 类别 | 数量 | 占比 | 严重程度 |\n|------|------|------|----------|\n"
        category_severity = self._get_category_severity_map()
        for category, count in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
            pct = count / total * 100
            severity = category_severity.get(category, 'UNKNOWN')
            type_table += f"| {category} | {count} | {pct:.1f}% | {severity} |\n"
        
        return type_table + category_table
    
    def _generate_fix_details(
        self,
        fixes: List[FixResult]
    ) -> str:
        """生成修复详情"""
        
        if not fixes:
            return "无修复操作\n"
        
        # 按修复方法统计
        by_method = {}
        for fix in fixes:
            by_method[fix.fix_method] = by_method.get(fix.fix_method, 0) + 1
        
        # 修复成功率（按方法）
        success_by_method = {}
        for fix in fixes:
            if fix.fix_method not in success_by_method:
                success_by_method[fix.fix_method] = {'total': 0, 'success': 0}
            success_by_method[fix.fix_method]['total'] += 1
            if fix.success:
                success_by_method[fix.fix_method]['success'] += 1
        
        table = "| 修复方法 | 总数 | 成功 | 失败 | 成功率 |\n"
        table += "|----------|------|------|------|--------|\n"
        
        for method, stats in success_by_method.items():
            total = stats['total']
            success = stats['success']
            failed = total - success
            rate = success / total * 100 if total > 0 else 0
            table += f"| {method} | {total} | {success} | {failed} | {rate:.1f}% |\n"
        
        return table
    
    def _format_success_cases(
        self,
        fixes: List[FixResult]
    ) -> str:
        """格式化成功案例"""
        
        if not fixes:
            return "无成功案例\n"
        
        cases = []
        for i, fix in enumerate(fixes, 1):
            case = f"""
### 案例 {i}

- **修复方法**: {fix.fix_method}
- **原始数据**: {fix.original_country}, {fix.original_city}
- **修复后**: {fix.fixed_country}, {fix.fixed_city}
- **坐标**: {fix.fixed_coordinates}
"""
            cases.append(case)
        
        return "\n".join(cases)
    
    def _format_failed_cases(
        self,
        fixes: List[FixResult]
    ) -> str:
        """格式化失败案例"""
        
        if not fixes:
            return "无失败案例 ✅\n"
        
        cases = []
        for i, fix in enumerate(fixes, 1):
            case = f"""
### 案例 {i}

- **修复方法**: {fix.fix_method}
- **原始数据**: {fix.original_country}, {fix.original_city}
- **失败原因**: {fix.failure_reason}
- **建议**: 需要人工审核
"""
            cases.append(case)
        
        return "\n".join(cases)
    
    def _generate_recommendations(
        self,
        errors: List[ErrorRecord],
        fixes: List[FixResult]
    ) -> str:
        """生成改进建议"""
        
        recommendations = []
        
        # 分析错误模式
        state_as_city_count = sum(1 for e in errors if e.error_category == 'state_as_city')
        if state_as_city_count > 10:
            recommendations.append(
                f"⚠️ **州缩写误识别**: 检测到 {state_as_city_count} 个州缩写被误识别为城市。"
                "建议优化 rule-based 提取器的州缩写验证逻辑。"
            )
        
        # 分析修复成功率
        llm_fixes = [f for f in fixes if 'llm' in f.fix_method]
        if llm_fixes:
            llm_success_rate = sum(1 for f in llm_fixes if f.success) / len(llm_fixes)
            if llm_success_rate < 0.8:
                recommendations.append(
                    f"⚠️ **LLM 修复成功率偏低**: 当前为 {llm_success_rate:.1%}。"
                    "建议优化 LLM prompt 或考虑使用更强大的模型。"
                )
        
        # 分析 geocoding 失败
        geo_null_count = sum(1 for e in errors if e.error_category == 'geocoding_null')
        if geo_null_count > 20:
            recommendations.append(
                f"⚠️ **Geocoding 失败率高**: 检测到 {geo_null_count} 个无法获取坐标的位置。"
                "建议检查 Nominatim 连接或考虑使用备用 geocoding 服务。"
            )
        
        if not recommendations:
            recommendations.append("✅ 数据质量良好，暂无改进建议。")
        
        return "\n\n".join(recommendations)
    
    def _get_category_severity_map(self) -> Dict[str, str]:
        """获取错误类别的严重程度映射"""
        return {
            'state_as_city': 'HIGH',
            'institution_as_city': 'MEDIUM',
            'department_as_city': 'MEDIUM',
            'low_confidence': 'LOW',
            'country_city_mismatch': 'HIGH',
            'missing_geo_data': 'HIGH',
            'geocoding_null': 'HIGH',
            'wrong_coordinates': 'CRITICAL',
            'coordinate_anomaly': 'HIGH',
        }
    
    async def generate_periodic_report(
        self,
        start_date: datetime,
        end_date: datetime,
        period: str = 'weekly'
    ) -> str:
        """生成周期报告（周报/月报）"""
        
        # 查询时间段内的所有批次
        batches = await self.batch_repo.get_batches_in_range(start_date, end_date)
        
        # 汇总统计
        total_errors = sum(b.errors_detected for b in batches)
        total_fixes = sum(b.fixes_attempted for b in batches)
        total_success = sum(b.fixes_successful for b in batches)
        
        # 生成报告
        report = f"""
# 数据质量{period}报告

**时间范围**: {start_date.strftime('%Y-%m-%d')} 至 {end_date.strftime('%Y-%m-%d')}

## 总体情况

- 清洗批次: {len(batches)}
- 检测错误: {total_errors}
- 修复成功: {total_success}/{total_fixes} ({total_success/total_fixes*100:.1f}%)

## 趋势图

{self._generate_trend_chart(batches)}

## 改进效果

{self._analyze_improvement(batches)}
"""
        
        return report
    
    def _generate_trend_chart(self, batches) -> str:
        """生成趋势图（ASCII 图表）"""
        # TODO: 实现简单的 ASCII 图表或返回数据供前端可视化
        return "趋势图数据（供可视化）\n"
    
    def _analyze_improvement(self, batches) -> str:
        """分析改进效果"""
        if len(batches) < 2:
            return "数据不足，无法分析趋势\n"
        
        # 对比首尾批次
        first = batches[0]
        last = batches[-1]
        
        error_rate_first = first.errors_detected / first.total_authorships_checked
        error_rate_last = last.errors_detected / last.total_authorships_checked
        
        improvement = (error_rate_first - error_rate_last) / error_rate_first * 100
        
        if improvement > 0:
            return f"✅ 数据质量提升 {improvement:.1f}%\n"
        else:
            return f"⚠️ 数据质量下降 {-improvement:.1f}%\n"
```

---

## 报告格式

### 批次报告示例

```markdown
# 数据质量清洗报告

**批次 ID**: `clean_20260127_020000`  
**生成时间**: 2026-01-27 02:15:32

---

## 📊 总体统计

| 指标 | 数值 |
|------|------|
| **检测到的错误** | 156 |
| **尝试修复** | 143 |
| **修复成功** | 124 (86.7%) |
| **修复失败** | 19 |
| **Critical 错误** | 5 🔴 |
| **High 错误** | 68 🟠 |
| **Medium 错误** | 71 🟡 |
| **Low 错误** | 12 🟢 |

---

## 🔍 错误分布

### 按错误类型

| 类型 | 数量 | 占比 |
|------|------|------|
| extraction_error | 89 | 57.1% |
| geocoding_error | 54 | 34.6% |
| consistency_error | 13 | 8.3% |

### 按错误类别

| 类别 | 数量 | 占比 | 严重程度 |
|------|------|------|----------|
| state_as_city | 42 | 26.9% | HIGH |
| geocoding_null | 38 | 24.4% | HIGH |
| institution_as_city | 24 | 15.4% | MEDIUM |
| low_confidence | 20 | 12.8% | LOW |
| wrong_coordinates | 5 | 3.2% | CRITICAL |
| ... | ... | ... | ... |

---

## 🔧 修复详情

| 修复方法 | 总数 | 成功 | 失败 | 成功率 |
|----------|------|------|------|--------|
| llm_openai | 89 | 76 | 13 | 85.4% |
| geocoding_retry | 54 | 48 | 6 | 88.9% |

---

## ✅ 成功案例（Top 5）

### 案例 1

- **修复方法**: llm_openai
- **原始数据**: United States, MD
- **修复后**: United States, Baltimore
- **坐标**: {'lat': 39.2904, 'lng': -76.6122}

### 案例 2

- **修复方法**: llm_openai
- **原始数据**: China, Harvard Medical School
- **修复后**: United States, Boston
- **坐标**: {'lat': 42.3601, 'lng': -71.0589}

...

---

## ❌ 失败案例（需要人工介入）

### 案例 1

- **修复方法**: llm_openai
- **原始数据**: Japan, NULL
- **失败原因**: Geocoding failed after LLM extraction
- **建议**: 需要人工审核原始 affiliation 字符串

...

---

## 💡 改进建议

⚠️ **州缩写误识别**: 检测到 42 个州缩写被误识别为城市。建议优化 rule-based 提取器的州缩写验证逻辑。

⚠️ **Geocoding 失败率高**: 检测到 38 个无法获取坐标的位置。建议检查 Nominatim 连接或考虑使用备用 geocoding 服务。

---

**报告生成时间**: 2026-01-27 02:15:32
```

---

## 质量指标

### QualityMetrics 类

**文件**: `backend/app/cleaning/metrics/quality_metrics.py`

```python
class QualityMetrics:
    """质量指标计算器"""
    
    async def calculate_metrics(
        self,
        batch_id: str
    ) -> Dict[str, float]:
        """计算质量指标"""
        
        batch = await self.batch_repo.get_by_batch_id(batch_id)
        
        if not batch:
            return {}
        
        # 1. 错误率
        error_rate = (
            batch.errors_detected / batch.total_authorships_checked
            if batch.total_authorships_checked > 0 else 0
        )
        
        # 2. 修复成功率
        fix_success_rate = batch.fix_success_rate or 0
        
        # 3. 数据完整度（有地理数据的比例）
        data_completeness = await self._calculate_data_completeness()
        
        # 4. Geocoding 成功率
        geocoding_success_rate = await self._calculate_geocoding_success_rate()
        
        # 5. 提取准确率（估算）
        extraction_accuracy = 1 - (
            batch.errors_by_type.get('extraction_error', 0) / 
            batch.total_authorships_checked
        )
        
        return {
            'error_rate': error_rate,
            'fix_success_rate': fix_success_rate,
            'data_completeness': data_completeness,
            'geocoding_success_rate': geocoding_success_rate,
            'extraction_accuracy': extraction_accuracy
        }
    
    async def _calculate_data_completeness(self) -> float:
        """计算数据完整度"""
        # 查询有地理数据的 authorships 比例
        total = await self.authorship_repo.count_all()
        with_geo = await self.authorship_repo.count_with_geo_data()
        return with_geo / total if total > 0 else 0
    
    async def _calculate_geocoding_success_rate(self) -> float:
        """计算 geocoding 成功率"""
        # 查询有坐标的 location_key 比例
        total = await self.geocoding_cache_repo.count_all()
        with_coords = await self.geocoding_cache_repo.count_with_coords()
        return with_coords / total if total > 0 else 0
```

### 核心指标定义

| 指标 | 定义 | 计算公式 | 目标值 |
|------|------|----------|--------|
| **错误率** | 检测到错误的 authorships 比例 | errors_detected / total_checked | < 15% |
| **修复成功率** | 修复成功的错误比例 | fixes_successful / fixes_attempted | > 80% |
| **数据完整度** | 有地理数据的 authorships 比例 | with_geo_data / total_authorships | > 85% |
| **Geocoding 成功率** | 有坐标的 location 比例 | with_coords / total_locations | > 90% |
| **提取准确率** | 提取正确的比例（估算） | 1 - extraction_errors / total | > 95% |

---

## 趋势分析

### 生成趋势数据

```python
async def get_trend_data(
    self,
    start_date: datetime,
    end_date: datetime,
    granularity: str = 'daily'
) -> List[Dict]:
    """获取趋势数据"""
    
    batches = await self.batch_repo.get_batches_in_range(start_date, end_date)
    
    # 按日期分组
    trend_data = []
    
    for batch in batches:
        metrics = await self.calculate_metrics(batch.batch_id)
        
        trend_data.append({
            'date': batch.started_at.strftime('%Y-%m-%d'),
            'error_rate': metrics['error_rate'],
            'fix_success_rate': metrics['fix_success_rate'],
            'data_completeness': metrics['data_completeness'],
            'geocoding_success_rate': metrics['geocoding_success_rate']
        })
    
    return trend_data
```

### 趋势图表数据格式

```json
[
  {
    "date": "2026-01-20",
    "error_rate": 0.18,
    "fix_success_rate": 0.82,
    "data_completeness": 0.75,
    "geocoding_success_rate": 0.85
  },
  {
    "date": "2026-01-21",
    "error_rate": 0.16,
    "fix_success_rate": 0.85,
    "data_completeness": 0.78,
    "geocoding_success_rate": 0.87
  },
  ...
]
```

---

## 可视化

### 前端集成（可选）

如果需要在前端显示数据质量报告，可以创建 API 端点：

```python
# backend/app/api/routes/cleaning.py

@router.get("/cleaning/reports/{batch_id}")
async def get_cleaning_report(batch_id: str):
    """获取清洗报告"""
    reporter = QualityReporter()
    report = await reporter.get_report_data(batch_id)
    return report

@router.get("/cleaning/trends")
async def get_quality_trends(
    start_date: str,
    end_date: str
):
    """获取质量趋势数据"""
    metrics = QualityMetrics()
    trends = await metrics.get_trend_data(
        datetime.fromisoformat(start_date),
        datetime.fromisoformat(end_date)
    )
    return trends
```

### Chart.js 示例

```typescript
// frontend/src/components/DataQualityDashboard.tsx

import { Line } from 'react-chartjs-2';

export function DataQualityTrends({ trends }) {
  const data = {
    labels: trends.map(t => t.date),
    datasets: [
      {
        label: 'Error Rate',
        data: trends.map(t => t.error_rate * 100),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Fix Success Rate',
        data: trends.map(t => t.fix_success_rate * 100),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  return <Line data={data} />;
}
```

---

## 报告存储

### 存储策略

1. **数据库存储**: 报告元数据和汇总信息存储在 `data_cleaning_batches.summary_report`
2. **文件存储**（可选）: 完整的 Markdown 报告存储为文件

```python
async def save_report_to_file(batch_id: str, report: str):
    """保存报告到文件"""
    
    report_dir = Path('reports/cleaning')
    report_dir.mkdir(parents=True, exist_ok=True)
    
    filename = f"{batch_id}.md"
    filepath = report_dir / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(report)
    
    return str(filepath)
```

---

## 版本历史

- **v1.0** (2026-01-27): 初始报告系统设计
  - 批次报告
  - 周期报告
  - 质量指标
  - 趋势分析
