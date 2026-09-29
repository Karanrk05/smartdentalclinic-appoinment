import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  FileText,
  Building2,
  MessageSquare,
  Send,
  Printer,
  Sparkles,
  Trash2,
  ShieldCheck,
  FileCode,
  Database,
  Ban,
  Star,
  Cloud,
  Edit3,
} from 'lucide-react';
import { PatientRecord, ClinicProfile, DEFAULT_CLINIC_PROFILE, WeeklyBackupMetadata } from '../types';
import { 
  cleanPhoneNumber, 
  buildWhatsAppLink, 
  generateWhatsAppReschedulePatientText, 
  generateWhatsAppCancelPatientText 
} from './WhatsAppShareModal';
import { PrintSummaryModal } from './PrintSummaryModal';
import {
  getLocalCachedPatientRecords,
  saveLocalCachedPatientRecords,
  clearLocalCachedPatientRecords,
  clearPendingOfflineQueue,
} from '../utils/offlineEngine';
import {
  saveBookingToFirestore,
  testFirestoreConnection,
  firebaseConfig,
  rescheduleBookingInFirestore,
  cancelBookingInFirestore,
  updateBookingStatusInFirestore,
  deleteBookingFromFirestore,
  autoSyncAllRecordsToFirestore,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getLastFirebaseSyncTime,
  getLastFirebaseSyncCount,
} from '../firebase';
import {
  fetchMonthLedgerStatus,
  archiveCurrentMonthNow,
  MonthLedgerStatusResponse,
} from '../utils/excelDbAutoArchive';

interface ExcelDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicProfile?: ClinicProfile;
  onRefreshNeeded?: () => void;
  onOpenSmartReminder?: (appointment: any) => void;
  onOpenAiInsights?: () => void;
}

export const ExcelDatabaseModal: React.FC<ExcelDatabaseModalProps> = ({
  isOpen,
  onClose,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onOpenSmartReminder,
  onOpenAiInsights,
  onRefreshNeeded,
}) => {
  const [records, setRecords] = useState<PatientRecord[]>(() => getLocalCachedPatientRecords());
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [slipToPrint, setSlipToPrint] = useState<PatientRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [whatsappNotice, setWhatsappNotice] = useState<{
    type: 'RESCHEDULE' | 'CANCEL';
    url: string;
    label: string;
    message: string;
  } | null>(null);
  const [backupMetadata, setBackupMetadata] = useState<WeeklyBackupMetadata | null>(null);
  const [isSyncingBackup, setIsSyncingBackup] = useState<boolean>(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);
  const [autoSyncOn, setAutoSyncOn] = useState<boolean>(() => isAutoSyncEnabled());
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => getLastFirebaseSyncTime());
  const [lastSyncCount, setLastSyncCount] = useState<number>(() => getLastFirebaseSyncCount());
  const [monthLedgerStatus, setMonthLedgerStatus] = useState<MonthLedgerStatusResponse | null>(null);
  const [isArchivingMonth, setIsArchivingMonth] = useState<boolean>(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<boolean>(false);

  // Edit Patient Details state
  const [editingPatientRecord, setEditingPatientRecord] = useState<PatientRecord | null>(null);
  const [editPatientForm, setEditPatientForm] = useState<Partial<PatientRecord>>({});
  const [isSavingPatientEdit, setIsSavingPatientEdit] = useState<boolean>(false);

  const handleStartEditPatient = (record: PatientRecord) => {
    setEditingPatientRecord(record);
    setEditPatientForm({
      patientName: record.patientName,
      phone: record.phone,
      email: record.email || '',
      notes: record.notes || '',
      status: record.status || 'Confirmed',
      paymentMode: record.paymentMode || 'Pay at Clinic',
    });
  };

  const handleSavePatientEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingPatientRecord) return;
    setIsSavingPatientEdit(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(editingPatientRecord.bookingRef)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPatientForm),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const updatedList = records.map((r) =>
          r.bookingRef === editingPatientRecord.bookingRef ? { ...r, ...editPatientForm } : r
        );
        setRecords(updatedList);
        saveLocalCachedPatientRecords(updatedList);
        if (selectedRecord && selectedRecord.bookingRef === editingPatientRecord.bookingRef) {
          setSelectedRecord({ ...selectedRecord, ...editPatientForm });
        }
        setActionStatus(`Updated patient details for ${editingPatientRecord.bookingRef} successfully!`);
        setTimeout(() => setActionStatus(null), 4000);
        setEditingPatientRecord(null);
        window.dispatchEvent(new CustomEvent('sdc_trigger_firebase_auto_sync'));
        window.dispatchEvent(new CustomEvent('sdc_admin_data_updated', { detail: { type: 'booking_updated' } }));
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert(data.error || 'Failed to update patient record.');
      }
    } catch (err) {
      alert('Network error while saving patient details.');
    } finally {
      setIsSavingPatientEdit(false);
    }
  };

  const refreshMonthLedgerStatus = async () => {
    const status = await fetchMonthLedgerStatus();
    if (status) {
      setMonthLedgerStatus(status);
    }
  };

  const handleArchiveMonthNow = async () => {
    setIsArchivingMonth(true);
    setActionStatus('Archiving current month and generating Excel download before reloading to new sheet…');
    try {
      const res = await archiveCurrentMonthNow();
      if (res.success) {
        setActionStatus(`Successfully archived ${res.recordsArchived || 0} records! Downloaded ${res.fileName}. Database reloaded with a fresh sheet for new appointments.`);
        setShowArchiveConfirm(false);
        await fetchRecords();
        await refreshMonthLedgerStatus();
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        setActionStatus(`Error archiving month: ${res.error || 'Failed'}`);
      }
    } catch (err: any) {
      setActionStatus(`Error archiving month: ${err.message || 'Network error'}`);
    } finally {
      setIsArchivingMonth(false);
      setTimeout(() => setActionStatus(null), 8000);
    }
  };

  // Listen for background auto-sync completion events
  useEffect(() => {
    const handleAutoSyncDone = (e: any) => {
      if (e && e.detail) {
        setLastSyncTime(e.detail.timestamp);
        setLastSyncCount(e.detail.count);
        setFirebaseStatus(`Auto-synced (${e.detail.count} records)`);
      }
    };
    window.addEventListener('sdc_auto_sync_completed', handleAutoSyncDone);
    return () => window.removeEventListener('sdc_auto_sync_completed', handleAutoSyncDone);
  }, []);

  // Rescheduling and Cancellation state
  const [reschedulingRecord, setReschedulingRecord] = useState<PatientRecord | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('10:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState<string>('Administrative schedule adjustment');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const [cancellingRecord, setCancellingRecord] = useState<PatientRecord | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('Patient requested cancellation');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  const handleStartReschedule = (rec: PatientRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReschedulingRecord(rec);
    setRescheduleDate(rec.appointmentDate || new Date().toISOString().split('T')[0]);
    setRescheduleTime(rec.appointmentTime || '10:00 AM');
    setRescheduleReason('Administrative schedule adjustment');
  };

  const handleStartCancel = (rec: PatientRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCancellingRecord(rec);
    setCancelReasonInput('Patient requested cancellation');
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingRecord || !rescheduleDate || !rescheduleTime) return;
    setIsSubmittingReschedule(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(reschedulingRecord.bookingRef)}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: rescheduleDate,
          time: rescheduleTime,
          reason: rescheduleReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = records.map((r) =>
          r.bookingRef.toUpperCase() === reschedulingRecord.bookingRef.toUpperCase()
            ? { ...r, appointmentDate: rescheduleDate, appointmentTime: rescheduleTime, status: 'Confirmed' }
            : r
        );
        setRecords(updated);
        saveLocalCachedPatientRecords(updated);
        if (selectedRecord?.bookingRef.toUpperCase() === reschedulingRecord.bookingRef.toUpperCase()) {
          setSelectedRecord({
            ...selectedRecord,
            appointmentDate: rescheduleDate,
            appointmentTime: rescheduleTime,
            status: 'Confirmed',
          });
        }
        rescheduleBookingInFirestore(reschedulingRecord.bookingRef, rescheduleDate, rescheduleTime, rescheduleReason).catch(console.warn);
        
        const resText = generateWhatsAppReschedulePatientText({
          bookingRef: reschedulingRecord.bookingRef,
          patientName: reschedulingRecord.patientName || 'Patient',
          doctorName: reschedulingRecord.doctorName || 'Dentist',
          treatmentName: reschedulingRecord.treatmentName || 'Dental Procedure',
          newDate: rescheduleDate,
          newTime: rescheduleTime,
          clinicName: clinicProfile.name,
          clinicPhone: clinicProfile.phone,
          clinicAddress: reschedulingRecord.branchAddress || clinicProfile.address,
          reason: rescheduleReason,
        });
        const resUrl = data.patientWhatsAppUrl || buildWhatsAppLink(reschedulingRecord.phone || '', resText);
        setWhatsappNotice({
          type: 'RESCHEDULE',
          url: resUrl,
          label: `${reschedulingRecord.patientName || 'Patient'} (${reschedulingRecord.bookingRef}) - New Slot: ${rescheduleDate} at ${rescheduleTime}`,
          message: data.patientWhatsAppMessage || resText,
        });

        setActionStatus(`Appointment ${reschedulingRecord.bookingRef} rescheduled to ${rescheduleDate} at ${rescheduleTime}. Dual WhatsApp notifications dispatched.`);
        setTimeout(() => setActionStatus(null), 7000);
        setReschedulingRecord(null);
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert(data.error || 'Failed to reschedule appointment');
      }
    } catch (err) {
      alert('Network error while rescheduling appointment.');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRecord) return;
    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(cancellingRecord.bookingRef)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReasonInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updated = records.map((r) =>
          r.bookingRef.toUpperCase() === cancellingRecord.bookingRef.toUpperCase()
            ? { ...r, status: 'Cancelled' }
            : r
        );
        setRecords(updated);
        saveLocalCachedPatientRecords(updated);
        if (selectedRecord?.bookingRef.toUpperCase() === cancellingRecord.bookingRef.toUpperCase()) {
          setSelectedRecord({ ...selectedRecord, status: 'Cancelled' });
        }
        cancelBookingInFirestore(cancellingRecord.bookingRef, cancelReasonInput).catch(console.warn);

        const canText = generateWhatsAppCancelPatientText({
          bookingRef: cancellingRecord.bookingRef,
          patientName: cancellingRecord.patientName || 'Patient',
          doctorName: cancellingRecord.doctorName || 'Dentist',
          treatmentName: cancellingRecord.treatmentName || 'Dental Procedure',
          cancelledDate: cancellingRecord.appointmentDate || '',
          cancelledTime: cancellingRecord.appointmentTime || '',
          clinicName: clinicProfile.name,
          clinicPhone: clinicProfile.phone,
          reason: cancelReasonInput,
        });
        const canUrl = data.patientWhatsAppUrl || buildWhatsAppLink(cancellingRecord.phone || '', canText);
        setWhatsappNotice({
          type: 'CANCEL',
          url: canUrl,
          label: `${cancellingRecord.patientName || 'Patient'} (${cancellingRecord.bookingRef}) - Cancelled`,
          message: data.patientWhatsAppMessage || canText,
        });

        setActionStatus(`Appointment ${cancellingRecord.bookingRef} cancelled. WhatsApp cancellation notices dispatched.`);
        setTimeout(() => setActionStatus(null), 7000);
        setCancellingRecord(null);
        if (onRefreshNeeded) onRefreshNeeded();
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      alert('Network error while cancelling appointment.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      testFirestoreConnection()
        .then((res) => {
          if (res.connected) {
            setFirebaseStatus(`Connected (${firebaseConfig.projectId})`);
          } else {
            setFirebaseStatus(`Offline (${res.message})`);
          }
        })
        .catch(() => {
          setFirebaseStatus('Available');
        });
    }
  }, [isOpen]);

  const handleSyncAllToFirebase = async () => {
    if (!records.length) return;
    setIsSyncingFirebase(true);
    setFirebaseStatus('Syncing all records to Firestore...');
    try {
      const res = await autoSyncAllRecordsToFirestore(records, 'ManualSyncModal');
      if (res.success) {
        setFirebaseStatus(`Synced ${res.syncedCount} records to Firebase!`);
        setActionStatus(`Firebase Cloud Sync: Successfully synced ${res.syncedCount} bookings to Firebase Firestore.`);
        setLastSyncTime(new Date().toISOString());
        setLastSyncCount(res.syncedCount);
      } else {
        setFirebaseStatus(`Sync notice: ${res.error}`);
      }
    } catch (err: any) {
      setFirebaseStatus(`Sync error: ${err.message || err}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSyncOn(enabled);
    setAutoSyncEnabled(enabled);
    if (enabled) {
      setActionStatus('Auto-Sync to Firebase is now ENABLED. All appointments will synchronize automatically in real-time.');
      if (records.length > 0) {
        handleSyncAllToFirebase();
      }
    } else {
      setActionStatus('Auto-Sync to Firebase is now PAUSED.');
    }
    setTimeout(() => setActionStatus(null), 4000);
  };

  const triggerWeeklyBackupRoutine = async (force: boolean = false) => {
    if (force) setIsSyncingBackup(true);
    try {
      const res = await fetch('/api/backup/weekly-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force,
          trigger: force
            ? 'Manual Admin Sync Request'
            : 'ExcelDatabaseModal Open (Weekly Routine)',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.backup) {
          setBackupMetadata(json.backup);
          if (json.backupPerformed) {
            setActionStatus(
              json.reason === 'INITIAL_BACKUP'
                ? `Initial Backup Created: Synced ${json.backup.totalRecords} records to secondary JSON storage (data/patients_weekly_backup.json).`
                : json.reason === 'WEEKLY_SCHEDULE_DUE'
                ? `Automated 7-Day Weekly Backup: Synced ${json.backup.totalRecords} records to secondary JSON storage.`
                : `Secondary JSON Storage Synced: ${json.backup.totalRecords} records updated.`
            );
          }
        }
      }
    } catch (err) {
      console.warn('Automated weekly backup sync error:', err);
    } finally {
      setIsSyncingBackup(false);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRecords(json.data);
          saveLocalCachedPatientRecords(json.data);
          // Auto-sync to Firebase if enabled
          if (isAutoSyncEnabled() && json.data.length > 0) {
            autoSyncAllRecordsToFirestore(json.data, 'ExcelModalAutoSync').then((syncRes) => {
              if (syncRes.success) {
                setLastSyncTime(new Date().toISOString());
                setLastSyncCount(syncRes.syncedCount);
                setFirebaseStatus(`Auto-synced (${syncRes.syncedCount} records)`);
              }
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.warn('Network offline or error. Using locally cached records:', err);
      const cached = getLocalCachedPatientRecords();
      if (cached.length > 0) {
        setRecords(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecords();
      triggerWeeklyBackupRoutine(false);
      refreshMonthLedgerStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const doctorNames = Array.from(new Set(records.map((r) => r.doctorName).filter(Boolean)));

  const filteredRecords = records.filter((r) => {
    if (selectedDoctorFilter !== 'all' && r.doctorName !== selectedDoctorFilter) {
      return false;
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.patientName.toLowerCase().includes(q) ||
      r.bookingRef.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.treatmentName.toLowerCase().includes(q) ||
      r.doctorName.toLowerCase().includes(q) ||
      (r.paymentMode && r.paymentMode.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200/90 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Simple & Professional */}
        <div className="bg-slate-900 text-white px-5 sm:px-7 py-3.5 sm:py-4 flex items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shrink-0">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                  Patients Database
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-300 font-medium bg-blue-950/80 border border-blue-700/60 px-2 py-0.5 rounded-md">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>{monthLedgerStatus?.activeMonthLabel || '1-Month Ledger'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Excel Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal mt-0.5 hidden sm:block truncate">
                1-Month Ledger (<code className="text-slate-300 font-mono">data/patients_records.xlsx</code>) · Auto-downloads before reloading to new sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 1-Month Archive & Auto-Download Action */}
            <button
              type="button"
              id="btn-archive-month-modal"
              onClick={() => setShowArchiveConfirm(true)}
              disabled={isArchivingMonth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white font-medium text-xs border border-amber-500/40 transition-colors cursor-pointer whitespace-nowrap"
              title="Archive current month and auto-download Excel sheet before resetting to a fresh new sheet"
            >
              <Download className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Archive & Download Month</span>
              <span className="sm:hidden">Archive</span>
            </button>

            <a
              id="btn-download-backend-excel"
              href="/api/patients/export-excel"
              download="SmartDental_Patients_Records.xlsx"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              title={`Download ${monthLedgerStatus?.activeMonthLabel || 'Current Month'} Excel Spreadsheet`}
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download .XLSX</span>
            </a>

            <a
              id="btn-download-secondary-json-backup"
              href="/api/backup/download"
              download="SmartDental_Patients_Weekly_Backup.json"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
              title="Download Secondary JSON Backup file"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>Backup .JSON</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Rollover & Archive Confirmation Dialog */}
        {showArchiveConfirm && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <Download className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-900 font-bold">Archive & Auto-Download Month's Sheet:</strong>
                <p className="text-amber-800 mt-0.5">
                  This will generate and automatically download the completed Excel spreadsheet for <strong>{monthLedgerStatus?.activeMonthLabel || 'the current month'}</strong> ({records.length} records), and reload the database with a clean sheet for the new month.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-amber-800 font-medium hover:bg-amber-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveMonthNow}
                disabled={isArchivingMonth}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isArchivingMonth ? 'Downloading…' : 'Confirm & Download'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Past Archived Monthly Sheets Quick Bar (if archives exist) */}
        {monthLedgerStatus?.archives && monthLedgerStatus.archives.length > 0 && (
          <div className="bg-slate-100/90 border-b border-slate-200 px-5 sm:px-7 py-1.5 flex items-center gap-2 text-[11px] overflow-x-auto text-slate-600">
            <span className="font-semibold text-slate-700 shrink-0">Archived Months:</span>
            {monthLedgerStatus.archives.slice(0, 4).map((arch) => (
              <a
                key={arch.fileName}
                href={arch.downloadUrl}
                download={arch.fileName}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-200 border border-slate-200 text-slate-800 text-[10.5px] font-medium transition-colors shrink-0"
                title={`Download ${arch.monthLabel} (${(arch.sizeBytes / 1024).toFixed(1)} KB)`}
              >
                <Download className="w-3 h-3 text-slate-500" />
                <span>{arch.monthLabel}</span>
              </a>
            ))}
          </div>
        )}

        {/* Sync & Backup Status Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 sm:px-7 py-2 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto-Sync to Firebase Switch */}
            <div className="flex items-center gap-2 text-slate-700 font-medium text-xs">
              <span className={`w-2 h-2 rounded-full ${autoSyncOn ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span>Cloud Sync:</span>
              <button
                type="button"
                onClick={() => handleToggleAutoSync(!autoSyncOn)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  autoSyncOn
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                title={autoSyncOn ? 'Auto-sync active. Click to pause.' : 'Auto-sync paused. Click to enable continuous cloud sync.'}
              >
                {autoSyncOn ? 'ON' : 'OFF'}
              </button>
              {lastSyncCount > 0 && (
                <span className="text-slate-500 text-xs hidden md:inline">
                  ({lastSyncCount} records synced)
                </span>
              )}
            </div>

            {firebaseStatus && (
              <span className="text-slate-500 text-xs hidden lg:inline">
                · Status: <span className="text-slate-700">{firebaseStatus}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-sync-firebase-now"
              onClick={handleSyncAllToFirebase}
              disabled={isSyncingFirebase || !records.length}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Upload and sync all bookings and patient profiles to Firebase Firestore now"
            >
              <Cloud className={`w-3 h-3 text-slate-500 ${isSyncingFirebase ? 'animate-bounce' : ''}`} />
              <span>{isSyncingFirebase ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            <button
              type="button"
              id="btn-sync-backup-now"
              onClick={() => triggerWeeklyBackupRoutine(true)}
              disabled={isSyncingBackup}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Sync current Excel data to secondary JSON backup storage immediately"
            >
              <RefreshCw className={`w-3 h-3 text-slate-500 ${isSyncingBackup ? 'animate-spin' : ''}`} />
              <span>{isSyncingBackup ? 'Backing up...' : 'Backup Now'}</span>
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-5 sm:px-7 py-2.5 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, phone, booking ref, treatment…"
                className="w-full pl-9 pr-3 py-1.5 text-xs font-normal bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="text-xs font-normal bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer shrink-0"
              title="Filter by assigned Doctor"
            >
              <option value="all">All Doctors ({records.length})</option>
              {doctorNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({records.filter((r) => r.doctorName === name).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {onOpenAiInsights && (
              <button
                type="button"
                id="btn-open-ai-insights-toolbar"
                onClick={onOpenAiInsights}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="View Gemini AI Insights"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Insights</span>
              </button>
            )}

            <span className="text-xs text-slate-500">
              Showing <strong className="text-slate-900 font-semibold">{filteredRecords.length}</strong> of {records.length}
            </span>

            {records.length > 0 && (
              <button
                type="button"
                id="btn-clear-all-records"
                onClick={() => setShowClearConfirm(true)}
                className="px-2 py-1 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium hover:bg-rose-100 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}

            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Action feedback status banner */}
        {actionStatus && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium text-emerald-800 animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionStatus}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionStatus(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* WhatsApp Notification Action Banner */}
        {whatsappNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium text-emerald-900 animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
                <MessageSquare className="w-3 h-3 fill-white" />
              </div>
              <span>
                <strong className="font-semibold mr-1">
                  [{whatsappNotice.type === 'RESCHEDULE' ? 'Rescheduled' : 'Cancelled'}]
                </strong>
                WhatsApp message prepared: {whatsappNotice.label}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={whatsappNotice.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-md bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="w-3 h-3 fill-white" />
                <span>Open WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsappNotice.message);
                  alert('WhatsApp message copied to clipboard!');
                }}
                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs cursor-pointer"
              >
                Copy Text
              </button>
              <button
                type="button"
                onClick={() => setWhatsappNotice(null)}
                className="text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs font-medium">Loading records from server…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-800">No patient records found</p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'Try clearing your search query.' : 'Bookings made by patients will be saved automatically here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-medium uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Ref #</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Patient</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Contact</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Treatment</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Doctor</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Schedule</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Fee</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Payment</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-3.5 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((rec) => (
                    <tr
                      key={rec.bookingRef}
                      onClick={() => setSelectedRecord(rec)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3.5 font-mono font-medium text-blue-600 whitespace-nowrap">
                        {rec.bookingRef}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{rec.patientName}</div>
                        <div className="text-[10px] text-slate-500">{rec.patientType}</div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-700">
                        <div className="font-normal">{rec.phone}</div>
                        <div className="text-[10px] text-slate-400">{rec.email}</div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{rec.treatmentName}</div>
                        <div className="text-[10px] text-slate-400">{rec.treatmentDuration}</div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{rec.doctorName}</div>
                        <div className="text-[10px] text-slate-400">{rec.doctorSpecialization}</div>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-700">
                        <div>{rec.appointmentDate}</div>
                        <div className="text-[10px] text-slate-500">{rec.appointmentTime}</div>
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                        {rec.estimatedFee}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {rec.paymentStatus?.toLowerCase().includes('paid') ? (
                          <span className="text-emerald-700 font-medium text-xs">
                            ₹200 Paid
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            Pay at Clinic
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            rec.status === 'Cancelled'
                              ? 'text-rose-600'
                              : rec.status === 'Completed'
                              ? 'text-blue-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rec.status === 'Cancelled'
                                ? 'bg-rose-500'
                                : rec.status === 'Completed'
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reschedule Button */}
                          <button
                            type="button"
                            onClick={(e) => handleStartReschedule(rec, e)}
                            className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                            title={`Reschedule appointment ${rec.bookingRef}`}
                          >
                            Reschedule
                          </button>

                          {/* Cancel Button */}
                          {rec.status !== 'Cancelled' ? (
                            <button
                              type="button"
                              onClick={(e) => handleStartCancel(rec, e)}
                              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                              title={`Cancel appointment ${rec.bookingRef}`}
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-bold px-1.5 py-0.5 bg-rose-50 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detailed Selected Record Drawer / Card */}
          {selectedRecord && (
            <div className="mt-4 p-4 bg-[#eff6ff] border-2 border-[#2563eb] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-extrabold text-[#2563eb] text-sm flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>
                    Patient Details: {selectedRecord.patientName} ({selectedRecord.bookingRef})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="text-[#64748b] hover:text-[#0f172a] text-xs font-bold cursor-pointer"
                >
                  Close details ✕
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <span className="text-[#64748b] font-semibold">Date of Birth:</span>{' '}
                  <span className="font-bold text-[#0f172a]">{selectedRecord.dob}</span>
                </div>
                <div>
                  <span className="text-[#64748b] font-semibold">Booked on:</span>{' '}
                  <span className="font-bold text-[#0f172a]">{selectedRecord.bookingDate}</span>
                </div>
                <div>
                  <span className="text-[#64748b] font-semibold">Dentist:</span>{' '}
                  <span className="font-bold text-[#0f172a]">{selectedRecord.doctorName}</span>
                </div>
                <div>
                  <span className="text-[#64748b] font-semibold">Payment:</span>{' '}
                  <span className="font-bold text-[#0f172a]">
                    {selectedRecord.paymentMode || 'Pay at Counter'} ({selectedRecord.paymentStatus || 'Pending'})
                  </span>
                </div>
                {selectedRecord.attachmentName && selectedRecord.attachmentName !== 'None' && (
                  <div className="sm:col-span-2">
                    <span className="text-[#64748b] font-semibold">Attachment:</span>{' '}
                    <span className="font-bold text-blue-700">
                      📎 {selectedRecord.attachmentName} ({selectedRecord.attachmentSize || 'Uploaded'})
                    </span>
                  </div>
                )}
              </div>

              {selectedRecord.notes && (
                <div className="pt-1">
                  <span className="text-[#64748b] font-semibold">Medical / Patient Notes:</span>{' '}
                  <span className="text-[#0f172a] italic">"{selectedRecord.notes}"</span>
                </div>
              )}

              {/* Action Toolbar for selected record */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#dbeafe]">
                <div className="flex items-center gap-2">
                  <span className="text-[#64748b] text-[11px]">
                    Contact: {selectedRecord.phone} · {selectedRecord.email}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    24h Reminder Active
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`/api/reminders/calendar-ics/${selectedRecord.bookingRef}`}
                    download={`SmartDental_Appointment_${selectedRecord.bookingRef}.ics`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[#0f172a] font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Download iCal invite"
                  >
                    <span>.ICS Calendar</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = cleanPhoneNumber(selectedRecord.phone || '');
                      const msg = `🦷 *${clinicProfile.name.toUpperCase()}*\n*Appointment Confirmation & Slip*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nDear *${selectedRecord.patientName}*,\nYour appointment summary:\n\n• *Booking Ref:* ${selectedRecord.bookingRef}\n• *Treatment:* ${selectedRecord.treatmentName} (${selectedRecord.treatmentDuration})\n• *Dentist:* ${selectedRecord.doctorName} (${selectedRecord.doctorSpecialization})\n• *Date:* ${selectedRecord.appointmentDate}\n• *Time Slot:* ${selectedRecord.appointmentTime}\n• *Est. Fee:* ${selectedRecord.estimatedFee}\n\n🏥 *Location:* ${clinicProfile.name}\n${clinicProfile.address}, ${clinicProfile.areaCityPincode}\n📞 Helpline: ${clinicProfile.phone}\n\n⚠️ Please arrive 10 minutes early. Thank you! ✨`;
                      const url = cleaned
                        ? `https://api.whatsapp.com/send?phone=${cleaned}&text=${encodeURIComponent(msg)}`
                        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Slip</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSlipToPrint(selectedRecord)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2563eb] font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                    title="Preview and print official appointment slip for this patient"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>

                  {onOpenSmartReminder && (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenSmartReminder({
                          bookingRef: selectedRecord.bookingRef,
                          patientName: selectedRecord.patientName,
                          treatmentName: selectedRecord.treatmentName,
                          doctorName: selectedRecord.doctorName,
                          appointmentDate: selectedRecord.appointmentDate,
                          appointmentTime: selectedRecord.appointmentTime,
                          branchName: selectedRecord.branchName || clinicProfile.name,
                          branchAddress: clinicProfile.address,
                          patientPhone: selectedRecord.phone,
                          notes: selectedRecord.notes,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Generate AI Procedure-Specific Preparation Reminder"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                      <span>AI Reminder</span>
                    </button>
                  )}

                  {/* Mark Completed (triggers automatic Review Request WhatsApp) */}
                  {selectedRecord.status !== 'Completed' && selectedRecord.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/bookings/${encodeURIComponent(selectedRecord.bookingRef)}/status`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'Completed' }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            const updated = records.map(r => r.bookingRef === selectedRecord.bookingRef ? { ...r, status: 'Completed' } : r);
                            setRecords(updated);
                            saveLocalCachedPatientRecords(updated);
                            setSelectedRecord({ ...selectedRecord, status: 'Completed' });
                            // Auto-sync Completed status to Firebase Firestore
                            updateBookingStatusInFirestore(selectedRecord.bookingRef, 'Completed').catch(() => {});
                            window.dispatchEvent(new CustomEvent('sdc_trigger_firebase_auto_sync'));
                            setActionStatus(`Appointment ${selectedRecord.bookingRef} marked Completed! Automatic Google Review request dispatched to patient's WhatsApp.`);
                            setTimeout(() => setActionStatus(null), 5000);
                            if (onRefreshNeeded) onRefreshNeeded();
                          }
                        } catch (err) {
                          console.error('Error updating status:', err);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Mark Completed and trigger automatic Google Review WhatsApp message"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>Mark Completed & Request Review</span>
                    </button>
                  )}

                    {/* Edit Patient Details */}
                    <button
                      type="button"
                      onClick={() => handleStartEditPatient(selectedRecord)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Edit patient details, contact numbers, remarks, or booking status"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Edit Details</span>
                    </button>

                    {/* Reschedule Appointment */}
                    <button
                      type="button"
                      onClick={() => handleStartReschedule(selectedRecord)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Reschedule appointment to a new date and time slot"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reschedule Slot</span>
                    </button>

                    {/* Cancel Appointment (triggers automatic Cancellation WhatsApp to patient & doctor) */}
                    {selectedRecord.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleStartCancel(selectedRecord)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                        title="Cancel appointment and automatically send WhatsApp notifications to patient & doctor"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel & Auto-Notify WhatsApp</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Remove appointment ${selectedRecord.bookingRef} for ${selectedRecord.patientName}?`)) {
                          try {
                            await fetch(`/api/bookings/${encodeURIComponent(selectedRecord.bookingRef)}`, { method: 'DELETE' });
                            // Auto-delete from Firebase Firestore
                            deleteBookingFromFirestore(selectedRecord.bookingRef).catch(() => {});
                            window.dispatchEvent(new CustomEvent('sdc_trigger_firebase_auto_sync'));
                            window.dispatchEvent(new CustomEvent('sdc_admin_data_updated', { detail: { type: 'booking_deleted', bookingRef: selectedRecord.bookingRef } }));
                            const updated = records.filter(r => r.bookingRef !== selectedRecord.bookingRef);
                            setRecords(updated);
                            saveLocalCachedPatientRecords(updated);
                            setSelectedRecord(null);
                            setActionStatus(`Appointment ${selectedRecord.bookingRef} removed from database & synced.`);
                            setTimeout(() => setActionStatus(null), 3500);
                            if (onRefreshNeeded) onRefreshNeeded();
                          } catch (err) {
                            console.error('Error deleting single booking:', err);
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                      title="Remove this specific appointment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Record</span>
                    </button>
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f8fafc] border-t border-[#dbeafe] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#64748b]">
            <Building2 className="w-4 h-4 text-[#2563eb]" />
            <span>Smart Dental Clinic Database · Stored securely in backend XLSX</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/api/patients/export-excel"
              download="SmartDental_Patients_Records.xlsx"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Excel File</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#dbeafe] bg-white text-[#64748b] hover:text-[#0f172a] font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Interactive In-Modal Clear Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-red-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <X className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h4 className="text-base font-black text-slate-900">Clear All Patient Records?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                This will remove all <strong className="text-red-700">{records.length}</strong> patient records from the Excel file on the server. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-clear-patients"
                onClick={async () => {
                  setIsClearing(true);
                  try {
                    // 1. Delete on backend server Excel sheet & reminder store
                    const res = await fetch('/api/patients', { method: 'DELETE' });
                    let msg = 'All patient records have been permanently cleared from Excel.';
                    if (res.ok) {
                      const json = await res.json();
                      if (json.message) msg = json.message;
                    }

                    // 2. Wipe client-side offline cache & pending offline queue
                    clearLocalCachedPatientRecords();
                    clearPendingOfflineQueue();

                    // 3. Update local component state immediately
                    setRecords([]);
                    setSelectedRecord(null);

                    // 4. Notify parent application to refresh any active slot counts or badges
                    if (onRefreshNeeded) {
                      onRefreshNeeded();
                    }

                    // 5. Display reassuring confirmation banner
                    setActionStatus(msg);
                    setTimeout(() => setActionStatus(null), 4500);
                  } catch (e) {
                    console.error('Failed to clear patients:', e);
                    // Even if network fails, ensure offline local cache is cleared
                    clearLocalCachedPatientRecords();
                    setRecords([]);
                    setSelectedRecord(null);
                    setActionStatus('Local patient records cleared. Server will sync when online.');
                    setTimeout(() => setActionStatus(null), 4500);
                  } finally {
                    setIsClearing(false);
                    setShowClearConfirm(false);
                  }
                }}
                disabled={isClearing}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
              >
                {isClearing ? 'Clearing...' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Slip Preview Modal for Selected Patient Record */}
      {slipToPrint && (
        <PrintSummaryModal
          isOpen={true}
          onClose={() => setSlipToPrint(null)}
          booking={{
            branch: {
              id: slipToPrint.branchId || 'branch-1',
              name: slipToPrint.branchName || clinicProfile.name,
              shortName: slipToPrint.branchName || 'Clinic Branch',
              address: slipToPrint.branchAddress || clinicProfile.address,
              areaCityPincode: clinicProfile.areaCityPincode,
              phone: slipToPrint.branchPhone || clinicProfile.phone,
              emergencyPhone: clinicProfile.emergencyPhone,
              email: clinicProfile.email,
              landmark: clinicProfile.landmark,
              timings: 'Mon – Sat: 9:00 AM – 8:00 PM',
              isMain: true,
              isActive: true,
            },
            treatment: {
              id: 't-excel',
              cat: 'general',
              icon: '🦷',
              name: slipToPrint.treatmentName,
              desc: 'Scheduled dental treatment',
              dur: slipToPrint.treatmentDuration,
              price: slipToPrint.estimatedFee,
            },
            doctor: {
              id: 'd-excel',
              name: slipToPrint.doctorName,
              spec: slipToPrint.doctorSpecialization,
              qualifications: 'BDS, MDS',
              experience: '10+ Years',
              rating: 4.9,
              reviewsCount: 150,
              avatarBg: '#eff6ff',
              avatarIcon: '👨‍⚕️',
            },
            selectedDate: new Date(slipToPrint.appointmentDate),
            selectedTime: slipToPrint.appointmentTime,
            patient: {
              firstName: slipToPrint.firstName || slipToPrint.patientName.split(' ')[0] || '',
              lastName: slipToPrint.lastName || slipToPrint.patientName.split(' ')[1] || '',
              phone: slipToPrint.phone,
              email: slipToPrint.email,
              dob: slipToPrint.dob,
              patientType: (slipToPrint.patientType as any) || 'Standard patient',
              notes: slipToPrint.notes,
            },
            bookingRef: slipToPrint.bookingRef,
          }}
          clinicProfile={clinicProfile}
        />
      )}

      {/* Reschedule Modal Dialog */}
      {reschedulingRecord && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-blue-100 animate-scale-in">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base">Reschedule Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setReschedulingRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-blue-900">
                  {reschedulingRecord.patientName} ({reschedulingRecord.bookingRef})
                </div>
                <div className="text-blue-700">
                  Current: {reschedulingRecord.appointmentDate} at {reschedulingRecord.appointmentTime} · {reschedulingRecord.treatmentName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Appointment Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Time Slot</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                >
                  {['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM'].map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g., Patient requested new slot"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                💡 Rescheduling will automatically dispatch updated WhatsApp & SMS notifications to both the patient and the assigned doctor.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReschedulingRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={isSubmittingReschedule || !rescheduleDate || !rescheduleTime}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingReschedule ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingReschedule ? 'Rescheduling…' : 'Confirm & Notify WhatsApp'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Record Modal Dialog */}
      {editingPatientRecord && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-200 animate-scale-in">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-extrabold text-base">Edit Patient & Appointment Details</h3>
                  <p className="text-[11px] text-amber-100 font-mono">Ref: {editingPatientRecord.bookingRef}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatientRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePatientEdit} className="p-6 space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name</label>
                  <input
                    type="text"
                    value={editPatientForm.patientName || ''}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, patientName: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPatientForm.phone || ''}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editPatientForm.email || ''}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editPatientForm.status || 'Confirmed'}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={editPatientForm.paymentMode || 'Pay at Clinic'}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                  >
                    <option value="Pay at Clinic">Pay at Clinic</option>
                    <option value="UPI / QR Code">UPI / QR Code</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Dental Insurance">Dental Insurance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Remarks / Patient Notes</label>
                <textarea
                  rows={2}
                  value={editPatientForm.notes || ''}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, notes: e.target.value })}
                  placeholder="e.g. Patient requested morning slot, sensitive teeth"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPatientRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPatientEdit}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Edit3 className={`w-3.5 h-3.5 ${isSavingPatientEdit ? 'animate-spin' : ''}`} />
                  <span>{isSavingPatientEdit ? 'Saving…' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal Dialog */}
      {cancellingRecord && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-100 animate-scale-in">
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-white" />
                <h3 className="font-extrabold text-base">Cancel Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancellingRecord(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-left">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-rose-900">
                  {cancellingRecord.patientName} ({cancellingRecord.bookingRef})
                </div>
                <div className="text-rose-700">
                  Slot: {cancellingRecord.appointmentDate} at {cancellingRecord.appointmentTime} · {cancellingRecord.treatmentName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Reason for Cancellation</label>
                <input
                  type="text"
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  placeholder="e.g., Patient requested cancellation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                ⚠️ Cancelling this appointment will release the chair slot and automatically notify the patient and doctor on WhatsApp.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancellingRecord(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isSubmittingCancel}
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Ban className={`w-3.5 h-3.5 ${isSubmittingCancel ? 'animate-spin' : ''}`} />
                  <span>{isSubmittingCancel ? 'Cancelling…' : 'Confirm Cancellation & Notify'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
