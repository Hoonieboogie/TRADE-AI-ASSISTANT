import { FileText, Plus, ChevronDown, LogOut, CheckCircle, Clock, Search, Filter, User, Sparkles, Trash2 } from 'lucide-react';
import { PageType, SavedDocument } from '../App';
import { useState } from 'react';
import PasswordChangeModal from './document-creation/modals/PasswordChangeModal';

interface MainPageProps {
  onNavigate: (page: PageType) => void;
  savedDocuments: SavedDocument[];
  userEmployeeId: string;
  onLogout: () => void;
  onLogoClick: (logoRect: DOMRect) => void;
  onOpenDocument: (doc: SavedDocument) => void;
  onDeleteDocument: (docId: string) => void;
}



export default function MainPage({ onNavigate, savedDocuments, userEmployeeId, onLogout, onLogoClick, onOpenDocument, onDeleteDocument }: MainPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    onLogout();
    setShowLogoutConfirm(false);
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
          <div className="relative">
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
        <div className="grid grid-cols-3 gap-4 items-start">
          {filteredTasks.map(doc => {
            const isCompleted = doc.status === 'completed' || doc.progress === 100;
            const iconBg = isCompleted ? 'bg-green-50' : 'bg-blue-50';
            const iconColor = isCompleted ? 'text-green-600' : 'text-blue-600';

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow h-full cursor-pointer group"
              >
                <div className="flex items-start gap-4 h-full">
                  <div
                    className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}
                  >
                    <FileText className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-gray-900 font-medium line-clamp-1" title={doc.name}>{doc.name}</h3>
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs flex-shrink-0">
                          <CheckCircle className="w-3 h-3" />
                          완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-xs flex-shrink-0">
                          <Clock className="w-3 h-3" />
                          진행중
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{doc.date}</p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>진행률</span>
                        <span>{doc.progress}% ({doc.completedSteps}/{doc.totalSteps})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${doc.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument(doc.id);
                        }}
                        className="text-gray-400 hover:text-red-600 text-sm transition-colors font-medium p-2 rounded-full hover:bg-red-50"
                        title="삭제"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}