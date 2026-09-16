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
} from 'lucide-react';
import { PatientRecord, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { cleanPhoneNumber } from './WhatsAppShareModal';
import { PrintSummaryModal } from './PrintSummaryModal';
import {
  getLocalCachedPatientRecords,
  saveLocalCachedPatientRecords,
} from '../utils/offlineEngine';

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
}) => {
  const [records, setRecords] = useState<PatientRecord[]>(() => getLocalCachedPatientRecords());
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<PatientRecord | null>(null);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all');
  const [slipToPrint, setSlipToPrint] = useState<PatientRecord | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRecords(json.data);
          saveLocalCachedPatientRecords(json.data);
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
      <div className="bg-white border-2 border-[#dbeafe] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#2563eb] text-white px-3.5 sm:px-7 py-3 sm:py-4 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-xl font-extrabold tracking-tight truncate">
                  Patients Database
                </h3>
                <span className="text-[10px] sm:text-[11px] bg-emerald-400 text-emerald-950 px-1.5 sm:px-2 py-0.2 rounded-full font-extrabold uppercase">
                  Live Synced
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100 font-medium hidden sm:block">
                Stored in server file: <code className="bg-white/10 px-1 py-0.5 rounded font-mono">data/patients_records.xlsx</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <a
              id="btn-download-backend-excel"
              href="/api/patients/export-excel"
              download="SmartDental_Patients_Records.xlsx"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white text-[#2563eb] hover:bg-[#eff6ff] font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563eb]" />
              <span className="hidden xs:inline sm:inline">Download .XLSX</span>
              <span className="xs:hidden">.XLSX</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="p-3.5 sm:px-6 bg-[#f8fafc] border-b border-[#dbeafe] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, ref, phone, treatment…"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-semibold bg-white border border-[#dbeafe] rounded-xl text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#2563eb]"
              />
            </div>

            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="text-xs font-bold bg-white border border-[#dbeafe] rounded-xl px-2.5 py-2 text-[#0f172a] focus:outline-none focus:border-[#2563eb] cursor-pointer shrink-0"
              title="Filter by assigned Doctor"
            >
              <option value="all">👨‍⚕️ All Doctors ({records.length})</option>
              {doctorNames.map((name) => (
                <option key={name} value={name}>
                  {name} ({records.filter((r) => r.doctorName === name).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
            {onOpenAiInsights && (
              <button
                type="button"
                id="btn-open-ai-insights-toolbar"
                onClick={onOpenAiInsights}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="View Gemini AI Practice Insights & Analytics"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>AI Insights</span>
              </button>
            )}

            <span className="text-xs font-bold text-[#64748b]">
              Showing: <strong className="text-[#2563eb]">{filteredRecords.length}</strong> / {records.length}
            </span>

            {records.length > 0 && (
              <button
                type="button"
                id="btn-clear-all-records"
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}

            <button
              type="button"
              onClick={fetchRecords}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#dbeafe] bg-white text-[#2563eb] text-xs font-bold hover:bg-[#eff6ff] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#64748b]">
              <RefreshCw className="w-8 h-8 animate-spin text-[#2563eb]" />
              <p className="text-sm font-bold">Loading Excel workbook from server…</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-16 text-[#64748b]">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-[#94a3b8] mb-2" />
              <p className="text-base font-bold text-[#0f172a]">No patient records found</p>
              <p className="text-xs text-[#64748b] mt-1">
                {searchQuery ? 'Try clearing your search query.' : 'Bookings made by patients will be saved automatically here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#dbeafe] rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#eff6ff] text-[#2563eb] font-extrabold border-b border-[#dbeafe]">
                    <th className="py-3 px-3.5 whitespace-nowrap">Ref #</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Patient Name</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Phone & Email</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">General Treatment</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Assigned Dentist</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Appointment</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Fee</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Payment</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Attachment</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dbeafe]">
                  {filteredRecords.map((rec) => (
                    <tr
                      key={rec.bookingRef}
                      onClick={() => setSelectedRecord(rec)}
                      className="hover:bg-[#f8fafc] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-[#2563eb] whitespace-nowrap">
                        {rec.bookingRef}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#0f172a] whitespace-nowrap">
                        <div>{rec.patientName}</div>
                        <div className="text-[10px] text-[#64748b] font-medium">{rec.patientType}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-[#0f172a]">
                        <div className="font-semibold">{rec.phone}</div>
                        <div className="text-[10px] text-[#64748b]">{rec.email}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#0f172a]">{rec.treatmentName}</div>
                        <div className="text-[10px] text-[#64748b]">Duration: {rec.treatmentDuration}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-[#0f172a]">{rec.doctorName}</div>
                        <div className="text-[10px] text-[#64748b]">{rec.doctorSpecialization}</div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-[#0f172a]">
                        <div>{rec.appointmentDate}</div>
                        <div className="text-[10px] font-bold text-[#2563eb]">{rec.appointmentTime}</div>
                      </td>
                      <td className="py-3 px-3.5 font-bold text-[#2563eb] whitespace-nowrap">
                        {rec.estimatedFee}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {rec.paymentStatus?.toLowerCase().includes('paid') ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            ₹200 Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium text-[10px]">
                            Pay at Clinic
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {rec.attachmentName && rec.attachmentName !== 'None' ? (
                          <span
                            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px] max-w-[120px] truncate"
                            title={rec.attachmentName}
                          >
                            📎 {rec.attachmentName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          {rec.status}
                        </span>
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
                    await fetch('/api/patients', { method: 'DELETE' });
                    await fetchRecords();
                    setSelectedRecord(null);
                  } catch (e) {
                    console.error(e);
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
    </div>
  );
};
