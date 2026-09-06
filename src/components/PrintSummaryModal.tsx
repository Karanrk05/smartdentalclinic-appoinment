import React, { useState } from 'react';
import { X, Printer, Download, MessageSquare, ExternalLink, FileText, Check, ShieldCheck } from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { cleanPhoneNumber, generateWhatsAppReceiptText } from './WhatsAppShareModal';
import { PrintableAppointmentSlip } from './PrintableAppointmentSlip';
import { printSlipDirect, openSlipInNewTab, downloadSlipHTML, SlipPrintFormat } from '../utils/printSlip';

interface PrintSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  onOpenWhatsAppModal?: () => void;
}

export const PrintSummaryModal: React.FC<PrintSummaryModalProps> = ({
  isOpen,
  onClose,
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onOpenWhatsAppModal,
}) => {
  const [printFormat, setPrintFormat] = useState<SlipPrintFormat>('a4');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef } = booking;
  if (!treatment || !doctor || !selectedDate || !selectedTime) return null;

  const handlePrint = async (formatToUse: SlipPrintFormat = printFormat) => {
    setIsPrinting(true);
    setPrintFeedback(`Preparing ${formatToUse === 'thermal' ? '80mm Thermal' : 'A4 Official'} slip...`);

    try {
      await printSlipDirect(booking, clinicProfile, formatToUse);
      setPrintFeedback('Print dialog sent successfully!');
    } catch (err) {
      console.error('Print error:', err);
      // Fallback
      window.print();
    } finally {
      setTimeout(() => {
        setIsPrinting(false);
        setPrintFeedback(null);
      }, 3000);
    }
  };

  const handleOpenCleanTab = () => {
    openSlipInNewTab(booking, clinicProfile, printFormat);
  };

  const handleDownloadHTML = () => {
    downloadSlipHTML(booking, clinicProfile, printFormat);
  };

  const handleQuickWhatsApp = () => {
    if (onOpenWhatsAppModal) {
      onClose();
      onOpenWhatsAppModal();
    } else {
      const cleaned = cleanPhoneNumber(patient.phone || '');
      const msg = generateWhatsAppReceiptText(booking);
      const url = cleaned
        ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadTextSlip = () => {
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient';
    const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
    const formattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : String(selectedDate);

    const slipContent = `
=====================================================
            ${clinicProfile.name.toUpperCase()}
   Official Appointment Confirmation & Registration Slip
=====================================================

Booking Reference: ${bookingRef}
Generated On     : ${new Date().toLocaleString()}
Status           : CONFIRMED & SCHEDULED

CLINIC / BRANCH:
----------------
${booking.branch?.name || clinicProfile.name}
${booking.branch?.address || clinicProfile.address}, ${booking.branch?.areaCityPincode || clinicProfile.areaCityPincode}
Phone: ${booking.branch?.phone || clinicProfile.phone}
Emergency Helpline: ${booking.branch?.emergencyPhone || clinicProfile.emergencyPhone}

PATIENT DETAILS:
----------------
Name        : ${fullName}
Phone       : ${patient.phone || 'N/A'}
Email       : ${patient.email || 'N/A'}
DOB         : ${patient.dob || 'Not specified'}
Patient Type: ${patient.patientType || 'Standard patient'}

APPOINTMENT INFORMATION:
-----------------------
Treatment   : ${treatment.name}
Duration    : ${treatment.dur}
Dentist     : ${doctor.name} (${doctor.spec})
Date        : ${formattedDate}
Time Slot   : ${selectedTime}
Est. Fee    : ${treatment.price} (Payable at clinic reception)

${patient.notes ? `Remarks: "${patient.notes}"\n` : ''}
IMPORTANT INSTRUCTIONS:
- Please arrive 10 minutes prior to your scheduled time.
- Carry your previous dental records or X-rays if available.
- Free cancellation/rescheduling up to 4 hours in advance (${booking.branch?.phone || clinicProfile.phone}).
=====================================================
`;
    const blob = new Blob([slipContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartDental_Appointment_${bookingRef}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:bg-white print:p-0 print:static"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-[#bfdbfe] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Top Control Bar (Hidden on actual print) */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-3 sm:px-5 py-3 flex items-center justify-between gap-2 no-print shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base leading-tight truncate">
                  Clinic Appointment Slip
                </h3>
                <span className="text-[10px] bg-blue-500/50 text-blue-100 border border-blue-400/60 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                  Ref: {bookingRef}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 font-medium hidden sm:block">
                Ready to print for patient records, reception desk, or queue slip
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* WhatsApp button */}
            <button
              id="btn-whatsapp-slip-modal"
              type="button"
              onClick={handleQuickWhatsApp}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
              title="Share receipt directly on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Primary Print Button */}
            <button
              id="btn-print-slip-modal"
              type="button"
              onClick={() => handlePrint()}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-[#2563eb] hover:bg-[#eff6ff] font-extrabold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'Printing…' : 'Print Slip'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer ml-1"
              title="Close slip preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Sub-toolbar: Format Switcher & Auxiliary Export Tools */}
        <div className="px-3 sm:px-5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 no-print shrink-0 text-xs">
          {/* Format selection pills */}
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                printFormat === 'a4'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official Letterhead (A4)</span>
            </button>

            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🧾 Thermal POS (80mm)</span>
            </button>
          </div>

          {/* Quick auxiliary export buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleOpenCleanTab}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
              title="Open in a clean dedicated browser window / print directly"
            >
              <ExternalLink className="w-3 h-3 text-blue-600" />
              <span>Open in Clean Tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
              title="Download standalone HTML document for offline records or sending"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Download HTML</span>
            </button>

            <button
              type="button"
              onClick={downloadTextSlip}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
              title="Download plain text voucher"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Text (.txt)</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner if printing */}
        {printFeedback && (
          <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-4 py-1.5 text-xs font-bold flex items-center justify-between animate-fade-in no-print shrink-0">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {printFeedback}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Auto-dismissing…</span>
          </div>
        )}

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          <PrintableAppointmentSlip
            booking={booking}
            clinicProfile={clinicProfile}
            format={printFormat}
          />
        </div>

        {/* Modal Bottom Actions (Hidden on print) */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 no-print shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Clinic-ready format with authorized seal, barcode, itemized procedure estimation, and guidelines.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handlePrint()}
              disabled={isPrinting}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-extrabold text-xs shadow-md shadow-[#2563eb]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Printing…' : `Print ${printFormat === 'thermal' ? '80mm Slip' : 'Confirmation Slip'}`}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

