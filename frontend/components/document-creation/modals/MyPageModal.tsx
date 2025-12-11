// MyPageModal.tsx - 마이페이지 모달
import { User, LogOut } from 'lucide-react';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmployeeId: string;
  onPasswordChange: () => void;
  onLogout: () => void;
}

export default function MyPageModal({
  isOpen,
  onClose,
  userEmployeeId,
  onPasswordChange,
  onLogout
}: MyPageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-gray-100 to-white rounded-3xl shadow-2xl w-80 overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
          <span className="text-gray-700 text-sm">{userEmployeeId}</span>
          <button
            onClick={onClose}
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
            onClick={onPasswordChange}
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
  );
}
