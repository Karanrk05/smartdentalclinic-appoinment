import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Treatment, ClinicBranch } from '../types';
import { GENERAL_TREATMENTS } from '../data/treatments';
import { BranchSelector } from './BranchSelector';

interface TreatmentStepProps {
  selectedTreatment: Treatment | null;
  onSelectTreatment: (treatment: Treatment) => void;
  onNext: () => void;
  refreshTrigger?: number;
  selectedBranch?: ClinicBranch | null;
  onSelectBranch?: (branch: ClinicBranch) => void;
}

export const TreatmentStep: React.FC<TreatmentStepProps> = ({
  selectedTreatment,
  onSelectTreatment,
  onNext,
  refreshTrigger,
  selectedBranch = null,
  onSelectBranch,
}) => {
  const [treatmentsList, setTreatmentsList] = useState<Treatment[]>(GENERAL_TREATMENTS);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/treatments')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setTreatmentsList(data.data);
        }
      })
      .catch((err) => {
        console.warn('Using local treatments fallback:', err);
      });
  }, [refreshTrigger]);

  const filteredTreatments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return treatmentsList;
    return treatmentsList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.price.toLowerCase().includes(q)
    );
  }, [searchQuery, treatmentsList]);

  return (
    <div className="space-y-6">
      {/* Clinic Branch Selector */}
      {onSelectBranch && (
        <BranchSelector
          selectedBranch={selectedBranch}
          onSelectBranch={onSelectBranch}
          refreshTrigger={refreshTrigger}
        />
      )}

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
            General Dentistry Treatments
          </h2>
          <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full border border-[#bfdbfe]">
            {treatmentsList.length} Available Services
          </span>
        </div>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Select a general dental procedure with standard, transparent fees
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
        <input
          id="treat-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search treatments… e.g. checkup, cleaning, x-ray"
          className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-10 py-3 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a] transition-colors p-1"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Treatments List */}
      {filteredTreatments.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredTreatments.map((treatment) => {
            const isSelected = selectedTreatment?.id === treatment.id;

            return (
              <div
                key={treatment.id}
                id={`treatment-row-${treatment.id}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTreatment(treatment)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTreatment(treatment);
                  }
                }}
                className={`relative flex items-center gap-3 sm:gap-3.5 border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-150 select-none ${
                  isSelected
                    ? 'border-[#2563eb] bg-[#eff6ff] ring-2 ring-[#2563eb]/20 shadow-xs'
                    : 'border-[#e2e8f0] bg-white hover:border-[#60a5fa] hover:bg-[#f8fafc] active:scale-[0.99]'
                }`}
              >
                {/* Selection Check Badge */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div className="text-2xl sm:text-3xl w-9 sm:w-10 text-center shrink-0" aria-hidden="true">
                  {treatment.icon}
                </div>

                <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                  <div className="text-sm sm:text-base font-bold text-[#0f172a] leading-snug">
                    {treatment.name}
                  </div>
                  <div className="text-xs text-[#64748b] font-medium line-clamp-1 sm:line-clamp-2 mt-0.5">
                    {treatment.desc}
                  </div>
                  {/* Mobile-only duration and price sub-row */}
                  <div className="flex items-center gap-2 mt-1 sm:hidden">
                    <span className="text-[11px] font-bold text-[#64748b]">
                      ⏱ {treatment.dur}
                    </span>
                    <span className="text-xs font-black text-[#2563eb]">
                      {treatment.price}
                    </span>
                  </div>
                </div>

                {/* Desktop price and duration */}
                <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 shrink-0 text-right">
                  <span className="text-xs font-bold text-[#64748b] whitespace-nowrap">
                    ⏱ {treatment.dur}
                  </span>
                  <span className="text-sm font-extrabold text-[#2563eb] whitespace-nowrap">
                    {treatment.price}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-[#f8fafc] border-2 border-dashed border-[#dbeafe] rounded-xl">
          <p className="text-base font-bold text-[#0f172a]">No general treatments match your search</p>
          <p className="text-xs text-[#64748b] mt-1">
            Try searching for "checkup", "cleaning", or "x-ray"
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-3.5 px-4 py-1.5 text-xs font-bold bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-4 border-t border-[#dbeafe]">
        <button
          id="btn-goto-dentist"
          type="button"
          disabled={!selectedTreatment}
          onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer"
        >
          <span>Choose a dentist</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
