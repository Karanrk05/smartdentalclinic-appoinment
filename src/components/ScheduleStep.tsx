import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, Ban, Check, Sparkles, Sun, Coffee, Building2, RefreshCw, AlertCircle } from 'lucide-react';
import { Doctor, Treatment, PatientRecord, ClinicTimings, ClinicBranch } from '../types';
import {
  formatSlotTime,
  formatLocalDate,
  isTimeMatch,
  isSameDate,
  checkClientDailyReset,
  getLocalBookedSlots,
  resetTodaySlotsLocal,
  getTodayDateString,
} from '../utils/slotManager';

interface ScheduleStepProps {
  selectedTreatment: Treatment;
  selectedDoctor: Doctor;
  selectedDate: Date | null;
  selectedTime: string | null;
  onSelectDate: (date: Date) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
  refreshTrigger?: number;
  branch?: ClinicBranch | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
];

export { formatSlotTime, formatLocalDate, isTimeMatch };

const DEFAULT_TIMINGS: ClinicTimings = {
  storeName: 'Smart Dental Clinic',
  schedules: {
    weekdays: { day: 'Monday - Friday', openTime: '09:00 AM', closeTime: '08:00 PM', isOpen: true },
    saturday: { day: 'Saturday', openTime: '09:00 AM', closeTime: '06:00 PM', isOpen: true },
    sunday: { day: 'Sunday', openTime: '10:00 AM', closeTime: '02:00 PM', isOpen: false },
  },
  breakTime: {
    name: 'Lunch & Sanitization Recess',
    startTime: '01:30 PM',
    endTime: '02:30 PM',
    enabled: true,
  },
  activeSlots: ALL_SLOTS,
  disabledSlots: [],
  slotDurationMinutes: 30,
  announcement: 'Open Monday – Saturday · Walk-ins & scheduled visits welcome',
};

export const ScheduleStep: React.FC<ScheduleStepProps> = ({
  selectedTreatment,
  selectedDoctor,
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onBack,
  onNext,
  refreshTrigger = 0,
  branch,
}) => {
  const today = new Date();
  const [bookedRecords, setBookedRecords] = useState<PatientRecord[]>([]);
  const [clinicTimings, setClinicTimings] = useState<ClinicTimings>(DEFAULT_TIMINGS);
  const [localRefreshCounter, setLocalRefreshCounter] = useState<number>(0);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetNotification, setResetNotification] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState<number>(
    selectedDate ? selectedDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    selectedDate ? selectedDate.getMonth() : today.getMonth()
  );

  // Check client-side daily reset on mount or date changes
  useEffect(() => {
    checkClientDailyReset();
  }, []);

  // Fetch real bookings to calculate live slot availability with cache-busting
  useEffect(() => {
    fetch(`/api/patients?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setBookedRecords(data.data);
        }
      })
      .catch(() => {});
  }, [selectedDate, selectedDoctor, refreshTrigger, localRefreshCounter]);

  // Fetch clinic timings from server
  useEffect(() => {
    fetch('/api/clinic-timings', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.data) {
          setClinicTimings(data.data);
        }
      })
      .catch(() => {});
  }, [refreshTrigger, localRefreshCounter]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const isDayClosed = (d: Date): boolean => {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) return !clinicTimings.schedules.sunday.isOpen;
    if (dayOfWeek === 6) return !clinicTimings.schedules.saturday.isOpen;
    return !clinicTimings.schedules.weekdays.isOpen;
  };

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ empty: true, day: i, key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(viewYear, viewMonth, d);
    const dayOfWeek = cellDate.getDay();
    const isSunday = dayOfWeek === 0;
    const isPast =
      cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday =
      d === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear();
    const isSelected =
      selectedDate !== null &&
      selectedDate.getDate() === d &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear;
    
    const isClinicClosed = isDayClosed(cellDate);

    calendarCells.push({
      empty: false,
      day: d,
      date: cellDate,
      isSunday,
      isPast,
      isToday,
      isSelected,
      disabled: isClinicClosed || isPast,
      isClinicClosed,
      key: `day-${d}`,
    });
  }

  // Active slots list configured in admin
  const activeSlots = clinicTimings.activeSlots && clinicTimings.activeSlots.length > 0
    ? clinicTimings.activeSlots
    : ALL_SLOTS;

  const disabledSlots = clinicTimings.disabledSlots || [];

  // Calculate real booked slots for the selected date and doctor
  const selectedDateStr = selectedDate ? formatLocalDate(selectedDate) : '';
  const doctorNameLower = selectedDoctor?.name?.toLowerCase().trim() || '';

  // Calculate real blocked slots combining backend Excel records & client persistent records
  const realBlockedSlots = useMemo(() => {
    if (!selectedDateStr) return [];

    const localList = getLocalBookedSlots();
    const blocked: string[] = [];

    for (const slot of activeSlots) {
      // 1. Check against backend records
      const isServerBooked = bookedRecords.some((r) => {
        if (r.status && r.status.toLowerCase().includes('cancel')) return false;
        if (!isSameDate(r.appointmentDate, selectedDateStr)) return false;
        if (!isTimeMatch(slot, r.appointmentTime)) return false;
        if (branch?.id && r.branchId && r.branchId !== branch.id) return false;
        if (doctorNameLower && r.doctorName) {
          return r.doctorName.toLowerCase().trim() === doctorNameLower;
        }
        return true;
      });

      // 2. Check against client session/local records
      const isLocalBooked = localList.some((l) => {
        if (!isSameDate(l.date, selectedDateStr)) return false;
        if (!isTimeMatch(slot, l.slot)) return false;
        if (branch?.id && l.branchId && l.branchId !== branch.id) return false;
        if (doctorNameLower && l.doctorName) {
          return l.doctorName.toLowerCase().trim() === doctorNameLower;
        }
        return true;
      });

      if (isServerBooked || isLocalBooked) {
        blocked.push(slot);
      }
    }

    return blocked;
  }, [activeSlots, bookedRecords, selectedDateStr, doctorNameLower, branch?.id, localRefreshCounter]);

  // If currently selected time was booked or disabled, auto-deselect it so it cannot be booked
  useEffect(() => {
    if (selectedTime && (realBlockedSlots.includes(selectedTime) || disabledSlots.includes(selectedTime))) {
      onSelectTime('');
    }
  }, [realBlockedSlots, disabledSlots, selectedTime, onSelectTime]);

  // Trigger manual daily reset test
  const handleTriggerDailyReset = async () => {
    setIsResetting(true);
    try {
      // Clear client local storage booked slots for today
      resetTodaySlotsLocal();

      // Trigger backend daily reset
      const res = await fetch('/api/slots/daily-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      setLocalRefreshCounter((c) => c + 1);
      setResetNotification(
        data.message || 'Daily slots reset successfully! 9:00 AM and all slots are now available.'
      );
      setTimeout(() => setResetNotification(null), 6000);
    } catch (err) {
      // Fallback local reset
      resetTodaySlotsLocal();
      setLocalRefreshCounter((c) => c + 1);
      setResetNotification('Daily slots reset locally! All slots are now available.');
      setTimeout(() => setResetNotification(null), 6000);
    } finally {
      setIsResetting(false);
    }
  };

  const bookedCount = realBlockedSlots.length;
  const availableSlotsList = activeSlots.filter(
    (s) => !realBlockedSlots.includes(s) && !disabledSlots.includes(s)
  );
  const availableCount = availableSlotsList.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] tracking-tight">
          When works for you?
        </h2>
        <p className="text-sm text-[#64748b] font-medium mt-1">
          Pick a date and an available time slot for{' '}
          <strong className="text-[#2563eb]">{selectedTreatment.name}</strong> with{' '}
          <strong className="text-[#2563eb]">{selectedDoctor.name}</strong>.
        </p>
      </div>

      {/* Daily Reset Notification Toast / Banner */}
      {resetNotification && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-xl p-3.5 flex items-start gap-2.5 shadow-sm animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm font-semibold">
            {resetNotification}
          </div>
          <button
            type="button"
            onClick={() => setResetNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Daily Auto-Reset Information & Management Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-blue-950">
                Daily Slot Auto-Reset Active
              </h4>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-emerald-300 uppercase">
                Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-800/90 font-medium mt-0.5">
              Once a slot (e.g. 9:00 AM) is booked, it cannot be selected again for that day.
              All slots reset automatically every day at <strong>12:00 AM midnight</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerDailyReset}
          disabled={isResetting}
          title="Reset today's booked slots to test daily reset"
          className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white active:scale-95 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting...' : 'Test Daily Reset'}</span>
        </button>
      </div>

      {/* Selected Banner */}
      <div className="bg-[#eff6ff] border-1.5 border-[#93c5fd] rounded-xl p-3.5 flex items-center justify-between text-xs sm:text-sm">
        <div>
          <div className="text-[11px] font-bold text-[#64748b] uppercase tracking-wide flex items-center gap-1.5">
            <span>Booking for</span>
            {branch && (
              <span className="text-[10px] font-black text-[#1e40af] bg-white px-2 py-0.5 rounded-md border border-blue-200">
                📍 {branch.shortName}
              </span>
            )}
          </div>
          <div className="font-extrabold text-[#2563eb] text-sm sm:text-base">
            {selectedTreatment.icon} {selectedTreatment.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-[#0f172a]">
            {selectedDoctor.name}
          </div>
          <div className="font-extrabold text-[#2563eb] text-sm sm:text-base">
            {selectedTreatment.price}
          </div>
        </div>
      </div>

      {/* Clinic Operating Hours & Announcement Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Store / Clinic Timings</span>
          </div>
          {clinicTimings.announcement && (
            <div className="font-bold text-blue-700 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>{clinicTimings.announcement}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-blue-200/60">
          <div className="text-slate-700">
            <strong className="text-blue-950 font-bold">Mon – Fri:</strong>{' '}
            {clinicTimings.schedules.weekdays.isOpen
              ? `${clinicTimings.schedules.weekdays.openTime} – ${clinicTimings.schedules.weekdays.closeTime}`
              : 'Closed'}
          </div>
          <div className="text-slate-700">
            <strong className="text-blue-950 font-bold">Saturday:</strong>{' '}
            {clinicTimings.schedules.saturday.isOpen
              ? `${clinicTimings.schedules.saturday.openTime} – ${clinicTimings.schedules.saturday.closeTime}`
              : 'Closed'}
          </div>
          <div className="text-slate-700">
            <strong className="text-blue-950 font-bold">Sunday:</strong>{' '}
            {clinicTimings.schedules.sunday.isOpen
              ? `${clinicTimings.schedules.sunday.openTime} – ${clinicTimings.schedules.sunday.closeTime}`
              : 'Closed (Emergency only)'}
          </div>
        </div>

        {clinicTimings.breakTime?.enabled && (
          <div className="text-[10px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded px-2 py-0.5 flex items-center gap-1 mt-1 font-medium">
            <Coffee className="w-3 h-3 text-amber-600" />
            <span>{clinicTimings.breakTime.name}: {clinicTimings.breakTime.startTime} – {clinicTimings.breakTime.endTime}</span>
          </div>
        )}
      </div>

      {/* Calendar Box */}
      <div className="bg-white border-2 border-[#dbeafe] rounded-2xl p-3 sm:p-5 shadow-xs">
        {/* Month Navigator */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border-2 border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb] active:scale-90 transition-all cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm sm:text-base font-black text-[#0f172a]">
            {MONTHS[viewMonth]} {viewYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border-2 border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb] active:scale-90 transition-all cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {WDAYS.map((w) => (
            <div key={w} className="text-[11px] sm:text-xs font-black text-[#64748b] py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell) => {
            if (cell.empty) {
              return <div key={cell.key} className="aspect-square" />;
            }

            return (
              <button
                key={cell.key}
                type="button"
                disabled={cell.disabled}
                onClick={() => {
                  if (cell.date) {
                    onSelectDate(cell.date);
                  }
                }}
                className={`aspect-square rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-all duration-150 select-none ${
                  cell.isSelected
                    ? 'bg-[#2563eb] text-white shadow-xs font-black scale-105'
                    : cell.disabled
                    ? 'text-[#cbd5e1] opacity-35 cursor-not-allowed'
                    : cell.isToday
                    ? 'border-2 border-[#3b82f6] text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer'
                    : 'text-[#0f172a] hover:bg-[#eff6ff] hover:text-[#2563eb] hover:border hover:border-[#93c5fd] cursor-pointer active:scale-95'
                }`}
                title={cell.isClinicClosed ? 'Clinic closed on this day' : undefined}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-extrabold text-[#0f172a]">
              <Clock className="w-4 h-4 text-[#2563eb] shrink-0" />
              <span>
                Available times on{' '}
                {selectedDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            {/* Live slot statistics */}
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <span className="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]">
                {availableCount} Available
              </span>
              {bookedCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  {bookedCount} Booked
                </span>
              )}
            </div>
          </div>

          {/* Slots Legend */}
          <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 py-1 text-[10px] sm:text-[11px] text-[#64748b] font-medium border-b border-[#e2e8f0]">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-white border border-[#dbeafe]"></span>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-[#2563eb]"></span>
              <span className="text-[#2563eb] font-bold">Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-md bg-[#fdf2f2] border border-red-200"></span>
              <span className="text-red-600 font-bold">Booked</span>
            </div>
            {disabledSlots.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-md bg-slate-200 border border-slate-300"></span>
                <span className="text-slate-500 font-bold">Paused</span>
              </div>
            )}
          </div>

          {/* Slots Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-2.5 pt-1">
            {activeSlots.map((slot) => {
              const isTaken = realBlockedSlots.includes(slot);
              const isPaused = disabledSlots.includes(slot);
              const isSelected = selectedTime === slot;
              const isBlocked = isTaken || isPaused;

              return (
                <button
                  key={slot}
                  id={`slot-${slot.replace(':', '-')}`}
                  type="button"
                  disabled={isBlocked}
                  onClick={() => onSelectTime(slot)}
                  title={
                    isTaken
                      ? `${formatSlotTime(slot)} is already booked for this doctor`
                      : isPaused
                      ? `${formatSlotTime(slot)} is currently paused by clinic admin`
                      : `Select ${formatSlotTime(slot)}`
                  }
                  className={`relative flex flex-col items-center justify-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-xs font-bold transition-all border-2 select-none min-h-[50px] ${
                    isSelected
                      ? 'bg-[#2563eb] border-[#2563eb] text-white shadow-md shadow-[#2563eb]/20 scale-[1.02]'
                      : isTaken
                      ? 'bg-[#fdf2f2] border-red-200 text-red-400 cursor-not-allowed opacity-85'
                      : isPaused
                      ? 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-white border-[#dbeafe] text-[#0f172a] hover:border-[#2563eb] hover:text-[#2563eb] hover:bg-[#eff6ff] active:scale-95 cursor-pointer'
                  }`}
                >
                  <span className={`text-[11px] sm:text-xs ${isBlocked ? 'line-through text-slate-400 font-semibold' : 'font-extrabold'}`}>
                    {formatSlotTime(slot)}
                  </span>
                  
                  {isTaken ? (
                    <span className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-red-700 bg-red-100/90 px-1 py-0.2 rounded flex items-center gap-0.5">
                      <Ban className="w-2.5 h-2.5 text-red-700" />
                      Booked
                    </span>
                  ) : isPaused ? (
                    <span className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-1 py-0.2 rounded flex items-center gap-0.5">
                      Paused
                    </span>
                  ) : isSelected ? (
                    <span className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-white bg-[#1e40af] px-1 py-0.2 rounded flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 text-white" />
                      Selected
                    </span>
                  ) : (
                    <span className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-medium text-[#64748b]">
                      Available
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Button Row */}
      <div className="pt-4 border-t border-[#dbeafe] flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 py-3.5 px-4 sm:px-5 rounded-xl font-bold text-sm text-[#64748b] border-2 border-[#e2e8f0] bg-white hover:border-[#2563eb] hover:text-[#2563eb] active:scale-95 transition-all cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          id="btn-goto-details"
          type="button"
          disabled={!selectedDate || !selectedTime}
          onClick={onNext}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-extrabold text-sm text-white bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#2563eb]/20 cursor-pointer min-h-[44px]"
        >
          <span>Enter details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
