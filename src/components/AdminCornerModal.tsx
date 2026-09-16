import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  KeyRound,
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  RefreshCw,
  Save,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
  DollarSign,
  FileText,
  RotateCcw,
  CheckCircle2,
  Search,
  Sliders,
  Award,
  Star,
  Layers,
  Calendar,
  Sun,
  Coffee,
  ToggleLeft,
  ToggleRight,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Navigation,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MessageSquare,
  CreditCard,
  QrCode,
  BarChart3,
} from 'lucide-react';
import {
  Treatment,
  Doctor,
  ClinicTimings,
  DaySchedule,
  BreakTime,
  ClinicProfile,
  DEFAULT_CLINIC_PROFILE,
  ClinicBranch,
  DEFAULT_BRANCHES,
} from '../types';
import { AiClinicInsightsView } from './AiClinicInsightsView';
import { AdminSummaryDashboard } from './AdminSummaryDashboard';
import {
  getCachedClinicProfile,
  saveCachedClinicProfile,
  getCachedBranches,
  saveCachedBranches,
  getCachedTreatments,
  saveCachedTreatments,
  getCachedDoctors,
  saveCachedDoctors,
  getCachedTimings,
  saveCachedTimings,
} from '../utils/offlineEngine';

const formatSlotTime = (t: string): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

interface AdminCornerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated?: () => void;
  clinicProfile?: ClinicProfile;
  onClinicProfileUpdated?: (profile: ClinicProfile) => void;
}

interface AdminLog {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  details: string;
}

export const AdminCornerModal: React.FC<AdminCornerModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
  clinicProfile: initialClinicProfile = DEFAULT_CLINIC_PROFILE,
  onClinicProfileUpdated,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Active Tab: Defaults to 'dashboard' for instant visual analytics
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'branches' | 'treatments' | 'doctors' | 'timings' | 'settings' | 'ai_insights'>('dashboard');

  // Clinic Branches Management State
  const [branches, setBranches] = useState<ClinicBranch[]>(DEFAULT_BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(DEFAULT_BRANCHES[0]?.id || 'branch-1');
  const [branchForm, setBranchForm] = useState<Partial<ClinicBranch>>(DEFAULT_BRANCHES[0] || {});
  const [isSavingBranch, setIsSavingBranch] = useState<boolean>(false);
  const [branchSaveSuccess, setBranchSaveSuccess] = useState<boolean>(false);
  const [branchError, setBranchError] = useState<string>('');
  const [isAddingBranch, setIsAddingBranch] = useState<boolean>(false);

  // Clinic Profile State (Address, Mobile, Email, etc.)
  const [clinicProfile, setClinicProfile] = useState<ClinicProfile>(initialClinicProfile);
  const [profileForm, setProfileForm] = useState<ClinicProfile>(initialClinicProfile);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>('');

  // Timings & Operating Hours State
  const [timings, setTimings] = useState<ClinicTimings>({
    storeName: 'Smart Dental Clinic',
    announcement: 'Open Monday – Saturday · Walk-ins & scheduled visits welcome',
    slotDurationMinutes: 30,
    schedules: {
      weekdays: { day: 'Monday – Friday', isOpen: true, openTime: '09:00 AM', closeTime: '08:00 PM' },
      saturday: { day: 'Saturday', isOpen: true, openTime: '09:00 AM', closeTime: '06:00 PM' },
      sunday: { day: 'Sunday', isOpen: false, openTime: '10:00 AM', closeTime: '02:00 PM' },
    },
    breakTime: { enabled: true, name: 'Lunch & Sanitization Break', startTime: '01:30 PM', endTime: '02:30 PM' },
    activeSlots: [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
    ],
    disabledSlots: [],
  });
  const [newSlotInput, setNewSlotInput] = useState<string>('');
  const [newSlotError, setNewSlotError] = useState<string>('');
  const [isSavingTimings, setIsSavingTimings] = useState<boolean>(false);

  // Treatments Management State
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState<string>('');
  const [editingTreatmentId, setEditingTreatmentId] = useState<string | null>(null);
  const [treatmentForm, setTreatmentForm] = useState<Partial<Treatment>>({});
  const [isAddingTreatment, setIsAddingTreatment] = useState<boolean>(false);
  const [newTreatment, setNewTreatment] = useState<Partial<Treatment>>({
    icon: '🦷',
    name: '',
    desc: '',
    dur: '30 min',
    price: '₹500 – ₹1,200',
    cat: 'general',
  });

  // Doctors Management State
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState<string>('');
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [doctorForm, setDoctorForm] = useState<Partial<Doctor>>({});
  const [isAddingDoctor, setIsAddingDoctor] = useState<boolean>(false);
  const [newDoctor, setNewDoctor] = useState<Partial<Doctor>>({
    name: '',
    spec: 'General Dental Surgeon',
    qualifications: 'BDS, Dental Surgery',
    experience: '10 yrs experience',
    rating: 4.9,
    reviewsCount: 250,
    avatarBg: '#f0faf5',
    avatarIcon: '👨‍⚕️',
  });

  // Server Admin Status & History
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [changeLogs, setChangeLogs] = useState<AdminLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Delete & Reset in-modal Confirmation Target
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'treatment' | 'doctor' | 'slot' | 'reset-defaults' | 'reset-timings' | 'branch' | 'reset-branches';
    id?: string;
    name: string;
  } | null>(null);

  // Fetch live server treatments, doctors, timings, clinic profile, branches, and logs
  const fetchAllAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [treatRes, docRes, statusRes, timingsRes, profileRes, branchRes] = await Promise.all([
        fetch('/api/treatments'),
        fetch('/api/doctors'),
        fetch('/api/admin/status'),
        fetch('/api/clinic-timings'),
        fetch('/api/clinic-profile'),
        fetch('/api/branches'),
      ]);

      if (treatRes.ok) {
        const treatData = await treatRes.json();
        if (treatData.data) {
          setTreatments(treatData.data);
          saveCachedTreatments(treatData.data);
        }
      }

      if (docRes.ok) {
        const docData = await docRes.json();
        if (docData.data) {
          setDoctors(docData.data);
          saveCachedDoctors(docData.data);
        }
      }

      if (timingsRes.ok) {
        const timingsData = await timingsRes.json();
        if (timingsData.data) {
          setTimings(timingsData.data);
          saveCachedTimings(timingsData.data);
        }
      }

      if (profileRes.ok) {
        const pData = await profileRes.json();
        if (pData.data) {
          setClinicProfile(pData.data);
          setProfileForm(pData.data);
          saveCachedClinicProfile(pData.data);
          if (onClinicProfileUpdated) onClinicProfileUpdated(pData.data);
        }
      }

      if (branchRes.ok) {
        const bData = await branchRes.json();
        if (Array.isArray(bData.data) && bData.data.length > 0) {
          setBranches(bData.data);
          saveCachedBranches(bData.data);
          setSelectedBranchId((prevId) => {
            const exists = bData.data.some((b: ClinicBranch) => b.id === prevId);
            const targetId = exists ? prevId : bData.data[0].id;
            const targetBranch = bData.data.find((b: ClinicBranch) => b.id === targetId) || bData.data[0];
            setBranchForm({ ...targetBranch });
            return targetId;
          });
        }
      }

      if (statusRes.ok) {
        const statData = await statusRes.json();
        if (statData.admin) {
          setLastUpdated(statData.admin.lastUpdated || '');
          if (Array.isArray(statData.admin.changeLog)) {
            setChangeLogs(statData.admin.changeLog);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load live admin data, falling back to local cache:', err);
      // Offline fallback
      setTreatments(getCachedTreatments());
      setDoctors(getCachedDoctors());
      setBranches(getCachedBranches());
      const cProfile = getCachedClinicProfile();
      setClinicProfile(cProfile);
      setProfileForm(cProfile);
      const cTimings = getCachedTimings();
      if (cTimings) setTimings(cTimings);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profileForm.name.trim()) {
      setProfileError('Clinic name cannot be empty.');
      return;
    }
    if (!profileForm.phone.trim()) {
      setProfileError('Helpline / Mobile number is required.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError('');
    setProfileSaveSuccess(false);

    try {
      const res = await fetch('/api/clinic-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setClinicProfile(data.data);
        setProfileForm(data.data);
        setProfileSaveSuccess(true);
        triggerFeedback('Clinic profile, address & mobile number updated permanently!');
        if (onClinicProfileUpdated) onClinicProfileUpdated(data.data);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      } else {
        setProfileError(data.error || 'Failed to save clinic profile');
      }
    } catch (err) {
      console.error('Failed to save clinic profile:', err);
      setProfileError('Network error saving profile to server.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfileDefaults = async () => {
    setIsSavingProfile(true);
    setProfileError('');
    setProfileSaveSuccess(false);

    try {
      const res = await fetch('/api/clinic-profile/reset-defaults', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data) {
        setClinicProfile(data.data);
        setProfileForm(data.data);
        setProfileSaveSuccess(true);
        triggerFeedback('Clinic profile reset to factory defaults.');
        if (onClinicProfileUpdated) onClinicProfileUpdated(data.data);
        setTimeout(() => setProfileSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to reset profile:', err);
      setProfileError('Failed to reset clinic profile defaults.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Branch Selection & Edit Handlers
  const handleSelectBranchToEdit = (branchId: string) => {
    setSelectedBranchId(branchId);
    const found = branches.find((b) => b.id === branchId);
    if (found) {
      setBranchForm({ ...found });
      setBranchError('');
      setBranchSaveSuccess(false);
      setIsAddingBranch(false);
    }
  };

  const handleStartAddNewBranch = () => {
    setIsAddingBranch(true);
    const newId = `branch-${Date.now()}`;
    const freshBranch: Partial<ClinicBranch> = {
      id: newId,
      name: 'Smart Dental Clinic – New Branch Location',
      shortName: 'New Branch',
      address: '',
      areaCityPincode: 'Central City - 400001',
      phone: '+91 98765 00000',
      emergencyPhone: '+91 98765 00000',
      email: 'care@smartdentalclinic.com',
      landmark: 'Near City Centre',
      timings: 'Mon – Sat: 9:00 AM – 8:00 PM',
      isMain: false,
      isActive: true,
    };
    setSelectedBranchId(newId);
    setBranchForm(freshBranch);
    setBranchError('');
    setBranchSaveSuccess(false);
  };

  const handleSaveBranch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!branchForm.name?.trim()) {
      setBranchError('Branch full name is required.');
      return;
    }
    if (!branchForm.address?.trim()) {
      setBranchError('Branch street address is required.');
      return;
    }
    if (!branchForm.phone?.trim()) {
      setBranchError('Branch helpline phone number is required.');
      return;
    }

    setIsSavingBranch(true);
    setBranchError('');
    setBranchSaveSuccess(false);

    try {
      const payload: ClinicBranch = {
        id: branchForm.id || `branch-${Date.now()}`,
        name: branchForm.name.trim(),
        shortName: branchForm.shortName?.trim() || branchForm.name.split('–')[1]?.trim() || branchForm.name.trim(),
        address: branchForm.address.trim(),
        areaCityPincode: branchForm.areaCityPincode?.trim() || '',
        phone: branchForm.phone.trim(),
        emergencyPhone: branchForm.emergencyPhone?.trim() || branchForm.phone.trim(),
        email: branchForm.email?.trim() || '',
        landmark: branchForm.landmark?.trim() || '',
        timings: branchForm.timings?.trim() || 'Mon – Sat: 9:00 AM – 8:00 PM',
        isMain: Boolean(branchForm.isMain),
        isActive: branchForm.isActive !== false,
      };

      const res = await fetch('/api/branches/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBranches(data.data);
        setSelectedBranchId(payload.id);
        const saved = data.data.find((b: ClinicBranch) => b.id === payload.id) || payload;
        setBranchForm({ ...saved });
        setBranchSaveSuccess(true);
        setIsAddingBranch(false);
        triggerFeedback(`✅ Saved branch "${payload.shortName || payload.name}" successfully!`);
        if (onDataUpdated) onDataUpdated();
        setTimeout(() => setBranchSaveSuccess(false), 4000);
      } else {
        setBranchError(data.error || 'Failed to save branch to server.');
      }
    } catch (err) {
      console.error('Failed to save branch:', err);
      setBranchError('Network error while saving branch details.');
    } finally {
      setIsSavingBranch(false);
    }
  };

  const promptDeleteBranch = (id: string, name: string) => {
    if (branches.length <= 1) {
      setErrorMessage('Cannot delete the only branch. The clinic must retain at least one operational branch.');
      return;
    }
    setDeleteTarget({ type: 'branch', id, name });
  };

  const promptResetBranches = () => {
    setDeleteTarget({ type: 'reset-branches', name: 'All Clinic Branches' });
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllAdminData();
      // Auto unlock for smooth testing, or verify on demand
    }
  }, [isOpen]);

  // Handle PIN Unlock
  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPinError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();

      if (data.valid) {
        setIsAuthenticated(true);
        setPinError('');
      } else {
        setPinError('Invalid PIN code. Default PIN is 1234');
      }
    } catch (err) {
      // Fallback
      if (pinInput === '1234' || pinInput === '') {
        setIsAuthenticated(true);
      } else {
        setPinError('Unable to verify PIN with server');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickUnlock = () => {
    setIsAuthenticated(true);
  };

  const triggerFeedback = (msg: string) => {
    setSaveSuccessMsg(msg);
    if (onDataUpdated) onDataUpdated();
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // ==========================================
  // TREATMENTS ACTIONS
  // ==========================================

  const startEditTreatment = (treatment: Treatment) => {
    setEditingTreatmentId(treatment.id);
    setTreatmentForm({ ...treatment });
  };

  const cancelEditTreatment = () => {
    setEditingTreatmentId(null);
    setTreatmentForm({});
  };

  const handleSaveSingleTreatment = async (id: string) => {
    if (!treatmentForm.name || !treatmentForm.price) {
      setErrorMessage('Treatment name and price are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const updatedList = treatments.map((t) =>
        t.id === id ? ({ ...t, ...treatmentForm } as Treatment) : t
      );

      const res = await fetch('/api/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treatments: updatedList,
          updatedBy: 'Admin Corner',
        }),
      });

      if (res.ok) {
        setTreatments(updatedList);
        setEditingTreatmentId(null);
        setTreatmentForm({});
        triggerFeedback('✅ Treatment price & details saved permanently to clinic database!');
        fetchAllAdminData();
      } else {
        setErrorMessage('Failed to save treatment to server.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving treatment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTreatment = async () => {
    if (!newTreatment.name || !newTreatment.price) {
      setErrorMessage('Please provide both treatment name and price.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/treatments/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTreatment),
      });

      if (res.ok) {
        const data = await res.json();
        setTreatments((prev) => [...prev, data.data]);
        setIsAddingTreatment(false);
        setNewTreatment({
          icon: '🦷',
          name: '',
          desc: '',
          dur: '30 min',
          price: '₹500 – ₹1,200',
          cat: 'general',
        });
        triggerFeedback(`✅ Added "${data.data.name}" at price ${data.data.price}`);
        fetchAllAdminData();
      } else {
        setErrorMessage('Failed to add new treatment.');
      }
    } catch (err) {
      setErrorMessage('Error communicating with server.');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDeleteTreatment = (id: string, name: string) => {
    setDeleteTarget({ type: 'treatment', id, name });
  };

  // ==========================================
  // DOCTORS ACTIONS
  // ==========================================

  const startEditDoctor = (doc: Doctor) => {
    setEditingDoctorId(doc.id);
    setDoctorForm({ ...doc });
  };

  const cancelEditDoctor = () => {
    setEditingDoctorId(null);
    setDoctorForm({});
  };

  const handleSaveSingleDoctor = async (id: string) => {
    if (!doctorForm.name) {
      setErrorMessage('Doctor name cannot be blank.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const updatedList = doctors.map((d) =>
        d.id === id ? ({ ...d, ...doctorForm } as Doctor) : d
      );

      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctors: updatedList,
          updatedBy: 'Admin Corner',
        }),
      });

      if (res.ok) {
        setDoctors(updatedList);
        setEditingDoctorId(null);
        setDoctorForm({});
        triggerFeedback('✅ Doctor name & profile saved permanently to clinic database!');
        fetchAllAdminData();
      } else {
        setErrorMessage('Failed to save doctor changes to server.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving doctor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateDoctor = async () => {
    if (!newDoctor.name) {
      setErrorMessage('Please enter the doctor name.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/doctors/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoctor),
      });

      if (res.ok) {
        const data = await res.json();
        setDoctors((prev) => [...prev, data.data]);
        setIsAddingDoctor(false);
        setNewDoctor({
          name: '',
          spec: 'General Dental Surgeon',
          qualifications: 'BDS, Dental Surgery',
          experience: '10 yrs experience',
          rating: 4.9,
          reviewsCount: 250,
          avatarBg: '#f0faf5',
          avatarIcon: '👨‍⚕️',
        });
        triggerFeedback(`✅ Added doctor "${data.data.name}" to directory.`);
        fetchAllAdminData();
      } else {
        setErrorMessage('Failed to add new doctor.');
      }
    } catch (err) {
      setErrorMessage('Error communicating with server.');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDeleteDoctor = (id: string, name: string) => {
    setDeleteTarget({ type: 'doctor', id, name });
  };

  // Timings & Operating Hours Handlers
  const handleSaveTimings = async () => {
    setIsSavingTimings(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/clinic-timings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(timings),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) setTimings(data.data);
        triggerFeedback('🕒 Clinic operating hours & store settings saved successfully!');
        if (onDataUpdated) onDataUpdated();
        fetchAllAdminData();
      } else {
        setErrorMessage('Failed to save clinic timings to server.');
      }
    } catch (err) {
      setErrorMessage('Network error while saving clinic timings.');
    } finally {
      setIsSavingTimings(false);
    }
  };

  const handleAddSlot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setNewSlotError('');
    const slot = newSlotInput.trim();

    if (!slot) {
      setNewSlotError('Please enter a time slot (e.g. 08:30 or 18:30)');
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(slot)) {
      setNewSlotError('Format must be HH:mm (24-hour, e.g. 08:30 or 19:00)');
      return;
    }

    const [h, m] = slot.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      setNewSlotError('Please enter a valid time (00:00 to 23:59)');
      return;
    }

    if (timings.activeSlots.includes(slot)) {
      setNewSlotError(`Slot ${formatSlotTime(slot)} already exists in the schedule`);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/clinic-timings/slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) setTimings(data.data);
        setNewSlotInput('');
        triggerFeedback(`✅ Added new appointment slot ${formatSlotTime(slot)} (${slot}).`);
        if (onDataUpdated) onDataUpdated();
        fetchAllAdminData();
      } else {
        const data = await res.json();
        setNewSlotError(data.error || 'Failed to add appointment slot.');
      }
    } catch (err) {
      setNewSlotError('Error connecting to server.');
    } finally {
      setIsSaving(false);
    }
  };

  const promptDeleteSlot = (slot: string) => {
    setDeleteTarget({
      type: 'slot',
      id: slot,
      name: `${formatSlotTime(slot)} (${slot})`,
    });
  };

  const handleToggleSlot = async (slot: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/clinic-timings/toggle-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data) setTimings(data.data);
        const isDisabled = (data.data.disabledSlots || []).includes(slot);
        triggerFeedback(isDisabled ? `⏸️ Paused slot ${formatSlotTime(slot)}.` : `▶️ Enabled slot ${formatSlotTime(slot)}.`);
        if (onDataUpdated) onDataUpdated();
      } else {
        setErrorMessage('Failed to toggle slot state.');
      }
    } catch (err) {
      setErrorMessage('Network error toggling slot.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplySlotPreset = (presetType: 'standard' | 'extended' | 'morning' | 'evening') => {
    let presetSlots: string[] = [];
    if (presetType === 'standard') {
      // 09:00 to 18:00
      presetSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
      ];
    } else if (presetType === 'extended') {
      // 09:00 to 20:00
      presetSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00'
      ];
    } else if (presetType === 'morning') {
      // 09:00 to 14:00
      presetSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00'
      ];
    } else if (presetType === 'evening') {
      // 15:00 to 21:00
      presetSlots = [
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'
      ];
    }

    setTimings((prev) => ({
      ...prev,
      activeSlots: presetSlots,
      disabledSlots: [],
    }));
    triggerFeedback(`Applied preset with ${presetSlots.length} appointment slots. Click "Save Operating Hours" to persist.`);
  };

  const promptResetTimings = () => {
    setDeleteTarget({ type: 'reset-timings', name: 'Clinic Hours & Appointment Slots' });
  };

  // Reset to Defaults Prompt
  const promptResetDefaults = () => {
    setDeleteTarget({ type: 'reset-defaults', name: 'All Clinic Defaults' });
  };

  // Perform Executed Deletion or Reset
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      if (deleteTarget.type === 'treatment' && deleteTarget.id) {
        const id = deleteTarget.id;
        const name = deleteTarget.name;
        const res = await fetch(`/api/treatments/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setTreatments((prev) => prev.filter((t) => t.id !== id));
          if (editingTreatmentId === id) {
            setEditingTreatmentId(null);
            setTreatmentForm({});
          }
          triggerFeedback(`🗑️ Removed "${name}" from treatments catalog.`);
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to delete treatment from server.');
        }
      } else if (deleteTarget.type === 'doctor' && deleteTarget.id) {
        const id = deleteTarget.id;
        const name = deleteTarget.name;
        const res = await fetch(`/api/doctors/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setDoctors((prev) => prev.filter((d) => d.id !== id));
          if (editingDoctorId === id) {
            setEditingDoctorId(null);
            setDoctorForm({});
          }
          triggerFeedback(`🗑️ Removed "${name}" from dentist directory.`);
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to delete doctor from server.');
        }
      } else if (deleteTarget.type === 'slot' && deleteTarget.id) {
        const slot = deleteTarget.id;
        const name = deleteTarget.name;
        const res = await fetch(`/api/clinic-timings/slot/${encodeURIComponent(slot)}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setTimings((prev) => ({
            ...prev,
            activeSlots: prev.activeSlots.filter((s) => s !== slot),
            disabledSlots: (prev.disabledSlots || []).filter((s) => s !== slot),
          }));
          triggerFeedback(`🗑️ Removed appointment slot ${name}.`);
          if (onDataUpdated) onDataUpdated();
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to delete time slot from server.');
        }
      } else if (deleteTarget.type === 'reset-timings') {
        const res = await fetch('/api/clinic-timings/reset-defaults', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.data) setTimings(data.data);
          triggerFeedback('🔄 Reset store operating hours & appointment slots to defaults.');
          if (onDataUpdated) onDataUpdated();
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to reset clinic timings.');
        }
      } else if (deleteTarget.type === 'reset-defaults') {
        const res = await fetch('/api/admin/reset-defaults', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setTreatments(data.treatments);
          setDoctors(data.doctors);
          if (data.timings) setTimings(data.timings);
          setEditingTreatmentId(null);
          setEditingDoctorId(null);
          triggerFeedback('🔄 Reset all pricing, doctor directory, and store timings to defaults.');
          if (onDataUpdated) onDataUpdated();
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to reset defaults.');
        }
      } else if (deleteTarget.type === 'branch' && deleteTarget.id) {
        const id = deleteTarget.id;
        const name = deleteTarget.name;
        const res = await fetch(`/api/branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setBranches(data.data);
            const nextBranch = data.data[0];
            if (nextBranch) {
              setSelectedBranchId(nextBranch.id);
              setBranchForm({ ...nextBranch });
            }
          }
          triggerFeedback(`🗑️ Removed branch "${name}".`);
          if (onDataUpdated) onDataUpdated();
          fetchAllAdminData();
        } else {
          const data = await res.json();
          setErrorMessage(data.error || 'Failed to delete branch from server.');
        }
      } else if (deleteTarget.type === 'reset-branches') {
        const res = await fetch('/api/branches/reset-defaults', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setBranches(data.data);
            setSelectedBranchId(data.data[0].id);
            setBranchForm({ ...data.data[0] });
          }
          triggerFeedback('🔄 Reset clinic branches to standard 3 locations.');
          if (onDataUpdated) onDataUpdated();
          fetchAllAdminData();
        } else {
          setErrorMessage('Failed to reset branches to defaults.');
        }
      }
    } catch (err) {
      setErrorMessage('Network error while processing deletion.');
    } finally {
      setIsSaving(false);
      setDeleteTarget(null);
    }
  };


  if (!isOpen) return null;

  // Filtered lists
  const filteredTreatments = treatments.filter(
    (t) =>
      t.name.toLowerCase().includes(treatmentSearch.toLowerCase()) ||
      t.price.toLowerCase().includes(treatmentSearch.toLowerCase()) ||
      t.desc.toLowerCase().includes(treatmentSearch.toLowerCase())
  );

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.spec.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.experience.toLowerCase().includes(doctorSearch.toLowerCase())
  );

  return (
    <div
      id="admin-corner-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border-2 border-slate-700/20 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-3.5 sm:px-7 py-3 sm:py-4.5 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-lg text-white tracking-tight truncate">Admin Corner</h3>
                <span className="bg-blue-500/20 text-blue-300 text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.2 rounded-full border border-blue-400/30">
                  Management
                </span>
                {isAuthenticated && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.2 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Authorized
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5 hidden sm:block">
                Manage Treatment Pricing & Doctor Directory · Persisted permanently on server
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close Admin Corner"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 flex-1 overflow-y-auto bg-slate-50/50">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="max-w-md space-y-2">
              <h4 className="text-xl font-black text-slate-800">Admin Security Verification</h4>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Enter your 4-digit Clinic Admin PIN to modify prices, update doctor names, or add
                services. Once saved, changes stay effective until updated again.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="w-full max-w-xs space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="admin-pin-input"
                  type="password"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Enter PIN (Default: 1234)"
                  className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-4 py-3 text-center text-base tracking-widest font-black text-slate-800 placeholder:tracking-normal placeholder:text-xs placeholder:font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all shadow-xs"
                  autoFocus
                />
              </div>

              {pinError && (
                <div className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-1.5 text-left">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                id="btn-verify-pin"
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying...' : 'Unlock Admin Portal'}</span>
              </button>

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Default Master PIN: <span className="font-bold text-slate-600">1234</span> (configurable inside Settings)
              </p>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
            {/* Global Notification Banner */}
            {saveSuccessMsg && (
              <div className="bg-emerald-500 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveSuccessMsg('')}
                  className="text-emerald-100 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="bg-rose-500 text-white px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage('')}
                  className="text-rose-100 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Admin Tabs */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-7 pt-2 sm:pt-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  id="tab-admin-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/60 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>Summary Dashboard</span>
                  <span className="bg-blue-100 text-blue-800 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    Analytics
                  </span>
                </button>

                <button
                  id="tab-admin-profile"
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'profile'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Clinic Profile & Address</span>
                </button>

                <button
                  id="tab-admin-branches"
                  type="button"
                  onClick={() => setActiveTab('branches')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'branches'
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <MapPin className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Clinic Branches</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {branches.length}
                  </span>
                </button>

                <button
                  id="tab-admin-treatments"
                  type="button"
                  onClick={() => setActiveTab('treatments')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'treatments'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Treatments</span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {treatments.length}
                  </span>
                </button>

                <button
                  id="tab-admin-doctors"
                  type="button"
                  onClick={() => setActiveTab('doctors')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'doctors'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Doctors</span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {doctors.length}
                  </span>
                </button>

                <button
                  id="tab-admin-timings"
                  type="button"
                  onClick={() => setActiveTab('timings')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'timings'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Hours & Slots</span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {timings.activeSlots.length}
                  </span>
                </button>

                <button
                  id="tab-admin-settings"
                  type="button"
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'settings'
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  <span>Audit & Reset</span>
                </button>

                <button
                  id="tab-admin-ai-insights"
                  type="button"
                  onClick={() => setActiveTab('ai_insights')}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-extrabold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'ai_insights'
                      ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60 rounded-t-lg'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-600 animate-pulse" />
                  <span>AI Clinic Insights</span>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    Gemini
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchAllAdminData}
                  disabled={isLoadingData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Reload from server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: SUMMARY DASHBOARD & ANALYTICS */}
            {activeTab === 'dashboard' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                <AdminSummaryDashboard
                  treatments={treatments}
                  branches={branches}
                  onNavigateToTreatments={() => setActiveTab('treatments')}
                />
              </div>
            )}

            {/* TAB CONTENT 0: CLINIC PROFILE & CONTACTS */}
            {activeTab === 'profile' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-blue-100 font-bold text-xs mb-2">
                      <Building2 className="w-3.5 h-3.5 text-blue-200" />
                      <span>Clinic Identity, Address & Communications</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      Edit Clinic Profile, Mobile & Address
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100/90 mt-1 leading-relaxed">
                      Customise clinic address, primary helpline, emergency mobile numbers, official email, and clinical accreditation. Changes sync live across the top navigation bar, printable appointment slips, and WhatsApp confirmations.
                    </p>
                  </div>
                  <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none hidden md:block">
                    <Building2 className="w-48 h-48" />
                  </div>
                </div>

                {/* Profile Success / Error Alerts */}
                {profileSaveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clinic profile, address and contact details saved permanently to server disk.</span>
                  </div>
                )}

                {profileError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-800 font-bold animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Form Fields (7 cols) */}
                  <form onSubmit={handleSaveProfile} className="lg:col-span-7 space-y-4">
                    {/* 1. Clinic Branding */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          1. Clinic Identity & Branding
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Clinic Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            placeholder="e.g. Smart Dental Clinic"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tagline / Subtitle
                          </label>
                          <input
                            type="text"
                            value={profileForm.tagline}
                            onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                            placeholder="e.g. Center for Advanced Dental Care, Orthodontics & Implantology"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Contact Numbers & Digital Channels */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          2. Mobile Numbers & Helpline
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Primary Mobile / Helpline <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              placeholder="e.g. +91 98765 00000"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                              required
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Shown in header, appointments, WhatsApp</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            24/7 Emergency Mobile
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profileForm.emergencyPhone}
                              onChange={(e) => setProfileForm({ ...profileForm, emergencyPhone: e.target.value })}
                              placeholder="e.g. +91 98765 00000"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Printed on patient vouchers</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Clinic Email Address
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              value={profileForm.email}
                              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                              placeholder="e.g. care@smartdentalclinic.com"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Official Website URL
                          </label>
                          <div className="relative">
                            <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profileForm.website}
                              onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                              placeholder="e.g. www.smartdentalclinic.com"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Physical Address & Location */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <MapPin className="w-4 h-4 text-rose-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          3. Physical Address & Directions
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Street Address / Suite / Building <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={profileForm.address}
                            onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                            placeholder="e.g. 102 Wellness Plaza, Dental Street"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              City, State & Pincode
                            </label>
                            <input
                              type="text"
                              value={profileForm.areaCityPincode}
                              onChange={(e) => setProfileForm({ ...profileForm, areaCityPincode: e.target.value })}
                              placeholder="e.g. Medical Hub, Central City - 400001"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Nearby Landmark / Metro
                            </label>
                            <input
                              type="text"
                              value={profileForm.landmark}
                              onChange={(e) => setProfileForm({ ...profileForm, landmark: e.target.value })}
                              placeholder="e.g. Opposite City Metro Station"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Accreditation & Legal Registration */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Award className="w-4 h-4 text-amber-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          4. Accreditation & Registration
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Clinical License / Reg. No.
                          </label>
                          <input
                            type="text"
                            value={profileForm.registrationNumber}
                            onChange={(e) => setProfileForm({ ...profileForm, registrationNumber: e.target.value })}
                            placeholder="e.g. SDC/MED/2026/0419"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Accreditation & Standards
                          </label>
                          <input
                            type="text"
                            value={profileForm.accreditation}
                            onChange={(e) => setProfileForm({ ...profileForm, accreditation: e.target.value })}
                            placeholder="e.g. ISO 9001:2015 & NABH Certified Facility"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. Clinic UPI ID & Payment Configuration */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                            5. Clinic UPI ID & Payment Gateway
                          </h4>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <QrCode className="w-3 h-3" />
                          <span>Direct UPI Payments</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Clinic Official UPI ID (VPA) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={profileForm.clinicUpiId || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, clinicUpiId: e.target.value })}
                            placeholder="e.g. smartdental@okhdfcbank"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Directs patient payments from GPay, PhonePe, Paytm, and BHIM straight to your clinic account.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Merchant / Payee Name
                          </label>
                          <input
                            type="text"
                            value={profileForm.clinicPayeeName || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, clinicPayeeName: e.target.value })}
                            placeholder="e.g. Smart Dental Clinic"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">
                            Payee name shown on patient's UPI app payment confirmation screen.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleResetProfileDefaults}
                        disabled={isSavingProfile}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                        title="Reset address and mobile to default settings"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Defaults</span>
                      </button>

                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSavingProfile ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Clinic Details</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Right Column: Live Previews (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="sticky top-4 space-y-4">
                      {/* Header Bar Live Preview */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            Live Header Helpline Preview
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                            Patient View
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                          <div className="font-black text-sm text-blue-900 truncate">
                            {profileForm.name || 'Smart Dental Clinic'}
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-bold shrink-0">
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>{profileForm.phone || '+91 98765 00000'}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp Confirmation Preview */}
                      <div className="bg-[#0b141a] text-white rounded-xl p-4 space-y-2 shadow-xs font-sans">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                            <Send className="w-3 h-3" />
                            <span>WhatsApp Confirmation Message Preview</span>
                          </div>
                        </div>
                        <div className="bg-[#1f2c34] p-3 rounded-lg text-[11px] space-y-1.5 text-slate-200 leading-relaxed font-mono">
                          <div className="font-bold text-emerald-400">
                            🦷 {profileForm.name.toUpperCase() || 'SMART DENTAL CLINIC'}
                          </div>
                          <div className="text-[10px] text-slate-400">Official Appointment Confirmation & Receipt</div>
                          <div className="text-slate-300">━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                          <div className="text-slate-300">
                            🏥 <strong className="text-white">CLINIC LOCATION:</strong><br />
                            {profileForm.name || 'Smart Dental Clinic'}<br />
                            {profileForm.address || '102 Wellness Plaza, Dental Street'}<br />
                            {profileForm.areaCityPincode && <span>{profileForm.areaCityPincode}<br /></span>}
                            📞 Helpline: {profileForm.phone || '+91 98765 00000'}
                          </div>
                          <div className="text-slate-300 text-[10px] pt-1">
                            Emergency: {profileForm.emergencyPhone || '+91 98765 00000'}
                          </div>
                        </div>
                      </div>

                      {/* Printable Slip Preview Card */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                            Printable Slip Header & Seal
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                            PDF Slip
                          </span>
                        </div>
                        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="font-black text-sm text-blue-900 leading-tight">
                                {profileForm.name || 'Smart Dental Clinic'}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {profileForm.address}, {profileForm.areaCityPincode}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Tel: {profileForm.phone} · Emg: {profileForm.emergencyPhone}
                              </div>
                            </div>
                            <div className="text-[9px] font-mono font-bold bg-slate-200 px-2 py-0.5 rounded text-slate-700 shrink-0">
                              {profileForm.registrationNumber}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                            <span>{profileForm.accreditation}</span>
                            <span className="text-emerald-700 font-extrabold">★ OFFICIAL SEAL ★</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: CLINIC BRANCHES (SELECT & EDIT) */}
            {activeTab === 'branches' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                  <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-emerald-100 font-bold text-xs mb-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Branch Network & Facility Administration</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                      Select & Edit Clinic Branches
                    </h3>
                    <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 leading-relaxed">
                      Select any clinic branch location to update its street address, helpline mobile number, email, landmark directions, operating hours, or active status. Changes update real-time across patient scheduling, WhatsApp receipts, and official slips.
                    </p>
                  </div>
                  <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none hidden md:block">
                    <Building2 className="w-48 h-48" />
                  </div>
                </div>

                {/* Success / Error Alerts */}
                {branchSaveSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clinic branch details saved permanently to server database and synced across appointments!</span>
                  </div>
                )}

                {branchError && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-rose-800 font-bold animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{branchError}</span>
                  </div>
                )}

                {/* Branch Selector Bar (Dropdown + Quick Cards + Add Branch Button) */}
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Select Clinic Branch to Edit
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Choose which clinic branch location you want to inspect or modify:
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-admin-add-branch"
                        onClick={handleStartAddNewBranch}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Branch</span>
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-8">
                      <label htmlFor="admin-branch-select-dropdown" className="block text-xs font-bold text-slate-700 mb-1">
                        Choose Branch from Dropdown:
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          id="admin-branch-select-dropdown"
                          value={selectedBranchId}
                          onChange={(e) => handleSelectBranchToEdit(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-300 hover:border-emerald-500 rounded-xl pl-9 pr-8 py-2.5 text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white cursor-pointer transition-colors"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} {b.isMain ? '★ (Main HQ)' : ''} — {b.shortName} ({b.phone})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xs">
                        {branches.length}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <span className="font-bold text-slate-800 block truncate">Registered Branches</span>
                        <span className="text-[11px] text-slate-500">
                          {branches.filter((b) => b.isActive).length} active for patient booking
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Select Branch Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {branches.map((b) => {
                      const isSelected = selectedBranchId === b.id && !isAddingBranch;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          id={`btn-select-branch-${b.id}`}
                          onClick={() => handleSelectBranchToEdit(b.id)}
                          className={`text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                              <span className="font-black text-xs text-slate-900 truncate max-w-[170px]">
                                {b.shortName || b.name}
                              </span>
                              <div className="flex items-center gap-1">
                                {b.isMain && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded-full border border-amber-300 shrink-0">
                                    ★ Main
                                  </span>
                                )}
                                {b.isActive ? (
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                    Active
                                  </span>
                                ) : (
                                  <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                    Paused
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{b.address}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{b.phone}</span>
                            </p>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                            <span className={isSelected ? 'text-emerald-700 font-extrabold' : 'text-slate-400'}>
                              {isSelected ? '✓ Currently Selected' : 'Click to Edit'}
                            </span>
                            <span className="text-slate-400">{b.timings?.split('·')[0] || 'Open Mon-Sat'}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Branch Form & Live Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: Editable Branch Form (7 cols) */}
                  <form onSubmit={handleSaveBranch} className="lg:col-span-7 space-y-4">
                    {/* Active Branch Header */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                            {isAddingBranch ? 'Create New Branch' : `Edit Branch: ${branchForm.shortName || branchForm.name}`}
                          </h4>
                        </div>
                        {branchForm.isMain && (
                          <span className="bg-amber-500/10 text-amber-700 border border-amber-300/40 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            ★ Primary / Flagship Clinic
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Full Branch Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={branchForm.name || ''}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            placeholder="e.g. Smart Dental Clinic – Downtown Central"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            required
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Appears on confirmation receipts and patient slips</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Short Tag / Location Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={branchForm.shortName || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, shortName: e.target.value })}
                              placeholder="e.g. Downtown Central"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                              required
                            />
                            <p className="text-[10px] text-slate-400 mt-0.5">Used in tabs, pills, and dropdowns</p>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Branch ID / Code
                            </label>
                            <input
                              type="text"
                              value={branchForm.id || ''}
                              disabled
                              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Street Address & Location */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          Address & Proximity
                        </h4>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Full Street Address <span className="text-rose-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={branchForm.address || ''}
                            onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                            placeholder="e.g. 102 Wellness Plaza, Dental Street"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Area, City & Pincode
                            </label>
                            <input
                              type="text"
                              value={branchForm.areaCityPincode || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, areaCityPincode: e.target.value })}
                              placeholder="e.g. Medical Hub, Central City - 400001"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Nearby Landmark / Metro
                            </label>
                            <input
                              type="text"
                              value={branchForm.landmark || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, landmark: e.target.value })}
                              placeholder="e.g. Opposite City Metro Station Gate 2"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact & Hours */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3.5 shadow-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                          Branch Direct Contact & Timings
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Branch Phone / Helpline <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={branchForm.phone || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                              placeholder="e.g. +91 98765 00000"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Emergency Mobile
                          </label>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={branchForm.emergencyPhone || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, emergencyPhone: e.target.value })}
                              placeholder="e.g. +91 98765 00000"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Branch Email
                          </label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              value={branchForm.email || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                              placeholder="e.g. downtown@smartdentalclinic.com"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Operating Hours Display
                          </label>
                          <div className="relative">
                            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={branchForm.timings || ''}
                              onChange={(e) => setBranchForm({ ...branchForm, timings: e.target.value })}
                              placeholder="e.g. Mon – Sat: 9:00 AM – 8:00 PM"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Branch Settings (Main HQ & Active Status) */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3 shadow-xs">
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100">
                        Branch Preferences & Status
                      </h4>

                      <div className="space-y-2.5">
                        <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={Boolean(branchForm.isMain)}
                            onChange={(e) => setBranchForm({ ...branchForm, isMain: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-black text-slate-800 block">Set as Primary / Flagship Clinic Branch</span>
                            <span className="text-slate-500 text-[11px]">
                              Selected by default for new patients when opening booking portal.
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={branchForm.isActive !== false}
                            onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                          />
                          <div className="text-xs">
                            <span className="font-black text-slate-800 block">Active for Online Appointments</span>
                            <span className="text-slate-500 text-[11px]">
                              Uncheck to temporarily pause bookings for this location (renovations, maintenance).
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                      {!isAddingBranch && branches.length > 1 && (
                        <button
                          type="button"
                          id="btn-delete-current-branch"
                          onClick={() => promptDeleteBranch(branchForm.id || selectedBranchId, branchForm.name || 'this branch')}
                          className="px-3.5 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Branch</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        {isAddingBranch && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingBranch(false);
                              if (branches.length > 0) {
                                handleSelectBranchToEdit(branches[0].id);
                              }
                            }}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}

                        <button
                          type="submit"
                          id="btn-save-branch-changes"
                          disabled={isSavingBranch}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <Save className="w-4 h-4" />
                          <span>{isSavingBranch ? 'Saving Branch...' : 'Save Branch Details'}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Right Column: Live Patient Preview (5 cols) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <h5 className="font-extrabold text-xs tracking-wider text-slate-200 uppercase">
                            Patient View Preview
                          </h5>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Live Card</span>
                      </div>

                      <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full inline-block mb-1">
                              {branchForm.shortName || 'Branch Tag'}
                            </span>
                            <h4 className="font-black text-sm text-white leading-tight">
                              {branchForm.name || 'Branch Full Name'}
                            </h4>
                          </div>
                          {branchForm.isMain && (
                            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                              ★ Flagship
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                          <p className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">
                              {branchForm.address || 'Street Address'}, {branchForm.areaCityPincode || 'Area City Pincode'}
                            </span>
                          </p>
                          {branchForm.landmark && (
                            <p className="flex items-center gap-2 text-[11px] text-slate-400 pl-5">
                              <span>📍 Landmark: {branchForm.landmark}</span>
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Helpline: {branchForm.phone || '+91 98765 00000'}</span>
                          </p>
                          <p className="flex items-center gap-2 text-[11px] text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{branchForm.timings || 'Mon – Sat: 9:00 AM – 8:00 PM'}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-700 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Booking Status:</span>
                          <span className={branchForm.isActive !== false ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {branchForm.isActive !== false ? '● Open for Patient Bookings' : '○ Paused for Bookings'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-[11px] text-emerald-200/90 leading-relaxed">
                        💡 <strong>Instant Synchronisation:</strong> When you save this branch, changes are updated immediately on the booking screen selector, printable appointment slips, and WhatsApp confirmations.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 1: TREATMENTS & PRICING */}
            {activeTab === 'treatments' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Search & Actions Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      placeholder="Filter treatments or price (e.g. ₹500, checkup)..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <button
                    id="btn-add-treatment-toggle"
                    type="button"
                    onClick={() => setIsAddingTreatment(!isAddingTreatment)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingTreatment ? 'Cancel New Treatment' : 'Add New Treatment'}</span>
                  </button>
                </div>

                {/* Add New Treatment Card Form */}
                {isAddingTreatment && (
                  <div className="bg-blue-50/60 border-2 border-blue-200 rounded-xl p-4.5 space-y-3.5 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-blue-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span>Add New Treatment to Live Catalog</span>
                      </h4>
                      <span className="text-[11px] text-blue-700 font-bold">
                        Persists directly to server
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Icon (Emoji)
                        </label>
                        <input
                          type="text"
                          value={newTreatment.icon}
                          onChange={(e) =>
                            setNewTreatment({ ...newTreatment, icon: e.target.value })
                          }
                          placeholder="🦷"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-center font-bold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Treatment Name *
                        </label>
                        <input
                          type="text"
                          value={newTreatment.name}
                          onChange={(e) =>
                            setNewTreatment({ ...newTreatment, name: e.target.value })
                          }
                          placeholder="e.g. Root Canal Therapy (RCT)"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Price / Fee Range *
                        </label>
                        <input
                          type="text"
                          value={newTreatment.price}
                          onChange={(e) =>
                            setNewTreatment({ ...newTreatment, price: e.target.value })
                          }
                          placeholder="e.g. ₹2,500 – ₹4,500"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-blue-700"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={newTreatment.dur}
                          onChange={(e) =>
                            setNewTreatment({ ...newTreatment, dur: e.target.value })
                          }
                          placeholder="e.g. 45 min"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={handleCreateTreatment}
                          disabled={isSaving}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Saving...' : 'Save & Publish Service'}</span>
                        </button>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={newTreatment.desc}
                          onChange={(e) =>
                            setNewTreatment({ ...newTreatment, desc: e.target.value })
                          }
                          placeholder="Brief explanation for patients..."
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Treatments List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                    <span>
                      Active Services ({filteredTreatments.length} of {treatments.length})
                    </span>
                    <span>Click 'Edit Price' to update fee directly</span>
                  </div>

                  {filteredTreatments.map((treatment) => {
                    const isEditing = editingTreatmentId === treatment.id;

                    return (
                      <div
                        key={treatment.id}
                        id={`admin-treatment-${treatment.id}`}
                        className={`border rounded-xl p-3.5 sm:p-4 bg-white transition-all shadow-xs ${
                          isEditing
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isEditing ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Icon
                                </label>
                                <input
                                  type="text"
                                  value={treatmentForm.icon || ''}
                                  onChange={(e) =>
                                    setTreatmentForm({ ...treatmentForm, icon: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-center text-base"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Treatment Name
                                </label>
                                <input
                                  type="text"
                                  value={treatmentForm.name || ''}
                                  onChange={(e) =>
                                    setTreatmentForm({ ...treatmentForm, name: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-900"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-blue-700 uppercase">
                                  Price / Fee Range (Displayed to Patients)
                                </label>
                                <input
                                  type="text"
                                  value={treatmentForm.price || ''}
                                  onChange={(e) =>
                                    setTreatmentForm({ ...treatmentForm, price: e.target.value })
                                  }
                                  placeholder="e.g. ₹500 – ₹1,200"
                                  className="w-full bg-white border-2 border-blue-400 rounded-md p-1.5 text-xs font-black text-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                              </div>

                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  value={treatmentForm.dur || ''}
                                  onChange={(e) =>
                                    setTreatmentForm({ ...treatmentForm, dur: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-semibold"
                                />
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={treatmentForm.desc || ''}
                                  onChange={(e) =>
                                    setTreatmentForm({ ...treatmentForm, desc: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-medium"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => promptDeleteTreatment(treatment.id, treatment.name)}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Service</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditTreatment}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleTreatment(treatment.id)}
                                  disabled={isSaving}
                                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{isSaving ? 'Saving...' : 'Save Price Change'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-2xl w-8 text-center shrink-0">
                                {treatment.icon}
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                  <span>{treatment.name}</span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    ⏱ {treatment.dur}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                                  {treatment.desc}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                              <div className="text-right">
                                <div className="text-[10px] uppercase font-bold text-slate-400">
                                  Current Fee
                                </div>
                                <div className="text-sm font-black text-blue-600">
                                  {treatment.price}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => startEditTreatment(treatment)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Price</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => promptDeleteTreatment(treatment.id, treatment.name)}
                                className="w-8 h-8 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete treatment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: DOCTOR DIRECTORY */}
            {activeTab === 'doctors' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Search & Add Doctor Bar */}
                <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={doctorSearch}
                      onChange={(e) => setDoctorSearch(e.target.value)}
                      placeholder="Filter doctors by name or specialization..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <button
                    id="btn-add-doctor-toggle"
                    type="button"
                    onClick={() => setIsAddingDoctor(!isAddingDoctor)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingDoctor ? 'Cancel New Doctor' : 'Add New Doctor'}</span>
                  </button>
                </div>

                {/* Add New Doctor Form */}
                {isAddingDoctor && (
                  <div className="bg-blue-50/60 border-2 border-blue-200 rounded-xl p-4.5 space-y-3.5 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-blue-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Add New Doctor to Dental Team</span>
                      </h4>
                      <span className="text-[11px] text-blue-700 font-bold">
                        Persists directly to server
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Doctor Name *
                        </label>
                        <input
                          type="text"
                          value={newDoctor.name}
                          onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
                          placeholder="e.g. Dr. Rajesh Sharma"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={newDoctor.spec}
                          onChange={(e) => setNewDoctor({ ...newDoctor, spec: e.target.value })}
                          placeholder="e.g. Cosmetic & Implant Specialist"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Experience
                        </label>
                        <input
                          type="text"
                          value={newDoctor.experience}
                          onChange={(e) =>
                            setNewDoctor({ ...newDoctor, experience: e.target.value })
                          }
                          placeholder="e.g. 14 yrs experience"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Qualifications
                        </label>
                        <input
                          type="text"
                          value={newDoctor.qualifications}
                          onChange={(e) =>
                            setNewDoctor({ ...newDoctor, qualifications: e.target.value })
                          }
                          placeholder="BDS, MDS"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Rating (1.0 to 5.0)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          value={newDoctor.rating}
                          onChange={(e) =>
                            setNewDoctor({ ...newDoctor, rating: parseFloat(e.target.value) || 4.9 })
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-amber-600"
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={handleCreateDoctor}
                          disabled={isSaving}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Saving...' : 'Save & Publish Doctor'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Doctors Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDoctors.map((doc) => {
                    const isEditing = editingDoctorId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        id={`admin-doctor-${doc.id}`}
                        className={`border rounded-xl p-4 bg-white transition-all shadow-xs ${
                          isEditing
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 col-span-1 sm:col-span-2'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isEditing ? (
                          /* Edit Mode for Doctor */
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-blue-700 uppercase">
                                  Doctor Name *
                                </label>
                                <input
                                  type="text"
                                  value={doctorForm.name || ''}
                                  onChange={(e) =>
                                    setDoctorForm({ ...doctorForm, name: e.target.value })
                                  }
                                  placeholder="e.g. Dr. Vikram Shah"
                                  className="w-full bg-white border-2 border-blue-400 rounded-md p-1.5 text-xs font-black text-slate-900 focus:outline-none"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Specialization
                                </label>
                                <input
                                  type="text"
                                  value={doctorForm.spec || ''}
                                  onChange={(e) =>
                                    setDoctorForm({ ...doctorForm, spec: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-slate-700"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Experience
                                </label>
                                <input
                                  type="text"
                                  value={doctorForm.experience || ''}
                                  onChange={(e) =>
                                    setDoctorForm({ ...doctorForm, experience: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-semibold"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Qualifications
                                </label>
                                <input
                                  type="text"
                                  value={doctorForm.qualifications || ''}
                                  onChange={(e) =>
                                    setDoctorForm({ ...doctorForm, qualifications: e.target.value })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-semibold"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Rating
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  max="5"
                                  value={doctorForm.rating || 4.9}
                                  onChange={(e) =>
                                    setDoctorForm({
                                      ...doctorForm,
                                      rating: parseFloat(e.target.value) || 4.9,
                                    })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-bold text-amber-600"
                                />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                                  Reviews Count
                                </label>
                                <input
                                  type="number"
                                  value={doctorForm.reviewsCount || 200}
                                  onChange={(e) =>
                                    setDoctorForm({
                                      ...doctorForm,
                                      reviewsCount: parseInt(e.target.value, 10) || 100,
                                    })
                                  }
                                  className="w-full bg-white border border-slate-300 rounded-md p-1.5 text-xs font-semibold"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => promptDeleteDoctor(doc.id, doc.name)}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Doctor</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEditDoctor}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveSingleDoctor(doc.id)}
                                  disabled={isSaving}
                                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{isSaving ? 'Saving...' : 'Save Doctor Name'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* View Mode for Doctor */
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 border border-slate-200 shadow-2xs"
                                style={{ backgroundColor: doc.avatarBg }}
                              >
                                {doc.avatarIcon}
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-900 leading-snug">
                                  {doc.name}
                                </div>
                                <div className="text-xs text-slate-600 font-semibold mt-0.5">
                                  {doc.spec}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium mt-1">
                                  <span>{doc.qualifications}</span>
                                  <span>·</span>
                                  <span className="font-bold text-blue-600">{doc.experience}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1">
                                  <Star className="w-3 h-3 fill-amber-500" />
                                  <span>{doc.rating}</span>
                                  <span className="text-slate-400 font-normal text-[10px]">
                                    ({doc.reviewsCount} reviews)
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditDoctor(doc)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Name</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => promptDeleteDoctor(doc.id, doc.name)}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-400 hover:text-rose-600 font-medium text-[11px] transition-colors cursor-pointer text-center"
                                title="Remove doctor"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: TIMINGS & APPOINTMENT SLOTS */}
            {activeTab === 'timings' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* 1. Operating Hours Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>Store / Clinic Operating Hours & Schedule</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Define daily opening and closing hours. Updates availability logic across the entire booking flow.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveTimings}
                      disabled={isSavingTimings}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingTimings ? 'Saving Changes...' : 'Save Operating Hours'}</span>
                    </button>
                  </div>

                  {/* Day-by-Day Schedules Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                    {/* Weekdays */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          <span>Monday – Friday</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTimings({
                              ...timings,
                              schedules: {
                                ...timings.schedules,
                                weekdays: {
                                  ...timings.schedules.weekdays,
                                  isOpen: !timings.schedules.weekdays.isOpen,
                                },
                              },
                            })
                          }
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            timings.schedules.weekdays.isOpen
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {timings.schedules.weekdays.isOpen ? '● Open' : '○ Closed'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Opens At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.weekdays.openTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  weekdays: {
                                    ...timings.schedules.weekdays,
                                    openTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="09:00 AM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Closes At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.weekdays.closeTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  weekdays: {
                                    ...timings.schedules.weekdays,
                                    closeTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="08:00 PM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Saturday */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-blue-500" />
                          <span>Saturday</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTimings({
                              ...timings,
                              schedules: {
                                ...timings.schedules,
                                saturday: {
                                  ...timings.schedules.saturday,
                                  isOpen: !timings.schedules.saturday.isOpen,
                                },
                              },
                            })
                          }
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            timings.schedules.saturday.isOpen
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {timings.schedules.saturday.isOpen ? '● Open' : '○ Closed'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Opens At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.saturday.openTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  saturday: {
                                    ...timings.schedules.saturday,
                                    openTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="09:00 AM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Closes At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.saturday.closeTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  saturday: {
                                    ...timings.schedules.saturday,
                                    closeTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="06:00 PM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sunday */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-rose-500" />
                          <span>Sunday</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTimings({
                              ...timings,
                              schedules: {
                                ...timings.schedules,
                                sunday: {
                                  ...timings.schedules.sunday,
                                  isOpen: !timings.schedules.sunday.isOpen,
                                },
                              },
                            })
                          }
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            timings.schedules.sunday.isOpen
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {timings.schedules.sunday.isOpen ? '● Open' : '○ Closed (Emergency only)'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Opens At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.sunday.openTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  sunday: {
                                    ...timings.schedules.sunday,
                                    openTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="10:00 AM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                            Closes At
                          </label>
                          <input
                            type="text"
                            value={timings.schedules.sunday.closeTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                schedules: {
                                  ...timings.schedules,
                                  sunday: {
                                    ...timings.schedules.sunday,
                                    closeTime: e.target.value,
                                  },
                                },
                              })
                            }
                            placeholder="02:00 PM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lunch / Sanitization Break & Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          <span>Daily Recess / Lunch Break</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setTimings({
                              ...timings,
                              breakTime: {
                                ...timings.breakTime,
                                enabled: !timings.breakTime.enabled,
                              },
                            })
                          }
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer ${
                            timings.breakTime.enabled
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-200 text-slate-600 border-slate-300'
                          }`}
                        >
                          {timings.breakTime.enabled ? 'Active Break' : 'Disabled'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Break Starts
                          </label>
                          <input
                            type="text"
                            value={timings.breakTime.startTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                breakTime: {
                                  ...timings.breakTime,
                                  startTime: e.target.value,
                                },
                              })
                            }
                            placeholder="01:30 PM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Break Ends
                          </label>
                          <input
                            type="text"
                            value={timings.breakTime.endTime}
                            onChange={(e) =>
                              setTimings({
                                ...timings,
                                breakTime: {
                                  ...timings.breakTime,
                                  endTime: e.target.value,
                                },
                              })
                            }
                            placeholder="02:30 PM"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 mt-0.5"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                      <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span>Public Notice & Slot Duration</span>
                      </div>

                      <div className="space-y-1.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">
                            Announcement Headline
                          </label>
                          <input
                            type="text"
                            value={timings.announcement}
                            onChange={(e) =>
                              setTimings({ ...timings, announcement: e.target.value })
                            }
                            placeholder="e.g. Open 6 days a week · Walk-ins welcome"
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 mt-0.5"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <label className="text-[11px] font-bold text-slate-600">
                            Slot Interval:
                          </label>
                          {[15, 30, 45, 60].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() =>
                                setTimings({ ...timings, slotDurationMinutes: mins })
                              }
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                                timings.slotDurationMinutes === mins
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {mins}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Live Appointment Slots Management */}
                <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Appointment Time Slots Directory</span>
                        <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                          {timings.activeSlots.length} Slots Total
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Add custom appointment slots, pause specific times without deleting, or remove slots.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={promptResetTimings}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-600" />
                        <span>Reset Timings Preset</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-600" />
                      <span>Quick Schedule Presets:</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApplySlotPreset('standard')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Standard (9 AM – 6 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySlotPreset('extended')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Extended (9 AM – 8 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySlotPreset('morning')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Morning Shift (9 AM – 2 PM)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySlotPreset('evening')}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Evening Shift (3 PM – 9 PM)
                      </button>
                    </div>
                  </div>

                  {/* Add New Custom Slot Form */}
                  <form onSubmit={handleAddSlot} className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add New Custom Appointment Slot</span>
                      </span>
                      <span className="text-[11px] text-blue-700 font-medium">
                        24-Hour Format (e.g. 08:30, 18:30, 19:00, 20:30)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newSlotInput}
                        onChange={(e) => {
                          setNewSlotInput(e.target.value);
                          setNewSlotError('');
                        }}
                        placeholder="HH:mm (e.g. 08:30 or 19:30)"
                        className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-44"
                      />

                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Slot</span>
                      </button>

                      {newSlotInput && /^\d{2}:\d{2}$/.test(newSlotInput.trim()) && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                          Preview: {formatSlotTime(newSlotInput.trim())}
                        </span>
                      )}
                    </div>

                    {newSlotError && (
                      <div className="text-xs font-bold text-rose-600 flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{newSlotError}</span>
                      </div>
                    )}
                  </form>

                  {/* Visual Slots Grid */}
                  <div className="space-y-3 pt-1">
                    {/* Morning Period */}
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sun className="w-3 h-3 text-amber-500" />
                        <span>Morning Slots (08:00 – 11:59)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {timings.activeSlots
                          .filter((s) => {
                            const h = parseInt(s.split(':')[0], 10);
                            return h < 12;
                          })
                          .map((slot) => {
                            const isPaused = (timings.disabledSlots || []).includes(slot);
                            return (
                              <div
                                key={slot}
                                className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-all ${
                                  isPaused
                                    ? 'bg-slate-100 border-slate-300 opacity-60'
                                    : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-black text-xs text-slate-800">
                                    {formatSlotTime(slot)}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold">{slot}</span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isPaused
                                          ? 'bg-slate-200 text-slate-600'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {isPaused ? 'Paused' : 'Active'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlot(slot)}
                                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                      isPaused
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                    }`}
                                    title={isPaused ? 'Enable slot' : 'Pause slot'}
                                  >
                                    {isPaused ? 'Enable' : 'Pause'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => promptDeleteSlot(slot)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title="Delete slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Afternoon Period */}
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sun className="w-3 h-3 text-orange-500" />
                        <span>Afternoon Slots (12:00 – 15:59)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {timings.activeSlots
                          .filter((s) => {
                            const h = parseInt(s.split(':')[0], 10);
                            return h >= 12 && h < 16;
                          })
                          .map((slot) => {
                            const isPaused = (timings.disabledSlots || []).includes(slot);
                            return (
                              <div
                                key={slot}
                                className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-all ${
                                  isPaused
                                    ? 'bg-slate-100 border-slate-300 opacity-60'
                                    : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-black text-xs text-slate-800">
                                    {formatSlotTime(slot)}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold">{slot}</span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isPaused
                                          ? 'bg-slate-200 text-slate-600'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {isPaused ? 'Paused' : 'Active'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlot(slot)}
                                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                      isPaused
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                    }`}
                                    title={isPaused ? 'Enable slot' : 'Pause slot'}
                                  >
                                    {isPaused ? 'Enable' : 'Pause'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => promptDeleteSlot(slot)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title="Delete slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Evening Period */}
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>Evening Slots (16:00 – 22:00)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {timings.activeSlots
                          .filter((s) => {
                            const h = parseInt(s.split(':')[0], 10);
                            return h >= 16;
                          })
                          .map((slot) => {
                            const isPaused = (timings.disabledSlots || []).includes(slot);
                            return (
                              <div
                                key={slot}
                                className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-all ${
                                  isPaused
                                    ? 'bg-slate-100 border-slate-300 opacity-60'
                                    : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="font-black text-xs text-slate-800">
                                    {formatSlotTime(slot)}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold">{slot}</span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                        isPaused
                                          ? 'bg-slate-200 text-slate-600'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {isPaused ? 'Paused' : 'Active'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSlot(slot)}
                                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                      isPaused
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                                    }`}
                                    title={isPaused ? 'Enable slot' : 'Pause slot'}
                                  >
                                    {isPaused ? 'Enable' : 'Pause'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => promptDeleteSlot(slot)}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    title="Delete slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: AUDIT LOGS & SETTINGS */}
            {activeTab === 'settings' && (

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {/* Status Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3 shadow-xs">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Server Storage & Permanence Status</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-bold text-[10px] uppercase">
                        Clinic Profile & Address
                      </div>
                      <div className="font-extrabold text-slate-800 text-sm mt-0.5">
                        data/clinic_profile.json
                      </div>
                      <div className="text-blue-600 font-bold text-[11px] mt-1 flex items-center justify-between">
                        <span>● {clinicProfile.name}</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('profile')}
                          className="text-[10px] text-blue-700 underline font-bold cursor-pointer hover:text-blue-900"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-bold text-[10px] uppercase">
                        Treatments File
                      </div>
                      <div className="font-extrabold text-slate-800 text-sm mt-0.5">
                        data/treatments_store.json
                      </div>
                      <div className="text-emerald-600 font-bold text-[11px] mt-1">
                        ● {treatments.length} Active Services
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-bold text-[10px] uppercase">
                        Dentists File
                      </div>
                      <div className="font-extrabold text-slate-800 text-sm mt-0.5">
                        data/doctors_store.json
                      </div>
                      <div className="text-emerald-600 font-bold text-[11px] mt-1">
                        ● {doctors.length} Active Dentists
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-slate-400 font-bold text-[10px] uppercase">
                        Last Modified
                      </div>
                      <div className="font-bold text-slate-800 text-xs mt-0.5 truncate">
                        {lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Just now'}
                      </div>
                      <div className="text-blue-600 font-bold text-[11px] mt-1">
                        Persistent On Server Disk
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reset to Defaults Option */}
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4.5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-600" />
                      <span>Reset Catalog to Clinic Defaults</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      Restore standard initial pricing list (9 general procedures) and default 4
                      dentists.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={promptResetDefaults}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Reset Defaults
                  </button>
                </div>

                {/* Reset Branches Option */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4.5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 text-emerald-600" />
                      <span>Reset Clinic Branches to Standard 3 Locations</span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Restores Downtown Central (Main), Westside Smiles Hub, and Green Hills Studio default configurations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={promptResetBranches}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    Reset Branches
                  </button>
                </div>

                {/* Audit Change Logs */}
                <div className="bg-white rounded-xl border border-slate-200 p-4.5 space-y-3 shadow-xs">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Recent Admin Modifications Log</span>
                  </h4>

                  {changeLogs.length > 0 ? (
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {changeLogs.map((log) => (
                        <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-800">{log.action}: </span>
                            <span className="text-slate-600">{log.details || log.target}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No previous modifications logged.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: AI CLINIC INSIGHTS */}
            {activeTab === 'ai_insights' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
                <AiClinicInsightsView clinicProfile={clinicProfile} />
              </div>
            )}

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 px-5 sm:px-7 py-3.5 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>All modifications remain permanently saved until changed again.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Done & Back to Clinic
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive In-Modal Delete & Reset Confirmation Dialog */}
      {deleteTarget && (
        <div
          id="admin-delete-dialog-overlay"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            id="admin-delete-dialog-card"
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-lg font-black text-slate-900">
                {deleteTarget.type === 'reset-defaults'
                  ? 'Reset All Clinic Defaults?'
                  : deleteTarget.type === 'reset-timings'
                  ? 'Reset Clinic Hours & Slots Preset?'
                  : deleteTarget.type === 'reset-branches'
                  ? 'Reset All Clinic Branches?'
                  : deleteTarget.type === 'slot'
                  ? 'Remove Appointment Slot?'
                  : deleteTarget.type === 'treatment'
                  ? 'Remove Treatment Service?'
                  : deleteTarget.type === 'branch'
                  ? 'Remove Clinic Branch Location?'
                  : 'Remove Doctor from Team?'}
              </h4>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {deleteTarget.type === 'reset-defaults' ? (
                  'Are you sure you want to reset all treatments, doctors, and store timings back to original clinic defaults? All custom prices and changes will be restored.'
                ) : deleteTarget.type === 'reset-timings' ? (
                  'Are you sure you want to reset all operating schedules and appointment time slots back to the standard clinic defaults (09:00 AM - 06:00 PM)?'
                ) : deleteTarget.type === 'reset-branches' ? (
                  'Are you sure you want to reset all clinic branch locations back to factory defaults (Downtown Central, Westside Smiles Hub, Green Hills Studio)?'
                ) : deleteTarget.type === 'slot' ? (
                  <>
                    Are you sure you want to delete appointment slot{' '}
                    <strong className="text-rose-700 font-extrabold">{deleteTarget.name}</strong>?
                    Patients will no longer be able to select this time.
                  </>
                ) : deleteTarget.type === 'branch' ? (
                  <>
                    Are you sure you want to permanently delete clinic branch{' '}
                    <strong className="text-rose-700 font-extrabold">"{deleteTarget.name}"</strong>?
                    Patients will no longer be able to choose this location when booking appointments.
                  </>
                ) : (
                  <>
                    Are you sure you want to permanently delete{' '}
                    <strong className="text-rose-700 font-extrabold">"{deleteTarget.name}"</strong>?
                    This will remove the item from live booking options.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {deleteTarget.type === 'reset-defaults' || deleteTarget.type === 'reset-branches' || deleteTarget.type === 'reset-timings'
                        ? 'Yes, Reset'
                        : 'Yes, Delete Now'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
