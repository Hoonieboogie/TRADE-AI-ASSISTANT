// SkipState.tsx - 건너뛰기 상태
import { motion } from 'framer-motion';
import { Ban, ArrowLeft } from 'lucide-react';

interface SkipStateProps { }

export default function SkipState({ }: SkipStateProps) {
  return (
    <div className="h-full flex flex-col p-4">


      <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6 relative">
            <Ban className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">이 단계는 건너뛰었습니다</h3>
          <p className="text-gray-500 mb-8">필요한 경우 다시 선택하기를 눌러 작성할 수 있습니다.</p>
        </motion.div>
      </div>
    </div>
  );
}
