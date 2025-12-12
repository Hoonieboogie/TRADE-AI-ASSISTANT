import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MessageSquare, AlertCircle } from 'lucide-react';
import ChatListItem from './ChatListItem';
import { GenChat, useChatList } from './useChatList';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentChatId: number | null;
  onSelectChat: (chat: GenChat) => void;
  onNewChat: () => void;
  onChatDeleted?: (chatId: number) => void;
  userEmployeeId: string;
  isDesktop: boolean;
}

// 로딩 스켈레톤
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 rounded-xl bg-gray-100 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

// 빈 상태
function EmptyState({ onNewChat }: { onNewChat: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-gray-900 font-medium mb-1">채팅 내역이 없습니다</h3>
      <p className="text-gray-500 text-sm mb-4">새 채팅을 시작해보세요</p>
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                   hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        새 채팅 시작
      </button>
    </div>
  );
}

// 삭제 확인 모달
function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  chatTitle
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chatTitle: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">채팅 삭제</h3>
        </div>
        <p className="text-gray-600 mb-6">
          <span className="font-medium">"{chatTitle || '새 대화'}"</span> 채팅을 삭제하시겠습니까?
          <br />
          <span className="text-sm text-gray-500">이 작업은 되돌릴 수 없습니다.</span>
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl
                       hover:bg-gray-50 transition-colors font-medium"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl
                       hover:bg-red-700 transition-colors font-medium"
          >
            삭제
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ChatSidebar({
  isOpen,
  onClose,
  currentChatId,
  onSelectChat,
  onNewChat,
  onChatDeleted,
  userEmployeeId,
  isDesktop
}: ChatSidebarProps) {
  const { chats, isLoading, error, deleteChat, updateTitle, refetch } = useChatList(userEmployeeId);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);

  // 삭제 확인
  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      const deletedId = deleteConfirm.id;
      const success = await deleteChat(deletedId);
      setDeleteConfirm(null);

      // 삭제 성공 시 부모에게 알림
      if (success && onChatDeleted) {
        onChatDeleted(deletedId);
      }
    }
  };

  // 데스크톱: Push 방식 (상대 위치)
  // 모바일: Overlay 방식 (고정 위치 + 백드롭)
  const sidebarContent = (
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className={`
        ${isDesktop
          ? 'relative h-full'
          : 'fixed left-0 top-0 bottom-0 z-[80]'}
        w-[320px] bg-white/95 backdrop-blur-xl shadow-2xl
        border-r border-gray-200/50 flex flex-col
      `}
    >
      {/* Header */}
      <div className="p-5 pb-4 border-b border-gray-100 bg-white/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">채팅 목록</h2>
              <p className="text-xs text-gray-500">{chats.length}개의 대화</p>
            </div>
          </div>
          {!isDesktop && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => {
            onNewChat();
            if (!isDesktop) onClose();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4
                     bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                     font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5
                     active:translate-y-0"
        >
          <Plus className="w-5 h-5" />
          새 채팅 시작
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              onClick={refetch}
              className="text-blue-600 text-sm hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : chats.length === 0 ? (
          <EmptyState onNewChat={() => {
            onNewChat();
            if (!isDesktop) onClose();
          }} />
        ) : (
          <AnimatePresence mode="popLayout">
            {chats.map((chat, index) => (
              <motion.div
                key={chat.gen_chat_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.03 }}
              >
                <ChatListItem
                  chat={chat}
                  isActive={chat.gen_chat_id === currentChatId}
                  onSelect={() => {
                    onSelectChat(chat);
                    if (!isDesktop) onClose();
                  }}
                  onDelete={() => setDeleteConfirm({ id: chat.gen_chat_id, title: chat.title })}
                  onUpdateTitle={(newTitle) => updateTitle(chat.gen_chat_id, newTitle)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        chatTitle={deleteConfirm?.title || ''}
      />
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - 모바일에서만 */}
          {!isDesktop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[70]"
            />
          )}

          {sidebarContent}
        </>
      )}
    </AnimatePresence>
  );
}
