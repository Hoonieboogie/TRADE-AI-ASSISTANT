# 관리자 페이지 구현 계획서

## 1. 개요

### 1.1 목적
무역 AI 어시스턴트 시스템에 관리자 페이지를 추가하여 사용자 계정을 관리할 수 있는 기능을 구현합니다.

### 1.2 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Django 5.2 + Django REST Framework |
| Database | MySQL (AWS RDS) |
| UI Components | Shadcn/UI |

---

## 2. 요구사항 분석

### 2.1 기능 요구사항

| ID | 카테고리 | 기능 | 설명 | 비고 |
|----|----------|------|------|------|
| REQ-ACCT-003 | 등록 | 사용자 생성 | 이름, 부서, 사원번호로 신규 유저 등록 | 중복 사원번호 차단 |
| REQ-ACCT-004 | 조회 | 사용자 목록 조회 | 정보 및 계정 활성상태 조회, 검색 기능 | 오름차순 기본 정렬 |
| REQ-ACCT-005 | 조회 | 사용자 상세 조회 | 개인 정보 확인 | 이름, 부서, 사원번호, 활성화 상태 |
| REQ-ACCT-006 | 수정 | 계정 상태 수정 | 정보 및 활성상태 수정 | 휴직 시 비활성화 처리 |
| REQ-ACCT-007 | 수정 | 비밀번호 초기화 | 선택 사용자 비밀번호 초기화 | 초기화 값: "a123456!" |
| REQ-ACCT-008 | 삭제 | 삭제 | 사용자 삭제 | 삭제 전 확인 |

### 2.2 구현 결정사항

- **UI 레이아웃**: 테이블 형태 (Shadcn Table 컴포넌트)
- **초기 비밀번호**: 고정값 "a123456!" (사용자 생성 시 자동 설정)
- **구현 범위**: 사용자 관리만 (부서 관리 제외)

---

## 3. 시스템 아키텍처

### 3.1 기존 시스템 현황

#### 이미 구현된 것
- `User` 모델: emp_no, name, dept, activation, user_role 필드
- 사용자 CRUD API: `/api/documents/users/`
- 부서 CRUD API: `/api/documents/departments/`
- 비밀번호 변경 API: `/api/documents/auth/password-change/`
- UI 컴포넌트: Table, Button, Input, Dialog, Select 등

#### 추가 구현 필요
- **Backend**: 비밀번호 초기화 API, 사원번호 중복 검증, 검색/필터링
- **Frontend**: AdminPage, 모달 컴포넌트들, API 메서드

### 3.2 파일 구조

```
프로젝트 루트/
├── backend/documents/
│   ├── views.py          # PasswordResetView 추가, UserViewSet 수정
│   ├── serializers.py    # 중복 검증 추가
│   └── urls.py           # URL 추가
│
└── frontend/
    ├── utils/
    │   └── api.ts        # 사용자 관리 메서드 추가
    ├── App.tsx           # admin 라우팅 추가
    └── components/
        ├── MainPage.tsx  # 관리자 버튼 추가
        ├── AdminPage.tsx # 신규
        └── admin/        # 신규 디렉토리
            ├── UserTable.tsx
            ├── UserCreateModal.tsx
            ├── UserEditModal.tsx
            ├── UserDeleteModal.tsx
            ├── PasswordResetModal.tsx
            └── UserSearchFilter.tsx
```

---

## 4. 단계별 구현 계획

### Step 1: Backend - 비밀번호 초기화 API
**커밋 메시지**: `feat(backend): 비밀번호 초기화 API 추가`

#### 수정 파일
- `backend/documents/views.py`
- `backend/documents/urls.py`

#### 구현 내용
```python
# views.py
class PasswordResetView(APIView):
    def post(self, request):
        user_id = request.data.get('user_id')
        user = User.objects.get(user_id=user_id)
        user.set_password('a123456!')
        user.save()
        return Response({'message': '비밀번호가 초기화되었습니다.'})

# urls.py
path('auth/password-reset/', PasswordResetView.as_view(), name='password-reset'),
```

---

### Step 2: Backend - Serializer 수정 (중복 검증)
**커밋 메시지**: `feat(backend): 사원번호 중복 검증 및 초기 비밀번호 설정`

#### 수정 파일
- `backend/documents/serializers.py`

#### 구현 내용
- `UserCreateSerializer`에 `validate_emp_no()` 메서드 추가
- 비밀번호 필드 제거, 자동으로 "a123456!" 설정

---

### Step 3: Backend - UserViewSet 검색/필터 추가
**커밋 메시지**: `feat(backend): 사용자 검색 및 필터링 기능 추가`

#### 수정 파일
- `backend/documents/views.py`

#### 구현 내용
- 검색: 이름, 사원번호 (icontains)
- 필터: dept_id, activation, user_role
- 정렬: 사원번호 오름차순 기본

---

### Step 4: Frontend - API 클라이언트 확장
**커밋 메시지**: `feat(frontend): 사용자 관리 API 메서드 추가`

#### 수정 파일
- `frontend/utils/api.ts`

#### 추가 메서드
```typescript
getUsers(params?): Promise<User[]>
createUser(data): Promise<User>
updateUser(userId, data): Promise<User>
deleteUser(userId): Promise<void>
resetPassword(userId): Promise<{ message: string }>
getDepartments(): Promise<Department[]>
```

---

### Step 5: Frontend - 라우팅 및 네비게이션
**커밋 메시지**: `feat(frontend): 관리자 페이지 라우팅 추가`

#### 수정 파일
- `frontend/App.tsx`
- `frontend/components/MainPage.tsx`

#### 구현 내용
- `PageType`에 `'admin'` 추가
- AdminPage 컴포넌트 라우팅
- MainPage 헤더에 관리자 버튼 (admin 역할만 표시)

---

### Step 6: Frontend - AdminPage 기본 구조
**커밋 메시지**: `feat(frontend): AdminPage 컴포넌트 생성`

#### 신규 파일
- `frontend/components/AdminPage.tsx`

#### 구현 내용
- 헤더 (메인으로, 로그아웃)
- 사용자 목록 로드
- 검색/필터 상태 관리

---

### Step 7: Frontend - 검색/필터 컴포넌트
**커밋 메시지**: `feat(frontend): 사용자 검색 및 필터 컴포넌트 추가`

#### 신규 파일
- `frontend/components/admin/UserSearchFilter.tsx`

#### 구현 내용
- 검색 입력창 (이름/사원번호)
- 부서 필터 드롭다운
- 역할 필터 (전체/관리자/사용자)
- 상태 필터 (전체/활성/비활성)

---

### Step 8: Frontend - UserTable 컴포넌트
**커밋 메시지**: `feat(frontend): 사용자 테이블 컴포넌트 추가`

#### 신규 파일
- `frontend/components/admin/UserTable.tsx`

#### 구현 내용
- Shadcn Table 사용
- 컬럼: 사원번호, 이름, 부서, 역할, 상태, 작업
- 작업 버튼: 수정, 비밀번호 초기화, 활성 토글, 삭제
- Badge로 역할/상태 표시

---

### Step 9: Frontend - 사용자 생성 모달
**커밋 메시지**: `feat(frontend): 사용자 생성 모달 추가`

#### 신규 파일
- `frontend/components/admin/UserCreateModal.tsx`

#### 구현 내용
- 입력: 사원번호, 이름, 부서(선택), 역할
- 중복 사원번호 에러 처리
- 성공 시 목록 새로고침

---

### Step 10: Frontend - 사용자 수정 모달
**커밋 메시지**: `feat(frontend): 사용자 수정 모달 추가`

#### 신규 파일
- `frontend/components/admin/UserEditModal.tsx`

#### 구현 내용
- 표시: 사원번호 (읽기 전용)
- 수정: 이름, 부서, 역할, 활성 상태

---

### Step 11: Frontend - 비밀번호 초기화 모달
**커밋 메시지**: `feat(frontend): 비밀번호 초기화 모달 추가`

#### 신규 파일
- `frontend/components/admin/PasswordResetModal.tsx`

#### 구현 내용
- 확인 메시지
- API 호출 및 결과 처리

---

### Step 12: Frontend - 사용자 삭제 모달
**커밋 메시지**: `feat(frontend): 사용자 삭제 모달 추가`

#### 신규 파일
- `frontend/components/admin/UserDeleteModal.tsx`

#### 구현 내용
- 삭제 확인 메시지
- 경고 문구
- API 호출 및 목록 새로고침

---

## 5. 테스트 시나리오

### 5.1 사용자 등록 (REQ-ACCT-003)
1. 관리자 계정으로 로그인
2. 관리자 페이지 접속
3. "사용자 등록" 버튼 클릭
4. 필수 정보 입력 (사원번호, 이름)
5. 중복 사원번호 입력 시 에러 확인
6. 등록 성공 후 목록 반영 확인

### 5.2 사용자 조회 (REQ-ACCT-004, 005)
1. 목록 오름차순 정렬 확인
2. 검색어로 필터링 테스트
3. 부서/역할/상태 필터 조합 테스트

### 5.3 사용자 수정 (REQ-ACCT-006, 007)
1. 수정 모달에서 정보 변경
2. 활성/비활성 토글 동작 확인
3. 비밀번호 초기화 동작 확인

### 5.4 사용자 삭제 (REQ-ACCT-008)
1. 삭제 버튼 클릭
2. 확인 모달 표시 확인
3. 삭제 후 목록 반영 확인

---

## 6. 일정

| Step | 내용 | 예상 |
|------|------|------|
| 1-3 | Backend API | - |
| 4 | Frontend API | - |
| 5-6 | 라우팅 + AdminPage | - |
| 7-8 | 검색필터 + 테이블 | - |
| 9-12 | 모달 컴포넌트들 | - |

---

## 7. 참고 파일

### 패턴 참고
- `frontend/components/MainPage.tsx` - 페이지 구조, 헤더, 필터링
- `frontend/components/document-creation/modals/PasswordChangeModal.tsx` - 모달 패턴
- `frontend/utils/api.ts` - API 메서드 패턴

### 수정 대상
- `backend/documents/views.py`
- `backend/documents/serializers.py`
- `backend/documents/urls.py`
- `frontend/utils/api.ts`
- `frontend/App.tsx`
- `frontend/components/MainPage.tsx`
