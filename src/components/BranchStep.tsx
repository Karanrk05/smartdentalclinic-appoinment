import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Building2, Check, ArrowRight, Zap, Users, Stethoscope } from 'lucide-react';
import { ClinicBranch, DEFAULT_BRANCHES } from '../types';
import { BRANCH_HIERARCHY } from '../data/branchHierarchy';

interface BranchStepProps {
  selectedBranch: ClinicBranch | null;
  onSelectBranch: (branch: ClinicBranch, autoAdvance?: boolean) => void;
  onNext: () => void;
  refreshTrigger?: number;
  autoAdvanceEnabled?: boolean;
}

export const BranchStep: React.FC<BranchStepProps> = ({
  selectedBranch,
  onSelectBranch,
  onNext,
  refreshTrigger,
  autoAdvanceEnabled = true,
}) => {
  const [branches, setBranches] = useState<ClinicBranch[]>(() =>
    BRANCH_HIERARCHY.map((item) => item.branch)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [advancingBranchId, setAdvancingBranchId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/branches')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          const active = data.data.filter((b: ClinicBranch) => b.isActive !== false);
          setBranches(active);

          // If no branch is currently chosen, default to main without auto-advancing
          if (!selectedBranch) {
            const main = active.find((b: ClinicBranch) => b.isMain) || active[0];
            if (main) onSelectBranch(main, false);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not load branches from API, using default hierarchy:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [refreshTrigger]);

  const handleCardClick = (branch: ClinicBranch) => {
    setAdvancingBranchId(branch.id);
    onSelectBranch(branch, true);
  };

  const activeBranchId = selectedBranch?.id || branches.find((b) => b.isMain)?.id || branches[0]?.id;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
              1
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
              Select Clinic Location
            </h2>
          </div>
          <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full border border-[#bfdbfe]">
            {branches.length} Locations Available
          </span>
        </div>
        <p className="text-sm text-[#64748b] font-medium mt-1.5 leading-relaxed">
          Choose the clinic branch most convenient for you. Dentists and treatments will automatically adapt to this specific location.
        </p>

        {autoAdvanceEnabled && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50/90 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            <span>Click any location card to automatically continue to dentist selection.</span>
          </div>
        )}
      </div>

      {/* Branch cards list */}
      <div className="grid grid-cols-1 gap-4">
        {branches.map((branch) => {
          const isSelected = activeBranchId === branch.id;
          const isCurrentlyAdvancing = advancingBranchId === branch.id;
          const hierarchyItem = BRANCH_HIERARCHY.find((h) => h.branch.id === branch.id);
          const dentistCount = branch.dentistsCount || hierarchyItem?.dentists.length || 2;
          const serviceCount = branch.servicesCount || hierarchyItem?.branch.servicesCount || 8;
          const dentistNames = hierarchyItem
            ? hierarchyItem.dentists.map((d) => d.name).join(', ')
            : 'Certified Dentists';

          return (
            <div
              key={branch.id}
              id={`branch-card-${branch.id}`}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(branch)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(branch);
                }
              }}
              className={`relative border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? 'border-[#2563eb] bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white ring-3 ring-blue-500/15 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 shadow-2xs'
              }`}
            >
              {/* Main Badge & Selected Checkmark */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                      branch.isMain
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Building2 className="w-3 h-3" />
                    {branch.isMain ? 'Main Flagship Clinic' : 'Branch Studio'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    <Users className="w-3 h-3" />
                    {dentistCount} Dentists
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Stethoscope className="w-3 h-3" />
                    {serviceCount} Treatments
                  </span>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-xs shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Branch Title & Landmark */}
              <div className="mb-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {branch.name}
                </h3>
                {branch.landmark && (
                  <p className="text-xs text-blue-600 font-bold mt-0.5">
                    Landmark: {branch.landmark}
                  </p>
                )}
              </div>

              {/* Dentist previews */}
              <div className="bg-white/80 rounded-xl p-2.5 border border-slate-200/80 mb-3 text-xs text-slate-600 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-slate-800">Doctors:</span>
                  <span className="text-slate-600 truncate">{dentistNames}</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Active & Booking
                </span>
              </div>

              {/* Address, Phone, & Timings row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                  <span className="font-medium text-slate-700 leading-snug">
                    {branch.address}, {branch.areaCityPincode}
                  </span>
                </div>

                <div className="space-y-1 sm:text-right">
                  <div className="flex items-center gap-1.5 sm:justify-end font-bold text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:justify-end text-[11px] text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{branch.timings}</span>
                  </div>
                </div>
              </div>

              {/* Action Callout Row */}
              <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
                <span className="text-[11px] font-bold text-slate-500">
                  {isSelected ? '✓ Location Selected' : 'Click to select this branch'}
                </span>
                <span className={`inline-flex items-center gap-1 font-extrabold text-xs ${isSelected ? 'text-blue-700' : 'text-blue-600'}`}>
                  {isCurrentlyAdvancing ? (
                    <span className="flex items-center gap-1 text-emerald-600 animate-pulse">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      Auto-advancing to Dentists…
                    </span>
                  ) : isSelected ? (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Selected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 hover:underline">
                      Select & Continue <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating or bottom CTA button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          id="btn-confirm-branch"
          onClick={onNext}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          <span>Continue to Select Dentist</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
