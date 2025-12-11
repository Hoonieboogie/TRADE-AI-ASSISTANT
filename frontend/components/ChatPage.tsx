import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Search, MessageCircle, FileText, TrendingUp, LogOut, User, Globe, Database, Wrench } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { PageType } from '../App';
import PasswordChangeModal from './document-creation/modals/PasswordChangeModal';

interface ChatPageProps {
  onNavigate: (page: PageType) => void;
  onLogoClick: (logoRect: DOMRect) => void;
  userEmployeeId: string;
  onLogout: () => void;
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

const suggestedQuestions = [
  {
    icon: FileText,
    title: 'LC란 무엇인가요?',
    description: '신용장의 개념과 종류'
  },
  {
    icon: MessageCircle,
    title: 'BL 작성 방법이 궁금해요',
    description: '선하증권 작성 가이드'
  },
  {
    icon: TrendingUp,
    title: '최근 무역 동향은?',
    description: '2025년 글로벌 무역 트렌드'
  }
];

export default function ChatPage({ onNavigate, onLogoClick, userEmployeeId, onLogout }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [genChatId, setGenChatId] = useState<number | null>(null);  // 채팅 세션 ID
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // API URL 정의 (useEffect보다 먼저 정의해야 함)
  const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 컴포넌트 마운트 시 항상 새 채팅방으로 시작 (genChatId를 null로 유지)
  // 첫 메시지 전송 시 백엔드에서 새 gen_chat_id를 생성해서 반환함

  // 채팅방 삭제 함수 (RDS + Mem0 모두 삭제)
  const deleteChat = async () => {
    if (!genChatId) return;

    try {
      const response = await fetch(`${DJANGO_API_URL}/api/chat/general/${genChatId}/`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        console.log(`✅ 채팅방 삭제 완료: gen_chat_id=${genChatId}`);
      } else {
        console.warn(`⚠️ 채팅방 삭제 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('채팅방 삭제 오류:', error);
    }
  };

  // 채팅방 나가기 (삭제 후 메인으로 이동)
  const handleExitChat = async (logoRect: DOMRect) => {
    await deleteChat();
    setGenChatId(null);
    setMessages([]);
    onLogoClick(logoRect);
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
    setIsLoading(true);

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

      // 스트리밍 시작 전 AI 메시지 추가
      setMessages(prev => [...prev, {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date(),
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
                // 채팅 세션 ID 저장 (메모리 기능용)
                if (data.gen_chat_id) {
                  setGenChatId(data.gen_chat_id);
                }
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
    } finally {
      setIsLoading(false);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Fixed Header */}
      <header className="bg-white/80 backdrop-blur-md flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
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
            <div>
              <h1 className="text-gray-900 font-bold">일반 채팅</h1>
              <p className="text-gray-500 text-sm">메인 페이지로 돌아가려면 다시 로고를 클릭하세요</p>
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

      {/* Main Content Area */}
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

              {/* 스트리밍 중이 아닐 때만 로딩 표시 (마지막 메시지가 user이거나, ai지만 content가 비어있을 때) */}
              {isLoading && messages.length > 0 && (
                messages[messages.length - 1].type === 'user' ||
                (messages[messages.length - 1].type === 'ai' && !messages[messages.length - 1].content)
              ) && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">답변 생성중...</span>
                    </div>
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
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="무역 관련 질문을 입력하세요..."
                  className="w-full px-6 py-4 pr-14 rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="무역 관련 질문을 입력하세요..."
                className="w-full px-6 py-4 pr-14 rounded-full border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
              <span className="text-gray-700 text-sm">{userEmployeeId}</span>
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
              <h3 className="text-gray-900 mb-2">안녕하세요, {userEmployeeId}님</h3>
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
