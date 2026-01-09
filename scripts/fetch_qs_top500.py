#!/usr/bin/env python3
"""Helper script to fetch QS Top 500 university data.

This script provides a template for fetching QS ranking data.
Note: QS website may require authentication or have rate limits.
You may need to manually download the data and convert it to the required format.

Usage:
    # If you have QS data in a different format, modify this script to convert it
    python scripts/fetch_qs_top500.py --output data/qs_top500.csv
"""

import argparse
import csv
import json
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(backend_dir.parent))


def normalize_country(country: str) -> str:
    """Normalize country names to standard format."""
    country_mapping = {
        "USA": "United States",
        "US": "United States",
        "U.S.": "United States",
        "U.S.A.": "United States",
        "United States of America": "United States",
        "UK": "United Kingdom",
        "U.K.": "United Kingdom",
        "Great Britain": "United Kingdom",
        "England": "United Kingdom",
    }
    return country_mapping.get(country, country)


def generate_aliases(institution_name: str) -> list[str]:
    """Generate common aliases for an institution name."""
    aliases = []
    
    # Add common abbreviations
    name_lower = institution_name.lower()
    
    # Extract acronyms (e.g., "MIT" from "Massachusetts Institute of Technology")
    words = institution_name.split()
    if len(words) > 1:
        # Try to create acronym from first letters
        acronym = "".join(w[0].upper() for w in words if w and w[0].isalpha())
        if len(acronym) >= 3 and len(acronym) <= 6:
            aliases.append(acronym)
    
    # Add common variations
    if "University" in institution_name:
        aliases.append(institution_name.replace("University", "Univ."))
        aliases.append(institution_name.replace("University", "U"))
    
    if "Institute" in institution_name:
        aliases.append(institution_name.replace("Institute", "Inst."))
    
    # Add the full name itself
    aliases.append(institution_name)
    
    return list(set(aliases))  # Remove duplicates


def convert_qs_data_to_standard(qs_data: list[dict]) -> list[dict]:
    """Convert QS data format to standard format.
    
    Args:
        qs_data: List of dicts with QS data fields (adjust field names as needed)
    
    Returns:
        List of dicts in standard format
    """
    standard_data = []
    
    for row in qs_data:
        # Adjust these field names based on your QS data format
        institution_name = row.get('Institution Name', row.get('name', row.get('institution', '')))
        country = row.get('Country', row.get('country', ''))
        city = row.get('City', row.get('city', ''))
        rank = row.get('Rank', row.get('rank', row.get('qs_rank', '')))
        
        if not institution_name or not country:
            continue
        
        standard_row = {
            'primary_name': institution_name.strip(),
            'country': normalize_country(country.strip()),
            'city': city.strip() if city else None,
            'aliases': generate_aliases(institution_name.strip()),
            'qs_rank': int(rank) if rank and str(rank).isdigit() else None,
            'ror_id': row.get('ROR ID', row.get('ror_id', None)),
            'source': 'qs'
        }
        
        standard_data.append(standard_row)
    
    return standard_data


def fetch_qs_data_manual_guide():
    """Print manual guide for fetching QS data."""
    print("""
    ════════════════════════════════════════════════════════════════
    QS Top 500 数据获取指南
    ════════════════════════════════════════════════════════════════
    
    由于 QS 网站可能需要认证或有访问限制，建议手动获取数据：
    
    1. 访问 QS 官网：
       https://www.topuniversities.com/university-rankings/world-university-rankings
    
    2. 下载排名数据（如果有下载选项）
    
    3. 将数据转换为标准格式：
       - CSV 格式：primary_name,country,city,aliases,qs_rank,ror_id,source
       - JSON 格式：数组，每个元素包含上述字段
    
    4. 保存为 data/qs_top500.csv 或 data/qs_top500.json
    
    5. 运行导入脚本：
       python scripts/import_institution_geo.py --file data/qs_top500.csv
    
    ════════════════════════════════════════════════════════════════
    
    如果你有 QS 数据的其他格式，可以：
    1. 修改本脚本的 convert_qs_data_to_standard() 函数
    2. 添加数据读取逻辑
    3. 运行脚本进行转换
    """)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Fetch or convert QS Top 500 university data"
    )
    parser.add_argument(
        '--input',
        type=Path,
        help='Input file path (if you have QS data in another format)'
    )
    parser.add_argument(
        '--output',
        type=Path,
        default=Path('data/qs_top500.csv'),
        help='Output file path (default: data/qs_top500.csv)'
    )
    parser.add_argument(
        '--format',
        choices=['csv', 'json'],
        default='csv',
        help='Output format (default: csv)'
    )
    
    args = parser.parse_args()
    
    # If no input file, show manual guide
    if not args.input:
        fetch_qs_data_manual_guide()
        return
    
    # Read input data
    print(f"Reading data from {args.input}...")
    if args.input.suffix.lower() == '.json':
        with open(args.input, 'r', encoding='utf-8') as f:
            qs_data = json.load(f)
    else:
        # Assume CSV
        with open(args.input, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            qs_data = list(reader)
    
    # Convert to standard format
    print("Converting to standard format...")
    standard_data = convert_qs_data_to_standard(qs_data)
    print(f"Converted {len(standard_data)} institutions")
    
    # Write output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    
    if args.format == 'csv':
        with open(args.output, 'w', encoding='utf-8', newline='') as f:
            if standard_data:
                writer = csv.DictWriter(f, fieldnames=standard_data[0].keys())
                writer.writeheader()
                for row in standard_data:
                    # Convert aliases list to string
                    if 'aliases' in row and isinstance(row['aliases'], list):
                        row['aliases'] = ', '.join(row['aliases'])
                    writer.writerow(row)
    else:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(standard_data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Data saved to {args.output}")
    print(f"\nNext step: Import the data using:")
    print(f"  python scripts/import_institution_geo.py --file {args.output}")


if __name__ == '__main__':
    import asyncio
    asyncio.run(main())

