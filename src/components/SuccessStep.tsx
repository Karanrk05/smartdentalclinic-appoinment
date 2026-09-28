import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  Check, 
  Copy, 
  CheckCheck, 
  Printer, 
  RefreshCw, 
  MessageSquare, 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  PhoneCall,
  Ban,
  Download,
  X
} from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { PrintSummaryModal } from './PrintSummaryModal';
import { 
  WhatsAppShareModal, 
  generateWhatsAppReceiptText, 
  generateWhatsAppDoctorAlertText, 
  generateWhatsAppReschedulePatientText,
  generateWhatsAppCancelPatientText,
  buildWhatsAppLink,
  cleanPhoneNumber 
} from './WhatsAppShareModal';
import { PrintableAppointmentSlip } from './PrintableAppointmentSlip';
import { printSlipDirect, downloadSlipPDF, downloadSlipHTML } from '../utils/printSlip';
import { rescheduleBookingInFirestore, cancelBookingInFirestore } from '../firebase';

interface SuccessStepProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  onReset: () => void;
  onOpenExcelModal?: () => void;
  onOpenPatientHistory?: () => void;
  onOpenSmartReminder?: (appointment: any) => void;
  onOpenPatientResponseDesk?: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onReset,
  onOpenExcelModal,
  onOpenPatientHistory,
  onOpenSmartReminder,
  onOpenPatientResponseDesk,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isQuickPrinting, setIsQuickPrinting] = useState(false);
  const [quickPrintToast, setQuickPrintToast] = useState<string | null>(null);

  // Appointment Rescheduling and Cancellation state
  const [currentDate, setCurrentDate] = useState<Date>(booking.selectedDate || new Date());
  const [currentTime, setCurrentTime] = useState<string>(booking.selectedTime || '10:00 AM');
  const [currentStatus, setCurrentStatus] = useState<'Confirmed' | 'Cancelled'>('Confirmed');

  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleDateInput, setRescheduleDateInput] = useState<string>(
    (booking.selectedDate || new Date()).toISOString().split('T')[0]
  );
  const [rescheduleTimeInput, setRescheduleTimeInput] = useState<string>(booking.selectedTime || '10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Patient requested schedule change');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('Patient requested cancellation');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [latestWhatsAppAction, setLatestWhatsAppAction] = useState<{
    type: 'BOOKING' | 'RESCHEDULE' | 'CANCEL';
    url: string;
    label: string;
    message: string;
  } | null>(null);

  const handleConfirmReschedule = async () => {
    if (!booking.bookingRef || !rescheduleDateInput || !rescheduleTimeInput) return;
    setIsSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.bookingRef)}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: rescheduleDateInput,
          time: rescheduleTimeInput,
          reason: rescheduleReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const newD = new Date(rescheduleDateInput);
        setCurrentDate(newD);
        setCurrentTime(rescheduleTimeInput);
        setCurrentStatus('Confirmed');
        rescheduleBookingInFirestore(booking.bookingRef, rescheduleDateInput, rescheduleTimeInput, rescheduleReason).catch(console.warn);
        
        const resText = generateWhatsAppReschedulePatientText({
          bookingRef: booking.bookingRef,
          patientName: `${patient.firstName} ${patient.lastName}`.trim() || 'Patient',
          doctorName: doctor.name,
          treatmentName: treatment.name,
          newDate: rescheduleDateInput,
          newTime: rescheduleTimeInput,
          clinicName: clinicProfile.name,
          clinicPhone: clinicProfile.phone,
          clinicAddress: branch?.address || clinicProfile.address,
          reason: rescheduleReason,
        });
        const resUrl = data.patientWhatsAppUrl || buildWhatsAppLink(patient.phone, resText);
        setLatestWhatsAppAction({
          type: 'RESCHEDULE',
          url: resUrl,
          label: `Rescheduled to ${rescheduleDateInput} at ${rescheduleTimeInput}`,
          message: data.patientWhatsAppMessage || resText,
        });

        setActionNotice(`Appointment rescheduled to ${rescheduleDateInput} at ${rescheduleTimeInput}! WhatsApp message prepared below.`);
        setTimeout(() => setActionNotice(null), 8000);
        setIsRescheduleModalOpen(false);
      } else {
        alert(data.error || 'Failed to reschedule appointment');
      }
    } catch (err) {
      alert('Network error while rescheduling.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!booking.bookingRef) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.bookingRef)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReasonInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentStatus('Cancelled');
        cancelBookingInFirestore(booking.bookingRef, cancelReasonInput).catch(console.warn);

        const canText = generateWhatsAppCancelPatientText({
          bookingRef: booking.bookingRef,
          patientName: `${patient.firstName} ${patient.lastName}`.trim() || 'Patient',
          doctorName: doctor.name,
          treatmentName: treatment.name,
          cancelledDate: currentDate.toISOString().split('T')[0],
          cancelledTime: currentTime,
          clinicName: clinicProfile.name,
          clinicPhone: clinicProfile.phone,
          reason: cancelReasonInput,
        });
        const canUrl = data.patientWhatsAppUrl || buildWhatsAppLink(patient.phone, canText);
        setLatestWhatsAppAction({
          type: 'CANCEL',
          url: canUrl,
          label: 'Appointment Cancelled',
          message: data.patientWhatsAppMessage || canText,
        });

        setActionNotice(`Appointment ${booking.bookingRef} cancelled. Chair slot released & WhatsApp cancellation message ready.`);
        setTimeout(() => setActionNotice(null), 8000);
        setIsCancelModalOpen(false);
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      alert('Network error while cancelling.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Lightweight canvas confetti celebration
  const triggerCelebrationConfetti = useCallback(() => {
    try {
      const count = 160;
      const defaults = {
        origin: { y: 0.65 },
        zIndex: 9999,
        disableForReducedMotion: true,
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      // Staggered multi-velocity burst with clinic brand palette
      fire(0.25, {
        spread: 32,
        startVelocity: 52,
        colors: ['#0284c7', '#10b981', '#6366f1', '#f59e0b', '#ec4899'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#38bdf8', '#34d399', '#818cf8', '#fbbf24', '#f43f5e'],
      });
      fire(0.35, {
        spread: 95,
        decay: 0.91,
        scalar: 0.85,
        colors: ['#0284c7', '#10b981', '#3b82f6', '#14b8a6'],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 26,
        decay: 0.92,
        scalar: 1.15,
        colors: ['#60a5fa', '#34d399', '#fcd34d'],
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#38bdf8', '#a78bfa', '#fcd34d'],
      });
    } catch (e) {
      console.debug('Confetti animation error:', e);
    }
  }, []);

  // Trigger celebration on initial mount when reaching SuccessStep
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerCelebrationConfetti();
    }, 180);

    return () => {
      clearTimeout(timer);
      try {
        confetti.reset();
      } catch {
        // ignore
      }
    };
  }, [triggerCelebrationConfetti]);

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

  const handleQuickPrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsQuickPrinting(true);
    setQuickPrintToast('Downloading official appointment slip (PDF)…');
    try {
      // 1. Immediately generate and download official PDF slip
      await downloadSlipPDF(booking, clinicProfile, 'a4');
      setQuickPrintToast('Appointment slip downloaded! (PDF)');

      // 2. Also trigger native print if browser supports it
      printSlipDirect(booking, clinicProfile, 'a4', false).catch(() => {});
    } catch (err) {
      console.error('Error generating PDF slip, trying HTML fallback:', err);
      try {
        downloadSlipHTML(booking, clinicProfile, 'a4');
        setQuickPrintToast('Appointment slip downloaded! (HTML)');
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setIsPrintModalOpen(true);
      }
    } finally {
      setTimeout(() => {
        setIsQuickPrinting(false);
        setQuickPrintToast(null);
      }, 3500);
    }
  };

  const formattedDate = currentDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = formatSlotTime(currentTime);

  const activeBooking: BookingState = {
    ...booking,
    selectedDate: currentDate,
    selectedTime: currentTime,
  };

  const fullName = `${patient.firstName} ${patient.lastName}`.trim();
  const patientCleanPhone = patient.phone ? cleanPhoneNumber(patient.phone) : '';
  const doctorCleanPhone = doctor?.phone ? cleanPhoneNumber(doctor.phone) : '919820155441';
  const patientReceiptMessage = generateWhatsAppReceiptText(activeBooking, clinicProfile);
  const doctorAlertMessage = generateWhatsAppDoctorAlertText(activeBooking, clinicProfile);

  const patientWhatsAppUrl = patientCleanPhone
    ? `https://api.whatsapp.com/send?phone=${patientCleanPhone}&text=${encodeURIComponent(patientReceiptMessage)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(patientReceiptMessage)}`;

  const doctorWhatsAppUrl = `https://api.whatsapp.com/send?phone=${doctorCleanPhone}&text=${encodeURIComponent(doctorAlertMessage)}`;

  useEffect(() => {
    if (!latestWhatsAppAction && patientReceiptMessage) {
      setLatestWhatsAppAction({
        type: 'BOOKING',
        url: patientWhatsAppUrl,
        label: 'Booking Confirmation Done',
        message: patientReceiptMessage,
      });
    }
  }, [patientWhatsAppUrl, patientReceiptMessage, latestWhatsAppAction]);

  return (
    <div>
      {/* 1. ON-SCREEN SIMPLE & SWEET CONFIRMATION VIEW */}
      <div className="text-center py-6 sm:py-8 max-w-xl mx-auto space-y-6 print:hidden">
        
        {/* Sweet Celebration Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center justify-center space-y-3"
        >
          <button
            type="button"
            onClick={triggerCelebrationConfetti}
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-8 ring-emerald-50 cursor-pointer group"
            title="Click to replay celebration!"
          >
            <Check className="w-10 h-10 stroke-[3] group-hover:scale-110 transition-transform" />
          </button>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
              Appointment Confirmed!
              <button
                type="button"
                onClick={triggerCelebrationConfetti}
                className="text-amber-500 hover:text-amber-600 p-1 rounded-full hover:bg-amber-50 transition-colors cursor-pointer"
                title="Celebrate again!"
              >
                <Sparkles className="w-5 h-5 animate-pulse" />
              </button>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 font-medium">
              We look forward to seeing you, <strong className="text-slate-900">{fullName || 'Valued Patient'}</strong>.
            </p>
          </div>

          {/* Clean Reference Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ref:</span>
            <span className="font-mono font-black text-sm text-blue-700 tracking-wide">{bookingRef}</span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="p-1 rounded-md text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              title="Copy Reference"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </motion.div>

        {/* SWEET APPOINTMENT SUMMARY CARD */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 text-left shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Appointment Summary</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
              {branch?.shortName || 'Main Clinic'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-500">Date & Time</span>
                <span className="font-bold text-slate-900 block text-sm">{formattedDate}</span>
                <span className="font-extrabold text-blue-600 block">{formattedTime}</span>
              </div>
            </div>

            {/* Doctor */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-500">Assigned Dentist</span>
                <span className="font-bold text-slate-900 block text-sm">{doctor.name}</span>
                <span className="text-slate-500 text-xs block">{doctor.spec}</span>
              </div>
            </div>

            {/* Treatment */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5 text-base">
                {treatment.icon || '🦷'}
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-500">Selected Treatment</span>
                <span className="font-bold text-slate-900 block">{treatment.name}</span>
                <span className="text-slate-500 text-xs">{treatment.dur} · {treatment.price}</span>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-500">Clinic Location</span>
                <span className="font-bold text-slate-900 block truncate">{branch?.name || clinicProfile.name}</span>
                <span className="text-slate-500 text-xs line-clamp-1">
                  {branch?.address || clinicProfile.address}
                </span>
              </div>
            </div>
          </div>

          {/* Helpful Arrival Tip */}
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Please arrive <strong>10 minutes early</strong> for standard check-in.</span>
            </div>
            <div className="font-bold text-slate-800 shrink-0 pl-2">
              {Number(patient.amountPaidNow || 0) > 0 ? (
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Advance Paid</span>
              ) : (
                <span className="text-slate-600">Pay at Counter</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Print Toast */}
        {quickPrintToast && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs animate-fade-in">
            <Check className="w-3.5 h-3.5 text-blue-600" />
            <span>{quickPrintToast}</span>
          </div>
        )}

        {/* Action Notice (Reschedule / Cancellation feedback) */}
        {actionNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* APPOINTMENT SLOT MANAGEMENT (Reschedule & Cancel for this booking) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-xs text-slate-800">Booking Management</span>
            </div>
            <span
              className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                currentStatus === 'Cancelled'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {currentStatus === 'Cancelled' ? '• Cancelled' : '• Active Booking'}
            </span>
          </div>

          {currentStatus === 'Cancelled' ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>This appointment has been cancelled.</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                The chair slot has been freed. If your plan has changed, you can pick a fresh date and time right away:
              </p>
              <button
                type="button"
                onClick={() => {
                  setRescheduleDateInput(new Date().toISOString().split('T')[0]);
                  setIsRescheduleModalOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reschedule & Reactivate Slot</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRescheduleDateInput(currentDate.toISOString().split('T')[0]);
                  setRescheduleTimeInput(currentTime);
                  setIsRescheduleModalOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Reschedule Slot</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelReasonInput('Patient schedule conflict');
                  setIsCancelModalOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 font-extrabold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Direct WhatsApp Instant Dispatch Box */}
          {latestWhatsAppAction && (
            <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl space-y-2 text-left mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 fill-[#25D366] text-[#25D366]" />
                  <span>WhatsApp Message Ready</span>
                </span>
                <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  {latestWhatsAppAction.type === 'BOOKING' && 'Booking Done'}
                  {latestWhatsAppAction.type === 'RESCHEDULE' && 'Rescheduled'}
                  {latestWhatsAppAction.type === 'CANCEL' && 'Cancelled'}
                </span>
              </div>
              <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                {latestWhatsAppAction.type === 'BOOKING' && 'Official appointment confirmation & receipt ready to dispatch.'}
                {latestWhatsAppAction.type === 'RESCHEDULE' && `Updated reschedule notice for ${formattedDate} at ${formattedTime} is prepared.`}
                {latestWhatsAppAction.type === 'CANCEL' && 'Official cancellation alert is prepared to send to patient.'}
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <a
                  href={latestWhatsAppAction.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs shadow-md shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <MessageSquare className="w-4 h-4 fill-white shrink-0" />
                  <span>
                    {latestWhatsAppAction.type === 'BOOKING' && 'Send Booking Done on WhatsApp'}
                    {latestWhatsAppAction.type === 'RESCHEDULE' && 'Send Reschedule on WhatsApp'}
                    {latestWhatsAppAction.type === 'CANCEL' && 'Send Cancellation on WhatsApp'}
                  </span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(latestWhatsAppAction.message);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="py-2.5 px-3 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SIMPLE PRIMARY ACTIONS (Sweet, Big, Clear) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          {/* WhatsApp Direct Open */}
          <a
            id="btn-whatsapp-open-direct"
            href={patientWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-sm shadow-md shadow-[#25D366]/20 active:scale-95 transition-all cursor-pointer text-center"
          >
            <MessageSquare className="w-4 h-4 fill-white shrink-0" />
            <span>Open WhatsApp Slip</span>
          </a>

          {/* Print Slip */}
          <button
            id="btn-print-summary"
            type="button"
            onClick={handleQuickPrint}
            disabled={isQuickPrinting}
            title="Download & print official appointment slip (PDF)"
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-sm shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            {isQuickPrinting ? (
              <Download className="w-4 h-4 text-blue-600 animate-bounce shrink-0" />
            ) : (
              <Printer className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors shrink-0" />
            )}
            <span>{isQuickPrinting ? 'Downloading Slip…' : 'Print Slip'}</span>
          </button>

          {/* Book Another Appointment */}
          <button
            id="btn-book-another"
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>Book Another</span>
          </button>
        </div>

        {/* COLLAPSIBLE MORE OPTIONS (Keeps page clean and sweet!) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors py-1 cursor-pointer"
          >
            <span>{showMoreOptions ? 'Hide extra options' : 'More options (Reschedule, Doctor Alert, Reception Desk)'}</span>
            {showMoreOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showMoreOptions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Reschedule / Cancel */}
                {onOpenPatientHistory && (
                  <button
                    type="button"
                    onClick={onOpenPatientHistory}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Manage / Reschedule</span>
                  </button>
                )}

                {/* Direct Doctor Alert */}
                <a
                  href={doctorWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-teal-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Send Doctor Alert</span>
                </a>

                {/* View Database / Excel */}
                {onOpenExcelModal && (
                  <button
                    type="button"
                    onClick={onOpenExcelModal}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel Records</span>
                  </button>
                )}
              </div>

              {/* AI Prep Reminders & Help Desk */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
                {onOpenSmartReminder && (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenSmartReminder({
                        bookingRef,
                        patientName: fullName || 'Valued Patient',
                        treatmentName: treatment.name,
                        doctorName: doctor.name,
                        appointmentDate:
                          selectedDate instanceof Date
                            ? selectedDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : String(selectedDate),
                        appointmentTime: formatSlotTime(selectedTime),
                        branchName: branch?.shortName || 'Main Clinic',
                        branchAddress: branch?.address || clinicProfile.address,
                        patientPhone: patient?.phone || '',
                        notes: booking.patient?.notes || '',
                      })
                    }
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>View AI Preparation Tips</span>
                  </button>
                )}

                {onOpenPatientResponseDesk && (
                  <button
                    type="button"
                    onClick={onOpenPatientResponseDesk}
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>AI Receptionist Desk</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await downloadSlipPDF(booking, clinicProfile, 'a4');
                  }}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
                  title="Download official PDF appointment slip"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Slip (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Detailed Print Preview</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* 2. DEDICATED PRINTABLE SLIP (Rendered cleanly during window.print()) */}
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
        booking={activeBooking}
        clinicProfile={clinicProfile}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
      />

      {/* Reschedule Modal Dialog */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-100 animate-scale-in text-left">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base">Reschedule Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduleModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-blue-900">
                  {booking.bookingRef} · {fullName}
                </div>
                <div className="text-blue-700">
                  Current: {formattedDate} at {formattedTime}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Appointment Date</label>
                <input
                  type="date"
                  value={rescheduleDateInput}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Time Slot</label>
                <select
                  value={rescheduleTimeInput}
                  onChange={(e) => setRescheduleTimeInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                >
                  {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'].map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Change in personal schedule"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                💡 Both you and Dr. {doctor.name} will receive updated confirmation details directly on WhatsApp.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={isSubmittingReschedule || !rescheduleDateInput || !rescheduleTimeInput}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingReschedule ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingReschedule ? 'Rescheduling…' : 'Confirm & Send WhatsApp'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal Dialog */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 animate-scale-in text-left">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base">Cancel Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-rose-900">
                  {booking.bookingRef} · {fullName}
                </div>
                <div className="text-rose-700">
                  {formattedDate} at {formattedTime} · {treatment.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  placeholder="e.g., Schedule conflict"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                ⚠️ Cancelling this visit will release the reserved clinic chair and automatically inform Dr. {doctor.name}.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Ban className={`w-3.5 h-3.5 ${isSubmittingCancel ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingCancel ? 'Cancelling…' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
