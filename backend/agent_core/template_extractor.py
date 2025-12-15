"""
Template Document Field Extractor - FIXED VERSION (No Normalization)

절대 원칙:
1. 업로드 문서 = Single Source of Truth
2. 값 추론/보정/표준화/축약 전부 금지
3. 값이 없으면 빈 값
"""

import logging
import re
from typing import Dict, List, Optional, Any
import json

from agent_core.config import openai_client

logger = logging.getLogger(__name__)


TEMPLATE_DEFINITIONS = {
    'offer_sheet': {
        'keywords': ['OFFER SHEET', 'We are pleased to offer'],
        'required_fields': ['seller_name', 'buyer_name', 'offer_date'],
        'table_fields': ['item_no', 'hscode', 'description', 'coo', 'quantity', 'unit', 'unit_price', 'currency'],
        # 자동 계산 필드 (직접 주입 금지!)
        'auto_calculated_fields': ['sub_total_price', 'total_price'],
    },
    'proforma_invoice': {
        'keywords': ['PROFORMA INVOICE', 'Invoice No', 'Consignee'],
        'required_fields': ['seller_name', 'buyer_name', 'invoice_no'],
        'table_fields': ['item_no', 'description', 'quantity', 'unit', 'unit_price', 'currency'],
        'auto_calculated_fields': ['sub_total_price', 'total_price'],
    },
    'sale_contract': {
        'keywords': ['SALES CONTRACT', 'CONTRACT NO', 'SELLER', 'BUYER'],
        'required_fields': ['seller_name', 'buyer_name', 'contract_no'],
        'table_fields': ['item_no', 'description', 'quantity', 'unit', 'unit_price', 'currency'],
        'auto_calculated_fields': ['sub_total_price', 'total_price'],
    },
    'commercial_invoice': {
        'keywords': ['COMMERCIAL INVOICE', 'Invoice No', 'Shipper', 'Consignee'],
        'required_fields': ['seller_name', 'buyer_name', 'invoice_no'],
        'table_fields': ['item_no', 'description', 'quantity', 'unit', 'unit_price', 'currency'],
        'auto_calculated_fields': ['sub_total_price', 'total_price'],
    },
    'packing_list': {
        'keywords': ['PACKING LIST', 'Shipper', 'Consignee', 'Marks and Numbers'],
        'required_fields': ['seller_name', 'buyer_name'],
        'table_fields': ['item_no', 'marks_and_numbers', 'description', 'quantity', 'unit', 'net_weight', 'gross_weight', 'measurement'],
        'auto_calculated_fields': ['total_net_weight', 'total_gross_weight', 'total_measurement'],
    }
}


def detect_template_type(text: str) -> Optional[str]:
    """템플릿 타입 감지"""
    text_upper = text.upper()
    
    for template_type, definition in TEMPLATE_DEFINITIONS.items():
        keyword_matches = sum(
            1 for keyword in definition['keywords'] 
            if keyword.upper() in text_upper
        )
        
        if keyword_matches >= len(definition['keywords']) / 2:
            logger.info(f"Detected template type: {template_type}")
            return template_type
    
    logger.info("No template type detected")
    return None


def extract_fields_with_ai(text: str, template_type: str) -> Dict[str, str]:
    """
    AI를 사용하여 템플릿에서 필드 추출
    
    CRITICAL: 원본 값 그대로 추출, 변환/추론/보정 금지
    """
    definition = TEMPLATE_DEFINITIONS.get(template_type)
    if not definition:
        return {}
    
    prompt = f"""Extract field values from this {template_type.replace('_', ' ').title()} document.

CRITICAL RULES:
1. Extract EXACT values as they appear in the document
2. DO NOT normalize, standardize, or convert values
3. DO NOT infer or guess missing values
4. If a value is not present, use empty string ""
5. Return ONLY valid JSON

Required fields: {', '.join(definition['required_fields'])}

Document content:
{text[:3000]}

Example output:
{{
  "seller_name": "ABC Corporation",
  "buyer_name": "XYZ Limited",
  "offer_date": "2025-12-15"
}}
"""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a document field extraction assistant. Extract field values EXACTLY as they appear. NO normalization, NO inference, NO conversion."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        logger.info(f"AI extracted {len(result)} fields from {template_type}")
        return result
        
    except Exception as e:
        logger.error(f"AI field extraction failed: {e}")
        return {}


def extract_table_rows_with_ai(text: str, template_type: str) -> List[Dict[str, str]]:
    """
    AI를 사용하여 테이블 행 데이터 추출
    
    CRITICAL: 
    - 원본 값 그대로 추출
    - 자동 계산 필드 제외
    - TOTAL 행 제외
    - 텍스트 요약/축약 절대 금지
    """
    definition = TEMPLATE_DEFINITIONS.get(template_type)
    if not definition:
        return []
    
    # 자동 계산 필드 제외
    extraction_fields = [f for f in definition['table_fields'] if f not in definition.get('auto_calculated_fields', [])]
    
    prompt = f"""Extract ALL item rows from the table in this {template_type.replace('_', ' ').title()} document.

CRITICAL RULES - MUST FOLLOW EXACTLY:
1. Extract EXACT text as it appears (NO summarization, NO abbreviation)
2. For description/product name fields:
   - "Laptop Computers" → extract "Laptop Computers" (NOT "Laptop")
   - "Desktop Computer Systems" → extract "Desktop Computer Systems" (NOT "Desktop")
   - DO NOT delete words
   - DO NOT change plural to singular
   - DO NOT summarize or shorten
   - Extract COMPLETE text EXACTLY as written
3. If "Republic of Korea" → extract "Republic of Korea" (NOT "KR")
4. If unit is missing → use empty string "" (NOT "PCS" or "EA")
5. For "1000 / USD":
   - Extract "1000" as unit_price
   - Extract "USD" as currency
6. DO NOT extract calculated fields (Subtotal, Total)
7. EXCLUDE rows with "TOTAL", "합계", "SUM"
8. Return ONLY valid JSON

Fields to extract: {', '.join(extraction_fields)}

Document content:
{text[:4000]}

Example output (EXACT text preservation):
{{
  "items": [
    {{
      "item_no": "101",
      "description": "Laptop Computers",
      "quantity": "100",
      "unit": "",
      "unit_price": "1000",
      "currency": "USD",
      "coo": "Republic of Korea"
    }},
    {{
      "item_no": "102",
      "description": "Desktop Computer Systems with Monitors",
      "quantity": "200",
      "unit": "PCS",
      "unit_price": "2000",
      "currency": "USD",
      "coo": "Republic of Korea"
    }}
  ]
}}
"""
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a precise data extraction assistant. Extract text EXACTLY as it appears. NEVER summarize, abbreviate, or shorten text. NEVER delete words. NEVER change plural to singular. Preserve COMPLETE original text."},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        # 배열 찾기
        if isinstance(parsed, list):
            rows = parsed
        elif isinstance(parsed, dict):
            rows = parsed.get('items') or parsed.get('rows') or parsed.get('data') or []
        else:
            rows = []
        
        logger.info(f"AI extracted {len(rows)} table rows from {template_type}")
        if rows:
            logger.info(f"Sample row description: {rows[0].get('description', 'N/A')}")
        
        return rows
        
    except Exception as e:
        logger.error(f"AI table extraction failed: {e}")
        return []


def parse_compound_fields(data: Dict[str, str]) -> Dict[str, str]:
    """
    복합 필드 파싱 (원본 값 보존)
    
    ONLY 파싱: "1000 / USD" → unit_price + currency
    NO 변환: "Republic of Korea" → 그대로
    NO 추론: unit 없으면 빈 값
    """
    result = {}
    
    for key, value in data.items():
        if not value:
            result[key] = ""
            continue
        
        # Unit Price / Currency 파싱 (ONLY 분리, NO 변환)
        if key in ['unit_price', 'price'] and '/' in value:
            parts = value.split('/')
            if len(parts) == 2:
                result['unit_price'] = parts[0].strip()
                result['currency'] = parts[1].strip()
            else:
                result[key] = value
        else:
            # 원본 그대로 사용 (NO 변환!)
            result[key] = value
    
    return result


def normalize_field_ids(fields: Dict[str, str], table_rows: List[Dict[str, str]]) -> tuple[Dict[str, str], List[Dict[str, str]]]:
    """
    필드 ID를 템플릿 정의와 일치하도록 정규화
    
    ONLY 필드명 매핑, NO 값 변환
    """
    field_mapping = {
        # 기본 필드
        'seller': 'seller_name',
        'buyer': 'buyer_name',
        'shipper': 'seller_name',
        'consignee': 'buyer_name',
        'invoice_number': 'invoice_no',
        'contract_number': 'contract_no',
        'offer_number': 'offer_no',
        'date': 'offer_date',
        'invoice_date': 'invoice_date',
        'contract_date': 'contract_date',
        
        # 테이블 필드
        'country_of_origin': 'coo',
        'country': 'coo',
        'origin': 'coo',
        'unit_price_currency': 'currency',
        'price_currency': 'currency',
        'amount_currency': 'currency',
        'quantity_unit': 'unit',
        'unit_of_measurement': 'unit',
        'price': 'unit_price',
        
        # Packing List
        'net_weight': 'net_weight',
        'gross_weight': 'gross_weight',
        'measurement': 'measurement',
        'marks': 'marks_and_numbers',
    }
    
    # 필드 정규화 (값은 원본 그대로)
    normalized_fields = {}
    for key, value in fields.items():
        parsed = parse_compound_fields({key: value})
        for parsed_key, parsed_value in parsed.items():
            normalized_key = field_mapping.get(parsed_key.lower(), parsed_key.lower())
            normalized_fields[normalized_key] = parsed_value  # 원본 값 그대로
    
    # 테이블 행 정규화
    normalized_rows = []
    for row in table_rows:
        parsed_row = parse_compound_fields(row)
        
        normalized_row = {}
        for key, value in parsed_row.items():
            normalized_key = field_mapping.get(key.lower(), key.lower())
            normalized_row[normalized_key] = value  # 원본 값 그대로
        
        normalized_rows.append(normalized_row)
    
    return normalized_fields, normalized_rows


def add_row_suffixes_to_table_fields(table_rows: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """테이블 필드에 행 번호 접미사 추가"""
    result = []
    
    for idx, row in enumerate(table_rows):
        if idx == 0:
            result.append(row)
        else:
            suffixed_row = {}
            for key, value in row.items():
                suffixed_key = f"{key}_{idx + 1}"
                suffixed_row[suffixed_key] = value
            result.append(suffixed_row)
    
    return result


def extract_template_data(chunks: List[Dict[str, Any]], original_filename: str) -> Optional[Dict]:
    """업로드된 문서에서 템플릿 데이터 추출 (메인 함수)"""
    if not chunks:
        return None
    
    full_text = "\n\n".join([chunk['text'] for chunk in chunks])
    
    # 1. 템플릿 타입 감지
    template_type = detect_template_type(full_text)
    if not template_type:
        logger.info(f"Document {original_filename} is not a template")
        return None
    
    logger.info(f"Processing {original_filename} as {template_type} template")
    
    # 2. 필드 추출
    fields = extract_fields_with_ai(full_text, template_type)
    
    # 3. 테이블 행 추출
    table_rows = extract_table_rows_with_ai(full_text, template_type)
    
    # 4. 필드 ID 정규화 (값은 원본 그대로)
    fields, table_rows = normalize_field_ids(fields, table_rows)
    
    # 5. 테이블 필드에 행 번호 접미사 추가
    table_rows = add_row_suffixes_to_table_fields(table_rows)
    
    # 6. 검증
    if not fields and not table_rows:
        logger.warning(f"No data extracted from template {original_filename}")
        return None
    
    result = {
        'is_template': True,
        'template_type': template_type,
        'fields': fields,
        'table_rows': table_rows,
        'row_count': len(table_rows)
    }
    
    logger.info(f"Successfully extracted template data: {len(fields)} fields, {len(table_rows)} rows")
    logger.info(f"Sample values: {list(fields.items())[:3]}")
    if table_rows:
        logger.info(f"Sample row: {table_rows[0]}")
    
    return result
