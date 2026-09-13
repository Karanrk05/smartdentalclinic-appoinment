/**
 * Slot Manager & Daily Reset Engine
 * Ensures booked slots cannot be re-selected for their booked date,
 * and guarantees slots reset automatically every day.
 */

export interface BookedSlotRecord {
  date: string; // YYYY-MM-DD
  slot: string; // '09:00' or '09:00 AM'
  doctorName?: string;
  branchId?: string;
  bookingRef?: string;
  bookedAt: string; // ISO string
}

export const LOCAL_BOOKED_SLOTS_KEY = 'sdc_daily_booked_slots';
export const LOCAL_LAST_RESET_KEY = 'sdc_last_daily_reset_date';

/**
 * Returns current date in local YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object to YYYY-MM-DD in local time
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a 24-hour slot like "09:00" to "9:00 AM"
 */
export function formatSlotTime(t: string): string {
  if (!t) return '';
  if (t.includes('AM') || t.includes('PM') || t.includes('am') || t.includes('pm')) return t;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

/**
 * Parses any time string into absolute minutes from midnight (0 to 1439).
 * Bulletproof against spaces, casing, 12h vs 24h, and extraneous text.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  const isPM = clean.includes('pm');
  const isAM = clean.includes('am');

  // Strip AM/PM and any trailing notes like "(30 min)" or "- 9:30"
  const timeOnly = clean.replace(/am|pm/g, '').trim().split('-')[0].trim();
  const parts = timeOnly.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;

  if (isNaN(hours)) return null;
  if (isNaN(minutes)) minutes = 0;

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

/**
 * Exact time matching between slot identifier (e.g. '09:00') and recorded time (e.g. '9:00 AM')
 */
export function isTimeMatch(slot: string, bookedTimeStr: string): boolean {
  if (!slot || !bookedTimeStr) return false;
  const m1 = parseTimeToMinutes(slot);
  const m2 = parseTimeToMinutes(bookedTimeStr);
  if (m1 !== null && m2 !== null) {
    return m1 === m2;
  }
  return slot.trim().toLowerCase() === bookedTimeStr.trim().toLowerCase();
}

/**
 * Compares two date strings in various formats (YYYY-MM-DD, ISO timestamps, etc.)
 */
export function isSameDate(d1: string, d2: string): boolean {
  if (!d1 || !d2) return false;
  const s1 = d1.trim().split('T')[0];
  const s2 = d2.trim().split('T')[0];
  if (s1 === s2) return true;

  const p1 = s1.split('-').map((x) => parseInt(x, 10));
  const p2 = s2.split('-').map((x) => parseInt(x, 10));
  if (p1.length === 3 && p2.length === 3) {
    return p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
  }
  return false;
}

/**
 * Check and perform automatic daily reset on client side.
 * If current date is newer than last daily reset, prunes previous days' booked slots.
 */
export function checkClientDailyReset(): { resetExecuted: boolean; today: string } {
  const today = getTodayDateString();
  try {
    const lastReset = localStorage.getItem(LOCAL_LAST_RESET_KEY);
    if (!lastReset || lastReset !== today) {
      // Automatic daily reset: keep only today and future bookings
      const existing = getLocalBookedSlots();
      const filtered = existing.filter((b) => b.date >= today);
      localStorage.setItem(LOCAL_BOOKED_SLOTS_KEY, JSON.stringify(filtered));
      localStorage.setItem(LOCAL_LAST_RESET_KEY, today);
      return { resetExecuted: true, today };
    }
  } catch (err) {
    console.error('Error executing client daily reset:', err);
  }
  return { resetExecuted: false, today };
}

/**
 * Retrieve list of all locally recorded booked slots
 */
export function getLocalBookedSlots(): BookedSlotRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKED_SLOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Record a newly booked slot so it immediately blocks selection for that day
 */
export function addLocalBookedSlot(slot: BookedSlotRecord): void {
  try {
    const list = getLocalBookedSlots();
    // Normalize date and slot representation
    const cleanDate = slot.date.split('T')[0];
    const cleanSlot = slot.slot.trim();

    const exists = list.some(
      (s) =>
        isSameDate(s.date, cleanDate) &&
        isTimeMatch(s.slot, cleanSlot) &&
        (!slot.doctorName || !s.doctorName || s.doctorName.toLowerCase().trim() === slot.doctorName.toLowerCase().trim())
    );

    if (!exists) {
      list.unshift({
        ...slot,
        date: cleanDate,
        slot: cleanSlot,
        bookedAt: slot.bookedAt || new Date().toISOString(),
      });
      localStorage.setItem(LOCAL_BOOKED_SLOTS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('Error saving local booked slot:', err);
  }
}

/**
 * Force clear all booked slots for today (for testing the daily reset on demand)
 */
export function resetTodaySlotsLocal(): number {
  try {
    const today = getTodayDateString();
    const existing = getLocalBookedSlots();
    const remaining = existing.filter((s) => !isSameDate(s.date, today));
    const count = existing.length - remaining.length;
    localStorage.setItem(LOCAL_BOOKED_SLOTS_KEY, JSON.stringify(remaining));
    return count;
  } catch (err) {
    console.error('Error resetting today slots:', err);
    return 0;
  }
}
