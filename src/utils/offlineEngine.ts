// Client-Side Offline Storage & Synchronization Engine
// Ensures appointments, clinic settings, patient records, and doctor profiles
// work seamlessly when offline and sync smoothly upon reconnection.

import { PatientRecord, ClinicProfile, ClinicBranch, Treatment, Doctor, ClinicTimings, DEFAULT_CLINIC_PROFILE, DEFAULT_BRANCHES } from '../types';
import { GENERAL_TREATMENTS } from '../data/treatments';
import { DOCTORS } from '../data/doctors';

const OFFLINE_PATIENT_RECORDS_KEY = 'sdc_offline_patient_records';
const OFFLINE_PENDING_QUEUE_KEY = 'sdc_offline_pending_bookings_queue';
const OFFLINE_CLINIC_PROFILE_KEY = 'sdc_offline_clinic_profile';
const OFFLINE_BRANCHES_KEY = 'sdc_offline_branches';
const OFFLINE_TREATMENTS_KEY = 'sdc_offline_treatments';
const OFFLINE_DOCTORS_KEY = 'sdc_offline_doctors';
const OFFLINE_TIMINGS_KEY = 'sdc_offline_timings';

export interface PendingOfflineBooking {
  id: string;
  bookingRef: string;
  payload: any;
  createdAt: string;
  synced: boolean;
}

// -------------------------------------------------------------
// 1. Patient Records Local Cache
// -------------------------------------------------------------
export function getLocalCachedPatientRecords(): PatientRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_PATIENT_RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed reading cached patient records from localStorage', e);
    return [];
  }
}

export function saveLocalCachedPatientRecords(records: PatientRecord[]): void {
  try {
    if (Array.isArray(records)) {
      localStorage.setItem(OFFLINE_PATIENT_RECORDS_KEY, JSON.stringify(records));
    }
  } catch (e) {
    console.warn('Failed writing cached patient records to localStorage', e);
  }
}

export function appendLocalPatientRecord(record: PatientRecord): void {
  try {
    const existing = getLocalCachedPatientRecords();
    const updated = [record, ...existing.filter((r) => r.bookingRef !== record.bookingRef)];
    saveLocalCachedPatientRecords(updated);
  } catch (e) {
    console.warn('Failed appending patient record locally', e);
  }
}

// -------------------------------------------------------------
// 2. Offline Bookings Queue (Syncs when internet returns)
// -------------------------------------------------------------
export function getPendingOfflineQueue(): PendingOfflineBooking[] {
  try {
    const raw = localStorage.getItem(OFFLINE_PENDING_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed reading pending offline bookings queue', e);
    return [];
  }
}

export function enqueueOfflineBooking(payload: any, bookingRef: string): void {
  try {
    const queue = getPendingOfflineQueue();
    const newEntry: PendingOfflineBooking = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      bookingRef,
      payload,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    queue.push(newEntry);
    localStorage.setItem(OFFLINE_PENDING_QUEUE_KEY, JSON.stringify(queue));

    // Also inject into local patient records immediately so user sees it offline
    const localRecord: PatientRecord = {
      bookingRef: payload.bookingRef,
      bookingDate: payload.appointmentDate || new Date().toISOString().split('T')[0],
      patientName: `${payload.firstName} ${payload.lastName}`.trim(),
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      email: payload.email || 'offline-patient@clinic.local',
      dob: payload.dob || 'Not specified',
      patientType: payload.patientType || 'New patient',
      branchName: payload.branchName || 'Smart Dental Clinic',
      branchAddress: payload.branchAddress || 'Clinic Address',
      branchPhone: payload.branchPhone || '+91 98765 00000',
      treatmentName: payload.treatmentName || 'Dental Consultation',
      treatmentDuration: payload.treatmentDuration || '30 mins',
      estimatedFee: payload.estimatedFee || '₹500',
      doctorName: payload.doctorName || 'Senior Clinician',
      doctorSpecialization: payload.doctorSpecialization || 'General Dentistry',
      appointmentDate: payload.appointmentDate,
      appointmentTime: payload.appointmentTime,
      notes: payload.notes || 'Booked in Offline Mode',
      status: 'Confirmed (Offline)',
      paymentMode: payload.paymentMode || 'Pay at Clinic Counter',
      paymentStatus: payload.paymentStatus || 'Verified',
      paymentRef: payload.paymentRef || 'OFFLINE-QUEUED',
      amountPaidNow: payload.amountPaidNow || '₹0',
      amountRemaining: payload.amountRemaining || '₹0',
      attachmentName: payload.attachmentName || 'None',
    };
    appendLocalPatientRecord(localRecord);
  } catch (e) {
    console.warn('Failed enqueuing offline booking', e);
  }
}

export async function syncPendingOfflineBookings(): Promise<{ successCount: number; failedCount: number }> {
  const queue = getPendingOfflineQueue();
  if (queue.length === 0) return { successCount: 0, failedCount: 0 };

  const remaining: PendingOfflineBooking[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        successCount++;
      } else {
        remaining.push(item);
        failedCount++;
      }
    } catch (e) {
      remaining.push(item);
      failedCount++;
    }
  }

  localStorage.setItem(OFFLINE_PENDING_QUEUE_KEY, JSON.stringify(remaining));
  return { successCount, failedCount };
}

// -------------------------------------------------------------
// 3. Clinic Master Data Caches (Profiles, Branches, Doctors, Treatments)
// -------------------------------------------------------------
export function getCachedClinicProfile(): ClinicProfile {
  try {
    const raw = localStorage.getItem(OFFLINE_CLINIC_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return DEFAULT_CLINIC_PROFILE;
}

export function saveCachedClinicProfile(profile: ClinicProfile): void {
  try {
    localStorage.setItem(OFFLINE_CLINIC_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {}
}

export function getCachedBranches(): ClinicBranch[] {
  try {
    const raw = localStorage.getItem(OFFLINE_BRANCHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DEFAULT_BRANCHES;
}

export function saveCachedBranches(branches: ClinicBranch[]): void {
  try {
    if (Array.isArray(branches) && branches.length > 0) {
      localStorage.setItem(OFFLINE_BRANCHES_KEY, JSON.stringify(branches));
    }
  } catch (e) {}
}

export function getCachedTreatments(): Treatment[] {
  try {
    const raw = localStorage.getItem(OFFLINE_TREATMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return GENERAL_TREATMENTS;
}

export function saveCachedTreatments(treatments: Treatment[]): void {
  try {
    if (Array.isArray(treatments) && treatments.length > 0) {
      localStorage.setItem(OFFLINE_TREATMENTS_KEY, JSON.stringify(treatments));
    }
  } catch (e) {}
}

export function getCachedDoctors(): Doctor[] {
  try {
    const raw = localStorage.getItem(OFFLINE_DOCTORS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return DOCTORS;
}

export function saveCachedDoctors(doctors: Doctor[]): void {
  try {
    if (Array.isArray(doctors) && doctors.length > 0) {
      localStorage.setItem(OFFLINE_DOCTORS_KEY, JSON.stringify(doctors));
    }
  } catch (e) {}
}

export function getCachedTimings(): ClinicTimings | null {
  try {
    const raw = localStorage.getItem(OFFLINE_TIMINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveCachedTimings(timings: ClinicTimings): void {
  try {
    localStorage.setItem(OFFLINE_TIMINGS_KEY, JSON.stringify(timings));
  } catch (e) {}
}
