// EditorView.tsx - 에디터 뷰 (직접 작성 모드)
import { useState, RefObject } from 'react';
import { ArrowLeft, Eye, EyeOff, Sparkles, FileText, Package } from 'lucide-react';
import ContractEditor, { ContractEditorRef } from '../../editor/ContractEditor';
import type { DocumentData, StepMode, ShippingDocType } from '../types';

interface EditorViewProps {
  currentStep: number;
  stepModes: Record<number, StepMode>;
  activeShippingDoc: ShippingDocType | null;
  editorRef: RefObject<ContractEditorRef | null>;
  initialContent: string;
  onBack: () => void;
  onShippingDocChange: (doc: ShippingDocType) => void;
  onChange: (content: string) => void;
  onRowAdded?: (fieldIds: string[]) => void;
  onRowDeleted?: (fieldIds: string[]) => void;
  onUpdate?: () => void;
}

export default function EditorView({
  currentStep,
  stepModes,
  activeShippingDoc,
  editorRef,
  initialContent,
  onBack,
  onShippingDocChange,
  onChange,
  onRowAdded,
  onRowDeleted,
  onUpdate,
  showFieldHighlight,
  showAgentHighlight
}: EditorViewProps & {
  showFieldHighlight: boolean;
  showAgentHighlight: boolean;
}) {
  const defaultFontFamily = currentStep === 2 ? 'Times New Roman' : 'Arial';
  const defaultFontSize = '16px';

  return (
    <div className="flex flex-col h-full">
      <ContractEditor
        key={`${currentStep}-${activeShippingDoc || 'default'}`}
        ref={editorRef as RefObject<ContractEditorRef>}
        className="flex-1 min-h-0"
        initialContent={initialContent}
        onChange={onChange}
        onUpdate={onUpdate}
        onRowAdded={onRowAdded}
        onRowDeleted={onRowDeleted}
        showFieldHighlight={showFieldHighlight}
        showAgentHighlight={showAgentHighlight}
        defaultFontFamily={defaultFontFamily}
        defaultFontSize={defaultFontSize}
      />
    </div>
  );
}
