// documentUtils.ts - 문서 관련 유틸리티 함수들
import type { ShippingDocType } from '../components/document-creation/types';

/**
 * 템플릿의 <mark>[key]</mark> 패턴을 <span data-field-id="key">...</span>로 변환
 * @param template - HTML 템플릿 문자열
 * @param sharedData - 공유 데이터 객체
 */
export function hydrateTemplate(
  template: string,
  sharedData: Record<string, string>
): string {
  if (!template) return '';

  return template.replace(/<mark>\[(.*?)\]<\/mark>/g, (_match, key) => {
    const value = sharedData[key];
    const content = value || `[${key}]`;
    const sourceAttr = value ? ' data-source="mapped"' : '';
    return `<span data-field-id="${key}"${sourceAttr}>${content}</span>`;
  });
}

/**
 * HTML 콘텐츠에서 data-field-id 필드들의 값을 추출
 * @param content - HTML 콘텐츠 문자열
 * @returns 추출된 데이터 객체
 */
export function extractDataFromContent(content: string): Record<string, string> {
  if (!content) return {};

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const fields = doc.querySelectorAll('span[data-field-id]');

  const newData: Record<string, string> = {};
  fields.forEach(field => {
    const key = field.getAttribute('data-field-id');
    const value = field.textContent;

    // placeholder가 아닌 첫 번째 값만 저장
    if (key && value && value !== `[${key}]`) {
      if (!newData[key]) {
        newData[key] = value;
      }
    }
  });

  return newData;
}

/**
 * 콘텐츠의 필드들을 sharedData로 업데이트
 * @param content - HTML 콘텐츠 문자열
 * @param sharedData - 공유 데이터 객체
 * @returns 업데이트된 콘텐츠 (변경 없으면 원본 반환)
 */
export function updateContentWithSharedData(
  content: string,
  sharedData: Record<string, string>
): string {
  if (!content) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const fields = doc.querySelectorAll('span[data-field-id]');

  let modified = false;
  fields.forEach(field => {
    const key = field.getAttribute('data-field-id');
    if (key && sharedData[key]) {
      if (field.textContent !== sharedData[key]) {
        field.textContent = sharedData[key];
        field.setAttribute('data-source', 'mapped');
        modified = true;
      }
    }
  });

  return modified ? doc.body.innerHTML : content;
}

/**
 * 문서 내 동일한 fieldId 필드들을 동기화 (첫 번째 값으로)
 * @param content - HTML 콘텐츠 문자열
 * @returns 동기화된 콘텐츠
 */
export function syncFieldsInDocument(content: string): string {
  if (!content) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const fields = doc.querySelectorAll('span[data-field-id]');

  // 1. 각 fieldId별 첫 번째 비-placeholder 값 수집
  const fieldValues: Record<string, string> = {};
  fields.forEach(field => {
    const key = field.getAttribute('data-field-id');
    const value = field.textContent;
    if (key && value && value !== `[${key}]`) {
      if (!fieldValues[key]) {
        fieldValues[key] = value;
      }
    }
  });

  // 2. 수집된 값을 모든 동일 fieldId에 적용
  let modified = false;
  fields.forEach(field => {
    const key = field.getAttribute('data-field-id');
    if (key && fieldValues[key]) {
      if (field.textContent !== fieldValues[key]) {
        field.textContent = fieldValues[key];
        modified = true;
      }
    }
  });

  return modified ? doc.body.innerHTML : content;
}

/**
 * 단계 완료 여부 확인 (모든 placeholder가 채워졌는지)
 * @param content - HTML 콘텐츠 문자열
 * @returns 완료 여부
 */
export function checkStepCompletion(content: string): boolean {
  if (!content) return false;

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const fields = doc.querySelectorAll('span[data-field-id]');

  // [ADDED] Validate Radio/Checkbox Groups
  // Ensure at least one option is selected for each group
  const groupElements = doc.querySelectorAll('[data-group]');
  const groups = new Set<string>();
  groupElements.forEach(el => {
    const group = el.getAttribute('data-group');
    if (group) groups.add(group);
  });

  // [ADDED] Conditional Validation Logic for Payment Fields
  // 1. Collect all linked fields in the 'payment' group
  const paymentRadios = doc.querySelectorAll('[data-group="payment"]');
  const allLinkedFields = new Set<string>();
  let selectedLinkedField: string | null = null;
  let isPaymentSelected = false;

  paymentRadios.forEach(radio => {
    const linkedField = radio.getAttribute('data-linked-field');
    if (linkedField) allLinkedFields.add(linkedField);

    const isChecked = radio.classList.contains('checked') || radio.getAttribute('data-checked') === 'true';
    if (isChecked) {
      isPaymentSelected = true;
      if (linkedField) selectedLinkedField = linkedField;
    }
  });

  for (const group of groups) {
    const options = doc.querySelectorAll(`[data-group="${group}"]`);
    let hasSelection = false;
    for (const option of options) {
      if (option.getAttribute('data-checked') === 'true') {
        hasSelection = true;
        break;
      }
    }
    if (!hasSelection) return false;
  }

  // placeholder가 남아있는 필드가 있으면 미완료
  for (const field of fields) {
    const key = field.getAttribute('data-field-id');
    const value = field.textContent;

    // [CHANGED] Skip validation for optional fields (including dynamic IDs like notice_2)
    if (key && key.startsWith('notice')) continue;

    // [ADDED] Skip validation for disabled fields
    if (field.getAttribute('data-disabled') === 'true') continue;

    // [ADDED] Conditional Skip for Payment Fields
    // If this field is one of the linked fields (e.g. days_dpc), but NOT the one selected, skip it.
    if (key && allLinkedFields.has(key)) {
      // If no payment is selected, or the selected payment doesn't require this specific field, skip it.
      if (key !== selectedLinkedField) continue;
    }

    if (key && value === `[${key}]`) {
      return false;
    }
  }

  return true;
}

/**
 * 현재 스텝에서 문서 데이터 키를 반환
 * @param step - 현재 스텝 (1-4)
 * @param activeShippingDoc - 활성 선적 문서 ('CI' | 'PL' | null)
 * @returns 문서 데이터 키 (1-5) 또는 -1
 */
export function getDocKeyForStep(
  step: number,
  activeShippingDoc: ShippingDocType | null
): number {
  if (step <= 3) return step;
  if (step === 4) {
    if (activeShippingDoc === 'CI') return 4;
    if (activeShippingDoc === 'PL') return 5;
    return -1; // Dashboard mode
  }
  return -1;
}
