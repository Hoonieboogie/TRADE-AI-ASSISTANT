import React, { useState, useRef, useEffect, useMemo, RefObject } from 'react';
import { Sparkles, Send, X, Wand2, Eye, Undo2, Check, XCircle, Globe, Database, Wrench, FileSearch } from 'lucide-react';
import { ContractEditorRef } from './editor/ContractEditor';
import ReactMarkdown from 'react-markdown';

// Tool usage interface
interface ToolUsed {
  id: string;
  name: string;  // 표시될 이름 (예: "문서 검색", "웹 검색")
  icon: string;
  description: string;
}

// Get tool icon component
const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'web':
      return Globe;
    case 'document':
      return Database;
    case 'file-search':
      return FileSearch;
    default:
      return Wrench;
  }
};

interface Change {
  fieldId: string;
  value: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  hasApply?: boolean;
  changes?: Change[];  // fieldId/value pairs for field-level updates
  step?: number;
  toolsUsed?: ToolUsed[];
  isApplied?: boolean;  // 적용 완료 여부 (중복 적용 방지)
}

interface PreviewState {
  isOpen: boolean;
  changes: Change[];
  step?: number;
  messageId?: string;  // 적용 완료 상태 추적용
}

interface ChatAssistantProps {
  currentStep: number;
  onClose?: () => void;
  editorRef: RefObject<ContractEditorRef>;
  onApply: (changes: Change[], step: number) => void;  // Now takes changes array instead of full HTML
  documentId?: number | null; // Optional document ID for document-specific chat (업로드 시 사용)
  userEmployeeId?: string; // 사용자 사원번호 (세션 관리용)
  getDocId?: (step: number, shippingDoc?: 'CI' | 'PL' | null) => number | null; // step에서 doc_id 가져오기 함수
  activeShippingDoc?: 'CI' | 'PL' | null; // 현재 활성화된 선적서류 타입 (Step 4에서 CI/PL 구분용)
}

export default function ChatAssistant({ currentStep, onClose, editorRef, onApply, documentId, userEmployeeId, getDocId, activeShippingDoc }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '안녕하세요! 문서 작성을 도와드리겠습니다. 문서 수정을 원하시면 "~로 수정해줘"라고 말씀해주세요.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    changes: []
  });
  const [history, setHistory] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 step에 해당하는 doc_id 가져오기 (getDocId 함수 사용)
  const currentDocId = useMemo(() => {
    // documentId가 직접 전달된 경우 (업로드된 문서) 우선 사용
    if (documentId) return documentId;
    // getDocId 함수를 통해 현재 step의 doc_id 조회
    if (getDocId) {
      // Step 4에서는 activeShippingDoc 사용 (CI 또는 PL)
      // activeShippingDoc이 전달되면 그 값을 사용, 없으면 기본값 사용
      const shippingDoc = currentStep === 4 ? (activeShippingDoc || 'CI') : null;
      return getDocId(currentStep <= 3 ? currentStep : 4, shippingDoc);
    }
    return null;
  }, [documentId, getDocId, currentStep, activeShippingDoc]);

  // 이전 doc_id 추적 (변경 감지용)
  const prevDocIdRef = useRef<number | null>(null);

  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  const USE_DJANGO = import.meta.env.VITE_USE_DJANGO === 'true';
  const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

  // 채팅 초기화 함수
  const resetChat = () => {
    setMessages([
      {
        id: '1',
        type: 'ai',
        content: '안녕하세요! 문서 작성을 도와드리겠습니다. 문서 수정을 원하시면 "~로 수정해줘"라고 말씀해주세요.'
      }
    ]);
  };

  // 대화 히스토리 로드 함수 (doc_id 기반)
  const loadChatHistory = async (docId: number) => {
    if (!USE_DJANGO || !docId) {
      resetChat();
      return;
    }

    try {
      const response = await fetch(`${DJANGO_API_URL}/api/documents/${docId}/chat/history/`);
      if (!response.ok) {
        resetChat();
        return;
      }

      const data = await response.json();

      if (data.messages && data.messages.length > 0) {
        // role 매핑: 백엔드에서는 'user'/'agent'로 저장됨
        // metadata에서 changes, is_edit, isApplied 정보 복원
        const loadedMessages: Message[] = data.messages.map((msg: {
          role: string;
          content: string;
          doc_message_id?: number;
          metadata?: {
            is_edit?: boolean;
            changes?: Change[];
            edit_message?: string;
            tools_used?: ToolUsed[];
            isApplied?: boolean;
          };
        }, index: number) => {
          const isAI = msg.role !== 'user';
          const metadata = msg.metadata || {};
          const hasChanges = isAI && metadata.is_edit && metadata.changes && metadata.changes.length > 0;

          return {
            id: `loaded_${msg.doc_message_id || index}_${Date.now()}`,
            type: isAI ? 'ai' : 'user',
            content: hasChanges && metadata.edit_message ? metadata.edit_message : msg.content,
            step: currentStep,
            // AI 편집 메시지인 경우 버튼 상태 복원
            hasApply: hasChanges,
            changes: hasChanges ? metadata.changes : undefined,
            toolsUsed: isAI ? metadata.tools_used : undefined,
            // 편집 메시지는 기본적으로 적용 완료 상태로 표시 (재적용 방지)
            isApplied: hasChanges ? (metadata.isApplied !== false) : undefined
          };
        });

        setMessages([
          {
            id: '1',
            type: 'ai',
            content: '안녕하세요! 문서 작성을 도와드리겠습니다. 문서 수정을 원하시면 "~로 수정해줘"라고 말씀해주세요.'
          },
          ...loadedMessages
        ]);
        console.log(`[ChatAssistant] 대화 히스토리 로드 완료: ${loadedMessages.length}개 메시지 (편집 메시지 포함)`);
      } else {
        // 히스토리가 없으면 새 채팅으로 시작
        resetChat();
      }
    } catch (error) {
      console.error('대화 히스토리 로드 실패:', error);
      resetChat();
    }
  };

  // OpenAI API 직접 호출 (테스트용)
  const callOpenAI = async (userMessage: string, documentContent: string): Promise<{
    message: string;
    changes?: Change[];
    toolsUsed?: ToolUsed[];
  }> => {
    if (!OPENAI_API_KEY) {
      return { message: 'API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 설정해주세요.' };
    }

    const systemPrompt = `당신은 무역 문서 작성을 돕는 AI 어시스턴트입니다.
사용자가 문서 수정을 요청하면, 변경 사항을 명확히 구분하여 JSON 형식으로 반환해주세요.

현재 문서 내용:
${documentContent}

응답 형식:
- 일반 질문: { "type": "chat", "message": "답변 내용" }
- 문서 수정 요청: {
    "type": "edit",
    "message": "수정 설명",
    "changes": [
      { "fieldId": "data-field-id 속성값", "value": "새로운 값" }
    ]
  }

중요 규칙:
1. 사용자가 요청한 부분만 정확히 수정하세요
2. 요청하지 않은 다른 필드는 절대 변경하지 마세요
3. fieldId는 문서의 data-field-id 속성값과 정확히 일치해야 합니다
4. changes 배열에 실제로 변경된 fieldId와 value만 포함하세요
5. html 필드는 포함하지 마세요`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.3 // 낮은 temperature로 더 정확한 수정
        })
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content);
        if (parsed.type === 'edit' && parsed.changes) {
          return {
            message: parsed.message,
            changes: parsed.changes || []
          };
        }
        return { message: parsed.message || content };
      } catch {
        return { message: content };
      }
    } catch (error) {
      console.error('OpenAI API 오류:', error);
      return { message: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  };

  // 미리보기 열기
  const openPreview = (changes: Change[], step: number, messageId: string) => {
    setPreview({
      isOpen: true,
      changes,
      step,
      messageId
    });
  };

  // 미리보기에서 적용
  const applyFromPreview = () => {
    if (preview.changes.length > 0 && preview.step !== undefined) {
      // 현재 상태를 히스토리에 저장 (Undo용)
      const currentContent = editorRef.current?.getContent() || '';
      setHistory(prev => [...prev, currentContent]);
      onApply(preview.changes, preview.step);
      // 적용 완료 상태로 변경
      if (preview.messageId) {
        setMessages(prev => prev.map(msg =>
          msg.id === preview.messageId ? { ...msg, isApplied: true } : msg
        ));
      }
    }
    setPreview({ isOpen: false, changes: [] });
  };

  // 미리보기 닫기
  const closePreview = () => {
    setPreview({ isOpen: false, changes: [] });
  };

  // 되돌리기 (Undo)
  const handleUndo = () => {
    if (history.length > 0 && editorRef.current) {
      const previousContent = history[history.length - 1];
      editorRef.current.setContent(previousContent);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // currentDocId 변경 감지: 문서가 바뀌면 새 채팅 시작
  // Step 4에서 CI↔PL 전환 시에도 currentDocId가 변경되어 채팅이 리프레시됨
  useEffect(() => {
    if (prevDocIdRef.current === currentDocId) return;
    prevDocIdRef.current = currentDocId;

    if (currentDocId) {
      console.log(`[ChatAssistant] 채팅 리로드: docId=${currentDocId}`);
      loadChatHistory(currentDocId);
    } else {
      resetChat();
    }
  }, [currentDocId]);

  // 컴포넌트 마운트 시 현재 step의 대화 히스토리 로드
  useEffect(() => {
    if (currentDocId) {
      loadChatHistory(currentDocId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 연결 상태 체크
  useEffect(() => {
    const checkConnection = async () => {
      // 인터넷 연결 체크
      if (!navigator.onLine) {
        setIsConnected(false);
        return;
      }

      // Django 백엔드 사용 시 health check
      if (USE_DJANGO) {
        try {
          const response = await fetch(`${DJANGO_API_URL}/api/health/`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          setIsConnected(response.ok);
        } catch {
          setIsConnected(false);
        }
      } else {
        // OpenAI 직접 연결 시 API 키 존재 여부로 판단
        setIsConnected(!!OPENAI_API_KEY);
      }
    };

    // 초기 체크
    checkConnection();

    // 주기적 체크 (30초마다)
    const interval = setInterval(checkConnection, 30000);

    // 브라우저 online/offline 이벤트 리스너
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [USE_DJANGO, DJANGO_API_URL, OPENAI_API_KEY]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Capture the step when the request is made
    const requestStep = currentStep;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      step: requestStep
    };

    const aiMessageId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const documentContent = editorRef.current?.getContent() || '';

    // Django 스트리밍 사용 여부
    if (USE_DJANGO) {
      // doc_id 기반 채팅 (currentDocId 사용 - 이미 documentId 또는 getDocId 결과가 반영됨)
      const effectiveDocId = currentDocId;

      // 디버깅 로그
      console.log('🔍 Chat API 호출 정보:', {
        documentId,
        currentDocId,
        effectiveDocId,
        currentStep,
        userEmployeeId
      });

      if (!effectiveDocId) {
        // doc_id가 없으면 오류 표시
        setMessages(prev => [...prev, {
          id: aiMessageId,
          type: 'ai' as const,
          content: '문서 ID가 없습니다. 페이지를 새로고침하거나 문서를 다시 생성해주세요.',
          step: requestStep
        }]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${DJANGO_API_URL}/api/documents/chat/stream/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc_id: effectiveDocId,
            message: currentInput,
            user_id: userEmployeeId,
            document_content: documentContent  // 현재 작성 중인 문서 내용 전달
          })
        });

        if (!response.ok) {
          throw new Error(`API 오류: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('스트림을 읽을 수 없습니다.');
        }

        // 스트리밍 시작 전 AI 메시지 추가
        setMessages(prev => [...prev, {
          id: aiMessageId,
          type: 'ai',
          content: '',
          step: requestStep,
          toolsUsed: []
        }]);

        let accumulatedContent = '';
        let accumulatedTools: ToolUsed[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'init') {
                  // doc_id, trade_id 초기화 정보
                  console.log('📋 Chat Session 초기화:', {
                    doc_id: data.doc_id,
                    trade_id: data.trade_id
                  });
                } else if (data.type === 'agent_info') {
                  // 에이전트 정보 콘솔 출력
                  const modeEmoji = data.agent.doc_mode === 'upload' ? '📄' : '✏️';
                  const modeText = data.agent.doc_mode === 'upload' ? '업로드 모드' : '작성 모드';
                  console.log('%c🤖 Agent 정보', 'color: #6366f1; font-weight: bold; font-size: 14px;');
                  console.log(`%c   ${modeEmoji} Mode: ${modeText} (${data.agent.doc_mode})`, 'color: #8b5cf6; font-weight: bold;');
                  console.log('%c   Name: ' + data.agent.name, 'color: #22c55e; font-weight: bold;');
                  console.log('%c   Model: ' + data.agent.model, 'color: #3b82f6;');
                  console.log('%c   Tools: ' + data.agent.tools.join(', '), 'color: #f59e0b;');
                  console.log('-----------------------------------');
                } else if (data.type === 'context') {
                  // 컨텍스트 정보 수신 (Mem0 메모리)
                  console.log('🧠 Mem0 컨텍스트:', data.summary);
                } else if (data.type === 'text') {
                  accumulatedContent += data.content;
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                } else if (data.type === 'tool') {
                  accumulatedTools = [...accumulatedTools, data.tool];
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, toolsUsed: accumulatedTools }
                      : msg
                  ));
                } else if (data.type === 'edit') {
                  // 문서 수정 응답 처리 (fieldId/value format)
                  console.log('[ChatAssistant] 편집 응답 수신:', data);
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          content: data.message || '문서를 수정했습니다.',
                          hasApply: true,
                          changes: data.changes || [],
                          step: requestStep  // step 정보 추가
                        }
                      : msg
                  ));
                } else if (data.type === 'done') {
                  // 스트리밍 완료 시 최종 도구 정보 업데이트
                  if (data.tools_used && data.tools_used.length > 0) {
                    setMessages(prev => prev.map(msg =>
                      msg.id === aiMessageId
                        ? { ...msg, toolsUsed: data.tools_used }
                        : msg
                    ));
                  }
                } else if (data.type === 'error') {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: `오류가 발생했습니다: ${data.error}` }
                      : msg
                  ));
                }
              } catch {
                // JSON 파싱 실패 시 무시
              }
            }
          }
        }

      } catch (error) {
        console.error('API 호출 오류:', error);
        const errorContent = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;

        // AI 메시지가 이미 추가되었는지 확인 후 처리
        setMessages(prev => {
          const hasAiMessage = prev.some(m => m.id === aiMessageId);
          if (hasAiMessage) {
            return prev.map(msg =>
              msg.id === aiMessageId ? { ...msg, content: errorContent } : msg
            );
          } else {
            return [...prev, {
              id: aiMessageId,
              type: 'ai' as const,
              content: errorContent,
              step: requestStep
            }];
          }
        });
      }
    } else {
      // 비스트리밍 (OpenAI 직접 호출)
      const response = await callOpenAI(currentInput, documentContent);

      const aiMessage: Message = {
        id: aiMessageId,
        type: 'ai',
        content: response.message,
        hasApply: !!(response.changes && response.changes.length > 0),
        changes: response.changes,
        step: requestStep,
        toolsUsed: response.toolsUsed
      };

      setMessages(prev => [...prev, aiMessage]);
    }

    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* 미리보기 모달 */}
      {preview.isOpen && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          <div className="bg-amber-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                <h3 className="font-semibold">변경 미리보기</h3>
              </div>
              <button onClick={closePreview} className="p-1 hover:bg-white/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-amber-100 text-xs mt-1">적용 전 변경 내용을 확인하세요</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {preview.changes.length > 0 ? (
                preview.changes.map((change, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-600">
                        {change.fieldId}
                      </span>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded p-2">
                      <div className="text-xs text-green-600 mb-1">새 값</div>
                      <div className="text-sm text-green-700 font-medium">{change.value}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">변경 사항이 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t bg-gray-50 flex gap-2">
            <button
              onClick={closePreview}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border rounded-xl hover:bg-gray-100 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>취소</span>
            </button>
            <button
              onClick={applyFromPreview}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>적용하기</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-blue-500 p-5 text-white shadow-lg z-10 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full blur-xl -ml-10 -mb-10 pointer-events-none"></div>

        <div className="flex items-center justify-between mb-1 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 shadow-inner">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">AI 어시스턴트</h2>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                <p className="text-blue-100 text-[11px] font-medium">{isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {history.length > 0 && (
              <button
                onClick={handleUndo}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-blue-50 hover:text-white"
                title={`되돌리기 (${history.length})`}
              >
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-blue-50 hover:text-white"
                title="챗봇 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/30">
        {messages.filter(msg => !(msg.type === 'ai' && !msg.content)).map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI Avatar */}
            {message.type === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0 mb-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] px-5 py-3.5 shadow-sm relative group transition-all duration-200 hover:shadow-md ${message.type === 'user'
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
                }`}
            >
              {/* Tool usage badges for AI messages */}
              {message.type === 'ai' && message.toolsUsed && message.toolsUsed.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-gray-100">
                  {message.toolsUsed.map((tool, index) => {
                    const IconComponent = getToolIcon(tool.icon);
                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100"
                      >
                        <IconComponent className="w-3 h-3" />
                        {tool.name}
                      </span>
                    );
                  })}
                </div>
              )}

              {message.type === 'ai' ? (
                <div className="text-sm leading-relaxed text-gray-700 prose prose-sm max-w-none prose-p:my-1 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-blue-50">
                  {message.content}
                </p>
              )}

              {message.hasApply && message.changes && message.changes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => openPreview(message.changes!, message.step!, message.id)}
                    disabled={message.isApplied}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      message.isApplied
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    미리보기
                  </button>
                  <button
                    onClick={() => {
                      const beforeHTML = editorRef.current?.getContent() || '';
                      setHistory(prev => [...prev, beforeHTML]);
                      onApply(message.changes!, message.step!);
                      // 적용 완료 상태로 변경
                      setMessages(prev => prev.map(msg =>
                        msg.id === message.id ? { ...msg, isApplied: true } : msg
                      ));
                    }}
                    disabled={message.isApplied}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      message.isApplied
                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {message.isApplied ? '적용됨' : '바로 적용'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* 스트리밍 중이 아닐 때만 로딩 표시 (마지막 메시지가 user이거나, ai지만 content가 비어있을 때) */}
        {isLoading && messages.length > 0 && (
          messages[messages.length - 1].type === 'user' ||
          (messages[messages.length - 1].type === 'ai' && !messages[messages.length - 1].content)
        ) && (
          <div className="flex justify-start items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0 mb-1">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-xs text-gray-500">답변 생성중...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/80 backdrop-blur-md relative z-20">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="업무에 관한 무엇이든 물어보고 요청하세요..."
            className="w-full px-6 py-3.5 pr-14 rounded-full border border-gray-200 bg-white/90 shadow-[0_2px_10px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:shadow-[0_4px_20px_rgba(37,99,235,0.1)] transition-all duration-300 text-sm relative z-10 placeholder:text-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-blue-200 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 z-20"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
