import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProgressBar } from './components/ProgressBar';
import { BranchStep } from './components/BranchStep';
import { DoctorStep } from './components/DoctorStep';
import { TreatmentStep } from './components/TreatmentStep';
import { ScheduleStep, formatSlotTime, formatLocalDate } from './components/ScheduleStep';
import { DetailsStep } from './components/DetailsStep';
import { ConfirmStep } from './components/ConfirmStep';
import { SuccessStep } from './components/SuccessStep';
import { ExcelDatabaseModal } from './components/ExcelDatabaseModal';
import { AdminCornerModal } from './components/AdminCornerModal';
import { PatientHistoryModal } from './components/PatientHistoryModal';
import { AiPatientResponseModal } from './components/AiPatientResponseModal';
import { SmartReminderModal, SmartReminderData } from './components/SmartReminderModal';
import { DoctorMorningReminderModal } from './components/DoctorMorningReminderModal';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MobileAppTabBar } from './components/MobileAppTabBar';
import { GENERAL_TREATMENTS } from './data/treatments';
import { BookingState, Doctor, PatientDetails, Treatment, ClinicProfile, DEFAULT_CLINIC_PROFILE, ClinicBranch, DEFAULT_BRANCHES } from './types';
import { isDentistAtBranch, isServiceOfferedByDentist } from './data/branchHierarchy';
import { addLocalBookedSlot, checkClientDailyReset } from './utils/slotManager';
import { checkAndTriggerExcelMonthAutoDownload } from './utils/excelDbAutoArchive';
import {
  getCachedClinicProfile,
  saveCachedClinicProfile,
  getCachedBranches,
  saveCachedBranches,
  getCachedTreatments,
  saveCachedTreatments,
  getCachedDoctors,
  saveCachedDoctors,
  enqueueOfflineBooking,
} from './utils/offlineEngine';
import { getOrRegisterServiceWorker, syncPendingPushReminders } from './utils/browserPush';
import { 
  saveBookingToFirestore, 
  syncServicesToFirestore, 
  syncBranchHierarchyToFirestore,
  autoSyncAllRecordsToFirestore,
  isAutoSyncEnabled
} from './firebase';

const STORAGE_KEY = 'smartdental_booking_draft';
const STEP_STORAGE_KEY = 'smartdental_booking_step';

const INITIAL_PATIENT: PatientDetails = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  dob: '',
  patientType: '',
  notes: '',
};

const INITIAL_BOOKING: BookingState = {
  treatment: null,
  doctor: null,
  selectedDate: null,
  selectedTime: null,
  patient: INITIAL_PATIENT,
  bookingRef: null,
  branch: DEFAULT_BRANCHES[0] || null,
};

const getInitialBooking = (): BookingState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      let restoredDate: Date | null = null;
      if (parsed.selectedDate) {
        const d = new Date(parsed.selectedDate);
        if (!isNaN(d.getTime())) {
          restoredDate = d;
        }
      }
      return {
        treatment: parsed.treatment || null,
        doctor: parsed.doctor || null,
        selectedDate: restoredDate,
        selectedTime: parsed.selectedTime || null,
        patient: {
          firstName: parsed.patient?.firstName || '',
          lastName: parsed.patient?.lastName || '',
          phone: parsed.patient?.phone || '',
          email: parsed.patient?.email || '',
          dob: parsed.patient?.dob || '',
          patientType: parsed.patient?.patientType || '',
          notes: parsed.patient?.notes || '',
        },
        bookingRef: parsed.bookingRef || null,
        branch: parsed.branch || DEFAULT_BRANCHES[0] || null,
      };
    }
  } catch (err) {
    console.error('Failed to load saved booking draft from localStorage:', err);
  }
  return INITIAL_BOOKING;
};

const getInitialStep = (initialBooking: BookingState): number => {
  try {
    const savedStep = localStorage.getItem(STEP_STORAGE_KEY);
    if (savedStep) {
      const step = parseInt(savedStep, 10);
      if (step === 2 && initialBooking.branch) return 2;
      if (step === 3 && initialBooking.branch && initialBooking.doctor) return 3;
      if (step === 4 && initialBooking.branch && initialBooking.doctor && initialBooking.treatment) return 4;
      if (step === 5 && initialBooking.branch && initialBooking.doctor && initialBooking.treatment) return 5;
      if (step === 6 && initialBooking.branch && initialBooking.doctor && initialBooking.treatment) return 6;
    }
  } catch (err) {
    console.error('Failed to load saved step from localStorage:', err);
  }
  return 1;
};

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : dir < 0 ? -20 : 0,
    opacity: 0,
    scale: 0.992,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.32,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -16 : dir < 0 ? 16 : 0,
    opacity: 0,
    scale: 0.992,
    transition: {
      duration: 0.16,
      ease: [0.32, 0, 0.67, 0] as const,
    },
  }),
};

export default function App() {
  const [booking, setBooking] = useState<BookingState>(getInitialBooking);
  const [currentStep, setCurrentStep] = useState<number>(() => getInitialStep(booking));
  const [direction, setDirection] = useState<number>(1);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isPatientHistoryModalOpen, setIsPatientHistoryModalOpen] = useState<boolean>(false);
  const [patientHistoryQuery, setPatientHistoryQuery] = useState<string>('');
  const [isAiPatientResponseOpen, setIsAiPatientResponseOpen] = useState<boolean>(false);
  const [isDoctorMorningModalOpen, setIsDoctorMorningModalOpen] = useState<boolean>(false);
  const [smartReminderAppointment, setSmartReminderAppointment] = useState<SmartReminderData | null>(null);
  const [treatmentsList, setTreatmentsList] = useState<Treatment[]>(() => getCachedTreatments());
  const [doctorsList, setDoctorsList] = useState<Doctor[]>(() => getCachedDoctors());
  const [branchesList, setBranchesList] = useState<ClinicBranch[]>(() => getCachedBranches());
  const [dataRefreshCounter, setDataRefreshCounter] = useState<number>(0);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(() => getCachedClinicProfile());
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Auto-next is permanently enabled and workable on every page in the background
  const autoAdvanceEnabled = true;
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(false);

  // Clear pending auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Fetch clinic profile and clinical catalogs on mount and on admin refresh, saving to offline cache
  useEffect(() => {
    fetch('/api/clinic-profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setClinicProfile(data.data);
          saveCachedClinicProfile(data.data);
        }
      })
      .catch((err) => console.error('Failed to fetch clinic profile:', err));

    fetch('/api/treatments')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data)) {
          setTreatmentsList(data.data);
          saveCachedTreatments(data.data);
          // Sync service catalog to Firebase Firestore
          syncServicesToFirestore(data.data).catch(() => {});
        }
      })
      .catch(() => {});

    fetch('/api/doctors')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data)) {
          setDoctorsList(data.data);
          saveCachedDoctors(data.data);
        }
      })
      .catch(() => {});

    fetch('/api/branches')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.data)) {
          setBranchesList(data.data);
          saveCachedBranches(data.data);
        }
      })
      .catch(() => {});

    // Sync multi-branch hierarchy (Branch -> Dentists -> Services) to Firestore
    syncBranchHierarchyToFirestore().catch(() => {});
  }, [dataRefreshCounter]);

  // Sync booking and currentStep to localStorage so accidental refresh preserves progress
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 6) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
        localStorage.setItem(STEP_STORAGE_KEY, currentStep.toString());
      } catch (err) {
        console.error('Failed to save booking draft to localStorage:', err);
      }
    } else if (currentStep === 7) {
      // Completed appointment - clear draft from storage
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STEP_STORAGE_KEY);
      } catch (err) {
        console.error('Failed to clear booking draft from localStorage:', err);
      }
    }
  }, [booking, currentStep]);

  // Initialize Browser Push Service Worker and active reminder sync
  useEffect(() => {
    // 1. Register service worker
    getOrRegisterServiceWorker().catch(() => {});

    // 2. Initial reminder sync
    syncPendingPushReminders();

    // 3. Periodic reminder sync interval every 25 seconds
    const interval = setInterval(() => {
      syncPendingPushReminders();
    }, 25000);

    // 4. Also sync when window gains focus or tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncPendingPushReminders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. Listen for service worker notification click navigation
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION_CLICKED') {
        // App is focused via notification click
        syncPendingPushReminders();
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, []);

  // 1-Month Excel Database Auto-Download Check (Runs silently in background on startup)
  // Automatically downloads completed month's Excel sheet before reloading to a new sheet
  useEffect(() => {
    checkAndTriggerExcelMonthAutoDownload().catch(() => {});
  }, []);

  // Automated Firebase Cloud Auto-Sync Engine
  useEffect(() => {
    let isMounted = true;

    const performFirebaseAutoSync = async (source: string = 'AutoSyncDaemon') => {
      if (!isAutoSyncEnabled()) return;
      try {
        const res = await fetch('/api/patients');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          if (isMounted) {
            await autoSyncAllRecordsToFirestore(data.data, source);
          }
        }
      } catch (err) {
        console.warn('Firebase auto-sync background check:', err);
      }
    };

    // 1. Initial sync after app hydration
    const initialTimer = setTimeout(() => {
      performFirebaseAutoSync('AppStartupAutoSync');
    }, 2500);

    // 2. Continuous background periodic sync interval every 45 seconds
    const interval = setInterval(() => {
      performFirebaseAutoSync('PeriodicAutoSyncDaemon');
    }, 45000);

    // 3. Online event sync
    const handleOnline = () => {
      performFirebaseAutoSync('OnlineReconnectAutoSync');
    };
    window.addEventListener('online', handleOnline);

    // 4. Custom event for instant triggered auto-sync on booking actions
    const handleTriggerSync = () => {
      performFirebaseAutoSync('InstantTriggerAutoSync');
    };
    window.addEventListener('sdc_trigger_firebase_auto_sync', handleTriggerSync);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('sdc_trigger_firebase_auto_sync', handleTriggerSync);
    };
  }, []);

  const handleAdminDataUpdated = () => {
    setDataRefreshCounter((prev) => prev + 1);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerAutoAdvance = (targetStep: number, delayMs: number = 220) => {
    if (!autoAdvanceEnabled) return;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    setIsAutoAdvancing(true);
    autoAdvanceTimerRef.current = setTimeout(() => {
      setDirection(1);
      setCurrentStep(targetStep);
      scrollToTop();
      autoAdvanceTimerRef.current = null;
      setIsAutoAdvancing(false);
    }, delayMs);
  };

  const goToStep = (step: number) => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setIsAutoAdvancing(false);
    if (step === 2 && !booking.branch) return;
    if (step === 3 && (!booking.branch || !booking.doctor)) return;
    if (step === 4 && (!booking.branch || !booking.doctor || !booking.treatment)) return;
    if (step === 5 && (!booking.branch || !booking.doctor || !booking.treatment || !booking.selectedDate || !booking.selectedTime)) return;
    if (step === 6 && (!booking.branch || !booking.doctor || !booking.treatment || !booking.selectedDate || !booking.selectedTime)) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    scrollToTop();
  };

  const handleSelectBranch = (branch: ClinicBranch, autoAdvance: boolean = true) => {
    setBooking((prev) => {
      let doc = prev.doctor;
      let treat = prev.treatment;
      // If selected doctor is not at this branch, reset doctor and treatment
      if (doc && !isDentistAtBranch(branch.id, doc.id)) {
        doc = null;
        treat = null;
      } else if (doc && treat && !isServiceOfferedByDentist(branch.id, doc.id, treat.id)) {
        treat = null;
      }
      return { ...prev, branch, doctor: doc, treatment: treat };
    });
    // Automatically transition to Dentist selection page upon user clicking a location
    if (autoAdvance) {
      triggerAutoAdvance(2, 220);
    }
  };

  const handleOpenPatientHistory = (query: string = '') => {
    setPatientHistoryQuery(query);
    setIsPatientHistoryModalOpen(true);
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setBooking((prev) => {
      let treat = prev.treatment;
      if (treat && prev.branch && !isServiceOfferedByDentist(prev.branch.id, doctor.id, treat.id)) {
        treat = null;
      }
      return { ...prev, doctor, treatment: treat };
    });
    // Automatically transition to Treatment/Service selection page upon clicking
    triggerAutoAdvance(3, 220);
  };

  const handleSelectTreatment = (treatment: Treatment) => {
    setBooking((prev) => ({ ...prev, treatment }));
    // Automatically transition to Schedule page upon clicking
    triggerAutoAdvance(4, 220);
  };

  const handleSelectDate = (selectedDate: Date) => {
    setBooking((prev) => ({ ...prev, selectedDate, selectedTime: null }));
  };

  const handleSelectTime = (selectedTime: string) => {
    setBooking((prev) => ({ ...prev, selectedTime }));
    // Automatically transition to Patient Details page upon clicking an available time slot
    if (selectedTime) {
      triggerAutoAdvance(5, 240);
    }
  };

  const handleChangePatient = (field: keyof PatientDetails, value: string) => {
    setBooking((prev) => ({
      ...prev,
      patient: {
        ...prev.patient,
        [field]: value,
      },
    }));
  };

  const handleConfirm = async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const ref = `SC${randomSuffix}`;
    setBooking((prev) => ({ ...prev, bookingRef: ref }));

    const formattedDate = booking.selectedDate
      ? formatLocalDate(booking.selectedDate)
      : '';
    const formattedTime = booking.selectedTime ? formatSlotTime(booking.selectedTime) : '';

    // Immediately lock the booked slot locally so it cannot be selected again
    if (formattedDate && booking.selectedTime) {
      addLocalBookedSlot({
        date: formattedDate,
        slot: booking.selectedTime,
        doctorName: booking.doctor?.name || '',
        branchId: booking.branch?.id || 'branch-1',
        bookingRef: ref,
        bookedAt: new Date().toISOString(),
      });
    }

    // Prepare booking payload
    const bookingPayload = {
      bookingRef: ref,
      branchId: booking.branch?.id || 'branch-1',
      branchName: booking.branch?.name || clinicProfile.name,
      branchAddress: booking.branch?.address
        ? `${booking.branch.address}, ${booking.branch.areaCityPincode}`
        : clinicProfile.address,
      branchPhone: booking.branch?.phone || clinicProfile.phone,
      firstName: booking.patient.firstName,
      lastName: booking.patient.lastName,
      phone: booking.patient.phone,
      email: booking.patient.email,
      dob: booking.patient.dob || 'Not specified',
      patientType: booking.patient.patientType || 'New patient',
      treatmentName: booking.treatment?.name || 'General Dental Service',
      treatmentDuration: booking.treatment?.dur || '30 min',
      estimatedFee: booking.treatment?.price || '₹300 – ₹800',
      doctorName: booking.doctor?.name || 'Dr. Vikram Shah',
      doctorSpecialization: booking.doctor?.spec || 'General Dental Surgeon',
      appointmentDate: formattedDate,
      appointmentTime: formattedTime,
      notes: booking.patient.notes || 'None',
      paymentMode: Number(booking.patient.amountPaidNow || 0) > 0
        ? `Advance Paid (₹${booking.patient.amountPaidNow})`
        : booking.patient.paymentMethod === 'online_token'
          ? 'Online Token (₹200)'
          : 'Pay at Clinic Counter',
      paymentStatus: Number(booking.patient.amountPaidNow || 0) > 0
        ? `Advance Paid (₹${booking.patient.amountPaidNow}) · Remaining ${booking.patient.amountRemaining || 'at clinic'}`
        : 'Pending at Clinic Counter',
      paymentRef: booking.patient.paymentRef || 'N/A',
      amountPaidNow: booking.patient.amountPaidNow ? `₹${booking.patient.amountPaidNow}` : '₹0',
      amountRemaining: booking.patient.amountRemaining || booking.treatment?.price || '₹0',
      attachmentName: booking.patient.attachmentName ? `${booking.patient.attachmentName} (${booking.patient.attachmentSize || ''})` : 'None',
    };

    // Check online status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Persist booking and patient details directly to Firebase Firestore
    saveBookingToFirestore(bookingPayload).catch((err) => {
      console.warn('Firebase Firestore async booking save notice:', err);
    });

    if (!isOnline) {
      // Offline mode: Queue booking locally
      enqueueOfflineBooking(bookingPayload, ref);
    } else {
      // Persist to backend Excel file storage via /api/bookings
      try {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload),
        });
        if (!response.ok) {
          enqueueOfflineBooking(bookingPayload, ref);
        } else {
          const resData = await response.json();
          if (resData && resData.instantNotifications) {
            setBooking((prev) => ({
              ...prev,
              bookingRef: ref,
              instantNotifications: resData.instantNotifications,
            }));
          }
        }
      } catch (err) {
        console.warn('Network issue while booking. Queued offline for auto-sync:', err);
        enqueueOfflineBooking(bookingPayload, ref);
      }
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_STORAGE_KEY);
    } catch (e) {}
    setDataRefreshCounter((c) => c + 1);

    goToStep(7);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear booking draft from localStorage:', err);
    }
    setDataRefreshCounter((c) => c + 1);
    setBooking(INITIAL_BOOKING);
    goToStep(1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col relative pb-20 md:pb-0 overflow-x-hidden">
      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* Header */}
      <Header
        clinicProfile={clinicProfile}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenPatientHistoryModal={() => handleOpenPatientHistory()}
        onOpenDoctorMorningModal={() => setIsDoctorMorningModalOpen(true)}
      />

      {/* Hero Banner */}
      <Hero />

      {/* Step Progress Bar (steps 1 to 6) */}
      {currentStep <= 6 && (
        <ProgressBar
          currentStep={currentStep}
          onStepClick={(step) => goToStep(step)}
          isAutoAdvancing={isAutoAdvancing}
        />
      )}

      {/* Main Container Card */}
      <main className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 mt-6 sm:mt-8 relative z-10 flex-1">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(37,99,235,0.08)] border border-[#dbeafe] p-5 sm:p-8 overflow-hidden transition-all duration-300">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
              style={{ willChange: 'transform, opacity' }}
            >
              {currentStep === 1 && (
                <BranchStep
                  selectedBranch={booking.branch}
                  onSelectBranch={handleSelectBranch}
                  onNext={() => goToStep(2)}
                  refreshTrigger={dataRefreshCounter}
                  autoAdvanceEnabled={autoAdvanceEnabled}
                />
              )}

              {currentStep === 2 && booking.branch && (
                <DoctorStep
                  branch={booking.branch}
                  selectedDoctor={booking.doctor}
                  onSelectDoctor={handleSelectDoctor}
                  onChangeBranch={() => goToStep(1)}
                  onBack={() => goToStep(1)}
                  onNext={() => goToStep(3)}
                  refreshTrigger={dataRefreshCounter}
                  autoAdvanceEnabled={autoAdvanceEnabled}
                  onOpenDoctorMorning={() => setIsDoctorMorningModalOpen(true)}
                />
              )}

              {currentStep === 3 && booking.branch && booking.doctor && (
                <TreatmentStep
                  selectedBranch={booking.branch}
                  selectedDoctor={booking.doctor}
                  selectedTreatment={booking.treatment}
                  onSelectTreatment={handleSelectTreatment}
                  onBack={() => goToStep(2)}
                  onNext={() => goToStep(4)}
                  onChangeBranch={() => goToStep(1)}
                  onChangeDoctor={() => goToStep(2)}
                  refreshTrigger={dataRefreshCounter}
                  autoAdvanceEnabled={autoAdvanceEnabled}
                />
              )}

              {currentStep === 4 && booking.branch && booking.doctor && booking.treatment && (
                <ScheduleStep
                  selectedTreatment={booking.treatment}
                  selectedDoctor={booking.doctor}
                  selectedDate={booking.selectedDate}
                  selectedTime={booking.selectedTime}
                  onSelectDate={handleSelectDate}
                  onSelectTime={handleSelectTime}
                  onBack={() => goToStep(3)}
                  onNext={() => goToStep(5)}
                  refreshTrigger={dataRefreshCounter}
                  branch={booking.branch}
                  autoAdvanceEnabled={autoAdvanceEnabled}
                />
              )}

              {currentStep === 5 && (
                <DetailsStep
                  patient={booking.patient}
                  treatment={booking.treatment}
                  onChangePatient={handleChangePatient}
                  onBack={() => goToStep(4)}
                  onNext={() => goToStep(6)}
                />
              )}

              {currentStep === 6 && (
                <ConfirmStep
                  booking={booking}
                  clinicProfile={clinicProfile}
                  onBack={() => goToStep(5)}
                  onConfirm={handleConfirm}
                  onUpdatePatient={handleChangePatient}
                />
              )}

              {currentStep === 7 && (
                <SuccessStep
                  booking={booking}
                  clinicProfile={clinicProfile}
                  onReset={handleReset}
                  onOpenExcelModal={() => setIsExcelModalOpen(true)}
                  onOpenPatientHistory={() =>
                    handleOpenPatientHistory(
                      booking.patient.phone || booking.patient.email || booking.bookingRef || ''
                    )
                  }
                  onOpenSmartReminder={(data) => setSmartReminderAppointment(data)}
                  onOpenPatientResponseDesk={() => setIsAiPatientResponseOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modern Clinic Footer */}
      <Footer
        clinicProfile={clinicProfile}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenPatientHistory={() => handleOpenPatientHistory()}
      />

      {/* Native Mobile App Tab Bar (visible on mobile viewports) */}
      <MobileAppTabBar
        currentStep={currentStep}
        onGoToBooking={() => goToStep(1)}
        onOpenHistory={() => handleOpenPatientHistory()}
        onOpenExcel={() => setIsExcelModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenDoctorMorning={() => setIsDoctorMorningModalOpen(true)}
      />

      {/* Backend Excel Database Modal */}
      <ExcelDatabaseModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        clinicProfile={clinicProfile}
        onRefreshNeeded={handleAdminDataUpdated}
        onOpenSmartReminder={(data) => setSmartReminderAppointment(data)}
        onOpenAiInsights={() => {
          setIsExcelModalOpen(false);
          setIsAdminModalOpen(true);
        }}
      />

      {/* Admin Corner Management Modal */}
      <AdminCornerModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onDataUpdated={handleAdminDataUpdated}
        clinicProfile={clinicProfile}
        onClinicProfileUpdated={(p) => setClinicProfile(p)}
      />

      {/* Patient History Portal Modal */}
      <PatientHistoryModal
        isOpen={isPatientHistoryModalOpen}
        onClose={() => setIsPatientHistoryModalOpen(false)}
        clinicProfile={clinicProfile}
        initialQuery={patientHistoryQuery}
        onBookNewAppointment={() => {
          setIsPatientHistoryModalOpen(false);
          handleReset();
        }}
      />

      {/* AI Smart Reminder Generator Modal */}
      <SmartReminderModal
        isOpen={Boolean(smartReminderAppointment)}
        onClose={() => setSmartReminderAppointment(null)}
        appointment={smartReminderAppointment}
        clinicProfile={clinicProfile}
      />

      {/* AI Patient Response Desk Modal */}
      <AiPatientResponseModal
        isOpen={isAiPatientResponseOpen}
        onClose={() => setIsAiPatientResponseOpen(false)}
        clinicProfile={clinicProfile}
        patientName={booking.patient.firstName ? `${booking.patient.firstName} ${booking.patient.lastName}`.trim() : undefined}
        patientPhone={booking.patient.phone || undefined}
        treatmentName={booking.treatment?.name || undefined}
        doctorName={booking.doctor?.name || undefined}
        appointmentDate={booking.selectedDate ? formatLocalDate(booking.selectedDate) : undefined}
        appointmentTime={booking.selectedTime ? formatSlotTime(booking.selectedTime) : undefined}
      />

      {/* Doctor Daily Morning Reminder & Schedule Modal */}
      <DoctorMorningReminderModal
        isOpen={isDoctorMorningModalOpen}
        onClose={() => setIsDoctorMorningModalOpen(false)}
        clinicPhone={clinicProfile.phone}
      />

      {/* Subtle Background Watermark */}
      <svg
        className="fixed -bottom-10 -right-10 w-80 h-96 opacity-[0.03] pointer-events-none z-0"
        viewBox="0 0 110 120"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M55 8C36 8 18 18 18 38c0 10 4 16 7 24 3 8 4 38 12 38 5 0 8-10 13-10s8 10 13 10c8 0 9-30 12-38 3-8 7-14 7-24C82 18 74 8 55 8z"
          fill="#2563eb"
        />
      </svg>
    </div>
  );
}

