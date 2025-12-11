// DownloadModal.tsx - 문서 다운로드 모달
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, X, Check, FileText } from 'lucide-react';
import type { DocumentData } from '../types';
import { STEP_SHORT_NAMES } from '../types';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: DocumentData;
  onDownload: (selectedSteps: Set<number>) => void;
}

export default function DownloadModal({
  isOpen,
  onClose,
  documentData,
  onDownload
}: DownloadModalProps) {
  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(new Set());

  // 모달이 열릴 때 모든 가능한 스텝 선택
  useEffect(() => {
    if (isOpen) {
      const availableSteps = Object.keys(documentData)
        .filter(k => k !== 'title')
        .map(Number)
        .filter(step => documentData[step] && typeof documentData[step] === 'string' && documentData[step].length > 0);
      setSelectedSteps(new Set(availableSteps));
    }
  }, [isOpen, documentData]);

  if (!isOpen) return null;

  const availableSteps = Object.keys(documentData)
    .filter(k => k !== 'title')
    .map(Number)
    .filter(step => documentData[step] && typeof documentData[step] === 'string' && documentData[step].length > 0)
    .sort((a, b) => a - b);

  const toggleSelectAll = () => {
    if (selectedSteps.size === availableSteps.length) {
      setSelectedSteps(new Set());
    } else {
      setSelectedSteps(new Set(availableSteps));
    }
  };

  const toggleStep = (stepIndex: number) => {
    const newSet = new Set(selectedSteps);
    if (newSet.has(stepIndex)) {
      newSet.delete(stepIndex);
    } else {
      newSet.add(stepIndex);
    }
    setSelectedSteps(newSet);
  };

  const handleDownload = () => {
    onDownload(selectedSteps);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/90 backdrop-blur-xl rounded-3xl w-[500px] overflow-hidden shadow-2xl border border-white/20 relative"
      >
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-purple-100 to-pink-100 rounded-full blur-3xl opacity-50" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">문서 다운로드</h3>
              <p className="text-blue-100 text-xs font-medium mt-0.5">다운로드할 문서를 선택해주세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              선택된 문서: <span className="text-blue-600">{selectedSteps.size}개</span>
            </span>
            <button
              onClick={toggleSelectAll}
              className="text-xs text-gray-500 hover:text-blue-600 font-medium px-3 py-1.5 bg-white rounded-full border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all"
            >
              {selectedSteps.size === availableSteps.length ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
            {availableSteps.map((stepIndex) => {
              const documentNames: Record<number, string> = {
                1: 'Offer Sheet',
                2: 'Proforma Invoice (PI)',
                3: 'Sales Contract',
                4: 'Commercial Invoice',
                5: 'Packing List'
              };
              return (
                <div
                  key={stepIndex}
                  onClick={() => toggleStep(stepIndex)}
                  className={`
                  flex items-center p-3.5 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden
                  ${selectedSteps.has(stepIndex)
                      ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                      : 'bg-white/60 border-gray-200 hover:border-blue-300 hover:bg-white/80 hover:shadow-md'}
                `}
                >
                  <div className={`
                  w-5 h-5 rounded-md border flex items-center justify-center mr-3.5 transition-all duration-200 relative z-10
                  ${selectedSteps.has(stepIndex)
                      ? 'bg-blue-600 border-blue-600 shadow-sm scale-110'
                      : 'border-gray-300 bg-white group-hover:border-blue-400'}
                `}>
                    {selectedSteps.has(stepIndex) && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex-1 relative z-10">
                    <p className={`text-sm font-semibold transition-colors ${selectedSteps.has(stepIndex) ? 'text-blue-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {documentNames[stepIndex] || `Document ${stepIndex}`}
                    </p>
                  </div>
                  <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200 relative z-10
                  ${selectedSteps.has(stepIndex)
                      ? 'bg-white border-blue-100 text-blue-600 shadow-sm'
                      : 'bg-gray-50 border-gray-100 text-gray-400 group-hover:bg-white group-hover:border-blue-100 group-hover:text-blue-500'}
                `}>
                    <FileText className="w-4 h-4" />
                  </div>

                  {/* Selection Highlight */}
                  {selectedSteps.has(stepIndex) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 pointer-events-none" />
                  )}
                </div>
              );
            })}

            {availableSteps.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 text-sm font-medium">저장된 문서가 없습니다.</p>
                <p className="text-gray-400 text-xs mt-1">문서를 먼저 작성해주세요.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white/60 backdrop-blur-md border-t border-white/50 flex justify-end gap-3 relative z-10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors text-sm font-medium"
          >
            취소
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedSteps.size === 0}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all duration-200
              ${selectedSteps.size === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 active:translate-y-0'}
            `}
          >
            <Download className="w-4 h-4" />
            {selectedSteps.size}개 문서 다운로드
          </button>
        </div>
      </motion.div>
    </div>
  );
}
