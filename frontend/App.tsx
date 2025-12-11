import { useState, useEffect, useCallback } from 'react';
import MainPage from './components/MainPage';
import ChatPage from './components/ChatPage';
import DocumentCreationPage from './components/DocumentCreationPage';
import LoginPage from './components/LoginPage';
import { User, api, Trade } from './utils/api';
import { checkStepCompletion, hydrateTemplate } from './utils/documentUtils';
import { offerSheetTemplateHTML } from './templates/offerSheet';
import { proformaInvoiceTemplateHTML } from './templates/proformaInvoice';
import { saleContractTemplateHTML } from './templates/saleContract';
import { commercialInvoiceTemplateHTML } from './templates/commercialInvoice';
import { packingListTemplateHTML } from './templates/packingList';

export type PageType = 'main' | 'chat' | 'documents';
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
      // 새 문서: 상태만 초기화 (Trade는 실제 저장 시점에 생성)
      if (!currentDocId) {
        setCurrentStep(1);
        setDocumentData({});
        setCurrentActiveShippingDoc(null);
        setDocSessionId(Date.now().toString());
      }
    }
    setCurrentPage(page);
  };

  const [isNewTrade, setIsNewTrade] = useState(false);

  const createNewTrade = async (): Promise<string | null> => {
    // Don't create if we already have a Trade or no user
    if (currentDocId || !currentUser) {
      return currentDocId;
    }

    try {
      // Trade 초기화 API 호출 - 새 Trade와 5개의 Document를 생성
      const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/trade/init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.emp_no,
          title: '새 무역 거래'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[App] Trade 생성 완료:', data);

        // 새로 생성된 Trade ID 설정
        const tradeId = data.trade_id.toString();
        setCurrentDocId(tradeId);

        // doc_ids를 직접 저장
        setCurrentDocIds(data.doc_ids);
        setIsNewTrade(true); // Mark as new trade

        // DON'T call fetchTrades here - trade shouldn't appear in list until saved
        // fetchTrades will be called when:
        // 1. User saves the document (handleSaveDocument)
        // 2. User exits without changes (handleDocumentExit - after deletion)

        return tradeId;
      } else {
        console.error('[App] Trade 생성 실패:', await response.text());
      }
    } catch (error) {
      console.error('[App] Trade 생성 오류:', error);
    }

    return null;
  };

  const handleDocumentExit = async (hasChanges: boolean) => {
    // If it's a NEW trade that hasn't been saved yet, delete it upon exit
    // We delete it regardless of hasChanges because if the user is exiting a new trade
    // without saving (isNewTrade is still true), they are abandoning it.
    if (isNewTrade && currentDocId) {
      try {
        // Delete the empty/abandoned Trade from backend
        await api.deleteTrade(parseInt(currentDocId));
        console.log(`[App] Deleted new trade ${currentDocId} on exit`);

        // Clear current document state
        setCurrentDocId(null);
        setCurrentDocIds(null);
        setIsNewTrade(false); // Reset new trade status

        // Refresh the document list
        await fetchTrades();
      } catch (error) {
        console.error('[App] Failed to delete new trade:', error);
      }
    } else {
      // If it's not a new trade (already saved previously), just clear state
      setCurrentDocId(null);
      setCurrentDocIds(null);
      setIsNewTrade(false);
    }
  };

  const handleOpenDocument = (doc: SavedDocument) => {
    setCurrentDocId(doc.id);

    const content: DocumentData = { ...doc.content };
    const docIds: Record<string, number> = {};
    const uploadedFileUrls: Record<number, string> = {};

    // tradeData에서 doc_ids 및 업로드 정보 복원
    doc.tradeData?.documents?.forEach((d: any) => {
      docIds[d.doc_type] = d.doc_id;
      if (d.upload_status === 'ready' && d.original_filename) {
        const step = docTypeToStep(d.doc_type);
        content.stepModes = { ...content.stepModes, [step]: 'upload' };
        content.uploadedFileNames = { ...content.uploadedFileNames, [step]: d.original_filename };
        if (d.s3_url) uploadedFileUrls[step] = d.s3_url;
      }
    });

    setCurrentDocIds(docIds);
    setDocumentData({ ...content, uploadedFileUrls });
    setCurrentStep(doc.lastStep || 1);
    setCurrentActiveShippingDoc(doc.lastActiveShippingDoc || null);
    setDocSessionId(Date.now().toString());
    setIsNewTrade(false);
    setTimeout(() => setCurrentPage('documents'), 0);
  };

  // 로고 클릭으로 채팅 열기 (확장 애니메이션)
  const handleOpenChat = (logoRect: DOMRect) => {
    setLogoPosition({
      x: logoRect.left + logoRect.width / 2,
      y: logoRect.top + logoRect.height / 2
    });
    setTransition('expanding');

    // 애니메이션 완료 후 상태 정리
    setTimeout(() => {
      setTransition('none');
      setCurrentPage('chat');
    }, 500);
  };

  // 로고 클릭으로 채팅 닫기 (축소 애니메이션)
  const handleCloseChat = (logoRect: DOMRect) => {
    setLogoPosition({
      x: logoRect.left + logoRect.width / 2,
      y: logoRect.top + logoRect.height / 2
    });
    setTransition('shrinking');

    // 애니메이션 완료 후 상태 정리
    setTimeout(() => {
      setTransition('none');
      setCurrentPage('main');
    }, 500);
  };
  const [savedDocuments, setSavedDocuments] = useState<SavedDocument[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);

  // doc_type을 step으로 변환
  const docTypeToStep = (docType: string): number => {
    const mapping: Record<string, number> = {
      'offer': 1, 'pi': 2, 'contract': 3, 'ci': 4, 'pl': 5
    };
    return mapping[docType] || 1;
  };

  // 백엔드에서 Trade 목록 가져오기
  const fetchTrades = useCallback(async () => {
    if (!currentUser) return;

    setIsLoadingTrades(true);
    try {
      const trades = await api.getTrades(currentUser.user_id);

      // Trade를 SavedDocument 형식으로 변환 (버전 정보 포함)
      const documents: SavedDocument[] = await Promise.all(
        trades.map(async (trade: Trade) => {
          // Trade 상세 정보 가져오기 (documents 포함)
          const tradeDetail = await api.getTrade(trade.trade_id);

          // 각 document의 versions 가져오기
          const allVersions: { id: string; timestamp: number; data: DocumentData; step: number }[] = [];
          const content: DocumentData = { title: trade.title };

          if (tradeDetail.documents) {
            for (const doc of tradeDetail.documents) {
              const versions = await api.getVersions(doc.doc_id);
              const step = docTypeToStep(doc.doc_type);

              // 최신 버전의 content를 저장
              if (versions.length > 0) {
                const latestVersion = versions[0].content as { html?: string; title?: string; stepModes?: Record<string, string> };
                // HTML 문자열 복원
                if (latestVersion.html) {
                  content[step] = latestVersion.html;
                }
                // title 복원 (최신 버전에서)
                if (latestVersion.title && !content.title) {
                  content.title = latestVersion.title;
                }
                // stepModes 복원
                if (latestVersion.stepModes && !content.stepModes) {
                  content.stepModes = latestVersion.stepModes;
                }
              }

              // 버전 히스토리 변환
              versions.forEach(v => {
                const vContent = v.content as { html?: string; title?: string };
                allVersions.push({
                  id: v.version_id.toString(),
                  timestamp: new Date(v.created_at).getTime(),
                  data: { [step]: vContent.html || vContent, title: vContent.title },
                  step: step
                });
              });
            }
          }

          // 버전을 시간순으로 정렬 (최신순)
          allVersions.sort((a, b) => b.timestamp - a.timestamp);

          // 가장 최근 버전의 step을 lastStep으로 설정
          const lastStep = allVersions.length > 0 ? allVersions[0].step : 1;

          // [CHANGED] Calculate progress client-side to ensure accuracy
          let calculatedCompletedCount = 0;
          const totalSteps = 5;
          const docTypes = ['offer', 'pi', 'contract', 'ci', 'pl'];

          for (let i = 0; i < totalSteps; i++) {
            const step = i + 1;
            const docType = docTypes[i];
            // tradeDetail.documents might be undefined if no documents
            const doc = tradeDetail.documents?.find((d: any) => d.doc_type === docType);

            // 1. Check Mode (Skip / Upload)
            if (doc) {
              if (doc.doc_mode === 'skip') {
                calculatedCompletedCount++;
                continue;
              }
              if (doc.doc_mode === 'upload' && doc.upload_status === 'ready') {
                calculatedCompletedCount++;
                continue;
              }
            }

            // 2. Check Content (Manual)
            const stepContent = content[step];
            if (stepContent && typeof stepContent === 'string' && checkStepCompletion(stepContent)) {
              calculatedCompletedCount++;
            }
          }

          const progress = Math.round((calculatedCompletedCount / totalSteps) * 100);

          // Force status based on calculated progress
          const status = progress === 100 ? 'completed' : 'in-progress';

          return {
            id: trade.trade_id.toString(),
            name: trade.title,
            date: new Date(trade.created_at).toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1),
            completedSteps: calculatedCompletedCount,
            totalSteps: totalSteps,
            progress: progress,
            status: status,
            content: content,
            tradeData: tradeDetail,  // documents 포함
            versions: allVersions,
            lastStep: lastStep,
          };
        })
      );

      setSavedDocuments(documents);
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [currentUser]);

  // 로그인 후 Trade 목록 로드
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchTrades();
    }
  }, [isAuthenticated, currentUser, fetchTrades]);

  // Track the ID of the document currently being edited
  const [currentDocId, setCurrentDocId] = useState<string | null>(sessionState.currentDocId);
  const [currentActiveShippingDoc, setCurrentActiveShippingDoc] = useState<'CI' | 'PL' | null>(null);
  // 현재 Trade의 doc_ids (직접 저장용 - 새 문서 생성 시 바로 사용)
  const [currentDocIds, setCurrentDocIds] = useState<Record<string, number> | null>(sessionState.currentDocIds);

  // step을 doc_type으로 변환
  const stepToDocType = (step: number, shippingDoc?: 'CI' | 'PL' | null): string => {
    if (step === 4 || step === 5) {
      return shippingDoc === 'PL' ? 'pl' : 'ci';
    }
    const mapping: Record<number, string> = { 1: 'offer', 2: 'pi', 3: 'contract' };
    return mapping[step] || 'offer';
  };

  // step에서 doc_id 가져오기
  const getDocId = useCallback((step: number, shippingDoc?: 'CI' | 'PL' | null): number | null => {
    const docType = stepToDocType(step, shippingDoc);

    // 1. 먼저 currentDocIds에서 찾기 (새 문서 생성 시 바로 사용)
    if (currentDocIds && currentDocIds[docType]) {
      return currentDocIds[docType];
    }

    // 2. savedDocuments에서 찾기
    if (!currentDocId) return null;
    const trade = savedDocuments.find(d => d.id === currentDocId);
    if (!trade?.tradeData?.documents) return null;

    const document = trade.tradeData.documents.find((d: { doc_type: string }) => d.doc_type === docType);
    return document?.doc_id || null;
  }, [currentDocId, savedDocuments, currentDocIds]);

  const handleSaveDocument = async (data: DocumentData, step: number, activeShippingDoc?: 'CI' | 'PL' | null, isCompleted?: boolean) => {
    // Update currentActiveShippingDoc if provided
    if (activeShippingDoc) {
      setCurrentActiveShippingDoc(activeShippingDoc);
    }

    // PL 문서인 경우 versionStep은 5
    const versionStep = activeShippingDoc === 'PL' ? 5 : step;

    // Determine the document ID (trade_id) to use
    let tradeId = currentDocId;

    // 백엔드 저장 로직
    try {
      // 새 Trade 생성 (currentDocId가 없는 경우) - /api/trade/init/ 사용
      if (!tradeId && currentUser) {
        const title = data.title || 'Untitled Document';
        const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/trade/init/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.emp_no, title })
        });

        if (!response.ok) throw new Error('Trade 생성 실패');

        const newTrade = await response.json();
        tradeId = newTrade.trade_id.toString();
        setCurrentDocId(tradeId);
        setCurrentDocIds(newTrade.doc_ids);
      }

      // Iterate through all potential document keys (1-5) to save all modified documents
      const docKeys = [1, 2, 3, 4, 5];
      const docTypeMapping: Record<number, string> = {
        1: 'offer',
        2: 'pi',
        3: 'contract',
        4: 'ci',
        5: 'pl'
      };

      if (tradeId) {
        const trade = await api.getTrade(parseInt(tradeId));

        // 제목이 변경되었으면 Trade 제목 업데이트 (한 번만 실행)
        const newTitle = data.title || 'Untitled Document';
        if (trade.title !== newTitle) {
          await api.updateTrade(parseInt(tradeId), { title: newTitle });
          console.log(`[API] Updated trade title to: ${newTitle}`);
        }

        // [ADDED] Update trade status based on completion
        if (isCompleted !== undefined) {
          const newStatus = isCompleted ? 'completed' : 'in_progress';
          if (trade.status !== newStatus) {
            await api.updateTrade(parseInt(tradeId), { status: newStatus });
            console.log(`[API] Updated trade status to: ${newStatus}`);
          }
        }

        // Save all documents concurrently
        await Promise.all(docKeys.map(async (key) => {
          const content = data[key];
          // Only save if content exists
          if (content) {
            const docType = docTypeMapping[key];
            const document = trade.documents?.find(d => d.doc_type === docType);

            if (document) {
              const versionContent = {
                html: content,
                title: data.title || '',
                stepModes: data.stepModes || {},
                savedAt: new Date().toISOString(),
              };
              await api.createVersion(document.doc_id, versionContent);
              console.log(`[API] Saved version for doc ${document.doc_id} (${docType})`);
            }
          }
        }));
      }

      // 저장 후 목록 새로고침 (백엔드에서 최신 데이터 가져옴)
      await fetchTrades();
      setIsNewTrade(false);

    } catch (error) {
      console.error('Failed to save to backend:', error);
    }
  };

  // 컴포넌트 마운트 시 localStorage에서 인증 상태 복원
  useEffect(() => {
    const savedAuth = localStorage.getItem('isAuthenticated');
    const savedEmail = localStorage.getItem('userEmail');
    const savedUser = localStorage.getItem('currentUser');

    if (savedAuth === 'true' && savedEmail) {
      setIsAuthenticated(true);
      setUserEmail(savedEmail);
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // 파싱 실패 시 무시
        }
      }
    }
  }, []);

  // 문서 작성 상태를 sessionStorage에 저장
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
    }

    // localStorage에 인증 상태 저장
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userEmail', employeeId);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  };

  const handleLogout = () => {
    // 로그아웃 처리
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
          versions={currentDocId ? savedDocuments.find(d => d.id === currentDocId)?.versions : undefined}
          onRestore={(version) => {
            setDocumentData(prev => ({
              ...prev,
              [version.step]: version.data[version.step]
            }));
            if (currentStep !== version.step) {
              setCurrentStep(version.step);
            }
          }}
          initialActiveShippingDoc={currentActiveShippingDoc}
          getDocId={getDocId}
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