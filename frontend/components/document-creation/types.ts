// types.ts - DocumentCreationPage 공유 타입 정의
import { PageType, DocumentData } from '../../App';
import { ContractEditorRef, FieldChange } from '../editor/ContractEditor';
import { Version } from '../VersionHistorySidebar';

// Step Mode 타입
export type StepMode = 'manual' | 'upload' | 'skip' | null;

// Upload Status 타입
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

// Shipping Document 타입
export type ShippingDocType = 'CI' | 'PL';

// DocumentCreationPage Props
export interface DocumentCreationPageProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  documentData: DocumentData;
  setDocumentData: (data: DocumentData) => void;
  onNavigate: (page: PageType) => void;
  userEmployeeId: string;
  onLogout: () => void;
  onSave: (data: DocumentData, step: number, activeShippingDoc?: ShippingDocType | null, isCompleted?: boolean) => void;
  onCreateTrade?: () => Promise<string | null>;
  onExit?: (hasChanges: boolean) => Promise<void>;
  versions?: Version[];
  onRestore?: (version: Version) => void;
  initialActiveShippingDoc?: ShippingDocType | null;
  getDocId?: (step: number, shippingDoc?: ShippingDocType | null) => number | null;
}

// Step 이름 상수
export const STEP_SHORT_NAMES = [
  'Offer Sheet',
  'Proforma Invoice (PI)',
  'Sales Contract',
  'Shipping Documents'
] as const;

// Re-export 자주 사용되는 타입들
export type { PageType, DocumentData, ContractEditorRef, FieldChange, Version };
