import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Upload,
  FileUp,
  Trash2,
  CheckCircle2,
  CreditCard,
  Check,
  Calculator,
  Wallet,
} from 'lucide-react';
import { PatientDetails, Treatment } from '../types';

interface DetailsStepProps {
  patient: PatientDetails;
  treatment?: Treatment | null;
  onChangePatient: (field: keyof PatientDetails, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

const parseFeeNumber = (priceStr?: string): number => {
  if (!priceStr) return 500;
  const match = priceStr.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 500;
};

export const DetailsStep: React.FC<DetailsStepProps> = ({
  patient,
  treatment,
  onChangePatient,
  onBack,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalFee = parseFeeNumber(treatment?.price);
  const currentPaid = patient.amountPaidNow !== undefined ? patient.amountPaidNow : '0';
  const numPaid = Math.max(0, parseInt(currentPaid.replace(/[^0-9]/g, '') || '0', 10));
  const remainingFee = Math.max(0, totalFee - numPaid);

  const handleAmountPaidChange = (rawVal: string) => {
    const cleanVal = rawVal.replace(/[^0-9]/g, '');
    const numVal = parseInt(cleanVal || '0', 10);
    const remaining = Math.max(0, totalFee - numVal);

    onChangePatient('amountPaidNow', cleanVal);
    onChangePatient('amountRemaining', `₹${remaining.toLocaleString('en-IN')}`);
    onChangePatient('paymentTokenAmount', cleanVal ? `₹${cleanVal}` : '₹0');
    onChangePatient('paymentMethod', numVal > 0 ? 'advance_paid' : 'clinic');
    onChangePatient('paymentStatus', numVal > 0 ? `Advance Paid (₹${cleanVal})` : 'Pay at Clinic Counter');
  };

  const isFormValid =
    patient.firstName.trim().length > 0 &&
    patient.lastName.trim().length > 0 &&
    patient.phone.trim().length >= 8 &&
    patient.email.includes('@');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // Format size
    const sizeInKb = Math.round(file.size / 1024);
    const sizeStr = sizeInKb > 1024 ? `${(sizeInKb / 1024).toFixed(1)} MB` : `${sizeInKb} KB`;

    onChangePatient('attachmentName', file.name);
    onChangePatient('attachmentSize', sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangePatient('attachmentData', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    onChangePatient('attachmentName', '');
    onChangePatient('attachmentSize', '');
    onChangePatient('attachmentData', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
            rows={2}
            className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl p-3 text-base sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb] focus:bg-white transition-colors resize-none"
          />
        </div>

        {/* X-Ray / Prescription File Attachment (Optional) */}
        <div className="pt-1">
          <label className="block text-xs font-bold text-[#64748b] mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Attach Dental X-Ray or Prescription (Optional)</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">JPG, PNG, PDF up to 10MB</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="xray-file-input"
          />

          {!patient.attachmentName ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-slate-300 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                <FileUp className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Drag & drop X-ray/prescription or <strong className="text-blue-600 underline">browse file</strong></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{patient.attachmentName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{patient.attachmentSize} • Attached to medical file</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove attached file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Fee & Payment Breakdown: Amount Paid Now & Remaining Balance */}
        <div className="pt-3 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Treatment Fee & Payment Details</span>
            </label>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
              Transparent Pricing · No Hidden Fees
            </span>
          </div>

          <div className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3.5 shadow-xs">
            {/* Estimated Treatment Fee */}
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Estimated Fee ({treatment?.name || 'Selected Treatment'}):</span>
              </span>
              <span className="font-extrabold text-slate-900 text-sm sm:text-base font-mono">
                {treatment?.price || `₹${totalFee.toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* Amount Paid by Patient Now */}
            <div className="space-y-1.5 pt-2.5 border-t border-slate-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <div>
                  <label htmlFor="patient-amount-paid-now" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Amount Paid by Patient Now:</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Enter advance/token paid now, or set ₹0 to pay later at clinic counter
                  </p>
                </div>

                <div className="relative w-full sm:w-44">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                    ₹
                  </span>
                  <input
                    id="patient-amount-paid-now"
                    type="text"
                    inputMode="numeric"
                    value={patient.amountPaidNow !== undefined ? patient.amountPaidNow : '0'}
                    onChange={(e) => handleAmountPaidChange(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs text-right"
                  />
                </div>
              </div>

              {/* Quick preset chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                  Quick Set:
                </span>
                <button
                  type="button"
                  onClick={() => handleAmountPaidChange('0')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    (patient.amountPaidNow === '0' || !patient.amountPaidNow)
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ₹0 (Pay at Clinic)
                </button>
                <button
                  type="button"
                  onClick={() => handleAmountPaidChange('200')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    patient.amountPaidNow === '200'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ₹200 (Token)
                </button>
                {totalFee > 200 && (
                  <button
                    type="button"
                    onClick={() => handleAmountPaidChange(String(totalFee))}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      patient.amountPaidNow === String(totalFee)
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Full (₹{totalFee.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
            </div>

            {/* Remaining Balance to Pay */}
            <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <span className="font-extrabold text-xs text-slate-900 block">
                  Remaining Balance to Pay:
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {remainingFee > 0
                    ? 'Payable at clinic counter upon completion of treatment'
                    : '✓ Full fee covered (Zero balance remaining)'}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`text-base sm:text-lg font-mono font-black ${
                    remainingFee === 0 ? 'text-emerald-600' : 'text-blue-700'
                  }`}
                >
                  ₹{remainingFee.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
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
