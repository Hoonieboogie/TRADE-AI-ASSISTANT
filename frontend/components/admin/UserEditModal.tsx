import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { User, Department, api } from '../../utils/api';

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departments: Department[];
}

export default function UserEditModal({ user, isOpen, onClose, onSuccess, departments }: UserEditModalProps) {
  const [name, setName] = useState('');
  const [deptId, setDeptId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [activation, setActivation] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 사용자 정보로 폼 초기화
  useEffect(() => {
    if (user) {
      setName(user.name);
      setDeptId(user.dept?.dept_id ?? null);
      setUserRole(user.user_role);
      setActivation(user.activation);
    }
  }, [user]);

  const handleClose = () => {
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');

    // 유효성 검사 (백엔드 모델 제약조건과 동기화)
    const NAME_MAX_LENGTH = 100;

    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (name.trim().length > NAME_MAX_LENGTH) {
      setError(`이름은 ${NAME_MAX_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    setIsLoading(true);

    try {
      await api.updateUser(user.user_id, {
        name: name.trim(),
        dept_id: deptId,
        user_role: userRole,
        activation: activation,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 정보 수정에 실패했습니다.');
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
          <h2 className="text-xl font-bold text-gray-900">사용자 정보 수정</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Number (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사원번호
            </label>
            <input
              type="text"
              value={user.emp_no}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              disabled
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <div className="mt-1 text-right text-xs text-gray-400">
              {name.length}/100
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              부서
            </label>
            <select
              value={deptId ?? ''}
              onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="">부서 없음</option>
              {departments.map(dept => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.dept_name}
                </option>
              ))}
            </select>
          </div>

          {/* User Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              역할
            </label>
            <select
              value={userRole}
              onChange={(e) => setUserRole(e.target.value as 'user' | 'admin')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            >
              <option value="user">사용자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          {/* Activation Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              계정 상태
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activation"
                  checked={activation}
                  onChange={() => setActivation(true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">활성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activation"
                  checked={!activation}
                  onChange={() => setActivation(false)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">비활성 (휴직 등)</span>
              </label>
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
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
