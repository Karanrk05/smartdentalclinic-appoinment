import React, { useState } from 'react';
import { BellRing, Calendar, Clock, User, Phone, Mail, CheckCircle2, ShieldCheck, ArrowRight, X, ExternalLink, Zap, Stethoscope, Building2 } from 'lucide-react';
import { Doctor, Treatment, ClinicBranch, WaitlistEntry } from '../types';
import { formatSlotTime } from '../utils/slotManager';

interface JoinWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: string | null;
  selectedDate: Date | null;
  selectedDoctor: Doctor;
  selectedTreatment: Treatment;
  branch?: ClinicBranch | null;
  onSuccess?: (entry: WaitlistEntry, whatsappUrl: string) => void;
}

export const JoinWaitlistModal: React.FC<JoinWaitlistModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
  selectedDate,
  selectedDoctor,
  selectedTreatment,
  branch,
  onSuccess,
}) => {
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    entry: WaitlistEntry;
    whatsappUrl: string;
    message: string;
  } | null>(null);

  if (!isOpen || !selectedSlot || !selectedDate) return null;

  const dateFormatted = selectedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const dateStr = selectedDate.toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = patientName.trim();
    const cleanPhone = patientPhone.replace(/[^0-9]/g, '');

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit WhatsApp mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: cleanName,
          patientPhone: cleanPhone.length === 10 ? `+91 ${cleanPhone}` : patientPhone.trim(),
          patientEmail: patientEmail.trim(),
          date: dateStr,
          dateFormatted,
          timeSlot: selectedSlot,
          doctorName: selectedDoctor.name,
          doctorId: selectedDoctor.id,
          treatmentName: selectedTreatment.name,
          treatmentId: selectedTreatment.id,
          branchName: branch?.name || 'Smart Dental Clinic – Downtown Central (Main)',
          branchId: branch?.id || 'branch-1',
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register on waitlist');
      }

      // Record in local storage for slot badge persistence
      try {
        const storedKey = 'sdc_user_waitlist_slots';
        const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
        const key = `${dateStr}_${selectedSlot}_${selectedDoctor.id}`;
        if (!existing.includes(key)) {
          existing.push(key);
          localStorage.setItem(storedKey, JSON.stringify(existing));
        }
      } catch (err) {}

      setSuccessResult({
        entry: data.data,
        whatsappUrl: data.whatsappUrl,
        message: data.message,
      });

      if (onSuccess) {
        onSuccess(data.data, data.whatsappUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccessResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="waitlist-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-amber-100">
                  Automated Slot Alert
                </span>
              </div>
              <h3 id="waitlist-modal-title" className="text-base sm:text-lg font-black text-white mt-0.5 tracking-tight">
                Join Priority Waitlist
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close waitlist modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {successResult ? (
            /* Success confirmation screen */
            <div className="text-center py-4 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">You're on the Waitlist!</h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-md mx-auto">
                  We'll automatically send an instant <strong>WhatsApp notification</strong> the moment this slot opens up due to a cancellation or schedule adjustment.
                </p>
              </div>

              {/* Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs space-y-1.5 font-medium text-slate-700">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Waitlisted Slot:</span>
                  <span className="font-extrabold text-blue-700 text-sm">
                    {formatSlotTime(selectedSlot)} · {dateFormatted}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Doctor:</span>
                  <span className="font-bold text-slate-800">{selectedDoctor.name}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">WhatsApp Alert Number:</span>
                  <span className="font-bold text-emerald-700">{successResult.entry.patientPhone}</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Status:</span>
                  <span className="inline-flex items-center gap-1 font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                    AUTONOMOUS MONITOR ACTIVE
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                {successResult.whatsappUrl && (
                  <a
                    href={successResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20ba59] transition-colors shadow-sm"
                  >
                    <span>View / Test WhatsApp Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Slot Target Banner */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-extrabold text-amber-950">
                    Slot currently booked: {formatSlotTime(selectedSlot)}
                  </span>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    {dateFormatted} with <strong>{selectedDoctor.name}</strong> ({selectedTreatment.name}).
                  </p>
                </div>
              </div>

              {/* Feature highlight bullet points */}
              <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  <span>How Automated WhatsApp Notifications Work:</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc font-medium">
                  <li>If another patient cancels or reschedules, this slot is freed instantly.</li>
                  <li>Our server triggers an immediate WhatsApp message with a 1-tap booking link.</li>
                  <li>First-come, first-served allocation guarantees you never miss a cancelled spot!</li>
                </ul>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-lg text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Input: Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Patient Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>

              {/* Input: WhatsApp Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp Number (for instant alert) *</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    WhatsApp Primed
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="98765 43210"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-xs font-medium pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  We will send the notification directly to this WhatsApp number. No marketing spam.
                </p>
              </div>

              {/* Input: Email (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>Email Address (Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="rahul@example.com"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>

              {/* Input: Notes (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Special Notes / Preferred window (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Can also take 10:30 AM if open"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.99] disabled:opacity-50 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Registering Alert...</span>
                  ) : (
                    <>
                      <BellRing className="w-3.5 h-3.5" />
                      <span>Register for WhatsApp Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
