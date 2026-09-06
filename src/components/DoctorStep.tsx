import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Star, Award, Check } from 'lucide-react';
import { Doctor, Treatment, ClinicBranch } from '../types';
import { DOCTORS } from '../data/doctors';

interface DoctorStepProps {
  selectedTreatment: Treatment;
  selectedDoctor: Doctor | null;
  onSelectDoctor: (doctor: Doctor) => void;
  onBack: () => void;
  onNext: () => void;
  refreshTrigger?: number;
  branch?: ClinicBranch | null;
}

export const DoctorStep: React.FC<DoctorStepProps> = ({
  selectedTreatment,
  selectedDoctor,
  onSelectDoctor,
  onBack,
  onNext,
  refreshTrigger,
  branch,
}) => {
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(DOCTORS);

  useEffect(() => {
    fetch('/api/doctors')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          setDoctorsList(data.data);
        }
      })
      .catch((err) => {
        console.warn('Using local doctors fallback:', err);
      });
  }, [refreshTrigger]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
          Choose your dentist
        </h2>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Our general dentists and dental surgeons have 9+ years of clinical experience
        </p>
      </div>

      {/* Selected Treatment Mini-Banner */}
      <div className="bg-[#eff6ff] border-1.5 border-[#93c5fd] rounded-xl p-3.5 flex items-center justify-between text-xs sm:text-sm">
        <div>
          <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide flex items-center gap-1.5">
            <span>Selected Treatment</span>
            {branch && (
              <span className="text-[10px] font-black text-[#1e40af] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                📍 {branch.shortName}
              </span>
            )}
          </div>
          <div className="font-extrabold text-[#2563eb] text-sm sm:text-base">
            {selectedTreatment.icon} {selectedTreatment.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold text-[#64748b]">Duration: {selectedTreatment.dur}</div>
          <div className="font-extrabold text-[#2563eb] text-sm sm:text-base">
            {selectedTreatment.price}
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        {doctorsList.map((doc) => {
          const isSelected = selectedDoctor?.id === doc.id;

          return (
            <div
              key={doc.id}
              id={`doctor-card-${doc.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDoctor(doc)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDoctor(doc);
                }
              }}
              className={`relative border-2 rounded-xl p-3.5 sm:p-4 cursor-pointer transition-all duration-150 flex items-start gap-3 sm:gap-3.5 select-none active:scale-[0.99] ${
                isSelected
                  ? 'border-[#2563eb] bg-[#eff6ff] ring-2 ring-[#2563eb]/20 shadow-xs'
                  : 'border-[#e2e8f0] bg-white hover:border-[#60a5fa] hover:bg-[#f8fafc]'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}

              <div
                className="w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center text-2xl shrink-0 border-2 border-[#dbeafe]"
                style={{ backgroundColor: doc.avatarBg }}
                aria-hidden="true"
              >
                {doc.avatarIcon}
              </div>

              <div className="flex-1 min-w-0 pr-7 sm:pr-6">
                <div className="text-sm sm:text-base font-extrabold text-[#0f172a] leading-snug">
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
          <span>Back</span>
        </button>

        <button
          id="btn-goto-schedule"
          type="button"
          disabled={!selectedDoctor}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Pick a time</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
