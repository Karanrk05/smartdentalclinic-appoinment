import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Bell,
  Copy,
  Check,
  Share2,
  Calendar,
  Clock,
  MapPin,
  Stethoscope,
  Info,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { ClinicProfile } from '../types';

export interface SmartReminderData {
  bookingRef: string;
  patientName: string;
  treatmentName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  branchName: string;
  branchAddress: string;
  patientPhone?: string;
  notes?: string;
}

interface SmartReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicProfile: ClinicProfile;
  appointment: SmartReminderData | null;
}

export const SmartReminderModal: React.FC<SmartReminderModalProps> = ({
  isOpen,
  onClose,
  clinicProfile,
  appointment,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [whatsappReminder, setWhatsappReminder] = useState('');
  const [smsReminder, setSmsReminder] = useState('');
  const [prepTips, setPrepTips] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      fetchSmartReminder();
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const fetchSmartReminder = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/smart-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingRef: appointment.bookingRef,
          patientName: appointment.patientName,
          treatmentName: appointment.treatmentName,
          doctorName: appointment.doctorName,
          appointmentDate: appointment.appointmentDate,
          appointmentTime: appointment.appointmentTime,
          branchName: appointment.branchName,
          branchAddress: appointment.branchAddress,
          notes: appointment.notes || '',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setWhatsappReminder(data.whatsappReminder);
        setSmsReminder(data.smsReminder);
        setPrepTips(data.prepTips || []);
      }
    } catch (err) {
      console.error('Failed to load smart reminder:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const text = activeTab === 'whatsapp' ? whatsappReminder : smsReminder;
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappReminder) return;
    const cleanPhone = (appointment.patientPhone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(whatsappReminder);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                  Smart Appointment Reminder
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI Tailored
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium truncate">
                Procedure-specific preparation & reassuring patient notification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            title="Close reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {/* Appointment Snapshot */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-slate-900">{appointment.patientName}</span>
              <span className="text-slate-400 mx-1.5">·</span>
              <span className="font-semibold text-blue-600">{appointment.treatmentName}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 font-medium">
              <span>{appointment.appointmentDate} at {appointment.appointmentTime}</span>
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                {appointment.bookingRef}
              </span>
            </div>
          </div>

          {/* Procedure Prep Highlights */}
          {prepTips.length > 0 && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>AI Procedure-Specific Preparation Tips</span>
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-800 font-medium pl-1">
                {prepTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Channel Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                WhatsApp Format (Detailed)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sms')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'sms'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                SMS Format (Compact)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
              {activeTab === 'whatsapp' && (
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Send on WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Preview Box */}
          <div className="relative">
            {isLoading ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 bg-white rounded-xl border border-slate-200">
                <Sparkles className="w-6 h-6 text-emerald-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Generating smart customized reminder...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans select-text">
                {activeTab === 'whatsapp' ? whatsappReminder : smsReminder}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
