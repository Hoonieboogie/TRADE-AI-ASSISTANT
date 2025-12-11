// EmptyState.tsx - 초기 빈 상태 (Step 0)
import { FileText, Plus, MousePointerClick } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-50 rounded-full blur-3xl opacity-60 animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 text-center p-8 max-w-lg mx-auto">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner transform rotate-3 hover:rotate-6 transition-transform duration-500">
          <FileText className="w-12 h-12 text-blue-600" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
          무역 서류 작성을<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            시작해보세요
          </span>
        </h2>

        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          상단의 <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full mx-1"><Plus className="w-3 h-3 text-gray-600" /></span> 버튼을 클릭하여<br />
          원하는 서류 템플릿을 선택해주세요.
        </p>

        <div className="flex items-center justify-center gap-2 text-sm text-blue-600 font-medium bg-blue-50 py-2 px-4 rounded-full inline-flex animate-bounce">
          <MousePointerClick className="w-4 h-4" />
          <span>위쪽의 동그라미를 클릭하세요!</span>
        </div>
      </div>
    </div>
  );
}
