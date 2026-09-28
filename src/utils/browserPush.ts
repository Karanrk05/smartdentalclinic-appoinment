// Browser Push API & Service Worker Push Reminders Engine
// Provides local desktop and mobile push reminders as an automated fallback to WhatsApp/SMS.

import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ScheduledPushReminder {
  id: string;
  bookingRef: string;
  patientName: string;
  doctorName: string;
  treatmentName: string;
  appointmentDate: string;
  appointmentTime: string;
  type: '24h' | '2h' | '15m' | 'test';
  scheduledTimeMs: number;
  title: string;
  body: string;
  status: 'scheduled' | 'delivered' | 'cancelled';
  createdAt: string;
  deliveredAt?: string;
}

const SCHEDULED_REMINDERS_KEY = 'smartdental_scheduled_push_reminders';
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

// 1. Check if Browser Push / Notifications are supported
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// 2. Get current permission state
export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission as PushPermissionState;
}

// 3. Register or retrieve Service Worker
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  if (swRegistrationPromise) {
    return swRegistrationPromise;
  }

  swRegistrationPromise = (async () => {
    try {
      // First check if already registered
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) {
        return existing;
      }

      // Register public /sw.js
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.warn('Service Worker registration skipped or failed:', err);
      return null;
    }
  })();

  return swRegistrationPromise;
}

// 4. Request Browser Notification & Push Permission
export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!isPushSupported()) return 'unsupported';

  try {
    const result = await Notification.requestPermission();
    // Warm up service worker registration on grant
    if (result === 'granted') {
      getOrRegisterServiceWorker().catch(() => {});
    }
    return result as PushPermissionState;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return getPushPermissionState();
  }
}

// 5. Send an immediate native push notification (desktop or mobile)
export async function sendImmediatePushNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    bookingRef?: string;
    data?: any;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
  }
): Promise<boolean> {
  if (!isPushSupported()) return false;

  const perm = getPushPermissionState();
  if (perm !== 'granted') return false;

  const notifOptions: any = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/favicon.svg',
    tag: options?.tag || `smartdental-${Date.now()}`,
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: options?.requireInteraction ?? true,
    data: options?.data || {
      url: '/',
      bookingRef: options?.bookingRef || '',
    },
  };

  try {
    const swReg = await getOrRegisterServiceWorker();
    if (swReg && 'showNotification' in swReg) {
      // Preferred: Show via Service Worker (renders action buttons & background support)
      await swReg.showNotification(title, notifOptions);
      return true;
    }
  } catch (swErr) {
    console.warn('Could not display via service worker, falling back to window Notification:', swErr);
  }

  try {
    // Fallback: window Notification
    new Notification(title, notifOptions);
    return true;
  } catch (err) {
    console.error('Failed to trigger window Notification:', err);
    return false;
  }
}

// 6. Retrieve stored reminders from localStorage
export function getScheduledPushReminders(bookingRef?: string): ScheduledPushReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCHEDULED_REMINDERS_KEY);
    if (!raw) return [];
    const list: ScheduledPushReminder[] = JSON.parse(raw);
    if (bookingRef) {
      return list.filter((r) => r.bookingRef.toUpperCase() === bookingRef.toUpperCase());
    }
    return list;
  } catch {
    return [];
  }
}

// 7. Save reminders list
function saveScheduledPushReminders(list: ScheduledPushReminder[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep max 100 items
    const trimmed = list.slice(-100);
    localStorage.setItem(SCHEDULED_REMINDERS_KEY, JSON.stringify(trimmed));
  } catch {}
}

// 8. Schedule automatic 24h, 2h, and 15m push reminders for an appointment
export function scheduleAppointmentPushReminders(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE
): ScheduledPushReminder[] {
  const { bookingRef, selectedDate, selectedTime, patient, doctor, treatment } = booking;
  if (!bookingRef || !selectedDate || !selectedTime) return [];

  const patientName = `${patient.firstName} ${patient.lastName}`.trim() || 'Patient';
  const doctorName = doctor?.name || 'Dr. Vikram Shah';
  const treatmentName = treatment?.name || 'Dental Consultation';
  const clinicName = clinicProfile.name || 'Smart Dental Clinic';

  // Parse appointment Date & Time into a single timestamp
  const apptDate = new Date(selectedDate);
  const isPM = selectedTime.toLowerCase().includes('pm');
  const cleanTime = selectedTime.toLowerCase().replace('am', '').replace('pm', '').trim();
  const [hStr, mStr] = cleanTime.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr || '0', 10);
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  apptDate.setHours(hours, minutes, 0, 0);
  const apptTimeMs = apptDate.getTime();
  const nowMs = Date.now();

  const currentList = getScheduledPushReminders();
  // Filter out any existing pending reminders for this bookingRef to avoid duplicates
  const filtered = currentList.filter(
    (r) => r.bookingRef.toUpperCase() !== bookingRef.toUpperCase() || r.status === 'delivered'
  );

  const createdReminders: ScheduledPushReminder[] = [];

  // Reminder 1: 24 Hours Before Appointment
  const time24hMs = apptTimeMs - 24 * 60 * 60 * 1000;
  if (time24hMs > nowMs) {
    createdReminders.push({
      id: `REM-${bookingRef}-24H`,
      bookingRef,
      patientName,
      doctorName,
      treatmentName,
      appointmentDate: selectedDate.toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      appointmentTime: selectedTime,
      type: '24h',
      scheduledTimeMs: time24hMs,
      title: `🦷 Dental Reminder: Tomorrow at ${selectedTime}`,
      body: `Hi ${patientName}, your ${treatmentName} with ${doctorName} at ${clinicName} is scheduled tomorrow. Please arrive 10m early.`,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
  }

  // Reminder 2: 2 Hours Before Appointment
  const time2hMs = apptTimeMs - 2 * 60 * 60 * 1000;
  if (time2hMs > nowMs) {
    createdReminders.push({
      id: `REM-${bookingRef}-2H`,
      bookingRef,
      patientName,
      doctorName,
      treatmentName,
      appointmentDate: selectedDate.toLocaleDateString('en-IN'),
      appointmentTime: selectedTime,
      type: '2h',
      scheduledTimeMs: time2hMs,
      title: `⏰ Appointment in 2 Hours: ${selectedTime}`,
      body: `${treatmentName} with ${doctorName}. Address: ${clinicProfile.address}. Call helpline: ${clinicProfile.phone}`,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
  }

  // Reminder 3: 15 Minutes Early Arrival Alert
  const time15mMs = apptTimeMs - 15 * 60 * 1000;
  if (time15mMs > nowMs) {
    createdReminders.push({
      id: `REM-${bookingRef}-15M`,
      bookingRef,
      patientName,
      doctorName,
      treatmentName,
      appointmentDate: selectedDate.toLocaleDateString('en-IN'),
      appointmentTime: selectedTime,
      type: '15m',
      scheduledTimeMs: time15mMs,
      title: `📍 Arrival Check-In: Please arrive in 10-15 mins`,
      body: `Ready for ${patientName}? Early check-in allows smooth vitals review and sterilisation prep before your slot.`,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
  }

  const updatedList = [...filtered, ...createdReminders];
  saveScheduledPushReminders(updatedList);

  return createdReminders;
}

// 9. Schedule an immediate test push reminder (e.g. 5 or 10 seconds from now)
export function scheduleTestPushReminder(
  bookingRef: string,
  delaySeconds: number = 5,
  title?: string,
  body?: string
): ScheduledPushReminder {
  const triggerMs = Date.now() + delaySeconds * 1000;
  const testReminder: ScheduledPushReminder = {
    id: `REM-TEST-${Date.now()}`,
    bookingRef,
    patientName: 'Test Patient',
    doctorName: 'Dr. Vikram Shah',
    treatmentName: 'Dental Checkup',
    appointmentDate: 'Today',
    appointmentTime: 'Now',
    type: 'test',
    scheduledTimeMs: triggerMs,
    title: title || `🦷 SmartDental Live Push Reminder (#${bookingRef})`,
    body:
      body ||
      `This is a live desktop/mobile push reminder. As a fallback to WhatsApp/SMS, browser alerts keep your appointment on schedule!`,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
  };

  const list = getScheduledPushReminders();
  list.push(testReminder);
  saveScheduledPushReminders(list);

  // Set in-memory timer
  setTimeout(() => {
    deliverPendingPushReminder(testReminder.id);
  }, delaySeconds * 1000);

  return testReminder;
}

// 10. Deliver a scheduled reminder
export async function deliverPendingPushReminder(reminderId: string): Promise<boolean> {
  const list = getScheduledPushReminders();
  const reminder = list.find((r) => r.id === reminderId);
  if (!reminder || reminder.status !== 'scheduled') return false;

  const success = await sendImmediatePushNotification(reminder.title, reminder.body, {
    tag: `reminder-${reminder.bookingRef}-${reminder.type}`,
    bookingRef: reminder.bookingRef,
    data: {
      url: '/',
      bookingRef: reminder.bookingRef,
    },
  });

  reminder.status = 'delivered';
  reminder.deliveredAt = new Date().toISOString();
  saveScheduledPushReminders(list);

  // Also log delivery to backend history for audit trail
  try {
    fetch('/api/push/log-delivery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderId: reminder.id,
        bookingRef: reminder.bookingRef,
        title: reminder.title,
        body: reminder.body,
        type: reminder.type,
      }),
    }).catch(() => {});
  } catch {}

  return success;
}

// 11. Synchronize & check pending reminders (called periodically by app)
export function syncPendingPushReminders(): number {
  const list = getScheduledPushReminders();
  const now = Date.now();
  let deliveredCount = 0;

  list.forEach((rem) => {
    // Deliver if scheduled time has passed and within last 24 hours
    if (rem.status === 'scheduled' && rem.scheduledTimeMs <= now && now - rem.scheduledTimeMs < 24 * 60 * 60 * 1000) {
      deliverPendingPushReminder(rem.id);
      deliveredCount++;
    }
  });

  return deliveredCount;
}

// 12. Cancel reminders for a booking
export function cancelScheduledPushReminders(bookingRef: string) {
  const list = getScheduledPushReminders();
  list.forEach((rem) => {
    if (rem.bookingRef.toUpperCase() === bookingRef.toUpperCase() && rem.status === 'scheduled') {
      rem.status = 'cancelled';
    }
  });
  saveScheduledPushReminders(list);
}

// 13. Register device push subscription with backend
export async function registerPushSubscriptionWithServer(patientInfo?: {
  name?: string;
  phone?: string;
  bookingRef?: string;
}) {
  try {
    const swReg = await getOrRegisterServiceWorker();
    if (!swReg || !swReg.pushManager) {
      return null;
    }

    let sub = await swReg.pushManager.getSubscription();
    // If no existing push subscription, attempt to subscribe if key exists
    if (!sub) {
      // Fetch public VAPID key if available
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        if (keyRes.ok) {
          const { publicKey } = await keyRes.json();
          if (publicKey) {
            sub = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(publicKey),
            });
          }
        }
      } catch {}
    }

    const payload = {
      subscription: sub ? sub.toJSON() : null,
      deviceType: /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      userAgent: navigator.userAgent,
      patientName: patientInfo?.name || '',
      patientPhone: patientInfo?.phone || '',
      bookingRef: patientInfo?.bookingRef || '',
      permission: getPushPermissionState(),
      subscribedAt: new Date().toISOString(),
    };

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return payload;
  } catch (err) {
    console.warn('Could not register push subscription with server:', err);
    return null;
  }
}

// Helper to convert base64 VAPID key
function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
