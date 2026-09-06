import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Building2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { ClinicBranch, DEFAULT_BRANCHES } from '../types';

interface BranchSelectorProps {
  selectedBranch: ClinicBranch | null;
  onSelectBranch: (branch: ClinicBranch) => void;
  refreshTrigger?: number;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  selectedBranch,
  onSelectBranch,
  refreshTrigger,
}) => {
  const [branches, setBranches] = useState<ClinicBranch[]>(DEFAULT_BRANCHES);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/branches')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          const activeBranches = data.data.filter((b: ClinicBranch) => b.isActive !== false);
          setBranches(activeBranches);

          // If no branch is currently selected, pick main or first branch
          if (!selectedBranch) {
            const main = activeBranches.find((b: ClinicBranch) => b.isMain) || activeBranches[0];
            if (main) onSelectBranch(main);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load branches from API, using fallback:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [refreshTrigger]);

  const current = selectedBranch || branches.find((b) => b.isMain) || branches[0];

  return (
    <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border-2 border-[#bfdbfe] rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#2563eb]">
              Select Clinic Location / Branch
            </span>
            <h3 className="text-sm sm:text-base font-extrabold text-[#0f172a] leading-tight">
              {current?.shortName || current?.name || 'Main Dental Clinic'}
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-extrabold text-[#2563eb] bg-white border border-[#93c5fd] hover:bg-[#eff6ff] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
          title="Change clinic location"
        >
          <span>{isExpanded ? 'Collapse' : `Change Branch (${branches.length})`}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Current Branch Details Summary */}
      {current && !isExpanded && (
        <div className="bg-white/90 backdrop-blur-xs border border-[#dbeafe] rounded-xl p-2.5 text-xs text-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5 sm:mt-0" />
            <span className="font-semibold truncate">
              {current.address}, {current.areaCityPincode}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-[#64748b] text-[11px]">
            <span className="flex items-center gap-1 font-bold text-slate-700">
              <Phone className="w-3 h-3 text-emerald-600" />
              {current.phone}
            </span>
            <span className="flex items-center gap-1 font-medium hidden md:inline-flex">
              <Clock className="w-3 h-3 text-[#2563eb]" />
              {current.timings}
            </span>
          </div>
        </div>
      )}

      {/* Expanded Multi-Branch Picker */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#dbeafe]">
          {branches.map((branch) => {
            const isSelected = (selectedBranch?.id || branches[0]?.id) === branch.id;
            return (
              <div
                key={branch.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onSelectBranch(branch);
                  setIsExpanded(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectBranch(branch);
                    setIsExpanded(false);
                  }
                }}
                className={`relative text-left p-3 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#2563eb] shadow-md ring-2 ring-blue-100'
                    : 'bg-white/80 border-slate-200 hover:border-[#93c5fd] hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-extrabold text-xs sm:text-sm text-[#0f172a] line-clamp-1">
                      {branch.shortName}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-[#2563eb] shrink-0 fill-[#eff6ff]" />
                    )}
                  </div>

                  {branch.isMain && (
                    <span className="inline-block text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.2 rounded mb-1">
                      Headquarters (Main)
                    </span>
                  )}

                  <p className="text-[11px] text-[#64748b] line-clamp-2 leading-relaxed font-medium">
                    {branch.address}, {branch.areaCityPincode}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-[#475569] space-y-0.5">
                  <div className="flex items-center gap-1 font-bold text-[#1e40af]">
                    <Phone className="w-3 h-3 text-[#2563eb]" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{branch.timings}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
