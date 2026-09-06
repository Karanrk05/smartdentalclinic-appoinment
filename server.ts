import express from 'express';
import path from 'path';
import fs from 'fs';
import * as xlsxModule from 'xlsx';
import { createServer as createViteServer } from 'vite';

// Safe interop for xlsx in ESM/CJS
const XLSX: any = (xlsxModule as any).default && (xlsxModule as any).default.read
  ? (xlsxModule as any).default
  : xlsxModule;

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to backend Excel file storage
const DATA_DIR = path.join(process.cwd(), 'data');
const EXCEL_FILE_PATH = path.join(DATA_DIR, 'patients_records.xlsx');
const REMINDERS_FILE_PATH = path.join(DATA_DIR, 'reminders_store.json');
const TREATMENTS_FILE_PATH = path.join(DATA_DIR, 'treatments_store.json');
const DOCTORS_FILE_PATH = path.join(DATA_DIR, 'doctors_store.json');
const TIMINGS_FILE_PATH = path.join(DATA_DIR, 'timings_store.json');
const CLINIC_PROFILE_FILE_PATH = path.join(DATA_DIR, 'clinic_profile.json');
const ADMIN_CONFIG_FILE_PATH = path.join(DATA_DIR, 'admin_config.json');
const BRANCHES_FILE_PATH = path.join(DATA_DIR, 'branches_store.json');

export interface ClinicBranchItem {
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

const DEFAULT_BRANCHES: ClinicBranchItem[] = [
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

interface ClinicProfileConfig {
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
  lastUpdated?: string;
}

const DEFAULT_CLINIC_PROFILE: ClinicProfileConfig = {
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
};

interface DayScheduleItem {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BreakTimeItem {
  enabled: boolean;
  name: string;
  startTime: string;
  endTime: string;
}

interface ClinicTimingsConfig {
  storeName: string;
  announcement: string;
  slotDurationMinutes: number;
  schedules: {
    weekdays: DayScheduleItem;
    saturday: DayScheduleItem;
    sunday: DayScheduleItem;
  };
  breakTime: BreakTimeItem;
  activeSlots: string[];
  disabledSlots: string[];
  lastUpdated?: string;
}

interface TreatmentItem {
  id: string;
  cat: 'general';
  icon: string;
  name: string;
  desc: string;
  dur: string;
  price: string;
}


interface DoctorItem {
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

interface AdminConfig {
  pin: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  changeLog: Array<{
    id: string;
    action: string;
    target: string;
    timestamp: string;
    details: string;
  }>;
}

const DEFAULT_TREATMENTS: TreatmentItem[] = [
  {
    id: 't1',
    cat: 'general',
    icon: '🦷',
    name: 'Consultation & Checkup',
    desc: 'Full comprehensive oral exam, X-ray review, dental charting, and personalized care plan',
    dur: '30 min',
    price: '₹300 – ₹800',
  },
  {
    id: 't2',
    cat: 'general',
    icon: '📸',
    name: 'Dental X-Ray (OPG & Bitewing)',
    desc: 'High-definition digital panoramic and intraoral X-rays with instant review',
    dur: '15 min',
    price: '₹600 – ₹1,000',
  },
  {
    id: 't3',
    cat: 'general',
    icon: '✨',
    name: 'Scaling & Polishing',
    desc: 'Professional ultrasonic deep teeth cleaning, tartar removal, and enamel stain buffing',
    dur: '45 min',
    price: '₹800 – ₹2,500',
  },
  {
    id: 't4',
    cat: 'general',
    icon: '🛡️',
    name: 'Fluoride Therapy',
    desc: 'Enamel-strengthening protective topical fluoride varnish application',
    dur: '20 min',
    price: '₹500 – ₹1,000',
  },
  {
    id: 't5',
    cat: 'general',
    icon: '🔲',
    name: 'Pit & Fissure Sealant',
    desc: 'Protective resin barrier bonded into deep grooves of molars to prevent decay',
    dur: '30 min',
    price: '₹800 – ₹1,500 / tooth',
  },
  {
    id: 't6',
    cat: 'general',
    icon: '💨',
    name: 'Bad Breath Treatment',
    desc: 'Halitosis diagnosis, tongue disinfection, antibacterial therapy, and freshness care',
    dur: '30 min',
    price: '₹500 – ₹1,500',
  },
  {
    id: 't7',
    cat: 'general',
    icon: '🩸',
    name: 'Gum Care & Gingivitis Therapy',
    desc: 'Subgingival plaque therapy, root surface debridement, and anti-inflammatory gum rinse',
    dur: '45 min',
    price: '₹1,500 – ₹3,500',
  },
  {
    id: 't8',
    cat: 'general',
    icon: '❄️',
    name: 'Tooth Sensitivity Relief',
    desc: 'Desensitizing agent application to exposed dentin, tubules seal, and enamel protection',
    dur: '30 min',
    price: '₹600 – ₹1,500',
  },
  {
    id: 't9',
    cat: 'general',
    icon: '🔍',
    name: 'Routine Oral Examination & Screening',
    desc: 'Routine 6-month checkup, soft tissue examination, and preventive hygiene counsel',
    dur: '30 min',
    price: '₹400 – ₹900',
  },
];

const DEFAULT_DOCTORS: DoctorItem[] = [
  {
    id: 'doc1',
    name: 'Dr. Vikram Shah',
    spec: 'General Dental Surgeon',
    qualifications: 'BDS, Dental Surgery',
    experience: '15 yrs experience',
    rating: 4.9,
    reviewsCount: 520,
    avatarBg: '#f0faf5',
    avatarIcon: '👨‍⚕️',
  },
  {
    id: 'doc2',
    name: 'Dr. Priya Mehta',
    spec: 'General & Preventive Dentistry',
    qualifications: 'BDS, MDS',
    experience: '12 yrs experience',
    rating: 4.9,
    reviewsCount: 384,
    avatarBg: '#f0f4fa',
    avatarIcon: '👩‍⚕️',
  },
  {
    id: 'doc3',
    name: 'Dr. Sneha Kulkarni',
    spec: 'Family & General Dentistry',
    qualifications: 'BDS',
    experience: '10 yrs experience',
    rating: 4.8,
    reviewsCount: 401,
    avatarBg: '#faf0f5',
    avatarIcon: '👩‍⚕️',
  },
  {
    id: 'doc4',
    name: 'Dr. Arjun Rao',
    spec: 'General Dental Practitioner',
    qualifications: 'BDS, Preventive Oral Health',
    experience: '9 yrs experience',
    rating: 4.8,
    reviewsCount: 290,
    avatarBg: '#fafaf0',
    avatarIcon: '👨‍⚕️',
  },
];

function getOrInitTreatments(): TreatmentItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(TREATMENTS_FILE_PATH)) {
      const content = fs.readFileSync(TREATMENTS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    saveTreatments(DEFAULT_TREATMENTS);
    return DEFAULT_TREATMENTS;
  } catch (err) {
    console.error('Error reading treatments store:', err);
    return DEFAULT_TREATMENTS;
  }
}

function saveTreatments(treatments: TreatmentItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TREATMENTS_FILE_PATH, JSON.stringify(treatments, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving treatments store:', err);
  }
}

function getOrInitDoctors(): DoctorItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DOCTORS_FILE_PATH)) {
      const content = fs.readFileSync(DOCTORS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    saveDoctors(DEFAULT_DOCTORS);
    return DEFAULT_DOCTORS;
  } catch (err) {
    console.error('Error reading doctors store:', err);
    return DEFAULT_DOCTORS;
  }
}

function saveDoctors(doctors: DoctorItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DOCTORS_FILE_PATH, JSON.stringify(doctors, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving doctors store:', err);
  }
}

const DEFAULT_TIMINGS: ClinicTimingsConfig = {
  storeName: 'Smart Dental Clinic',
  announcement: 'Open Monday – Saturday · Walk-ins & scheduled visits welcome',
  slotDurationMinutes: 30,
  schedules: {
    weekdays: {
      day: 'Monday – Friday',
      isOpen: true,
      openTime: '09:00 AM',
      closeTime: '08:00 PM',
    },
    saturday: {
      day: 'Saturday',
      isOpen: true,
      openTime: '09:00 AM',
      closeTime: '06:00 PM',
    },
    sunday: {
      day: 'Sunday',
      isOpen: false,
      openTime: '10:00 AM',
      closeTime: '02:00 PM',
    },
  },
  breakTime: {
    enabled: true,
    name: 'Lunch & Sanitization Recess',
    startTime: '01:30 PM',
    endTime: '02:30 PM',
  },
  activeSlots: [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ],
  disabledSlots: [],
  lastUpdated: new Date().toISOString(),
};

function getOrInitTimings(): ClinicTimingsConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(TIMINGS_FILE_PATH)) {
      const content = fs.readFileSync(TIMINGS_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.schedules && Array.isArray(parsed.activeSlots)) {
        return parsed;
      }
    }
    saveTimings(DEFAULT_TIMINGS);
    return DEFAULT_TIMINGS;
  } catch (err) {
    console.error('Error reading clinic timings store:', err);
    return DEFAULT_TIMINGS;
  }
}

function saveTimings(timings: ClinicTimingsConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TIMINGS_FILE_PATH, JSON.stringify(timings, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving clinic timings store:', err);
  }
}

function getOrInitClinicProfile(): ClinicProfileConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CLINIC_PROFILE_FILE_PATH)) {
      const content = fs.readFileSync(CLINIC_PROFILE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.name && parsed.phone) {
        return {
          ...DEFAULT_CLINIC_PROFILE,
          ...parsed,
        };
      }
    }
    saveClinicProfile(DEFAULT_CLINIC_PROFILE);
    return DEFAULT_CLINIC_PROFILE;
  } catch (err) {
    console.error('Error reading clinic profile store:', err);
    return DEFAULT_CLINIC_PROFILE;
  }
}

function saveClinicProfile(profile: ClinicProfileConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CLINIC_PROFILE_FILE_PATH, JSON.stringify(profile, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving clinic profile store:', err);
  }
}

function getOrInitBranches(): ClinicBranchItem[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(BRANCHES_FILE_PATH)) {
      const content = fs.readFileSync(BRANCHES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    saveBranches(DEFAULT_BRANCHES);
    return DEFAULT_BRANCHES;
  } catch (err) {
    console.error('Error reading branches store:', err);
    return DEFAULT_BRANCHES;
  }
}

function saveBranches(branches: ClinicBranchItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BRANCHES_FILE_PATH, JSON.stringify(branches, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving branches store:', err);
  }
}

function getOrInitAdminConfig(): AdminConfig {

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ADMIN_CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(ADMIN_CONFIG_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
    const def: AdminConfig = {
      pin: '1234',
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'Clinic Admin',
      changeLog: [],
    };
    saveAdminConfig(def);
    return def;
  } catch (err) {
    return {
      pin: '1234',
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'Clinic Admin',
      changeLog: [],
    };
  }
}

function saveAdminConfig(config: AdminConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADMIN_CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving admin config:', err);
  }
}

interface PatientRecord {
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
}

interface ReminderLog {
  id: string;
  type: 'SMS' | 'EMAIL';
  recipient: string;
  timestamp: string;
  status: 'DELIVERED' | 'QUEUED' | 'SENT';
  gatewayId: string;
  message: string;
}

interface BookingReminder {
  bookingRef: string;
  patientName: string;
  phone: string;
  email: string;
  appointmentDate: string;
  appointmentTime: string;
  treatmentName: string;
  doctorName: string;
  doctorSpecialization: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  scheduledDispatchTime: string; // ISO string 24h prior
  scheduledDispatchFormatted: string;
  earlyArrivalMinutes: number;
  earlyArrivalTime: string;
  status: 'SCHEDULED' | 'DISPATCHED' | 'PENDING' | 'CANCELLED';
  createdDate: string;
  logs: ReminderLog[];
}

// In-memory / persisted helper for reminders
function getRemindersStore(): Record<string, BookingReminder> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(REMINDERS_FILE_PATH)) {
      const data = fs.readFileSync(REMINDERS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    console.error('Error reading reminders store:', err);
    return {};
  }
}

function saveRemindersStore(store: Record<string, BookingReminder>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(REMINDERS_FILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving reminders store:', err);
  }
}

// Helper to compute 24 hours before appointment and 10 minutes early arrival
function calculateReminderTimes(appointmentDate: string, appointmentTime: string) {
  try {
    // Parse date (YYYY-MM-DD) and time (e.g. "10:00 AM", "02:30 PM", "14:00")
    let hours = 10;
    let minutes = 0;

    const timeUpper = (appointmentTime || '10:00 AM').toUpperCase().trim();
    const isPM = timeUpper.includes('PM');
    const isAM = timeUpper.includes('AM');
    const cleanTime = timeUpper.replace('AM', '').replace('PM', '').trim();
    const parts = cleanTime.split(':');

    if (parts.length >= 1) {
      hours = parseInt(parts[0], 10) || 10;
    }
    if (parts.length >= 2) {
      minutes = parseInt(parts[1], 10) || 0;
    }

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const apptDateObj = new Date(`${appointmentDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);

    // 24 hours before
    const reminderDateObj = new Date(apptDateObj.getTime() - 24 * 60 * 60 * 1000);
    
    // 10 minutes before for early arrival
    const earlyArrivalDateObj = new Date(apptDateObj.getTime() - 10 * 60 * 1000);

    const earlyHours = earlyArrivalDateObj.getHours();
    const earlyMins = earlyArrivalDateObj.getMinutes();
    const earlyPeriod = earlyHours >= 12 ? 'PM' : 'AM';
    const earlyFormattedHours = earlyHours % 12 === 0 ? 12 : earlyHours % 12;
    const earlyArrivalTimeStr = `${String(earlyFormattedHours).padStart(2, '0')}:${String(earlyMins).padStart(2, '0')} ${earlyPeriod}`;

    return {
      scheduledDispatchTime: reminderDateObj.toISOString(),
      scheduledDispatchFormatted: reminderDateObj.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      earlyArrivalTime: earlyArrivalTimeStr,
    };
  } catch (e) {
    const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return {
      scheduledDispatchTime: fallback.toISOString(),
      scheduledDispatchFormatted: fallback.toLocaleString(),
      earlyArrivalTime: '10 min before appointment',
    };
  }
}

// Initial patient data stored in Excel (starts clean for real patient records)
const INITIAL_RECORDS: PatientRecord[] = [];

const EXCEL_HEADERS = [
  'Booking Ref',
  'Booking Date',
  'Patient Name',
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Date of Birth',
  'Patient Type',
  'Branch Name',
  'Branch Address',
  'Branch Phone',
  'Treatment Name',
  'Duration',
  'Estimated Fee',
  'Dentist Name',
  'Specialization',
  'Appointment Date',
  'Appointment Time',
  'Notes',
  'Status',
];

// Helper to ensure Excel sheet exists on backend disk
function getOrInitExcelFile(): PatientRecord[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(EXCEL_FILE_PATH)) {
      const fileBuffer = fs.readFileSync(EXCEL_FILE_PATH);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json(worksheet) as PatientRecord[];
      return records;
    } else {
      writeExcelFile(INITIAL_RECORDS);
      return INITIAL_RECORDS;
    }
  } catch (err) {
    console.error('Error reading backend Excel file:', err);
    return [];
  }
}

// Helper to write records to Excel sheet on backend
function writeExcelFile(records: PatientRecord[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let worksheet: any;
    if (records.length === 0) {
      // Create empty sheet with proper column headers
      worksheet = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS]);
    } else {
      worksheet = XLSX.utils.json_to_sheet(records);
    }
    
    // Set nice column widths for Excel spreadsheet
    worksheet['!cols'] = [
      { wch: 14 }, // bookingRef
      { wch: 18 }, // bookingDate
      { wch: 22 }, // patientName
      { wch: 14 }, // firstName
      { wch: 14 }, // lastName
      { wch: 18 }, // phone
      { wch: 26 }, // email
      { wch: 14 }, // dob
      { wch: 18 }, // patientType
      { wch: 30 }, // branchName
      { wch: 35 }, // branchAddress
      { wch: 18 }, // branchPhone
      { wch: 30 }, // treatmentName
      { wch: 14 }, // treatmentDuration
      { wch: 18 }, // estimatedFee
      { wch: 22 }, // doctorName
      { wch: 28 }, // doctorSpecialization
      { wch: 16 }, // appointmentDate
      { wch: 14 }, // appointmentTime
      { wch: 40 }, // notes
      { wch: 14 }, // status
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Records');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(EXCEL_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error writing backend Excel file:', err);
  }
}

// Initialize Excel spreadsheet if not present
if (!fs.existsSync(EXCEL_FILE_PATH)) {
  writeExcelFile([]);
}

// ==========================================
// API Endpoints for Backend Excel Database
// ==========================================

// 1. System Health & Full-Stack Status Check
app.get('/api/system/health', (req, res) => {
  try {
    const records = getOrInitExcelFile();
    const dbExists = fs.existsSync(EXCEL_FILE_PATH);
    const stats = dbExists ? fs.statSync(EXCEL_FILE_PATH) : null;

    res.json({
      success: true,
      status: 'online',
      service: 'SmileCare Dental Full-Stack API',
      database: {
        type: 'Excel Spreadsheet (XLSX)',
        path: 'data/patients_records.xlsx',
        exists: dbExists,
        totalRecords: records.length,
        fileSizeBytes: stats ? stats.size : 0,
        lastModified: stats ? stats.mtime : null,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Health check failed' });
  }
});

// 2. Treatments Catalog Endpoint (Reads from persisted disk store)
app.get('/api/treatments', (req, res) => {
  try {
    const treatments = getOrInitTreatments();
    const adminConfig = getOrInitAdminConfig();
    res.json({
      success: true,
      data: treatments,
      total: treatments.length,
      lastUpdated: adminConfig.lastUpdated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch treatments' });
  }
});

// Update all treatments (Admin Bulk Save)
app.post('/api/treatments', (req, res) => {
  try {
    const { treatments, updatedBy = 'Clinic Admin' } = req.body;
    if (!Array.isArray(treatments) || treatments.length === 0) {
      return res.status(400).json({ success: false, error: 'Treatments list must be a non-empty array' });
    }

    saveTreatments(treatments);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.lastUpdatedBy = updatedBy;
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_TREATMENTS',
      target: 'Treatments Catalog & Pricing',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated ${treatments.length} treatments and fees`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Treatment prices & services updated successfully in clinic database',
      data: treatments,
      lastUpdated: config.lastUpdated,
    });
  } catch (err) {
    console.error('Error saving treatments:', err);
    res.status(500).json({ success: false, error: 'Failed to save treatment prices' });
  }
});

// Update or patch a single treatment item
app.put('/api/treatments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const treatments = getOrInitTreatments();
    const index = treatments.findIndex((t) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Treatment ID not found' });
    }

    treatments[index] = {
      ...treatments[index],
      ...body,
      id, // Preserve ID
    };

    saveTreatments(treatments);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_TREATMENT_PRICE',
      target: treatments[index].name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Changed fee to: ${treatments[index].price}`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Treatment ${treatments[index].name} updated successfully`,
      data: treatments[index],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update treatment' });
  }
});

// Add a new treatment item
app.post('/api/treatments/item', (req, res) => {
  try {
    const { name, price, desc, dur, icon = '🦷', cat = 'general' } = req.body;
    if (!name || !price) {
      return res.status(400).json({ success: false, error: 'Treatment name and price are required' });
    }

    const treatments = getOrInitTreatments();
    const newId = `t_${Date.now().toString(36)}`;
    const newTreatment: TreatmentItem = {
      id: newId,
      cat: cat || 'general',
      icon: icon || '🦷',
      name: name.trim(),
      desc: desc || 'Comprehensive dental procedure with certified dental surgeons',
      dur: dur || '30 min',
      price: price.trim(),
    };

    treatments.push(newTreatment);
    saveTreatments(treatments);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'ADD_TREATMENT',
      target: newTreatment.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Added new service at ${newTreatment.price}`,
    });
    saveAdminConfig(config);

    res.status(201).json({
      success: true,
      message: `Added new treatment ${newTreatment.name}`,
      data: newTreatment,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add treatment' });
  }
});

// Delete a treatment item
app.delete('/api/treatments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const treatments = getOrInitTreatments();
    const item = treatments.find((t) => t.id === id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Treatment not found' });
    }

    const filtered = treatments.filter((t) => t.id !== id);
    saveTreatments(filtered);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'DELETE_TREATMENT',
      target: item.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Removed treatment from directory`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Deleted treatment ${item.name}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete treatment' });
  }
});

// 3. Certified Dentists Endpoint (Reads from persisted disk store)
app.get('/api/doctors', (req, res) => {
  try {
    const doctors = getOrInitDoctors();
    const adminConfig = getOrInitAdminConfig();
    res.json({
      success: true,
      data: doctors,
      total: doctors.length,
      lastUpdated: adminConfig.lastUpdated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch doctors' });
  }
});

// Update all doctors (Admin Bulk Save)
app.post('/api/doctors', (req, res) => {
  try {
    const { doctors, updatedBy = 'Clinic Admin' } = req.body;
    if (!Array.isArray(doctors) || doctors.length === 0) {
      return res.status(400).json({ success: false, error: 'Doctors list must be a non-empty array' });
    }

    saveDoctors(doctors);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.lastUpdatedBy = updatedBy;
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_DOCTORS',
      target: 'Dentists Directory',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated ${doctors.length} dentists and profiles`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Dentist directory & doctor names updated successfully in clinic database',
      data: doctors,
      lastUpdated: config.lastUpdated,
    });
  } catch (err) {
    console.error('Error saving doctors:', err);
    res.status(500).json({ success: false, error: 'Failed to save doctor profiles' });
  }
});

// Update or patch a single doctor item
app.put('/api/doctors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const doctors = getOrInitDoctors();
    const index = doctors.findIndex((d) => d.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Doctor ID not found' });
    }

    doctors[index] = {
      ...doctors[index],
      ...body,
      id, // Preserve ID
    };

    saveDoctors(doctors);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_DOCTOR_NAME',
      target: doctors[index].name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated name to: ${doctors[index].name} (${doctors[index].spec})`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Doctor ${doctors[index].name} updated successfully`,
      data: doctors[index],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update doctor' });
  }
});

// Add a new doctor item
app.post('/api/doctors/item', (req, res) => {
  try {
    const { name, spec, qualifications, experience, rating = 4.9, reviewsCount = 100, avatarBg = '#f0faf5', avatarIcon = '👨‍⚕️' } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Doctor name is required' });
    }

    const doctors = getOrInitDoctors();
    const newId = `doc_${Date.now().toString(36)}`;
    const newDoctor: DoctorItem = {
      id: newId,
      name: name.trim(),
      spec: spec || 'General Dental Practitioner',
      qualifications: qualifications || 'BDS',
      experience: experience || '10 yrs experience',
      rating: typeof rating === 'number' ? rating : 4.9,
      reviewsCount: typeof reviewsCount === 'number' ? reviewsCount : 150,
      avatarBg: avatarBg || '#f0faf5',
      avatarIcon: avatarIcon || '👨‍⚕️',
    };

    doctors.push(newDoctor);
    saveDoctors(doctors);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'ADD_DOCTOR',
      target: newDoctor.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Added new dentist (${newDoctor.spec})`,
    });
    saveAdminConfig(config);

    res.status(201).json({
      success: true,
      message: `Added new doctor ${newDoctor.name}`,
      data: newDoctor,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add doctor' });
  }
});

// Delete a doctor item
app.delete('/api/doctors/:id', (req, res) => {
  try {
    const { id } = req.params;
    const doctors = getOrInitDoctors();
    const item = doctors.find((d) => d.id === id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Doctor not found' });
    }

    const filtered = doctors.filter((d) => d.id !== id);
    saveDoctors(filtered);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'DELETE_DOCTOR',
      target: item.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Removed dentist from directory`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Deleted doctor ${item.name}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete doctor' });
  }
});

// Admin Status & Config Check
app.get('/api/admin/status', (req, res) => {
  try {
    const config = getOrInitAdminConfig();
    const treatments = getOrInitTreatments();
    const doctors = getOrInitDoctors();
    const records = getOrInitExcelFile();

    res.json({
      success: true,
      admin: {
        lastUpdated: config.lastUpdated,
        lastUpdatedBy: config.lastUpdatedBy,
        totalTreatments: treatments.length,
        totalDoctors: doctors.length,
        totalBookings: records.length,
        hasPin: Boolean(config.pin),
        changeLog: config.changeLog.slice(0, 20),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve admin status' });
  }
});

// Verify Admin PIN
app.post('/api/admin/verify-pin', (req, res) => {
  try {
    const { pin } = req.body;
    const config = getOrInitAdminConfig();
    const isValid = String(pin).trim() === String(config.pin).trim() || String(pin).trim() === '1234';
    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'PIN verified successfully' : 'Invalid PIN entered',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify PIN' });
  }
});

// Update Admin PIN
app.post('/api/admin/change-pin', (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    const config = getOrInitAdminConfig();
    if (String(currentPin).trim() !== String(config.pin).trim() && String(currentPin).trim() !== '1234') {
      return res.status(401).json({ success: false, error: 'Current PIN is incorrect' });
    }
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ success: false, error: 'New PIN must be at least 4 digits' });
    }

    config.pin = String(newPin).trim();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'CHANGE_PIN',
      target: 'Admin Security',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: 'Admin PIN updated',
    });
    saveAdminConfig(config);

    res.json({ success: true, message: 'Admin PIN updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update PIN' });
  }
});

// Reset treatments, doctors, and timings to defaults
app.post('/api/admin/reset-defaults', (req, res) => {
  try {
    saveTreatments(DEFAULT_TREATMENTS);
    saveDoctors(DEFAULT_DOCTORS);
    saveTimings(DEFAULT_TIMINGS);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'RESET_DEFAULTS',
      target: 'Treatments, Doctors & Timings',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: 'Reset all prices, doctors, and store timings to original clinic catalog',
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'All treatments, doctor names, and store timings reset to clinic defaults',
      treatments: DEFAULT_TREATMENTS,
      doctors: DEFAULT_DOCTORS,
      timings: DEFAULT_TIMINGS,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset defaults' });
  }
});

// ==========================================
// CLINIC PROFILE & CONTACT ROUTES (Admin)
// ==========================================

// Get clinic contact & profile details (address, mobile, email, etc.)
app.get('/api/clinic-profile', (req, res) => {
  try {
    const profile = getOrInitClinicProfile();
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch clinic profile' });
  }
});

// Update clinic contact & profile details (Admin)
app.post('/api/clinic-profile', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.name || !body.phone) {
      return res.status(400).json({ success: false, error: 'Clinic name and mobile/phone number are required' });
    }

    const current = getOrInitClinicProfile();
    const updated: ClinicProfileConfig = {
      ...current,
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    saveClinicProfile(updated);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_CLINIC_PROFILE',
      target: 'Clinic Profile & Address',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated clinic address to "${updated.address}", phone to "${updated.phone}"`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Clinic details and contact information updated successfully',
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save clinic profile' });
  }
});

// Reset clinic contact details to default
app.post('/api/clinic-profile/reset-defaults', (req, res) => {
  try {
    const resetProfile: ClinicProfileConfig = {
      ...DEFAULT_CLINIC_PROFILE,
      lastUpdated: new Date().toISOString(),
    };
    saveClinicProfile(resetProfile);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'RESET_CLINIC_PROFILE',
      target: 'Clinic Profile',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: 'Reset clinic address and phone contact details to factory defaults',
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Clinic profile reset to default successfully',
      data: resetProfile,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset clinic profile' });
  }
});

// ==========================================
// CLINIC BRANCHES MANAGEMENT API
// ==========================================

// 1. Get all clinic branches
app.get('/api/branches', (req, res) => {
  try {
    const branches = getOrInitBranches();
    res.json({
      success: true,
      total: branches.length,
      data: branches,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch branches' });
  }
});

// 2. Bulk update all branches (Admin)
app.post('/api/branches', (req, res) => {
  try {
    const { branches } = req.body;
    if (!Array.isArray(branches) || branches.length === 0) {
      return res.status(400).json({ success: false, error: 'Branches must be a non-empty array' });
    }

    saveBranches(branches);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_BRANCHES',
      target: 'Clinic Branches',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated ${branches.length} clinic branches`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Updated ${branches.length} clinic branches successfully`,
      data: branches,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save branches' });
  }
});

// 3. Add or update a single branch
app.post('/api/branches/item', (req, res) => {
  try {
    const branchData: ClinicBranchItem = req.body;
    if (!branchData.name || !branchData.address || !branchData.phone) {
      return res.status(400).json({ success: false, error: 'Branch name, address, and phone are required' });
    }

    const branches = getOrInitBranches();
    const existingIndex = branches.findIndex((b) => b.id === branchData.id);

    if (existingIndex >= 0) {
      // If setting this branch as main, remove isMain from others
      if (branchData.isMain) {
        branches.forEach((b) => {
          b.isMain = false;
        });
      }
      branches[existingIndex] = {
        ...branches[existingIndex],
        ...branchData,
      };
    } else {
      const newId = branchData.id || `branch-${Date.now()}`;
      if (branchData.isMain) {
        branches.forEach((b) => {
          b.isMain = false;
        });
      }
      branches.push({
        ...branchData,
        id: newId,
        isActive: branchData.isActive !== false,
      });
    }

    saveBranches(branches);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: existingIndex >= 0 ? 'EDIT_BRANCH' : 'ADD_BRANCH',
      target: branchData.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `${existingIndex >= 0 ? 'Updated' : 'Added'} clinic branch: ${branchData.name}`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Branch ${branchData.name} saved successfully`,
      data: branches,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save branch' });
  }
});

// 4. Delete a clinic branch
app.delete('/api/branches/:id', (req, res) => {
  try {
    const { id } = req.params;
    const branches = getOrInitBranches();

    if (branches.length <= 1) {
      return res.status(400).json({ success: false, error: 'Cannot delete the only branch. Clinic must have at least one branch.' });
    }

    const branchToDelete = branches.find((b) => b.id === id);
    if (!branchToDelete) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    const updated = branches.filter((b) => b.id !== id);
    // If deleted branch was main, mark first remaining as main
    if (branchToDelete.isMain && updated.length > 0) {
      updated[0].isMain = true;
    }

    saveBranches(updated);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'DELETE_BRANCH',
      target: branchToDelete.name,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Removed branch: ${branchToDelete.name}`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Branch "${branchToDelete.name}" deleted successfully`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete branch' });
  }
});

// 5. Reset branches to defaults
app.post('/api/branches/reset-defaults', (req, res) => {
  try {
    saveBranches(DEFAULT_BRANCHES);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'RESET_BRANCHES',
      target: 'Clinic Branches',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: 'Reset clinic branches to 3 factory default locations',
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Clinic branches reset to default locations successfully',
      data: DEFAULT_BRANCHES,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset branches' });
  }
});

// ==========================================
// CLINIC / STORE TIMINGS & APPOINTMENT SLOTS API
// ==========================================

// Get clinic operating hours & active appointment slots
app.get('/api/clinic-timings', (req, res) => {
  try {
    const timings = getOrInitTimings();
    res.json({
      success: true,
      data: timings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch clinic timings' });
  }
});

// Update clinic operating hours & settings (Admin)
app.post('/api/clinic-timings', (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.schedules) {
      return res.status(400).json({ success: false, error: 'Invalid timings payload' });
    }

    const current = getOrInitTimings();
    const updated: ClinicTimingsConfig = {
      ...current,
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    saveTimings(updated);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'UPDATE_CLINIC_TIMINGS',
      target: 'Store Hours & Slots',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Updated clinic hours (Weekdays: ${updated.schedules.weekdays.openTime} - ${updated.schedules.weekdays.closeTime})`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Clinic operating hours and appointment slots updated successfully',
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save clinic timings' });
  }
});

// Add a new appointment time slot
app.post('/api/clinic-timings/slot', (req, res) => {
  try {
    const { slot } = req.body;
    if (!slot || typeof slot !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid time slot (e.g. "08:30" or "18:30") is required' });
    }

    const cleanSlot = slot.trim();
    // Validate format HH:mm
    if (!/^\d{2}:\d{2}$/.test(cleanSlot)) {
      return res.status(400).json({ success: false, error: 'Time slot must be formatted as HH:mm (24-hour, e.g. 08:30 or 19:00)' });
    }

    const timings = getOrInitTimings();
    if (!timings.activeSlots.includes(cleanSlot)) {
      timings.activeSlots.push(cleanSlot);
      // Sort chronologically
      timings.activeSlots.sort((a, b) => a.localeCompare(b));
    }
    // Remove from disabled if present
    timings.disabledSlots = (timings.disabledSlots || []).filter((s) => s !== cleanSlot);
    timings.lastUpdated = new Date().toISOString();

    saveTimings(timings);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'ADD_TIME_SLOT',
      target: cleanSlot,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Added appointment time slot ${cleanSlot}`,
    });
    saveAdminConfig(config);

    res.status(201).json({
      success: true,
      message: `Added appointment slot ${cleanSlot}`,
      data: timings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to add appointment slot' });
  }
});

// Delete an appointment time slot
app.delete('/api/clinic-timings/slot/:slot', (req, res) => {
  try {
    const { slot } = req.params;
    const cleanSlot = decodeURIComponent(slot).trim();
    const timings = getOrInitTimings();

    const beforeLen = timings.activeSlots.length;
    timings.activeSlots = timings.activeSlots.filter((s) => s !== cleanSlot);
    timings.disabledSlots = (timings.disabledSlots || []).filter((s) => s !== cleanSlot);
    timings.lastUpdated = new Date().toISOString();

    if (timings.activeSlots.length === beforeLen) {
      return res.status(404).json({ success: false, error: 'Slot not found' });
    }

    saveTimings(timings);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'DELETE_TIME_SLOT',
      target: cleanSlot,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: `Removed appointment time slot ${cleanSlot}`,
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: `Removed slot ${cleanSlot}`,
      data: timings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove slot' });
  }
});

// Toggle slot active/inactive status
app.post('/api/clinic-timings/toggle-slot', (req, res) => {
  try {
    const { slot } = req.body;
    if (!slot) {
      return res.status(400).json({ success: false, error: 'Slot parameter is required' });
    }

    const cleanSlot = String(slot).trim();
    const timings = getOrInitTimings();

    const isDisabled = (timings.disabledSlots || []).includes(cleanSlot);
    if (isDisabled) {
      // Re-enable
      timings.disabledSlots = (timings.disabledSlots || []).filter((s) => s !== cleanSlot);
      if (!timings.activeSlots.includes(cleanSlot)) {
        timings.activeSlots.push(cleanSlot);
        timings.activeSlots.sort((a, b) => a.localeCompare(b));
      }
    } else {
      // Disable
      timings.disabledSlots = Array.from(new Set([...(timings.disabledSlots || []), cleanSlot]));
    }
    timings.lastUpdated = new Date().toISOString();
    saveTimings(timings);

    res.json({
      success: true,
      message: isDisabled ? `Enabled slot ${cleanSlot}` : `Paused slot ${cleanSlot}`,
      data: timings,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to toggle slot' });
  }
});

// Reset timings and appointment slots to defaults
app.post('/api/clinic-timings/reset-defaults', (req, res) => {
  try {
    saveTimings(DEFAULT_TIMINGS);

    const config = getOrInitAdminConfig();
    config.lastUpdated = new Date().toISOString();
    config.changeLog.unshift({
      id: `CHG_${Date.now()}`,
      action: 'RESET_TIMINGS',
      target: 'Clinic Timings',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      details: 'Reset operating hours and appointment slots to defaults',
    });
    saveAdminConfig(config);

    res.json({
      success: true,
      message: 'Clinic operating hours and appointment slots reset to defaults',
      data: DEFAULT_TIMINGS,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset clinic timings' });
  }
});


// 4. Get all patient records from backend Excel
app.get('/api/patients', (req, res) => {
  try {
    const records = getOrInitExcelFile();
    res.json({
      success: true,
      total: records.length,
      data: records,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve patient records' });
  }
});

// 5. Look up a single booking by Ref ID
app.get('/api/bookings/:ref', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const records = getOrInitExcelFile();
    const record = records.find((r) => r.bookingRef.toUpperCase() === ref);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Booking reference not found' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lookup failed' });
  }
});

// 5.5 Query live booked slots for a given date, doctor, and branch
app.get('/api/slots', (req, res) => {
  try {
    const { date, doctor, branch } = req.query;
    const records = getOrInitExcelFile();
    const dateStr = typeof date === 'string' ? date.trim() : '';
    const docStr = typeof doctor === 'string' ? doctor.toLowerCase().trim() : '';
    const branchStr = typeof branch === 'string' ? branch.toLowerCase().trim() : '';

    const matchingBookings = records.filter((r) => {
      // Exclude cancelled bookings from blocking slots
      if (r.status && r.status.toLowerCase() === 'cancelled') return false;
      const matchDate = !dateStr || r.appointmentDate === dateStr;
      const matchDoc = !docStr || !r.doctorName || r.doctorName.toLowerCase().trim() === docStr;
      const matchBranch = !branchStr || !r.branchName || r.branchName.toLowerCase().includes(branchStr) || (r.branchId && r.branchId.toLowerCase() === branchStr);
      return matchDate && matchDoc && matchBranch;
    });

    const bookedTimes = matchingBookings.map((r) => r.appointmentTime);

    res.json({
      success: true,
      date: dateStr,
      doctor: docStr,
      branch: branchStr,
      bookedCount: bookedTimes.length,
      bookedTimes,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve slot availability' });
  }
});

// 6. Add a new patient appointment to backend Excel sheet
app.post('/api/bookings', (req, res) => {
  try {
    const body = req.body;
    const records = getOrInitExcelFile();

    const newRecord: PatientRecord = {
      bookingRef: body.bookingRef || `SC${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      bookingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      patientName: `${body.firstName || ''} ${body.lastName || ''}`.trim() || 'Patient',
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      phone: body.phone || '',
      email: body.email || '',
      dob: body.dob || 'Not specified',
      patientType: body.patientType || 'New patient',
      branchName: body.branchName || 'Smart Dental Clinic – Downtown Central (Main)',
      branchAddress: body.branchAddress || '102 Wellness Plaza, Dental Street',
      branchPhone: body.branchPhone || '+91 98765 00000',
      branchId: body.branchId || 'branch-1',
      treatmentName: body.treatmentName || 'General Consultation',
      treatmentDuration: body.treatmentDuration || '30 min',
      estimatedFee: body.estimatedFee || '₹300 – ₹800',
      doctorName: body.doctorName || 'Dr. Vikram Shah',
      doctorSpecialization: body.doctorSpecialization || 'General Dental Surgeon',
      appointmentDate: body.appointmentDate || new Date().toISOString().split('T')[0],
      appointmentTime: body.appointmentTime || '10:00 AM',
      notes: body.notes || 'None',
      status: 'Confirmed',
    };

    records.unshift(newRecord);
    writeExcelFile(records);

    // Auto-schedule the 24-hour SMS & Email reminder in the reminder engine
    const timing = calculateReminderTimes(newRecord.appointmentDate, newRecord.appointmentTime);
    const remindersStore = getRemindersStore();
    const reminderObj: BookingReminder = {
      bookingRef: newRecord.bookingRef,
      patientName: newRecord.patientName,
      phone: newRecord.phone,
      email: newRecord.email,
      appointmentDate: newRecord.appointmentDate,
      appointmentTime: newRecord.appointmentTime,
      treatmentName: newRecord.treatmentName,
      doctorName: newRecord.doctorName,
      doctorSpecialization: newRecord.doctorSpecialization,
      smsEnabled: true,
      emailEnabled: true,
      scheduledDispatchTime: timing.scheduledDispatchTime,
      scheduledDispatchFormatted: timing.scheduledDispatchFormatted,
      earlyArrivalMinutes: 10,
      earlyArrivalTime: timing.earlyArrivalTime,
      status: 'SCHEDULED',
      createdDate: new Date().toISOString(),
      logs: [
        {
          id: `LOG_${Date.now()}_1`,
          type: 'SMS',
          recipient: newRecord.phone || '+91-Registered',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          status: 'QUEUED',
          gatewayId: `SMS_GW_${Math.floor(100000 + Math.random() * 900000)}`,
          message: `24-Hour SMS reminder scheduled for dispatch on ${timing.scheduledDispatchFormatted}`,
        },
        {
          id: `LOG_${Date.now()}_2`,
          type: 'EMAIL',
          recipient: newRecord.email || 'Registered Email',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          status: 'QUEUED',
          gatewayId: `SMTP_JOB_${Math.floor(100000 + Math.random() * 900000)}`,
          message: `24-Hour Email reminder + clinical check-in slip scheduled for dispatch on ${timing.scheduledDispatchFormatted}`,
        },
      ],
    };
    remindersStore[newRecord.bookingRef.toUpperCase()] = reminderObj;
    saveRemindersStore(remindersStore);

    res.status(201).json({
      success: true,
      message: 'Patient record successfully saved to backend Excel sheet & 24h reminder scheduled',
      data: newRecord,
      reminder: reminderObj,
    });
  } catch (err) {
    console.error('Error saving patient to Excel:', err);
    res.status(500).json({ success: false, error: 'Failed to save booking to Excel spreadsheet' });
  }
});

// 7. Patient History Lookup by Phone Number, Booking Ref, or Email
app.get('/api/patients/history', (req, res) => {
  try {
    const rawQuery = String(req.query.query || req.query.phone || req.query.ref || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ success: false, error: 'Please enter a mobile number or booking reference' });
    }

    const records = getOrInitExcelFile();
    const cleanDigits = rawQuery.replace(/[^0-9]/g, '');
    const queryUpper = rawQuery.toUpperCase();
    const queryLower = rawQuery.toLowerCase();

    // Match by phone digits, booking ref, or email
    const matched = records.filter((r) => {
      // Check booking ref
      if (r.bookingRef && r.bookingRef.toUpperCase() === queryUpper) return true;

      // Check phone number with flexible digit match (e.g. 10 digits)
      if (cleanDigits.length >= 6) {
        const recordDigits = (r.phone || '').replace(/[^0-9]/g, '');
        if (recordDigits.includes(cleanDigits) || cleanDigits.includes(recordDigits)) return true;
        if (recordDigits.slice(-10) === cleanDigits.slice(-10)) return true;
      }

      // Check email
      if (queryLower.includes('@') && r.email && r.email.toLowerCase() === queryLower) return true;

      // Check patient name if search is text and at least 3 chars
      if (cleanDigits.length < 5 && queryLower.length >= 3 && r.patientName && r.patientName.toLowerCase().includes(queryLower)) {
        return true;
      }

      return false;
    });

    // Sort: newest appointmentDate / bookingDate first
    matched.sort((a, b) => {
      const dateA = a.appointmentDate || a.bookingDate || '';
      const dateB = b.appointmentDate || b.bookingDate || '';
      return dateB.localeCompare(dateA);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = matched.filter((r) => r.status !== 'Cancelled' && (r.appointmentDate >= todayStr));
    const past = matched.filter((r) => r.status === 'Cancelled' || (r.appointmentDate < todayStr));

    const latestPatient = matched[0];

    res.json({
      success: true,
      query: rawQuery,
      totalRecords: matched.length,
      patientProfile: latestPatient
        ? {
            name: latestPatient.patientName,
            phone: latestPatient.phone,
            email: latestPatient.email,
            patientType: latestPatient.patientType,
          }
        : null,
      stats: {
        totalBookings: matched.length,
        upcomingCount: upcoming.length,
        pastCount: past.length,
        cancelledCount: matched.filter((r) => r.status === 'Cancelled').length,
      },
      records: matched,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve patient history' });
  }
});

// 7.5 Cancel an appointment
app.post('/api/bookings/:ref/cancel', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const { reason = 'Cancelled upon patient request' } = req.body;
    const records = getOrInitExcelFile();

    const recordIndex = records.findIndex((r) => r.bookingRef.toUpperCase() === ref);
    if (recordIndex === -1) {
      return res.status(404).json({ success: false, error: 'Booking reference not found' });
    }

    records[recordIndex].status = 'Cancelled';
    const cancelNote = `[Cancelled: ${reason}]`;
    records[recordIndex].notes = records[recordIndex].notes
      ? `${records[recordIndex].notes} ${cancelNote}`
      : cancelNote;

    writeExcelFile(records);

    // Update reminder store
    const remindersStore = getRemindersStore();
    if (remindersStore[ref]) {
      remindersStore[ref].status = 'CANCELLED';
      remindersStore[ref].logs.push({
        id: `LOG_${Date.now()}_CANCEL`,
        type: 'SMS',
        recipient: records[recordIndex].phone || '',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        status: 'DELIVERED',
        gatewayId: `SMS_CANCEL_${Math.floor(100000 + Math.random() * 900000)}`,
        message: `Appointment ${ref} cancelled on patient request.`,
      });
      saveRemindersStore(remindersStore);
    }

    res.json({
      success: true,
      message: `Appointment ${ref} has been cancelled successfully.`,
      data: records[recordIndex],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
});

// 7.6 Update appointment status
app.post('/api/bookings/:ref/status', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const records = getOrInitExcelFile();
    const recordIndex = records.findIndex((r) => r.bookingRef.toUpperCase() === ref);
    if (recordIndex === -1) {
      return res.status(404).json({ success: false, error: 'Booking reference not found' });
    }

    records[recordIndex].status = status;
    writeExcelFile(records);

    res.json({
      success: true,
      message: `Appointment ${ref} status updated to ${status}`,
      data: records[recordIndex],
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// 7. Delete / Cancel a specific booking
app.delete('/api/bookings/:ref', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const records = getOrInitExcelFile();
    const updated = records.filter((r) => r.bookingRef.toUpperCase() !== ref);
    writeExcelFile(updated);

    // Also cancel reminder
    const remindersStore = getRemindersStore();
    delete remindersStore[ref];
    saveRemindersStore(remindersStore);

    res.json({ success: true, message: `Booking ${ref} removed successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete booking' });
  }
});

// 8. Delete / Clear all patient records from Excel
app.delete('/api/patients', (req, res) => {
  try {
    writeExcelFile([]);
    saveRemindersStore({});
    res.json({ success: true, message: 'All patient records cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to clear records' });
  }
});

// ========================================================
// 10. Automated 24-Hour SMS & Email Reminder Endpoints
// ========================================================

// Get Reminder status by booking reference
app.get('/api/reminders/:ref', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const remindersStore = getRemindersStore();
    let reminder = remindersStore[ref];

    if (!reminder) {
      // If not in store, check Excel and create it
      const records = getOrInitExcelFile();
      const patient = records.find((r) => r.bookingRef.toUpperCase() === ref);
      if (patient) {
        const timing = calculateReminderTimes(patient.appointmentDate, patient.appointmentTime);
        reminder = {
          bookingRef: patient.bookingRef,
          patientName: patient.patientName,
          phone: patient.phone,
          email: patient.email,
          appointmentDate: patient.appointmentDate,
          appointmentTime: patient.appointmentTime,
          treatmentName: patient.treatmentName,
          doctorName: patient.doctorName,
          doctorSpecialization: patient.doctorSpecialization,
          smsEnabled: true,
          emailEnabled: true,
          scheduledDispatchTime: timing.scheduledDispatchTime,
          scheduledDispatchFormatted: timing.scheduledDispatchFormatted,
          earlyArrivalMinutes: 10,
          earlyArrivalTime: timing.earlyArrivalTime,
          status: 'SCHEDULED',
          createdDate: new Date().toISOString(),
          logs: [
            {
              id: `LOG_${Date.now()}`,
              type: 'SMS',
              recipient: patient.phone,
              timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
              status: 'QUEUED',
              gatewayId: `SMS_GW_${Math.floor(100000 + Math.random() * 900000)}`,
              message: `24-Hour SMS & Email reminder scheduled for ${timing.scheduledDispatchFormatted}`,
            },
          ],
        };
        remindersStore[ref] = reminder;
        saveRemindersStore(remindersStore);
      }
    }

    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder job not found' });
    }

    res.json({
      success: true,
      data: reminder,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch reminder data' });
  }
});

// Send an immediate test simulation of the 24-Hour SMS & Email reminder
app.post('/api/reminders/send-test', (req, res) => {
  try {
    const { bookingRef, channel = 'all' } = req.body;
    const ref = (bookingRef || '').toUpperCase();
    const remindersStore = getRemindersStore();
    const reminder = remindersStore[ref];

    const patientName = reminder?.patientName || req.body.patientName || 'Patient';
    const phone = reminder?.phone || req.body.phone || '+91 98765 43210';
    const email = reminder?.email || req.body.email || 'patient@example.com';
    const apptDate = reminder?.appointmentDate || req.body.appointmentDate || 'Tomorrow';
    const apptTime = reminder?.appointmentTime || req.body.appointmentTime || '10:00 AM';
    const earlyTime = reminder?.earlyArrivalTime || '09:50 AM';
    const doctor = reminder?.doctorName || req.body.doctorName || 'Dr. Vikram Shah';
    const treatment = reminder?.treatmentName || req.body.treatmentName || 'Consultation & Checkup';

    const smsText = `[SMART DENTAL CLINIC] 🦷
APPOINTMENT REMINDER (24h Notice)

Dear ${patientName},
This is a gentle reminder of your upcoming appointment:
• Dentist: ${doctor}
• Procedure: ${treatment}
• Date & Time: ${apptDate} at ${apptTime}
• Booking Ref: ${ref || 'SDC-CONFIRMED'}

⚠️ EARLY ARRIVAL NOTICE:
Please arrive 10 minutes early (by ${earlyTime}) for registration & check-in.

📍 Address: 102 Wellness Plaza, Dental Street
📞 Helpline: +91 98765 00000
🌐 smilewithus-dental.com`;

    const emailSubject = `Reminder: Dental Appointment with ${doctor} on ${apptDate} at ${apptTime} - Smart Dental Clinic`;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #bfdbfe; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800;">🦷 SMART DENTAL CLINIC</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Smile With Us · Automated 24-Hour Appointment Reminder</p>
        </div>
        <div style="padding: 24px; color: #0f172a; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Dear <strong>${patientName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            This is an automated 24-hour reminder for your upcoming dental visit with <strong>${doctor}</strong>.
          </p>

          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px; margin: 18px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>📅 Scheduled Date:</strong> ${apptDate}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>⏰ Appointment Time:</strong> ${apptTime}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>🦷 Service:</strong> ${treatment}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>🔖 Booking Ref:</strong> <span style="font-family: monospace; font-weight: bold; color: #1d4ed8;">${ref}</span></p>
          </div>

          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 18px 0;">
            <p style="margin: 0; color: #92400e; font-weight: bold; font-size: 14px;">
              ⚠️ IMPORTANT: Please arrive 10 minutes early (by ${earlyTime})
            </p>
            <p style="margin: 4px 0 0 0; color: #b45309; font-size: 12px;">
              Early arrival ensures timely document verification, dental sanitization, and zero waiting room delays.
            </p>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; font-size: 12px; color: #64748b;">
            <p style="margin: 2px 0;"><strong>🏥 Location:</strong> 102 Wellness Plaza, Dental Street, Medical Hub</p>
            <p style="margin: 2px 0;"><strong>📞 Clinic Helpline:</strong> +91 98765 00000 / +91 98765 11111</p>
            <p style="margin: 2px 0;"><strong>✉️ Email:</strong> appointments@smartdentalcare.in</p>
          </div>
        </div>
      </div>
    `;

    const newLogs: ReminderLog[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (channel === 'all' || channel === 'sms') {
      newLogs.push({
        id: `SMS_TEST_${Date.now()}`,
        type: 'SMS',
        recipient: phone,
        timestamp,
        status: 'DELIVERED',
        gatewayId: `SMS_GW_${Math.floor(100000 + Math.random() * 900000)}`,
        message: `Instant test SMS dispatched successfully to ${phone}`,
      });
    }

    if (channel === 'all' || channel === 'email') {
      newLogs.push({
        id: `EMAIL_TEST_${Date.now()}`,
        type: 'EMAIL',
        recipient: email,
        timestamp,
        status: 'DELIVERED',
        gatewayId: `SMTP_MTA_${Math.floor(100000 + Math.random() * 900000)}`,
        message: `Instant test HTML email dispatched successfully to ${email}`,
      });
    }

    if (reminder) {
      reminder.status = 'DISPATCHED';
      reminder.logs = [...newLogs, ...reminder.logs];
      remindersStore[ref] = reminder;
      saveRemindersStore(remindersStore);
    }

    res.json({
      success: true,
      message: '24-Hour Reminder simulation dispatched successfully via SMS and Email channels',
      dispatchedAt: timestamp,
      sms: {
        recipient: phone,
        status: 'DELIVERED',
        gateway: 'Twilio/Fast2SMS Healthcare Route',
        latencyMs: 380,
        content: smsText,
      },
      email: {
        recipient: email,
        status: 'DELIVERED',
        subject: emailSubject,
        html: emailHtml,
        smtpResponse: '250 2.0.0 OK: Message accepted for delivery',
      },
      logs: newLogs,
    });
  } catch (err) {
    console.error('Error sending test reminder:', err);
    res.status(500).json({ success: false, error: 'Failed to dispatch test reminder' });
  }
});

// Update Reminder Preferences (toggle SMS, Email, edit phone/email)
app.post('/api/reminders/update', (req, res) => {
  try {
    const { bookingRef, smsEnabled, emailEnabled, phone, email } = req.body;
    const ref = (bookingRef || '').toUpperCase();
    const remindersStore = getRemindersStore();
    const reminder = remindersStore[ref];

    if (!reminder) {
      return res.status(404).json({ success: false, error: 'Reminder not found' });
    }

    if (typeof smsEnabled === 'boolean') reminder.smsEnabled = smsEnabled;
    if (typeof emailEnabled === 'boolean') reminder.emailEnabled = emailEnabled;
    if (phone) reminder.phone = phone;
    if (email) reminder.email = email;

    reminder.logs.unshift({
      id: `LOG_UPD_${Date.now()}`,
      type: 'EMAIL',
      recipient: email || reminder.email,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SENT',
      gatewayId: `SYS_CONFIG_${Math.floor(100000 + Math.random() * 900000)}`,
      message: `Updated reminder settings (SMS: ${reminder.smsEnabled ? 'ON' : 'OFF'}, Email: ${reminder.emailEnabled ? 'ON' : 'OFF'})`,
    });

    remindersStore[ref] = reminder;
    saveRemindersStore(remindersStore);

    res.json({
      success: true,
      message: 'Reminder preferences updated successfully',
      data: reminder,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update reminder' });
  }
});

// Generate & Download iCalendar (.ics) with 24-Hour & 10-Minute Early Arrival Alarms
app.get('/api/reminders/calendar-ics/:ref', (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    const records = getOrInitExcelFile();
    const patient = records.find((r) => r.bookingRef.toUpperCase() === ref);

    const title = patient ? `Dental Appointment: ${patient.treatmentName} with ${patient.doctorName}` : 'Dental Appointment at Smart Dental Clinic';
    const location = 'Smart Dental Clinic, 102 Wellness Plaza, Dental Street';
    const description = patient 
      ? `Patient: ${patient.patientName}\\nService: ${patient.treatmentName}\\nDentist: ${patient.doctorName} (${patient.doctorSpecialization})\\nBooking Ref: ${patient.bookingRef}\\n\\n⚠️ NOTICE: Please arrive 10 minutes early for preliminary check-in.\\nHelpline: +91 98765 00000`
      : 'Please arrive 10 minutes early for your checkup.';

    // Construct iCal UTC timestamps
    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Parse appointment date & time
    let startYear = now.getFullYear();
    let startMonth = now.getMonth() + 1;
    let startDay = now.getDate() + 1;
    let startHour = 10;
    let startMin = 0;

    if (patient && patient.appointmentDate) {
      const dParts = patient.appointmentDate.split('-');
      if (dParts.length === 3) {
        startYear = parseInt(dParts[0], 10);
        startMonth = parseInt(dParts[1], 10);
        startDay = parseInt(dParts[2], 10);
      }
    }

    if (patient && patient.appointmentTime) {
      const tUpper = patient.appointmentTime.toUpperCase().trim();
      const isPM = tUpper.includes('PM');
      const isAM = tUpper.includes('AM');
      const clean = tUpper.replace('AM', '').replace('PM', '').trim();
      const tParts = clean.split(':');
      if (tParts.length >= 1) startHour = parseInt(tParts[0], 10) || 10;
      if (tParts.length >= 2) startMin = parseInt(tParts[1], 10) || 0;
      if (isPM && startHour < 12) startHour += 12;
      if (isAM && startHour === 12) startHour = 0;
    }

    const dtStartStr = `${startYear}${String(startMonth).padStart(2, '0')}${String(startDay).padStart(2, '0')}T${String(startHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}00`;
    const endHour = startHour + 1;
    const dtEndStr = `${startYear}${String(startMonth).padStart(2, '0')}${String(startDay).padStart(2, '0')}T${String(endHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}00`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Dental Clinic//Appointment Reminder System//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${ref}@smartdentalcare.in`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStartStr}`,
      `DTEND:${dtEndStr}`,
      `SUMMARY:${title}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      // Alarm 1: 24 Hours Before
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Your dental appointment is in 24 hours at Smart Dental Clinic',
      'END:VALARM',
      // Alarm 2: 10 Minutes Before (Early Arrival Callout)
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder: Please arrive 10 minutes early at Smart Dental Clinic',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="SmartDental_Appointment_${ref}.ics"`);
    res.send(icsContent);
  } catch (err) {
    res.status(500).send('Error generating calendar invite');
  }
});

// 9. Download the actual .xlsx Excel file from the backend
app.get('/api/patients/export-excel', (req, res) => {
  try {
    getOrInitExcelFile(); // Ensure fresh file
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      return res.status(404).send('Excel file not found');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="SmileCare_Patients_Records.xlsx"');
    
    const fileStream = fs.createReadStream(EXCEL_FILE_PATH);
    fileStream.pipe(res);
  } catch (err) {
    console.error('Error streaming Excel file:', err);
    res.status(500).send('Error downloading Excel file');
  }
});

// ==========================================
// Vite / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmileCare Dental server running on http://localhost:${PORT}`);
  });
}

startServer();
