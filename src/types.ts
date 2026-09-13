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


