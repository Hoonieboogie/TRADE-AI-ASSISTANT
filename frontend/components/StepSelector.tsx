import { Check } from 'lucide-react';

interface StepSelectorProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

const steps = [
  { id: 1, name: 'Offer Sheet', short: 'Offer' },
  { id: 2, name: 'Proforma Invoice', short: 'PI' },
  { id: 3, name: 'Sales Contract', short: 'SC' },
  { id: 4, name: 'Commercial Invoice', short: 'CI' },
  { id: 5, name: 'Packing List', short: 'PL' },
  { id: 6, name: 'Bill of Lading', short: 'BL' },
  { id: 7, name: 'Letter of Credit', short: 'LC' }
];

export default function StepSelector({ currentStep, setCurrentStep }: StepSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4">
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isUpcoming = step.id > currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className="flex flex-col items-center group"
            >
              <div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                  ${isUpcoming ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span className="font-bold">{step.id}</span>
                )}
              </div>
              <span
                className={`text-sm font-medium ${
                  isCurrent ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {step.short}
              </span>
            </button>

            {index < steps.length - 1 && (
              <div
                className={`w-8 h-1 mx-2 mt-[-20px] transition-colors ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`}
              ></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
