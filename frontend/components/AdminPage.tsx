import { useState, useEffect } from 'react';
import { PageType } from '../App';
import { User, Department, api } from '../utils/api';
import { Plus, Search } from 'lucide-react';
import UserCreateModal from './admin/UserCreateModal';
import UserEditModal from './admin/UserEditModal';
import PasswordResetModal from './admin/PasswordResetModal';
import UserDeleteModal from './admin/UserDeleteModal';

interface AdminPageProps {
  onNavigate: (page: PageType) => void;
  currentUser: User;
  onLogout: () => void;
}

export default function AdminPage({ onNavigate, currentUser, onLogout }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색/필터 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // 모달 상태
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // 사용자 목록 로드
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersData = await api.getUsers();
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용자 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 부서 목록 로드
  const fetchDepartments = async () => {
    try {
      const depts = await api.getDepartments();
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // 클라이언트 사이드 필터링
  const filteredUsers = users.filter(user => {
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!user.name.toLowerCase().includes(query) && !user.emp_no.toLowerCase().includes(query)) {
        return false;
      }
    }

    // 부서 필터
    if (deptFilter !== null && user.dept?.dept_id !== deptFilter) {
      return false;
    }

    // 역할 필터
    if (roleFilter !== 'all' && user.user_role !== roleFilter) {
      return false;
    }

    // 상태 필터
    if (statusFilter === 'active' && !user.activation) {
      return false;
    }
    if (statusFilter === 'inactive' && user.activation) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">관리자 페이지</h1>
              <p className="text-sm text-gray-500">사용자 계정 관리</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {currentUser.name} ({currentUser.emp_no})
            </span>
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          {/* Search & Filters */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 사원번호 검색..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter ?? ''}
              onChange={(e) => setDeptFilter(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체 부서</option>
              {departments.map(dept => (
                <option key={dept.dept_id} value={dept.dept_id}>
                  {dept.dept_name}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'user' | 'admin')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 역할</option>
              <option value="admin">관리자</option>
              <option value="user">사용자</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          {/* Add User Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            사용자 등록
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* User Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">
              로딩 중...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {searchQuery || deptFilter || roleFilter !== 'all' || statusFilter !== 'all'
                ? '검색 결과가 없습니다.'
                : '등록된 사용자가 없습니다.'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사원번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    부서
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map(user => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.emp_no}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.dept?.dept_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.user_role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.user_role === 'admin' ? '관리자' : '사용자'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.activation
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.activation ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => setResettingUser(user)}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          비밀번호 초기화
                        </button>
                        <button
                          onClick={() => setDeletingUser(user)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* User Count */}
        {!isLoading && (
          <div className="mt-4 text-sm text-gray-500">
            총 {filteredUsers.length}명의 사용자
            {(searchQuery || deptFilter || roleFilter !== 'all' || statusFilter !== 'all') &&
              ` (전체 ${users.length}명 중)`
            }
          </div>
        )}
      </main>

      {/* Modals */}
      <UserCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchUsers();
          setShowCreateModal(false);
        }}
        departments={departments}
      />

      <UserEditModal
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => {
          fetchUsers();
          setEditingUser(null);
        }}
        departments={departments}
      />

      <PasswordResetModal
        user={resettingUser}
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        onSuccess={() => {
          fetchUsers();
          setResettingUser(null);
        }}
      />

      <UserDeleteModal
        user={deletingUser}
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onSuccess={() => {
          fetchUsers();
          setDeletingUser(null);
        }}
      />
    </div>
  );
}
