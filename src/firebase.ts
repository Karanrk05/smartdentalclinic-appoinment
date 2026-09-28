import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query, 
  orderBy, 
  limit, 
  updateDoc,
  serverTimestamp,
  getDocFromServer,
  type Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import type { Treatment, ClinicBranch, Doctor, BranchHierarchyItem, PatientRecord } from './types';
import { BRANCH_HIERARCHY } from './data/branchHierarchy';
import firebaseConfig from '../firebase-applet-config.json';

export { firebaseConfig };

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore targeting the custom provisioned database
export const firestore: Firestore = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId || '(default)'
);
export const db = firestore;
export const auth = getAuth(firebaseApp);

// -------------------------------------------------------------
// Firestore Error Handling (SKILL.md Spec)
// -------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection validation per SKILL.md
async function testConnectionBoot() {
  try {
    await getDocFromServer(doc(db, '_system', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or starting up.');
    }
  }
}
testConnectionBoot().catch(() => {});

// -------------------------------------------------------------
// Auto-Sync Configuration & State
// -------------------------------------------------------------
const AUTO_SYNC_STORAGE_KEY = 'sdc_firebase_auto_sync_enabled';
const LAST_SYNC_TIME_KEY = 'sdc_firebase_last_sync_timestamp';
const LAST_SYNC_COUNT_KEY = 'sdc_firebase_last_sync_count';

export function isAutoSyncEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setAutoSyncEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SYNC_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('sdc_auto_sync_toggle', { detail: { enabled } }));
  } catch (e) {
    console.warn('Failed to save auto-sync toggle setting', e);
  }
}

export function getLastFirebaseSyncTime(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_TIME_KEY);
  } catch {
    return null;
  }
}

export function getLastFirebaseSyncCount(): number {
  try {
    const val = localStorage.getItem(LAST_SYNC_COUNT_KEY);
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

export interface AutoSyncStatus {
  enabled: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  lastSyncCount: number;
  databaseId: string;
  projectId: string;
  lastError: string | null;
}

export interface FirestoreBookingRecord {
  bookingRef: string;
  patientName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  dob?: string;
  patientType?: string;
  treatmentName: string;
  treatmentDuration?: string;
  estimatedFee?: string;
  doctorName: string;
  doctorSpec?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Rescheduled';
  notes?: string;
  branchName?: string;
  paymentMode?: string;
  paymentStatus?: string;
  amountPaidNow?: string;
  amountRemaining?: string;
  createdAt?: string;
  updatedAt?: any;
}

export interface FirestorePatientRecord {
  id?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email?: string;
  dob?: string;
  patientType?: string;
  notes?: string;
  lastBookingRef?: string;
  lastTreatment?: string;
  lastDoctor?: string;
  lastVisitDate?: string;
  totalBookings?: number;
  updatedAt?: any;
}

/**
 * Save or update a booking in Firebase Firestore
 */
export async function saveBookingToFirestore(payload: Record<string, any>): Promise<{ success: boolean; id: string; error?: string }> {
  const path = `bookings/${payload.bookingRef || 'unknown'}`;
  try {
    const bookingRef = payload.bookingRef || `SCD-${Date.now()}`;
    const docRef = doc(firestore, 'bookings', bookingRef);

    const bookingData: FirestoreBookingRecord = {
      bookingRef,
      patientName: `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || payload.patientName || 'Patient',
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      phone: payload.phone || '',
      email: payload.email || '',
      dob: payload.dob || '',
      patientType: payload.patientType || 'Standard',
      treatmentName: payload.treatmentName || 'Dental Care',
      treatmentDuration: payload.treatmentDuration || '30 min',
      estimatedFee: payload.estimatedFee || payload.treatmentPrice || '₹500',
      doctorName: payload.doctorName || 'Dental Specialist',
      doctorSpec: payload.doctorSpec || payload.doctorSpecialization || '',
      appointmentDate: payload.appointmentDate || payload.date || '',
      appointmentTime: payload.appointmentTime || payload.time || '',
      status: (payload.status as any) || 'Confirmed',
      notes: payload.notes || payload.medicalNotes || '',
      branchName: payload.branchName || 'Main Clinic',
      paymentMode: payload.paymentMode || 'Pay at Clinic',
      paymentStatus: payload.paymentStatus || 'Pending',
      amountPaidNow: payload.amountPaidNow || '₹0',
      amountRemaining: payload.amountRemaining || '₹0',
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, bookingData, { merge: true });

    // Also auto-update / store in the patients collection
    if (bookingData.phone) {
      await savePatientToFirestore({
        firstName: bookingData.firstName || '',
        lastName: bookingData.lastName || '',
        fullName: bookingData.patientName,
        phone: bookingData.phone,
        email: bookingData.email,
        dob: bookingData.dob,
        patientType: bookingData.patientType,
        notes: bookingData.notes,
        lastBookingRef: bookingRef,
        lastTreatment: bookingData.treatmentName,
        lastDoctor: bookingData.doctorName,
        lastVisitDate: bookingData.appointmentDate,
      });
    }

    return { success: true, id: bookingRef };
  } catch (err: any) {
    console.error('Failed to save booking to Firestore:', err);
    return { success: false, id: payload.bookingRef || '', error: err.message };
  }
}

/**
 * Save or update patient profile in Firebase Firestore
 */
export async function savePatientToFirestore(patient: Partial<FirestorePatientRecord>): Promise<boolean> {
  if (!patient.phone) return false;
  const cleanPhone = patient.phone.replace(/[^0-9+]/g, '');
  const path = `patients/${cleanPhone}`;
  try {
    const patientDocRef = doc(firestore, 'patients', cleanPhone);
    const existingSnap = await getDoc(patientDocRef);
    let totalBookings = 1;
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      totalBookings = (data.totalBookings || 0) + 1;
    }

    await setDoc(patientDocRef, {
      ...patient,
      phone: cleanPhone,
      totalBookings,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return true;
  } catch (err) {
    console.error('Failed to save patient to Firestore:', err);
    return false;
  }
}

/**
 * Update booking status in Firestore (e.g. Cancelled, Rescheduled, Completed)
 */
export async function updateBookingStatusInFirestore(bookingRef: string, status: string, additionalData: Record<string, any> = {}): Promise<boolean> {
  const path = `bookings/${bookingRef}`;
  try {
    const docRef = doc(firestore, 'bookings', bookingRef);
    await updateDoc(docRef, {
      status,
      ...additionalData,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error('Failed to update booking status in Firestore:', err);
    return false;
  }
}

/**
 * Reschedule booking in Firestore with new date and time
 */
export async function rescheduleBookingInFirestore(
  bookingRef: string,
  newDate: string,
  newTime: string,
  reason: string = 'Patient requested new slot'
): Promise<boolean> {
  return updateBookingStatusInFirestore(bookingRef, 'Confirmed', {
    appointmentDate: newDate,
    appointmentTime: newTime,
    rescheduleReason: reason,
    rescheduledAt: new Date().toISOString(),
  });
}

/**
 * Cancel booking in Firestore
 */
export async function cancelBookingInFirestore(
  bookingRef: string,
  reason: string = 'Patient requested cancellation'
): Promise<boolean> {
  return updateBookingStatusInFirestore(bookingRef, 'Cancelled', {
    cancellationReason: reason,
    cancelledAt: new Date().toISOString(),
  });
}

/**
 * Delete booking from Firestore
 */
export async function deleteBookingFromFirestore(bookingRef: string): Promise<boolean> {
  try {
    const docRef = doc(firestore, 'bookings', bookingRef);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Failed to delete booking from Firestore:', err);
    return false;
  }
}

/**
 * Auto-Sync All Patient Records directly to Firebase Firestore
 * Called automatically by background daemon and on database mutations
 */
export async function autoSyncAllRecordsToFirestore(
  records: PatientRecord[], 
  source: string = 'AutoSyncDaemon'
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  if (!records || !Array.isArray(records) || records.length === 0) {
    return { success: true, syncedCount: 0 };
  }

  try {
    let synced = 0;
    for (const record of records) {
      const res = await saveBookingToFirestore(record);
      if (res.success) synced++;
    }

    const nowIso = new Date().toISOString();
    // Update sync_metadata/status
    const metaRef = doc(firestore, 'sync_metadata', 'status');
    await setDoc(metaRef, {
      lastAutoSync: nowIso,
      totalRecords: records.length,
      syncedCount: synced,
      databaseId: firebaseConfig.firestoreDatabaseId,
      projectId: firebaseConfig.projectId,
      syncedBy: source,
      status: 'SUCCESS',
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Store in localStorage for rapid UI hydration
    try {
      localStorage.setItem(LAST_SYNC_TIME_KEY, nowIso);
      localStorage.setItem(LAST_SYNC_COUNT_KEY, synced.toString());
      window.dispatchEvent(new CustomEvent('sdc_auto_sync_completed', { 
        detail: { timestamp: nowIso, count: synced } 
      }));
    } catch {}

    return { success: true, syncedCount: synced };
  } catch (err: any) {
    console.error('Auto-sync to Firebase Firestore failed:', err);
    return { success: false, syncedCount: 0, error: err.message || String(err) };
  }
}

/**
 * Sync dental service catalog to Firebase Firestore
 */
export async function syncServicesToFirestore(treatments: Treatment[]): Promise<number> {
  let count = 0;
  try {
    for (const t of treatments) {
      const serviceDocRef = doc(firestore, 'services', t.id);
      await setDoc(serviceDocRef, {
        id: t.id,
        name: t.name,
        desc: t.desc,
        dur: t.dur,
        price: t.price,
        icon: t.icon,
        cat: t.cat,
        isActive: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      count++;
    }
  } catch (err) {
    console.error('Failed to sync services to Firestore:', err);
  }
  return count;
}

/**
 * Fetch services catalog from Firebase Firestore
 */
export async function getServicesFromFirestore(): Promise<Treatment[]> {
  try {
    const colRef = collection(firestore, 'services');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return [];
    return snapshot.docs.map((d) => d.data() as Treatment);
  } catch (err) {
    console.error('Failed to fetch services from Firestore:', err);
    return [];
  }
}

/**
 * Fetch recent bookings from Firebase Firestore
 */
export async function getRecentBookingsFromFirestore(limitCount: number = 50): Promise<FirestoreBookingRecord[]> {
  try {
    const colRef = collection(firestore, 'bookings');
    const q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as FirestoreBookingRecord);
  } catch (err) {
    try {
      const colRef = collection(firestore, 'bookings');
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map((d) => d.data() as FirestoreBookingRecord);
    } catch (e) {
      console.error('Error fetching bookings from Firestore:', e);
      return [];
    }
  }
}

/**
 * Test connectivity to the provisioned Firestore database
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string; databaseId: string }> {
  try {
    const testDoc = doc(firestore, '_system', 'ping');
    await setDoc(testDoc, { ping: true, timestamp: Date.now() }, { merge: true });
    return {
      connected: true,
      message: 'Successfully connected to Firebase Firestore!',
      databaseId: firebaseConfig.firestoreDatabaseId,
    };
  } catch (err: any) {
    console.error('Firestore connection test failed:', err);
    return {
      connected: false,
      message: err.message || 'Connection failed',
      databaseId: firebaseConfig.firestoreDatabaseId,
    };
  }
}

/**
 * Sync multi-branch hierarchy directly into Firestore:
 * Structure: Branch -> Dentists -> Services
 */
export async function syncBranchHierarchyToFirestore(
  hierarchy: BranchHierarchyItem[] = BRANCH_HIERARCHY
): Promise<{ success: boolean; branchesSynced: number; dentistsSynced: number; servicesSynced: number }> {
  let branchesSynced = 0;
  let dentistsSynced = 0;
  let servicesSynced = 0;

  try {
    for (const item of hierarchy) {
      const branch = item.branch;
      const branchRef = doc(firestore, 'branches', branch.id);

      await setDoc(branchRef, {
        id: branch.id,
        name: branch.name,
        shortName: branch.shortName,
        address: branch.address,
        areaCityPincode: branch.areaCityPincode,
        phone: branch.phone,
        emergencyPhone: branch.emergencyPhone,
        email: branch.email,
        landmark: branch.landmark,
        timings: branch.timings,
        isMain: branch.isMain,
        isActive: branch.isActive,
        dentistIds: item.dentists.map((d) => d.id),
        dentistsCount: item.dentists.length,
        servicesCount: branch.servicesCount || 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      branchesSynced++;

      // Write Dentists subcollection: /branches/{branchId}/dentists/{dentistId}
      for (const dentist of item.dentists) {
        const dentistRef = doc(firestore, `branches/${branch.id}/dentists`, dentist.id);
        await setDoc(dentistRef, {
          id: dentist.id,
          name: dentist.name,
          spec: dentist.spec,
          qualifications: dentist.qualifications,
          experience: dentist.experience,
          rating: dentist.rating,
          reviewsCount: dentist.reviewsCount,
          avatarBg: dentist.avatarBg,
          avatarIcon: dentist.avatarIcon,
          phone: dentist.phone || '',
          email: dentist.email || '',
          branchId: branch.id,
          serviceIds: dentist.serviceIds,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        dentistsSynced++;

        // Write Services subcollection: /branches/{branchId}/dentists/{dentistId}/services/{serviceId}
        for (const service of dentist.services) {
          const serviceRef = doc(firestore, `branches/${branch.id}/dentists/${dentist.id}/services`, service.id);
          await setDoc(serviceRef, {
            id: service.id,
            name: service.name,
            desc: service.desc,
            dur: service.dur,
            price: service.price,
            icon: service.icon,
            cat: service.cat,
            branchId: branch.id,
            dentistId: dentist.id,
            isActive: true,
            updatedAt: serverTimestamp(),
          }, { merge: true });
          servicesSynced++;
        }
      }
    }

    return { success: true, branchesSynced, dentistsSynced, servicesSynced };
  } catch (err: any) {
    console.error('Failed to sync branch hierarchy to Firestore:', err);
    return { success: false, branchesSynced, dentistsSynced, servicesSynced };
  }
}

/**
 * Fetch branches from Firestore
 */
export async function getFirestoreBranches(): Promise<ClinicBranch[]> {
  try {
    const colRef = collection(firestore, 'branches');
    const snap = await getDocs(colRef);
    if (snap.empty) return [];
    return snap.docs.map((d) => d.data() as ClinicBranch);
  } catch (err) {
    console.warn('Could not fetch branches from Firestore:', err);
    return [];
  }
}
