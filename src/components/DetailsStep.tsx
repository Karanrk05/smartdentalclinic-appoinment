import React from 'react';
import { ArrowLeft, ArrowRight, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { PatientDetails } from '../types';

interface DetailsStepProps {
  patient: PatientDetails;
  onChangePatient: (field: keyof PatientDetails, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export const DetailsStep: React.FC<DetailsStepProps> = ({
  patient,
  onChangePatient,
  onBack,
  onNext,
}) => {
  const isFormValid =
    patient.firstName.trim().length > 0 &&
    patient.lastName.trim().length > 0 &&
    patient.phone.trim().length >= 8 &&
    patient.email.includes('@');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
          Your details
        </h2>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          We'll send a confirmation and reminder to your contact number and email
        </p>
      </div>

      <div className="space-y-4">
        {/* Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="fname-input"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              First name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="fname-input"
                type="text"
                value={patient.firstName}
                onChange={(e) => onChangePatient('firstName', e.target.value)}
                placeholder="Enter first name"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lname-input"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              Last name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="lname-input"
                type="text"
                value={patient.lastName}
                onChange={(e) => onChangePatient('lastName', e.target.value)}
                placeholder="Enter last name"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="phone-input"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              Phone number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="phone-input"
                type="tel"
                value={patient.phone}
                onChange={(e) => onChangePatient('phone', e.target.value)}
                placeholder="e.g. +91 98765 00000"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email-input"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="email-input"
                type="email"
                value={patient.email}
                onChange={(e) => onChangePatient('email', e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* DOB & Patient Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="dob-input"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              Date of birth (optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
              <input
                id="dob-input"
                type="date"
                value={patient.dob}
                onChange={(e) => onChangePatient('dob', e.target.value)}
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="patient-type-select"
              className="block text-xs font-bold text-[#64748b] mb-1.5"
            >
              Patient type
            </label>
            <select
              id="patient-type-select"
              value={patient.patientType}
              onChange={(e) => onChangePatient('patientType', e.target.value as any)}
              className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl px-3 py-2.5 text-base sm:text-sm font-semibold text-[#0f172a] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors cursor-pointer"
            >
              <option value="">Select patient type…</option>
              <option value="New patient">New patient</option>
              <option value="Existing patient">Existing patient</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="notes-input"
            className="block text-xs font-bold text-[#64748b] mb-1.5 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Anything to tell us? (optional)</span>
          </label>
          <textarea
            id="notes-input"
            value={patient.notes}
            onChange={(e) => onChangePatient('notes', e.target.value)}
            placeholder="Allergies, tooth pain history, dental anxiety, current medications…"
            rows={3}
            className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl p-3 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors resize-none"
          />
        </div>
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
          id="btn-goto-review"
          type="button"
          disabled={!isFormValid}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Review booking</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
