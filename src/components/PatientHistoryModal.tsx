import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Clock,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Ban,
  Printer,
  Copy,
  Check,
  RefreshCw,
  BellRing,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { PatientRecord, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { SmartDentalLogo } from './SmartDentalLogo';
import { PrintSummaryModal } from './PrintSummaryModal';

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicProfile?: ClinicProfile;
  onBookNewAppointment?: () => void;
  initialQuery?: string;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  isOpen,
  onClose,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onBookNewAppointment,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [patientProfile, setPatientProfile] = useState<{
    name: string;
    phone: string;
    email: string;
    patientType: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingCount: 0,
    pastCount: 0,
    cancelledCount: 0,
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Cancellation state
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Change of plans / Schedule conflict');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string>('');

  // Slip Printing state
  const [slipRecord, setSlipRecord] = useState<PatientRecord | null>(null);

  // Sample quick queries for testing
  const [demoQueries, setDemoQueries] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch latest 3 phone numbers or refs from /api/patients for 1-click test chips
      fetch('/api/patients')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
            const numbers = Array.from(
              new Set(
                data.data
                  .map((r: PatientRecord) => r.phone?.trim())
                  .filter((p: string | undefined) => Boolean(p && p.length >= 7))
              )
            ).slice(0, 3) as string[];

            setDemoQueries(numbers);
          }
        })
        .catch(() => {});

      if (initialQuery) {
        setSearchQuery(initialQuery);
        executeSearch(initialQuery);
      }
    } else {
      setCancelSuccessMsg('');
      setCancellingRef(null);
    }
  }, [isOpen, initialQuery]);

  const executeSearch = async (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : searchQuery).trim();
    if (!q) {
      setError('Please enter your mobile phone number or booking reference code.');
      return;
    }

    setError('');
    setIsLoading(true);
    setHasSearched(true);
    setCancelSuccessMsg('');

    try {
      const response = await fetch(`/api/patients/history?query=${encodeURIComponent(q)}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setRecords(data.records || []);
        setPatientProfile(data.patientProfile || null);
        setStats(
          data.stats || {
            totalBookings: data.records?.length || 0,
            upcomingCount: 0,
            pastCount: 0,
            cancelledCount: 0,
          }
        );
      } else {
        setError(data.error || 'No appointments found matching this mobile number.');
        setRecords([]);
        setPatientProfile(null);
      }
    } catch (err) {
      setError('Network error occurred while fetching patient history.');
      setRecords([]);
      setPatientProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingRef) return;
    setIsSubmittingCancel(true);

    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(cancellingRef)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Update local list
        setRecords((prev) =>
          prev.map((r) =>
            r.bookingRef.toUpperCase() === cancellingRef.toUpperCase()
              ? { ...r, status: 'Cancelled' }
              : r
          )
        );
        // Refresh counts
        setStats((prev) => ({
          ...prev,
          upcomingCount: Math.max(0, prev.upcomingCount - 1),
          cancelledCount: prev.cancelledCount + 1,
        }));
        setCancelSuccessMsg(`Appointment ${cancellingRef} has been cancelled successfully.`);
        setCancellingRef(null);
      } else {
        alert(data.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      alert('Network error while cancelling appointment.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Filter records
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredRecords = records.filter((r) => {
    const isCancelled = r.status?.toLowerCase() === 'cancelled';
    const isUpcoming = !isCancelled && r.appointmentDate >= todayStr;
    const isPast = isCancelled || r.appointmentDate < todayStr;

    if (activeFilter === 'upcoming') return isUpcoming;
    if (activeFilter === 'past') return isPast && !isCancelled;
    if (activeFilter === 'cancelled') return isCancelled;
    return true; // 'all'
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Top Header */}
        <div className="px-3.5 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-xl font-black tracking-tight truncate">
                  Patient History & Portal
                </h2>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-500/40 text-blue-100 border border-blue-400/50 shrink-0">
                  Lookup
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100/90 font-medium truncate hidden sm:block">
                Track past dental visits, upcoming appointments, and booking slips
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            title="Close patient history portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar Section */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="patient-history-query-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch();
                  }
                }}
                placeholder="Enter 10-digit mobile number or booking ref (e.g. 9876500000 or SC1234)..."
                className="w-full bg-white border-2 border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:ring-3 focus:ring-blue-100 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setRecords([]);
                    setHasSearched(false);
                    setError('');
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              id="btn-search-patient-history"
              type="button"
              onClick={() => executeSearch()}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching…</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Appointments</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Demo Chips */}
          {demoQueries.length > 0 && !hasSearched && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
              <span className="font-semibold text-[11px]">Quick search existing numbers:</span>
              {demoQueries.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setSearchQuery(num);
                    executeSearch(num);
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-[#2563eb] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {cancelSuccessMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{cancelSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* Patient Summary Banner (When records found) */}
        {patientProfile && records.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-[#2563eb] flex items-center justify-center font-black text-sm">
                {patientProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {patientProfile.name}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {patientProfile.patientType || 'Registered Patient'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {patientProfile.phone}
                  </span>
                  {patientProfile.email && (
                    <span className="flex items-center gap-1 hidden sm:inline-flex">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {patientProfile.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white text-[#2563eb] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('upcoming')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'upcoming'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upcoming ({stats.upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('past')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'past'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Past ({stats.pastCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('cancelled')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'cancelled'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancelled ({stats.cancelledCount})
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!hasSearched ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2563eb] mx-auto flex items-center justify-center">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Look up your past dental appointments
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                Enter the mobile number you used while booking to view your appointment history,
                download slips, or cancel an upcoming session.
              </p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Calendar className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">No appointments found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                {activeFilter !== 'all'
                  ? `No ${activeFilter} appointments match your filter.`
                  : 'We could not find any records with this phone number or booking reference.'}
              </p>
              {onBookNewAppointment && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onBookNewAppointment();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563eb] text-white font-extrabold text-xs shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <span>Book a New Appointment</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRecords.map((rec) => {
                const isCancelled = rec.status?.toLowerCase() === 'cancelled';
                const isUpcoming = !isCancelled && rec.appointmentDate >= todayStr;

                return (
                  <div
                    key={rec.bookingRef}
                    className={`border-2 rounded-2xl p-4 sm:p-5 transition-all shadow-xs ${
                      isCancelled
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : isUpcoming
                        ? 'bg-white border-blue-300 hover:border-blue-400'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Top Row: Ref, Status, Branch */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">Booking Ref:</span>
                        <span className="font-mono font-black text-sm text-[#1e40af] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {rec.bookingRef}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyRef(rec.bookingRef)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors cursor-pointer"
                          title="Copy Booking Reference"
                        >
                          {copiedRef === rec.bookingRef ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-rose-700 bg-rose-50 border border-rose-300 px-2.5 py-1 rounded-full">
                            <Ban className="w-3 h-3" />
                            <span>Cancelled</span>
                          </span>
                        ) : isUpcoming ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Upcoming & Confirmed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-full">
                            <span>Completed Visit</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Branch, Date/Time, Treatment, Doctor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                      {/* Left Column: Branch & Location */}
                      <div className="space-y-1.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-1.5 font-bold text-[#1e40af]">
                          <Building2 className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                          <span className="truncate">
                            {rec.branchName || clinicProfile.name}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {rec.branchAddress || clinicProfile.address}
                          </span>
                        </div>
                        {rec.branchPhone && (
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold pt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                            <a
                              href={`tel:${rec.branchPhone.replace(/[^0-9+]/g, '')}`}
                              className="hover:underline text-blue-700"
                            >
                              {rec.branchPhone}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Schedule & Doctor Details */}
                      <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                          <span>{rec.appointmentDate}</span>
                          <span className="text-slate-400">·</span>
                          <Clock className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                          <span>{rec.appointmentTime}</span>
                        </div>
                        <div className="text-slate-800 font-bold">
                          🦷 {rec.treatmentName}{' '}
                          <span className="font-semibold text-slate-500">
                            ({rec.treatmentDuration}) · {rec.estimatedFee}
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium">
                          👨‍⚕️ {rec.doctorName} · {rec.doctorSpecialization}
                        </div>
                      </div>
                    </div>

                    {rec.notes && rec.notes !== 'None' && (
                      <div className="text-[11px] text-slate-600 bg-amber-50/70 border border-amber-200 rounded-lg p-2 mb-2 italic">
                        <span className="font-bold text-amber-800 not-italic">Clinical Notes: </span>
                        "{rec.notes}"
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <BellRing className="w-3 h-3 text-blue-500" />
                        <span>24h SMS/Email reminder scheduled</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Cancel Appointment Button (if upcoming) */}
                        {isUpcoming && (
                          <button
                            type="button"
                            onClick={() => setCancellingRef(rec.bookingRef)}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Cancel Appointment
                          </button>
                        )}

                        {/* View / Print Slip */}
                        <button
                          type="button"
                          onClick={() => setSlipRecord(rec)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#2563eb] font-extrabold text-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>View / Print Slip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Need urgent assistance? Call helpline:{' '}
            <strong className="text-slate-800">{clinicProfile.phone}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onBookNewAppointment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBookNewAppointment();
                }}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors cursor-pointer shadow-xs"
              >
                + Book Another Visit
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      {cancellingRef && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Cancel Appointment {cancellingRef}?
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  This slot will be released back to the schedule.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Cancellation (optional):
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="Change of plans / Schedule conflict">Change of plans / Schedule conflict</option>
                <option value="Health emergency / Unwell">Health emergency / Unwell</option>
                <option value="Need to reschedule for a later date">Need to reschedule for a later date</option>
                <option value="Consulted another doctor">Consulted another doctor</option>
                <option value="Other personal reason">Other personal reason</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingRef(null)}
                disabled={isSubmittingCancel}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmittingCancel ? 'Cancelling…' : 'Yes, Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Slip Preview Modal for historical appointment */}
      {slipRecord && (
        <PrintSummaryModal
          isOpen={true}
          onClose={() => setSlipRecord(null)}
          booking={{
            branch: {
              id: slipRecord.branchId || 'branch-1',
              name: slipRecord.branchName || clinicProfile.name,
              shortName: slipRecord.branchName || 'Clinic Branch',
              address: slipRecord.branchAddress || clinicProfile.address,
              areaCityPincode: clinicProfile.areaCityPincode,
              phone: slipRecord.branchPhone || clinicProfile.phone,
              emergencyPhone: clinicProfile.emergencyPhone,
              email: clinicProfile.email,
              landmark: clinicProfile.landmark,
              timings: 'Mon – Sat: 9:00 AM – 8:00 PM',
              isMain: true,
              isActive: true,
            },
            treatment: {
              id: 't-history',
              cat: 'general',
              icon: '🦷',
              name: slipRecord.treatmentName,
              desc: 'Scheduled dental treatment',
              dur: slipRecord.treatmentDuration,
              price: slipRecord.estimatedFee,
            },
            doctor: {
              id: 'd-history',
              name: slipRecord.doctorName,
              spec: slipRecord.doctorSpecialization,
              qualifications: 'BDS, MDS',
              experience: '10+ Years',
              rating: 4.9,
              reviewsCount: 150,
              avatarBg: '#eff6ff',
              avatarIcon: '👨‍⚕️',
            },
            selectedDate: new Date(slipRecord.appointmentDate),
            selectedTime: slipRecord.appointmentTime,
            patient: {
              firstName: slipRecord.firstName || slipRecord.patientName.split(' ')[0] || '',
              lastName: slipRecord.lastName || slipRecord.patientName.split(' ')[1] || '',
              phone: slipRecord.phone,
              email: slipRecord.email,
              dob: slipRecord.dob,
              patientType: (slipRecord.patientType as any) || 'Registered patient',
              notes: slipRecord.notes,
            },
            bookingRef: slipRecord.bookingRef,
          }}
          clinicProfile={clinicProfile}
        />
      )}
    </div>
  );
};
