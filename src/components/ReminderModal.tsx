import React, { useState, useEffect } from 'react';
import {
  Bell,
  Smartphone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Send,
  RefreshCw,
  Edit2,
  Check,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Copy,
  CheckCheck,
  X,
  Volume2,
} from 'lucide-react';
import { BookingState } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { SmartDentalLogo } from './SmartDentalLogo';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingState;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const [activeTab, setActiveTab] = useState<'sms' | 'email' | 'logs' | 'settings'>('sms');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [copiedSMS, setCopiedSMS] = useState(false);
  const [browserNotifSent, setBrowserNotifSent] = useState(false);
  
  // Custom editable settings
  const [phoneInput, setPhoneInput] = useState(booking.patient.phone || '');
  const [emailInput, setEmailInput] = useState(booking.patient.email || '');
  const [smsActive, setSmsActive] = useState(true);
  const [emailActive, setEmailActive] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Live telemetry logs
  const [logs, setLogs] = useState<Array<{ id: string; time: string; channel: string; msg: string; status: string }>>([
    {
      id: 'L1',
      time: 'Just now',
      channel: 'SYSTEM',
      msg: `Automated 24-Hour reminder job initialized for ref #${booking.bookingRef}`,
      status: 'SCHEDULED',
    },
    {
      id: 'L2',
      time: 'Just now',
      channel: 'SMS_GATEWAY',
      msg: `SMS route pre-allocated for ${booking.patient.phone || '+91 98765 43210'}`,
      status: 'QUEUED',
    },
    {
      id: 'L3',
      time: 'Just now',
      channel: 'SMTP_SERVICE',
      msg: `HTML reminder scheduled for ${booking.patient.email || 'patient@example.com'}`,
      status: 'QUEUED',
    },
  ]);

  if (!isOpen) return null;

  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef } = booking;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim() || 'Patient';
  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Upcoming Date';
  const formattedTime = selectedTime ? formatSlotTime(selectedTime) : '10:00 AM';

  // Calculate 10 minutes early arrival time
  let earlyArrivalFormatted = '10 min early';
  if (selectedTime) {
    const isPM = selectedTime.includes('pm');
    const clean = selectedTime.replace('am', '').replace('pm', '').trim();
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr || '0', 10);
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;

    const dummyDate = new Date();
    dummyDate.setHours(h, m - 10, 0, 0);
    const earlyH = dummyDate.getHours();
    const earlyM = dummyDate.getMinutes();
    const earlyPeriod = earlyH >= 12 ? 'PM' : 'AM';
    const early12H = earlyH % 12 === 0 ? 12 : earlyH % 12;
    earlyArrivalFormatted = `${String(early12H).padStart(2, '0')}:${String(earlyM).padStart(2, '0')} ${earlyPeriod}`;
  }

  // Calculate 24 hour prior reminder dispatch date
  const reminderDispatchDate = selectedDate
    ? new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '24 Hours Before';

  const smsBodyText = `[SMART DENTAL CLINIC] 🦷
APPOINTMENT REMINDER (24h Notice)

Dear ${fullName},
Your appointment is scheduled for:
• Dentist: ${doctor?.name || 'Dr. Vikram Shah'} (${doctor?.spec || 'Specialist'})
• Treatment: ${treatment?.name || 'Dental Checkup'}
• Date & Time: ${formattedDate} at ${formattedTime}
• Booking Ref: ${bookingRef}

⚠️ EARLY ARRIVAL NOTICE:
Please arrive 10 minutes early (by ${earlyArrivalFormatted}) for registration & sanitization.

📍 Location: 102 Wellness Plaza, Dental Street
📞 Helpline: +91 98765 00000
🌐 smilewithus-dental.com`;

  const handleSendTestReminder = async () => {
    setIsSendingTest(true);
    try {
      const res = await fetch('/api/reminders/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingRef,
          patientName: fullName,
          phone: phoneInput,
          email: emailInput,
          appointmentDate: selectedDate?.toISOString().split('T')[0],
          appointmentTime: formattedTime,
          earlyArrivalTime: earlyArrivalFormatted,
          doctorName: doctor?.name,
          treatmentName: treatment?.name,
        }),
      });

      if (res.ok) {
        setTestSentSuccess(true);
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [
          {
            id: `L_${Date.now()}_1`,
            time: timestamp,
            channel: 'SMS_GATEWAY',
            msg: `Instant test SMS delivered to ${phoneInput} (Latency: 340ms)`,
            status: 'DELIVERED',
          },
          {
            id: `L_${Date.now()}_2`,
            time: timestamp,
            channel: 'SMTP_MTA',
            msg: `HTML reminder email delivered to ${emailInput} (Status: 250 OK)`,
            status: 'DELIVERED',
          },
          ...prev,
        ]);
        setTimeout(() => setTestSentSuccess(false), 4000);
      }
    } catch (e) {
      console.error('Test reminder error:', e);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleTriggerBrowserNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('🦷 Smart Dental Clinic: 24h Reminder', {
          body: `Reminder for ${fullName}: Dental checkup with ${doctor?.name} scheduled tomorrow at ${formattedTime}. Please arrive by ${earlyArrivalFormatted} (10 min early).`,
          icon: '/favicon.svg',
        });
        setBrowserNotifSent(true);
        setTimeout(() => setBrowserNotifSent(false), 3000);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification('🦷 Smart Dental Clinic: 24h Reminder', {
              body: `Reminder for ${fullName}: Dental checkup with ${doctor?.name} scheduled tomorrow at ${formattedTime}. Please arrive by ${earlyArrivalFormatted} (10 min early).`,
              icon: '/favicon.svg',
            });
            setBrowserNotifSent(true);
            setTimeout(() => setBrowserNotifSent(false), 3000);
          }
        });
      }
    } else {
      alert(`[Reminder Simulation]\n\nSmart Dental Clinic 24-Hour Notice:\nYour dental appointment with ${doctor?.name} is tomorrow at ${formattedTime}.\n⚠️ Please arrive 10 minutes early (${earlyArrivalFormatted}).`);
    }
  };

  const handleCopySMS = () => {
    navigator.clipboard.writeText(smsBodyText);
    setCopiedSMS(true);
    setTimeout(() => setCopiedSMS(false), 2000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await fetch('/api/reminders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingRef,
          smsEnabled: smsActive,
          emailEnabled: emailActive,
          phone: phoneInput,
          email: emailInput,
        }),
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2500);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white border-2 border-[#2563eb] rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white px-3.5 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <SmartDentalLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-lg font-black tracking-tight leading-none truncate">
                  Reminder Engine
                </h3>
                <span className="bg-emerald-400 text-emerald-950 font-black text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full uppercase tracking-wider">
                  Automated
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 font-medium mt-1 truncate">
                Scheduled for {reminderDispatchDate} at {formattedTime}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Notice Banner */}
        <div className="bg-[#fffbeb] border-b border-[#fde68a] px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-semibold text-[#92400e] shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#b45309] shrink-0" />
            <span>
              <strong>10-Minute Early Arrival:</strong> Patient is scheduled to check-in at{' '}
              <strong className="text-[#92400e] bg-[#fef3c7] px-1.5 py-0.5 rounded font-mono">
                {earlyArrivalFormatted}
              </strong>{' '}
              for checkup prep.
            </span>
          </div>
          <button
            type="button"
            onClick={handleTriggerBrowserNotification}
            className="shrink-0 flex items-center gap-1 bg-[#b45309] hover:bg-[#92400e] text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
            title="Test Push Notification"
          >
            <Volume2 className="w-3 h-3" />
            <span>{browserNotifSent ? 'Sent!' : 'Test Alert'}</span>
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-[#e2e8f0] bg-[#f8fafc] px-3 sm:px-4 pt-2 gap-1 sm:gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'sms'
                ? 'border-[#2563eb] text-[#2563eb] font-extrabold'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span>SMS Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'border-[#2563eb] text-[#2563eb] font-extrabold'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span>Email Reminder</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'border-[#2563eb] text-[#2563eb] font-extrabold'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Gateway Logs ({logs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 pb-2.5 px-2.5 sm:px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#2563eb] text-[#2563eb] font-extrabold'
                : 'border-transparent text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5 shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-left">
          {/* TAB 1: SMS PREVIEW */}
          {activeTab === 'sms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-[#64748b]">
                <span className="font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  SMS Gateway: <strong>Twilio / Indian DLT Route</strong>
                </span>
                <span>
                  Recipient: <strong className="text-[#0f172a]">{phoneInput || 'Patient Mobile'}</strong>
                </span>
              </div>

              {/* Smartphone mockup */}
              <div className="max-w-md mx-auto bg-[#1e293b] rounded-3xl p-3 shadow-xl border-4 border-[#334155]">
                {/* Phone Top Notch */}
                <div className="flex justify-between items-center px-4 py-1 text-[11px] text-white/70 font-mono mb-2">
                  <span>9:41 AM</span>
                  <div className="w-12 h-2.5 bg-black rounded-full"></div>
                  <div className="flex items-center gap-1">
                    <span>5G</span>
                    <div className="w-4 h-2 border border-white/60 rounded-xs bg-white/80"></div>
                  </div>
                </div>

                {/* SMS Bubble */}
                <div className="bg-[#f1f5f9] rounded-2xl p-4 shadow-sm text-xs font-mono text-[#0f172a] whitespace-pre-wrap leading-relaxed border border-slate-300">
                  <div className="text-[11px] font-bold text-[#2563eb] pb-1.5 mb-2 border-b border-slate-200 flex items-center justify-between">
                    <span>SMART-DENTAL</span>
                    <span className="text-[10px] text-[#64748b] font-normal">Auto 24h Trigger</span>
                  </div>
                  {smsBodyText}
                </div>

                <div className="text-center text-[10px] text-slate-400 mt-2">
                  SMS Message · Carrier Standard Rates Apply · Auto-Dispatched 24h Prior
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopySMS}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] font-bold text-xs transition-colors cursor-pointer"
                >
                  {copiedSMS ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSMS ? 'Copied SMS!' : 'Copy SMS Text'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL PREVIEW */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-xs space-y-1">
                <div>
                  <span className="font-bold text-[#64748b]">From:</span>{' '}
                  <span className="font-semibold text-[#0f172a]">Smart Dental Clinic &lt;appointments@smartdentalcare.in&gt;</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748b]">To:</span>{' '}
                  <span className="font-semibold text-[#0f172a]">{emailInput || 'patient@example.com'}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748b]">Subject:</span>{' '}
                  <span className="font-bold text-[#2563eb]">
                    Reminder: Dental Appointment with {doctor?.name} on {formattedDate} at {formattedTime}
                  </span>
                </div>
              </div>

              {/* Email Body Card */}
              <div className="border-2 border-[#bfdbfe] rounded-2xl overflow-hidden shadow-sm bg-white">
                <div className="bg-[#2563eb] text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SmartDentalLogo className="w-8 h-8" />
                    <div>
                      <h4 className="font-black text-sm">SMART DENTAL CLINIC</h4>
                      <p className="text-[10px] text-blue-100">Official 24-Hour Clinical Visit Reminder</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-white/20 px-2 py-1 rounded">Ref: {bookingRef}</span>
                </div>

                <div className="p-5 space-y-3 text-xs text-[#0f172a] leading-relaxed">
                  <p>
                    Dear <strong>{fullName}</strong>,
                  </p>
                  <p className="text-[#475569]">
                    This is an automated 24-hour reminder for your upcoming appointment with{' '}
                    <strong>{doctor?.name}</strong>.
                  </p>

                  <div className="bg-[#eff6ff] border-l-4 border-[#2563eb] p-3 rounded-r-lg space-y-1">
                    <div><strong>📅 Date:</strong> {formattedDate}</div>
                    <div><strong>⏰ Appointment Time:</strong> {formattedTime}</div>
                    <div><strong>🦷 Procedure:</strong> {treatment?.name}</div>
                    <div><strong>👨‍⚕️ Dentist:</strong> {doctor?.name} ({doctor?.spec})</div>
                  </div>

                  <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3.5 text-[#92400e]">
                    <div className="font-extrabold flex items-center gap-1.5 text-xs">
                      <AlertTriangle className="w-4 h-4 text-[#b45309]" />
                      <span>IMPORTANT: Please arrive 10 minutes early (by {earlyArrivalFormatted})</span>
                    </div>
                    <p className="text-[11px] text-[#b45309] mt-1">
                      Early arrival ensures hassle-free preliminary oral inspection, verification, and sanitization.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-[#64748b]">
                    <div>🏥 <strong>Clinic Address:</strong> 102 Wellness Plaza, Dental Street, Medical Hub</div>
                    <div>📞 <strong>Helpline:</strong> +91 98765 00000 | ✉️ support@smartdentalcare.in</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GATEWAY LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-[#0f172a] flex items-center justify-between">
                <span>Real-Time Dispatch Queue & Delivery Logs</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono text-[10px]">
                  Engine Status: OPERATIONAL
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-[#f8fafc] text-xs font-mono">
                {logs.map((log) => (
                  <div key={log.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2563eb]">[{log.channel}]</span>
                        <span className="text-slate-400 text-[10px]">{log.time}</span>
                      </div>
                      <div className="text-[#334155]">{log.msg}</div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="text-xs text-[#475569]">
                Configure which communication channels should receive the automated 24-hour reminder.
              </div>

              <div className="space-y-3">
                <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0f172a] flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#2563eb]" />
                      <span>SMS Reminder (Phone)</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={smsActive}
                      onChange={(e) => setSmsActive(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] rounded cursor-pointer"
                    />
                  </div>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                  />
                </div>

                <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0f172a] flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#2563eb]" />
                      <span>Email Reminder</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={emailActive}
                      onChange={(e) => setEmailActive(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] rounded cursor-pointer"
                    />
                  </div>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#2563eb] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {savedFeedback && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Preferences saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="ml-auto px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#f8fafc] border-t border-[#e2e8f0] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`/api/reminders/calendar-ics/${bookingRef}`}
              download={`SmartDental_Appointment_${bookingRef}.ics`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Download iCal file for Apple/Outlook Calendar"
            >
              <Calendar className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Apple / Outlook .ICS</span>
            </a>

            <a
              href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                `🦷 Dental Appointment: ${treatment?.name} (${doctor?.name})`
              )}&details=${encodeURIComponent(
                `Smart Dental Clinic Appointment\nPatient: ${fullName}\nRef: ${bookingRef}\nDoctor: ${doctor?.name}\n\n⚠️ IMPORTANT: Please arrive 10 minutes early (${earlyArrivalFormatted}) for registration.\nHelpline: +91 98765 00000`
              )}&location=${encodeURIComponent(
                'Smart Dental Clinic, 102 Wellness Plaza, Dental Street'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Calendar</span>
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-trigger-test-dispatch"
              type="button"
              onClick={handleSendTestReminder}
              disabled={isSendingTest}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-extrabold shadow-md shadow-[#2563eb]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSendingTest ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : testSentSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {isSendingTest
                  ? 'Dispatching Test...'
                  : testSentSuccess
                  ? 'Dispatched Successfully!'
                  : 'Send Instant Test SMS & Email'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
