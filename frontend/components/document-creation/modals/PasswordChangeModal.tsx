// PasswordChangeModal.tsx - 비밀번호 변경 모달
import { useState } from 'react';
import { api } from '../../../utils/api';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  empNo: string;
}

// 비밀번호 유효성 검사 함수
// 조건: 8~16자, 영문(A-Z, a-z) + 숫자 + 특수문자 모두 포함
function validatePassword(password: string): { isValid: boolean; message: string } {
  // 길이 검사 (8~16자)
  if (password.length < 8 || password.length > 16) {
    return { isValid: false, message: '비밀번호는 8~16자 사이여야 합니다.' };
  }

  // 각 문자 유형 포함 여부 확인
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

  // 영문, 숫자, 특수문자 모두 포함해야 함
  if (!hasLetter) {
    return { isValid: false, message: '비밀번호에 영문자(A-Z, a-z)가 포함되어야 합니다.' };
  }
  if (!hasNumber) {
    return { isValid: false, message: '비밀번호에 숫자(0-9)가 포함되어야 합니다.' };
  }
  if (!hasSpecialChar) {
    return { isValid: false, message: '비밀번호에 특수문자(!@#$%^&* 등)가 포함되어야 합니다.' };
  }

  return { isValid: true, message: '' };
}

export default function PasswordChangeModal({
  isOpen,
  onClose,
  empNo
}: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setPasswordError('');
    setPasswordSuccess(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsLoading(false);
    onClose();
  };

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    console.log('[PasswordChange] 새 비밀번호:', newPassword);
    console.log('[PasswordChange] empNo:', empNo);

    // 현재 비밀번호 입력 확인
    if (!currentPassword) {
      setPasswordError('현재 비밀번호를 입력해주세요.');
      return;
    }

    // 새 비밀번호 유효성 검사
    const validation = validatePassword(newPassword);
    console.log('[PasswordChange] 유효성 검사 결과:', validation);
    if (!validation.isValid) {
      setPasswordError(validation.message);
      return;
    }

    // 새 비밀번호 확인 일치 검사
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    // 백엔드 API 호출
    setIsLoading(true);
    setPasswordError('');

    try {
      await api.changePassword(empNo, currentPassword, newPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.';
      setPasswordError(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
      onClick={handleClose}
    >
      <div
        className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-gray-900">비밀번호 변경</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="docCurrentPassword">
              현재 비밀번호
            </label>
            <input
              type="password"
              id="docCurrentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3"
              placeholder="현재 비밀번호를 입력하세요"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="docNewPassword">
              새 비밀번호
            </label>
            <input
              type="password"
              id="docNewPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3"
              placeholder="8~16자, 영문/숫자/특수문자 조합"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="docConfirmPassword">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              id="docConfirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3"
              placeholder="새 비밀번호를 다시 입력하세요"
            />
          </div>

          {passwordError && (
            <div className="text-red-500 text-sm">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="text-green-500 text-sm">비밀번호가 성공적으로 변경되었습니다!</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
          >
            비밀번호 변경
          </button>
        </form>
      </div>
    </div>
  );
}
