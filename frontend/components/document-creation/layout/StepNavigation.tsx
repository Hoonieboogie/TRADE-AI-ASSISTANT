import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Plus, Paperclip, MinusCircle, PenTool, Ban } from 'lucide-react';
import { STEP_SHORT_NAMES, StepMode } from '../types';

interface StepNavigationProps {
  currentStep: number;
  maxProgressStep: number;
  stepModes: Record<number, StepMode>;
  uploadedFiles: Record<number, File | null>;
  getStepCompletionStatus: (stepNumber: number) => boolean;
  onStepChange: (step: number) => void;
}

export default function StepNavigation({
  currentStep,
  maxProgressStep,
  stepModes,
  uploadedFiles,
  getStepCompletionStatus,
  onStepChange
}: StepNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative z-20 flex flex-col items-center mb-4">
      {/* Navigation Container */}
      <motion.div
        initial={false}
        animate={{
          height: isCollapsed ? 0 : 'auto',
          opacity: isCollapsed ? 0 : 1,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full bg-white/80 backdrop-blur-md shadow-sm overflow-visible"
      >
        <div className="max-w-6xl mx-auto px-8 py-4 relative">
          {/* Progress Line Background */}
          <div
            className="absolute top-[32px] h-1 bg-gray-200 rounded-full overflow-hidden"
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
              const isComplete = getStepCompletionStatus(stepNumber);

              // Check accessibility
              let isAccessible = true;
              if (stepNumber > 1) {
                const prevStepComplete = getStepCompletionStatus(stepNumber - 1);
                // [FIX] Allow access if previous step is complete OR if we've already reached this step (maxProgressStep)
                isAccessible = prevStepComplete || stepNumber <= maxProgressStep;
              }

              return (
                <div key={index} className="flex flex-col items-center gap-2 relative group z-10">
                  <motion.button
                    onClick={() => isAccessible && onStepChange(stepNumber)}
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
                          {uploadedFiles[stepNumber] ? (
                            <Paperclip className="w-4 h-4 text-white" />
                          ) : stepModes[stepNumber] === 'skip' ? (
                            <MinusCircle className="w-4 h-4 text-white" />
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
                    {stepModes[stepNumber] === 'upload' && <Paperclip className="w-3 h-3" />}
                    {(stepModes[stepNumber] === 'manual' || stepNumber === 2 || stepNumber === 4) && <PenTool className="w-3 h-3" />}
                    {stepModes[stepNumber] === 'skip' && <Ban className="w-3 h-3" />}
                  </motion.span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Border line with toggle button */}
      <div className="w-full relative">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* Premium Toggle Button */}
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 group"
          title={isCollapsed ? "단계 표시 보이기" : "단계 표시 숨기기"}
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300" />

          {/* Button Container */}
          <div className="relative w-10 h-10 bg-gradient-to-br from-white to-gray-50 rounded-full shadow-lg border border-gray-200/50 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
            {/* Inner Gradient Ring */}
            <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Icon */}
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative z-10"
            >
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </motion.div>

            {/* Pulse Ring on Hover */}
            <span className="absolute inset-0 rounded-full border-2 border-blue-400 opacity-0 group-hover:opacity-100 animate-ping" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
