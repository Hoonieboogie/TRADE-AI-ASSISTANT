// useSharedData.ts - 공유 데이터 상태 관리 훅
import { useState, useCallback } from 'react';

interface UseSharedDataReturn {
  sharedData: Record<string, string>;
  setSharedData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hydrateTemplate: (template: string) => string;
  extractData: (content: string) => void;
  updateContentWithSharedData: (content: string) => string;
  syncFieldsInDocument: (content: string) => string;
}

export function useSharedData(): UseSharedDataReturn {
  const [sharedData, setSharedData] = useState<Record<string, string>>({});

  // 템플릿에 공유 데이터 적용
  const hydrateTemplate = useCallback((template: string): string => {
    if (!template) return '';

    // Replace <mark>[key]</mark> with <span data-field-id="key">...</span>
    return template.replace(/<mark>\[(.*?)\]<\/mark>/g, (_match, key) => {
      const value = sharedData[key];
      // If we have a value, use it. Otherwise keep the placeholder [key]
      const content = value || `[${key}]`;
      // If we have a value, it's mapped data.
      const sourceAttr = value ? ' data-source="mapped"' : '';

      // [ADDED] Default disabled state for conditional fields (starting with 'days_')
      const disabledAttr = key.startsWith('days_') ? ' data-disabled="true"' : '';

      return `<span data-field-id="${key}"${sourceAttr}${disabledAttr}>${content}</span>`;
    });
  }, [sharedData]);

  // 컨텐츠에서 데이터 추출
  const extractData = useCallback((content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const fields = doc.querySelectorAll('span[data-field-id]');

    const newData: Record<string, string> = {};
    const foundKeys = new Set<string>();

    fields.forEach(field => {
      const key = field.getAttribute('data-field-id');
      const value = field.textContent;
      const source = field.getAttribute('data-source');

      if (key) {
        foundKeys.add(key);
        // Only save if it's not the placeholder itself AND not auto-filled by system
        // Use first non-placeholder value (don't overwrite if already set)
        if (value && value !== `[${key}]` && source !== 'auto') {
          if (!newData[key]) {
            newData[key] = value;
          }
        }
      }
    });

    // If a key exists in the document but has no value in newData (meaning it's a placeholder),
    // explicitly set it to empty string to clear any previous value in sharedData
    foundKeys.forEach(key => {
      if (!newData[key]) {
        newData[key] = '';
      }
    });

    if (Object.keys(newData).length > 0) {
      setSharedData(prev => ({ ...prev, ...newData }));
    }
  }, []);

  // 기존 컨텐츠를 최신 공유 데이터로 업데이트
  const updateContentWithSharedData = useCallback((content: string): string => {
    if (!content) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const fields = doc.querySelectorAll('span[data-field-id]');

    let modified = false;
    fields.forEach(field => {
      const key = field.getAttribute('data-field-id');
      if (key && sharedData[key]) {
        // If the field content is different from sharedData (and sharedData is not empty), update it
        // Also update if the field is currently a placeholder
        if (field.textContent !== sharedData[key]) {
          field.textContent = sharedData[key];
          // Mark as mapped since it's coming from shared data
          field.setAttribute('data-source', 'mapped');
          modified = true;
        }
      }
    });

    return modified ? doc.body.innerHTML : content;
  }, [sharedData]);

  // 동일 문서 내 같은 fieldId 동기화
  const syncFieldsInDocument = useCallback((content: string): string => {
    if (!content) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const fields = doc.querySelectorAll('span[data-field-id]');

    // 1. Collect first non-placeholder value for each fieldId
    const fieldValues: Record<string, string> = {};
    fields.forEach(field => {
      const key = field.getAttribute('data-field-id');
      const value = field.textContent;
      if (key && value && value !== `[${key}]`) {
        // Only store the first non-placeholder value
        if (!fieldValues[key]) {
          fieldValues[key] = value;
        }
      }
    });

    // 2. Apply the collected values to all fields with same fieldId
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
  }, []);

  return {
    sharedData,
    setSharedData,
    hydrateTemplate,
    extractData,
    updateContentWithSharedData,
    syncFieldsInDocument,
  };
}
