
// FileUploadView.tsx - 파일 업로드 뷰
import React from 'react';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import PdfViewer from '../../PdfViewer';
import PreviewTextFetcher from './PreviewTextFetcher';
import type { UploadStatus } from '../types';

interface FileUploadViewProps {
  file: File | null;
  fileName?: string;
  status: UploadStatus;
  documentUrl: string | null;
  docId?: number | null;
  convertedPdfUrl?: string | null;
  error: string | null;
  onUpload: (file: File) => void;
  onRetry: () => void;
}

export default function FileUploadView({
  file,
  fileName,
  status,
  documentUrl,
  docId,
  convertedPdfUrl,
  error,
  onUpload,
  onRetry
}: FileUploadViewProps) {
  // ready 상태: PdfViewer 렌더링
  if (status === 'ready' && documentUrl) {
    return (
      <div className="h-full flex flex-col">
        <div className="mb-4 flex-shrink-0 flex items-center justify-end px-4">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{file?.name || fileName}</span>
          </div>
        </div>
        {/* Preview Area */}
        <div className="flex-1 bg-gray-50 relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm flex items-center justify-center">
          {(file?.name || fileName || '').toLowerCase().endsWith('.pdf') || convertedPdfUrl ? (
            <PdfViewer fileUrl={convertedPdfUrl || documentUrl || ''} className="h-full w-full" />
          ) : (
            <div className="h-full w-full flex flex-col bg-white p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">문서 분석 완료</h3>
                    <p className="text-sm text-gray-500">{file?.name || fileName}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  TEXT PREVIEW
                </span>
              </div>

              <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-4 border border-gray-200 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                {/* 텍스트 미리보기는 별도 API 호출이 필요할 수 있음. 
                    현재 documentUrl이 S3 URL이라면 텍스트를 직접 가져올 수 없음.
                    하지만 여기서는 간단히 안내 문구 대신 텍스트를 보여주려는 의도임.
                    실제로는 extracted_text를 가져오는 로직이 필요함.
                    
                    임시로: documentUrl이 텍스트 내용을 포함하지 않으므로, 
                    상위 컴포넌트에서 extracted_text를 전달받거나 여기서 fetch해야 함.
                    
                    일단은 "텍스트 추출됨" 상태를 보여주고, 
                    실제 텍스트는 챗봇이 알고 있다는 점을 강조하거나,
                    별도로 텍스트를 fetch하는 로직을 추가해야 함.
                 */}
                <PreviewTextFetcher docId={docId?.toString()} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // uploading/processing 상태: 로딩 스피너
  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {status === 'uploading' ? '파일 업로드 중...' : '문서 분석 중...'}
            </h3>
            <p className="text-gray-500 mb-2">{file?.name || fileName}</p>
            <p className="text-sm text-gray-400">
              {status === 'uploading' ? 'S3에 파일을 업로드하고 있습니다' : '문서 내용을 분석하고 있습니다'}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // error 상태: 오류 메시지 + 재시도 버튼
  if (status === 'error') {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">업로드 실패</h3>
            <p className="text-red-500 mb-6 max-w-md">{error || '알 수 없는 오류가 발생했습니다'}</p>
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              다시 시도
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // idle 상태: 파일 선택 UI
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      // 확장자 체크
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'docx', 'hwp'].includes(ext || '')) {
        onUpload(droppedFile);
      } else {
        alert('지원되지 않는 파일 형식입니다. (PDF, DOCX, HWP 가능)');
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden p-8">
        <div className="w-full max-w-2xl">
          <label
            className={`flex flex-col items-center justify-center w-full h-96 border-3 border-dashed rounded-3xl cursor-pointer transition-all group relative overflow-hidden
              ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400'}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 transition-opacity ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

            <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
              <div className={`w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm transition-transform duration-300 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'}`} />
              </div>
              <p className="mb-2 text-xl text-gray-600 font-medium">
                <span className="font-bold text-blue-600">클릭하여 업로드</span> 또는 파일을 여기로 드래그하세요
              </p>
              <p className="text-sm text-gray-500">PDF, DOCX, HWP 파일 (최대 10MB)</p>
            </div>
            <input
              type="file"
              accept=".pdf,application/pdf,.docx,.hwp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

