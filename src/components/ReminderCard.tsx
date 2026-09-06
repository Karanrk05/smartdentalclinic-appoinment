import React from 'react';
import {
  Bell,
  Smartphone,
  Mail,
  Clock,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';

interface ReminderCardProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
}) => {
  const { selectedDate, selectedTime, patient, doctor, treatment, bookingRef } = booking;
  const fullName = `${patient.firstName} ${patient.lastName}`.trim() || 'Patient';
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

  // 24 hours prior date
  const reminderDateStr = selectedDate
    ? new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '24 Hours Before';

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `🦷 Dental Checkup: ${treatment?.name} (${doctor?.name})`
  )}&details=${encodeURIComponent(
    `${clinicProfile.name} Appointment Reminder\n\nPatient: ${fullName}\nDoctor: ${doctor?.name} (${doctor?.spec})\nBooking Ref: #${bookingRef}\n\n⚠️ IMPORTANT: Please arrive 10 minutes early (by ${earlyArrivalFormatted}) for registration & check-in.\nHelpline: ${clinicProfile.phone}\nLocation: ${clinicProfile.address}`
  )}&location=${encodeURIComponent(
    `${clinicProfile.name}, ${clinicProfile.address}`
  )}`;

  return (
    <div className="max-w-lg mx-auto bg-gradient-to-br from-[#eff6ff] via-[#f0f9ff] to-[#fffbeb] border-2 border-[#3b82f6]/40 rounded-2xl p-4 sm:p-5 text-left shadow-md space-y-4">
      {/* Top Header Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-md shadow-[#2563eb]/20 shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-black text-[#0f172a] tracking-tight">
                Automated 24-Hour Reminder
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active
              </span>
            </div>
            <p className="text-xs text-[#475569] font-medium mt-0.5">
              Scheduled to dispatch on <strong className="text-[#1d4ed8]">{reminderDateStr}</strong> at {formattedTime}
            </p>
          </div>
        </div>
      </div>

      {/* 10-Minute Early Arrival Notice Highlight */}
      <div className="bg-[#fffbeb] border border-[#fde68a] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#92400e] shadow-xs">
        <Clock className="w-4 h-4 text-[#b45309] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-extrabold text-[#92400e] flex items-center gap-1.5">
            <span>Please arrive 10 minutes early</span>
            <span className="bg-[#fef3c7] border border-[#fde68a] px-1.5 py-0.2 rounded font-mono font-bold text-[11px]">
              {earlyArrivalFormatted}
            </span>
          </div>
          <p className="text-[11px] text-[#b45309] leading-snug">
            Allows smooth vitals check, preliminary oral chart review, and sterilization prep before your turn.
          </p>
        </div>
      </div>

      {/* Channels Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-white border border-[#dbeafe] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Smartphone className="w-4 h-4 text-[#2563eb] shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[#0f172a] text-[11px]">SMS Reminder</div>
              <div className="text-[10px] text-[#64748b] truncate font-mono">
                {patient.phone || '+91-Registered'}
              </div>
            </div>
          </div>
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
            Enrolled
          </span>
        </div>

        <div className="bg-white border border-[#dbeafe] rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Mail className="w-4 h-4 text-[#2563eb] shrink-0" />
            <div className="truncate">
              <div className="font-bold text-[#0f172a] text-[11px]">Email Reminder</div>
              <div className="text-[10px] text-[#64748b] truncate font-mono">
                {patient.email || 'Registered Email'}
              </div>
            </div>
          </div>
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
            Enrolled
          </span>
        </div>
      </div>

      {/* Add to Calendar Action */}
      <div className="pt-1">
        <a
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white border-2 border-[#bfdbfe] hover:bg-[#eff6ff] hover:border-[#2563eb] text-[#1e40af] text-xs font-extrabold transition-all cursor-pointer shadow-xs min-h-[42px]"
          title="Add reminder to Google Calendar with 24h alert"
        >
          <Calendar className="w-4 h-4 text-[#2563eb]" />
          <span>Add to Google Calendar (24h Alert)</span>
          <ExternalLink className="w-3.5 h-3.5 text-[#64748b]" />
        </a>
      </div>
    </div>
  );
};
