# 数据质量清洗系统 - 检测策略详解

## 📋 目录

- [概述](#概述)
- [检测层级 1: 提取质量检测](#检测层级-1-提取质量检测)
- [检测层级 2: Geocoding 质量检测](#检测层级-2-geocoding-质量检测)
- [检测层级 3: 数据一致性检测](#检测层级-3-数据一致性检测)
- [错误分类和优先级](#错误分类和优先级)

---

## 概述

数据质量检测系统采用**三层检测机制**，从不同维度检测数据质量问题：

1. **提取质量检测**：检测地理信息提取过程中的错误
2. **Geocoding 质量检测**：检测坐标获取过程中的错误
3. **数据一致性检测**：检测数据库表之间的不一致

每层检测器独立运行，产生错误记录，最后汇总分析。

---

## 检测层级 1: 提取质量检测

### ExtractionQualityDetector

检测从 affiliation 字符串中提取地理信息（country/city/institution）的质量。

#### 代码实现

```python
# backend/app/cleaning/detectors/extraction_detector.py

from typing import List
from backend.app.db.models import Authorship
from backend.app.cleaning.models import ErrorRecord

class ExtractionQualityDetector:
    """提取质量检测器"""
    
    # 美国州缩写列表
    US_STATE_ABBRS = {
        "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
        "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
        "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
        "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
        "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
    }
    
    # 机构关键词
    INSTITUTION_KEYWORDS = {
        "university", "college", "institute", "school", "hospital",
        "center", "laboratory", "clinic", "academy", "foundation"
    }
    
    # 部门关键词
    DEPARTMENT_KEYWORDS = {
        "department", "division", "section", "unit", "group",
        "lab", "faculty", "office"
    }
    
    async def detect_extraction_errors(
        self, 
        authorships: List[Authorship]
    ) -> List[ErrorRecord]:
        """检测提取错误"""
        errors = []
        
        for auth in authorships:
            # 规则 1: 检测州缩写作为城市
            if self._is_state_abbreviation(auth.city):
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='state_as_city',
                    severity='high',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" is a U.S. state abbreviation'
                ))
            
            # 规则 2: 检测机构名作为城市
            if self._contains_institution_keywords(auth.city):
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='institution_as_city',
                    severity='medium',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" contains institution keywords'
                ))
            
            # 规则 3: 检测部门名作为城市
            if self._contains_department_keywords(auth.city):
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='department_as_city',
                    severity='medium',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" contains department keywords'
                ))
            
            # 规则 4: 检测置信度低的提取
            if auth.affiliation_confidence in ['low', 'none']:
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='low_confidence',
                    severity='low' if auth.affiliation_confidence == 'low' else 'medium',
                    detection_method='confidence_threshold',
                    detection_reason=f'Affiliation confidence is {auth.affiliation_confidence}'
                ))
            
            # 规则 5: 检测国家/城市不匹配
            if not await self._is_city_in_country(auth.city, auth.country):
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='country_city_mismatch',
                    severity='high',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" does not belong to country "{auth.country}"'
                ))
            
            # 规则 6: 检测空值但有 affiliation
            if auth.has_author_affiliation and not auth.city and not auth.country:
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='missing_geo_data',
                    severity='high',
                    detection_method='validation_rule',
                    detection_reason='Has affiliation but no geographic data extracted'
                ))
            
            # 规则 7: 检测城市名包含数字
            if auth.city and any(char.isdigit() for char in auth.city):
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='city_contains_numbers',
                    severity='high',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" contains numbers'
                ))
            
            # 规则 8: 检测过短的城市名（可能是缩写）
            if auth.city and len(auth.city) <= 2:
                errors.append(self._create_error_record(
                    authorship=auth,
                    error_category='city_too_short',
                    severity='medium',
                    detection_method='validation_rule',
                    detection_reason=f'City "{auth.city}" is suspiciously short (≤2 chars)'
                ))
        
        return errors
    
    def _is_state_abbreviation(self, city: str | None) -> bool:
        """检查是否为美国州缩写"""
        if not city:
            return False
        return city.upper().strip() in self.US_STATE_ABBRS
    
    def _contains_institution_keywords(self, city: str | None) -> bool:
        """检查是否包含机构关键词"""
        if not city:
            return False
        city_lower = city.lower()
        return any(keyword in city_lower for keyword in self.INSTITUTION_KEYWORDS)
    
    def _contains_department_keywords(self, city: str | None) -> bool:
        """检查是否包含部门关键词"""
        if not city:
            return False
        city_lower = city.lower()
        # 检查是否以部门关键词开头
        return any(city_lower.startswith(keyword) for keyword in self.DEPARTMENT_KEYWORDS)
    
    async def _is_city_in_country(self, city: str | None, country: str | None) -> bool:
        """验证城市是否属于该国家"""
        if not city or not country:
            return True  # 如果缺失，不算错误
        
        # TODO: 实现城市-国家验证逻辑
        # 可以使用：
        # - 本地城市数据库（如 GeoNames）
        # - 调用 Nominatim 搜索
        # - 使用 pycountry 等库
        
        # 临时实现：跳过验证
        return True
    
    def _create_error_record(
        self,
        authorship: Authorship,
        error_category: str,
        severity: str,
        detection_method: str,
        detection_reason: str
    ) -> ErrorRecord:
        """创建错误记录"""
        return ErrorRecord(
            authorship_id=authorship.id,
            pmid=authorship.pmid,
            error_type='extraction_error',
            error_category=error_category,
            severity=severity,
            detection_method=detection_method,
            detection_reason=detection_reason,
            original_affiliation=authorship.affiliation_raw_joined,
            original_country=authorship.country,
            original_city=authorship.city,
            original_institution=authorship.institution
        )
```

#### 检测规则总结

| 规则 ID | 检测内容 | 错误类别 | 严重程度 | 示例 |
|---------|----------|----------|----------|------|
| 1 | 州缩写作为城市 | `state_as_city` | HIGH | MD, OH, CA |
| 2 | 机构名作为城市 | `institution_as_city` | MEDIUM | Harvard Medical School |
| 3 | 部门名作为城市 | `department_as_city` | MEDIUM | Department of Neurology |
| 4 | 低置信度提取 | `low_confidence` | LOW/MEDIUM | confidence='low' or 'none' |
| 5 | 国家城市不匹配 | `country_city_mismatch` | HIGH | Paris in China |
| 6 | 有 affiliation 但无地理数据 | `missing_geo_data` | HIGH | affiliation 存在但 city/country 为空 |
| 7 | 城市名包含数字 | `city_contains_numbers` | HIGH | Boston123 |
| 8 | 城市名过短 | `city_too_short` | MEDIUM | MA, NY |

---

## 检测层级 2: Geocoding 质量检测

### GeocodingQualityDetector

检测从 country/city 获取坐标的质量。

#### 代码实现

```python
# backend/app/cleaning/detectors/geocoding_detector.py

import httpx
from typing import List, Tuple, Dict
from backend.app.db.models import Authorship
from backend.app.phase2.pg_geocoding import PostgresGeocoder
from backend.app.cleaning.models import ErrorRecord

class GeocodingQualityDetector:
    """Geocoding 质量检测器"""
    
    def __init__(self):
        self.geocoder = PostgresGeocoder()
        self._reverse_geocode_cache = {}
    
    async def detect_geocoding_errors(
        self,
        authorships: List[Authorship]
    ) -> List[ErrorRecord]:
        """检测 geocoding 错误"""
        errors = []
        
        # 收集唯一的 location_key
        location_keys = set()
        location_to_authorships = {}
        
        for auth in authorships:
            if not auth.country:
                continue
            
            location_key = self._make_location_key(auth.country, auth.city)
            location_keys.add(location_key)
            
            if location_key not in location_to_authorships:
                location_to_authorships[location_key] = []
            location_to_authorships[location_key].append(auth)
        
        # 批量获取 geocoding 结果
        cached_results = await self._batch_get_cached_coordinates(location_keys)
        
        # 检查每个 location
        for location_key, coords_data in cached_results.items():
            authorships_for_location = location_to_authorships[location_key]
            country, city = self._parse_location_key(location_key)
            
            # 规则 1: Null 坐标
            if coords_data is None or coords_data.get('latitude') is None:
                for auth in authorships_for_location:
                    errors.append(self._create_error_record(
                        authorship=auth,
                        error_category='geocoding_null',
                        severity='high',
                        detection_method='geocoding_failure',
                        detection_reason=f'No coordinates found for location: {location_key}'
                    ))
                continue
            
            lat, lng = coords_data['latitude'], coords_data['longitude']
            
            # 规则 2: 反向验证（坐标 → 地址）
            if not await self._validate_coordinates(lat, lng, country, city):
                for auth in authorships_for_location:
                    errors.append(self._create_error_record(
                        authorship=auth,
                        error_category='wrong_coordinates',
                        severity='critical',
                        detection_method='reverse_geocoding',
                        detection_reason=f'Reverse geocoding mismatch for {location_key} at ({lat}, {lng})',
                        coordinates={'lat': lat, 'lng': lng}
                    ))
            
            # 规则 3: 坐标异常检测
            if self._is_coordinate_anomaly(lat, lng, country):
                for auth in authorships_for_location:
                    errors.append(self._create_error_record(
                        authorship=auth,
                        error_category='coordinate_anomaly',
                        severity='high',
                        detection_method='anomaly_detection',
                        detection_reason=f'Coordinates ({lat}, {lng}) appear anomalous for {country}',
                        coordinates={'lat': lat, 'lng': lng}
                    ))
        
        return errors
    
    async def _validate_coordinates(
        self,
        lat: float,
        lng: float,
        expected_country: str,
        expected_city: str | None
    ) -> bool:
        """反向 geocoding 验证坐标是否正确"""
        # 检查缓存
        cache_key = f"{lat},{lng}"
        if cache_key in self._reverse_geocode_cache:
            result = self._reverse_geocode_cache[cache_key]
        else:
            # 调用 Nominatim reverse API
            result = await self._reverse_geocode(lat, lng)
            self._reverse_geocode_cache[cache_key] = result
        
        if not result:
            return True  # 无法验证，假设正确
        
        # 检查国家是否匹配
        result_country = result.get('country', '')
        if not self._normalize_country(result_country) == self._normalize_country(expected_country):
            return False
        
        # 如果有城市，检查城市是否匹配
        if expected_city:
            result_city = result.get('city') or result.get('town') or result.get('village') or ''
            if result_city and not self._normalize_city(result_city) == self._normalize_city(expected_city):
                return False
        
        return True
    
    async def _reverse_geocode(self, lat: float, lng: float) -> Dict | None:
        """反向 geocoding（坐标 → 地址）"""
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            'lat': lat,
            'lon': lng,
            'format': 'json',
            'addressdetails': 1
        }
        headers = {'User-Agent': 'ScholarMap/1.0'}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    return data.get('address', {})
        except Exception:
            pass
        
        return None
    
    def _is_coordinate_anomaly(self, lat: float, lng: float, country: str) -> bool:
        """检测坐标异常"""
        # 规则 1: 坐标超出有效范围
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return True
        
        # 规则 2: 坐标在海洋中心（简单检查）
        # TODO: 使用更精确的陆地/海洋数据
        
        # 规则 3: 坐标与国家的典型范围不匹配
        # TODO: 实现国家边界检查
        
        return False
    
    def _make_location_key(self, country: str, city: str | None) -> str:
        """生成 location_key"""
        if city:
            return f"city:{city},{country}"
        return f"country:{country}"
    
    def _parse_location_key(self, location_key: str) -> Tuple[str, str | None]:
        """解析 location_key"""
        if location_key.startswith("city:"):
            parts = location_key[5:].split(",", 1)
            return parts[1], parts[0] if len(parts) == 2 else None
        elif location_key.startswith("country:"):
            return location_key[8:], None
        return location_key, None
    
    def _normalize_country(self, country: str) -> str:
        """规范化国家名"""
        # 去除空格，转小写
        normalized = country.strip().lower()
        
        # 常见别名映射
        aliases = {
            'usa': 'united states',
            'us': 'united states',
            'uk': 'united kingdom',
            'korea': 'south korea',
            # ... 更多别名
        }
        
        return aliases.get(normalized, normalized)
    
    def _normalize_city(self, city: str) -> str:
        """规范化城市名"""
        return city.strip().lower()
    
    async def _batch_get_cached_coordinates(
        self,
        location_keys: set
    ) -> Dict[str, Dict | None]:
        """批量获取缓存的坐标"""
        # TODO: 实现批量查询 geocoding_cache
        results = {}
        for key in location_keys:
            # 查询数据库
            cached = await self.geocoder.cache_repo.get_cached(key)
            if cached:
                results[key] = {
                    'latitude': cached.latitude,
                    'longitude': cached.longitude
                }
            else:
                results[key] = None
        return results
    
    def _create_error_record(
        self,
        authorship: Authorship,
        error_category: str,
        severity: str,
        detection_method: str,
        detection_reason: str,
        coordinates: Dict | None = None
    ) -> ErrorRecord:
        """创建错误记录"""
        return ErrorRecord(
            authorship_id=authorship.id,
            pmid=authorship.pmid,
            error_type='geocoding_error',
            error_category=error_category,
            severity=severity,
            detection_method=detection_method,
            detection_reason=detection_reason,
            original_affiliation=authorship.affiliation_raw_joined,
            original_country=authorship.country,
            original_city=authorship.city,
            original_institution=authorship.institution,
            original_coordinates=coordinates
        )
```

#### 检测规则总结

| 规则 ID | 检测内容 | 错误类别 | 严重程度 | 说明 |
|---------|----------|----------|----------|------|
| 1 | Null 坐标 | `geocoding_null` | HIGH | geocoding_cache 中坐标为 null |
| 2 | 坐标错误 | `wrong_coordinates` | CRITICAL | 反向 geocoding 验证不匹配 |
| 3 | 坐标异常 | `coordinate_anomaly` | HIGH | 坐标在海洋、沙漠等异常位置 |

---

## 检测层级 3: 数据一致性检测

### ConsistencyDetector

检测数据库表之间的不一致。

#### 代码实现

```python
# backend/app/cleaning/detectors/consistency_detector.py

from typing import List
from sqlalchemy import select, and_
from backend.app.db.models import Authorship, AffiliationCache, GeocodingCache
from backend.app.cleaning.models import ErrorRecord

class ConsistencyDetector:
    """数据一致性检测器"""
    
    async def detect_inconsistencies(self) -> List[ErrorRecord]:
        """检测数据不一致"""
        errors = []
        
        # 规则 1: affiliation_cache vs authorship 不一致
        errors.extend(await self._detect_cache_inconsistency())
        
        # 规则 2: 重复/冲突的坐标
        errors.extend(await self._detect_duplicate_coordinates())
        
        # 规则 3: 相同 affiliation 产生不同结果
        errors.extend(await self._detect_affiliation_variations())
        
        return errors
    
    async def _detect_cache_inconsistency(self) -> List[ErrorRecord]:
        """检测 affiliation_cache 和 authorship 的不一致"""
        # TODO: 实现
        # 查询所有 authorship，检查其第一个 affiliation 是否在 cache 中
        # 如果在 cache 中，检查 country/city/institution 是否一致
        return []
    
    async def _detect_duplicate_coordinates(self) -> List[ErrorRecord]:
        """检测重复/冲突的坐标"""
        # TODO: 实现
        # 查询 geocoding_cache，检查是否有多个不同的 location_key 指向相同坐标
        return []
    
    async def _detect_affiliation_variations(self) -> List[ErrorRecord]:
        """检测相同 affiliation 产生不同结果"""
        # TODO: 实现
        # 这可能发生在不同时间使用不同提取方法的情况
        return []
```

---

## 错误分类和优先级

### 错误严重程度定义

| 严重程度 | 定义 | 影响 | 处理优先级 |
|----------|------|------|-----------|
| **CRITICAL** | 导致严重数据错误 | 地图显示完全错误的位置 | 🔴 最高 |
| **HIGH** | 导致数据缺失或明显错误 | 地图缺少数据或显示错误城市 | 🟠 高 |
| **MEDIUM** | 可能导致错误或质量下降 | 数据质量降低但不影响核心功能 | 🟡 中 |
| **LOW** | 轻微问题，影响较小 | 数据完整性轻微影响 | 🟢 低 |

### 错误分类体系

```
extraction_error (提取错误)
├─ state_as_city (州缩写作为城市) - HIGH
├─ institution_as_city (机构名作为城市) - MEDIUM
├─ department_as_city (部门名作为城市) - MEDIUM
├─ low_confidence (低置信度) - LOW/MEDIUM
├─ country_city_mismatch (国家城市不匹配) - HIGH
├─ missing_geo_data (缺失地理数据) - HIGH
├─ city_contains_numbers (城市名包含数字) - HIGH
└─ city_too_short (城市名过短) - MEDIUM

geocoding_error (Geocoding 错误)
├─ geocoding_null (无坐标) - HIGH
├─ wrong_coordinates (坐标错误) - CRITICAL
└─ coordinate_anomaly (坐标异常) - HIGH

consistency_error (一致性错误)
├─ cache_inconsistent (缓存不一致) - MEDIUM
├─ duplicate_coordinates (重复坐标) - LOW
└─ affiliation_variations (相同 affiliation 不同结果) - MEDIUM
```

### 错误优先级排序

修复时按以下顺序处理：

1. **CRITICAL 错误** → 立即修复
2. **HIGH 错误** → 高优先级修复
3. **MEDIUM 错误** → 正常优先级修复
4. **LOW 错误** → 低优先级修复

在同一严重程度内，按以下因素排序：
- 影响的 authorship 数量（越多越优先）
- 错误检测时间（越早越优先）
- 修复难度（越容易越优先）

---

## 实施建议

### 1. 渐进式启用

建议按以下顺序启用检测规则：

**Phase 1**: 启用基本规则
- 州缩写检测
- Geocoding null 检测
- 低置信度检测

**Phase 2**: 启用中级规则
- 机构名检测
- 部门名检测
- 坐标异常检测

**Phase 3**: 启用高级规则
- 反向 geocoding 验证
- 国家城市匹配验证
- 一致性检测

### 2. 调整检测阈值

根据实际运行结果，调整检测阈值：

```python
class DetectorConfig:
    """检测器配置"""
    
    # 置信度阈值
    LOW_CONFIDENCE_THRESHOLD = 0.6  # 低于此值视为低置信度
    
    # 城市名最短长度
    MIN_CITY_NAME_LENGTH = 3  # 短于此长度视为可疑
    
    # 反向 geocoding 相似度阈值
    REVERSE_GEOCODE_SIMILARITY_THRESHOLD = 0.8
    
    # 坐标异常检测参数
    COORDINATE_ANOMALY_ENABLED = True
```

### 3. 错误抑制

对于某些已知的"合法"错误，可以添加抑制规则：

```python
# 白名单：已知正确的"短"城市名
CITY_NAME_WHITELIST = {"NY", "LA", "SF", "DC"}  # 纽约、洛杉矶等

# 黑名单：已知错误的提取结果
CITY_NAME_BLACKLIST = {"USA", "United States", "Email"}
```

---

## 版本历史

- **v1.0** (2026-01-27): 初始检测策略设计
  - 三层检测机制
  - 错误分类体系
  - 优先级排序
