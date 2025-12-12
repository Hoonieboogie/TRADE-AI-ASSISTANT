import { useState, useEffect, useCallback } from 'react';

// 타입 정의
export interface GenChat {
  gen_chat_id: number;
  user: number;
  user_name: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface GenMessage {
  gen_message_id: number;
  gen_chat: number;
  sender_type: 'U' | 'A';
  sender_type_display: string;
  content: string;
  files: unknown[];
  created_at: string;
}

const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

export function useChatList(userEmployeeId: string) {
  const [chats, setChats] = useState<GenChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 채팅 목록 조회
  const fetchChats = useCallback(async () => {
    if (!userEmployeeId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/gen-chats/?user_id=${userEmployeeId}`
      );

      if (!response.ok) {
        throw new Error('채팅 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      setChats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  }, [userEmployeeId]);

  // 채팅 삭제
  const deleteChat = useCallback(async (chatId: number) => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/gen-chats/${chatId}/`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        // 로컬 상태에서 즉시 제거 (낙관적 업데이트)
        setChats(prev => prev.filter(c => c.gen_chat_id !== chatId));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // 메시지 로드
  const loadMessages = useCallback(async (chatId: number): Promise<GenMessage[]> => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/gen-chats/${chatId}/messages/`
      );

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch {
      return [];
    }
  }, []);

  // 제목 수정
  const updateTitle = useCallback(async (chatId: number, newTitle: string) => {
    try {
      const response = await fetch(
        `${DJANGO_API_URL}/api/gen-chats/${chatId}/update_title/`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        }
      );

      if (response.ok) {
        const updatedChat = await response.json();
        // 로컬 상태 업데이트
        setChats(prev => prev.map(c =>
          c.gen_chat_id === chatId ? { ...c, title: updatedChat.title } : c
        ));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // 새 채팅 추가 (로컬 상태만 - 실제 생성은 첫 메시지 전송 시)
  const addChatToList = useCallback((chat: GenChat) => {
    setChats(prev => [chat, ...prev]);
  }, []);

  // 채팅 정보 업데이트 (메시지 수 등)
  const updateChat = useCallback((chatId: number, updates: Partial<GenChat>) => {
    setChats(prev => prev.map(c =>
      c.gen_chat_id === chatId ? { ...c, ...updates } : c
    ));
  }, []);

  // 채팅을 맨 위로 이동 (최근 활동 시)
  const bringChatToTop = useCallback((chatId: number) => {
    setChats(prev => {
      const chatIndex = prev.findIndex(c => c.gen_chat_id === chatId);
      if (chatIndex <= 0) return prev; // 이미 맨 위이거나 없으면 그대로

      const chat = prev[chatIndex];
      const updatedChat = { ...chat, updated_at: new Date().toISOString() };
      return [updatedChat, ...prev.slice(0, chatIndex), ...prev.slice(chatIndex + 1)];
    });
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    isLoading,
    error,
    refetch: fetchChats,
    deleteChat,
    loadMessages,
    updateTitle,
    addChatToList,
    updateChat,
    bringChatToTop
  };
}
