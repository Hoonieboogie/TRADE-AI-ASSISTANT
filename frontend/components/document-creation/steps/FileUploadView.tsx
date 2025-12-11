
// FileUploadView.tsx - 파일 업로드 뷰
import { motion } from 'framer-motion';
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import PdfViewer from '../../PdfViewer';
import type { UploadStatus } from '../types';

interface FileUploadViewProps {
  file: File | null;
  fileName?: string;
  status: UploadStatus;
  documentUrl: string | null;
  error: string | null;
  onUpload: (file: File) => void;
  onRetry: () => void;
}

export default function FileUploadView({
  file,
  fileName,
  status,
  documentUrl,
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
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
          <PdfViewer fileUrl={documentUrl} className="h-full" />
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
              {status === 'uploading' ? '파일 업로드 중...' : 'PDF 분석 중...'}
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
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden p-8">
        <div className="w-full max-w-2xl">
          <label className="flex flex-col items-center justify-center w-full h-96 border-3 border-dashed border-gray-300 rounded-3xl cursor-pointer bg-gray-50 hover:bg-blue-50 hover:border-blue-400 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-500" />
              </div>
              <p className="mb-2 text-xl text-gray-600 font-medium">
                <span className="font-bold text-blue-600">클릭하여 업로드</span> 또는 파일을 여기로 드래그하세요
              </p>
              <p className="text-sm text-gray-500">PDF 파일 (최대 10MB)</p>
            </div>
            <input
              type="file"
              accept=".pdf,application/pdf"
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

