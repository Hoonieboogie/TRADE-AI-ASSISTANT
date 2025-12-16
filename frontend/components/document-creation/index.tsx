// DocumentCreationPage - 메인 컴포넌트
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Paperclip, MinusCircle, Check, Lock, Plus, ChevronUp, ChevronDown, Ban, PenTool, ArrowLeft, FileText, Package, Eye, EyeOff, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Types
import type { DocumentCreationPageProps, StepMode, ShippingDocType } from './types';
import { STEP_SHORT_NAMES } from './types';

// Hooks
import { useFileUpload } from './hooks/useFileUpload';
import { useSharedData } from './hooks/useSharedData';
import { useDocumentState } from './hooks/useDocumentState';

// Layout Components
import { DocumentHeader } from './layout';

// Step Components
import {
  EmptyState,
  ModeSelector,
  FileUploadView,
  SkipState,
  ShippingDocsDashboard,
  EditorView
} from './steps';

// Modal Components
import {
  MyPageModal,
  PasswordChangeModal,
  ExitConfirmModal,
  SaveSuccessModal,
  DownloadModal,
  LogoutConfirmModal
} from './modals';

// External Components
import VersionHistorySidebar, { Version } from '../VersionHistorySidebar';
import ContractEditor, { ContractEditorRef, FieldChange } from '../editor/ContractEditor';
import ChatAssistant from '../ChatAssistant';
import { ShootingStarIntro } from '../ShootingStarIntro';

// Templates
import { offerSheetTemplateHTML } from '../../templates/offerSheet';
import { proformaInvoiceTemplateHTML } from '../../templates/proformaInvoice';
import { packingListTemplateHTML } from '../../templates/packingList';
import { saleContractTemplateHTML } from '../../templates/saleContract';
import { commercialInvoiceTemplateHTML } from '../../templates/commercialInvoice';

// Utils
import { checkStepCompletion, extractDataFromContent, updateContentWithSharedData as applySharedData, findUnfilledFields } from '../../utils/documentUtils';
import { DocumentData } from '../../App';


export default function DocumentCreationPage({
  currentStep,
  setCurrentStep,
  documentData,
  setDocumentData,
  onNavigate,
  userEmployeeId,
  onLogout,
  onSave,
  onCreateTrade,
  onExit,
  versions = [],
  initialActiveShippingDoc,
  getDocId,
  currentUser
}: DocumentCreationPageProps) {
  const editorRef = useRef<ContractEditorRef>(null);
  const chatButtonRef = useRef<HTMLButtonElement>(null);

  // 매핑 진행 상태 및 최신 데이터 추적용 ref
  const mappingInProgressRef = useRef(false);
  const latestDocumentDataRef = useRef<DocumentData>(documentData);

  // Custom Hooks
  const {
    uploadedFiles,
    uploadedFileNames,
    uploadStatus,
    uploadError,
    uploadedDocumentIds,
    uploadedDocumentUrls,
    uploadedConvertedPdfUrls,
    handleFileUpload,
    removeUploadedFile,
    retryUpload,
    restoreUploadState
  } = useFileUpload(
    documentData.uploadedFileNames as Record<number, string>,
    documentData.uploadedFileUrls as Record<number, string>,
    documentData.uploadedConvertedPdfUrls as Record<number, string>,
    {
      onTemplateDataExtracted: (step, templateData) => {
        // 매핑 시작 플래그 설정 (handleSave에서 대기용)
        mappingInProgressRef.current = true;

        console.log('=== Template Data Extracted ===');
        console.log('Template type:', templateData.template_type);
        console.log('Row count:', templateData.row_count);
        console.log('Fields:', templateData.fields);
        console.log('Table rows:', templateData.table_rows);

        // 자동 계산 필드 목록 (절대 직접 주입 금지!)
        const AUTO_CALCULATED_FIELDS = ['sub_total_price', 'total_price', 'total_net_weight', 'total_gross_weight', 'total_measurement'];

        // ===== [0단계] HTML 선생성 (CRITICAL: 행 추가 전 필수) =====
        // documentData는 lazy 구조이므로 방문하지 않은 Step은 undefined
        // 행 추가를 위해 모든 Step의 HTML을 미리 생성
        setDocumentData((prevData: DocumentData) => {
          const newData = { ...prevData };

          // 템플릿 가져오기 함수
          const getTemplateForStep = (step: number): string => {
            switch (step) {
              case 1: return offerSheetTemplateHTML;
              case 2: return proformaInvoiceTemplateHTML;
              case 3: return saleContractTemplateHTML;
              case 4: return commercialInvoiceTemplateHTML;
              case 5: return packingListTemplateHTML;
              default: return offerSheetTemplateHTML;
            }
          };

          // 모든 Step(1~5)에 대해 HTML이 없으면 생성
          [1, 2, 3, 4, 5].forEach(step => {
            if (typeof newData[step] !== 'string') {
              newData[step] = hydrateTemplate(getTemplateForStep(step));
              console.log(`[Step 0] Pre-generated HTML for document ${step}`);
            }
          });

          console.log('[Step 0] HTML pre-generation complete');
          return newData;
        });

        // ===== [1단계] 테이블 행 자동 생성 (모든 문서 직접 업데이트) =====
        const rowCount = templateData.row_count;
        if (rowCount > 1) {
          // HTML 생성이 완료될 때까지 대기 후 실행
          setTimeout(() => {
            console.log(`[Step 1] Generating ${rowCount - 1} additional rows for ALL documents...`);

            // 모든 문서에 대해 행 추가
            setDocumentData((prevData: DocumentData) => {
              // [증거 수집] prevData 구조 확인
              console.log('[EVIDENCE] typeof prevData:', typeof prevData);
              console.log('[EVIDENCE] prevData keys:', Object.keys(prevData));
              console.log('[EVIDENCE] prevData[1]:', prevData[1]);
              console.log('[EVIDENCE] typeof prevData[1]:', typeof prevData[1]);
              console.log('[EVIDENCE] prevData[2]:', prevData[2]);
              console.log('[EVIDENCE] typeof prevData[2]:', typeof prevData[2]);

              const newData = { ...prevData };

              // 각 추가 행에 대해
              for (let rowIndex = 1; rowIndex < rowCount; rowIndex++) {
                const rowData = templateData.table_rows[rowIndex];
                const fieldIds = Object.keys(rowData);

                console.log(`[Row ${rowIndex + 1}] Adding to all documents with fields:`, fieldIds);

                // 모든 문서 타입에 대해 행 추가
                [1, 2, 3, 4, 5].forEach(docKey => {
                  const content = newData[docKey];
                  if (typeof content !== 'string') return;

                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, 'text/html');

                  // 템플릿 행 찾기
                  const tables = doc.querySelectorAll('table');
                  let templateRow: HTMLElement | null = null;

                  for (const table of Array.from(tables)) {
                    const rows = Array.from(table.querySelectorAll('tbody tr'));

                    for (let i = rows.length - 1; i >= 0; i--) {
                      const row = rows[i];
                      const dataFields = row.querySelectorAll('[data-field-id]');
                      const text = row.textContent || '';

                      let hasItemField = false;
                      dataFields.forEach(field => {
                        const fid = field.getAttribute('data-field-id') || '';
                        if (fid.startsWith('item_no') || fid.startsWith('unit_price') ||
                          fid.startsWith('quantity') || fid.startsWith('description') ||
                          fid.startsWith('sub_total_price') || fid.startsWith('marks_and_numbers')) {
                          hasItemField = true;
                        }
                      });

                      const isTotalRow = text.includes('Total ') || text.includes('TOTAL :');

                      if (hasItemField && dataFields.length >= 3 && !isTotalRow) {
                        templateRow = row as HTMLElement;
                        break;
                      }
                    }

                    if (templateRow) break;
                  }

                  if (!templateRow) {
                    console.warn(`[Doc ${docKey}] No template row found`);
                    return;
                  }

                  // 기존 필드 ID 수집
                  const existingFieldIds = new Set<string>();
                  const allFields = doc.querySelectorAll('[data-field-id]');
                  allFields.forEach((f: Element) => {
                    const id = f.getAttribute('data-field-id');
                    if (id) existingFieldIds.add(id);
                  });

                  // 새 행 생성
                  const newRow = templateRow.cloneNode(true) as HTMLElement;

                  // 필드 ID 매핑
                  const fieldMap = new Map<string, string>();
                  fieldIds.forEach(fieldId => {
                    const baseName = fieldId.replace(/_\d+$/, '');
                    fieldMap.set(baseName, fieldId);
                  });

                  // 다음 사용 가능한 필드 ID 생성
                  const getNextFieldId = (baseName: string): string => {
                    let counter = 2;
                    let newId = `${baseName}_${counter}`;
                    while (existingFieldIds.has(newId)) {
                      counter++;
                      newId = `${baseName}_${counter}`;
                    }
                    existingFieldIds.add(newId);
                    return newId;
                  };

                  // 새 행의 필드 ID 교체
                  const dataFields = newRow.querySelectorAll('[data-field-id]');
                  dataFields.forEach((field) => {
                    const currentFieldId = field.getAttribute('data-field-id');
                    if (currentFieldId) {
                      const baseName = currentFieldId.replace(/_\d+$/, '');
                      let newFieldId = fieldMap.get(baseName);

                      if (!newFieldId) {
                        newFieldId = getNextFieldId(baseName);
                      }

                      field.setAttribute('data-field-id', newFieldId);
                      field.setAttribute('data-source', '');
                      field.textContent = `[${newFieldId}]`;
                    }
                  });

                  // 행 삽입
                  const tbody = templateRow.parentElement;
                  if (tbody) {
                    tbody.insertBefore(newRow, templateRow.nextSibling);
                  }

                  // 업데이트된 HTML 저장
                  newData[docKey] = doc.body.innerHTML;
                  console.log(`[Doc ${docKey}] Row ${rowIndex + 1} added successfully`);
                });
              }

              console.log(`[Step 1] Complete: ${rowCount - 1} rows added to all documents`);

              // [실험 1A] 행 생성 직후 newData의 <tr> 개수
              const e1a_trCounts = {
                1: ((newData[1] as string || '').match(/<tr/g) || []).length,
                2: ((newData[2] as string || '').match(/<tr/g) || []).length,
                3: ((newData[3] as string || '').match(/<tr/g) || []).length,
                4: ((newData[4] as string || '').match(/<tr/g) || []).length,
                5: ((newData[5] as string || '').match(/<tr/g) || []).length,
              };
              console.log('[E1A] AFTER row-generation newData trCounts:', e1a_trCounts);

              return newData;
            });
          }, 100); // HTML 생성 완료 대기
        }

        // ===== [2단계] sharedData 업데이트 (자동 계산 필드 제외) =====
        setTimeout(() => {
          console.log('[Step 2] Updating sharedData...');

          const newSharedData: Record<string, string> = {};

          // 일반 필드 추가
          Object.entries(templateData.fields).forEach(([key, value]: [string, any]) => {
            const baseKey = key.replace(/_\d+$/, '');
            if (!AUTO_CALCULATED_FIELDS.includes(baseKey)) {
              newSharedData[key] = value as string;
            } else {
              console.log(`Skipping auto-calculated field: ${key}`);
            }
          });

          // 테이블 행 데이터 추가 (자동 계산 필드 제외)
          templateData.table_rows.forEach((row: Record<string, string>) => {
            Object.entries(row).forEach(([key, value]) => {
              const baseKey = key.replace(/_\d+$/, '');
              if (!AUTO_CALCULATED_FIELDS.includes(baseKey)) {
                newSharedData[key] = value;
              } else {
                console.log(`Skipping auto-calculated field: ${key}`);
              }
            });
          });

          console.log('[Step 2] SharedData to inject:', newSharedData);
          setSharedData(prev => ({ ...prev, ...newSharedData }));

          // ===== [3단계] 모든 문서에 데이터 매핑 =====
          // newSharedData를 클로저로 캡처하여 직접 사용 (stale closure 문제 회피)
          setTimeout(() => {
            console.log('[Step 3] Mapping data to all documents...');
            console.log('[Step 3] Using newSharedData directly:', Object.keys(newSharedData).length, 'fields');

            setDocumentData((prev: DocumentData) => {
              // [실험 1B] 세 번째 setDocumentData의 prev 상태
              const e1b_trCounts = {
                1: ((prev[1] as string || '').match(/<tr/g) || []).length,
                2: ((prev[2] as string || '').match(/<tr/g) || []).length,
                3: ((prev[3] as string || '').match(/<tr/g) || []).length,
                4: ((prev[4] as string || '').match(/<tr/g) || []).length,
                5: ((prev[5] as string || '').match(/<tr/g) || []).length,
              };
              console.log('[E1B] BEFORE mapping prev trCounts:', e1b_trCounts);

              const newData = { ...prev };

              // 모든 문서에 newSharedData 직접 적용 (updateContentWithSharedData 대신)
              // updateContentWithSharedData는 클로저의 stale sharedData를 사용하므로 직접 매핑
              Object.keys(newData).forEach(key => {
                const docKey = Number(key);
                if (isNaN(docKey) || key === 'title') return;

                const content = newData[docKey];
                if (typeof content === 'string') {
                  // 직접 매핑 적용
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(content, 'text/html');
                  const fields = doc.querySelectorAll('span[data-field-id]');

                  let modified = false;
                  fields.forEach(field => {
                    const fieldKey = field.getAttribute('data-field-id');
                    if (fieldKey && newSharedData[fieldKey]) {
                      if (field.textContent !== newSharedData[fieldKey]) {
                        field.textContent = newSharedData[fieldKey];
                        field.setAttribute('data-source', 'mapped');
                        modified = true;
                      }
                    }
                  });

                  if (modified) {
                    newData[docKey] = doc.body.innerHTML;
                    console.log(`Document ${docKey} updated with direct mapping`);
                  }
                }
              });

              console.log('[Step 3] Complete: All documents mapped');

              // [실험 1C] 매핑 후 newData의 <tr> 개수
              const e1c_trCounts = {
                1: ((newData[1] as string || '').match(/<tr/g) || []).length,
                2: ((newData[2] as string || '').match(/<tr/g) || []).length,
                3: ((newData[3] as string || '').match(/<tr/g) || []).length,
                4: ((newData[4] as string || '').match(/<tr/g) || []).length,
                5: ((newData[5] as string || '').match(/<tr/g) || []).length,
              };
              console.log('[E1C] AFTER mapping newData trCounts:', e1c_trCounts);

              // ref 직접 업데이트 (useEffect 대기 없이 즉시 사용 가능)
              latestDocumentDataRef.current = newData;

              // 매핑 완료 플래그 설정 (콜백 내부에서 설정해야 ref 업데이트 후 실행 보장)
              mappingInProgressRef.current = false;
              console.log('[Step 3] latestDocumentDataRef updated & mapping flag reset');

              return newData;
            });
          }, 100);
        }, 200); // HTML 생성 + 행 추가 완료 대기
      }
    }
  );

  const {
    sharedData,
    setSharedData,
    hydrateTemplate,
    extractData,
    updateContentWithSharedData
  } = useSharedData();

  const {
    stepModes,
    setStepModes,
    modifiedSteps,
    setModifiedSteps,
    markStepModified,
    isDirty,
    setIsDirty,
    activeShippingDoc,
    setActiveShippingDoc,
    shippingOrder,
    setShippingOrder,
    getDocKeyForStep
  } = useDocumentState(documentData, initialActiveShippingDoc);

  // 초기 로드 시 documentData에서 sharedData 추출 (재접속 시 매핑 복원)
  const isSharedDataInitialized = useRef(false);
  useEffect(() => {
    if (isSharedDataInitialized.current) return;

    // documentData에 content가 있을 때까지 대기
    const hasContent = [1, 2, 3, 4, 5].some(step => typeof documentData[step] === 'string');
    if (!hasContent) return;

    [1, 2, 3, 4, 5].forEach(step => {
      const content = documentData[step];
      if (typeof content === 'string') {
        extractData(content);
      }
    });

    isSharedDataInitialized.current = true;
  }, [documentData, extractData]);

  // documentData 변경 시 ref 동기화 (handleSave에서 최신 데이터 사용)
  useEffect(() => {
    latestDocumentDataRef.current = documentData;
  }, [documentData]);

  // 업로드 완료 시 modifiedSteps에 추가 (저장 모달에 표시되도록)
  useEffect(() => {
    Object.entries(uploadStatus).forEach(([stepStr, status]) => {
      const step = Number(stepStr);
      if (status === 'ready') {
        setModifiedSteps(prev => {
          if (prev.has(step)) return prev;
          const newSet = new Set(prev);
          newSet.add(step);
          return newSet;
        });
      }
    });
  }, [uploadStatus, setModifiedSteps]);

  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(400);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isStepIndicatorVisible, setIsStepIndicatorVisible] = useState(true);
  const [showFieldHighlight, setShowFieldHighlight] = useState(true);
  const [showAgentHighlight, setShowAgentHighlight] = useState(true);
  const [editorKey, setEditorKey] = useState(0); // 에디터 강제 리마운트용

  // Unfilled Field Finder State
  const [unfilledFields, setUnfilledFields] = useState<string[]>([]);
  const [currentUnfilledIndex, setCurrentUnfilledIndex] = useState<number>(-1);
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);


  // Modal State
  const [showMyPageModal, setShowMyPageModal] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Version Restore Notice
  const [showVersionRestoreNotice, setShowVersionRestoreNotice] = useState(false);

  // [ADDED] Force update state to trigger re-renders on editor changes
  const [, forceUpdate] = useState({});


  const isLoadingTemplate = useRef(false); // 템플릿 로딩 중 플래그
  const isRestoringVersion = useRef(false); // 버전 복원 중 플래그

  // Intro Animation State
  const [hasShownIntro, setHasShownIntro] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  // [ADDED] Handler for immediate editor updates (for validation and sync)
  const handleEditorUpdate = () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      extractData(content); // Extract data in real-time
    }
    forceUpdate({});
  };

  // Calculate visibility for chatbot button
  const shouldShowChatButton = !isChatOpen && currentStep >= 1 && currentStep <= 5 && (
    (currentStep === 2) ||
    ((currentStep === 1 || currentStep === 3) && stepModes[currentStep] && stepModes[currentStep] !== 'skip' && (
      (stepModes[currentStep] === 'manual') ||
      (stepModes[currentStep] === 'upload' && uploadStatus[currentStep] === 'ready')
    )) ||
    (currentStep === 4 && activeShippingDoc)
  );

  // Cleanup invalid document keys (fix for "Document -1" issue)
  useEffect(() => {
    if (documentData['-1' as any] || documentData[-1]) {
      const newDocData = { ...documentData };
      delete (newDocData as any)['-1'];
      delete (newDocData as any)[-1];
      setDocumentData(newDocData);
    }
  }, [documentData, setDocumentData]);

  // stepModes, 업로드 상태가 변경될 때 documentData에 동기화 (sessionStorage 저장용)
  useEffect(() => {
    const hasUploadData = Object.keys(uploadedFileNames).length > 0 || Object.keys(uploadedDocumentUrls).length > 0;
    const hasStepModes = Object.keys(stepModes).length > 0;

    if (hasUploadData || hasStepModes) {
      setDocumentData((prev: DocumentData) => ({
        ...prev,
        ...(hasStepModes && { stepModes }),
        ...(hasUploadData && {
          uploadedFileNames,
          uploadedFileUrls: uploadedDocumentUrls,
          uploadedConvertedPdfUrls
        })
      }));
    }
  }, [stepModes, uploadedFileNames, uploadedDocumentUrls, uploadedConvertedPdfUrls, setDocumentData]);

  // Trigger Intro Animation
  useEffect(() => {
    if (shouldShowChatButton && !hasShownIntro && !showIntro) {
      setShowIntro(true);
    }
  }, [shouldShowChatButton, hasShownIntro, showIntro]);


  // Get template for step
  const getTemplateForStep = (step: number): string => {
    switch (step) {
      case 1: return offerSheetTemplateHTML;
      case 2: return proformaInvoiceTemplateHTML;
      case 3: return saleContractTemplateHTML;
      case 4: return commercialInvoiceTemplateHTML;
      case 5: return packingListTemplateHTML;
      default: return '';
    }
  };

  // [ADDED] L/C Field Automation Logic (Robust Version)
  useEffect(() => {
    const scContent = documentData[3];
    if (!scContent) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(scContent, 'text/html');

    // Find all checked radios and filter for payment group
    const checkedRadios = Array.from(doc.querySelectorAll('.radio-circle'));
    const paymentRadio = checkedRadios.find(radio => {
      const isChecked = radio.classList.contains('checked') || radio.getAttribute('data-checked') === 'true';
      const isPaymentGroup = radio.getAttribute('data-group') === 'payment';
      return isChecked && isPaymentGroup;
    });

    if (paymentRadio) {
      // Structure: LabelDiv + RadioDiv(Flex) + DescDiv
      // Radio is inside RadioDiv.
      // [FIX] Tiptap may wrap the inline span in a <p> tag.
      let radioContainer = paymentRadio.parentElement;
      if (radioContainer && radioContainer.tagName === 'P') {
        radioContainer = radioContainer.parentElement;
      }

      const labelDiv = radioContainer?.previousElementSibling;
      const labelText = labelDiv?.textContent?.trim() || '';

      const isLC = ['Sight Credit', 'Deferred Payment Credit', 'Acceptance Credit'].includes(labelText);
      const isNonLC = ['D/P', 'D/A', 'T/T'].includes(labelText);

      if (isLC || isNonLC) {
        setDocumentData((prev: DocumentData) => {
          const newData = { ...prev };
          let hasChanges = false;

          const updateFields = (step: number, fields: string[]) => {
            const content = newData[step];
            // 해당 step에 콘텐츠가 없으면 (버전 복원으로 undefined인 경우 등) 처리하지 않음
            if (!content) return;

            const stepDoc = parser.parseFromString(content, 'text/html');
            let docChanged = false;

            fields.forEach(fieldId => {
              const field = stepDoc.querySelector(`[data-field-id="${fieldId}"]`);
              if (field) {
                const currentText = field.textContent?.trim();

                if (isNonLC) {
                  // Set to N/A if not already
                  if (currentText !== 'N/A') {
                    field.textContent = 'N/A';
                    field.setAttribute('data-source', 'auto');
                    // Also disable it to prevent editing? User said "automatically filled", implied disabled or just filled.
                    // But "L/C fields... should remain editable/visible" for L/C.
                    // For Non-L/C, [N/A] is usually static. Let's keep it editable but filled.
                    docChanged = true;
                  }
                } else if (isLC) {
                  // Restore placeholder if it was [N/A] or automatically set
                  if (currentText?.trim() === 'N/A' || currentText?.trim() === '[N/A]' || field.getAttribute('data-source') === 'auto') {
                    field.textContent = `[${fieldId}]`;
                    field.removeAttribute('data-source');
                    docChanged = true;
                  }
                }
              }
            });

            if (step === 5) {
              // [FIX] Ensure Remarks field is never set to N/A
              const remarksField = stepDoc.querySelector('[data-field-id="remarks"]');
              if (remarksField && (remarksField.textContent?.trim() === 'N/A' || remarksField.textContent?.trim() === '[N/A]')) {
                remarksField.textContent = '[remarks]';
                remarksField.removeAttribute('data-source');
                docChanged = true;
              }
            }

            if (docChanged) {
              newData[step] = stepDoc.body.innerHTML;
              hasChanges = true;
            }
          };

          updateFields(4, ['l/c_no', 'l/c_date', 'l/c_bank']);
          updateFields(5, ['l/c_no', 'l/c_date']);

          return hasChanges ? newData : prev;
        });
      }
    }
  }, [documentData[3], setDocumentData]);

  // Helper to check completion status for a specific step
  const getStepCompletionStatus = (stepNumber: number): boolean => {
    if (stepModes[stepNumber] === 'skip') return true;

    if (stepModes[stepNumber] === 'upload') {
      // [CHANGED] Only allow navigation if upload is fully ready (complete)
      // Previously: if (uploadedFiles[stepNumber] || uploadedFileNames[stepNumber]) return true;
      return uploadStatus[stepNumber] === 'ready';
    }

    if (stepNumber <= 3) {
      // 항상 documentData 사용 (Step 이동 시 handleStepChange에서 저장됨)
      const stepContent = documentData[stepNumber] || hydrateTemplate(getTemplateForStep(stepNumber));
      return checkStepCompletion(stepContent);
    } else {
      if (stepNumber === 4) {
        const ciContent = documentData[4] || hydrateTemplate(commercialInvoiceTemplateHTML);
        const plContent = documentData[5] || hydrateTemplate(packingListTemplateHTML);
        return checkStepCompletion(ciContent) && checkStepCompletion(plContent);
      }
      return false;
    }
  };

  // Calculate max progress step
  let maxProgressStep = currentStep;
  for (let i = 1; i <= STEP_SHORT_NAMES.length; i++) {
    if (getStepCompletionStatus(i)) {
      if (i > maxProgressStep) maxProgressStep = i;
    }
  }

  // Handlers
  const handleStepChange = (newStep: number) => {
    // Step 변경 시 에디터 초기화로 인한 onChange 무시하기 위해 플래그 설정
    isLoadingTemplate.current = true;

    if (editorRef.current) {
      const content = editorRef.current.getContent();
      let saveKey = -1;
      if (currentStep <= 3) saveKey = currentStep;
      else if (shippingOrder) saveKey = getDocKeyForStep(currentStep);

      if (saveKey !== -1) {
        const newDocData = { ...documentData, [saveKey]: content };

        // [ADDED] Propagate shared data to all other documents immediately
        extractData(content); // Update sharedData state first

        Object.keys(newDocData).forEach(key => {
          const docKey = Number(key);
          if (isNaN(docKey) || key === 'title' || docKey === saveKey) return;

          const originalContent = (newDocData as any)[key];
          if (typeof originalContent === 'string') {
            const newContent = updateContentWithSharedData(originalContent);
            // Only update if content ACTUALLY changed (mapped field update)
            if (newContent !== originalContent) {
              (newDocData as any)[key] = newContent;
            }
          }
        });

        setDocumentData(newDocData);
      }
    }
    setCurrentStep(newStep);

    // 에디터 초기화 완료 후 플래그 해제
    setTimeout(() => {
      isLoadingTemplate.current = false;
    }, 100);
  };

  const handleSave = async () => {
    // 매핑 완료 대기 (파일 업로드 직후 저장 시 필요)
    // mappingInProgressRef가 true이면 false가 될 때까지 폴링
    if (mappingInProgressRef.current) {
      console.log('[handleSave] Waiting for mapping to complete...');
      const maxWait = 2000; // 최대 2초 대기
      const pollInterval = 50; // 50ms 간격으로 확인
      let waited = 0;

      while (mappingInProgressRef.current && waited < maxWait) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waited += pollInterval;
      }

      if (mappingInProgressRef.current) {
        console.warn('[handleSave] Mapping timeout, proceeding anyway');
      } else {
        console.log(`[handleSave] Mapping completed after ${waited}ms`);
      }
    }

    // latestDocumentDataRef에서 최신 데이터 가져오기 (매핑된 데이터 포함)
    const latestData = latestDocumentDataRef.current;
    console.log('[handleSave] Using latest data from ref');

    const newDocData: DocumentData = {
      ...latestData,
      stepModes,
      uploadedFileNames,
      uploadedFileUrls: uploadedDocumentUrls
    };

    // [추가] sharedData + documentData에서 추출한 데이터 통합
    const combinedSharedData: Record<string, string> = {};
    [1, 2, 3, 4, 5].forEach(step => {
      const content = newDocData[step];
      if (typeof content === 'string') {
        const data = extractDataFromContent(content);
        Object.assign(combinedSharedData, data);
      }
    });

    // [추가] 모든 step에 매핑 적용 (editorRef 없어도 동작)
    [1, 2, 3, 4, 5].forEach(step => {
      const content = newDocData[step];
      if (typeof content === 'string') {
        const updated = applySharedData(content, combinedSharedData);
        if (updated !== content) {
          newDocData[step] = updated;
        }
      }
    });

    if (editorRef.current) {
      const content = editorRef.current.getContent();
      extractData(content);

      const saveKey = currentStep <= 3 ? currentStep : (shippingOrder ? getDocKeyForStep(currentStep) : -1);
      if (saveKey !== -1) {
        (newDocData as any)[saveKey] = content;
      }

      // Propagate shared data changes to other documents
      Object.keys(newDocData).forEach(key => {
        const docKey = Number(key);
        if (isNaN(docKey) || key === 'title' || docKey === saveKey) return;

        const originalContent = (newDocData as any)[key];
        if (typeof originalContent === 'string') {
          const updated = updateContentWithSharedData(originalContent);
          if (updated !== originalContent) (newDocData as any)[key] = updated;
        }
      });
    }

    // 에디터 유무와 관계없이 항상 documentData 업데이트 (업로드 직후 저장 시 필요)
    setDocumentData(newDocData);

    // [ADDED] Check if all steps are completed
    let isAllCompleted = true;
    for (let i = 1; i <= 5; i++) {
      if (!getStepCompletionStatus(i)) {
        isAllCompleted = false;
        break;
      }
    }

    onSave(newDocData, currentStep, activeShippingDoc, isAllCompleted);
    setIsDirty(false);
    setShowSaveSuccessModal(true);
    setShowVersionRestoreNotice(false); // 버전 복원 알림 닫기
  };

  const handleDownload = () => {
    if (editorRef.current) {
      const content = editorRef.current.getContent();
      extractData(content);
      let saveKey = -1;
      if (currentStep <= 3) saveKey = currentStep;
      else if (shippingOrder) saveKey = getDocKeyForStep(currentStep);

      if (saveKey !== -1) {
        setDocumentData({ ...documentData, [saveKey]: content });
      }
    }
    setShowDownloadModal(true);
  };

  const scrollToField = (fieldId: string) => {
    if (!editorRef.current) {
      return;
    }

    // 에디터 DOM에서 해당 필드 찾기
    const editorElement = document.querySelector('.ProseMirror');
    if (!editorElement) {
      return;
    }

    // React node views don't have data-field-id, so find by text content
    const allFields = editorElement.querySelectorAll('.data-field-node');

    let targetField: Element | null = null;

    for (const field of Array.from(allFields)) {
      if (field.textContent === `[${fieldId}]`) {
        targetField = field;
        break;
      }
    }

    if (targetField) {
      targetField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFindUnfilledFields = () => {
    // 현재 에디터 DOM 가져오기
    if (!editorRef.current) return;

    const editorElement = editorRef.current.getEditorElement();
    if (!editorElement) return;

    const unfilled = findUnfilledFields(editorElement);

    if (unfilled.length === 0) {
      // 모든 필드 작성 완료
      alert('현재 문서의 필수 항목이 모두 작성되었습니다.');
      setUnfilledFields([]);
      setCurrentUnfilledIndex(-1);
      setHighlightedFieldId(null);
      return;
    }

    // 첫 번째 또는 다음 미작성 필드로 이동
    let nextIndex = 0;
    if (unfilledFields.length > 0 && currentUnfilledIndex >= 0) {
      nextIndex = (currentUnfilledIndex + 1) % unfilled.length;

      // 마지막 항목 도달 시
      if (nextIndex === 0 && currentUnfilledIndex === unfilled.length - 1) {
        alert('마지막 미작성 항목입니다. 처음부터 다시 시작합니다.');
      }
    }

    setUnfilledFields(unfilled);
    setCurrentUnfilledIndex(nextIndex);
    setHighlightedFieldId(unfilled[nextIndex]);

    // 에디터에서 해당 필드로 스크롤
    scrollToField(unfilled[nextIndex]);
  };

  const handleExit = async () => {
    // Check if user made actual changes (not just mode selection)
    const hasChanges = isDirty;

    // Call onExit callback and wait for completion (e.g., trade deletion)
    if (onExit) {
      await onExit(hasChanges);
    }

    // Navigate to main page after exit handler completes
    onNavigate('main');
  };

  // Helper to load font
  const loadFont = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch font: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return binary;
    } catch (e) {
      console.error('Font loading error:', e);
      throw e;
    }
  };

  const handleBatchDownload = async (selectedSteps: Set<number>) => {
    // Close modal first
    setShowDownloadModal(false);

    if (selectedSteps.size === 0) {
      alert('다운로드할 문서를 선택해주세요.');
      return;
    }

    setIsDownloading(true);

    try {
      // Load Korean font (Noto Sans KR) from local public folder
      // This avoids CORS issues with external CDNs
      const fontUrl = '/NotoSansKR-Regular.ttf';
      const fontBytes = await loadFont(fontUrl);

      const stepsToDownload = Array.from(selectedSteps).sort((a, b) => a - b);

      for (const stepIndex of stepsToDownload) {
        // [FIX] Ensure we get the correct content for CI (4) and PL (5)
        let content = documentData[stepIndex];

        // [FIX] Hydrate with template if content is missing
        if (!content) {
          content = getTemplateForStep(stepIndex);
          if (!content) continue;
        }

        // Clean content (remove marks)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        tempDiv.querySelectorAll('mark').forEach(mark => {
          const text = document.createTextNode(mark.textContent || '');
          mark.parentNode?.replaceChild(text, mark);
        });

        // [FIX] Replace custom Checkbox/Radio nodes with text symbols for PDF
        // Checkboxes
        tempDiv.querySelectorAll('.checkbox-widget').forEach(el => {
          const isChecked = el.getAttribute('data-checked') === 'true';
          const span = document.createElement('span');
          span.style.fontFamily = 'NotoSansKR';
          span.style.fontWeight = 'bold';
          span.style.margin = '0 2px';
          span.textContent = isChecked ? '[V]' : '[ ]';
          el.parentNode?.replaceChild(span, el);
        });

        // Radios
        tempDiv.querySelectorAll('.radio-circle').forEach(el => {
          const isChecked = el.classList.contains('checked') || el.getAttribute('data-checked') === 'true';
          const span = document.createElement('span');
          span.style.fontFamily = 'NotoSansKR';
          span.style.margin = '0 2px';
          span.textContent = isChecked ? '●' : '○';
          el.parentNode?.replaceChild(span, el);
        });

        // Create container for PDF generation
        const container = document.createElement('div');
        container.style.width = '794px'; // A4 width at 96 DPI (approx)
        // container.style.minHeight = '1123px'; // Removed to prevent extra blank page (1123px > 297mm)
        container.style.padding = '40px'; // Approx 10mm padding
        container.style.backgroundColor = 'white';
        container.style.color = 'black';
        container.style.fontFamily = 'NotoSansKR, sans-serif';
        container.style.fontSize = '14px'; // ~10.5pt
        container.style.lineHeight = '1.4';
        container.style.boxSizing = 'border-box';
        // [FIX] Use z-index instead of far-off coordinates to ensure rendering
        container.style.position = 'absolute';
        container.style.left = '0';
        container.style.top = '0';
        container.style.zIndex = '-9999';

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
          @font-face {
            font-family: 'NotoSansKR';
            src: url('${fontUrl}') format('truetype');
          }
          table { border-collapse: collapse; width: 100%; margin-bottom: 1em; table-layout: fixed; }
          th, td { border: 1px solid black; padding: 4px 6px; text-align: left; font-size: 12px; word-wrap: break-word; }
          .contract-table { width: 100%; }
          img { max-width: 100%; }
          span[data-field-id] { background-color: transparent !important; }
          
          /* Fallback styles for form elements if replacement fails */
          .checkbox-widget {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1px solid black;
            margin: 0 2px;
            vertical-align: middle;
          }
          .checkbox-widget[data-checked="true"] {
            background-color: black;
          }
          .radio-circle {
            display: inline-block;
            width: 12px;
            height: 12px;
            border: 1px solid black;
            border-radius: 50%;
            margin: 0 2px;
            vertical-align: middle;
          }
          .radio-circle.checked, .radio-circle[data-checked="true"] {
            background-color: black;
          }

          * { color: black !important; }
        `;
        container.appendChild(style);

        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = tempDiv.innerHTML;
        container.appendChild(contentWrapper);

        document.body.appendChild(container);

        // Wait for layout
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create PDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Add font to PDF
        pdf.addFileToVFS('NotoSansKR-Regular.ttf', fontBytes);
        pdf.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
        pdf.setFont('NotoSansKR');

        // Render HTML to PDF (Text-based)
        await pdf.html(container, {
          callback: (doc) => {
            // Generate filename
            let stepName = '';
            if (stepIndex === 4) stepName = 'Commercial Invoice';
            else if (stepIndex === 5) stepName = 'Packing List';
            else stepName = STEP_SHORT_NAMES[stepIndex - 1] || `Step${stepIndex}`;

            const safeTitle = (documentData.title || 'Trade_Document').replace(/[^a-z0-9가-힣\s_-]/gi, '_');
            doc.save(`${safeTitle}_${stepName}.pdf`);

            // Cleanup inside callback to ensure save is done
            document.body.removeChild(container);
          },
          x: 0,
          y: 0,
          width: 210, // Target width in mm
          windowWidth: 794, // Source width in px
          margin: [0, 0, 0, 0],
          autoPaging: 'text',
          html2canvas: {
            scale: 0.26458, // 1 px = 0.26458 mm
            useCORS: true,
            logging: false,
            letterRendering: true // Improve text rendering
          }
        });
        // Note: Cleanup is handled in callback
      }

    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF 생성 중 오류가 발생했습니다. (폰트 로딩 실패 등)');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleChatApply = (changes: FieldChange[], step: number) => {
    if (!editorRef.current || changes.length === 0) return;
    editorRef.current.applyFieldChanges(changes);

    const newSharedData: Record<string, string> = {};
    changes.forEach(({ fieldId, value }) => { newSharedData[fieldId] = value; });
    setSharedData(prev => ({ ...prev, ...newSharedData }));

    const updatedContent = editorRef.current.getContent();
    setDocumentData((prev: DocumentData) => ({ ...prev, [step]: updatedContent }));
    markStepModified(step);
    setIsDirty(true);

    if (step === 4 || step === 5) {
      if (!shippingOrder) {
        if (step === 4) setShippingOrder(['CI', 'PL']);
        else setShippingOrder(['PL', 'CI']);
      }
      let targetVisualStep = -1;
      if (shippingOrder) {
        if (shippingOrder[0] === (step === 4 ? 'CI' : 'PL')) targetVisualStep = 4;
        else targetVisualStep = 5;
      } else {
        targetVisualStep = 4;
      }
      if (targetVisualStep !== -1) setCurrentStep(targetVisualStep);
    } else {
      if (currentStep !== step) setCurrentStep(step);
    }
  };

  const handleEditorChange = (content: string) => {
    // 버전 복원 중에는 에디터 변경을 완전히 무시 (복원된 상태 보호)
    if (isRestoringVersion.current) {
      return;
    }

    const saveKey = getDocKeyForStep(currentStep);
    if (saveKey !== -1) {
      setDocumentData((prev: DocumentData) => ({
        ...prev,
        [saveKey]: content
      }));

      // 템플릿 로딩 중에는 isDirty만 설정하지 않음 (데이터는 저장)
      if (!isLoadingTemplate.current) {
        markStepModified(saveKey);
        setIsDirty(true);
      }
    }
  };

  const handleModeSelect = async (mode: StepMode) => {
    const result = onCreateTrade ? await onCreateTrade() : null;
    const docIds = result?.docIds || null;

    setStepModes(prev => ({ ...prev, [currentStep]: mode }));
    setIsDirty(false);

    const stepToDocType: Record<number, string> = { 1: 'offer', 2: 'pi', 3: 'contract', 4: 'ci', 5: 'pl' };
    const docId = docIds?.[stepToDocType[currentStep]] ?? getDocId?.(currentStep, null);

    if (docId && mode) {
      try {
        const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
        await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_mode: mode })
        });
      } catch { /* ignore */ }
    }
  };

  const handleRowAdded = (fieldIds: string[]) => {
    // Helper to add row to a document's HTML content
    const addRowToDocument = (htmlContent: string, fieldIds: string[], stepName: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Find the template row by searching all tables
      const tables = doc.querySelectorAll('table');
      let templateRow: HTMLElement | null = null;

      for (const table of Array.from(tables)) {
        const rows = Array.from(table.querySelectorAll('tbody tr'));

        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          const dataFields = row.querySelectorAll('[data-field-id]');
          const text = row.textContent || '';

          // Check if it's a data row by looking for specific item fields
          let hasItemField = false;
          dataFields.forEach(field => {
            const fid = field.getAttribute('data-field-id') || '';
            if (fid.startsWith('item_no') ||
              fid.startsWith('unit_price') ||
              fid.startsWith('quantity') ||
              fid.startsWith('description') ||
              fid.startsWith('sub_total_price') ||
              fid.startsWith('marks_and_numbers')) {
              hasItemField = true;
            }
          });

          // Check for Total row (case sensitive "Total " with space to avoid sub_total_price)
          const isTotalRow = text.includes('Total ') || text.includes('TOTAL :');

          // Must have item fields AND multiple fields (to avoid false positives)
          if (hasItemField && dataFields.length >= 3 && !isTotalRow) {
            templateRow = row as HTMLElement;
            break;
          }
        }

        if (templateRow) break; // Found it, stop searching tables
      }

      if (!templateRow) {
        console.warn('⚠️ No template row found in document');
        return htmlContent;
      }

      // Collect all existing field IDs in the document to avoid duplicates
      const existingFieldIds = new Set<string>();
      const allFields = doc.querySelectorAll('[data-field-id]');
      allFields.forEach((f: Element) => {
        const id = f.getAttribute('data-field-id');
        if (id) existingFieldIds.add(id);
      });

      const newRow = templateRow.cloneNode(true) as HTMLElement;

      const fieldMap = new Map<string, string>();
      fieldIds.forEach(fieldId => {
        const baseName = fieldId.replace(/_\d+$/, '');
        fieldMap.set(baseName, fieldId);
      });

      // Helper to get next available field ID
      const getNextFieldId = (baseName: string): string => {
        let counter = 2;
        let newId = `${baseName}_${counter}`;
        while (existingFieldIds.has(newId)) {
          counter++;
          newId = `${baseName}_${counter}`;
        }
        existingFieldIds.add(newId);
        return newId;
      };

      // Replace field IDs in the new row
      const dataFields = newRow.querySelectorAll('[data-field-id]');

      dataFields.forEach((field, index) => {
        const currentFieldId = field.getAttribute('data-field-id');
        if (currentFieldId) {
          const baseName = currentFieldId.replace(/_\d+$/, '');
          let newFieldId = fieldMap.get(baseName);

          if (!newFieldId) {
            newFieldId = getNextFieldId(baseName);
          }

          field.setAttribute('data-field-id', newFieldId);
          field.setAttribute('data-source', ''); // Set to empty string (null equivalent in HTML)
          field.textContent = `[${newFieldId}]`;

          // [FIX] Append units if missing (for Net/Gross Weight and Measurement)
          if (baseName === 'net_weight' || baseName === 'gross_weight') {
            const parent = field.parentElement;
            if (parent && !parent.textContent?.includes('KG')) {
              parent.appendChild(document.createTextNode(' KG'));
            }
          } else if (baseName === 'measurement') {
            const parent = field.parentElement;
            if (parent && !parent.textContent?.includes('CBM')) {
              parent.appendChild(document.createTextNode(' CBM'));
            }
          }
        }
      });

      // Insert AFTER the template row
      if (templateRow.nextSibling) {
        templateRow.parentNode?.insertBefore(newRow, templateRow.nextSibling);
      } else {
        templateRow.parentNode?.appendChild(newRow);
      }

      return doc.documentElement.outerHTML.replace(/^<html><head><\/head><body>/, '').replace(/<\/body><\/html>$/, '');
    };

    // Update all other documents
    setDocumentData((prev: DocumentData) => {
      const newData = { ...prev };

      // Determine the key of the document currently being edited
      let currentDocKey = currentStep;
      if (currentStep === 4) {
        if (activeShippingDoc === 'CI') currentDocKey = 4;
        else if (activeShippingDoc === 'PL') currentDocKey = 5;
      }

      // Sync to all documents except the current one
      const documentsToSync = [1, 2, 3, 4, 5].filter(key => key !== currentDocKey);

      documentsToSync.forEach(step => {
        // Get existing content or hydrate template
        let content = prev[step];
        if (!content) {
          content = hydrateTemplate(getTemplateForStep(step));
        }

        const updatedContent = addRowToDocument(content, fieldIds, `Step ${step}`);
        newData[step] = updatedContent;
      });

      return newData;
    });

  };

  // Handle row deletion and sync to other documents
  const handleRowDeleted = useCallback((fieldIds: string[]) => {

    // Helper to delete row from a document's HTML content
    const deleteRowFromDocument = (htmlContent: string, deletedFieldIds: string[], stepName: string): string => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Find all tables
      const tables = doc.querySelectorAll('table');


      let deletedCount = 0;

      tables.forEach((table, tableIndex) => {
        // Search all rows in the table (thead, tbody, tfoot)
        const rows = Array.from(table.querySelectorAll('tr'));


        // Find and delete rows that contain any of the deleted field IDs
        rows.forEach((row, rowIndex) => {
          const rowFieldIds: string[] = [];
          const dataFields = row.querySelectorAll('[data-field-id]');

          dataFields.forEach((field) => {
            const fieldId = field.getAttribute('data-field-id');
            if (fieldId) {
              rowFieldIds.push(fieldId.trim());
            }
          });


          // Check if this row contains any of the deleted field IDs
          // Use strict inclusion check but with trimmed strings
          const hasDeletedField = rowFieldIds.some(id => deletedFieldIds.includes(id));

          if (hasDeletedField) {
            row.remove();
            deletedCount++;
          }
        });
      });

      if (deletedCount > 0) {
      } else {
      }

      // Return the inner HTML of the body, or the whole thing if structure is different
      // Using body.innerHTML is safer than regex replacement for DOMParser result
      return doc.body.innerHTML;
    };

    // Update all other documents
    setDocumentData((prev: DocumentData) => {
      const newData = { ...prev };

      // Determine the key of the document currently being edited
      let currentDocKey = currentStep;
      if (currentStep === 4) {
        if (activeShippingDoc === 'CI') currentDocKey = 4;
        else if (activeShippingDoc === 'PL') currentDocKey = 5;
      }


      // Sync to all documents except the current one
      const documentsToSync = [1, 2, 3, 4, 5].filter(key => key !== currentDocKey);

      documentsToSync.forEach(step => {
        // Get existing content or hydrate template
        let content = prev[step];
        if (!content) {
          content = hydrateTemplate(getTemplateForStep(step));
        }

        newData[step] = deleteRowFromDocument(content, fieldIds, `Step ${step}`);
      });

      return newData;
    });

  }, [currentStep, activeShippingDoc, hydrateTemplate, setDocumentData]);

  const handleShippingDocChange = (doc: ShippingDocType) => {
    // Shipping doc 변경 시 에디터 초기화로 인한 onChange 무시하기 위해 플래그 설정
    isLoadingTemplate.current = true;

    // Save current doc content before switching
    if (editorRef.current && activeShippingDoc) {
      const content = editorRef.current.getContent();
      const saveKey = activeShippingDoc === 'CI' ? 4 : 5;
      setDocumentData((prev: DocumentData) => ({ ...prev, [saveKey]: content }));
      extractData(content);
    }
    setActiveShippingDoc(doc);

    // 에디터 초기화 완료 후 플래그 해제
    setTimeout(() => {
      isLoadingTemplate.current = false;
    }, 100);
  };

  const handleVersionRestore = async (version: Version) => {
    const targetTimestamp = version.timestamp;
    const step = version.step;

    // 버전 복원 시작 - 에디터 onChange가 documentData를 덮어쓰지 않도록 플래그 설정
    isRestoringVersion.current = true;
    isLoadingTemplate.current = true;

    // 1. 선택한 버전의 timestamp 기준으로 각 문서의 해당 시점 상태 복원
    // 해당 시점에 버전이 없는 문서는 undefined로 설정 (이전 상태 제거)
    // 버전 복원 시 title은 변경하지 않음 (유저가 직접 설정하는 값)
    const restoredDocumentData: DocumentData = {
      title: documentData.title,
      1: undefined,
      2: undefined,
      3: undefined,
      4: undefined,
      5: undefined,
    };

    // 각 step의 복원된 버전 정보 추적 (백엔드 상태 업데이트용)
    const restoredVersionInfo: Record<number, { isUpload: boolean; uploadInfo?: Version['uploadInfo'] } | null> = {};

    for (let docStep = 1; docStep <= 5; docStep++) {
      // 해당 step의 버전들 중 targetTimestamp 이하인 가장 최신 버전 찾기
      const stepVersions = versions
        .filter(v => v.step === docStep && v.timestamp <= targetTimestamp)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (stepVersions.length > 0) {
        const latestVersion = stepVersions[0];
        restoredDocumentData[docStep] = latestVersion.data[docStep];
        restoredVersionInfo[docStep] = {
          isUpload: latestVersion.isUpload || false,
          uploadInfo: latestVersion.uploadInfo,
        };
      } else {
        restoredVersionInfo[docStep] = null;
      }
    }

    // 2. 복원된 모든 문서에서 sharedData 추출하여 한 번에 설정
    // (비동기 상태 업데이트 문제 방지를 위해 extractData를 직접 호출하지 않음)
    const newSharedData: Record<string, string> = {};
    const parser = new DOMParser();

    for (let docStep = 1; docStep <= 5; docStep++) {
      const content = restoredDocumentData[docStep];
      if (content) {
        const doc = parser.parseFromString(content, 'text/html');
        const fields = doc.querySelectorAll('span[data-field-id]');

        fields.forEach(field => {
          const key = field.getAttribute('data-field-id');
          const value = field.textContent;
          const source = field.getAttribute('data-source');

          if (key && value && value !== `[${key}]` && source !== 'auto') {
            // 첫 번째로 발견된 유효 값만 저장 (이미 설정된 경우 덮어쓰지 않음)
            if (!newSharedData[key]) {
              newSharedData[key] = value;
            }
          }
        });
      }
    }

    // 한 번에 sharedData 설정 (이전 데이터 완전 교체)
    setSharedData(newSharedData);

    // 3. documentData 전체 교체 (이전 상태 무시) - 먼저 상태 설정
    setDocumentData(restoredDocumentData);

    // 3.1. latestDocumentDataRef 직접 업데이트 (handleSave에서 즉시 사용 가능하도록)
    // React 상태 업데이트는 비동기이므로, ref를 직접 업데이트해야 버전 복원 직후 저장 시 올바른 데이터 사용
    latestDocumentDataRef.current = restoredDocumentData;

    // 3.5. modifiedSteps 초기화 (복원 대상 step만 포함)
    // 버전 복원은 해당 step만 "수정됨"으로 표시해야 함
    // 다른 step은 복원 시점의 데이터가 유지되지만 "새로 수정한 것"이 아님
    setModifiedSteps(new Set([version.step]));

    // 3.6. 모든 step의 stepModes 및 백엔드 상태 복원
    const newStepModes: Record<number, StepMode> = {};
    const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';

    for (let docStep = 1; docStep <= 5; docStep++) {
      const versionInfo = restoredVersionInfo[docStep];
      const docId = getDocId?.(docStep <= 3 ? docStep : 4, docStep === 5 ? 'PL' : docStep === 4 ? 'CI' : null);

      if (versionInfo) {
        if (versionInfo.isUpload) {
          // 업로드 버전 복원
          newStepModes[docStep] = 'upload';
          if (versionInfo.uploadInfo) {
            restoreUploadState(docStep, {
              filename: versionInfo.uploadInfo.filename,
              s3_url: versionInfo.uploadInfo.s3_url,
              convertedPdfUrl: versionInfo.uploadInfo.convertedPdfUrl,
            });
          }
          // 백엔드 상태 업데이트
          if (docId) {
            try {
              await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_mode: 'upload', upload_status: 'ready' })
              });
            } catch { /* ignore */ }
          }
        } else {
          // 에디터 버전 복원
          newStepModes[docStep] = 'manual';
          // 업로드 상태 초기화 (useEffect가 modifiedSteps에 다시 추가하지 않도록)
          removeUploadedFile(docStep);
          // 백엔드 상태 업데이트
          if (docId) {
            try {
              await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc_mode: 'manual', upload_status: null })
              });
            } catch { /* ignore */ }
          }
        }
      } else {
        // 해당 시점에 버전 없음 → 모드 초기화
        newStepModes[docStep] = null;
        // 업로드 상태 초기화
        removeUploadedFile(docStep);
        if (docId) {
          try {
            await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ doc_mode: null, upload_status: null })
            });
          } catch { /* ignore */ }
        }
      }
    }

    setStepModes(newStepModes);

    // 4. UI 상태 업데이트
    setShowVersionHistory(false);

    if (step <= 3) {
      setCurrentStep(step);
    } else {
      // Step 4 (CI/PL)
      setCurrentStep(4);
      setActiveShippingDoc(step === 4 ? 'CI' : 'PL');
    }

    // 5. 에디터 리마운트 및 플래그 해제
    setEditorKey(prev => prev + 1);
    setTimeout(() => {
      isRestoringVersion.current = false;
      isLoadingTemplate.current = false;
    }, 100);

    // 6. 버전 복원 완료 알림 표시 (저장 시에만 닫힘)
    setShowVersionRestoreNotice(true);
  };

  // Calculate doc key for current step
  const currentDocKey = getDocKeyForStep(currentStep);

  // Get initial content for editor
  // editorKey를 의존성에 추가하여 버전 복원 시 재계산되도록 함
  const initialContent = useMemo((): string => {
    if (currentDocKey === -1) return '';
    const content = documentData[currentDocKey] || hydrateTemplate(getTemplateForStep(currentDocKey));
    return updateContentWithSharedData(content);
  }, [currentDocKey, documentData[currentDocKey], sharedData, editorKey]);

  const renderStepHeaderControls = () => {
    // 1. Left Side Content (Back Button or CI/PL Switcher)
    let leftContent = null;
    // Show back button if any mode is selected for Step 1 or 3
    if ((currentStep === 1 || currentStep === 3) && stepModes[currentStep]) {
      leftContent = (
        <button
          onClick={async () => {
            // 업로드 상태 리셋
            removeUploadedFile(currentStep);

            // sharedData 완전 초기화 (업로드에서 추출된 모든 값 제거)
            setSharedData({});

            // 모든 step의 documentData 초기화 (업로드에서 매핑된 값 제거)
            setDocumentData((prev: DocumentData) => ({
              title: prev.title,
              1: undefined,
              2: undefined,
              3: undefined,
              4: undefined,
              5: undefined,
            }));

            // modifiedSteps 초기화 (저장 모달에서 올바른 문서만 표시)
            setModifiedSteps(new Set());

            // 모드 전환
            setStepModes(prev => ({ ...prev, [currentStep]: null }));

            // 백엔드 upload_status 초기화 (MainPage에서 접근 가능 여부 판단에 사용)
            const docId = getDocId?.(currentStep, null);
            if (docId) {
              try {
                const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
                await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ upload_status: null, doc_mode: null })
                });
              } catch { /* ignore */ }
            }
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium">작성 방식 다시 선택하기</span>
        </button>
      );
    } else if (currentStep === 4 && activeShippingDoc) {
      // Step 4: CI/PL 토글을 왼쪽에 배치
      const tabs = [
        { id: 'CI', label: 'Commercial Invoice', icon: FileText, color: 'text-blue-600' },
        { id: 'PL', label: 'Packing List', icon: Package, color: 'text-indigo-600' }
      ];

      leftContent = (
        <div className="bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-full flex items-center shadow-inner border border-gray-200/50 relative">
          {tabs.map((tab) => {
            const isActive = activeShippingDoc === tab.id;
            // Determine completion status
            const isComplete = tab.id === 'CI'
              ? checkStepCompletion(documentData[4] || hydrateTemplate(commercialInvoiceTemplateHTML))
              : checkStepCompletion(documentData[5] || hydrateTemplate(packingListTemplateHTML));


            // Premium Colors
            const activeColor = tab.id === 'CI' ? 'text-blue-600' : 'text-indigo-600';
            const completeColor = 'text-emerald-600';
            const inactiveColor = 'text-gray-500 hover:text-gray-700';

            const textColor = isActive
              ? (isComplete ? completeColor : activeColor)
              : (isComplete ? 'text-emerald-600/80' : inactiveColor);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveShippingDoc(tab.id as ShippingDocType)}
                className={`relative px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2.5 z-10 ${textColor}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    className={`absolute inset-0 bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 z-[-1] ${isComplete ? 'ring-emerald-100 shadow-emerald-100/50' : ''
                      }`}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}

                <div className="relative w-4 h-4 flex items-center justify-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {isComplete ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -90, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0, rotate: 90, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="icon"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <tab.icon className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <span className="relative">
                  {tab.label}
                  {isComplete && isActive && (
                    <motion.span
                      layoutId="glow"
                      className="absolute -inset-3 bg-emerald-400/20 blur-lg rounded-full -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      );
    }

    // 3. Right Side Content (Toggles)
    // Hide toggles if in Upload or Skip mode for Step 1 & 3
    const shouldShowToggles = !((currentStep === 1 || currentStep === 3) && stepModes[currentStep] !== 'manual');

    const rightContent = shouldShowToggles ? (
      <div className="flex items-center gap-2">
        {/* Unfilled Field Finder Button */}
        <button
          onClick={handleFindUnfilledFields}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-red-50 text-red-600 hover:bg-red-100"
          title="미작성 필드 찾기"
        >
          <Search className="w-4 h-4" />
          <span>미작성 항목 찾기</span>
        </button>

        {/* Common Field Highlight Toggle */}
        <button
          onClick={() => setShowFieldHighlight(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showFieldHighlight
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
        >
          {showFieldHighlight ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span>공통 필드</span>
        </button>

        {/* Agent Highlight Toggle */}
        <button
          onClick={() => setShowAgentHighlight(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showAgentHighlight
            ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI 답변</span>
        </button>
      </div>
    ) : null;

    // 4. Return Grid Container (2열: left + right)
    return (
      <div className="px-8 pb-4 grid grid-cols-2 items-center min-h-[76px]">
        <div className="justify-self-start">{leftContent}</div>
        <div className="justify-self-end">{rightContent}</div>
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    // Step 0: Empty State
    if (currentStep === 0) {
      return <EmptyState />;
    }

    // Step 1 & 3: Mode Selection or Content
    if ((currentStep === 1 || currentStep === 3) && !stepModes[currentStep]) {
      return (
        <ModeSelector
          currentStep={currentStep}
          onSelectMode={handleModeSelect}
        />
      );
    }

    // Skip State
    if (stepModes[currentStep] === 'skip') {
      return (
        <SkipState />
      );
    }

    // Upload Mode
    if (stepModes[currentStep] === 'upload') {
      const docId = getDocId?.(currentStep, null);
      return (
        <FileUploadView
          file={uploadedFiles[currentStep] || null}
          fileName={uploadedFileNames[currentStep]}
          status={uploadStatus[currentStep] || 'idle'}
          documentUrl={uploadedDocumentUrls[currentStep] || null}
          docId={uploadedDocumentIds[currentStep] || null}
          convertedPdfUrl={uploadedConvertedPdfUrls[currentStep] || null}
          error={uploadError[currentStep] || null}
          onUpload={(file) => {
            if (docId) {
              handleFileUpload(currentStep, file, docId);
            } else {
              console.error('Document ID not found for step', currentStep);
            }
          }}
          onRetry={() => retryUpload(currentStep)}
          onReset={async () => {
            removeUploadedFile(currentStep);
            // 백엔드 upload_status 초기화
            const docId = getDocId?.(currentStep, null);
            if (docId) {
              try {
                const API_URL = import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8000';
                await fetch(`${API_URL}/api/documents/documents/${docId}/`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ upload_status: null })
                });
              } catch { /* ignore */ }
            }
          }}
        />
      );
    }

    // Step 4: Shipping Docs Dashboard or Editor
    if (currentStep === 4) {
      if (!activeShippingDoc) {
        return (
          <ShippingDocsDashboard
            documentData={documentData}
            onSelectDoc={setActiveShippingDoc}
          />
        );
      }
    }

    // Editor View (Manual mode or Step 2/4 with doc selected)
    return (
      <EditorView
        key={`editor-${currentStep}-${activeShippingDoc || 'default'}-${editorKey}-${Boolean(documentData[currentDocKey])}`}
        currentStep={currentStep}
        onUpdate={handleEditorUpdate}
        stepModes={stepModes}
        activeShippingDoc={activeShippingDoc}
        editorRef={editorRef}
        editorKey={editorKey}
        initialContent={initialContent || getTemplateForStep(currentStep === 4 ? (activeShippingDoc === 'CI' ? 4 : 5) : currentStep)}
        onBack={() => {
          if (currentStep === 4 && activeShippingDoc) {
            // Save before going back to dashboard
            if (editorRef.current) {
              const content = editorRef.current.getContent();
              const saveKey = activeShippingDoc === 'CI' ? 4 : 5;
              setDocumentData((prev: DocumentData) => ({ ...prev, [saveKey]: content }));
              extractData(content);
            }
            setActiveShippingDoc(null);
          } else {
            // 모드 전환 (useEffect에서 documentData에 자동 동기화됨)
            setStepModes(prev => ({ ...prev, [currentStep]: null }));
          }
        }}
        onShippingDocChange={handleShippingDocChange}
        onChange={handleEditorChange}
        onRowAdded={handleRowAdded}
        onRowDeleted={handleRowDeleted}
        showFieldHighlight={showFieldHighlight}
        showAgentHighlight={showAgentHighlight}
        highlightedFieldId={highlightedFieldId}
        onFieldEdit={(fieldId) => {
          // Remove highlight when user edits the field
          if (fieldId === highlightedFieldId) {
            setHighlightedFieldId(null);
          }
        }}
      />
    );
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Version History Sidebar */}
      <VersionHistorySidebar
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        versions={versions}
        currentStep={currentStep}
        onRestore={handleVersionRestore}
      />

      {/* Header */}
      <DocumentHeader
        documentData={documentData}
        isDirty={isDirty}
        versions={versions}
        currentStep={currentStep}
        onTitleChange={(title) => {
          setDocumentData({ ...documentData, title });
          setIsDirty(true);
        }}
        onBackClick={() => {
          if (isDirty) setShowExitConfirm(true);
          else handleExit();
        }}
        onSave={handleSave}
        onDownload={handleDownload}
        onVersionHistoryClick={() => setShowVersionHistory(true)}
        onMyPageClick={() => setShowMyPageModal(!showMyPageModal)}
        onLogoutClick={() => setShowLogoutConfirm(true)}
      />

      {/* Version Restore Notice Banner */}
      <AnimatePresence>
        {showVersionRestoreNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">버전이 복원되었습니다</p>
                <p className="text-xs text-blue-700">저장 버튼을 눌러 공통 필드를 모든 문서에 적용하세요</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Tabs + Content */}
        <div className="flex-1 flex flex-col relative min-h-0">
          {/* Step Navigation */}
          {/* Tab Navigation */}
          <motion.div
            initial={false}
            animate={{
              height: isStepIndicatorVisible ? 'auto' : 0,
              opacity: isStepIndicatorVisible ? 1 : 0
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm flex-shrink-0 z-10 relative overflow-hidden"
          >
            <div className="px-8 py-4">
              <div className="max-w-6xl mx-auto relative">
                {/* Progress Line Background */}
                <div
                  className="absolute top-[15px] h-1 bg-gray-200 rounded-full overflow-hidden"
                  style={{
                    left: `calc(100% / ${STEP_SHORT_NAMES.length * 2})`,
                    width: `calc(100% * ${(STEP_SHORT_NAMES.length - 1) / STEP_SHORT_NAMES.length})`
                  }}
                >
                  {/* Animated Progress Line */}
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${((maxProgressStep - 1) / (STEP_SHORT_NAMES.length - 1)) * 100}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>

                <div
                  className="grid items-center relative"
                  style={{ gridTemplateColumns: `repeat(${STEP_SHORT_NAMES.length}, 1fr)` }}
                >
                  {STEP_SHORT_NAMES.map((name, index) => {
                    const stepNumber = index + 1;
                    const isActive = currentStep === stepNumber;

                    // Determine completion status
                    const isComplete = getStepCompletionStatus(stepNumber);

                    // Check accessibility
                    let isAccessible = true;
                    if (stepNumber > 1) {
                      const prevStepNumber = stepNumber - 1;
                      const prevStepComplete = getStepCompletionStatus(prevStepNumber);
                      isAccessible = prevStepComplete;
                    }

                    return (
                      <div key={index} className="flex flex-col items-center gap-2 relative group z-10">
                        <motion.button
                          onClick={() => isAccessible && handleStepChange(stepNumber)}
                          disabled={!isAccessible}
                          initial={false}
                          animate={{
                            scale: isActive ? 1.2 : isAccessible ? 1 : 0.9,
                            opacity: !isAccessible ? 0.6 : 1,
                          }}
                          whileHover={isAccessible ? { scale: isActive ? 1.25 : 1.1 } : {}}
                          whileTap={isAccessible ? { scale: 0.95 } : {}}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 relative ${isActive
                            ? 'bg-blue-600 ring-4 ring-blue-100'
                            : isComplete
                              ? 'bg-green-500'
                              : !isAccessible
                                ? 'bg-gray-200'
                                : 'bg-white border-2 border-gray-300 hover:border-blue-400'
                            }`}
                        >
                          <AnimatePresence mode="wait">
                            {isActive ? (
                              <motion.div
                                key="active"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-2.5 h-2.5 bg-white rounded-full"
                              />
                            ) : isComplete ? (
                              <motion.div
                                key="complete"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 180 }}
                              >
                                {/* Show Paperclip if uploaded, MinusCircle if skipped, otherwise Check */}
                                {uploadedFiles[stepNumber] ? (
                                  <Paperclip className="w-4 h-4 text-white" />
                                ) : stepModes[stepNumber] === 'skip' ? (
                                  <Ban className="w-4 h-4 text-white" />
                                ) : (
                                  <Check className="w-4 h-4 text-white" />
                                )}
                              </motion.div>
                            ) : !isAccessible ? (
                              <motion.div
                                key="locked"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <Lock className="w-3.5 h-3.5 text-gray-400" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="next"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Pulse effect for next accessible step */}
                          {isAccessible && !isComplete && !isActive && (
                            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20" />
                          )}
                        </motion.button>

                        {/* Label */}
                        <motion.span
                          animate={{
                            y: isActive ? 0 : 0,
                            opacity: isActive ? 1 : isAccessible ? 0.8 : 0.5,
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? '#2563EB' : isAccessible ? '#4B5563' : '#9CA3AF'
                          }}
                          className="text-xs whitespace-nowrap flex items-center gap-1"
                        >
                          {name}
                          {/* Show small icon next to name if mode is selected */}
                          {stepModes[stepNumber] === 'upload' && <Paperclip className="w-3 h-3" />}
                          {(stepModes[stepNumber] === 'manual' || stepNumber === 2 || stepNumber === 4) && <PenTool className="w-3 h-3" />}
                          {stepModes[stepNumber] === 'skip' && <Ban className="w-3 h-3" />}
                        </motion.span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {renderStepHeaderControls()}
          </motion.div>

          {/* Toggle Button */}
          <div className="relative z-50 flex justify-center -mt-4 transition-all duration-300">
            <button
              onClick={() => setIsStepIndicatorVisible(!isStepIndicatorVisible)}
              className="group bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-[0_4px_12px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-300"
              title={isStepIndicatorVisible ? "단계 표시줄 접기" : "단계 표시줄 펼치기"}
            >
              {isStepIndicatorVisible ? (
                <ChevronUp className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <ChevronDown className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
              )}
            </button>
          </div>

          {/* Document Editor or Empty State */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 mt-2">
            {renderStepContent()}
          </div>
        </div>

        {/* Chat Assistant - Slide in from right with resize handle */}
        <div
          className={`flex-shrink-0 border-l border-gray-100 flex flex-col overflow-hidden bg-white relative transition-all duration-300 ease-in-out shadow-2xl z-30 ${isChatOpen ? 'opacity-100' : 'w-0 opacity-0 border-0'} `}
          style={{ width: isChatOpen ? `${chatWidth}px` : '0', minWidth: isChatOpen ? '300px' : '0' }}
        >
          {/* Resize Handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group z-50 flex items-center justify-center hover:w-2 transition-all duration-200"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = chatWidth;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                const diff = startX - moveEvent.clientX;
                const newWidth = Math.min(Math.max(300, startWidth + diff), 800);
                setChatWidth(newWidth);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            {/* Handle Visual Line */}
            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent group-hover:bg-blue-400 transition-colors" />
          </div>
          <ChatAssistant
            currentStep={currentStep}
            onClose={() => setIsChatOpen(false)}
            editorRef={editorRef}
            onApply={handleChatApply}
            documentId={
              stepModes[currentStep] === 'upload'
                ? uploadedDocumentIds[currentStep]
                : getDocId?.(currentStep, activeShippingDoc) ?? null
            }
            userEmployeeId={userEmployeeId}
            getDocId={getDocId}
            activeShippingDoc={activeShippingDoc}
            documentData={documentData}
            stepModes={stepModes}
          />
        </div>
      </div>

      {/* Intro Animation */}
      {showIntro && (
        <ShootingStarIntro
          onComplete={() => {
            setShowIntro(false);
            setHasShownIntro(true);
          }}
          targetRect={chatButtonRef.current?.getBoundingClientRect()}
        />
      )}

      {/* Floating Chat Button */}
      {shouldShowChatButton && (hasShownIntro || showIntro) && (
        <button
          ref={chatButtonRef}
          onClick={() => {
            setIsChatOpen(!isChatOpen);
            setShowIntro(false);
            setHasShownIntro(true);
          }}
          className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform transition-colors duration-200 hover:scale-110 z-40 ${!hasShownIntro ? 'opacity-0' : ''}`}
          title="AI 챗봇 열기"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {/* Modals */}
      <MyPageModal
        isOpen={showMyPageModal && !showPasswordChange}
        userEmployeeId={userEmployeeId}
        userName={currentUser?.name}
        onClose={() => setShowMyPageModal(false)}
        onPasswordChange={() => setShowPasswordChange(true)}
        onLogout={() => setShowLogoutConfirm(true)}
      />

      <PasswordChangeModal
        isOpen={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        empNo={userEmployeeId}
      />

      <ExitConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onExit={() => {
          setShowExitConfirm(false);
          handleExit();
        }}
      />

      <SaveSuccessModal
        isOpen={showSaveSuccessModal}
        documentData={documentData}
        modifiedSteps={modifiedSteps}
        onClose={() => setShowSaveSuccessModal(false)}
      />

      <DownloadModal
        isOpen={showDownloadModal}
        documentData={documentData}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleBatchDownload}
      />

      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onLogout={onLogout}
      />
    </div>
  );
}
