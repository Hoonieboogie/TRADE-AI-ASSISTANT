"""
PDF Parser for RAG Pipeline

Enhanced PDF parser optimized for LLM-RAG applications.
Uses PyMuPDF for robust text extraction with error handling.
"""

import pymupdf
from pathlib import Path
from typing import Optional, Union


def analyze_pdf_characteristics(pdf_path: str) -> dict:
    """
    Analyze PDF to understand its characteristics for RAG processing.

    Args:
        pdf_path: Path to PDF file

    Returns:
        dict with PDF characteristics and type classification
    """
    doc = pymupdf.open(pdf_path)

    analysis = {
        'filename': Path(pdf_path).name,
        'page_count': len(doc),
        'metadata': doc.metadata,
        'is_encrypted': doc.is_encrypted,
        'has_images': False,
        'text_density': [],
        'page_sizes': []
    }

    # Sample first 10 pages
    sample_size = min(10, len(doc))

    for i in range(sample_size):
        page = doc[i]

        # Check text density
        text = page.get_text("text")
        char_count = len(text.strip())
        page_area = page.rect.width * page.rect.height
        density = char_count / page_area if page_area > 0 else 0
        analysis['text_density'].append(density)

        # Check for images
        images = page.get_images()
        if images:
            analysis['has_images'] = True

        # Page size
        analysis['page_sizes'].append((page.rect.width, page.rect.height))

    # Calculate average text density
    avg_density = sum(analysis['text_density']) / len(analysis['text_density']) if analysis['text_density'] else 0

    # Classify PDF type
    if avg_density < 0.01:
        pdf_type = "Scanned/Image-based (needs OCR)"
    elif avg_density < 0.1:
        pdf_type = "Low text density (graphics-heavy)"
    else:
        pdf_type = "Text-based PDF (good for extraction)"

    doc.close()

    return {
        **analysis,
        'avg_text_density': avg_density,
        'pdf_type': pdf_type
    }


def parse_pdf_for_rag_enhanced(
    pdf_path: str,
    page_chunks: bool = False,
    password: Optional[str] = None,
    show_progress: bool = True,
    min_chars_per_page: int = 10
) -> dict:
    """
    Enhanced PDF parser for RAG pipeline with robust error handling.

    Args:
        pdf_path: Path to PDF file
        page_chunks: If True, return list of per-page dictionaries
        password: Password for encrypted PDFs (optional)
        show_progress: Print progress info
        min_chars_per_page: Minimum characters to consider page has content

    Returns:
        dict with:
          - 'success': bool
          - 'data': extracted text or page chunks
          - 'warnings': list of warnings
          - 'metadata': PDF metadata
    """
    result = {
        'success': False,
        'data': None,
        'warnings': [],
        'metadata': {}
    }

    try:
        # Open document
        doc = pymupdf.open(pdf_path)

        # Handle encrypted PDFs
        if doc.is_encrypted:
            if password:
                if not doc.authenticate(password):
                    result['warnings'].append("Incorrect password")
                    return result
            else:
                result['warnings'].append("PDF is encrypted but no password provided")
                doc.close()
                return result

        # Collect metadata
        result['metadata'] = {
            'page_count': len(doc),
            'format': doc.metadata.get('format', 'Unknown'),
            'creator': doc.metadata.get('creator', ''),
            'is_encrypted': doc.is_encrypted
        }

        if show_progress:
            print(f"Parsing: {Path(pdf_path).name} ({len(doc)} pages)")

        # Extract content
        if page_chunks:
            chunks = []
            empty_pages = 0

            for page_num, page in enumerate(doc, start=1):
                text = page.get_text("text")
                char_count = len(text.strip())

                # Warn about empty pages
                if char_count < min_chars_per_page:
                    empty_pages += 1

                chunks.append({
                    'page': page_num,
                    'text': text,
                    'char_count': char_count,
                    'metadata': {
                        'page_width': page.rect.width,
                        'page_height': page.rect.height,
                        'has_images': len(page.get_images()) > 0
                    }
                })

            # Warnings
            if empty_pages > len(doc) * 0.5:
                result['warnings'].append(
                    f"{empty_pages}/{len(doc)} pages have minimal text - "
                    "PDF might be scanned and needs OCR"
                )
            elif empty_pages > 0:
                result['warnings'].append(f"{empty_pages} pages have minimal text")

            result['data'] = chunks

            if show_progress:
                total_chars = sum(c['char_count'] for c in chunks)
                print(f"Extracted {len(chunks)} pages ({total_chars:,} characters)")
                if result['warnings']:
                    for w in result['warnings']:
                        print(f"  Warning: {w}")

        else:
            # Full document extraction
            full_text = []
            total_chars = 0

            for page in doc:
                text = page.get_text("text")
                full_text.append(text)
                total_chars += len(text.strip())

            result['data'] = '\n'.join(full_text)

            # Warnings
            if total_chars < 100:
                result['warnings'].append(
                    "Very little text extracted - PDF might be scanned/image-based"
                )

            if show_progress:
                lines = len(result['data'].splitlines())
                print(f"Extracted {lines} lines ({total_chars:,} characters)")
                if result['warnings']:
                    for w in result['warnings']:
                        print(f"  Warning: {w}")

        doc.close()
        result['success'] = True

    except Exception as e:
        result['warnings'].append(f"Error: {str(e)}")
        if show_progress:
            print(f"Failed to parse PDF: {e}")

    return result


def production_pdf_pipeline(pdf_path: str, min_chunk_chars: int = 100) -> dict:
    """
    Complete pipeline for RAG document processing.

    Args:
        pdf_path: Path to PDF file
        min_chunk_chars: Minimum characters per chunk to include

    Returns:
        dict with status, chunks, warnings, and metadata
    """
    result = parse_pdf_for_rag_enhanced(pdf_path, page_chunks=True, show_progress=False)

    if not result['success']:
        return {"status": "error", "error": "Failed to open PDF", "warnings": result['warnings']}

    # Check if OCR is needed
    total_chars = sum(p['char_count'] for p in result['data'])
    avg_chars_per_page = total_chars / len(result['data']) if result['data'] else 0

    if avg_chars_per_page < 50:
        return {
            "status": "needs_ocr",
            "message": "Document appears to be scanned. OCR recommended.",
            "data": result['data'],
            "warnings": result['warnings'],
            "metadata": result['metadata']
        }

    # Process for RAG - clean and chunk
    chunks = []
    for page in result['data']:
        if page['char_count'] > min_chunk_chars:  # Skip mostly empty pages
            chunks.append({
                'text': page['text'].strip(),
                'page_num': page['page'],
                'metadata': page['metadata']
            })

    return {
        "status": "success",
        "chunks": chunks,
        "warnings": result['warnings'],
        "metadata": result['metadata']
    }
