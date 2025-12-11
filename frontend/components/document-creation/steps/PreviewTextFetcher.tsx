import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const DJANGO_API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

export default function PreviewTextFetcher({ docId }: { docId?: string }) {
    const [text, setText] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!docId) return;

        // docId가 숫자가 아닐 수 있으므로 (S3 URL 등에서 파싱 시) 주의
        // 여기서는 docId가 실제 ID라고 가정 (또는 상위에서 전달받아야 함)
        // 하지만 documentUrl에는 docId가 없을 수 있음.
        // FileUploadView의 props 구조상 docId를 직접 받지 않음.
        // 따라서 이 컴포넌트는 docId를 받아야 함.

        // 임시: docId가 없으면 로딩만 표시
        if (!docId || isNaN(Number(docId))) {
            setLoading(false);
            setText("문서 ID를 확인할 수 없어 미리보기를 불러올 수 없습니다.");
            return;
        }

        fetch(`${DJANGO_API_URL}/api/documents/documents/${docId}/`)
            .then(res => res.json())
            .then(data => {
                setText(data.extracted_text || "추출된 텍스트가 없습니다.");
            })
            .catch(err => {
                console.error(err);
                setText("텍스트를 불러오는 중 오류가 발생했습니다.");
            })
            .finally(() => setLoading(false));
    }, [docId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>텍스트 불러오는 중...</span>
            </div>
        );
    }

    return <div className="whitespace-pre-wrap">{text}</div>;
}
