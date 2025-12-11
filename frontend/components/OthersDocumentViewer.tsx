import { useState } from 'react';
import { Upload, FileText, Trash2, ArrowLeft } from 'lucide-react';

interface UploadedFile {
    id: string;
    name: string;
    url: string;
    uploadDate: string;
}

interface OthersDocumentViewerProps {
    onFileSelect: (fileUrl: string) => void;
    selectedFile: string | null;
    onBackToList: () => void;
}

export default function OthersDocumentViewer({ onFileSelect, selectedFile, onBackToList }: OthersDocumentViewerProps) {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/x-hwp', // hwp
        ];

        // HWP MIME type check might vary by browser/OS, so we also check extension
        const isHwp = file.name.toLowerCase().endsWith('.hwp');

        if (!validTypes.includes(file.type) && !isHwp) {
            // Allow if it looks like a supported type but MIME is missing/generic
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!['pdf', 'docx', 'hwp'].includes(ext || '')) {
                alert('지원되지 않는 파일 형식입니다. (PDF, DOCX, HWP 가능)');
                return;
            }
        }

        const fileUrl = URL.createObjectURL(file);
        const newFile: UploadedFile = {
            id: Date.now().toString(),
            name: file.name,
            url: fileUrl,
            uploadDate: new Date().toLocaleDateString('ko-KR')
        };

        setUploadedFiles(prev => [...prev, newFile]);
    };

    const handleDeleteFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(file => file.id !== id));
    };

    if (selectedFile) {
        return (
            <div className="h-full flex flex-col bg-white">
                {/* PDF Viewer Header */}
                <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
                    <button
                        onClick={onBackToList}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <h3 className="font-semibold text-gray-800">문서 보기</h3>
                </div>

                {/* PDF Display */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                    {selectedFile.toLowerCase().endsWith('.pdf') ? (
                        <iframe
                            src={selectedFile}
                            className="w-full h-full border-0 rounded-lg shadow-lg bg-white"
                            title="Document Viewer"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg shadow-lg border border-gray-200">
                            <FileText className="w-20 h-20 text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-600">이 파일 형식은 미리보기를 지원하지 않습니다.</p>
                            <p className="text-sm text-gray-500 mt-2">다운로드하여 확인해주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const [isDragging, setIsDragging] = useState(false);

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
            const file = e.dataTransfer.files[0];
            const validTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
                'application/x-hwp', // hwp
            ];
            const isHwp = file.name.toLowerCase().endsWith('.hwp');

            if (!validTypes.includes(file.type) && !isHwp) {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (!['pdf', 'docx', 'hwp'].includes(ext || '')) {
                    alert('지원되지 않는 파일 형식입니다. (PDF, DOCX, HWP 가능)');
                    return;
                }
            }

            const fileUrl = URL.createObjectURL(file);
            const newFile: UploadedFile = {
                id: Date.now().toString(),
                name: file.name,
                url: fileUrl,
                uploadDate: new Date().toLocaleDateString('ko-KR')
            };
            setUploadedFiles(prev => [...prev, newFile]);
        }
    };

    return (
        <div
            className={`h-full flex flex-col bg-white p-6 ${isDragging ? 'bg-blue-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Upload Button */}
            <div className="mb-6">
                <label className={`inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors shadow-md ${isDragging ? 'scale-105 ring-4 ring-blue-300' : ''}`}>
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">문서 업로드</span>
                    <input
                        type="file"
                        accept=".pdf,.docx,.hwp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/x-hwp"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </label>
                <p className="text-sm text-gray-500 mt-2">PDF, DOCX, HWP 파일 업로드 가능 (또는 파일을 이곳에 드래그하세요)</p>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-auto">
                {uploadedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <FileText className="w-16 h-16 mb-3" />
                        <p className="text-lg">업로드된 문서가 없습니다</p>
                        <p className="text-sm">위의 버튼을 클릭하여 문서를 업로드하세요</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {uploadedFiles.map((file) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
                            >
                                <button
                                    onClick={() => onFileSelect(file.url)}
                                    className="flex items-center gap-3 flex-1 text-left"
                                >
                                    <FileText className="w-8 h-8 text-red-500" />
                                    <div>
                                        <p className="font-medium text-gray-800 group-hover:text-blue-600">
                                            {file.name}
                                        </p>
                                        <p className="text-sm text-gray-500">{file.uploadDate}</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                    title="삭제"
                                >
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
