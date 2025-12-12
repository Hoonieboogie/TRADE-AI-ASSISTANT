import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Trash2, Pencil, Check, X } from 'lucide-react';
import { GenChat } from './useChatList';

interface ChatListItemProps {
  chat: GenChat;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateTitle: (newTitle: string) => void;
}

export default function ChatListItem({
  chat,
  isActive,
  onSelect,
  onDelete,
  onUpdateTitle
}: ChatListItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 시간 포맷팅
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // 편집 모드 시 입력창 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 제목 저장
  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== chat.title) {
      onUpdateTitle(editTitle.trim());
    }
    setIsEditing(false);
  };

  // 제목 취소
  const handleCancelEdit = () => {
    setEditTitle(chat.title);
    setIsEditing(false);
  };

  // Enter 키로 저장
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        group relative p-4 rounded-xl cursor-pointer transition-all duration-200
        ${isActive
          ? 'bg-blue-50 border border-blue-200 shadow-sm'
          : 'hover:bg-gray-50 border border-transparent hover:border-gray-200'}
      `}
      onClick={() => !isEditing && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-1 text-sm font-medium border border-blue-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveTitle();
                }}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelEdit();
                }}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <h3 className={`font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
              {chat.title || '새 대화'}
            </h3>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {chat.message_count > 0 ? `${chat.message_count}개의 메시지` : '메시지 없음'}
            <span className="mx-1">·</span>
            {formatTimeAgo(chat.updated_at)}
          </p>
        </div>

        {/* More Options Button */}
        {!isEditing && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-1.5 rounded-lg transition-all
                ${showMenu
                  ? 'bg-gray-200 opacity-100'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200'}`}
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl
                             border border-gray-200 py-1 z-50 min-w-[120px]"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700
                               hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    이름 변경
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600
                               hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
