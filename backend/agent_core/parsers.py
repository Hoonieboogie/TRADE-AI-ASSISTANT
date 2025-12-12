"""
Document Parsers
PDF 외의 문서 포맷(DOCX, HWP, TXT)을 처리하기 위한 파서 모듈
"""

import logging
import json
import tempfile
import os
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Optional dependencies
import sys
try:
    import docx
except ImportError as e:
    logger.error(f"Failed to import docx: {e}")
    logger.error(f"sys.path: {sys.path}")
    docx = None

try:
    import olefile
except ImportError as e:
    logger.error(f"Failed to import olefile: {e}")
    olefile = None

from agent_core.pdf_parser import production_pdf_pipeline

logger = logging.getLogger(__name__)




def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> List[str]:
    """
    텍스트를 지정된 크기로 분할 (간단한 구현)
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += (chunk_size - overlap)
        
    return chunks


def parse_docx(file_path: str) -> List[Dict[str, Any]]:
    """
    DOCX 파일 파싱
    """
    if not docx:
        raise ImportError("python-docx is not installed")

    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        text = '\n'.join(full_text)
        
        # 텍스트 분할 (임베딩 제한 고려)
        text_chunks = chunk_text(text, chunk_size=1000, overlap=200)
        
        result = []
        for i, chunk in enumerate(text_chunks):
            result.append({
                'page': 1, # DOCX는 페이지 구분이 어려우므로 1페이지로 통일하되, 청크로 나눔
                'text': chunk,
                'char_count': len(chunk),
                'metadata': {'source': 'docx', 'chunk_index': i}
            })
            
        return result
    except Exception as e:
        logger.error(f"Failed to parse DOCX {file_path}: {e}")
        raise


def parse_hwp(file_path: str) -> List[Dict[str, Any]]:
    """
    HWP 파일 파싱 (olefile 사용 - 텍스트 추출)
    """
    if not olefile:
        raise ImportError("olefile is not installed")

    try:
        if not olefile.isOleFile(file_path):
            logger.error(f"File {file_path} is not a valid OLE file. It might be HWPX (zip) or corrupted.")
            raise ValueError("Not a valid HWP file (OLE format required). If this is HWPX, it is not yet supported.")

        f = olefile.OleFileIO(file_path)
        dirs = f.listdir()
        logger.info(f"HWP OLE structure: {dirs}")

        # HWP 5.0 확인
        if ['FileHeader'] not in dirs or \
           ['DocInfo'] not in dirs:
            logger.warning("Missing FileHeader or DocInfo, but attempting to parse BodyText anyway.")

        # BodyText 섹션 찾기
        body_text_dirs = [d for d in dirs if d[0] == 'BodyText']
        logger.info(f"Found BodyText sections: {body_text_dirs}")
        
        full_text = ""
        
        # 섹션 순서대로 읽기
        # BodyText/SectionX 형태이므로 숫자 기준으로 정렬
        def get_section_index(name_list):
            try:
                return int(name_list[1].replace('Section', ''))
            except:
                return 0
                
        for section in sorted(body_text_dirs, key=get_section_index):
            try:
                stream = f.openstream(section)
                data = stream.read()
                
                import zlib
                import struct
                import re
                
                # HWP 5.0의 BodyText는 zlib으로 압축되어 있을 수 있음
                decompressed_data = zlib.decompress(data, -15)
                
                section_text = ""
                
                # Try Strict Record Parsing First
                try:
                    pos = 0
                    size_total = len(decompressed_data)
                    
                    while pos < size_total:
                        if pos + 4 > size_total:
                            break
                            
                        header_bytes = decompressed_data[pos:pos+4]
                        header_val = struct.unpack('<I', header_bytes)[0]
                        
                        tag_id = header_val & 0x3FF
                        size = (header_val >> 20) & 0xFFF
                        
                        pos += 4
                        
                        if size == 0xFFF:
                            if pos + 4 > size_total:
                                break
                            size = struct.unpack('<I', decompressed_data[pos:pos+4])[0]
                            pos += 4
                            
                        if pos + size > size_total:
                            break
                            
                        if tag_id == 17: # HWPTAG_PARA_TEXT
                            text_bytes = decompressed_data[pos:pos+size]
                            # HWP text is UTF-16LE
                            text = text_bytes.decode('utf-16le', errors='ignore')
                            text = text.replace('\x00', '')
                            section_text += text + "\n"
                                
                        pos += size
                except Exception as e:
                    logger.warning(f"Strict parsing failed for section {section}: {e}")
                    # Fallback will handle it
                    pass

                # Fallback: If strict parsing yielded nothing, try raw decode + filter
                if not section_text.strip():
                    logger.info(f"Strict parsing yielded empty text for {section}, using fallback.")
                    raw_text = decompressed_data.decode('utf-16le', errors='ignore')
                    # Keep Hangul, English, Numbers, Common Punctuation, Newlines
                    # Hangul: AC00-D7A3 (Syllables), 1100-11FF (Jamo), 3130-318F (Compat Jamo)
                    # Basic Latin: 0020-007E
                    # Newline/Tab: \n, \t
                    clean_text = re.sub(r'[^\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u0020-\u007E\n\t]', '', raw_text)
                    section_text = clean_text + "\n"
                
                full_text += section_text

            except Exception as e:
                logger.warning(f"Failed to decompress/decode section {section}: {e}")
                pass

        f.close()

        if not full_text.strip():
            logger.warning(f"Extracted empty text from HWP {file_path}")
            full_text = "(Text extraction failed or empty file)"

        # 텍스트 분할 (임베딩 제한 고려)
        text_chunks = chunk_text(full_text, chunk_size=1000, overlap=200)
        
        result = []
        for i, chunk in enumerate(text_chunks):
            result.append({
                'page': 1,
                'text': chunk,
                'char_count': len(chunk),
                'metadata': {'source': 'hwp', 'chunk_index': i}
            })

        return result

    except Exception as e:
        logger.error(f"Failed to parse HWP {file_path}: {e}")
        raise


def parse_document(file_path: str, original_filename: str) -> List[Dict[str, Any]]:
    """
    파일 확장자에 따른 파서 디스패치
    """
    ext = os.path.splitext(original_filename)[1].lower()

    if ext == '.pdf':
        # 기존 PDF 파이프라인 사용
        result = production_pdf_pipeline(file_path, min_chunk_chars=50)
        if result['status'] == 'error':
            raise ValueError(result.get('error', 'PDF parsing failed'))
        
        chunks = []
        for chunk in result.get('chunks', []):
            chunks.append({
                'page': chunk['page_num'],
                'text': chunk['text'],
                'char_count': len(chunk['text']),
                'metadata': chunk.get('metadata', {})
            })
        return chunks

    elif ext == '.docx':
        return parse_docx(file_path)
    
    elif ext == '.hwp':
        return parse_hwp(file_path)
    
    else:
        raise ValueError(f"Unsupported file extension: {ext}")
