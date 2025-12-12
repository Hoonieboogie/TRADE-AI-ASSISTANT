import { FileText, Plus, ChevronDown, LogOut, CheckCircle, Clock, Search, Filter, User, Sparkles, Trash2, Check, Settings } from 'lucide-react';
import { checkStepCompletion } from '../utils/documentUtils';
import { PageType, SavedDocument } from '../App';
import { useState, useEffect, useRef } from 'react';
import PasswordChangeModal from './document-creation/modals/PasswordChangeModal';
import { User as UserType } from '../utils/api';

interface MainPageProps {
  onNavigate: (page: PageType) => void;
  savedDocuments: SavedDocument[];
  userEmployeeId: string;
  onLogout: () => void;
  onLogoClick: (logoRect: DOMRect) => void;
  onOpenDocument: (doc: SavedDocument, initialStep?: number) => void;
  onDeleteDocument: (docId: string) => void;
  isLoading?: boolean;
  currentUser?: UserType | null;
}



export default function MainPage({ onNavigate, savedDocuments, userEmployeeId, onLogout, onLogoClick, onOpenDocument, onDeleteDocument, isLoading, currentUser }: MainPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SavedDocument | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowStatusFilter(false);
      }
    };

    if (showStatusFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusFilter]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
    setShowLogoutConfirm(false);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      onDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // 필터링 및 검색 로직
  // 필터링 및 검색 로직
  const filteredTasks = savedDocuments.filter(doc => {
    // 검색 필터
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());

    // 상태 필터
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="px-8 py-4 flex items-center justify-between">
          {/* Left: Logo and Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                onLogoClick(rect);
              }}
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 cursor-pointer"
              title="일반 채팅 열기"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-gray-900 font-bold">Trade Copilot</h1>
              <p className="text-sm animate-text-pulse">
                일반 채팅을 하려면 로고 아이콘을 클릭하세요
              </p>
            </div>
          </div>

          {/* Right: User Info and Logout */}
          <div className="flex items-center gap-4">
            {currentUser?.user_role === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors"
              >
                <Settings className="w-4 h-4" />
                관리자
              </button>
            )}
            <button
              onClick={() => setShowMyPageModal(!showMyPageModal)}
              className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors"
            >
              마이페이지
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 작업</h1>
        </div>

        {/* Floating Action Button - 우측 하단 고정 */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => onNavigate('documents')}
            className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Filter and Search Section */}
        <div className="mb-4 flex items-center gap-4">
          {/* Status Filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowStatusFilter(!showStatusFilter)}
              className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              <Filter className="w-5 h-5" />
              <span>
                {statusFilter === 'all' && '전체'}
                {statusFilter === 'completed' && '완료된 작업'}
                {statusFilter === 'in-progress' && '진행 중'}
              </span>
              <ChevronDown className="w-5 h-5" />
            </button>
            {showStatusFilter && (
              <div className="absolute top-14 left-0 w-40 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setShowStatusFilter(false);
                  }}
                  className="w-full p-2 text-left hover:bg-gray-50 transition-colors"
                >
                  전체
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('completed');
                    setShowStatusFilter(false);
                  }}
                  className="w-full p-2 text-left hover:bg-gray-50 transition-colors"
                >
                  완료된 작업
                </button>
                <button
                  onClick={() => {
                    setStatusFilter('in-progress');
                    setShowStatusFilter(false);
                  }}
                  className="w-full p-2 text-left hover:bg-gray-50 transition-colors"
                >
                  진행중인 작업
                </button>
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-700 px-4 py-2 pl-10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="작업 검색..."
            />
            <Search className="absolute top-2.5 left-3 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Task Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-48 animate-pulse">
                <div className="flex items-start gap-4 h-full">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 flex flex-col h-full">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-6" />
                    <div className="mt-auto">
                      <div className="h-2 bg-gray-200 rounded-full w-full mb-2" />
                      <div className="h-2 bg-gray-200 rounded-full w-2/3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchQuery || statusFilter !== 'all'
                ? '검색 결과가 없습니다'
                : '아직 작업이 없습니다'}
            </h3>
            <p className="text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? '다른 검색어나 필터를 시도해보세요'
                : '첫 작업을 시작해보세요'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => onNavigate('documents')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                새 작업
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {filteredTasks.map(doc => {
              const isCompleted = doc.status === 'completed' || doc.progress === 100;

              return (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col relative overflow-hidden"
                >
                  {/* Header Section */}
                  <div className="flex items-start gap-4 mb-6">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      <svg className="w-10 h-10 text-blue-600 drop-shadow-sm" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" />
                        <path d="M14 2V8H20" fillOpacity="0.5" fill="white" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-gray-900 font-bold text-xl line-clamp-1 tracking-tight" title={doc.name}>{doc.name}</h3>
                        {isCompleted ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">
                            In Progress
                          </span>
                        )}
                      </div>
                      {/* Relative Time */}
                      <p className="text-gray-400 text-sm font-medium">
                        마지막 수정: {(() => {
                          const updatedAt = doc.tradeData?.updated_at ? new Date(doc.tradeData.updated_at) : new Date(doc.date);
                          const now = new Date();
                          const diffInSeconds = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);

                          if (diffInSeconds < 60) return '방금 전';
                          if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
                          if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
                          if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`;
                          return updatedAt.toLocaleDateString('ko-KR');
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Last Action Section */}
                  <div className="max-h-0 opacity-0 overflow-hidden mb-0 group-hover:max-h-[500px] group-hover:opacity-100 group-hover:mb-5 transition-all duration-300 ease-in-out">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-800 font-medium text-base">
                        <span>최근 작업:</span>
                        <span className="text-gray-900 font-bold">
                          {(() => {
                            if (!doc.tradeData?.documents || doc.tradeData.documents.length === 0) return '없음';
                            const sortedDocs = [...doc.tradeData.documents].sort((a: any, b: any) => {
                              const dateA = new Date(a.updated_at || a.created_at).getTime();
                              const dateB = new Date(b.updated_at || b.created_at).getTime();
                              return dateB - dateA;
                            });
                            const lastDoc = sortedDocs[0];
                            const docNames: Record<string, string> = {
                              'offer': 'Offer Sheet',
                              'pi': 'Proforma Invoice',
                              'contract': 'Sales Contract',
                              'ci': 'Commercial Invoice',
                              'pl': 'Packing List'
                            };
                            return docNames[lastDoc.doc_type] || lastDoc.doc_type;
                          })()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(doc);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Document Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {['offer', 'pi', 'contract', 'ci', 'pl'].map((type, index) => {
                        const stepNumber = index + 1;
                        const docNames: Record<string, string> = {
                          'offer': 'Offer Sheet',
                          'pi': 'Proforma Invoice',
                          'contract': 'Sales Contract',
                          'ci': 'Commercial Invoice',
                          'pl': 'Packing List',
                        };

                        // Helper to check completion for a specific step
                        const checkCompletion = (step: number) => {
                          const stepType = ['offer', 'pi', 'contract', 'ci', 'pl'][step - 1];

                          // 1. Content exists AND is complete
                          const contentKey = step === 5 ? 5 : step === 4 ? 4 : step === 3 ? 3 : step === 2 ? 2 : 1;
                          const stepContent = doc.content && doc.content[contentKey];
                          const hasContent = stepContent && typeof stepContent === 'string' && checkStepCompletion(stepContent);

                          // 2. Uploaded or Skipped
                          const tradeDoc = doc.tradeData?.documents?.find((d: any) => d.doc_type === stepType);
                          const isUploaded = tradeDoc?.upload_status === 'ready';
                          const isSkipped = tradeDoc?.doc_mode === 'skip';

                          return hasContent || isUploaded || isSkipped;
                        };

                        const isDocCompleted = checkCompletion(stepNumber);

                        // Check accessibility
                        // Accessible if:
                        // 1. It's the first step
                        // 2. OR the previous step is complete
                        // 3. OR the step itself is already started/complete (to ensure access to existing work)
                        let isAccessible = stepNumber === 1;
                        if (stepNumber > 1) {
                          const prevStepComplete = checkCompletion(stepNumber - 1);
                          isAccessible = prevStepComplete || isDocCompleted;
                        }

                        // If not accessible, render as disabled
                        if (!isAccessible) {
                          return (
                            <span
                              key={type}
                              className="px-2 py-1 rounded-full text-[10.5px] font-medium flex items-center gap-1 relative overflow-hidden bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100"
                              style={{
                                backgroundImage: 'linear-gradient(45deg, transparent 46%, #e5e7eb 46%, #e5e7eb 54%, transparent 54%)'
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {docNames[type]}
                            </span>
                          );
                        }

                        // Determine if this is the "active" (last updated) document
                        let isActive = false;
                        if (doc.tradeData?.documents) {
                          const sortedDocs = [...doc.tradeData.documents].sort((a: any, b: any) => {
                            const dateA = new Date(a.updated_at || a.created_at).getTime();
                            const dateB = new Date(b.updated_at || b.created_at).getTime();
                            return dateB - dateA;
                          });
                          if (sortedDocs.length > 0 && sortedDocs[0].doc_type === type) {
                            isActive = true;
                          }
                        }

                        return (
                          <span
                            key={type}
                            onClick={(e) => {
                              e.stopPropagation();
                              const stepMapping: Record<string, number> = {
                                'offer': 1, 'pi': 2, 'contract': 3, 'ci': 4, 'pl': 5
                              };
                              onOpenDocument(doc, stepMapping[type]);
                            }}
                            className={`px-2 py-1 rounded-full text-[10.5px] font-medium transition-colors flex items-center gap-1 cursor-pointer hover:bg-blue-200 ${isActive
                              ? 'bg-[#007AFF] text-white shadow-sm'
                              : 'bg-blue-100 text-blue-900'
                              }`}
                          >
                            {isDocCompleted && <Check className="w-3 h-3 text-green-600" strokeWidth={3} />}
                            {docNames[type]}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-auto pt-2">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-400">
                        Created: {new Date(doc.date).toLocaleDateString('ko-KR')}
                      </span>
                      <span className="text-sm font-bold text-blue-600">{doc.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                        style={{ width: `${doc.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* My Page Modal */}
      {showMyPageModal && !showPasswordChange && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
          onClick={() => setShowMyPageModal(false)}
        >
          <div
            className="bg-gradient-to-b from-gray-100 to-white rounded-3xl shadow-2xl w-80 overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-100 px-6 py-4 flex items-center justify-between border-b border-gray-200">
              <span className="text-gray-700 text-sm">{userEmployeeId}</span>
              <button
                onClick={() => setShowMyPageModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4 border-4 border-blue-100">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-gray-900 mb-2">안녕하세요, {userEmployeeId}님</h3>
              <p className="text-gray-500 text-sm mb-6">Trade Copilot <br />무역서류작성 시스템에 오신 걸 환영합니다 :)</p>
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full max-w-xs mx-auto bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-full border border-gray-300 transition-colors text-sm"
              >
                비밀번호 변경
              </button>
            </div>

            <div className="border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full px-6 py-4 text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal - 실제 백엔드 API 연동 */}
      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => {
          setShowPasswordChange(false);
          setShowMyPageModal(false);
        }}
        empNo={userEmployeeId}
      />
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그아웃 하시겠습니까?</h2>
            <p className="text-gray-500 mb-8">
              언제든지 다시 로그인하여<br />작업을 이어서 할 수 있습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[200]"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">작업을 삭제하시겠습니까?</h2>
            <p className="text-gray-500 mb-2 font-medium">{deleteTarget.name}</p>
            <p className="text-gray-400 text-sm mb-8">
              삭제된 작업은 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors font-medium"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}