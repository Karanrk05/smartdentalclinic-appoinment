import React, { useState } from 'react';
import { X, Send, Copy, CheckCheck, Download, Phone, MessageSquare, ExternalLink, Printer, Stethoscope, CheckCircle2, User } from 'lucide-react';
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

export function generateWhatsAppDoctorAlertText(
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

  return `🏥 *${clinicProfile.name.toUpperCase()} - CLINICAL ALERT*
*New Appointment Booked (Doctor Alert)*
━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello *Dr. ${doctor.name}*,
A new dental appointment has been scheduled for your consultation:

👤 *PATIENT PROFILE:*
• *Patient Name:* ${fullName}
• *Mobile:* ${patient.phone || 'N/A'}
• *Email:* ${patient.email || 'N/A'}

📋 *APPOINTMENT DETAILS:*
• *Booking Ref:* ${bookingRef}
• *Procedure:* ${treatment.name} (${treatment.dur})
• *Date:* ${formattedDate}
• *Time Slot:* ${formattedTime}
• *Location:* ${booking.branch?.name || clinicProfile.name}

ℹ️ *Clinical Note:* Patient intake file and dental history are available on your clinic dashboard.`;
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

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleaned = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return cleaned
    ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
}

export function generateWhatsAppReschedulePatientText(params: {
  bookingRef: string;
  patientName: string;
  doctorName: string;
  treatmentName: string;
  newDate: string;
  newTime: string;
  clinicName?: string;
  clinicPhone?: string;
  clinicAddress?: string;
  reason?: string;
}): string {
  const clinic = params.clinicName || 'Smart Smile Dental Clinic';
  return `🗓️ *${clinic.toUpperCase()}*
*Appointment Rescheduled Successfully*
━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear *${params.patientName}*,
Your dental appointment has been *rescheduled* to your requested new date and time.

📋 *UPDATED APPOINTMENT DETAILS:*
• *Booking Ref:* ${params.bookingRef}
• *Treatment:* ${params.treatmentName}
• *Doctor:* Dr. ${params.doctorName}
• *NEW Date:* ${params.newDate}
• *NEW Time Slot:* ${params.newTime}
${params.reason ? `• *Note:* ${params.reason}\n` : ''}
📍 *Clinic Location:*
${params.clinicAddress || 'SmileCare Facility'}
📞 *Helpline:* ${params.clinicPhone || '+91 98201 55441'}

⚠️ *Reminder:* Please arrive 10 minutes prior to your new slot for clinical prep.
Thank you for choosing ${clinic}! ✨`;
}

export function generateWhatsAppCancelPatientText(params: {
  bookingRef: string;
  patientName: string;
  doctorName: string;
  treatmentName: string;
  cancelledDate: string;
  cancelledTime: string;
  clinicName?: string;
  clinicPhone?: string;
  reason?: string;
}): string {
  const clinic = params.clinicName || 'Smart Smile Dental Clinic';
  return `❌ *${clinic.toUpperCase()}*
*Appointment Cancellation Notice*
━━━━━━━━━━━━━━━━━━━━━━━━━━

Dear *${params.patientName}*,
Your dental appointment has been *cancelled*.

📋 *CANCELLED APPOINTMENT SUMMARY:*
• *Booking Ref:* ${params.bookingRef}
• *Treatment:* ${params.treatmentName}
• *Doctor:* Dr. ${params.doctorName}
• *Cancelled Slot:* ${params.cancelledDate} at ${params.cancelledTime}
${params.reason ? `• *Reason:* ${params.reason}\n` : ''}
📞 *Need to Rebook?* Call us at ${params.clinicPhone || '+91 98201 55441'} or book online anytime 24/7.
We hope to see you again soon! ✨`;
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
  const [activeTab, setActiveTab] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const patientPhone = patient.phone ? cleanPhoneNumber(patient.phone) : '';
  const doctorPhone = doctor?.phone ? cleanPhoneNumber(doctor.phone) : '919820155441';
  const [phoneNumber, setPhoneNumber] = useState(patientPhone);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const patientReceiptMessage = generateWhatsAppReceiptText(booking, clinicProfile);
  const doctorAlertMessage = generateWhatsAppDoctorAlertText(booking, clinicProfile);

  const currentMessage = activeTab === 'PATIENT' ? patientReceiptMessage : doctorAlertMessage;
  const currentRecipientPhone = activeTab === 'PATIENT' ? (phoneNumber || patientPhone) : doctorPhone;

  const handleTabChange = (tab: 'PATIENT' | 'DOCTOR') => {
    setActiveTab(tab);
    if (tab === 'PATIENT') {
      setPhoneNumber(patientPhone);
    } else {
      setPhoneNumber(doctorPhone);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const cleaned = cleanPhoneNumber(currentRecipientPhone);
    const encodedText = encodeURIComponent(currentMessage);
    let url = '';
    if (cleaned) {
      url = `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodedText}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodedText}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadSlip = () => {
    const blob = new Blob([currentMessage], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartDental_${activeTab}_Slip_${bookingRef || 'Appointment'}.txt`;
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
                WhatsApp Dispatch Center
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium hidden sm:block">
                Zero-Touch Autonomous Delivery to Patient & Doctor
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
          {/* Instant Delivery Guidance Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 text-emerald-950 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <MessageSquare className="w-4 h-4 fill-white" />
            </div>
            <div className="text-xs space-y-1 text-left flex-1">
              <div className="font-black text-emerald-950 flex items-center gap-2 flex-wrap">
                <span>Direct WhatsApp Instant Delivery</span>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  1-Click Direct
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">
                Tap the big green <strong>&ldquo;Open &amp; Send in WhatsApp&rdquo;</strong> button below to instantly launch WhatsApp on your mobile phone or desktop with your full confirmation slip ready!
              </p>
              <div className="text-[10px] text-slate-600 bg-white/80 p-1.5 rounded border border-emerald-200/80 mt-1">
                💡 <strong>Why haven&apos;t you received an automatic background message?</strong> Direct automated cloud push to your phone lockscreen without clicking requires an active Meta WhatsApp Cloud API token or Twilio account configured in <strong>Admin &gt; Notifications</strong>. In the meantime, the 1-click button delivers it straight to your WhatsApp app immediately!
              </div>
            </div>
          </div>

          {/* Dual Recipient Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTabChange('PATIENT')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PATIENT'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Patient Slip</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('DOCTOR')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'DOCTOR'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>Doctor Alert</span>
            </button>
          </div>

          {/* Target Recipient Phone */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-[#0f172a]">
              {activeTab === 'PATIENT' ? "Patient's WhatsApp Mobile" : "Assigned Doctor's WhatsApp Mobile"}
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#25D366] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={activeTab === 'PATIENT' ? phoneNumber : doctorPhone}
                onChange={(e) => {
                  if (activeTab === 'PATIENT') setPhoneNumber(e.target.value);
                }}
                readOnly={activeTab === 'DOCTOR'}
                placeholder="e.g. 919876543210 (Country code + number)"
                className="w-full bg-[#f8fafc] border-2 border-[#dbeafe] rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#25D366] focus:bg-white transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#64748b] font-medium">
              {activeTab === 'PATIENT'
                ? `Dispatched to patient ${patient.firstName} ${patient.lastName}.`
                : `Dispatched to Dr. ${doctor?.name || 'Vikram Shah'}.`}
            </p>
          </div>

          {/* Quick Message Preview */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0f172a]">
                {activeTab === 'PATIENT' ? 'Delivered Patient Message' : 'Delivered Doctor Clinical Alert'}
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

            <div className="bg-[#f0faf5] border border-[#b2e5d0] rounded-xl p-3.5 text-xs text-[#0f172a] font-mono whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed shadow-inner">
              {currentMessage}
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
              <span>{downloaded ? 'Downloaded!' : 'Download Slip (.txt)'}</span>
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
            Close
          </button>

          <button
            id="btn-confirm-send-whatsapp"
            type="button"
            onClick={handleSendWhatsApp}
            title="Open in WhatsApp app or Web"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm shadow-md shadow-[#25D366]/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-95"
          >
            <MessageSquare className="w-4 h-4 fill-white" />
            <span>Open &amp; Send in WhatsApp Now</span>
            <ExternalLink className="w-4 h-4 opacity-90" />
          </button>
        </div>
      </div>
    </div>
  );
};
