import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// CJK (한국어, 중국어, 일본어) 폰트 지원을 위한 cMap 설정
const pdfOptions = {
  cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface PdfViewerProps {
  fileUrl: string;
  className?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, className = '' }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF 로드 실패:', error);
    setError('PDF 파일을 불러올 수 없습니다.');
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  return (
    <div className={`pdf-viewer-container ${className} flex flex-col h-full`}>
      {/* 상단 툴바 */}
      <div className="pdf-toolbar bg-gray-100 border-b border-gray-300 p-3 flex items-center justify-between flex-shrink-0">
        {/* 페이지 정보 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">
            총 {numPages || '-'} 페이지
          </span>
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            -
          </button>
          <span className="text-sm text-gray-700 w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
          >
            +
          </button>
          <button
            onClick={resetZoom}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition text-sm"
          >
            초기화
          </button>
        </div>
      </div>

      {/* PDF 뷰어 영역 - 스크롤 가능 */}
      <div className="pdf-content overflow-auto bg-gray-50 p-4 flex-1">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-red-800 font-semibold">오류</h3>
              </div>
              <p className="text-red-700">{error}</p>
              <p className="text-red-500 text-sm mt-2">URL: {fileUrl?.substring(0, 100)}...</p>
            </div>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={pdfOptions}
            loading={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">PDF 로딩 중...</p>
                </div>
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            {/* 모든 페이지 렌더링 - 스크롤로 이동 */}
            {Array.from(new Array(numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
