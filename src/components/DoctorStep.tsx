import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Star, Award, Check, MapPin, Building2, Stethoscope, ChevronRight, Zap } from 'lucide-react';
import { Doctor, ClinicBranch } from '../types';
import { getDentistsForBranch, getServicesForDentist } from '../data/branchHierarchy';

interface DoctorStepProps {
  branch: ClinicBranch | null;
  selectedDoctor: Doctor | null;
  onSelectDoctor: (doctor: Doctor) => void;
  onChangeBranch: () => void;
  onBack: () => void;
  onNext: () => void;
  refreshTrigger?: number;
  autoAdvanceEnabled?: boolean;
  onOpenDoctorMorning?: () => void;
}

export const DoctorStep: React.FC<DoctorStepProps> = ({
  branch,
  selectedDoctor,
  onSelectDoctor,
  onChangeBranch,
  onBack,
  onNext,
  refreshTrigger,
  autoAdvanceEnabled = true,
  onOpenDoctorMorning,
}) => {
  const branchId = branch?.id || 'branch-1';
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(() =>
    getDentistsForBranch(branchId)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [advancingDocId, setAdvancingDocId] = useState<string | null>(null);

  useEffect(() => {
    const loadDoctors = () => {
      setIsLoading(true);
      fetch(`/api/branches/${branchId}/dentists`)
        .then((res) => {
          if (!res.ok) {
            return fetch(`/api/doctors?branchId=${branchId}`).then((r) => r.json());
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
            setDoctorsList(data.data);
          } else {
            setDoctorsList(getDentistsForBranch(branchId));
          }
        })
        .catch((err) => {
          console.warn(`Fallback to local branch hierarchy dentists for ${branchId}:`, err);
          setDoctorsList(getDentistsForBranch(branchId));
        })
        .finally(() => {
          setIsLoading(false);
        });
    };

    loadDoctors();

    const handleAdminEvent = () => loadDoctors();
    window.addEventListener('sdc_admin_data_updated', handleAdminEvent);
    return () => {
      window.removeEventListener('sdc_admin_data_updated', handleAdminEvent);
    };
  }, [branchId, refreshTrigger]);

  const handleCardClick = (doc: Doctor) => {
    setAdvancingDocId(doc.id);
    onSelectDoctor(doc);
  };

  return (
    <div className="space-y-6">
      {/* Selected Branch Banner with Quick-Change Action */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border-1.5 border-[#bfdbfe] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                Selected Branch Location
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#0f172a] mt-0.5">
              {branch?.name || 'Downtown Central (Main Clinic)'}
            </h3>
            <p className="text-xs text-[#64748b] font-medium flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{branch?.address || '102 Wellness Plaza, Dental Street'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onChangeBranch}
          className="self-start sm:self-center text-xs font-black text-[#2563eb] bg-white border border-[#93c5fd] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
        >
          Change Branch
        </button>
      </div>

      {/* Header text */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
              2
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
              Choose your dentist
            </h2>
          </div>
          <span className="text-xs font-bold text-[#2563eb] bg-[#eff6ff] px-2.5 py-1 rounded-full border border-[#bfdbfe]">
            {doctorsList.length} Dentists at this Branch
          </span>
        </div>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Showing dentists currently stationed at <span className="font-bold text-slate-800">{branch?.shortName || 'this branch'}</span>. Click to select your preferred doctor.
        </p>

        {autoAdvanceEnabled && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-blue-800 bg-blue-50/90 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            <span>Click any dentist to automatically continue to services selection.</span>
          </div>
        )}
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {doctorsList.map((doc) => {
          const isSelected = selectedDoctor?.id === doc.id;
          const isAdvancing = advancingDocId === doc.id;
          const offeredServices = getServicesForDentist(branchId, doc.id);

          return (
            <div
              key={doc.id}
              id={`doctor-card-${doc.id}`}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(doc)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(doc);
                }
              }}
              className={`relative border-2 rounded-2xl p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between gap-3 select-none active:scale-[0.99] ${
                isSelected
                  ? 'border-[#2563eb] bg-[#eff6ff] ring-3 ring-[#2563eb]/20 shadow-sm'
                  : 'border-[#e2e8f0] bg-white hover:border-[#60a5fa] hover:bg-[#f8fafc] shadow-2xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div className="flex items-start gap-3.5">
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shrink-0 border-2 border-[#dbeafe] shadow-2xs"
                  style={{ backgroundColor: doc.avatarBg }}
                  aria-hidden="true"
                >
                  {doc.avatarIcon}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="text-base font-extrabold text-[#0f172a] leading-snug">
                    {doc.name}
                  </div>
                  <div className="text-xs text-[#64748b] font-semibold mt-0.5">
                    {doc.spec}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#2563eb] mt-1">
                    <Award className="w-3 h-3 shrink-0" />
                    <span>{doc.experience}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#f5a623] mt-1.5">
                    <Star className="w-3.5 h-3.5 fill-[#f5a623] text-[#f5a623] shrink-0" />
                    <span>{doc.rating}</span>
                    <span className="text-[#64748b] font-medium text-[11px]">
                      ({doc.reviewsCount} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* Service capacity badge at this location */}
              <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50/80 px-2 py-1 rounded-md border border-blue-100">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <span>{offeredServices.length} Treatments at this branch</span>
                </div>
                <span className="text-xs font-bold flex items-center">
                  {isAdvancing ? (
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1 animate-pulse">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-400" /> Auto-advancing…
                    </span>
                  ) : isSelected ? (
                    <span className="text-blue-700 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Selected
                    </span>
                  ) : (
                    <span className="text-blue-600 font-bold hover:underline flex items-center">
                      Select & Proceed <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Button Row */}
      <div className="pt-4 border-t border-[#dbeafe] flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 py-3.5 px-4 sm:px-5 rounded-xl font-bold text-sm text-[#64748b] border-2 border-[#e2e8f0] bg-white hover:border-[#2563eb] hover:text-[#2563eb] active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Location</span>
        </button>

        <button
          id="btn-goto-services"
          type="button"
          disabled={!selectedDoctor}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Continue to Select Service</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
