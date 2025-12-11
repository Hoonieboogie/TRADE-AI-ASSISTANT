// ModeSelector.tsx - 작성 방식 선택 (직접작성/업로드/건너뛰기)
import { motion } from 'framer-motion';
import { PenTool, Upload, Ban } from 'lucide-react';
import type { StepMode } from '../types';

interface ModeSelectorProps {
  currentStep: number;
  onSelectMode: (mode: StepMode) => void;
}

export default function ModeSelector({
  currentStep,
  onSelectMode
}: ModeSelectorProps) {
  const stepName = currentStep === 1 ? 'Offer Sheet' : 'Sales Contract';

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        {stepName} 작성 방식 선택
      </h2>
      <p className="text-gray-500 mb-12 text-lg">원하시는 작성 방식을 선택해주세요.</p>

      <div className="flex gap-8">
        {/* Manual Entry Option */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectMode('manual')}
          className="w-64 h-80 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl border-2 border-blue-100 flex flex-col items-center justify-center p-6 shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
            <PenTool className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">직접 작성</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            템플릿을 사용하여<br />직접 내용을 입력합니다.
          </p>
        </motion.button>

        {/* File Upload Option */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectMode('upload')}
          className="w-64 h-80 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-2 border-purple-100 flex flex-col items-center justify-center p-6 shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">파일 업로드</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            이미 작성된 파일을<br />업로드합니다.
          </p>
        </motion.button>

        {/* Skip Option */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectMode('skip')}
          className="w-64 h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border-2 border-gray-200 flex flex-col items-center justify-center p-6 shadow-lg hover:shadow-xl transition-all group"
        >
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-md group-hover:scale-110 transition-transform">
            <Ban className="w-10 h-10 text-gray-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">건너뛰기</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            이 단계는 작성하지 않고<br />넘어갑니다.
          </p>
        </motion.button>
      </div>
    </div>
  );
}
