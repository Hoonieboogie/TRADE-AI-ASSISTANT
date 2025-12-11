// LogoutConfirmModal.tsx - 로그아웃 확인 모달
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onLogout
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl w-[400px] overflow-hidden shadow-2xl border border-white/20 relative"
      >
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-red-100 to-orange-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-orange-100 to-yellow-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="p-8 text-center relative z-10">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner transform rotate-3">
            <LogOut className="w-8 h-8 text-red-500" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-2">작성 중인 문서가 있습니다</h3>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            로그아웃하면 작성 중인 내용이 저장되지 않을 수 있습니다.<br />
            정말 로그아웃 하시겠습니까?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
            >
              취소
            </button>
            <button
              onClick={onLogout}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-200 hover:-translate-y-0.5 transition-all font-bold text-sm shadow-md"
            >
              로그아웃
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
