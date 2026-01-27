# 数据质量清洗系统 - 修复策略详解

## 📋 目录

- [概述](#概述)
- [修复策略 1: LLM 重新提取](#修复策略-1-llm-重新提取)
- [修复策略 2: Geocoding 重试和验证](#修复策略-2-geocoding-重试和验证)
- [修复策略 3: 规则修正](#修复策略-3-规则修正)
- [本地 LLM 集成](#本地-llm-集成)
- [修复验证](#修复验证)

---

## 概述

数据修复系统根据错误类型选择不同的修复策略：

1. **LLM 重新提取**：用于提取错误
2. **Geocoding 重试**：用于 geocoding 错误
3. **规则修正**：用于简单的、可预测的错误

修复流程：

```
错误记录
  │
  ├─> 按错误类型分组
  │
  ├─> extraction_error → LLM 重新提取
  │
  ├─> geocoding_error → Geocoding 重试/验证
  │
  ├─> consistency_error → 规则修正
  │
  └─> 验证修复结果 → 更新数据库
```

---

## 修复策略 1: LLM 重新提取

### 适用场景

- 州缩写作为城市（state_as_city）
- 机构名作为城市（institution_as_city）
- 部门名作为城市（department_as_city）
- 低置信度（low_confidence）
- 缺失地理数据（missing_geo_data）

### DataFixer 实现

```python
# backend/app/cleaning/fixers/data_fixer.py

from typing import List, Dict
from backend.app.cleaning.models import ErrorRecord, FixResult
from backend.app.phase2.affiliation_extractor import AffiliationExtractor
from backend.app.cleaning.llm.local_llm import LocalLLM
from backend.app.phase2.pg_geocoding import PostgresGeocoder

class DataFixer:
    """数据修复器"""
    
    def __init__(self, use_local_llm: bool = False):
        if use_local_llm:
            self.llm_extractor = LocalLLM()
        else:
            self.llm_extractor = AffiliationExtractor()
        
        self.geocoder = PostgresGeocoder()
        self.use_local_llm = use_local_llm
    
    async def fix_errors(
        self,
        errors: List[ErrorRecord]
    ) -> List[FixResult]:
        """批量修复错误"""
        results = []
        
        # 按错误类型分组
        grouped = self._group_by_error_type(errors)
        
        # 1. 修复提取错误 -> 使用 LLM 重新提取
        if 'extraction_error' in grouped:
            extraction_results = await self._fix_extraction_errors(
                grouped['extraction_error']
            )
            results.extend(extraction_results)
        
        # 2. 修复 geocoding 错误 -> 重试或使用替代策略
        if 'geocoding_error' in grouped:
            geocoding_results = await self._fix_geocoding_errors(
                grouped['geocoding_error']
            )
            results.extend(geocoding_results)
        
        # 3. 修复一致性错误 -> 使用规则修正
        if 'consistency_error' in grouped:
            consistency_results = await self._fix_consistency_errors(
                grouped['consistency_error']
            )
            results.extend(consistency_results)
        
        return results
    
    async def _fix_extraction_errors(
        self,
        errors: List[ErrorRecord]
    ) -> List[FixResult]:
        """修复提取错误"""
        # 收集唯一的 affiliations
        affiliation_to_errors = {}
        for error in errors:
            aff = error.original_affiliation
            if aff not in affiliation_to_errors:
                affiliation_to_errors[aff] = []
            affiliation_to_errors[aff].append(error)
        
        unique_affiliations = list(affiliation_to_errors.keys())
        
        logger.info(f"🔧 Fixing {len(unique_affiliations)} unique affiliations with LLM...")
        logger.info(f"   Using {'local LLM' if self.use_local_llm else 'OpenAI'}")
        
        # 批量调用 LLM
        llm_results = await self.llm_extractor.extract_batch(
            unique_affiliations,
            batch_size=20
        )
        
        # 处理每个 affiliation 的修复结果
        fix_results = []
        
        for affiliation, geo_data in llm_results.items():
            errors_for_aff = affiliation_to_errors[affiliation]
            
            # 验证 LLM 结果
            if not self._validate_llm_result(geo_data):
                # LLM 结果也不合法
                for error in errors_for_aff:
                    fix_results.append(FixResult(
                        error_id=error.id,
                        success=False,
                        fix_method='llm_openai' if not self.use_local_llm else 'llm_local',
                        failure_reason='LLM result failed validation'
                    ))
                continue
            
            # 重新 geocoding
            coords = await self.geocoder.get_coordinates(
                geo_data.country,
                geo_data.city
            )
            
            # 验证坐标
            if coords:
                coords_valid = await self._validate_coordinates(
                    coords[0], coords[1],
                    geo_data.country, geo_data.city
                )
            else:
                coords_valid = False
            
            # 记录修复结果
            for error in errors_for_aff:
                if coords and coords_valid:
                    fix_results.append(FixResult(
                        error_id=error.id,
                        success=True,
                        fix_method='llm_openai' if not self.use_local_llm else 'llm_local',
                        fixed_country=geo_data.country,
                        fixed_city=geo_data.city,
                        fixed_institution=geo_data.institution,
                        fixed_coordinates={'lat': coords[0], 'lng': coords[1]}
                    ))
                else:
                    fix_results.append(FixResult(
                        error_id=error.id,
                        success=False,
                        fix_method='llm_openai' if not self.use_local_llm else 'llm_local',
                        failure_reason='Geocoding failed' if not coords else 'Coordinates validation failed',
                        fixed_country=geo_data.country,
                        fixed_city=geo_data.city,
                        fixed_institution=geo_data.institution
                    ))
            
            # 更新数据库
            if coords and coords_valid:
                await self._update_database(
                    affiliation, geo_data, coords, errors_for_aff
                )
        
        return fix_results
    
    def _validate_llm_result(self, geo_data) -> bool:
        """验证 LLM 提取结果"""
        # 应用相同的验证规则
        city = geo_data.city
        
        # 检查州缩写
        if self._is_state_abbreviation(city):
            return False
        
        # 检查机构关键词
        if self._contains_institution_keywords(city):
            return False
        
        # 检查部门关键词
        if city and any(city.lower().startswith(kw) for kw in ['department', 'division', 'section']):
            return False
        
        # 检查包含数字
        if city and any(c.isdigit() for c in city):
            return False
        
        # 检查过短
        if city and len(city) <= 2:
            return False
        
        return True
    
    async def _update_database(
        self,
        affiliation: str,
        geo_data,
        coords: Tuple[float, float],
        errors: List[ErrorRecord]
    ):
        """更新数据库"""
        # 1. 更新 affiliation_cache
        await self.affiliation_cache_repo.upsert({
            'affiliation_raw': affiliation,
            'country': geo_data.country,
            'city': geo_data.city,
            'institution': geo_data.institution,
            'confidence': geo_data.confidence
        })
        
        # 2. 更新 geocoding_cache
        location_key = self._make_location_key(geo_data.country, geo_data.city)
        await self.geocoding_cache_repo.upsert({
            'location_key': location_key,
            'latitude': coords[0],
            'longitude': coords[1]
        })
        
        # 3. 更新所有相关的 authorships
        authorship_ids = [error.authorship_id for error in errors]
        await self.authorship_repo.batch_update(
            authorship_ids,
            {
                'country': geo_data.country,
                'city': geo_data.city,
                'institution': geo_data.institution,
                'affiliation_confidence': geo_data.confidence
            }
        )
    
    def _group_by_error_type(
        self,
        errors: List[ErrorRecord]
    ) -> Dict[str, List[ErrorRecord]]:
        """按错误类型分组"""
        grouped = {}
        for error in errors:
            if error.error_type not in grouped:
                grouped[error.error_type] = []
            grouped[error.error_type].append(error)
        return grouped
```

### LLM 提取流程

```
唯一的 affiliations
  │
  ├─> 批量调用 LLM（batch_size=20）
  │   ├─ OpenAI GPT-4 或
  │   └─ 本地 Ollama（Llama 3.1）
  │
  ├─> 解析 LLM 返回的 JSON
  │
  ├─> 验证提取结果
  │   ├─ 检查州缩写
  │   ├─ 检查机构关键词
  │   └─ 检查其他规则
  │
  ├─> 重新 Geocoding
  │   └─> 验证坐标
  │
  └─> 更新数据库
      ├─ affiliation_cache
      ├─ geocoding_cache
      └─ authorship
```

---

## 修复策略 2: Geocoding 重试和验证

### 适用场景

- Geocoding null（geocoding_null）
- 坐标错误（wrong_coordinates）
- 坐标异常（coordinate_anomaly）

### 实现

```python
# backend/app/cleaning/fixers/data_fixer.py (续)

class DataFixer:
    # ... 前面的代码 ...
    
    async def _fix_geocoding_errors(
        self,
        errors: List[ErrorRecord]
    ) -> List[FixResult]:
        """修复 geocoding 错误"""
        fix_results = []
        
        for error in errors:
            country = error.original_country
            city = error.original_city
            
            if not country:
                # 无国家信息，无法修复
                fix_results.append(FixResult(
                    error_id=error.id,
                    success=False,
                    fix_method='geocoding_retry',
                    failure_reason='Missing country information'
                ))
                continue
            
            # 策略 1: 直接重试（可能之前 Nominatim 临时故障）
            coords = await self.geocoder.get_coordinates(country, city, force_refresh=True)
            
            if not coords:
                # 策略 2: 尝试不同的查询格式
                coords = await self._try_alternative_geocoding(country, city)
            
            if coords:
                # 验证坐标
                coords_valid = await self._validate_coordinates(
                    coords[0], coords[1], country, city
                )
                
                if coords_valid:
                    # 修复成功
                    fix_results.append(FixResult(
                        error_id=error.id,
                        success=True,
                        fix_method='geocoding_retry',
                        fixed_coordinates={'lat': coords[0], 'lng': coords[1]}
                    ))
                    
                    # 更新 geocoding_cache
                    location_key = self._make_location_key(country, city)
                    await self.geocoding_cache_repo.upsert({
                        'location_key': location_key,
                        'latitude': coords[0],
                        'longitude': coords[1]
                    })
                else:
                    # 坐标验证失败
                    fix_results.append(FixResult(
                        error_id=error.id,
                        success=False,
                        fix_method='geocoding_retry',
                        failure_reason='Coordinates validation failed'
                    ))
            else:
                # 无法获取坐标，可能需要 LLM 重新提取
                fix_results.append(FixResult(
                    error_id=error.id,
                    success=False,
                    fix_method='geocoding_retry',
                    failure_reason='Geocoding failed after retry'
                ))
        
        return fix_results
    
    async def _try_alternative_geocoding(
        self,
        country: str,
        city: str | None
    ) -> Tuple[float, float] | None:
        """尝试替代的 geocoding 策略"""
        # 策略 1: 添加国家名到城市查询
        if city:
            query = f"{city}, {country}"
            coords = await self._geocode_query(query)
            if coords:
                return coords
        
        # 策略 2: 只使用国家
        coords = await self._geocode_query(country)
        if coords:
            return coords
        
        # 策略 3: 使用国家的别名
        country_aliases = self._get_country_aliases(country)
        for alias in country_aliases:
            if city:
                query = f"{city}, {alias}"
            else:
                query = alias
            
            coords = await self._geocode_query(query)
            if coords:
                return coords
        
        return None
    
    def _get_country_aliases(self, country: str) -> List[str]:
        """获取国家的别名"""
        aliases_map = {
            'United States': ['USA', 'US', 'United States of America'],
            'United Kingdom': ['UK', 'Great Britain', 'Britain'],
            'South Korea': ['Korea', 'Republic of Korea', 'ROK'],
            'China': ['PRC', 'People\'s Republic of China'],
            # ... 更多别名
        }
        return aliases_map.get(country, [])
```

### Geocoding 修复流程

```
Geocoding 错误
  │
  ├─> 策略 1: 直接重试（force_refresh=True）
  │
  ├─> 策略 2: 尝试不同查询格式
  │   ├─ "{city}, {country}"
  │   ├─ "{country}" only
  │   └─ 使用国家别名
  │
  ├─> 验证坐标（反向 geocoding）
  │
  └─> 更新 geocoding_cache
```

---

## 修复策略 3: 规则修正

### 适用场景

某些简单的、可预测的错误可以用规则直接修正，无需 LLM：

- 已知的州缩写 → 城市映射
- 常见的机构缩写 → 全名

### 实现

```python
# backend/app/cleaning/fixers/rule_fixer.py

class RuleFixer:
    """基于规则的修复器"""
    
    # 州缩写 → 首府/最大城市映射
    STATE_TO_CITY = {
        'MA': ('Boston', 'United States'),
        'CA': ('Los Angeles', 'United States'),
        'NY': ('New York', 'United States'),
        'TX': ('Houston', 'United States'),
        # ... 更多映射
    }
    
    def can_fix_with_rules(self, error: ErrorRecord) -> bool:
        """判断是否可以用规则修复"""
        if error.error_category == 'state_as_city':
            return error.original_city in self.STATE_TO_CITY
        return False
    
    def fix_with_rules(self, error: ErrorRecord) -> FixResult:
        """使用规则修复"""
        if error.error_category == 'state_as_city':
            city, country = self.STATE_TO_CITY[error.original_city]
            return FixResult(
                error_id=error.id,
                success=True,
                fix_method='rule_correction',
                fixed_city=city,
                fixed_country=country
            )
        
        return FixResult(
            error_id=error.id,
            success=False,
            fix_method='rule_correction',
            failure_reason='No rule available'
        )
```

---

## 本地 LLM 集成

### Ollama 安装和配置

#### 1. 安装 Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# 启动 Ollama 服务
ollama serve
```

#### 2. 下载模型

```bash
# 推荐：Llama 3.1 8B（平衡性能和准确度）
ollama pull llama3.1:8b

# 或者：Mistral 7B（更快）
ollama pull mistral:7b

# 或者：Qwen 2.5 7B（中文支持更好）
ollama pull qwen2.5:7b
```

### LocalLLM 实现

```python
# backend/app/cleaning/llm/local_llm.py

import httpx
import asyncio
import json
from typing import List, Dict

class LocalLLM:
    """本地 LLM 提取器（使用 Ollama）"""
    
    def __init__(self, model: str = "llama3.1:8b", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url
    
    async def extract_batch(
        self,
        affiliations: List[str],
        batch_size: int = 10
    ) -> Dict[str, 'GeoData']:
        """批量提取地理信息"""
        results = {}
        
        for i in range(0, len(affiliations), batch_size):
            batch = affiliations[i:i+batch_size]
            
            # 构建 prompt
            prompt = self._build_prompt(batch)
            
            # 调用 Ollama API
            try:
                response_text = await self._call_ollama(prompt)
                
                # 解析结果
                parsed = self._parse_response(response_text, batch)
                results.update(parsed)
                
            except Exception as e:
                logger.error(f"Local LLM extraction failed for batch: {e}")
                # 对失败的 batch 返回空结果
                for aff in batch:
                    results[aff] = GeoData(
                        country=None,
                        city=None,
                        institution=None,
                        confidence='none'
                    )
            
            # 本地 LLM 不需要严格的 rate limiting
            await asyncio.sleep(0.5)
        
        return results
    
    def _build_prompt(self, affiliations: List[str]) -> str:
        """构建 prompt"""
        # 读取 prompt 模板
        with open('prompts/affiliation_extraction.md', 'r') as f:
            template = f.read()
        
        # 格式化 affiliations
        aff_list = "\n".join([f"{i+1}. {aff}" for i, aff in enumerate(affiliations)])
        
        prompt = template.replace("{{affiliations}}", aff_list)
        
        # 添加 JSON 格式要求
        prompt += "\n\nRespond with ONLY a JSON array, no other text. Format: [{\"country\": \"...\", \"city\": \"...\", \"institution\": \"...\"}, ...]"
        
        return prompt
    
    async def _call_ollama(self, prompt: str) -> str:
        """调用 Ollama API"""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,  # 低温度以提高一致性
                "top_p": 0.9,
            }
        }
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            return data['response']
    
    def _parse_response(
        self,
        response_text: str,
        affiliations: List[str]
    ) -> Dict[str, 'GeoData']:
        """解析 LLM 响应"""
        # 尝试提取 JSON
        try:
            # 查找 JSON 数组
            start = response_text.find('[')
            end = response_text.rfind(']') + 1
            
            if start == -1 or end == 0:
                raise ValueError("No JSON array found in response")
            
            json_str = response_text[start:end]
            data = json.loads(json_str)
            
            # 映射回 affiliations
            results = {}
            for i, aff in enumerate(affiliations):
                if i < len(data):
                    item = data[i]
                    results[aff] = GeoData(
                        country=item.get('country'),
                        city=item.get('city'),
                        institution=item.get('institution'),
                        confidence='high'  # 本地 LLM 的置信度默认为 high
                    )
                else:
                    results[aff] = GeoData(
                        country=None,
                        city=None,
                        institution=None,
                        confidence='none'
                    )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.debug(f"Response text: {response_text}")
            
            # 返回空结果
            return {aff: GeoData(None, None, None, 'none') for aff in affiliations}
```

### 配置选择

```python
# backend/app/cleaning/config.py

class CleaningConfig:
    """清洗任务配置"""
    
    # LLM 配置
    use_local_llm: bool = False  # 是否使用本地 LLM
    local_llm_model: str = "llama3.1:8b"  # 本地 LLM 模型
    local_llm_url: str = "http://localhost:11434"  # Ollama API URL
    
    # OpenAI 配置
    openai_api_key: str = ""  # 从环境变量读取
    openai_model: str = "gpt-4"
    
    # Rate limiting
    rate_limit_delay: float = 2.0  # OpenAI 的延迟
    local_llm_delay: float = 0.5  # 本地 LLM 的延迟
```

### 本地 LLM vs OpenAI 对比

| 特性 | 本地 LLM (Ollama) | OpenAI GPT-4 |
|------|-------------------|--------------|
| **成本** | 🟢 免费 | 🔴 按 token 计费 |
| **速度** | 🟡 中等（取决于硬件） | 🟢 快 |
| **准确度** | 🟡 良好（~90%） | 🟢 优秀（~95%） |
| **隐私** | 🟢 数据不离开本地 | 🔴 数据发送到 OpenAI |
| **限制** | 🟢 无 API 限制 | 🔴 有 rate limit |
| **硬件要求** | 🔴 需要 GPU（推荐） | 🟢 无要求 |

**建议**：
- **开发/测试**：使用本地 LLM
- **生产环境（小规模）**：使用 OpenAI
- **生产环境（大规模）**：使用本地 LLM（成本效益）

---

## 修复验证

### 验证流程

每个修复结果都需要经过验证：

```python
class FixValidator:
    """修复验证器"""
    
    async def validate_fix(self, fix_result: FixResult) -> bool:
        """验证修复结果"""
        # 1. 检查修复的数据是否合法
        if not self._is_valid_geo_data(fix_result):
            return False
        
        # 2. 检查坐标是否有效
        if fix_result.fixed_coordinates:
            if not self._is_valid_coordinates(fix_result.fixed_coordinates):
                return False
            
            # 3. 反向 geocoding 验证
            if not await self._reverse_geocode_validate(fix_result):
                return False
        
        return True
    
    def _is_valid_geo_data(self, fix_result: FixResult) -> bool:
        """检查地理数据是否合法"""
        # 应用相同的验证规则
        city = fix_result.fixed_city
        
        if not city:
            return True  # 允许城市为空
        
        # 检查州缩写
        if city.upper() in US_STATE_ABBRS:
            return False
        
        # 检查机构关键词
        if any(kw in city.lower() for kw in INSTITUTION_KEYWORDS):
            return False
        
        return True
```

---

## 版本历史

- **v1.0** (2026-01-27): 初始修复策略设计
  - LLM 重新提取
  - Geocoding 重试
  - 规则修正
  - 本地 LLM 支持
