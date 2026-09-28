import React, { useEffect, useState } from 'react';
import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from './ScheduleStep';
import { MapPin, Phone, Mail, Globe, Calendar, Clock, User, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import { SmartDentalLogo } from './SmartDentalLogo';
import QRCode from 'qrcode';

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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef } = booking;

  useEffect(() => {
    if (!bookingRef) return;
    const dateStr = selectedDate instanceof Date ? selectedDate.toDateString() : String(selectedDate);
    const payload = `SMARTDENTAL APPOINTMENT SLIP\nRef: ${bookingRef}\nPatient: ${patient.firstName} ${patient.lastName}\nDoctor: ${doctor?.name}\nDate: ${dateStr}\nTime: ${selectedTime}`;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 240,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then(setQrCodeUrl)
      .catch((err) => console.warn('QR code gen warning:', err));
  }, [bookingRef, selectedDate, selectedTime, patient.firstName, patient.lastName, doctor?.name]);

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
    ? `${booking.branch.address}${booking.branch.areaCityPincode ? ', ' + booking.branch.areaCityPincode : ''}`
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
          <div className="text-[10px] text-slate-700">{clinicProfile.tagline}</div>
          <div className="text-[10px] font-bold">{booking.branch?.name || clinicProfile.name}</div>
          <div className="text-[9px] text-slate-600 break-words">{branchAddressLine}</div>
          <div className="text-[10px]">Ph: {branchPhoneLine}</div>
        </div>

        <div className="py-2 text-center border-b border-dashed border-black">
          <div className="text-[10px] font-black uppercase text-blue-900">APPOINTMENT SLIP / TOKEN</div>
          <div className="text-[9px] text-slate-500">Issued: {issueDate}</div>
          <div className="mt-1 border border-black bg-slate-50 p-1.5 font-black text-sm tracking-widest">
            {bookingRef}
          </div>
          <div className="text-[9px] tracking-widest mt-0.5 text-slate-600">||| | |||| | || |||| |</div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Patient:</span>
            <span className="font-extrabold text-right break-words">{fullName}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Contact:</span>
            <span className="text-right">{patient.phone || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Category:</span>
            <span className="text-right">{patient.patientType || 'Standard'}</span>
          </div>
        </div>

        <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Date:</span>
            <span className="font-bold text-right">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Time Slot:</span>
            <span className="font-black text-xs text-blue-700 text-right">{formattedTime}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Doctor:</span>
            <span className="text-right">{doctor.name}</span>
          </div>
          <div className="flex justify-between items-start gap-2 text-[10px] text-slate-600">
            <span className="shrink-0">Dept:</span>
            <span className="text-right">{doctor.spec}</span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="font-bold text-slate-600 shrink-0">Procedure:</span>
            <span className="font-bold text-right break-words">{treatment.name}</span>
          </div>
          <div className="flex justify-between items-start gap-2 text-[10px]">
            <span className="shrink-0">Duration:</span>
            <span className="text-right">{treatment.dur}</span>
          </div>
        </div>

        <div className="py-2 border-b-2 border-black space-y-1 text-xs font-bold bg-slate-50 p-2 my-1 rounded">
          <div className="flex justify-between text-sm font-black">
            <span>EST. FEE:</span>
            <span className="text-blue-900">{treatment.price}</span>
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
          <div className="text-[9px] text-center font-normal text-slate-600 pt-0.5">
            * Payable at counter via UPI, Card, or Cash
          </div>
        </div>

        {patient.notes && (
          <div className="py-1.5 border-b border-dashed border-black text-[10px] bg-yellow-50/60 p-1.5 rounded">
            <span className="font-bold text-amber-900">Remarks: </span>
            <span className="italic text-slate-800 break-words">"{patient.notes}"</span>
          </div>
        )}

        {qrCodeUrl && (
          <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-black">
            <img src={qrCodeUrl} alt="QR Check-in" className="w-20 h-20" />
            <span className="text-[8px] text-slate-500 mt-1">Scan for Fast Reception Check-In</span>
          </div>
        )}

        <div className="py-2 text-[9px] space-y-0.5 border-b border-dashed border-black">
          <div className="font-bold text-slate-800">CLINIC GUIDELINES:</div>
          <div>• Arrive 10 mins prior to slot</div>
          <div>• Bring previous X-rays / health records</div>
          <div>• Reschedule: Call {branchPhoneLine} 4h prior</div>
        </div>

        <div className="pt-2 text-center text-[9px] text-slate-500 space-y-0.5">
          <div className="font-bold uppercase tracking-wider text-slate-700">*** OFFICIAL CLINIC SLIP ***</div>
          <div>SDC-{bookingRef}-2026</div>
        </div>
      </div>
    );
  }

  // Official A4 Letterhead Format (Full Hospital/Clinic Specification)
  return (
    <div
      id="printable-appointment-slip"
      className="bg-white text-[#0f172a] p-6 sm:p-8 max-w-[800px] mx-auto font-sans leading-normal border border-[#cbd5e1] rounded-xl shadow-xs print:border-none print:p-0 print:shadow-none print:max-w-full"
    >
      {/* 1. CLINIC LETTERHEAD & HEADER */}
      <div className="border-b-2 border-[#2563eb] pb-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <SmartDentalLogo className="w-12 h-12 shrink-0 drop-shadow-sm" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1e40af] tracking-tight uppercase leading-none">
                  {clinicProfile.name}
                </h1>
                <p className="text-xs font-bold text-[#475569] tracking-wide mt-1">
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
          <div className="text-left sm:text-right text-[11px] text-[#475569] space-y-0.5 shrink-0 max-w-xs">
            <div className="font-extrabold text-[#0f172a] flex sm:justify-end items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
              <span>{booking.branch?.name || clinicProfile.name}</span>
            </div>
            <div className="text-[10px] text-slate-500 break-words">
              {branchAddressLine}
            </div>
            <div className="flex sm:justify-end items-center gap-1 font-semibold">
              <Phone className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
              <span>Phone: {branchPhoneLine}</span>
            </div>
            <div className="flex sm:justify-end items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
              <span className="break-all">{clinicProfile.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DOCUMENT TITLE & STATUS BAR */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl px-4 py-2.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:bg-[#eff6ff]">
        <div>
          <span className="text-xs sm:text-sm font-black text-[#1e40af] uppercase tracking-wider block">
            Official Appointment Confirmation & Registration Slip
          </span>
          <span className="text-[10px] text-[#64748b] font-semibold">
            Issued on: {issueDate} · Verification Token: {bookingRef}-V26
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black bg-[#2563eb] text-white px-2.5 py-1 rounded-md tracking-wider">
            REF: {bookingRef}
          </span>
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Confirmed</span>
          </span>
        </div>
      </div>

      {/* 3. KEY METRICS ROW (Reference, Schedule, Doctor) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Booking Ref */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-center sm:text-left">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            Token Reference
          </div>
          <div className="text-lg font-mono font-black text-[#2563eb] tracking-wider mt-0.5">
            {bookingRef}
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-widest text-[#475569]">
            ||| | |||| | || |||| |
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#2563eb]" />
            <span>Date & Time Slot</span>
          </div>
          <div className="text-xs font-extrabold text-[#0f172a]">{formattedDate}</div>
          <div className="text-sm font-black text-[#2563eb]">{formattedTime}</div>
        </div>

        {/* Doctor */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3 text-[#2563eb]" />
            <span>Consulting Dentist</span>
          </div>
          <div className="text-xs font-extrabold text-[#0f172a]">{doctor.name}</div>
          <div className="text-[11px] font-semibold text-[#64748b]">{doctor.spec} · Suite 2</div>
        </div>
      </div>

      {/* 4. PATIENT INFORMATION SECTION */}
      <div className="border border-[#cbd5e1] rounded-xl p-3.5 mb-4">
        <div className="text-xs font-black text-[#1e40af] uppercase tracking-wider pb-2 border-b border-[#e2e8f0] flex items-center justify-between">
          <span>Patient Information</span>
          <span className="text-[10px] font-bold text-[#64748b] normal-case bg-[#f1f5f9] px-2 py-0.5 rounded">
            Category: <strong>{patient.patientType || 'Standard Patient'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 text-xs">
          <div>
            <span className="text-[10px] text-[#64748b] font-semibold block uppercase">Full Name</span>
            <strong className="text-[#0f172a] text-sm break-words">{fullName}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[#64748b] font-semibold block uppercase">Contact Number</span>
            <strong className="text-[#0f172a]">{patient.phone || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[#64748b] font-semibold block uppercase">Email Address</span>
            <strong className="text-[#0f172a] break-all block">{patient.email || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[#64748b] font-semibold block uppercase">Date of Birth / Age</span>
            <span className="text-[#0f172a] font-bold">{patient.dob || 'Not specified'}</span>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-2.5 pt-2 border-t border-[#e2e8f0] text-xs">
            <span className="text-[10px] text-[#64748b] font-bold uppercase tracking-wide block">
              Patient Remarks / Symptoms:
            </span>
            <p className="text-[#334155] italic mt-0.5 bg-[#fefce8] p-2 rounded border border-[#fef08a] break-words">
              "{patient.notes}"
            </p>
          </div>
        )}
      </div>

      {/* 5. TREATMENT & FINANCIAL ESTIMATION TABLE */}
      <div className="border border-[#cbd5e1] rounded-xl overflow-hidden mb-4">
        <div className="bg-[#f8fafc] px-4 py-2 border-b border-[#cbd5e1] flex items-center justify-between">
          <span className="text-xs font-black text-[#1e40af] uppercase tracking-wider">
            Procedure & Estimated Billing
          </span>
          <span className="text-[10px] text-[#64748b] font-bold">Currency: INR (₹)</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#eff6ff] text-[#1e40af] font-bold border-b border-[#dbeafe]">
              <th className="py-2 px-3 w-8">#</th>
              <th className="py-2 px-3">Procedure / Dental Service</th>
              <th className="py-2 px-3 w-24">Duration</th>
              <th className="py-2 px-3 w-36">Specialist</th>
              <th className="py-2 px-3 text-right w-28">Est. Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            <tr>
              <td className="py-2 px-3 font-bold text-[#64748b]">1</td>
              <td className="py-2 px-3">
                <div className="font-extrabold text-[#0f172a]">
                  {treatment.icon} {treatment.name}
                </div>
                <div className="text-[10px] text-[#64748b]">{treatment.desc}</div>
              </td>
              <td className="py-2 px-3 font-medium text-[#475569]">{treatment.dur}</td>
              <td className="py-2 px-3 font-medium text-[#475569]">{doctor.name}</td>
              <td className="py-2 px-3 text-right font-black text-[#0f172a]">{treatment.price}</td>
            </tr>
            <tr className="bg-[#f8fafc]">
              <td className="py-2 px-3 font-bold text-[#64748b]">2</td>
              <td className="py-2 px-3 text-[#475569]">Clinical Assessment & Sterilized Disposable Kit</td>
              <td className="py-2 px-3 text-[#64748b]">Standard</td>
              <td className="py-2 px-3 text-[#64748b]">Staff</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700">INCLUDED</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-[#eff6ff] border-t-2 border-[#2563eb] text-sm">
              <td colSpan={4} className="py-2.5 px-3 font-black text-[#1e40af] text-right">
                Estimated Total Amount:
              </td>
              <td className="py-2.5 px-3 text-right font-black text-[#2563eb] text-base">
                {treatment.price}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="bg-[#f8fafc] px-4 py-2 border-t border-[#e2e8f0] text-[11px] text-[#64748b] flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            {Number(patient.amountPaidNow || 0) > 0 ? (
              <span className="text-emerald-700 font-bold block">
                ✓ Advance Paid: ₹{patient.amountPaidNow} {patient.paymentRef ? `(Ref: ${patient.paymentRef})` : ''} · Remaining: {patient.amountRemaining || 'Payable at clinic'}
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

      {/* 6. GUIDELINES & FAST CHECK-IN SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Guidelines Left (2 cols) */}
        <div className="sm:col-span-2 bg-[#f8fafc] border border-[#dbeafe] rounded-xl p-3 space-y-1 text-[11px] text-[#334155]">
          <div className="font-black text-[#1e40af] flex items-center gap-1.5 uppercase tracking-wide text-xs mb-1">
            <ShieldCheck className="w-4 h-4 text-[#2563eb] shrink-0" />
            <span>Important Patient Guidelines</span>
          </div>
          <div className="space-y-1 text-[10.5px] leading-relaxed">
            <div className="flex items-start gap-1.5">
              <span className="text-[#2563eb] font-black shrink-0">1.</span>
              <span><strong>Reporting:</strong> Arrive 10 minutes prior to slot ({formattedTime}) for queue check-in.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[#2563eb] font-black shrink-0">2.</span>
              <span><strong>Medical Records:</strong> Bring past dental records, X-rays, and current prescriptions.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[#2563eb] font-black shrink-0">3.</span>
              <span><strong>Hygiene:</strong> Brush thoroughly prior to consultation; notify doctor of sensitive teeth.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[#2563eb] font-black shrink-0">4.</span>
              <span><strong>Rescheduling:</strong> Free cancellation up to 4 hrs prior ({clinicProfile.phone}).</span>
            </div>
          </div>
        </div>

        {/* QR Fast Check-in Right (1 col) */}
        <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-3 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-black text-[#1e40af] uppercase tracking-wider mb-1 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Fast Check-In</span>
          </div>
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Check-in QR" className="w-20 h-20 rounded border border-slate-200" />
          ) : (
            <div className="w-20 h-20 bg-slate-200 animate-pulse rounded" />
          )}
          <span className="font-mono text-xs font-black text-[#2563eb] mt-1 tracking-wider">{bookingRef}</span>
          <span className="text-[9px] text-[#64748b]">Scan at reception kiosk</span>
        </div>
      </div>

      {/* 7. OFFICIAL VERIFICATION & SIGNATURE STAMP */}
      <div className="pt-3 border-t border-[#cbd5e1] grid grid-cols-2 sm:grid-cols-3 gap-4 items-end text-xs">
        <div>
          <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            Digital Security Voucher
          </div>
          <div className="font-mono text-[10px] text-[#1e40af] font-bold mt-0.5">
            TOKEN: SDC-{bookingRef}-2026
          </div>
          <div className="text-[9px] text-[#64748b] mt-0.5">
            Generated via {clinicProfile.name} Cloud
          </div>
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 border-2 border-dashed border-[#2563eb] rounded-xl px-3 py-1 bg-[#eff6ff]/70">
            <SmartDentalLogo className="w-6 h-6 shrink-0" />
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
          <div className="h-6 border-b border-[#94a3b8] w-36 ml-auto"></div>
          <div className="text-[10px] font-extrabold text-[#0f172a]">Authorized Signatory</div>
          <div className="text-[9px] text-[#64748b]">Front Desk & Patient Care</div>
        </div>
      </div>

      {/* 8. FOOTER NOTE */}
      <div className="mt-3 pt-2 border-t border-[#e2e8f0] text-center text-[9px] text-[#94a3b8]">
        {clinicProfile.name} · {branchAddressLine} · Helpline: {branchPhoneLine} · Emergency: {clinicProfile.emergencyPhone}
      </div>
    </div>
  );
};
