// ShippingDocsDashboard.tsx - 선적서류 대시보드 (Step 4)
import { motion } from 'framer-motion';
import { FileText, Package, Check } from 'lucide-react';
import type { DocumentData, ShippingDocType } from '../types';

interface ShippingDocsDashboardProps {
  documentData: DocumentData;
  onSelectDoc: (doc: ShippingDocType) => void;
}

export default function ShippingDocsDashboard({
  documentData,
  onSelectDoc
}: ShippingDocsDashboardProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden p-8">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-50 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50 animate-pulse delay-700" />
      </div>

      <div className="relative z-10 text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">선적 서류 작성</h2>
        <p className="text-gray-500 text-lg">
          Commercial Invoice와 Packing List를<br />
          자유롭게 오가며 작성할 수 있습니다.
        </p>
      </div>

      <div className="relative z-10 flex gap-8">
        {/* Commercial Invoice Card */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectDoc('CI')}
          className="w-72 h-80 bg-white/80 backdrop-blur-xl rounded-3xl border border-blue-100 flex flex-col items-center justify-center p-6 shadow-xl hover:shadow-2xl hover:border-blue-300 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Commercial Invoice</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed relative z-10">
            상업 송장을<br />작성합니다.
          </p>

          {/* Status Indicator */}
          {documentData[4] && (
            <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              작성됨
            </div>
          )}
        </motion.button>

        {/* Packing List Card */}
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectDoc('PL')}
          className="w-72 h-80 bg-white/80 backdrop-blur-xl rounded-3xl border border-indigo-100 flex flex-col items-center justify-center p-6 shadow-xl hover:shadow-2xl hover:border-indigo-300 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <Package className="w-10 h-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Packing List</h3>
          <p className="text-sm text-gray-500 text-center leading-relaxed relative z-10">
            포장 명세서를<br />작성합니다.
          </p>

          {/* Status Indicator */}
          {documentData[5] && (
            <div className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Check className="w-3 h-3" />
              작성됨
            </div>
          )}
        </motion.button>
      </div>
    </div>
  );
}
