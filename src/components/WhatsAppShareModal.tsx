import React, { useState } from 'react';
import { X, Send, Copy, CheckCheck, Download, Phone, MessageSquare, ExternalLink, Printer } from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  onOpenPrintModal?: () => void;
}

export function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If 10 digits (standard Indian mobile number without country code), prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppReceiptText(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE
): string {
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef } = booking;
  if (!treatment || !doctor || !selectedDate || !selectedTime) return '';

  const formattedDate = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = formatSlotTime(selectedTime);
  const fullName = `${patient.firstName} ${patient.lastName}`.trim() || 'Valued Patient';

  return `🦷 *${clinicProfile.name.toUpperCase()}*
*Official Appointment Confirmation & Receipt*
━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear *${fullName}*,
Your dental appointment has been successfully confirmed and scheduled.

📋 *BOOKING DETAILS:*
• *Booking Ref:* ${bookingRef}
• *Treatment:* ${treatment.name} (${treatment.dur})
• *Dentist:* ${doctor.name} (${doctor.spec})
• *Date:* ${formattedDate}
• *Time Slot:* ${formattedTime}
• *Estimated Fee:* ${treatment.price}

🏥 *CLINIC LOCATION:*
${booking.branch?.name || clinicProfile.name}
${booking.branch?.address ? `${booking.branch.address}, ${booking.branch.areaCityPincode}` : clinicProfile.address}
📞 Helpline / Reception: ${booking.branch?.phone || clinicProfile.phone}

⚠️ *IMPORTANT PATIENT GUIDELINES:*
1. Please arrive 10 minutes prior to your appointment time.
2. Carry any previous dental X-rays or prescription history.
3. For rescheduling or assistance, please contact us at ${clinicProfile.phone}.

Thank you for choosing *${clinicProfile.name}* for your oral health care! ✨`;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onOpenPrintModal,
}) => {
  if (!isOpen) return null;

  const { patient, bookingRef, treatment, doctor, selectedDate, selectedTime } = booking;
  const initialPhone = patient.phone ? cleanPhoneNumber(patient.phone) : '';
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const receiptMessage = generateWhatsAppReceiptText(booking, clinicProfile);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(receiptMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleaned = cleanPhoneNumber(phoneNumber);
    const encodedText = encodeURIComponent(receiptMessage);
    let url = '';
    if (cleaned) {
      url = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodedText}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSlip = () => {
    const blob = new Blob([receiptMessage], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartDental_Receipt_${bookingRef || 'Appointment'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border-2 border-[#dbeafe] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto animate-pop-in">
        {/* Header */}
        <div className="bg-[#25D366] text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-lg leading-tight truncate">
                WhatsApp Receipt
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium hidden sm:block">
                Share official confirmation & slip with patient
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-black/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Recipient Phone */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-[#0f172a]">
              Patient's WhatsApp Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#25D366] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 919876543210 (Country code + number)"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2.5 text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#25D366] focus:bg-white transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#64748b] font-medium">
              Defaults to phone provided during intake. Include country code (e.g. 91 for India).
            </p>
          </div>

          {/* Quick Receipt Message Preview */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0f172a]">
                WhatsApp Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center gap-1 text-[11px] font-bold text-[#2563eb] hover:text-[#1d4ed8] transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[#10b981]">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#f0faf5] border border-[#b2e5d0] rounded-xl p-3.5 text-xs text-[#0f172a] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed shadow-inner">
              {receiptMessage}
            </div>
          </div>

          {/* Auxiliary Actions: Download or Print PDF */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadSlip}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#dbeafe] bg-[#f8fafc] hover:bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloaded ? 'Downloaded Slip!' : 'Download Slip (.txt)'}</span>
            </button>

            {onOpenPrintModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrintModal();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#dbeafe] bg-[#f8fafc] hover:bg-[#eff6ff] text-xs font-bold text-[#2563eb] transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Save PDF Receipt</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#f8fafc] border-t border-[#dbeafe] px-5 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-bold text-[#64748b] hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id="btn-confirm-send-whatsapp"
            type="button"
            onClick={handleSendWhatsApp}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-sm shadow-md shadow-[#25D366]/20 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Open & Send on WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};
