import React from 'react';
import { ArrowLeft, Check, Calendar, Clock, User, Phone, Mail, FileText, Building2, MapPin } from 'lucide-react';
import { BookingState } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { SmartDentalLogo } from './SmartDentalLogo';

interface ConfirmStepProps {
  booking: BookingState;
  onBack: () => void;
  onConfirm: () => void;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  booking,
  onBack,
  onConfirm,
}) => {
  const { treatment, doctor, selectedDate, selectedTime, patient, branch } = booking;

  if (!treatment || !doctor || !selectedDate || !selectedTime) {
    return null;
  }

  const formattedDate = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = formatSlotTime(selectedTime);
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();

  const summaryRows = [
    {
      label: 'Clinic Branch',
      value: branch?.name || 'Smart Dental Clinic – Downtown Central (Main)',
      icon: Building2,
    },
    {
      label: 'Branch Location',
      value: branch?.address ? `${branch.address}, ${branch.areaCityPincode}` : '102 Wellness Plaza, Dental Street',
      icon: MapPin,
    },
    { label: 'General Treatment', value: `${treatment.icon} ${treatment.name}` },
    { label: 'Duration', value: treatment.dur },
    { label: 'Dentist', value: `${doctor.name} · ${doctor.spec}` },
    { label: 'Date', value: formattedDate, icon: Calendar },
    { label: 'Time', value: formattedTime, icon: Clock },
    { label: 'Patient', value: fullName, icon: User },
    { label: 'Phone', value: patient.phone, icon: Phone },
    { label: 'Email', value: patient.email, icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
          Review & confirm
        </h2>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Check everything before we lock in your dental appointment
        </p>
      </div>

      {/* Summary Box */}
      <div className="bg-[#eff6ff] border-2 border-[#bfdbfe] rounded-2xl p-4 sm:p-6 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-[#2563eb] pb-2 border-b border-[#dbeafe]">
          <SmartDentalLogo className="w-5 h-5 shrink-0" />
          <span>Appointment Summary</span>
        </div>

        <div className="divide-y divide-[#dbeafe]">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4"
            >
              <span className="text-[#64748b] font-bold shrink-0">{row.label}</span>
              <span className="font-extrabold text-[#0f172a] text-right break-words max-w-[65%]">
                {row.value}
              </span>
            </div>
          ))}

          {patient.patientType && (
            <div className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4">
              <span className="text-[#64748b] font-bold shrink-0">Patient Type</span>
              <span className="font-extrabold text-[#0f172a] text-right">
                {patient.patientType}
              </span>
            </div>
          )}

          {patient.notes && (
            <div className="py-2 sm:py-2.5 flex items-start justify-between text-xs sm:text-sm gap-2 sm:gap-4">
              <span className="text-[#64748b] font-bold shrink-0 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Notes</span>
              </span>
              <span className="font-medium text-[#0f172a] text-right max-w-xs text-xs italic break-words">
                "{patient.notes}"
              </span>
            </div>
          )}
        </div>

        {/* Total / Estimated Fee */}
        <div className="pt-3 sm:pt-3.5 border-t-2 border-[#2563eb] flex items-center justify-between">
          <span className="text-sm sm:text-base font-extrabold text-[#0f172a]">
            Estimated fee
          </span>
          <span className="text-base sm:text-xl font-black text-[#2563eb]">
            {treatment.price}
          </span>
        </div>
      </div>

      {/* Button Row */}
      <div className="pt-2 flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 py-3.5 px-4 sm:px-5 rounded-xl font-bold text-sm text-[#64748b] border-2 border-[#e2e8f0] bg-white hover:border-[#2563eb] hover:text-[#2563eb] active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit</span>
        </button>

        <button
          id="btn-confirm-appointment"
          type="button"
          onClick={onConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm sm:text-base text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Confirm appointment</span>
          <Check className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
