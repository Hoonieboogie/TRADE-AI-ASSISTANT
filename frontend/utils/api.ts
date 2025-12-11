/**
 * API Client for Trade AI Assistant
 *
 * 백엔드 API와의 모든 통신을 중앙화
 *
 * 환경 설정:
 * - 로컬 개발: VITE_DJANGO_API_URL=http://localhost:8000
 * - 프로덕션: VITE_DJANGO_API_URL=https://your-ec2-domain.com
 */

// API Base URL 설정
// 환경변수가 없으면 localhost:8000 사용 (로컬 개발)
const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

// 개발 모드 확인
const isDev = import.meta.env.DEV;

if (isDev) {
  console.log('[API] Development mode - API URL:', API_URL);
}

// ===== Types =====

export interface User {
  user_id: number;
  emp_no: string;
  name: string;
  user_role: 'user' | 'admin';
  dept: {
    dept_id: number;
    dept_name: string;
  } | null;
}

export interface LoginResponse extends User {}

export interface Trade {
  trade_id: number;
  title: string;
  status: 'in_progress' | 'completed';
  documents?: Document[];
  document_count?: number;
  completed_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  doc_id: number;
  trade_id: number;
  doc_type: 'offer' | 'pi' | 'contract' | 'ci' | 'pl';
  doc_mode: 'manual' | 'upload' | 'skip';
  s3_key: string | null;
  s3_url: string | null;
  original_filename: string | null;
  file_size: number | null;
  mime_type: string | null;
  upload_status: 'uploading' | 'processing' | 'ready' | 'error' | null;
  error_message: string | null;
  qdrant_point_ids: string[];
  latest_version: DocVersion | null;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocVersion {
  version_id: number;
  doc_id: number;
  content: Record<string, unknown>;
  created_at: string;
}

export interface DocMessage {
  doc_message_id: number;
  doc_id: number;
  role: 'user' | 'agent';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface DocumentStatus {
  type: 'status' | 'complete' | 'error' | 'timeout';
  document_id: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  filename: string;
  message: string;
  progress: number;
  s3_url?: string;
  total_chunks?: number;
  error?: string;
}

// ===== API Client =====

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    if (isDev) {
      console.log(`[API] ${options.method || 'GET'} ${endpoint}`);
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMessage = error.detail || error.error || `Request failed: ${response.status}`;
      if (isDev) {
        console.error(`[API] Error: ${errorMessage}`);
      }
      throw new Error(errorMessage);
    }

    // 204 No Content 응답은 빈 객체 반환
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ===== Health Check =====

  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/health/');
  }

  // ===== Auth =====

  async login(emp_no: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/documents/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ emp_no, password }),
    });
  }

  async changePassword(
    emp_no: string,
    current_password: string,
    new_password: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/documents/auth/password-change/', {
      method: 'POST',
      body: JSON.stringify({ emp_no, current_password, new_password }),
    });
  }

  // ===== Trades =====

  async getTrades(userId: number): Promise<Trade[]> {
    return this.request<Trade[]>(`/api/documents/trades/?user_id=${userId}`);
  }

  async getTrade(tradeId: number): Promise<Trade> {
    return this.request<Trade>(`/api/documents/trades/${tradeId}/`);
  }

  async createTrade(userId: number, title: string): Promise<Trade> {
    return this.request<Trade>('/api/documents/trades/', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, title }),
    });
  }

  async updateTradeStatus(tradeId: number, status: 'in_progress' | 'completed'): Promise<Trade> {
    return this.request<Trade>(`/api/documents/trades/${tradeId}/update_status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateTrade(tradeId: number, data: { title?: string; status?: string }): Promise<Trade> {
    return this.request<Trade>(`/api/documents/trades/${tradeId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTrade(tradeId: number): Promise<void> {
    await this.request(`/api/documents/trades/${tradeId}/`, {
      method: 'DELETE',
    });
  }

  // ===== Documents =====

  async getDocument(docId: number): Promise<Document> {
    return this.request<Document>(`/api/documents/documents/${docId}/`);
  }

  async createDocument(tradeId: number, docType: string): Promise<Document> {
    return this.request<Document>('/api/documents/documents/', {
      method: 'POST',
      body: JSON.stringify({ trade: tradeId, doc_type: docType, doc_mode: 'manual' }),
    });
  }

  async updateDocument(docId: number, data: Partial<Document>): Promise<Document> {
    return this.request<Document>(`/api/documents/documents/${docId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async requestPresignedUrl(
    docId: number,
    filename: string,
    fileSize: number,
    mimeType: string
  ): Promise<PresignedUrlResponse> {
    return this.request<PresignedUrlResponse>(
      `/api/documents/documents/${docId}/upload_request/`,
      {
        method: 'POST',
        body: JSON.stringify({ filename, file_size: fileSize, mime_type: mimeType }),
      }
    );
  }

  async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/pdf',
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.status}`);
    }
  }

  async notifyUploadComplete(docId: number, s3Key: string): Promise<void> {
    await this.request(`/api/documents/documents/${docId}/upload_complete/`, {
      method: 'POST',
      body: JSON.stringify({ s3_key: s3Key }),
    });
  }

  async refreshDocumentUrl(docId: number): Promise<string> {
    const data = await this.request<{ s3_url: string }>(
      `/api/documents/documents/${docId}/refresh_url/`
    );
    return data.s3_url;
  }

  // ===== Document Status SSE =====

  subscribeToDocumentStatus(
    docId: number,
    callbacks: {
      onStatus: (status: DocumentStatus) => void;
      onComplete: (status: DocumentStatus) => void;
      onError: (error: string) => void;
      onTimeout: () => void;
    }
  ): () => void {
    const eventSource = new EventSource(
      `${this.baseUrl}/api/documents/${docId}/status/stream/`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DocumentStatus;

        if (data.type === 'status') {
          callbacks.onStatus(data);
        } else if (data.type === 'complete') {
          callbacks.onComplete(data);
          eventSource.close();
        } else if (data.type === 'error') {
          callbacks.onError(data.error || 'Processing error');
          eventSource.close();
        } else if (data.type === 'timeout') {
          callbacks.onTimeout();
          eventSource.close();
        }
      } catch (e) {
        console.error('SSE parsing error:', e);
      }
    };

    eventSource.onerror = () => {
      callbacks.onError('SSE connection error');
      eventSource.close();
    };

    return () => eventSource.close();
  }

  // ===== Document Versions =====

  async getVersions(docId: number): Promise<DocVersion[]> {
    return this.request<DocVersion[]>(`/api/documents/versions/?doc_id=${docId}`);
  }

  async createVersion(docId: number, content: Record<string, unknown>): Promise<DocVersion> {
    return this.request<DocVersion>('/api/documents/versions/', {
      method: 'POST',
      body: JSON.stringify({ doc_id: docId, content }),
    });
  }

  async getVersion(versionId: number): Promise<DocVersion> {
    return this.request<DocVersion>(`/api/documents/versions/${versionId}/`);
  }

  // ===== Document Messages =====

  async getMessages(docId: number): Promise<DocMessage[]> {
    return this.request<DocMessage[]>(`/api/documents/messages/?doc_id=${docId}`);
  }

  async createMessage(
    docId: number,
    role: 'user' | 'agent',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<DocMessage> {
    return this.request<DocMessage>('/api/documents/messages/', {
      method: 'POST',
      body: JSON.stringify({ doc_id: docId, role, content, metadata: metadata || {} }),
    });
  }

  // ===== Document Chat (Streaming) =====

  async chatWithDocument(
    docId: number,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/documents/${docId}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch {
              onChunk(data);
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Chat error');
    }
  }

  // ===== General Chat (non-document) =====

  async chat(
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void,
    userId?: string | number,
    genChatId?: number
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          user_id: userId,
          gen_chat_id: genChatId
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              onComplete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch {
              onChunk(data);
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Chat error');
    }
  }
}

// ===== Export singleton instance =====

export const api = new ApiClient(API_URL);
export { API_URL };
