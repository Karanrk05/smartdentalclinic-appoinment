import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Laptop,
  Smartphone,
  Send,
  CalendarCheck,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import {
  isPushSupported,
  getPushPermissionState,
  requestPushPermission,
  sendImmediatePushNotification,
  scheduleTestPushReminder,
  scheduleAppointmentPushReminders,
  getScheduledPushReminders,
  ScheduledPushReminder,
  PushPermissionState,
  registerPushSubscriptionWithServer,
} from '../utils/browserPush';

interface BrowserPushReminderCardProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  onPermissionChanged?: (state: PushPermissionState) => void;
}

export const BrowserPushReminderCard: React.FC<BrowserPushReminderCardProps> = ({
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onPermissionChanged,
}) => {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [testTriggered, setTestTriggered] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scheduledList, setScheduledList] = useState<ScheduledPushReminder[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const { bookingRef, patient, doctor, treatment, selectedDate, selectedTime } = booking;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim() || 'Patient';

  // Check support and permissions on mount
  useEffect(() => {
    const isSupp = isPushSupported();
    setSupported(isSupp);
    if (isSupp) {
      const perm = getPushPermissionState();
      setPermission(perm);
      if (onPermissionChanged) onPermissionChanged(perm);
    }
    setIsMobile(/mobile|android|iphone|ipad/i.test(navigator.userAgent));

    // Load any existing scheduled reminders for this booking
    if (bookingRef) {
      const list = getScheduledPushReminders(bookingRef);
      setScheduledList(list);
    }
  }, [bookingRef]);

  // If permission is granted, automatically schedule reminders if not already scheduled
  useEffect(() => {
    if (permission === 'granted' && bookingRef && selectedDate && selectedTime) {
      const created = scheduleAppointmentPushReminders(booking, clinicProfile);
      setScheduledList(getScheduledPushReminders(bookingRef));
      // Register subscription with server
      registerPushSubscriptionWithServer({
        name: fullName,
        phone: patient.phone,
        bookingRef,
      });
    }
  }, [permission, bookingRef, selectedDate, selectedTime]);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const state = await requestPushPermission();
      setPermission(state);
      if (onPermissionChanged) onPermissionChanged(state);

      if (state === 'granted') {
        // Send a friendly greeting notification
        await sendImmediatePushNotification(
          '🦷 SmartDental Push Reminders Active!',
          `Appointment reminders for ${fullName} with ${doctor?.name || 'Dr. Vikram Shah'} will pop up on your screen as a fallback to SMS/WhatsApp.`,
          { bookingRef }
        );
        // Schedule appointment milestones
        scheduleAppointmentPushReminders(booking, clinicProfile);
        setScheduledList(getScheduledPushReminders(bookingRef));
        registerPushSubscriptionWithServer({
          name: fullName,
          phone: patient.phone,
          bookingRef,
        });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTriggerTestPush = () => {
    if (permission !== 'granted') {
      handleRequestPermission();
      return;
    }

    setTestTriggered(true);
    setCountdown(5);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          scheduleTestPushReminder(
            bookingRef || 'TEST-REF',
            1,
            `🦷 SmartDental Reminder (#${bookingRef})`,
            `Upcoming ${treatment?.name || 'Dental Checkup'} with ${doctor?.name || 'Dr. Vikram Shah'}. Arrive 10m early!`
          );
          setTimeout(() => {
            setTestTriggered(false);
            setCountdown(null);
            if (bookingRef) {
              setScheduledList(getScheduledPushReminders(bookingRef));
            }
          }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/70 border-2 border-indigo-200/80 rounded-2xl p-4 sm:p-5 text-left shadow-sm space-y-3.5">
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Bell className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-[#0f172a] tracking-tight">
                Browser Push Reminders
              </span>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                {isMobile ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
                {isMobile ? 'Mobile' : 'Desktop'} Fallback
              </span>
            </div>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Native system alerts that pop up on your screen if WhatsApp or SMS fails or is delayed.
            </p>
          </div>
        </div>

        {/* Live Permission Badge */}
        <div className="shrink-0">
          {permission === 'granted' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Active
            </span>
          ) : permission === 'denied' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Blocked in Browser
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Not Enabled
            </span>
          )}
        </div>
      </div>

      {/* Permission Call to Action or Confirmation */}
      {permission !== 'granted' ? (
        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 space-y-2 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-[#0f172a] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Never Miss Your Dental Slot
              </div>
              <p className="text-[11px] text-[#64748b] leading-relaxed">
                Allow browser push notifications to receive 24h & 2h appointment reminders directly on this {isMobile ? 'phone' : 'computer'}.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer min-h-[38px]"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Enable Push Reminders
                </>
              )}
            </button>
          </div>

          {permission === 'denied' && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 leading-snug">
              ⚠️ Notifications are blocked in your browser settings. To enable, click the lock icon next to the website address bar and toggle &quot;Notifications&quot; to &quot;Allow&quot;.
            </div>
          )}
        </div>
      ) : (
        /* Granted State: Controls and Milestones */
        <div className="space-y-2.5">
          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 border border-indigo-100 rounded-xl p-2.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-bold text-[#0f172a] text-[11px]">
                {isMobile ? 'Mobile' : 'Desktop'} Lockscreen Push Engine
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTriggerTestPush}
                disabled={testTriggered}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Fire a sample push notification on your device screen"
              >
                <Send className="w-3 h-3 text-indigo-600" />
                <span>
                  {testTriggered
                    ? `Firing in ${countdown}s...`
                    : 'Send Test Push to My Screen (5s)'}
                </span>
              </button>
            </div>
          </div>

          {/* Scheduled Milestones */}
          <div className="bg-white/80 border border-indigo-100 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#334155]">
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                Scheduled Browser Push Alerts for #{bookingRef}:
              </span>
              <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.2 rounded">
                Auto-Synced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-[#0f172a]">24 Hours Prior</div>
                  <div className="text-[10px] text-[#64748b]">Appointment overview &amp; schedule reminder</div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-[#0f172a]">2 Hours Prior</div>
                  <div className="text-[10px] text-[#64748b]">Clinic address, route &amp; prep alert</div>
                </div>
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-[#0f172a]">15 Mins Early</div>
                  <div className="text-[10px] text-[#64748b]">Arrival &amp; vitals check-in reminder</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
