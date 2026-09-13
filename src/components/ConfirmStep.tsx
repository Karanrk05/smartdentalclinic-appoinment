import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Building2,
  MapPin,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Camera,
  Receipt,
} from 'lucide-react';
import { BookingState, ClinicProfile, PatientDetails, PaymentTransaction } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { SmartDentalLogo } from './SmartDentalLogo';
import { PaymentAppsGrid, PaymentSuccessResult } from './PaymentAppsGrid';
import { ReceiptScannerOverlay, ScannedReceiptData } from './ReceiptScannerOverlay';
import { PaymentHistoryList } from './PaymentHistoryList';

interface ConfirmStepProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile | null;
  onBack: () => void;
  onConfirm: () => void;
  onUpdatePatient?: (field: keyof PatientDetails, value: string) => void;
}

const parseFeeNumber = (priceStr?: string): number => {
  if (!priceStr) return 500;
  const match = priceStr.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 500;
};

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  booking,
  clinicProfile,
  onBack,
  onConfirm,
  onUpdatePatient,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [previousPayments, setPreviousPayments] = useState<PaymentTransaction[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);
  const { treatment, doctor, selectedDate, selectedTime, patient, branch } = booking;

  useEffect(() => {
    const query = patient.phone || patient.email || '';
    if (query.trim()) {
      setIsLoadingPayments(true);
      fetch(`/api/patients/history?query=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && Array.isArray(data.paymentHistory)) {
            setPreviousPayments(data.paymentHistory);
          } else {
            setPreviousPayments([]);
          }
        })
        .catch(() => setPreviousPayments([]))
        .finally(() => setIsLoadingPayments(false));
    }
  }, [patient.phone, patient.email]);

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

  const [selectedPayAmount, setSelectedPayAmount] = useState<number>(200);
  const totalFee = parseFeeNumber(treatment.price);
  const paidNowNum = Number(patient.amountPaidNow || 0);
  const activePayAmount = paidNowNum > 0 ? paidNowNum : selectedPayAmount;
  const remainingCalculated = Math.max(0, totalFee - paidNowNum);
  const remainingStr = patient.amountRemaining || `₹${remainingCalculated.toLocaleString('en-IN')}`;
  const upiId = clinicProfile?.clinicUpiId || 'smartdental@okhdfcbank';
  const payeeName = clinicProfile?.clinicPayeeName || branch?.name || 'Smart Dental Clinic';

  const handlePaymentSuccess = (result: PaymentSuccessResult) => {
    if (onUpdatePatient) {
      onUpdatePatient('paymentRef', result.transactionId);
      onUpdatePatient('paymentStatus', 'Verified');
      const amt = Number(result.amount || activePayAmount);
      onUpdatePatient('amountPaidNow', String(amt));
      const newRemaining = Math.max(0, totalFee - amt);
      onUpdatePatient('amountRemaining', `₹${newRemaining.toLocaleString('en-IN')}`);
    }
  };

  const handleReceiptVerified = (receipt: ScannedReceiptData) => {
    if (onUpdatePatient) {
      onUpdatePatient('paymentRef', receipt.transactionId);
      onUpdatePatient('paymentStatus', 'Verified');
      const amt = Number(receipt.amount || activePayAmount);
      onUpdatePatient('amountPaidNow', String(amt));
      const newRemaining = Math.max(0, totalFee - amt);
      onUpdatePatient('amountRemaining', `₹${newRemaining.toLocaleString('en-IN')}`);
    }
  };

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

          {patient.attachmentName && (
            <div className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4">
              <span className="text-[#64748b] font-bold shrink-0">Attached File</span>
              <span className="font-extrabold text-blue-700 text-right truncate max-w-[60%]">
                📎 {patient.attachmentName} ({patient.attachmentSize})
              </span>
            </div>
          )}

          {/* Amount Paid Now */}
          <div className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4">
            <span className="text-[#64748b] font-bold shrink-0">Amount Paid Now</span>
            <span className="font-extrabold text-right font-mono">
              {paidNowNum > 0 ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  ₹{paidNowNum.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="text-slate-600">₹0 (Pay Later at Clinic)</span>
              )}
            </span>
          </div>

          {/* Remaining Balance */}
          <div className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4">
            <span className="text-[#64748b] font-bold shrink-0">Remaining Balance to Pay</span>
            <span className="font-extrabold text-right font-mono text-blue-700">
              {remainingStr}
            </span>
          </div>

          <div className="py-2 sm:py-2.5 flex items-center justify-between text-xs sm:text-sm gap-2 sm:gap-4">
            <span className="text-[#64748b] font-bold shrink-0">Payment Status</span>
            <span className="font-extrabold text-right">
              {patient.paymentRef ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Payment Verified ({patient.paymentRef})</span>
                </span>
              ) : paidNowNum > 0 ? (
                <span className="text-emerald-700">Advance Paid · Remaining at counter</span>
              ) : (
                <span className="text-slate-700">Pay at Clinic Counter</span>
              )}
            </span>
          </div>

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

          {/* Patient Details: Previous Payment History List */}
          <div className="pt-2 sm:pt-3">
            <PaymentHistoryList
              transactions={previousPayments}
              isLoading={isLoadingPayments}
              patientName={fullName}
              patientPhone={patient.phone}
              compact={true}
              title="Patient Payment History"
              emptyMessage={`No previous transactions on file for ${patient.phone || fullName} (First-time patient)`}
              onRefresh={() => {
                const query = patient.phone || patient.email || '';
                if (query.trim()) {
                  setIsLoadingPayments(true);
                  fetch(`/api/patients/history?query=${encodeURIComponent(query.trim())}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => {
                      if (data && data.success && Array.isArray(data.paymentHistory)) {
                        setPreviousPayments(data.paymentHistory);
                      }
                    })
                    .finally(() => setIsLoadingPayments(false));
                }
              }}
            />
          </div>
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

      {/* VERIFIED PAYMENT RECEIPT BANNER OR SCANNER TRIGGER */}
      {patient.paymentRef ? (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-sm text-emerald-950">
                  Payment Receipt Verified
                </h4>
                <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded-sm">
                  SLOT LOCKED
                </span>
              </div>
              <p className="text-xs text-emerald-800 font-mono mt-0.5">
                Txn Ref: <strong className="font-bold">{patient.paymentRef}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onUpdatePatient) {
                  onUpdatePatient('paymentRef', '');
                  onUpdatePatient('paymentStatus', 'Pending');
                  onUpdatePatient('amountPaidNow', '0');
                  onUpdatePatient('amountRemaining', `₹${totalFee.toLocaleString('en-IN')}`);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Change payment amount or payment mode"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100/50 text-emerald-800 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Re-Scan</span>
            </button>
          </div>
        </div>
      ) : (
        /* PAYMENT APPS DIRECT LINKS & RECEIPT SCANNER SECTION */
        <PaymentAppsGrid
          amount={activePayAmount}
          totalFee={totalFee}
          patientName={fullName}
          bookingNote={`Fee for ${treatment.name} on ${formattedDate}`}
          clinicUpiId={upiId}
          clinicName={payeeName}
          onOpenScanner={() => setIsScannerOpen(true)}
          onPaymentSuccess={handlePaymentSuccess}
          onAmountChange={(newAmt) => setSelectedPayAmount(newAmt)}
        />
      )}

      {/* RECEIPT SCANNER CAMERA OVERLAY MODAL */}
      <ReceiptScannerOverlay
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onVerified={handleReceiptVerified}
        bookingAmount={activePayAmount}
      />

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
