import React, { useState } from 'react';
import { Copy, CheckCheck, Printer, RefreshCw, FileSpreadsheet, Download, MessageSquare, Send, Clock, Building2, Check, Zap } from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { PrintSummaryModal } from './PrintSummaryModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { PrintableAppointmentSlip } from './PrintableAppointmentSlip';
import { SmartDentalLogo } from './SmartDentalLogo';
import { ReminderCard } from './ReminderCard';
import { printSlipDirect } from '../utils/printSlip';

interface SuccessStepProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  onReset: () => void;
  onOpenExcelModal?: () => void;
  onOpenPatientHistory?: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onReset,
  onOpenExcelModal,
  onOpenPatientHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isQuickPrinting, setIsQuickPrinting] = useState(false);
  const [quickPrintToast, setQuickPrintToast] = useState<string | null>(null);
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef, branch } = booking;

  if (!treatment || !doctor || !selectedDate || !selectedTime) {
    return null;
  }

  const handleCopyRef = () => {
    if (bookingRef) {
      navigator.clipboard.writeText(bookingRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleQuickPrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsQuickPrinting(true);
    setQuickPrintToast('Sending slip to printer…');
    try {
      await printSlipDirect(booking, clinicProfile, 'a4');
      setQuickPrintToast('Print job initiated!');
    } catch (err) {
      console.error(err);
      setIsPrintModalOpen(true);
    } finally {
      setTimeout(() => {
        setIsQuickPrinting(false);
        setQuickPrintToast(null);
      }, 3000);
    }
  };

  const formattedDate = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = formatSlotTime(selectedTime);
  const fullName = `${patient.firstName} ${patient.lastName}`.trim();

  return (
    <div>
      {/* 1. ON-SCREEN INTERACTIVE CONFIRMATION VIEW (Hidden during print) */}
      <div className="text-center py-4 space-y-6 print:hidden">
        <div className="flex justify-center">
          <SmartDentalLogo className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md animate-pop-in" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
            Appointment confirmed!
          </h2>
          <p className="text-sm sm:text-base text-[#64748b] font-medium mt-1">
            Your appointment at <strong className="text-[#2563eb]">{clinicProfile.name}</strong> has been confirmed and saved.
          </p>
        </div>

        {/* Backend Excel Storage Badge */}
        <div className="max-w-lg mx-auto bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
            <div className="text-xs min-w-0">
              <div className="font-extrabold text-emerald-900 truncate">
                Synced with Backend Excel Sheet
              </div>
              <div className="text-emerald-700 font-medium truncate text-[11px]">
                Saved to <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono">data/patients_records.xlsx</code>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <a
              href="/api/patients/export-excel"
              download="SmartDental_Patients_Records.xlsx"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
              title="Download Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </a>
            {onOpenExcelModal && (
              <button
                type="button"
                onClick={onOpenExcelModal}
                className="px-2.5 py-1.5 rounded-lg border border-emerald-400 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
              >
                View Sheet
              </button>
            )}
          </div>
        </div>

        {/* Booking Reference Badge */}
        <div className="inline-block bg-[#eff6ff] border-2 border-dashed border-[#3b82f6] rounded-2xl p-4 sm:px-8 shadow-xs">
          <span className="block text-xs font-bold text-[#64748b] uppercase tracking-wider">
            Booking reference
          </span>
          <div className="flex items-center justify-center gap-3 mt-1">
            <strong className="text-2xl sm:text-3xl font-black text-[#2563eb] tracking-widest font-mono">
              {bookingRef}
            </strong>
            <button
              type="button"
              onClick={handleCopyRef}
              className="p-1.5 rounded-lg bg-white border border-[#dbeafe] text-[#2563eb] hover:bg-[#eff6ff] transition-colors cursor-pointer shadow-xs"
              title="Copy reference code"
            >
              {copied ? (
                <CheckCheck className="w-4 h-4 text-[#10b981]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* AUTOMATED 24-HOUR PATIENT REMINDER CARD */}
        <ReminderCard
          booking={booking}
          clinicProfile={clinicProfile}
        />

        {/* Summary Box */}
        <div className="bg-[#eff6ff] border-1.5 border-[#bfdbfe] rounded-2xl p-5 text-left max-w-lg mx-auto space-y-2.5 text-xs sm:text-sm shadow-xs">
          <div className="font-extrabold text-[#2563eb] pb-2 border-b border-[#dbeafe] flex items-center justify-between">
            <span>Confirmed Details</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {branch?.shortName || 'Main Clinic'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Location / Branch:</span>
            <span className="font-bold text-[#0f172a] text-right max-w-[65%]">
              {branch?.name || clinicProfile.name}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Branch Address:</span>
            <span className="font-medium text-[#0f172a] text-right max-w-[65%] text-[11px]">
              {branch?.address ? `${branch.address}, ${branch.areaCityPincode}` : clinicProfile.address}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Service:</span>
            <span className="font-bold text-[#0f172a] text-right">
              {treatment.icon} {treatment.name}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Dentist:</span>
            <span className="font-bold text-[#0f172a] text-right">
              {doctor.name} ({doctor.spec})
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Date & Time:</span>
            <span className="font-bold text-[#0f172a] text-right">
              {formattedDate} at {formattedTime}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Patient:</span>
            <span className="font-bold text-[#0f172a] text-right">{fullName}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#64748b] font-semibold">Estimated Fee:</span>
            <span className="font-extrabold text-[#2563eb] text-right">{treatment.price}</span>
          </div>
        </div>

        {/* WhatsApp Send Receipt Highlight Card */}
        <div className="max-w-lg mx-auto bg-gradient-to-r from-[#25D366]/10 to-[#128C7E]/10 border-2 border-[#25D366]/40 rounded-2xl p-4 sm:p-5 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#25D366]/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-[#0f172a] flex items-center gap-1.5">
                <span>Send Receipt via WhatsApp</span>
                <span className="bg-[#25D366] text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                  Instant
                </span>
              </div>
              <p className="text-xs text-[#475569] font-medium mt-0.5">
                Send the official appointment receipt & reminder directly to {fullName} ({patient.phone || 'patient'}).
              </p>
            </div>
          </div>

          <button
            id="btn-whatsapp-send-receipt"
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-md shadow-[#25D366]/25 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send via WhatsApp</span>
          </button>
        </div>

        {/* Quick Print Toast Notification */}
        {quickPrintToast && (
          <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs animate-fade-in">
            <Check className="w-3.5 h-3.5 text-blue-600" />
            <span>{quickPrintToast}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 max-w-2xl mx-auto">
          {onOpenPatientHistory && (
            <button
              id="btn-view-history-success"
              type="button"
              onClick={onOpenPatientHistory}
              className="flex items-center justify-center gap-1.5 py-3 px-2.5 rounded-xl font-bold text-xs text-indigo-700 border-2 border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 active:scale-95 transition-all cursor-pointer shadow-xs min-h-[44px]"
              title="View your past and upcoming appointments"
            >
              <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Patient History</span>
            </button>
          )}

          <button
            id="btn-whatsapp-action"
            type="button"
            onClick={() => setIsWhatsAppModalOpen(true)}
            className="flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-800 border-2 border-[#25D366] bg-[#f0faf5] hover:bg-[#e2f7ed] active:scale-95 transition-all cursor-pointer shadow-xs min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0" />
            <span>WhatsApp Slip</span>
          </button>

          {/* Enhanced Print Slip Button with quick print capability */}
          <div className="relative group">
            <button
              id="btn-print-summary"
              type="button"
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 px-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#2563eb] border-2 border-[#2563eb] bg-white hover:bg-[#eff6ff] active:scale-95 transition-all cursor-pointer shadow-xs min-h-[44px]"
              title="Preview and Print Confirmation Slip"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Slip</span>
            </button>
          </div>

          <button
            id="btn-book-another"
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Book another</span>
          </button>
        </div>

        {/* 1-Click Quick Print Pill for Busy Clinic Desks */}
        <div className="flex items-center justify-center gap-3 pt-1 text-xs">
          <button
            type="button"
            onClick={handleQuickPrint}
            disabled={isQuickPrinting}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold transition-colors cursor-pointer disabled:opacity-50"
            title="Send directly to printer without opening preview"
          >
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>{isQuickPrinting ? 'Printing…' : '1-Click Quick Print (A4)'}</span>
          </button>
        </div>
      </div>

      {/* 2. DEDICATED PRINTABLE SLIP (Rendered automatically during window.print()) */}
      <div className="hidden print:block w-full">
        <PrintableAppointmentSlip booking={booking} clinicProfile={clinicProfile} />
      </div>

      {/* Printable Appointment Summary Modal */}
      <PrintSummaryModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        booking={booking}
        clinicProfile={clinicProfile}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
      />

      {/* WhatsApp Sharing Modal */}
      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        booking={booking}
        clinicProfile={clinicProfile}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />
    </div>
  );
};
