import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProgressBar } from './components/ProgressBar';
import { TreatmentStep } from './components/TreatmentStep';
import { DoctorStep } from './components/DoctorStep';
import { ScheduleStep, formatSlotTime, formatLocalDate } from './components/ScheduleStep';
import { DetailsStep } from './components/DetailsStep';
import { ConfirmStep } from './components/ConfirmStep';
import { SuccessStep } from './components/SuccessStep';
import { ExcelDatabaseModal } from './components/ExcelDatabaseModal';
import { AdminCornerModal } from './components/AdminCornerModal';
import { PatientHistoryModal } from './components/PatientHistoryModal';
import { BookingState, Doctor, PatientDetails, Treatment, ClinicProfile, DEFAULT_CLINIC_PROFILE, ClinicBranch, DEFAULT_BRANCHES } from './types';

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
      if (step === 2 && initialBooking.treatment) return 2;
      if (step === 3 && initialBooking.treatment && initialBooking.doctor) return 3;
      if (step === 4 && initialBooking.treatment && initialBooking.doctor) return 4;
      if (step === 5 && initialBooking.treatment && initialBooking.doctor) return 5;
    }
  } catch (err) {
    console.error('Failed to load saved step from localStorage:', err);
  }
  return 1;
};

const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 32 : -32,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -32 : 32,
    opacity: 0,
    transition: {
      duration: 0.18,
      ease: [0.7, 0, 0.84, 0] as const,
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
  const [dataRefreshCounter, setDataRefreshCounter] = useState<number>(0);
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(DEFAULT_CLINIC_PROFILE);

  // Fetch clinic profile on mount and on admin refresh
  useEffect(() => {
    fetch('/api/clinic-profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && data.data) {
          setClinicProfile(data.data);
        }
      })
      .catch((err) => console.error('Failed to fetch clinic profile:', err));
  }, [dataRefreshCounter]);

  // Sync booking and currentStep to localStorage so accidental refresh preserves progress
  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 5) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
        localStorage.setItem(STEP_STORAGE_KEY, currentStep.toString());
      } catch (err) {
        console.error('Failed to save booking draft to localStorage:', err);
      }
    } else if (currentStep === 6) {
      // Completed appointment - clear draft from storage
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STEP_STORAGE_KEY);
      } catch (err) {
        console.error('Failed to clear booking draft from localStorage:', err);
      }
    }
  }, [booking, currentStep]);

  const handleAdminDataUpdated = () => {
    setDataRefreshCounter((prev) => prev + 1);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (step: number) => {
    if (step === 2 && !booking.treatment) return;
    if (step === 3 && (!booking.treatment || !booking.doctor)) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    scrollToTop();
  };

  const handleSelectBranch = (branch: ClinicBranch) => {
    setBooking((prev) => ({ ...prev, branch }));
  };

  const handleOpenPatientHistory = (query: string = '') => {
    setPatientHistoryQuery(query);
    setIsPatientHistoryModalOpen(true);
  };

  const handleSelectTreatment = (treatment: Treatment) => {
    setBooking((prev) => ({ ...prev, treatment }));
  };

  const handleSelectDoctor = (doctor: Doctor) => {
    setBooking((prev) => ({ ...prev, doctor }));
  };

  const handleSelectDate = (selectedDate: Date) => {
    setBooking((prev) => ({ ...prev, selectedDate, selectedTime: null }));
  };

  const handleSelectTime = (selectedTime: string) => {
    setBooking((prev) => ({ ...prev, selectedTime }));
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

    // Persist to backend Excel file storage via /api/bookings
    try {
      const formattedDate = booking.selectedDate
        ? formatLocalDate(booking.selectedDate)
        : '';
      const formattedTime = booking.selectedTime ? formatSlotTime(booking.selectedTime) : '';

      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });
    } catch (err) {
      console.error('Failed to sync booking to backend Excel:', err);
    }

    goToStep(6);
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STEP_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear booking draft from localStorage:', err);
    }
    setBooking(INITIAL_BOOKING);
    goToStep(1);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col relative pb-20 overflow-x-hidden">
      {/* Header */}
      <Header
        clinicProfile={clinicProfile}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenPatientHistoryModal={() => handleOpenPatientHistory()}
      />

      {/* Hero Banner */}
      <Hero />

      {/* Step Progress Bar (steps 1 to 5) */}
      {currentStep <= 5 && (
        <ProgressBar
          currentStep={currentStep}
          onStepClick={(step) => goToStep(step)}
        />
      )}

      {/* Main Container Card */}
      <main className="w-full max-w-3xl mx-auto px-3.5 sm:px-6 mt-6 sm:mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(37,99,235,0.08)] border border-[#dbeafe] p-5 sm:p-8 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {currentStep === 1 && (
                <TreatmentStep
                  selectedTreatment={booking.treatment}
                  onSelectTreatment={handleSelectTreatment}
                  onNext={() => goToStep(2)}
                  refreshTrigger={dataRefreshCounter}
                  selectedBranch={booking.branch}
                  onSelectBranch={handleSelectBranch}
                />
              )}

              {currentStep === 2 && booking.treatment && (
                <DoctorStep
                  selectedTreatment={booking.treatment}
                  selectedDoctor={booking.doctor}
                  onSelectDoctor={handleSelectDoctor}
                  onBack={() => goToStep(1)}
                  onNext={() => goToStep(3)}
                  refreshTrigger={dataRefreshCounter}
                  branch={booking.branch}
                />
              )}

              {currentStep === 3 && booking.treatment && booking.doctor && (
                <ScheduleStep
                  selectedTreatment={booking.treatment}
                  selectedDoctor={booking.doctor}
                  selectedDate={booking.selectedDate}
                  selectedTime={booking.selectedTime}
                  onSelectDate={handleSelectDate}
                  onSelectTime={handleSelectTime}
                  onBack={() => goToStep(2)}
                  onNext={() => goToStep(4)}
                  refreshTrigger={dataRefreshCounter}
                  branch={booking.branch}
                />
              )}

              {currentStep === 4 && (
                <DetailsStep
                  patient={booking.patient}
                  onChangePatient={handleChangePatient}
                  onBack={() => goToStep(3)}
                  onNext={() => goToStep(5)}
                />
              )}

              {currentStep === 5 && (
                <ConfirmStep
                  booking={booking}
                  onBack={() => goToStep(4)}
                  onConfirm={handleConfirm}
                />
              )}

              {currentStep === 6 && (
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
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Backend Excel Database Modal */}
      <ExcelDatabaseModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        clinicProfile={clinicProfile}
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

