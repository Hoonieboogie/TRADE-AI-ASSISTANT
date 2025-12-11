// DocumentHeader.tsx - 문서 페이지 헤더
import { useState } from 'react';
import { ArrowLeft, Save, Download, Clock } from 'lucide-react';
import type { DocumentData, PageType, Version } from '../types';

interface DocumentHeaderProps {
  documentData: DocumentData;
  onTitleChange: (title: string) => void;
  isDirty: boolean;
  onBackClick: () => void;
  onSave: () => void;
  onDownload: () => void;
  onVersionHistoryClick: () => void;
  onMyPageClick: () => void;
  onLogoutClick: () => void;
  versions: Version[];
  currentStep: number;
}

export default function DocumentHeader({
  documentData,
  onTitleChange,
  isDirty,
  onBackClick,
  onSave,
  onDownload,
  onVersionHistoryClick,
  onMyPageClick,
  onLogoutClick,
  versions,
  currentStep
}: DocumentHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentData.title || '');

  const handleTitleSave = () => {
    onTitleChange(tempTitle);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTempTitle(documentData.title || '');
      setIsEditingTitle(false);
    }
  };

  const hasVersionsForCurrentStep = versions.filter(v => v.step === currentStep).length > 0;

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm flex-shrink-0 relative z-40">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Left: Back button and Title */}
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onBackClick}
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                placeholder="제목을 입력하세요. (예: USA-Fashion-20251126)"
                className="text-gray-900 font-bold border-b-2 border-blue-500 outline-none focus:border-blue-600 bg-transparent w-80 py-1"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setIsEditingTitle(true);
                  setTempTitle(documentData.title || '');
                }}
                className="text-gray-900 font-bold hover:text-blue-600 transition-colors text-left"
              >
                {documentData.title || '제목을 입력하세요. (클릭)'}
              </button>
            )}
            <p className="text-gray-500 text-sm">문서 작성</p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSave}
            className="text-gray-600 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors"
            title="전체 저장"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
          <button
            onClick={onDownload}
            className="text-gray-600 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors"
            title="현재 문서 다운로드"
          >
            <Download className="w-4 h-4" />
            다운로드
          </button>
          <button
            onClick={onVersionHistoryClick}
            className="text-gray-600 hover:text-blue-600 text-sm flex items-center gap-1 transition-colors group relative"
            title="버전 기록"
          >
            <Clock className="w-4 h-4" />
            버전 기록
            {hasVersionsForCurrentStep && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white" />
            )}
          </button>
          <div className="w-px h-4 bg-gray-300 mx-2"></div>
          <button
            onClick={onMyPageClick}
            className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            마이페이지
          </button>
          <button
            onClick={onLogoutClick}
            className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
