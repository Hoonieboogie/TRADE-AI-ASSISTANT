// useDocumentState.ts - 문서 상태 관리 훅
import { useState, useCallback } from 'react';
import type { StepMode, ShippingDocType } from '../types';
import { DocumentData } from '../../../App';

interface UseDocumentStateReturn {
  // Step modes (manual/upload/skip)
  stepModes: Record<number, StepMode>;
  setStepModes: React.Dispatch<React.SetStateAction<Record<number, StepMode>>>;

  // Modified steps tracking
  modifiedSteps: Set<number>;
  markStepModified: (step: number) => void;

  // Dirty state
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;

  // Shipping docs
  activeShippingDoc: ShippingDocType | null;
  setActiveShippingDoc: React.Dispatch<React.SetStateAction<ShippingDocType | null>>;
  shippingOrder: ShippingDocType[] | null;
  setShippingOrder: React.Dispatch<React.SetStateAction<ShippingDocType[] | null>>;

  // Helpers
  getDocKeyForStep: (step: number) => number;
}

export function useDocumentState(
  initialDocumentData: DocumentData,
  initialActiveShippingDoc?: ShippingDocType | null
): UseDocumentStateReturn {
  // Track which steps have been actually modified or already existed
  const [modifiedSteps, setModifiedSteps] = useState<Set<number>>(() => {
    const initialSteps = Object.keys(initialDocumentData)
      .filter(k => k !== 'title')
      .map(Number);
    return new Set(initialSteps);
  });

  const [stepModes, setStepModes] = useState<Record<number, StepMode>>(() => {
    if (initialDocumentData.stepModes) {
      return initialDocumentData.stepModes as Record<number, StepMode>;
    }
    return {};
  });
  const [isDirty, setIsDirty] = useState(false);
  const [shippingOrder, setShippingOrder] = useState<ShippingDocType[] | null>(null);
  const [activeShippingDoc, setActiveShippingDoc] = useState<ShippingDocType | null>(
    initialActiveShippingDoc || null
  );

  const markStepModified = useCallback((step: number) => {
    setModifiedSteps(prev => {
      const newSet = new Set(prev);
      newSet.add(step);
      return newSet;
    });
  }, []);

  // Helper to map visual step number to document data key
  // Step 1 -> 1 (Offer)
  // Step 2 -> 2 (PI)
  // Step 3 -> 3 (Contract)
  // Step 4 -> 4 (CI) or 5 (PL) based on activeShippingDoc
  const getDocKeyForStep = useCallback((step: number): number => {
    if (step <= 3) return step;
    if (step === 4) {
      if (activeShippingDoc === 'CI') return 4;
      if (activeShippingDoc === 'PL') return 5;
      return -1; // Dashboard mode
    }
    return -1;
  }, [activeShippingDoc]);

  return {
    stepModes,
    setStepModes,
    modifiedSteps,
    markStepModified,
    isDirty,
    setIsDirty,
    activeShippingDoc,
    setActiveShippingDoc,
    shippingOrder,
    setShippingOrder,
    getDocKeyForStep,
  };
}
