"""
Document Processing Services

PDF 다운로드 → 파싱 → 임베딩 → Qdrant 저장 파이프라인
"""

import logging
import tempfile
import uuid
from pathlib import Path
from typing import List, Dict

import boto3
from django.conf import settings


from .models import Document
from agent_core.config import (
    qdrant_client,
    openai_client,
    COLLECTION_USER_DOCS,
    EMBEDDING_MODEL,
)

logger = logging.getLogger(__name__)


def download_from_s3(s3_key: str, file_ext: str = '.pdf') -> str:
    """
    S3에서 파일 다운로드 → 임시 파일로 저장

    Args:
        s3_key: S3 파일 키
        file_ext: 파일 확장자 (예: '.pdf', '.docx')

    Returns:
        str: 임시 파일 경로
    """
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    # 임시 파일 생성 (확장자 유지)
    if not file_ext.startswith('.'):
        file_ext = '.' + file_ext
        
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
    temp_path = temp_file.name
    temp_file.close()

    # S3에서 다운로드
    s3_client.download_file(
        settings.AWS_STORAGE_BUCKET_NAME,
        s3_key,
        temp_path
    )

    logger.info(f"Downloaded S3 file {s3_key} to {temp_path}")
    return temp_path




def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    OpenAI API로 텍스트 배치 임베딩 생성

    Args:
        texts: 텍스트 리스트

    Returns:
        List[List[float]]: 임베딩 벡터 리스트
    """
    try:
        response = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts
        )

        embeddings = [item.embedding for item in response.data]
        logger.info(f"Generated {len(embeddings)} embeddings")

        return embeddings

    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        raise


def store_chunks_in_qdrant(
    document_id: int,
    chunks: List[Dict],
    embeddings: List[List[float]]
) -> List[str]:
    """
    청크와 임베딩을 Qdrant에 저장

    Args:
        document_id: UserDocument ID
        chunks: 페이지별 청크 리스트
        embeddings: 임베딩 벡터 리스트

    Returns:
        List[str]: 생성된 Qdrant point ID 리스트
    """
    from qdrant_client.models import PointStruct

    points = []

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid4())

        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                'document_id': document_id,
                'page': chunk['page'],
                'text': chunk['text'],
                'char_count': chunk['char_count'],
                'chunk_index': i,
                **chunk['metadata']
            }
        )

        points.append(point)

    # Qdrant에 batch upsert
    qdrant_client.upsert(
        collection_name=COLLECTION_USER_DOCS,
        points=points
    )

    point_ids = [p.id for p in points]
    logger.info(f"Stored {len(points)} points in Qdrant collection '{COLLECTION_USER_DOCS}'")

    return point_ids



def convert_to_pdf(input_path: str, output_dir: str) -> str:
    """
    LibreOffice를 사용하여 문서를 PDF로 변환
    Returns: 변환된 PDF 파일의 경로
    """
    import subprocess
    import os
    
    # soffice 경로 (macOS Homebrew 기준)
    soffice_path = '/opt/homebrew/bin/soffice'
    if not os.path.exists(soffice_path):
        # 대체 경로 시도 (Applications)
        soffice_path = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
        if not os.path.exists(soffice_path):
            raise FileNotFoundError("LibreOffice (soffice) not found")

    cmd = [
        soffice_path,
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', output_dir,
        input_path
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True)
        
        # 예상되는 출력 파일명
        filename = os.path.basename(input_path)
        name_without_ext = os.path.splitext(filename)[0]
        pdf_path = os.path.join(output_dir, f"{name_without_ext}.pdf")
        
        if not os.path.exists(pdf_path):
            logger.error(f"Soffice stdout: {result.stdout.decode()}")
            logger.error(f"Soffice stderr: {result.stderr.decode()}")
            raise FileNotFoundError(f"Converted PDF not found at {pdf_path}")
            
        return pdf_path
    except subprocess.CalledProcessError as e:
        logger.error(f"LibreOffice conversion failed: {e.stderr.decode()}")
        raise RuntimeError(f"PDF conversion failed: {e.stderr.decode()}")



def process_uploaded_document(document_id: int):
    """
    업로드된 문서 처리 파이프라인
    1. S3에서 파일 다운로드
    2. (DOCX/HWP) PDF 변환 및 S3 업로드
    3. 텍스트 추출 및 저장
    4. 임베딩 생성 및 저장
    """
    document = Document.objects.get(doc_id=document_id)
    document.upload_status = 'processing'
    document.save()

    # Initialize s3_client here as it's used in this function
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    processing_file_path = None
    converted_pdf_path = None

    try:
        # 1. S3에서 다운로드
        import os
        file_ext = os.path.splitext(document.original_filename)[1].lower()
        if not file_ext:
            file_ext = '.pdf' # Default
            
        # download_from_s3 함수 사용 (이미 정의됨)
        processing_file_path = download_from_s3(document.s3_key, file_ext)

        # PDF 변환 (DOCX, HWP인 경우)
        if file_ext in ['.docx', '.hwp']:
            try:
                output_dir = os.path.dirname(processing_file_path)
                converted_pdf_path = convert_to_pdf(processing_file_path, output_dir)
                
                # 변환된 PDF를 S3에 업로드
                with open(converted_pdf_path, 'rb') as pdf_file:
                    pdf_key = f"documents/{document.trade.user.emp_no}/{document.trade.trade_id}/{document.doc_type}/preview.pdf"
                    s3_client.upload_fileobj(
                        pdf_file,
                        settings.AWS_STORAGE_BUCKET_NAME,
                        pdf_key,
                        ExtraArgs={'ContentType': 'application/pdf'}
                    )
                    
                    # S3 URL 생성
                    pdf_url = f"https://{settings.AWS_STORAGE_BUCKET_NAME}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{pdf_key}"
                    
                    document.converted_pdf_key = pdf_key
                    document.converted_pdf_url = pdf_url
                    document.save(update_fields=['converted_pdf_key', 'converted_pdf_url'])
                    
            except Exception as e:
                logger.error(f"PDF conversion failed: {e}")
                # 변환 실패해도 텍스트 추출은 계속 진행
                pass

        # 3. 문서 파싱 (확장자에 따른 분기)
        from agent_core.parsers import parse_document
        chunks = parse_document(processing_file_path, document.original_filename)

        if not chunks:
            raise ValueError("No valid content extracted from document")

        # 4. 텍스트 저장 (미리보기용)
        full_text = "\n\n".join([chunk['text'] for chunk in chunks])
        document.extracted_text = full_text
        document.save(update_fields=['extracted_text'])

        # 5. 임베딩 생성 (배치 처리)
        texts = [chunk['text'] for chunk in chunks]
        embeddings = generate_embeddings_batch(texts)

        # 6. Qdrant 저장
        points = []
        import json
        
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            from qdrant_client.models import PointStruct
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    'doc_id': document.doc_id,
                    'trade_id': document.trade.trade_id,
                    'doc_type': document.doc_type,
                    'page': chunk['page'],
                    'text': chunk['text'],
                    'metadata': json.dumps(chunk['metadata'])
                }
            ))

        qdrant_client.upsert(
            collection_name=COLLECTION_USER_DOCS,
            points=points
        )

        # 포인트 ID 저장
        document.qdrant_point_ids = [p.id for p in points]
        document.upload_status = 'ready'
        document.save()

        logger.info(
            f"✓ Document {document_id} processed successfully: "
            f"{len(chunks)} chunks, {len(points)} vectors"
        )

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")
        document = Document.objects.get(doc_id=document_id) # Re-fetch in case of error before initial save
        document.upload_status = 'error'
        document.error_message = str(e)
        document.save()
        raise # Re-raise the exception after updating status

    finally:
        # 임시 파일 삭제
        import os
        if processing_file_path and os.path.exists(processing_file_path):
            os.unlink(processing_file_path)
            logger.debug(f"Deleted temporary file: {processing_file_path}")
        
        if converted_pdf_path and os.path.exists(converted_pdf_path):
            os.unlink(converted_pdf_path)
            logger.debug(f"Deleted converted PDF file: {converted_pdf_path}")
