import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Search, TrendingUp, LogOut, User, Globe, Database, Wrench, ShieldAlert, Scale, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { PageType } from '../App';
import PasswordChangeModal from './document-creation/modals/PasswordChangeModal';
import ChatSidebar from './chat-sidebar/ChatSidebar';
import { GenChat, GenMessage, useChatList } from './chat-sidebar/useChatList';
import { User as UserType } from '../utils/api';

// 미디어 쿼리 훅 - 초기값을 바로 실제 값으로 설정
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

interface ChatPageProps {
  onNavigate: (page: PageType) => void;
  onLogoClick: (logoRect: DOMRect) => void;
  userEmployeeId: string;
  onLogout: () => void;
  currentUser?: UserType | null;
}

interface ToolUsed {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai' | 'search';
  content: string;
  timestamp: Date;
  toolsUsed?: ToolUsed[];
}

// 툴 아이콘 매핑
const getToolIcon = (iconName: string) => {
  switch (iconName) {
    case 'web':
      return Globe;
    case 'document':
      return Database;
    default:
      return Wrench;
  }
};

// 툴 상태 표시 정보 매핑
const TOOL_STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
  '질문 분석': { label: '질문 분석중', color: 'text-gray-500', dotColor: 'bg-gray-400' },
  '답변 생성': { label: '답변 생성중', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  '무역 지식 검색': { label: '무역 지식 검색중', color: 'text-blue-600', dotColor: 'bg-blue-500' },
  '업로드 문서 검색': { label: '업로드 문서 검색중', color: 'text-emerald-600', dotColor: 'bg-emerald-500' },
  '웹 검색': { label: '웹 검색중', color: 'text-violet-600', dotColor: 'bg-violet-500' },
};

const getToolStatusInfo = (toolName: string | null) => {
  if (!toolName) return { label: '준비중', color: 'text-gray-500', dotColor: 'bg-gray-400' };
  return TOOL_STATUS_MAP[toolName] || { label: `${toolName}중`, color: 'text-gray-500', dotColor: 'bg-blue-500' };
};

const suggestedQuestions = [
  {
    icon: ShieldAlert,
    title: '지역별 무역사기 예방법',
    description: '지역별 사기 수법과 대응'
  },
  {
    icon: Scale,
    title: 'UCP 600 핵심 정리',
    description: '신용장 통일규칙 가이드'
  },
  {
    icon: TrendingUp,
    title: '최근 무역 동향은?',
    description: '2025년 글로벌 무역 트렌드'
  }
];

export default function ChatPage({ onNavigate, onLogoClick, userEmployeeId, onLogout, currentUser }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);  // 로딩 중인 세션 ID
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [genChatId, setGenChatId] = useState<number | null>(null);  // 채팅 세션 ID
  const [currentToolStatus, setCurrentToolStatus] = useState<string | null>(null);  // 현재 진행 중인 tool 상태
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const initialTextareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingSessionRef = useRef<number>(0);  // 현재 스트리밍 세션 ID (고유값)
  const currentSessionRef = useRef<number>(0);  // 현재 활성 세션 ID (채팅 전환 시 증가)

  // 사이드바 상태 - 데스크톱이면 처음부터 열림
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(min-width: 1024px)').matches;
    }
    return false;
  });

  // 채팅 목록 훅 - ChatPage가 소유하고 ChatSidebar에 전달
  const chatListHook = useChatList(userEmployeeId);
  const { loadMessages, addChatToList, bringChatToTop } = chatListHook;

  // 화면 크기 변경 시 사이드바 상태 동기화
  useEffect(() => {
    setIsSidebarOpen(isDesktop);
  }, [isDesktop]);

  // 세션 ID 증가 함수 (채팅 전환 시 호출하여 이전 스트리밍 무효화)
  const invalidateCurrentSession = () => {
    currentSessionRef.current += 1;
  };

  // API URL 정의 (useEffect보다 먼저 정의해야 함)
  const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // textarea 자동 높이 조절 (최대 200px)
  const adjustTextareaHeight = (ref: React.RefObject<HTMLTextAreaElement>) => {
    const textarea = ref.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // textarea 높이 리셋
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    if (initialTextareaRef.current) {
      initialTextareaRef.current.style.height = 'auto';
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 컴포넌트 마운트 시 항상 새 채팅방으로 시작 (genChatId를 null로 유지)
  // 첫 메시지 전송 시 백엔드에서 새 gen_chat_id를 생성해서 반환함

  // 채팅방 나가기 (메인으로 이동, 채팅 내역은 보존)
  const handleExitChat = (logoRect: DOMRect) => {
    // 세션 무효화 (진행 중인 스트리밍이 이 채팅에 영향 주지 않도록)
    invalidateCurrentSession();

    // 채팅 내역은 삭제하지 않고 로컬 상태만 초기화
    setGenChatId(null);
    setMessages([]);
    setCurrentToolStatus(null);  // tool 상태 초기화
    setIsLoading(false);  // 메인으로 돌아가도 다음 채팅에서 즉시 입력 가능하도록
    onLogoClick(logoRect);
  };

  // 기존 채팅 선택
  const handleSelectChat = async (chat: GenChat) => {
    const targetChatId = chat.gen_chat_id;

    // 1. 세션 무효화 (진행 중인 스트리밍이 이 채팅에 영향 주지 않도록)
    invalidateCurrentSession();
    const mySession = currentSessionRef.current;

    // 2. 상태 초기화
    setGenChatId(targetChatId);
    setMessages([]);  // 메시지 즉시 초기화
    setCurrentToolStatus(null);  // tool 상태 초기화 (이전 채팅의 상태 표시 방지)
    setIsLoading(false);  // 새 채팅방에서 즉시 입력 가능하도록 로딩 상태 초기화

    // 3. 메시지 로드
    const loadedMessages = await loadMessages(targetChatId);

    // 4. 로드 완료 후 세션이 바뀌지 않았는지 확인 (레이스 컨디션 방지)
    if (currentSessionRef.current !== mySession) {
      // 메시지 로딩 중 다른 채팅으로 전환됨 - 결과 무시
      return;
    }

    const formattedMessages: Message[] = loadedMessages.map((msg: GenMessage) => ({
      id: msg.gen_message_id.toString(),
      type: msg.sender_type === 'U' ? 'user' : 'ai' as const,
      content: msg.content,
      timestamp: new Date(msg.created_at)
    }));

    setMessages(formattedMessages);
  };

  // 새 채팅 시작
  const handleNewChat = () => {
    // 세션 무효화 (진행 중인 스트리밍이 이 채팅에 영향 주지 않도록)
    invalidateCurrentSession();

    setGenChatId(null);
    setMessages([]);
    setCurrentToolStatus(null);  // tool 상태 초기화
    setIsLoading(false);  // 새 채팅에서 즉시 입력 가능하도록 로딩 상태 초기화
  };

  // 채팅 삭제 후 콜백 (현재 보고 있는 채팅이면 초기화)
  const handleChatDeleted = (deletedChatId: number) => {
    if (genChatId === deletedChatId) {
      // 세션 무효화 (진행 중인 스트리밍이 이 채팅에 영향 주지 않도록)
      invalidateCurrentSession();

      setGenChatId(null);
      setMessages([]);
      setCurrentToolStatus(null);  // tool 상태 초기화
      setIsLoading(false);  // 삭제 후 즉시 입력 가능하도록 로딩 상태 초기화
    }
  };

  const handleSend = async (customInput?: string) => {
    const messageToSend = customInput || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    const aiMessageId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    resetTextareaHeight();
    setIsLoading(true);

    // 이 스트리밍의 고유 세션 ID 저장
    const myStreamingSession = currentSessionRef.current;
    streamingSessionRef.current = myStreamingSession;
    setLoadingSessionId(myStreamingSession);  // 로딩 중인 세션 ID 저장

    try {
      // Django 스트리밍 API 호출 (user_id, gen_chat_id 포함)
      const response = await fetch(`${DJANGO_API_URL}/api/chat/stream/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          user_id: userEmployeeId,
          gen_chat_id: genChatId
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

      // 스트리밍 시작 전 AI 메시지 추가 (아직 채팅 전환 전이므로 무조건 추가)
      setMessages(prev => [...prev, {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
        toolsUsed: []
      }]);
      setCurrentToolStatus('질문 분석');  // 스트리밍 시작 시 질문 분석 상태

      let accumulatedContent = '';
      let accumulatedTools: ToolUsed[] = [];

      // 채팅 전환 여부 체크 헬퍼 (클로저 캡처된 세션 ID로 확실한 격리)
      const isStillSameSession = () => {
        return myStreamingSession === currentSessionRef.current;
      };

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
                // 채팅 세션 ID 저장 (메모리 기능용)
                if (data.gen_chat_id) {
                  const isNewChat = genChatId === null;

                  // 세션이 동일할 때만 genChatId 업데이트 (다른 채팅으로 전환했으면 무시)
                  if (isStillSameSession()) {
                    setGenChatId(data.gen_chat_id);
                  }

                  // 새 채팅인 경우 사이드바 목록에 즉시 추가 (세션과 무관하게 항상 추가)
                  if (isNewChat) {
                    const truncatedTitle = messageToSend.length > 30
                      ? messageToSend.substring(0, 30) + '...'
                      : messageToSend;

                    addChatToList({
                      gen_chat_id: data.gen_chat_id,
                      user: 0,
                      user_name: userEmployeeId,
                      title: truncatedTitle,
                      message_count: 1,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    });
                  }
                }
              } else if (data.type === 'text') {
                accumulatedContent += data.content;
                // 세션이 동일할 때만 UI 업데이트
                if (isStillSameSession()) {
                  setCurrentToolStatus('답변 생성');  // 텍스트 스트리밍 시작 시 답변 생성 상태
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  ));
                }
              } else if (data.type === 'tool') {
                accumulatedTools = [...accumulatedTools, data.tool];
                // 세션이 동일할 때만 UI 업데이트
                if (isStillSameSession()) {
                  setCurrentToolStatus(data.tool.name);  // tool 상태 업데이트
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, toolsUsed: accumulatedTools }
                      : msg
                  ));
                }
              } else if (data.type === 'done') {
                // 세션이 동일할 때만 UI 업데이트
                if (isStillSameSession()) {
                  setCurrentToolStatus(null);  // tool 상태 초기화
                  // 스트리밍 완료 시 최종 도구 정보 업데이트
                  if (data.tools_used && data.tools_used.length > 0) {
                    setMessages(prev => prev.map(msg =>
                      msg.id === aiMessageId
                        ? { ...msg, toolsUsed: data.tools_used }
                        : msg
                    ));
                  }
                }
                // 사이드바 정렬은 항상 수행 (genChatId 사용)
                if (genChatId) {
                  bringChatToTop(genChatId);
                }
              } else if (data.type === 'error') {
                // 세션이 동일할 때만 UI 업데이트
                if (isStillSameSession()) {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId
                      ? { ...msg, content: `오류가 발생했습니다: ${data.error}` }
                      : msg
                  ));
                }
              }
            } catch {
              // JSON 파싱 실패 시 무시
            }
          }
        }
      }

    } catch (error) {
      console.error('API 호출 오류:', error);

      // 세션이 동일할 때만 에러 메시지 표시
      if (streamingSessionRef.current === currentSessionRef.current) {
        const errorContent = `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n서버가 실행 중인지 확인해주세요.`;

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
              timestamp: new Date()
            }];
          }
        });
      }
    } finally {
      // 세션이 동일할 때만 로딩 상태 및 tool 상태 초기화
      // (다른 채팅의 스트리밍 종료가 현재 채팅에 영향 주지 않도록)
      if (myStreamingSession === currentSessionRef.current) {
        setIsLoading(false);
        setLoadingSessionId(null);
        setCurrentToolStatus(null);
      }
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <header className="bg-white/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleExitChat(rect);
              }}
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 cursor-pointer"
              title="메인으로 돌아가기"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-gray-900 font-bold">일반 채팅</h1>
              <p className="text-gray-500 text-sm">메인 페이지로 돌아가려면 로고를 클릭하세요</p>
            </div>
          </div>

          {/* Right: User Info and Logout */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMyPageModal(!showMyPageModal)}
              className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors"
            >
              마이페이지
            </button>
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentChatId={genChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onChatDeleted={handleChatDeleted}
          isDesktop={isDesktop}
          chatListHook={chatListHook}
        />

        {/* Sidebar Toggle Button - 탭 형태로 항상 표시 */}
        <motion.button
          initial={false}
          animate={{
            left: isSidebarOpen ? (isDesktop ? 320 : 320) : 0,
            opacity: isDesktop ? 1 : (isSidebarOpen ? 0 : 1)
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-30
                     w-6 h-20 bg-white/95 backdrop-blur-sm border border-l-0 border-gray-200
                     rounded-r-xl shadow-md
                     hover:w-7 hover:bg-blue-50 hover:border-blue-200 hover:shadow-lg
                     transition-all duration-200 ease-out
                     flex items-center justify-center group"
          style={{ left: isSidebarOpen ? (isDesktop ? 320 : 320) : 0 }}
          title={isSidebarOpen ? "채팅 목록 닫기" : "채팅 목록 열기"}
        >
          <motion.div
            animate={{ rotate: isSidebarOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </motion.div>
        </motion.button>

        {/* Chat Content Area */}
        <div className="flex-1 flex flex-col min-h-0">
        {hasMessages ? (
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.filter(msg => !(msg.type === 'ai' && !msg.content)).map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type === 'user' ? (
                    <div className="bg-blue-600 text-white rounded-2xl px-6 py-4 max-w-2xl">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  ) : message.type === 'search' ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-6 py-4 max-w-2xl flex items-center gap-3">
                      <Search className="w-5 h-5 text-yellow-600 animate-pulse" />
                      <p className="text-yellow-900">{message.content}</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 max-w-2xl shadow-sm">
                      {/* 사용된 툴 표시 */}
                      {message.toolsUsed && message.toolsUsed.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
                          {message.toolsUsed.map((tool) => {
                            const IconComponent = getToolIcon(tool.icon);
                            return (
                              <div
                                key={tool.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                                title={tool.description}
                              >
                                <IconComponent className="w-3 h-3" />
                                <span>{tool.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="text-gray-800 prose prose-sm max-w-none prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer">
                                {children}
                              </a>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 로딩 표시: 현재 세션이 로딩 중일 때만 표시 */}
              {isLoading && messages.length > 0 &&
                loadingSessionId === currentSessionRef.current &&
                (messages[messages.length - 1].type === 'user' ||
                (messages[messages.length - 1].type === 'ai' && !messages[messages.length - 1].content))
              && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                    {(() => {
                      const statusInfo = getToolStatusInfo(currentToolStatus);
                      return (
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className={`w-2 h-2 ${statusInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                            <div className={`w-2 h-2 ${statusInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                            <div className={`w-2 h-2 ${statusInfo.dotColor} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className={`text-sm font-medium ${statusInfo.color}`}>
                            {statusInfo.label}...
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-y-auto">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">무엇이 궁금하신가요?</h2>
                <p className="text-gray-500">무역 관련 질문을 입력하거나 아래 주제를 선택해보세요</p>
              </div>

              <div className="relative mb-8">
                <textarea
                  ref={initialTextareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight(initialTextareaRef);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="무역 관련 질문을 입력하세요..."
                  rows={1}
                  className="w-full px-6 py-4 pr-14 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm resize-none overflow-y-auto"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 bottom-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(question.title)}
                    className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                      <question.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-gray-900 font-medium mb-1 text-sm">{question.title}</h3>
                    <p className="text-gray-500 text-xs">{question.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="bg-white/80 backdrop-blur-md px-8 py-6 flex-shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustTextareaHeight(textareaRef);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="무역 관련 질문을 입력하세요..."
                rows={1}
                className="w-full px-6 py-4 pr-14 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 bottom-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* My Page Modal */}
      {showMyPageModal && !showPasswordChange && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
          onClick={() => setShowMyPageModal(false)}
        >
          <div
            className="bg-gradient-to-b from-gray-100 to-white rounded-3xl shadow-2xl w-80 overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <span className="text-gray-700 text-sm">{currentUser?.name || userEmployeeId}</span>
              <button
                onClick={() => setShowMyPageModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 border-4 border-blue-100">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-gray-900 mb-2">안녕하세요, {currentUser?.name || userEmployeeId}님</h3>
              <p className="text-gray-500 text-sm mb-6">Trade Copilot <br />무역서류작성 시스템에 오신 걸 환영합니다 :)</p>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full max-w-xs mx-auto bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-full border border-gray-300 transition-colors text-sm"
              >
                비밀번호 변경
              </button>
            </div>

            <div className="border-t border-gray-200">
              <button
                onClick={onLogout}
                className="w-full px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal - 실제 백엔드 API 연동 */}
      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => {
          setShowPasswordChange(false);
          setShowMyPageModal(false);
        }}
        empNo={userEmployeeId}
      />
    </div>
  );
}
