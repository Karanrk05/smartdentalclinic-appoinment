import React from 'react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { MapPin, Phone, Mail, Globe, Calendar, Clock, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SmartDentalLogo } from './SmartDentalLogo';

interface PrintableAppointmentSlipProps {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  format?: 'a4' | 'thermal';
}

export const PrintableAppointmentSlip: React.FC<PrintableAppointmentSlipProps> = ({
  booking,
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  format = 'a4',
}) => {
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef } = booking;

  if (!treatment || !doctor || !selectedDate || !selectedTime) {
    return null;
  }

  const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : String(selectedDate);

  const formattedTime = formatSlotTime(selectedTime);
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient';
  const issueDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const branchAddressLine = booking.branch?.address
    ? `${booking.branch.address}, ${booking.branch.areaCityPincode}`
    : `${clinicProfile.address}, ${clinicProfile.areaCityPincode}`;

  const branchPhoneLine = booking.branch?.phone || clinicProfile.phone;

  // Thermal 80mm POS Slip View
  if (format === 'thermal') {
    return (
      <div
        id="printable-appointment-slip"
        className="bg-white text-black p-4 max-w-[320px] mx-auto font-mono text-xs border border-dashed border-slate-300 rounded-lg shadow-xs leading-tight print:border-none print:p-0 print:max-w-full"
      >
        <div className="text-center space-y-1 pb-2 border-b border-dashed border-black">
          <div className="text-sm font-black uppercase tracking-wider">{clinicProfile.name}</div>
          <div className="text-[10px]">{clinicProfile.tagline}</div>
          <div className="text-[10px] font-bold">{booking.branch?.name || clinicProfile.name}</div>
          <div className="text-[9px] text-slate-600">{branchAddressLine}</div>
          <div className="text-[10px]">Ph: {branchPhoneLine}</div>
        </div>

        <div className="py-2 text-center border-b border-dashed border-black">
          <div className="text-[10px] font-black uppercase">APPOINTMENT SLIP / TOKEN</div>
          <div className="text-[9px] text-slate-500">Issued: {issueDate}</div>
          <div className="mt-1 border border-black p-1 font-black text-sm tracking-widest">
            {bookingRef}
          </div>
          <div className="text-[9px] tracking-widest mt-0.5">||| | |||| | || |||| |</div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="font-bold">Patient:</span>
            <span className="font-extrabold">{fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Contact:</span>
            <span>{patient.phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Category:</span>
            <span>{patient.patientType || 'Standard'}</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="font-bold">Date:</span>
            <span className="font-bold">{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Time Slot:</span>
            <span className="font-black text-xs text-blue-700">{formattedTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Doctor:</span>
            <span>{doctor.name}</span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Dept:</span>
            <span>{doctor.spec}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">Procedure:</span>
            <span className="font-bold">{treatment.name}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span>Duration:</span>
            <span>{treatment.dur}</span>
          </div>
        </div>

        <div className="py-2 border-b-2 border-black space-y-1 text-xs font-bold">
          <div className="flex justify-between text-sm font-black">
            <span>EST. FEE:</span>
            <span>{treatment.price}</span>
          </div>
          {Number(patient.amountPaidNow || 0) > 0 && (
            <div className="flex justify-between text-xs text-emerald-800">
              <span>PAID NOW:</span>
              <span>₹{patient.amountPaidNow}</span>
            </div>
          )}
          {patient.amountRemaining && (
            <div className="flex justify-between text-xs text-blue-900">
              <span>REMAINING:</span>
              <span>{patient.amountRemaining}</span>
            </div>
          )}
          <div className="text-[9px] text-center font-normal text-slate-700">
            * Payable at counter via UPI, Card, or Cash
          </div>
        </div>

        {patient.notes && (
          <div className="py-1.5 border-b border-dashed border-black text-[10px]">
            <span className="font-bold">Remarks: </span>
            <span className="italic">"{patient.notes}"</span>
          </div>
        )}

        <div className="py-2 text-[9px] space-y-0.5 border-b border-dashed border-black">
          <div className="font-bold">CLINIC GUIDELINES:</div>
          <div>• Arrive 10 mins prior to slot</div>
          <div>• Bring previous X-rays / health records</div>
          <div>• Reschedule: Call {branchPhoneLine} 4h prior</div>
        </div>

        <div className="pt-2 text-center text-[9px] text-slate-500 space-y-0.5">
          <div className="font-bold uppercase tracking-wider">*** OFFICIAL CLINIC SLIP ***</div>
          <div>SDC-{bookingRef}-2026</div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="printable-appointment-slip"
      className="bg-white text-[#0f172a] p-6 sm:p-8 max-w-[800px] mx-auto font-sans leading-normal border border-[#cbd5e1] rounded-xl shadow-xs print:border-none print:p-0 print:shadow-none print:max-w-full"
    >
      {/* 1. CLINIC LETTERHEAD & HEADER */}
      <div className="border-b-2 border-[#2563eb] pb-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <SmartDentalLogo className="w-14 h-14 shrink-0 drop-shadow-sm" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1e40af] tracking-tight uppercase">
                  {clinicProfile.name}
                </h1>
                <p className="text-xs font-bold text-[#475569] tracking-wide">
                  {clinicProfile.tagline}
                </p>
              </div>
            </div>
            <div className="text-[11px] text-[#64748b] font-medium pt-1">
              <span className="font-bold text-[#334155]">Reg No:</span> {clinicProfile.registrationNumber} ·{' '}
              <span className="font-bold text-[#334155]">Accreditation:</span> {clinicProfile.accreditation}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="text-left sm:text-right text-[11px] text-[#475569] space-y-0.5 shrink-0">
            <div className="font-extrabold text-[#0f172a] flex sm:justify-end items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>{booking.branch?.name || clinicProfile.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 max-w-[280px] sm:ml-auto">
              {booking.branch?.address ? `${booking.branch.address}, ${booking.branch.areaCityPincode}` : clinicProfile.address}
            </div>
            <div className="flex sm:justify-end items-center gap-1 font-semibold">
              <Phone className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Branch Phone: {booking.branch?.phone || clinicProfile.phone}</span>
            </div>
            <div className="flex sm:justify-end items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>{clinicProfile.email}</span>
            </div>
            <div className="flex sm:justify-end items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>{clinicProfile.website}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DOCUMENT TITLE & STATUS BAR */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-2.5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-[#eff6ff]">
        <div>
          <span className="text-xs sm:text-sm font-black text-[#1e40af] uppercase tracking-wider block">
            Official Appointment Confirmation & Registration Slip
          </span>
          <span className="text-[10px] text-[#64748b] font-semibold">
            Issued on: {issueDate} · Verification Token: {bookingRef}-V26
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 bg-[#2563eb] text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed</span>
          </span>
        </div>
      </div>

      {/* 3. KEY METRICS ROW (Reference, Schedule, Doctor) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Booking Ref */}
        <div className="bg-[#f8fafc] border border-[#dbeafe] rounded-xl p-3.5 text-center sm:text-left">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            Booking Reference
          </div>
          <div className="text-xl font-mono font-black text-[#2563eb] tracking-widest mt-0.5">
            {bookingRef}
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-widest text-[#475569]">
            ||| | |||| | || |||| |
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-[#f8fafc] border border-[#dbeafe] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#2563eb]" />
            <span>Date & Time</span>
          </div>
          <div className="text-xs font-extrabold text-[#0f172a]">{formattedDate}</div>
          <div className="text-sm font-black text-[#2563eb]">{formattedTime}</div>
        </div>

        {/* Doctor */}
        <div className="bg-[#f8fafc] border border-[#dbeafe] rounded-xl p-3.5 space-y-1">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3 text-[#2563eb]" />
            <span>Consulting Dentist</span>
          </div>
          <div className="text-xs font-extrabold text-[#0f172a]">{doctor.name}</div>
          <div className="text-[11px] font-semibold text-[#64748b]">{doctor.spec} · Suite 2</div>
        </div>
      </div>

      {/* 4. PATIENT INFORMATION SECTION */}
      <div className="border border-[#cbd5e1] rounded-xl p-4 mb-5">
        <div className="text-xs font-black text-[#1e40af] uppercase tracking-wider pb-2 border-b border-[#e2e8f0] flex items-center justify-between">
          <span>Patient Information</span>
          <span className="text-[11px] font-bold text-[#64748b] normal-case bg-[#f1f5f9] px-2 py-0.5 rounded">
            {patient.patientType || 'New Patient'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div>
            <span className="text-[11px] text-[#64748b] font-semibold block">Full Name</span>
            <strong className="text-[#0f172a] text-sm">{fullName}</strong>
          </div>
          <div>
            <span className="text-[11px] text-[#64748b] font-semibold block">Contact Number</span>
            <strong className="text-[#0f172a]">{patient.phone}</strong>
          </div>
          <div>
            <span className="text-[11px] text-[#64748b] font-semibold block">Email Address</span>
            <strong className="text-[#0f172a] truncate block">{patient.email}</strong>
          </div>
          <div>
            <span className="text-[11px] text-[#64748b] font-semibold block">Date of Birth</span>
            <span className="text-[#0f172a] font-bold">{patient.dob || 'Not specified'}</span>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-3 pt-2.5 border-t border-[#e2e8f0] text-xs">
            <span className="text-[11px] text-[#64748b] font-bold uppercase tracking-wide block">
              Patient Remarks / Symptoms:
            </span>
            <p className="text-[#334155] italic mt-0.5 bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
              "{patient.notes}"
            </p>
          </div>
        )}
      </div>

      {/* 5. TREATMENT & FINANCIAL ESTIMATION TABLE */}
      <div className="border border-[#cbd5e1] rounded-xl overflow-hidden mb-5">
        <div className="bg-[#f8fafc] px-4 py-2 border-b border-[#cbd5e1] flex items-center justify-between">
          <span className="text-xs font-black text-[#1e40af] uppercase tracking-wider">
            Procedure & Estimated Billing
          </span>
          <span className="text-[10px] text-[#64748b] font-bold">Currency: INR (₹)</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#eff6ff] text-[#1e40af] font-bold border-b border-[#dbeafe]">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-4">Procedure / Dental Service</th>
              <th className="py-2.5 px-4">Duration</th>
              <th className="py-2.5 px-4">Specialist</th>
              <th className="py-2.5 px-4 text-right">Est. Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            <tr>
              <td className="py-2.5 px-4 font-bold text-[#64748b]">1</td>
              <td className="py-2.5 px-4">
                <div className="font-extrabold text-[#0f172a]">
                  {treatment.icon} {treatment.name}
                </div>
                <div className="text-[10px] text-[#64748b]">{treatment.desc}</div>
              </td>
              <td className="py-2.5 px-4 font-medium text-[#475569]">{treatment.dur}</td>
              <td className="py-2.5 px-4 font-medium text-[#475569]">{doctor.name}</td>
              <td className="py-2.5 px-4 text-right font-black text-[#0f172a]">{treatment.price}</td>
            </tr>
            <tr className="bg-[#f8fafc]">
              <td className="py-2 px-4 font-bold text-[#64748b]">2</td>
              <td className="py-2 px-4 text-[#475569]">Clinical Assessment & Sterilized Kit</td>
              <td className="py-2 px-4 text-[#64748b]">—</td>
              <td className="py-2 px-4 text-[#64748b]">Staff</td>
              <td className="py-2 px-4 text-right font-bold text-emerald-700">INCLUDED</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-[#eff6ff] border-t-2 border-[#2563eb] text-sm">
              <td colSpan={4} className="py-3 px-4 font-black text-[#1e40af] text-right">
                Estimated Total Amount:
              </td>
              <td className="py-3 px-4 text-right font-black text-[#2563eb] text-base">
                {treatment.price}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="bg-[#f8fafc] px-4 py-2.5 border-t border-[#e2e8f0] text-[11px] text-[#64748b] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            {Number(patient.amountPaidNow || 0) > 0 ? (
              <span className="text-emerald-700 font-bold block">
                ✓ Amount Paid Now: ₹{patient.amountPaidNow} {patient.paymentRef ? `(Ref: ${patient.paymentRef})` : ''} · Remaining: {patient.amountRemaining || 'Payable at clinic'}
              </span>
            ) : (
              <span>* Payment mode: Payable at clinic counter via UPI, Card, or Cash upon arrival.</span>
            )}
          </div>
          <span className="font-bold text-[#0f172a] shrink-0">
            {Number(patient.amountPaidNow || 0) > 0 ? (
              <span className="text-emerald-700 font-mono">ADVANCE SETTLED</span>
            ) : (
              'Status: DUE AT CLINIC'
            )}
          </span>
        </div>
      </div>

      {/* 6. PRE-APPOINTMENT CLINIC GUIDELINES */}
      <div className="bg-[#f8fafc] border border-[#dbeafe] rounded-xl p-3.5 mb-5 space-y-1.5 text-[11px] text-[#334155]">
        <div className="font-black text-[#1e40af] flex items-center gap-1.5 uppercase tracking-wide text-xs">
          <ShieldCheck className="w-4 h-4 text-[#2563eb]" />
          <span>Important Patient Guidelines & Preparation</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] leading-relaxed">
          <div className="flex items-start gap-1.5">
            <span className="text-[#2563eb] font-black">1.</span>
            <span><strong>Reporting Time:</strong> Arrive 10 minutes prior to your slot ({formattedTime}) for check-in and basic health vitals.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[#2563eb] font-black">2.</span>
            <span><strong>Medical Records:</strong> Carry previous dental X-rays, medical records, or lists of daily medications.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[#2563eb] font-black">3.</span>
            <span><strong>Hygiene:</strong> Brush thoroughly prior to your check-up; inform the dentist of any sensitivities.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="text-[#2563eb] font-black">4.</span>
            <span><strong>Rescheduling:</strong> Free reschedule or cancellation permitted up to 4 hours in advance ({clinicProfile.phone}).</span>
          </div>
        </div>
      </div>

      {/* 7. OFFICIAL VERIFICATION & SIGNATURE STAMP */}
      <div className="pt-3 border-t border-[#cbd5e1] grid grid-cols-2 sm:grid-cols-3 gap-4 items-end text-xs">
        <div>
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            Clinic Electronic Voucher
          </div>
          <div className="font-mono text-[10px] text-[#334155] font-bold mt-0.5">
            AUTH-ID: SDC-{bookingRef}-2026
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">
            Generated via {clinicProfile.name} Portal
          </div>
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 border-2 border-dashed border-[#2563eb] rounded-xl px-3.5 py-1.5 bg-[#eff6ff]/70">
            <SmartDentalLogo className="w-7 h-7 shrink-0" />
            <div className="text-left">
              <div className="text-[9px] font-black text-[#1e40af] uppercase tracking-wider">
                {clinicProfile.name}
              </div>
              <div className="text-[8px] font-bold text-emerald-700 uppercase">
                ★ OFFICIAL SEAL ★
              </div>
            </div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="h-8 border-b border-[#94a3b8] w-36 ml-auto"></div>
          <div className="text-[10px] font-extrabold text-[#0f172a]">Authorized Signatory</div>
          <div className="text-[9px] text-[#64748b]">Reception & Patient Relations</div>
        </div>
      </div>

      {/* 8. FOOTER NOTE */}
      <div className="mt-4 pt-2 border-t border-[#e2e8f0] text-center text-[10px] text-[#94a3b8]">
        {clinicProfile.name} · {clinicProfile.address} · Helpline: {clinicProfile.phone} · Emergency: {clinicProfile.emergencyPhone}
      </div>
    </div>
  );
};
