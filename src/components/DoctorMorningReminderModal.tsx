import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun,
  X,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Smartphone,
  Bell,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  User,
  Calendar,
  Sparkles,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Doctor, DoctorAgendaResponse, DoctorDailyAgendaItem } from '../types';
import { sendImmediatePushNotification, requestPushPermission } from '../utils/browserPush';

interface DoctorMorningReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicPhone?: string;
}

export const DoctorMorningReminderModal: React.FC<DoctorMorningReminderModalProps> = ({
  isOpen,
  onClose,
  clinicPhone = '+91 95270 50086',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<DoctorAgendaResponse | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isSendingAll, setIsSendingAll] = useState<boolean>(false);
  const [isSendingSingle, setIsSendingSingle] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [copiedDoctorId, setCopiedDoctorId] = useState<string | null>(null);
  const [pushSentDoctorId, setPushSentDoctorId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable morning settings
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);
  const [scheduleTime, setScheduleTime] = useState<string>('08:00');

  const fetchAgenda = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/doctor-agenda/today');
      if (!res.ok) throw new Error('Failed to load today’s doctor agenda');
      const json: DoctorAgendaResponse = await res.json();
      setData(json);
      setAutoEnabled(json.autoEnabled);
      setScheduleTime(json.scheduleTime || '08:00');

      if (!selectedDoctorId && json.agenda.length > 0) {
        // Default to doctor with most appointments or first doctor
        const sorted = [...json.agenda].sort((a, b) => b.appointmentCount - a.appointmentCount);
        setSelectedDoctorId(sorted[0].doctor.id);
      }
    } catch (err: any) {
      console.error('Error fetching doctor morning agenda:', err);
      setErrorMsg(err.message || 'Could not load morning agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgenda();
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4500);
  };

  const handleUpdateScheduleTime = async (newTime: string) => {
    setScheduleTime(newTime);
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/doctor-agenda/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyDoctorAgendaTime: newTime }),
      });
      if (res.ok) {
        showToast(`Morning reminder time updated to ${formatTimeString(newTime)}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleToggleAuto = async (enabled: boolean) => {
    setAutoEnabled(enabled);
    try {
      setIsSavingConfig(true);
      const res = await fetch('/api/doctor-agenda/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyDoctorAgendaEnabled: enabled }),
      });
      if (res.ok) {
        showToast(
          enabled
            ? `Daily morning auto-reminder activated for all doctors at ${formatTimeString(scheduleTime)}`
            : 'Daily morning auto-reminders paused'
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSendAllNow = async () => {
    try {
      setIsSendingAll(true);
      setErrorMsg(null);
      const res = await fetch('/api/doctor-agenda/send-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to dispatch agenda');
      showToast(resData.message || 'Morning schedules sent to all doctors via WhatsApp & SMS!');
      await fetchAgenda();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending morning reminders');
    } finally {
      setIsSendingAll(false);
    }
  };

  const handleSendSingleNow = async (doctor: Doctor) => {
    try {
      setIsSendingSingle(true);
      setErrorMsg(null);
      const res = await fetch('/api/doctor-agenda/send-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: doctor.id }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to dispatch reminder');
      showToast(`Morning schedule dispatched to ${doctor.name} via WhatsApp & SMS!`);
      await fetchAgenda();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending reminder');
    } finally {
      setIsSendingSingle(false);
    }
  };

  const handleCopySummary = (item: DoctorDailyAgendaItem) => {
    if (!item.formattedWhatsApp) return;
    navigator.clipboard.writeText(item.formattedWhatsApp);
    setCopiedDoctorId(item.doctor.id);
    showToast(`WhatsApp morning briefing for ${item.doctor.name} copied to clipboard!`);
    setTimeout(() => setCopiedDoctorId(null), 2500);
  };

  const handleSendPushToDoctor = async (item: DoctorDailyAgendaItem) => {
    try {
      await requestPushPermission();
      const firstApptTime = item.appointments[0]?.appointmentTime || 'None';
      const body =
        item.appointmentCount > 0
          ? `You have ${item.appointmentCount} patient(s) today. First appointment: ${firstApptTime}.`
          : `No patient appointments scheduled for today. Have a restful morning!`;

      await sendImmediatePushNotification(
        `☀️ Good Morning Dr. ${item.doctor.name}! 🦷`,
        body,
        {
          tag: `morning-agenda-${item.doctor.id}`,
        }
      );
      setPushSentDoctorId(item.doctor.id);
      showToast(`Morning desktop/mobile push alert sent for ${item.doctor.name}!`);
      setTimeout(() => setPushSentDoctorId(null), 3000);
    } catch (err) {
      console.error(err);
      showToast('Could not deliver push notification. Check browser permissions.');
    }
  };

  const selectedItem = data?.agenda.find((a) => a.doctor.id === selectedDoctorId) || data?.agenda[0];

  const formatTimeString = (timeStr: string) => {
    if (!timeStr) return '08:00 AM';
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* Top Banner Header */}
          <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 sm:px-8 py-5 text-white shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner">
                  <Sun className="w-7 h-7 text-amber-100 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">
                      Doctor Daily Morning Reminder & Schedule
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-white/25 text-white font-bold text-[10px] tracking-wide uppercase">
                      Every Day at Morning
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium mt-0.5">
                    Autonomous morning briefings sent directly to doctors on WhatsApp & SMS every morning
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Action Notification Toast Banner */}
          {actionSuccessMsg && (
            <div className="bg-emerald-600 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-600 text-white px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs shrink-0">
              <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Scrollable Body Container */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
            {/* 1. Autonomous Morning Automation Engine Status Card */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${autoEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <div>
                    <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>Daily Morning Auto-Reminder Engine</span>
                      {autoEnabled ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                          Active & Scheduled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Automatically compiles today's appointments and alerts every doctor with their morning agenda
                    </div>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  <span className="text-xs font-semibold text-slate-600">
                    {autoEnabled ? 'Auto-Send: ON' : 'Auto-Send: OFF'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleAuto(!autoEnabled)}
                    disabled={isSavingConfig}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        autoEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Time Configuration & Quick Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Every Morning Dispatch Time:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => handleUpdateScheduleTime(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-mono text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['07:30', '08:00', '08:30', '09:00'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleUpdateScheduleTime(preset)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                            scheduleTime === preset
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {formatTimeString(preset)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dispatch Status for Today */}
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      Today's Morning Status ({data?.date || 'Today'})
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      {data?.isDispatchedToday ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 inline text-emerald-600" /> Dispatched Today via WhatsApp & SMS
                        </span>
                      ) : (
                        <span className="text-amber-800 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 inline text-amber-600" /> Scheduled to fire at {formatTimeString(scheduleTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendAllNow}
                    disabled={isSendingAll || loading}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingAll ? 'animate-spin' : ''}`} />
                    <span>{isSendingAll ? 'Sending...' : 'Send All Doctors Now'}</span>
                  </button>
                </div>
              </div>

              {/* Supported Delivery Channels */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <span className="font-bold text-slate-700">Dispatched Via:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp Live Agenda
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <Smartphone className="w-3 h-3 text-blue-600" /> Direct SMS Briefing
                </span>
                <span className="inline-flex items-center gap-1.5 text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  <Bell className="w-3 h-3 text-purple-600" /> Desktop/Phone Push
                </span>
              </div>
            </div>

            {/* 2. Doctor Selector Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Doctor to Review Today's Morning Agenda:
                </h3>
                <button
                  type="button"
                  onClick={fetchAgenda}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {data?.agenda.map((item) => {
                  const isSelected = item.doctor.id === selectedDoctorId;
                  return (
                    <button
                      key={item.doctor.id}
                      type="button"
                      onClick={() => setSelectedDoctorId(item.doctor.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl shrink-0">{item.doctor.avatarIcon || '👨‍⚕️'}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800 truncate">
                            {item.doctor.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {item.doctor.spec}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-500 font-medium">Today's Appts:</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.appointmentCount > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.appointmentCount} patient{item.appointmentCount === 1 ? '' : 's'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Selected Doctor Agenda Detail & Actions */}
            {selectedItem && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Doctor Header Bar */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-inner">
                      {selectedItem.doctor.avatarIcon || '👨‍⚕️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">{selectedItem.doctor.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {selectedItem.doctor.spec}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {selectedItem.phone || clinicPhone}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">
                          {selectedItem.appointmentCount} patient appointment(s) today
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Specific Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Direct WhatsApp Send */}
                    {selectedItem.whatsappDirectUrl && (
                      <a
                        href={selectedItem.whatsappDirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Open WhatsApp Web or App with this formatted morning reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Open in WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    )}

                    {/* Instant Server Dispatch */}
                    <button
                      type="button"
                      onClick={() => handleSendSingleNow(selectedItem.doctor)}
                      disabled={isSendingSingle}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Trigger autonomous server dispatch via WhatsApp & SMS to this doctor"
                    >
                      <Send className={`w-3.5 h-3.5 ${isSendingSingle ? 'animate-spin' : ''}`} />
                      <span>{isSendingSingle ? 'Sending...' : 'Send to Doctor'}</span>
                    </button>

                    {/* Push Notification */}
                    <button
                      type="button"
                      onClick={() => handleSendPushToDoctor(selectedItem)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Send local browser push reminder to screen"
                    >
                      <Bell className="w-3.5 h-3.5 text-purple-600" />
                      <span>{pushSentDoctorId === selectedItem.doctor.id ? 'Push Sent!' : 'Push Alert'}</span>
                    </button>

                    {/* Copy WhatsApp Message */}
                    <button
                      type="button"
                      onClick={() => handleCopySummary(selectedItem)}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                      title="Copy formatted WhatsApp agenda text"
                    >
                      {copiedDoctorId === selectedItem.doctor.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Patient Schedule List */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Today's Scheduled Patients:</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {selectedItem.appointmentCount === 0
                        ? 'Zero appointments scheduled'
                        : `${selectedItem.appointmentCount} active appointment(s)`}
                    </span>
                  </div>

                  {selectedItem.appointments.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200/60 text-center space-y-2">
                      <Sun className="w-8 h-8 text-amber-500 mx-auto opacity-75" />
                      <div className="text-sm font-bold text-slate-800">
                        No appointments booked for {selectedItem.doctor.name} today
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        The doctor receives a relaxed morning greeting: <em>"Good morning Dr. {selectedItem.doctor.name}! You have 0 appointments scheduled for today. Have a smooth, productive clinical day!"</em>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedItem.appointments.map((appt, idx) => (
                        <div
                          key={appt.bookingRef || idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {appt.patientName || `${appt.firstName || ''} ${appt.lastName || ''}`.trim()}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                                  {appt.appointmentTime}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({appt.bookingRef})
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-slate-700">{appt.treatmentName}</span>
                                {appt.treatmentDuration && <span>• {appt.treatmentDuration}</span>}
                                {appt.branchName && (
                                  <span className="text-slate-500">• 📍 {appt.branchName}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {appt.phone && (
                              <a
                                href={`tel:${appt.phone}`}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:text-blue-600 flex items-center gap-1.5 transition-all"
                              >
                                <Phone className="w-3 h-3 text-blue-600" />
                                <span>{appt.phone}</span>
                              </a>
                            )}
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              Confirmed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* WhatsApp Message Preview */}
                  {selectedItem.formattedWhatsApp && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          Live WhatsApp Message Format (Sent to Doctor):
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopySummary(selectedItem)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          Copy Text
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner select-all">
                        {selectedItem.formattedWhatsApp}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Automatic daily morning reminders guarantee zero missed appointments and doctor alignment.
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSendAllNow}
                disabled={isSendingAll || loading}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sun className={`w-3.5 h-3.5 ${isSendingAll ? 'animate-spin' : ''}`} />
                <span>{isSendingAll ? 'Dispatching...' : 'Dispatch All Morning Reminders'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
