// ExitConfirmModal.tsx - 저장하지 않고 나가기 확인 모달

interface ExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
}

export default function ExitConfirmModal({
  isOpen,
  onClose,
  onExit
}: ExitConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
      <div className="bg-white rounded-xl p-6 w-96 shadow-2xl transform transition-all scale-100">
        <h3 className="text-lg font-bold text-gray-900 mb-2">저장하지 않고 나가시겠습니까?</h3>
        <p className="text-gray-500 text-sm mb-6">
          작성 중인 내용이 저장되지 않았습니다.<br />
          정말 나가시겠습니까?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            나가기
          </button>
        </div>
      </div>
    </div>
  );
}
