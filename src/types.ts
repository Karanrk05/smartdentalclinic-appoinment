export interface Treatment {
  id: string;
  cat: 'general';
  icon: string;
  name: string;
  desc: string;
  dur: string;
  price: string;
}

export interface Doctor {
  id: string;
  name: string;
  spec: string;
  qualifications: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  avatarBg: string;
  avatarIcon: string;
  phone?: string;
  email?: string;
}

export type PaymentMode = 'clinic' | 'upi_qr' | 'upi_apps' | 'card' | 'netbanking' | 'wallet';

export interface PatientDetails {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dob: string;
  patientType: 'New patient' | 'Existing patient' | '';
  notes: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentData?: string;
  paymentMethod?: 'clinic' | 'online_token' | 'online_full' | string;
  paymentMode?: PaymentMode;
  paymentTokenAmount?: string;
  paymentAmount?: number;
  paymentRef?: string;
  paymentStatus?: string;
  paymentBank?: string;
  paymentCardLast4?: string;
  paymentUpiId?: string;
  amountPaidNow?: string;
  amountRemaining?: string;
}

export interface ClinicBranch {
  id: string;
  name: string;
  shortName: string;
  address: string;
  areaCityPincode: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  landmark: string;
  timings: string;
  isMain: boolean;
  isActive: boolean;
  dentistIds?: string[];
  dentistsCount?: number;
  servicesCount?: number;
}

export interface BranchDentist extends Doctor {
  branchId: string;
  serviceIds: string[];
  services: Treatment[];
}

export interface BranchHierarchyItem {
  branch: ClinicBranch;
  dentists: BranchDentist[];
}

export const DEFAULT_BRANCHES: ClinicBranch[] = [
  {
    id: 'branch-1',
    name: 'Smart Dental Clinic – Downtown Central (Main)',
    shortName: 'Downtown Central',
    address: '102 Wellness Plaza, Dental Street',
    areaCityPincode: 'Medical Hub, Central City - 400001',
    phone: '+91 98765 00000',
    emergencyPhone: '+91 98765 00000',
    email: 'care@smartdentalclinic.com',
    landmark: 'Opposite City Metro Station',
    timings: 'Mon – Sat: 9:00 AM – 8:00 PM',
    isMain: true,
    isActive: true,
  },
  {
    id: 'branch-2',
    name: 'Smart Dental Clinic – Westside Smiles Hub',
    shortName: 'Westside Hub',
    address: '45 Park Avenue, West Extension',
    areaCityPincode: 'Westside Heights, Central City - 400015',
    phone: '+91 98765 11111',
    emergencyPhone: '+91 98765 00000',
    email: 'westside@smartdentalclinic.com',
    landmark: 'Next to West Valley Grand Mall',
    timings: 'Mon – Sat: 9:30 AM – 8:30 PM',
    isMain: false,
    isActive: true,
  },
  {
    id: 'branch-3',
    name: 'Smart Dental Clinic – Green Hills Dental Studio',
    shortName: 'Green Hills Studio',
    address: '12 Lotus Boulevard, Green Hills',
    areaCityPincode: 'Tech Zone, Central City - 400098',
    phone: '+91 98765 22222',
    emergencyPhone: '+91 98765 00000',
    email: 'greenhills@smartdentalclinic.com',
    landmark: 'Near Cyber City Tech Gateway',
    timings: 'Mon – Sat: 10:00 AM – 7:30 PM',
    isMain: false,
    isActive: true,
  },
];

export interface BookingState {
  branch: ClinicBranch | null;
  treatment: Treatment | null;
  doctor: Doctor | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  patient: PatientDetails;
  bookingRef: string | null;
  instantNotifications?: InstantDispatchResult | null;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface BreakTime {
  enabled: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

export interface ClinicTimings {
  storeName: string;
  announcement: string;
  slotDurationMinutes: number;
  schedules: {
    weekdays: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  breakTime: BreakTime;
  activeSlots: string[];
  disabledSlots: string[];
  lastUpdated?: string;
}

export interface ClinicProfile {
  name: string;
  tagline: string;
  address: string;
  areaCityPincode: string;
  phone: string;
  emergencyPhone: string;
  email: string;
  website: string;
  landmark: string;
  registrationNumber: string;
  accreditation: string;
  clinicUpiId?: string;
  clinicPayeeName?: string;
  lastUpdated?: string;
}

export const DEFAULT_CLINIC_PROFILE: ClinicProfile = {
  name: 'Smart Dental Clinic',
  tagline: 'Center for Advanced Dental Care, Orthodontics & Implantology · Smile With Us',
  address: '102 Wellness Plaza, Dental Street',
  areaCityPincode: 'Medical Hub, Central City - 400001',
  phone: '+91 98765 00000',
  emergencyPhone: '+91 98765 00000',
  email: 'care@smartdentalclinic.com',
  website: 'www.smartdentalclinic.com',
  landmark: 'Opposite City Metro Station, Near Wellness Gardens',
  registrationNumber: 'SDC/MED/2026/0419',
  accreditation: 'ISO 9001:2015 & NABH Certified Facility',
  clinicUpiId: 'smartdental@icici',
  clinicPayeeName: 'Smart Dental Clinic',
};

export interface PatientRecord {
  bookingRef: string;
  bookingDate: string;
  patientName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  dob: string;
  patientType: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  branchId?: string;
  treatmentName: string;
  treatmentDuration: string;
  estimatedFee: string;
  doctorName: string;
  doctorSpecialization: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
  status: string;
  reminder24hSent?: boolean;
  reminder2hSent?: boolean;
  reviewSent?: boolean;
  cancellationNotified?: boolean;
  paymentMode?: string;
  paymentStatus?: string;
  paymentRef?: string;
  amountPaidNow?: string;
  amountRemaining?: string;
  attachmentName?: string;
  attachmentSize?: string;
}

export interface PaymentTransaction {
  id: string;
  bookingRef: string;
  date: string;
  amount: string;
  treatmentName: string;
  doctorName?: string;
  branchName?: string;
  paymentMode: string;
  paymentStatus: string;
  paymentRef?: string;
}

export interface WeeklyBackupMetadata {
  lastBackupTimestamp: string;
  lastBackupFormatted: string;
  nextBackupDue: string;
  totalRecords: number;
  fileName: string;
  fileSizeBytes: number;
  daysUntilNextSync: number;
  intervalDays: number;
  trigger: string;
  isWeeklyRoutineDue: boolean;
}

export interface InstantNotificationItem {
  id: string;
  bookingRef: string;
  recipientType: 'PATIENT' | 'DOCTOR';
  recipientName: string;
  recipientPhone: string;
  channel: 'WHATSAPP' | 'SMS' | 'PUSH_NOTIFICATION';
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  gateway: string;
  gatewayMessageId: string;
  timestamp: string;
  timestampFormatted: string;
  messageContent: string;
  deliveredInMs: number;
  eventType?: 'BOOKING_CONFIRMATION' | 'CANCELLATION' | 'DAILY_DOCTOR_AGENDA' | 'PATIENT_24H_REMINDER' | 'PATIENT_2H_REMINDER' | 'REVIEW_REQUEST' | 'MANUAL_TEST' | 'PUSH_REMINDER' | 'WAITLIST_REGISTRATION' | 'WAITLIST_ALERT';
  failureReason?: string;
  retryCount?: number;
  lastRetriedAt?: string;
  directUrl?: string;
}

export interface WaitlistEntry {
  id: string;
  createdAt: string;
  createdAtFormatted: string;
  date: string;
  dateFormatted?: string;
  timeSlot: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName?: string;
  doctorId?: string;
  treatmentName?: string;
  treatmentId?: string;
  branchName?: string;
  branchId?: string;
  notes?: string;
  status: 'WAITING' | 'NOTIFIED' | 'CLAIMED' | 'CANCELLED';
  notifiedAt?: string;
  notifiedAtFormatted?: string;
  notificationDirectUrl?: string;
  notificationChannel?: string;
  notificationMessageId?: string;
  messagePreview?: string;
}

export interface InstantDispatchResult {
  bookingRef: string;
  totalSent: number;
  deliveredCount: number;
  dispatches: {
    patientWhatsApp: InstantNotificationItem;
    patientSms: InstantNotificationItem;
    doctorWhatsApp: InstantNotificationItem;
    doctorSms: InstantNotificationItem;
    patientPush?: InstantNotificationItem;
  };
  summaryText: string;
}

export interface MessagingGatewayConfig {
  autoDispatchEnabled: boolean;
  zeroTouchAutoSendEnabled?: boolean;
  patientWhatsAppEnabled: boolean;
  doctorWhatsAppEnabled: boolean;
  cancellationWhatsAppEnabled: boolean;
  dailyDoctorAgendaEnabled: boolean;
  dailyDoctorAgendaTime: string;
  patientReminder24hEnabled: boolean;
  patientReminder2hEnabled: boolean;
  browserPushFallbackEnabled?: boolean;
  browserPushRemindersEnabled?: boolean;
  reviewRequestEnabled: boolean;
  googleReviewLink: string;
  clinicWhatsAppNumber: string;
  clinicHelplineNumber: string;
  defaultDoctorPhone: string;
  patientSmsEnabled: boolean;
  doctorSmsEnabled: boolean;
  smsGatewayProvider: 'Fast2SMS' | 'Twilio' | 'MSG91';
  whatsappGatewayProvider: 'Meta Cloud API' | 'Twilio' | 'Gupshup' | 'Custom Webhook / WATI';
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaTemplateName?: string;
  whatsappWebhookUrl?: string;
  customWebhookUrl?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppFrom?: string;
  callMeBotApiKey?: string;
  n8nEnabled?: boolean;
  n8nWebhookUrl?: string;
  n8nMorningAgendaWebhookUrl?: string;
  lastDailyDoctorAgendaRunDate?: string;
  lastDailyDoctorAgendaRunTimestamp?: string;
  lastDailyDoctorAgendaRunCount?: number;
  monthlyExcelAutoExportEnabled?: boolean;
  monthlyExcelAutoSendToDoctorEnabled?: boolean;
  monthlyExcelDayOfMonth?: number;
  monthlyExcelTime?: string;
  lastMonthlyExcelRunMonth?: string;
  lastMonthlyExcelRunTimestamp?: string;
  lastMonthlyExcelRunCount?: number;
}

export interface DoctorDailyAgendaItem {
  doctor: Doctor;
  appointmentCount: number;
  appointments: PatientRecord[];
  formattedWhatsApp?: string;
  formattedSms?: string;
  whatsappDirectUrl?: string;
  phone?: string;
}

export interface DoctorAgendaResponse {
  success: boolean;
  date: string;
  totalDoctors: number;
  totalTodayAppointments: number;
  autoEnabled: boolean;
  scheduleTime: string;
  lastDispatchedDate: string;
  lastDispatchedTimestamp: string;
  isDispatchedToday: boolean;
  agenda: DoctorDailyAgendaItem[];
}

export interface DoctorMonthlyReportItem {
  doctor: Doctor;
  month: string;
  monthName: string;
  totalAppointments: number;
  completedAppointments: number;
  estimatedRevenue: number;
  appointments: PatientRecord[];
  downloadUrl: string;
  formattedWhatsApp: string;
  formattedSms: string;
  whatsappDirectUrl: string;
  phone: string;
}

export interface MonthlyReportStatusResponse {
  success: boolean;
  currentMonth: string;
  currentMonthName: string;
  totalDoctors: number;
  totalMonthAppointments: number;
  totalMonthRevenue: number;
  autoExportEnabled: boolean;
  autoSendToDoctorEnabled: boolean;
  dayOfMonth: number;
  scheduleTime: string;
  lastRunMonth?: string;
  lastRunTimestamp?: string;
  isRunThisMonth: boolean;
  doctorReports: DoctorMonthlyReportItem[];
}
