// SaveSuccessModal.tsx - 저장 완료 모달
import { CheckCircle, FileText } from 'lucide-react';
import type { DocumentData } from '../types';
import { STEP_SHORT_NAMES } from '../types';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: DocumentData;
  modifiedSteps: Set<number>;
}

export default function SaveSuccessModal({
  isOpen,
  onClose,
  documentData,
  modifiedSteps
}: SaveSuccessModalProps) {
  if (!isOpen) return null;

  const savedSteps = Object.keys(documentData)
    .filter(k => k !== 'title' && k !== 'stepModes')
    .map(Number)
    .filter(stepIndex => !isNaN(stepIndex) && stepIndex >= 1 && stepIndex <= 5 && modifiedSteps.has(stepIndex))
    .sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-[420px] shadow-2xl transform transition-all scale-100 animate-bounce-in relative overflow-hidden border border-white/20">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-200 animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 mb-2">저장 완료!</h3>
          <p className="text-gray-500 mb-8 leading-relaxed">
            문서가 성공적으로 저장되었습니다.<br />
            <span className="text-sm text-gray-400">작성 중인 내용은 언제든 다시 불러올 수 있습니다.</span>
          </p>

          <div className="w-full bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-inner p-5 mb-8 text-left relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between mb-3 relative z-10">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                저장된 문서
              </p>
              <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Saved</span>
            </div>

            <div className="space-y-2 relative z-10">
              {savedSteps.map((stepIndex) => {
                const documentNames: Record<number, string> = {
                  1: 'Offer Sheet',
                  2: 'Proforma Invoice (PI)',
                  3: 'Sales Contract',
                  4: 'Commercial Invoice',
                  5: 'Packing List'
                };
                return (
                  <div key={stepIndex} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="text-sm text-gray-700 font-medium">{documentNames[stepIndex] || `Document ${stepIndex}`}</span>
                  </div>
                );
              })}
              {savedSteps.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-2">저장된 내용이 없습니다.</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl transition-all duration-200 font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
