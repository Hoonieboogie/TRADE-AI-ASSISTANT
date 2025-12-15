import { useState, useEffect, useCallback } from 'react';
import MainPage from './components/MainPage';
import ChatPage from './components/ChatPage';
import DocumentCreationPage from './components/DocumentCreationPage';
import LoginPage from './components/LoginPage';
import AdminPage from './components/AdminPage';
import { User, api, Trade } from './utils/api';
import { checkStepCompletion, hydrateTemplate } from './utils/documentUtils';
import { offerSheetTemplateHTML } from './templates/offerSheet';
import { proformaInvoiceTemplateHTML } from './templates/proformaInvoice';
import { saleContractTemplateHTML } from './templates/saleContract';
import { commercialInvoiceTemplateHTML } from './templates/commercialInvoice';
import { packingListTemplateHTML } from './templates/packingList';

export type PageType = 'main' | 'chat' | 'documents' | 'admin';
export type TransitionType = 'none' | 'expanding' | 'shrinking';

export interface DocumentData {
  title?: string;
  [key: string]: any;
}

export interface SavedDocument {
  id: string;
  name: string;
  date: string;
  completedSteps: number;
  totalSteps: number;
  progress: number;
  status: 'completed' | 'in-progress';
  content?: DocumentData;
  lastStep?: number;
  lastActiveShippingDoc?: 'CI' | 'PL' | null;
  versions?: {
    id: string;
    timestamp: number;
    data: DocumentData;
    step: number;
  }[];
  tradeData?: Trade; // 백엔드 Trade 원본 데이터
}

// sessionStorage에서 문서 작성 상태 복원
const getSessionState = () => {
  try {
    return {
      currentPage: (sessionStorage.getItem('currentPage') as PageType) || 'main',
      currentStep: Number(sessionStorage.getItem('currentStep')) || 0,
      documentData: JSON.parse(sessionStorage.getItem('documentData') || '{}'),
      currentDocId: sessionStorage.getItem('currentDocId'),
      currentDocIds: JSON.parse(sessionStorage.getItem('currentDocIds') || 'null'),
    };
  } catch {
    return { currentPage: 'main' as PageType, currentStep: 0, documentData: {}, currentDocId: null, currentDocIds: null };
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const sessionState = getSessionState();
  const [currentPage, setCurrentPage] = useState<PageType>(sessionState.currentPage);
  const [currentStep, setCurrentStep] = useState(sessionState.currentStep);
  const [documentData, setDocumentData] = useState<DocumentData>(sessionState.documentData);
  const [transition, setTransition] = useState<TransitionType>('none');
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });
  const [docSessionId, setDocSessionId] = useState<string>(Date.now().toString());

  const handleNavigate = async (page: PageType) => {
    if (page === 'main') {
      setCurrentDocId(null);
      setCurrentDocIds(null);
      setDocumentData({});
      setCurrentStep(0);
    }

    if (page === 'documents') {
      // 새 문서 작성 시 항상 초기화 (handleOpenDocument는 setCurrentPage 직접 호출하므로 영향 없음)
      setCurrentDocId(null);
      setCurrentDocIds(null);
      setCurrentStep(1);
      setDocumentData({});
      setCurrentActiveShippingDoc(null);
      setDocSessionId(Date.now().toString());
    }
    setCurrentPage(page);
  };

  const [isNewTrade, setIsNewTrade] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  const generateUniqueTitle = useCallback((baseTitle: string = '새 문서'): string => {
    const existingTitles = savedDocuments.map(doc => doc.name);
    if (!existingTitles.includes(baseTitle)) return baseTitle;

    const regex = new RegExp(`^${baseTitle} (\\d+)$`);
    let maxNumber = 0;
    existingTitles.forEach(title => {
      const match = title.match(regex);
      if (match) maxNumber = Math.max(maxNumber, parseInt(match[1]));
    });
    return `${baseTitle} ${maxNumber + 1}`;
  }, [savedDocuments]);

  const createNewTrade = async (): Promise<{ tradeId: string; docIds: Record<string, number> } | null> => {
    if (currentDocId || !currentUser) {
      return currentDocId ? { tradeId: currentDocId, docIds: currentDocIds || {} } : null;
    }

    try {
      const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/trade/init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.emp_no, title: generateUniqueTitle('새 문서') })
      });

      if (response.ok) {
        const data = await response.json();
        const tradeId = data.trade_id.toString();
        setCurrentDocId(tradeId);
        setCurrentDocIds(data.doc_ids);
        setIsNewTrade(true);
        return { tradeId, docIds: data.doc_ids };
      }
    } catch (error) {
      console.error('[App] Trade 생성 오류:', error);
    }
    return null;
  };

  const handleDocumentExit = async () => {
    if (isNewTrade && currentDocId) {
      try {
        await api.deleteTrade(parseInt(currentDocId));
        await fetchTrades();
      } catch (error) {
        console.error('[App] Failed to delete new trade:', error);
      }
    }
    setCurrentDocId(null);
    setCurrentDocIds(null);
    setIsNewTrade(false);
  };

  const handleOpenDocument = (doc: SavedDocument, initialStep?: number) => {
    setCurrentDocId(doc.id);

    const content: DocumentData = { ...doc.content };
    const docIds: Record<string, number> = {};
    const uploadedFileUrls: Record<number, string> = {};
    const uploadedConvertedPdfUrls: Record<number, string> = {};

    doc.tradeData?.documents?.forEach((d: any) => {
      docIds[d.doc_type] = d.doc_id;
      const step = docTypeToStep(d.doc_type);

      if (d.doc_mode) content.stepModes = { ...content.stepModes, [step]: d.doc_mode };
      if (d.upload_status === 'ready' && d.original_filename) {
        content.uploadedFileNames = { ...content.uploadedFileNames, [step]: d.original_filename };
        if (d.s3_url) uploadedFileUrls[step] = d.s3_url;
        if (d.converted_pdf_url) uploadedConvertedPdfUrls[step] = d.converted_pdf_url;
      }
    });

    setCurrentDocIds(docIds);
    setDocumentData({ ...content, uploadedFileUrls, uploadedConvertedPdfUrls });

    const targetStep = initialStep || doc.lastStep || 1;
    if (targetStep === 4) {
      setCurrentStep(4);
      setCurrentActiveShippingDoc('CI');
    } else if (targetStep === 5) {
      setCurrentStep(4);
      setCurrentActiveShippingDoc('PL');
    } else {
      setCurrentStep(targetStep);
      setCurrentActiveShippingDoc(doc.lastActiveShippingDoc || null);
    }

    setDocSessionId(Date.now().toString());
    setIsNewTrade(false);
    setTimeout(() => setCurrentPage('documents'), 0);
  };

  const handleOpenChat = (logoRect: DOMRect) => {
    setLogoPosition({ x: logoRect.left + logoRect.width / 2, y: logoRect.top + logoRect.height / 2 });
    setTransition('expanding');
    setTimeout(() => { setTransition('none'); setCurrentPage('chat'); }, 500);
  };

  const handleCloseChat = (logoRect: DOMRect) => {
    setLogoPosition({ x: logoRect.left + logoRect.width / 2, y: logoRect.top + logoRect.height / 2 });
    setTransition('shrinking');
    setTimeout(() => { setTransition('none'); setCurrentPage('main'); }, 500);
  };

  const docTypeToStep = (docType: string): number => {
    const mapping: Record<string, number> = { 'offer': 1, 'pi': 2, 'contract': 3, 'ci': 4, 'pl': 5 };
    return mapping[docType] || 1;
  };

  const fetchTrades = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingTrades(true);
    try {
      const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/trade/dashboard/?user_id=${currentUser.user_id}`);
      if (!response.ok) throw new Error(`Failed to fetch dashboard: ${response.statusText}`);

      const trades = await response.json();
      const documents: SavedDocument[] = trades.map((trade: any) => {
        const content: DocumentData = { title: trade.title };
        const allVersions: { id: string; timestamp: number; data: DocumentData; step: number }[] = [];

        trade.documents?.forEach((doc: any) => {
          const step = docTypeToStep(doc.doc_type);

          if (doc.doc_mode) content.stepModes = { ...(content.stepModes || {}), [step]: doc.doc_mode };

          if (doc.latest_version?.content) {
            const latestContent = doc.latest_version.content;
            if (latestContent.html) content[step] = latestContent.html;
            else if (typeof latestContent === 'string') content[step] = latestContent;
            if (latestContent.title && !content.title) content.title = latestContent.title;
          }

          doc.all_versions?.forEach((version: any) => {
            if (version.content) {
              const vc = version.content;
              allVersions.push({
                id: version.version_id.toString(),
                timestamp: new Date(version.created_at).getTime(),
                data: { [step]: vc.html || vc, title: vc.title },
                step
              });
            }
          });
        });

        allVersions.sort((a, b) => b.timestamp - a.timestamp);
        const lastStep = allVersions.length > 0 ? allVersions[0].step : 1;

        let completedCount = 0;
        const totalSteps = 5;
        const docTypes = ['offer', 'pi', 'contract', 'ci', 'pl'];

        for (let i = 0; i < totalSteps; i++) {
          const step = i + 1;
          const doc = trade.documents?.find((d: any) => d.doc_type === docTypes[i]);

          if (doc?.doc_mode === 'skip' || (doc?.doc_mode === 'upload' && doc?.upload_status === 'ready')) {
            completedCount++;
            continue;
          }

          const stepContent = content[step];
          if (stepContent && typeof stepContent === 'string' && checkStepCompletion(stepContent)) {
            completedCount++;
          }
        }

        const progress = Math.round((completedCount / totalSteps) * 100);
        const status = progress === 100 ? 'completed' : 'in-progress';

        return {
          id: trade.trade_id.toString(),
          name: trade.title,
          date: new Date(trade.created_at).toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1),
          completedSteps: completedCount,
          totalSteps,
          progress,
          status,
          content,
          tradeData: trade,
          versions: allVersions,
          lastStep,
        };
      });

      setSavedDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) fetchTrades();
  }, [isAuthenticated, currentUser, fetchTrades]);

  const [currentDocId, setCurrentDocId] = useState<string | null>(sessionState.currentDocId);
  const [currentActiveShippingDoc, setCurrentActiveShippingDoc] = useState<'CI' | 'PL' | null>(null);
  const [currentDocIds, setCurrentDocIds] = useState<Record<string, number> | null>(sessionState.currentDocIds);

  const stepToDocType = (step: number, shippingDoc?: 'CI' | 'PL' | null): string => {
    if (step === 4 || step === 5) return shippingDoc === 'PL' ? 'pl' : 'ci';
    return { 1: 'offer', 2: 'pi', 3: 'contract' }[step] || 'offer';
  };

  const getDocId = useCallback((step: number, shippingDoc?: 'CI' | 'PL' | null): number | null => {
    const docType = stepToDocType(step, shippingDoc);
    if (currentDocIds?.[docType]) return currentDocIds[docType];
    if (!currentDocId) return null;
    const trade = savedDocuments.find(d => d.id === currentDocId);
    return trade?.tradeData?.documents?.find((d: { doc_type: string }) => d.doc_type === docType)?.doc_id || null;
  }, [currentDocId, savedDocuments, currentDocIds]);

  const handleSaveDocument = async (data: DocumentData, step: number, activeShippingDoc?: 'CI' | 'PL' | null, isCompleted?: boolean) => {
    if (activeShippingDoc) setCurrentActiveShippingDoc(activeShippingDoc);

    let tradeId = currentDocId;

    try {
      if (!tradeId && currentUser) {
        const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/trade/init/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.emp_no, title: data.title || generateUniqueTitle('새 문서') })
        });
        if (!response.ok) throw new Error('Trade 생성 실패');

        const newTrade = await response.json();
        tradeId = newTrade.trade_id.toString();
        setCurrentDocId(tradeId);
        setCurrentDocIds(newTrade.doc_ids);
      }

      const docTypeMapping: Record<number, string> = { 1: 'offer', 2: 'pi', 3: 'contract', 4: 'ci', 5: 'pl' };

      if (tradeId) {
        const trade = await api.getTrade(parseInt(tradeId));

        let newTitle = data.title || '';
        if (!newTitle || newTitle.startsWith('Untitled Document') || newTitle === '새 문서' || newTitle === '새 무역 거래') {
          newTitle = generateUniqueTitle('새 문서');
        }
        if (trade.title !== newTitle) await api.updateTrade(parseInt(tradeId), { title: newTitle });

        if (isCompleted !== undefined) {
          const newStatus = isCompleted ? 'completed' : 'in_progress';
          if (trade.status !== newStatus) await api.updateTrade(parseInt(tradeId), { status: newStatus });
        }

        await Promise.all([1, 2, 3, 4, 5].map(async (key) => {
          const stepMode = data.stepModes?.[key];
          if (stepMode === 'skip' || stepMode === 'upload') return;

          // 저장할 step 결정: upload/skip 모드면 다음 직접 작성 step을 저장
          let targetStep = step;
          const currentStepMode = data.stepModes?.[step];
          if (currentStepMode === 'upload' || currentStepMode === 'skip') {
            // step1 upload/skip → step2, step3 upload/skip → step4
            if (step === 1) targetStep = 2;
            else if (step === 3) targetStep = 4;
          }

          // targetStep에 해당하는 step만 버전 저장
          if (targetStep <= 3) {
            if (key !== targetStep) return;
          } else {
            // step 4: activeShippingDoc에 따라 CI(4) 또는 PL(5)만 저장
            const targetKey = activeShippingDoc === 'PL' ? 5 : 4;
            if (key !== targetKey) return;
          }

          const content = data[key];
          if (!content) return;

          const docType = docTypeMapping[key];
          const document = trade.documents?.find(d => d.doc_type === docType);
          if (!document) return;

          const versionContent = { html: content, title: data.title || '', stepModes: data.stepModes || {}, savedAt: new Date().toISOString() };
          const latest = document.latest_version?.content;
          const latestHtml = typeof latest === 'string' ? latest : (latest?.html || '');
          const latestTitle = typeof latest === 'string' ? '' : (latest?.title || '');

          if (latestHtml !== content || latestTitle !== (data.title || '')) {
            await api.createVersion(document.doc_id, versionContent);
          }
        }));
      }

      await fetchTrades();
      setIsNewTrade(false);
    } catch (error) {
      console.error('Failed to save to backend:', error);
    }
  };

  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedEmail = localStorage.getItem('userEmail');
    const savedUser = localStorage.getItem('currentUser');

    if (savedAuth === 'true' && savedEmail) {
      setIsAuthenticated(true);
      setUserEmail(savedEmail);
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);
          if (user.user_role === 'admin') setCurrentPage('admin');
        } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
    sessionStorage.setItem('currentStep', currentStep.toString());
    sessionStorage.setItem('documentData', JSON.stringify(documentData));
    currentDocId ? sessionStorage.setItem('currentDocId', currentDocId) : sessionStorage.removeItem('currentDocId');
    currentDocIds ? sessionStorage.setItem('currentDocIds', JSON.stringify(currentDocIds)) : sessionStorage.removeItem('currentDocIds');
  }, [currentPage, currentStep, documentData, currentDocId, currentDocIds]);

  const handleLogin = (employeeId: string, user?: User) => {
    setUserEmail(employeeId);
    setIsAuthenticated(true);
    if (user) {
      setCurrentUser(user);
      setCurrentPage(user.user_role === 'admin' ? 'admin' : 'main');
    }
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', employeeId);
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserEmail('');
    setCurrentUser(null);
    setCurrentPage('main');

    // localStorage에서 인증 상태 제거
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('currentUser');
  };

  // 로그인하지 않은 경우 로그인 페이지 표시
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // clip-path 원의 중심 위치 계산 (% 단위)
  const clipOriginX = logoPosition.x ? (logoPosition.x / window.innerWidth) * 100 : 50;
  const clipOriginY = logoPosition.y ? (logoPosition.y / window.innerHeight) * 100 : 50;

  const handleDeleteDocument = async (docId: string) => {
    try {
      // 백엔드에서 Trade 삭제
      await api.deleteTrade(parseInt(docId));
      console.log(`[API] Deleted trade ${docId}`);
      // 로컬 상태에서도 제거
      setSavedDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Failed to delete trade:', error);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* 메인 페이지 (항상 뒤에) */}
      {(currentPage === 'main' || transition === 'expanding') && (
        <div className={transition === 'expanding' ? 'pointer-events-none' : ''}>
          <MainPage
            onNavigate={handleNavigate}
            savedDocuments={savedDocuments}
            userEmployeeId={userEmail}
            onLogout={handleLogout}
            onOpenDocument={handleOpenDocument}
            onLogoClick={handleOpenChat}
            onDeleteDocument={handleDeleteDocument}
            isLoading={isLoadingTrades}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* 채팅 페이지 (확장 시 원형으로 나타남) */}
      {transition === 'expanding' && (
        <>
          {/* 글로우 효과 원 */}
          <div
            className="fixed z-40 rounded-full animate-glow-expand pointer-events-none"
            style={{
              left: logoPosition.x,
              top: logoPosition.y,
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              background: 'rgba(37, 99, 235, 0.3)',
              boxShadow: '0 0 30px 15px rgba(37, 99, 235, 0.5), 0 0 60px 30px rgba(37, 99, 235, 0.3)'
            }}
          />
          {/* 채팅 페이지 */}
          <div
            className="fixed inset-0 z-50 animate-clip-expand"
            style={{
              clipPath: `circle(0% at ${clipOriginX}% ${clipOriginY}%)`
            }}
          >
            <ChatPage
              onNavigate={handleNavigate}
              onLogoClick={handleCloseChat}
              userEmployeeId={userEmail}
              onLogout={handleLogout}
            />
          </div>
        </>
      )}

      {/* 축소 시 메인 페이지와 글로우 효과 */}
      {transition === 'shrinking' && (
        <>
          <MainPage
            onNavigate={handleNavigate}
            savedDocuments={savedDocuments}
            userEmployeeId={userEmail}
            onLogout={handleLogout}
            onOpenDocument={handleOpenDocument}
            onLogoClick={handleOpenChat}
            onDeleteDocument={handleDeleteDocument}
            isLoading={isLoadingTrades}
            currentUser={currentUser}
          />
          {/* 글로우 효과 원 */}
          <div
            className="fixed z-40 rounded-full animate-glow-shrink pointer-events-none"
            style={{
              left: logoPosition.x,
              top: logoPosition.y,
              transform: 'translate(-50%, -50%)',
              width: '300vmax',
              height: '300vmax',
              background: 'transparent',
              boxShadow: '0 0 30px 15px rgba(37, 99, 235, 0.5), 0 0 60px 30px rgba(37, 99, 235, 0.3)'
            }}
          />
        </>
      )}

      {/* 일반 채팅 페이지 (축소 애니메이션 포함) */}
      {(currentPage === 'chat' || transition === 'shrinking') && transition !== 'expanding' && (
        <div
          className={transition === 'shrinking' ? 'fixed inset-0 z-50 animate-clip-shrink' : ''}
          style={transition === 'shrinking' ? {
            clipPath: `circle(150% at ${clipOriginX}% ${clipOriginY}%)`
          } : undefined}
        >
          <ChatPage
            onNavigate={handleNavigate}
            onLogoClick={handleCloseChat}
            userEmployeeId={userEmail}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* 문서 페이지 */}
      {currentPage === 'documents' && (
        <DocumentCreationPage
          key={docSessionId}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          documentData={documentData}
          setDocumentData={setDocumentData}
          onNavigate={handleNavigate}
          userEmployeeId={userEmail}
          onLogout={handleLogout}
          onSave={handleSaveDocument}
          onCreateTrade={createNewTrade}
          onExit={handleDocumentExit}
          versions={currentDocId ? savedDocuments.find(d => d.id === currentDocId)?.versions || [] : []}
          initialActiveShippingDoc={currentActiveShippingDoc}
          getDocId={getDocId}
        />
      )}

      {/* 관리자 페이지 */}
      {currentPage === 'admin' && currentUser?.user_role === 'admin' && (
        <AdminPage
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 전환 애니메이션 스타일 */}
      <style>{`
        @keyframes clip-expand {
          0% {
            clip-path: circle(0% at ${clipOriginX}% ${clipOriginY}%);
          }
          100% {
            clip-path: circle(150% at ${clipOriginX}% ${clipOriginY}%);
          }
        }

        @keyframes clip-shrink {
          0% {
            clip-path: circle(150% at ${clipOriginX}% ${clipOriginY}%);
          }
          100% {
            clip-path: circle(0% at ${clipOriginX}% ${clipOriginY}%);
          }
        }

        @keyframes glow-expand {
          0% {
            width: 40px;
            height: 40px;
            opacity: 1;
          }
          100% {
            width: 300vmax;
            height: 300vmax;
            opacity: 0;
          }
        }

        @keyframes glow-shrink {
          0% {
            width: 300vmax;
            height: 300vmax;
            opacity: 0;
          }
          100% {
            width: 40px;
            height: 40px;
            opacity: 1;
          }
        }

        .animate-clip-expand {
          animation: clip-expand 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-clip-shrink {
          animation: clip-shrink 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-glow-expand {
          animation: glow-expand 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .animate-glow-shrink {
          animation: glow-shrink 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}

export default App;