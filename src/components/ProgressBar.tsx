import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export interface ProgressBarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  autoAdvanceEnabled?: boolean;
  onToggleAutoAdvance?: (enabled: boolean) => void;
  isAutoAdvancing?: boolean;
}

const STEPS = [
  { step: 1, label: 'Branch' },
  { step: 2, label: 'Dentist' },
  { step: 3, label: 'Service' },
  { step: 4, label: 'Schedule' },
  { step: 5, label: 'Details' },
  { step: 6, label: 'Confirm' },
];

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  onStepClick,
  isAutoAdvancing = false,
}) => {
  const currentStepObj = STEPS.find((s) => s.step === currentStep) || STEPS[0];

  return (
    <div className="sticky top-14 sm:top-16 z-40 bg-white/95 backdrop-blur-md border-b border-[#dbeafe] py-2.5 sm:py-3 shadow-xs select-none">
      <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 space-y-2">
        {/* Step Indicator Circles Row */}
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const isDone = currentStep > s.step;
            const isActive = currentStep === s.step;
            const canClick = isDone && Boolean(onStepClick);

            const content = (
              <>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-200 ${
                    isDone
                      ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs group-hover:bg-emerald-700 group-hover:scale-105'
                      : isActive
                      ? 'bg-[#2563eb] text-white border-2 border-[#2563eb] ring-4 ring-blue-100 shadow-xs'
                      : 'bg-white text-slate-400 border-2 border-slate-200'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                </div>
                <span
                  className={`hidden sm:inline text-xs sm:text-sm font-extrabold tracking-tight transition-colors ${
                    isDone
                      ? 'text-emerald-700 group-hover:text-emerald-800'
                      : isActive
                      ? 'text-[#2563eb]'
                      : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </>
            );

            return (
              <React.Fragment key={s.step}>
                {canClick ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(s.step)}
                    className="flex items-center gap-1.5 sm:gap-2 shrink-0 group cursor-pointer focus:outline-none"
                    title={`Go back to ${s.label}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {content}
                  </div>
                )}

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1.5 sm:mx-2.5 transition-colors duration-300 rounded-full ${
                      currentStep > s.step ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Sub-bar: Active Step & Subtle Auto-Advancing Pulse */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-0.5 px-0.5 flex-wrap gap-2">
          {/* Active step name and advancing banner */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isAutoAdvancing ? 'bg-amber-500 animate-ping' : 'bg-blue-600 animate-pulse'}`}></span>
              <span className="text-slate-700 font-bold">Step {currentStep} of {STEPS.length}:</span>
              <span className="text-blue-600 font-extrabold uppercase tracking-wide">{currentStepObj.label}</span>
            </span>

            {isAutoAdvancing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-600 animate-spin" />
                <span>Auto-advancing to next page…</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
