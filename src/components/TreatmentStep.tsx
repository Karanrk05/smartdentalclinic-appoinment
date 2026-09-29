import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Check, ArrowRight, ArrowLeft, Building2, User, Stethoscope, Clock, Zap } from 'lucide-react';
import { Treatment, ClinicBranch, Doctor } from '../types';
import { getServicesForDentist } from '../data/branchHierarchy';

interface TreatmentStepProps {
  selectedBranch: ClinicBranch | null;
  selectedDoctor: Doctor | null;
  selectedTreatment: Treatment | null;
  onSelectTreatment: (treatment: Treatment) => void;
  onBack: () => void;
  onNext: () => void;
  onChangeBranch?: () => void;
  onChangeDoctor?: () => void;
  refreshTrigger?: number;
  autoAdvanceEnabled?: boolean;
}

export const TreatmentStep: React.FC<TreatmentStepProps> = ({
  selectedBranch,
  selectedDoctor,
  selectedTreatment,
  onSelectTreatment,
  onBack,
  onNext,
  onChangeBranch,
  onChangeDoctor,
  refreshTrigger,
  autoAdvanceEnabled = true,
}) => {
  const branchId = selectedBranch?.id || 'branch-1';
  const doctorId = selectedDoctor?.id || 'doc1';

  const [treatmentsList, setTreatmentsList] = useState<Treatment[]>(() =>
    getServicesForDentist(branchId, doctorId)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [advancingTreatmentId, setAdvancingTreatmentId] = useState<string | null>(null);

  useEffect(() => {
    const loadTreatments = () => {
      setIsLoading(true);
      fetch(`/api/branches/${branchId}/dentists/${doctorId}/treatments`)
        .then((res) => {
          if (!res.ok) {
            return fetch(`/api/treatments?branchId=${branchId}&doctorId=${doctorId}`).then((r) => r.json());
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
            setTreatmentsList(data.data);
          } else {
            setTreatmentsList(getServicesForDentist(branchId, doctorId));
          }
        })
        .catch((err) => {
          console.warn(`Fallback to local branch hierarchy services for ${branchId}/${doctorId}:`, err);
          setTreatmentsList(getServicesForDentist(branchId, doctorId));
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    loadTreatments();

    const handleAdminEvent = () => loadTreatments();
    window.addEventListener('sdc_admin_data_updated', handleAdminEvent);
    return () => {
      window.removeEventListener('sdc_admin_data_updated', handleAdminEvent);
    };
  }, [branchId, doctorId, refreshTrigger]);

  const filteredTreatments = useMemo(() => {
    if (!searchQuery.trim()) return treatmentsList;
    const q = searchQuery.toLowerCase();
    return treatmentsList.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        (t.cat && t.cat.toLowerCase().includes(q))
    );
  }, [treatmentsList, searchQuery]);

  const handleCardClick = (treatment: Treatment) => {
    setAdvancingTreatmentId(treatment.id);
    onSelectTreatment(treatment);
  };

  return (
    <div className="space-y-6">
      {/* Context Path Banner (Branch + Doctor with quick Change actions) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border-1.5 border-[#bfdbfe] rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
          {/* Branch summary */}
          <div className="flex items-center justify-between pr-0 sm:pr-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                  Location
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  {selectedBranch?.name || 'Downtown Clinic'}
                </div>
              </div>
            </div>

            {onChangeBranch && (
              <button
                type="button"
                onClick={onChangeBranch}
                className="text-[11px] font-extrabold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer shrink-0 ml-2"
              >
                Change
              </button>
            )}
          </div>

          {/* Doctor summary */}
          <div className="flex items-center justify-between sm:pl-3 pt-2 sm:pt-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 border border-blue-200"
                style={{ backgroundColor: selectedDoctor?.avatarBg || '#dbeafe' }}
              >
                {selectedDoctor?.avatarIcon || '👨‍⚕️'}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                  Dentist
                </div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  {selectedDoctor?.name || 'Assigned Doctor'}
                </div>
              </div>
            </div>

            {onChangeDoctor && (
              <button
                type="button"
                onClick={onChangeDoctor}
                className="text-[11px] font-extrabold text-blue-700 bg-white border border-blue-200 px-2.5 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer shrink-0 ml-2"
              >
                Change
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header section */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
              3
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
              Select Dental Service
            </h2>
          </div>
          <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full border border-[#bfdbfe]">
            {treatmentsList.length} Services by {selectedDoctor?.name?.split(' ')[1] || 'Doctor'}
          </span>
        </div>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Procedures available with <span className="font-bold text-slate-800">{selectedDoctor?.name}</span> at the <span className="font-bold text-slate-800">{selectedBranch?.shortName}</span> clinic.
        </p>

        {autoAdvanceEnabled && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50/90 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            <span>Click any service to automatically continue to schedule & slot selection.</span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748b]">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="treatment-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${treatmentsList.length} procedures, cleaning, implants, braces…`}
          className="w-full pl-10 pr-10 py-3 bg-[#f8fafc] border-2 border-[#e2e8f0] focus:border-[#2563eb] focus:bg-white rounded-xl text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748b] hover:text-[#0f172a] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Treatments List */}
      {filteredTreatments.length > 0 ? (
        <div className="space-y-3">
          {filteredTreatments.map((treatment) => {
            const isSelected = selectedTreatment?.id === treatment.id;
            const isAdvancing = advancingTreatmentId === treatment.id;

            return (
              <div
                key={treatment.id}
                id={`treatment-row-${treatment.id}`}
                role="button"
                tabIndex={0}
                onClick={() => handleCardClick(treatment)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(treatment);
                  }
                }}
                className={`relative flex items-center gap-3 sm:gap-3.5 border-2 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-all duration-150 select-none ${
                  isSelected
                    ? 'border-[#2563eb] bg-[#eff6ff] ring-3 ring-[#2563eb]/20 shadow-xs'
                    : 'border-[#e2e8f0] bg-white hover:border-[#60a5fa] hover:bg-[#f8fafc] active:scale-[0.99] shadow-2xs'
                }`}
              >
                {/* Selection Check Badge */}
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                <div className="text-2xl sm:text-3xl w-10 text-center shrink-0" aria-hidden="true">
                  {treatment.icon}
                </div>

                <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                  <div className="text-sm sm:text-base font-extrabold text-[#0f172a] leading-snug">
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
                    {isAdvancing && (
                      <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-0.5 animate-pulse">
                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-400" /> Advancing…
                      </span>
                    )}
                  </div>
                </div>

                {/* Desktop price, duration & advancing badge */}
                <div className="hidden sm:flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 shrink-0 text-right">
                  {isAdvancing ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md animate-pulse border border-emerald-200">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-400" />
                      Auto-advancing…
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-[#64748b] whitespace-nowrap">
                        ⏱ {treatment.dur}
                      </span>
                      <span className="text-sm font-extrabold text-[#2563eb] whitespace-nowrap">
                        {treatment.price}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-[#f8fafc] border-2 border-dashed border-[#dbeafe] rounded-2xl">
          <p className="text-base font-bold text-[#0f172a]">No treatments match your search</p>
          <p className="text-xs text-[#64748b] mt-1">
            Try searching for "checkup", "cleaning", or clear your search term.
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

      {/* Button Row */}
      <div className="pt-4 border-t border-[#dbeafe] flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 py-3.5 px-4 sm:px-5 rounded-xl font-bold text-sm text-[#64748b] border-2 border-[#e2e8f0] bg-white hover:border-[#2563eb] hover:text-[#2563eb] active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Doctor</span>
        </button>

        <button
          id="btn-goto-schedule"
          type="button"
          disabled={!selectedTreatment}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Continue to Schedule</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
