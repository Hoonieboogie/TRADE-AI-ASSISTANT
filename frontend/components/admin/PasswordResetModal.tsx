import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { User, api } from '../../utils/api';

interface PasswordResetModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordResetModal({ user, isOpen, onClose, onSuccess }: PasswordResetModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleReset = async () => {
    if (!user) return;

    setError('');
    setIsLoading(true);

    try {
      await api.resetPassword(user.user_id);
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 초기화에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
      onClick={handleClose}
    >
      <div
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">비밀번호 초기화</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">비밀번호를 초기화하시겠습니까?</p>
              <p>
                <span className="font-bold">{user.name}</span>({user.emp_no}) 사용자의 비밀번호가{' '}
                <span className="font-mono font-bold">a123456!</span>로 초기화됩니다.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">사원번호</div>
              <div className="text-gray-900 font-medium">{user.emp_no}</div>
              <div className="text-gray-500">이름</div>
              <div className="text-gray-900 font-medium">{user.name}</div>
              <div className="text-gray-500">부서</div>
              <div className="text-gray-900 font-medium">{user.dept?.dept_name || '-'}</div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? '초기화 중...' : '초기화'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
