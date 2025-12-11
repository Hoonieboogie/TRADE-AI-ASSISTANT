/**
 * Document Upload API Utilities
 *
 * S3 Presigned URL 방식 업로드 및 문서 상태 관리를 위한 유틸리티 함수
 */

const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

// ===== Types =====

export interface PresignedUrlRequest {
  doc_id: number;
  filename: string;
  file_size: number;
  mime_type: string;
}

export interface PresignedUrlResponse {
  doc_id: number;
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface DocumentStatus {
  document_id: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  filename: string;
  message: string;
  progress: number;
  s3_url?: string;
  total_chunks?: number;
  error?: string;
}

export interface StatusStreamCallbacks {
  onStatus: (status: DocumentStatus) => void;
  onComplete: (status: DocumentStatus) => void;
  onError: (error: string) => void;
  onTimeout: () => void;
}

// ===== API Functions =====

/**
 * Presigned URL 요청
 */
export async function requestPresignedUrl(data: PresignedUrlRequest): Promise<PresignedUrlResponse> {
  const { doc_id, filename, file_size, mime_type } = data;
  const response = await fetch(`${DJANGO_API_URL}/api/documents/documents/${doc_id}/upload_request/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, file_size, mime_type })
  });

  if (!response.ok) {
    throw new Error('upload_request_failed');
  }

  return response.json();
}

/**
 * S3에 파일 직접 업로드 (PUT)
 */
export async function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/pdf'
    },
    body: file
  });

  if (!response.ok) {
    throw new Error('s3_upload_failed');
  }
}

/**
 * 업로드 완료 알림
 */
export async function notifyUploadComplete(documentId: number, s3Key: string): Promise<void> {
  const response = await fetch(`${DJANGO_API_URL}/api/documents/documents/${documentId}/upload_complete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ s3_key: s3Key })
  });

  if (!response.ok) {
    throw new Error('upload_complete_failed');
  }
}

/**
 * 문서 처리 상태 SSE 구독
 *
 * @returns 구독 취소 함수
 */
export function subscribeToDocumentStatus(
  documentId: number,
  callbacks: StatusStreamCallbacks
): () => void {
  const eventSource = new EventSource(
    `${DJANGO_API_URL}/api/documents/documents/${documentId}/status/stream/`
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        callbacks.onStatus(data as DocumentStatus);
      } else if (data.type === 'complete') {
        callbacks.onComplete(data as DocumentStatus);
        eventSource.close();
      } else if (data.type === 'error') {
        callbacks.onError(data.error || '처리 중 오류 발생');
        eventSource.close();
      } else if (data.type === 'timeout') {
        callbacks.onTimeout();
        eventSource.close();
      }
    } catch (e) {
      console.error('SSE 파싱 오류:', e);
    }
  };

  eventSource.onerror = () => {
    callbacks.onError('SSE 연결 오류');
    eventSource.close();
  };

  // 구독 취소 함수 반환
  return () => {
    eventSource.close();
  };
}

/**
 * 문서 정보 조회
 */
export async function getDocument(documentId: number): Promise<{
  id: number;
  document_type: string;
  original_filename: string;
  s3_url: string;
  status: string;
  file_size: number;
  created_at: string;
}> {
  const response = await fetch(`${DJANGO_API_URL}/api/documents/documents/${documentId}/`);

  if (!response.ok) {
    throw new Error('문서 조회 실패');
  }

  return response.json();
}

/**
 * S3 Presigned URL 갱신
 */
export async function refreshDocumentUrl(documentId: number): Promise<string> {
  const response = await fetch(`${DJANGO_API_URL}/api/documents/documents/${documentId}/refresh_url/`);

  if (!response.ok) {
    throw new Error('URL 갱신 실패');
  }

  const data = await response.json();
  return data.s3_url;
}

// ===== Helper Functions =====

/**
 * 전체 업로드 플로우 실행
 *
 * 1. Presigned URL 요청
 * 2. S3 직접 업로드
 * 3. 업로드 완료 알림
 * 4. SSE 상태 구독
 */
export async function uploadDocumentFlow(
  file: File,
  docId: number,
  callbacks: {
    onPresignedUrl: (data: PresignedUrlResponse) => void;
    onS3UploadComplete: () => void;
    onProcessingStart: () => void;
    onStatus: (status: DocumentStatus) => void;
    onComplete: (status: DocumentStatus) => void;
    onError: (error: string) => void;
  }
): Promise<() => void> {
  try {
    // 1. Presigned URL 요청
    const presignedData = await requestPresignedUrl({
      doc_id: docId,
      filename: file.name,
      file_size: file.size,
      mime_type: file.type || 'application/pdf'
    });
    callbacks.onPresignedUrl(presignedData);

    // 2. S3 직접 업로드
    await uploadToS3(presignedData.upload_url, file);
    callbacks.onS3UploadComplete();

    // 3. 업로드 완료 알림
    await notifyUploadComplete(presignedData.doc_id, presignedData.s3_key);
    callbacks.onProcessingStart();

    // 4. SSE 상태 구독
    const unsubscribe = subscribeToDocumentStatus(presignedData.doc_id, {
      onStatus: callbacks.onStatus,
      onComplete: callbacks.onComplete,
      onError: callbacks.onError,
      onTimeout: () => callbacks.onError('처리 시간이 초과되었습니다')
    });

    return unsubscribe;

  } catch (error) {
    callbacks.onError(error instanceof Error ? error.message : '업로드 실패');
    return () => {}; // 빈 함수 반환
  }
}
