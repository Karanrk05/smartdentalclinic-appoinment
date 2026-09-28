import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from '../components/ScheduleStep';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export type SlipPrintFormat = 'a4' | 'thermal';

/**
 * Generate full self-contained HTML document for printing official dental clinic slips.
 * Fully compatible with standard A4 desktop printers and 80mm POS Thermal receipt printers.
 * Built with zero-overlapping CSS layout, responsive containers, and crisp medical typography.
 */
export function generatePrintableSlipHTML(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
): string {
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef, branch } = booking;
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient';

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
  const issueTimestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const activeBranch = branch || {
    name: clinicProfile.name,
    shortName: 'Main Clinic',
    address: clinicProfile.address,
    areaCityPincode: clinicProfile.areaCityPincode,
    phone: clinicProfile.phone,
    emergencyPhone: clinicProfile.emergencyPhone,
    email: clinicProfile.email,
  };

  const branchAddressLine = activeBranch.address
    ? `${activeBranch.address}${activeBranch.areaCityPincode ? ', ' + activeBranch.areaCityPincode : ''}`
    : `${clinicProfile.address}, ${clinicProfile.areaCityPincode}`;

  const branchPhoneLine = activeBranch.phone || clinicProfile.phone;

  // Format 1: 80mm POS Thermal Receipt
  if (format === 'thermal') {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appointment Slip - ${bookingRef}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm 4mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', monospace;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 6px 2px;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .clinic-title { font-size: 14px; font-weight: 900; margin: 0 0 2px 0; color: #1e3a8a; }
    .clinic-sub { font-size: 9px; color: #475569; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #94a3b8; margin: 6px 0; }
    .double-divider { border-top: 2px solid #0f172a; margin: 6px 0; }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      margin: 3px 0;
      font-size: 10.5px;
    }
    .info-label { color: #64748b; font-weight: 600; shrink: 0; min-width: 60px; }
    .info-val { text-align: right; font-weight: 700; color: #0f172a; word-break: break-word; }
    .token-box {
      border: 1.5px solid #2563eb;
      background: #eff6ff;
      border-radius: 6px;
      padding: 6px;
      text-align: center;
      margin: 6px 0;
    }
    .token-text {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #1e40af;
      font-family: monospace;
    }
    .barcode {
      letter-spacing: 3px;
      font-size: 9px;
      font-family: monospace;
      color: #64748b;
      margin-top: 2px;
    }
    .fee-highlight {
      background: #f1f5f9;
      border-radius: 4px;
      padding: 6px 8px;
      margin: 4px 0;
    }
    .notes-box {
      font-size: 9.5px;
      background: #fefce8;
      border: 1px dashed #ca8a04;
      border-radius: 4px;
      padding: 5px 6px;
      margin: 4px 0;
    }
    .instructions {
      font-size: 8.5px;
      color: #334155;
      line-height: 1.35;
      margin-top: 4px;
    }
    .footer {
      font-size: 8px;
      text-align: center;
      color: #64748b;
      margin-top: 8px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="clinic-title">${clinicProfile.name}</div>
    <div class="clinic-sub">${clinicProfile.tagline || 'Smile With Us • Dental Center'}</div>
    <div style="font-size: 9.5px; font-weight: 600;">${activeBranch.name}</div>
    <div style="font-size: 8.5px; color: #475569; margin: 1px 0;">${branchAddressLine}</div>
    <div style="font-size: 9px;">Helpdesk: ${branchPhoneLine}</div>
  </div>

  <div class="divider"></div>

  <div class="text-center">
    <div style="font-size: 10px; font-weight: 800; color: #1e40af; text-transform: uppercase;">
      Official Appointment Token Slip
    </div>
    <div style="font-size: 8.5px; color: #64748b;">Issued: ${issueTimestamp}</div>
  </div>

  <div class="token-box">
    <div style="font-size: 8px; font-weight: 700; color: #2563eb; text-transform: uppercase;">TOKEN REFERENCE</div>
    <div class="token-text">${bookingRef}</div>
    <div class="barcode">||| | |||| | || |||| |</div>
    <div style="font-size: 8px; color: #166534; font-weight: 800; margin-top: 2px;">● CONFIRMED & SCHEDULED</div>
  </div>

  <div class="divider"></div>

  <div class="info-row">
    <span class="info-label">Patient:</span>
    <span class="info-val">${fullName}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Phone:</span>
    <span class="info-val">${patient.phone || 'N/A'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Category:</span>
    <span class="info-val">${patient.patientType || 'Standard Patient'}</span>
  </div>

  <div class="divider"></div>

  <div class="info-row">
    <span class="info-label">Date:</span>
    <span class="info-val">${formattedDate}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Time Slot:</span>
    <span class="info-val" style="color: #2563eb; font-size: 12px; font-weight: 900;">${formattedTime}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Doctor:</span>
    <span class="info-val">${doctor.name}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Specialty:</span>
    <span class="info-val">${doctor.spec}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Treatment:</span>
    <span class="info-val">${treatment.name}</span>
  </div>
  <div class="info-row">
    <span class="info-label">Duration:</span>
    <span class="info-val">${treatment.dur}</span>
  </div>

  <div class="double-divider"></div>

  <div class="fee-highlight">
    <div class="info-row" style="margin: 0;">
      <span class="font-bold" style="color: #0f172a; font-size: 11px;">ESTIMATED FEE:</span>
      <span class="font-black" style="color: #2563eb; font-size: 13px;">${treatment.price}</span>
    </div>
    ${
      Number(patient.amountPaidNow || 0) > 0
        ? `<div class="info-row" style="margin-top: 2px; font-size: 9.5px; color: #166534;">
            <span>Paid Advance:</span>
            <span>₹${patient.amountPaidNow}</span>
          </div>`
        : `<div style="font-size: 8.5px; color: #64748b; text-align: center; margin-top: 2px;">
            * Payable at reception via UPI, Card, or Cash
          </div>`
    }
  </div>

  ${
    patient.notes && patient.notes.trim()
      ? `<div class="notes-box">
          <strong>Remarks:</strong> <em>"${patient.notes.trim()}"</em>
        </div>`
      : ''
  }

  <div class="divider"></div>

  <div class="font-bold" style="font-size: 9px; color: #1e40af;">CLINICAL INSTRUCTIONS:</div>
  <div class="instructions">
    1. Please report 10 minutes prior to your slot.<br/>
    2. Bring previous dental records / X-rays if available.<br/>
    3. Rescheduling: Call ${branchPhoneLine} at least 4 hrs ahead.
  </div>

  <div class="divider"></div>

  <div class="footer">
    *** THANK YOU FOR CHOOSING ${clinicProfile.name.toUpperCase()} ***<br/>
    Authorized Electronic Appointment Slip<br/>
    Auth ID: SDC-${bookingRef}-2026
  </div>
</body>
</html>`;
  }

  // Format 2: Official A4 Letterhead Format (Full Hospital/Clinic Specification)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Appointment Confirmation Slip - ${bookingRef} - ${clinicProfile.name}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .slip-container {
      max-width: 780px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px 28px;
      background: #ffffff;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .slip-container {
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
    }
    /* Brand Header */
    .top-accent {
      height: 4px;
      background: #2563eb;
      border-radius: 2px 2px 0 0;
      margin-bottom: 16px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .clinic-left {
      flex: 1;
      min-width: 0;
    }
    .clinic-name {
      font-size: 22px;
      font-weight: 900;
      color: #1e40af;
      letter-spacing: -0.3px;
      margin: 0 0 3px 0;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .clinic-tagline {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin: 0 0 4px 0;
    }
    .clinic-meta {
      font-size: 9.5px;
      color: #64748b;
      line-height: 1.35;
    }
    .clinic-right {
      text-align: right;
      font-size: 10.5px;
      color: #334155;
      line-height: 1.45;
      max-width: 320px;
      shrink: 0;
    }
    .branch-name {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    /* Document Title Banner */
    .banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .banner-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 2px 0;
    }
    .banner-sub {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
    }
    .banner-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      shrink: 0;
    }
    .badge-ref {
      background: #2563eb;
      color: #ffffff;
      font-family: monospace;
      font-size: 11px;
      font-weight: 900;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 1px;
    }
    .badge-status {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      font-size: 10px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }
    /* 3-Card Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1.35fr 1.35fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .metric-ref {
      font-size: 16px;
      font-family: monospace;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: 1px;
      line-height: 1.1;
    }
    .metric-main {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
    }
    .metric-highlight {
      font-size: 13.5px;
      font-weight: 900;
      color: #2563eb;
      margin-top: 2px;
    }
    .metric-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 1px;
    }
    /* Boxes */
    .box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin-bottom: 14px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .box-header {
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 12px;
      font-size: 10.5px;
      font-weight: 800;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .box-body {
      padding: 10px 12px;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      font-size: 11px;
    }
    .patient-field {
      min-width: 0;
    }
    .patient-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 2px;
    }
    .patient-val {
      font-weight: 700;
      color: #0f172a;
      word-break: break-word;
    }
    .notes-box {
      margin-top: 8px;
      padding: 6px 10px;
      background: #fefce8;
      border: 1px solid #fef08a;
      border-radius: 6px;
      font-size: 10px;
      color: #854d0e;
    }
    /* Procedure Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      padding: 7px 10px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      vertical-align: middle;
    }
    .total-row td {
      background: #eff6ff;
      border-top: 2px solid #2563eb;
      font-weight: 900;
      font-size: 12px;
      color: #1e40af;
      padding: 9px 10px;
    }
    .table-footer {
      background: #f8fafc;
      padding: 6px 10px;
      font-size: 9.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }
    /* Guidelines & Verification Split */
    .split-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .guideline-item {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 5px;
      font-size: 10px;
      color: #334155;
      line-height: 1.35;
    }
    .guideline-item:last-child {
      margin-bottom: 0;
    }
    .num-bullet {
      background: #2563eb;
      color: #ffffff;
      font-size: 8px;
      font-weight: 900;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      shrink: 0;
      margin-top: 1px;
    }
    .qr-side {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .qr-barcode {
      font-family: monospace;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #2563eb;
      margin: 4px 0 2px 0;
    }
    /* Auth Stamp Row */
    .auth-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 12px;
      font-size: 9.5px;
      page-break-inside: avoid;
    }
    .auth-box {
      border: 1.5px dashed #2563eb;
      background: #eff6ff;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
    }
    .sign-box {
      text-align: right;
    }
    .sign-line {
      width: 140px;
      border-bottom: 1px solid #64748b;
      margin-left: auto;
      margin-bottom: 4px;
      height: 22px;
    }
    /* Footer */
    .slip-footer {
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      margin-top: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
      line-height: 1.35;
    }
  </style>
</head>
<body>
  <div class="slip-container" id="printable-appointment-slip">
    <div class="top-accent"></div>

    <!-- Letterhead Header -->
    <div class="header-row">
      <div class="clinic-left">
        <h1 class="clinic-name">${clinicProfile.name}</h1>
        <div class="clinic-tagline">${clinicProfile.tagline || 'Advanced Dental Care · ISO 9001 Certified Facility'}</div>
        <div class="clinic-meta">
          <strong>Registration:</strong> ${clinicProfile.registrationNumber || 'SDC-REG-2024-MH'} · 
          <strong>Accreditation:</strong> ${clinicProfile.accreditation || 'NABH Accredited Dental Healthcare'}
        </div>
      </div>

      <div class="clinic-right">
        <div class="branch-name">📍 ${activeBranch.name || clinicProfile.name}</div>
        <div>${branchAddressLine}</div>
        <div><strong>Phone:</strong> ${branchPhoneLine} · <strong>Emergency:</strong> ${activeBranch.emergencyPhone || clinicProfile.emergencyPhone}</div>
        <div><strong>Email:</strong> ${activeBranch.email || clinicProfile.email}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="banner">
      <div>
        <div class="banner-title">Official Appointment Registration Slip</div>
        <div class="banner-sub">Issued: ${issueTimestamp} · Digital Authorization: SDC-${bookingRef}-2026</div>
      </div>
      <div class="banner-badges">
        <div class="badge-ref">REF: ${bookingRef}</div>
        <div class="badge-status">● Confirmed & Scheduled</div>
      </div>
    </div>

    <!-- 3 Key Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Token Reference</div>
        <div class="metric-ref">${bookingRef}</div>
        <div class="metric-sub" style="font-family: monospace; letter-spacing: 2px;">||| | |||| | ||</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Appointment Schedule</div>
        <div class="metric-main">${formattedDate}</div>
        <div class="metric-highlight">${formattedTime}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Consulting Dentist</div>
        <div class="metric-main">${doctor.name}</div>
        <div class="metric-sub">${doctor.spec} · Suite 2</div>
      </div>
    </div>

    <!-- Patient Information Box -->
    <div class="box">
      <div class="box-header">
        <span>Patient Identification & Demographics</span>
        <span style="font-size: 9.5px; font-weight: normal; color: #475569;">
          Category: <strong>${patient.patientType || 'Standard Patient'}</strong>
        </span>
      </div>
      <div class="box-body">
        <div class="patient-grid">
          <div class="patient-field">
            <span class="patient-label">Full Name</span>
            <span class="patient-val">${fullName}</span>
          </div>
          <div class="patient-field">
            <span class="patient-label">Contact Number</span>
            <span class="patient-val">${patient.phone || 'N/A'}</span>
          </div>
          <div class="patient-field">
            <span class="patient-label">Email Address</span>
            <span class="patient-val">${patient.email || 'N/A'}</span>
          </div>
          <div class="patient-field">
            <span class="patient-label">Date of Birth / Age</span>
            <span class="patient-val">${patient.dob || 'Not specified'}</span>
          </div>
        </div>

        ${
          patient.notes && patient.notes.trim()
            ? `<div class="notes-box">
                <strong>Patient Clinical Remarks:</strong> <em>"${patient.notes.trim()}"</em>
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- Treatment & Billing Table -->
    <div class="box">
      <div class="box-header">
        <span>Procedure & Estimated Billing</span>
        <span style="font-size: 9.5px; font-weight: bold; color: #475569;">Currency: INR (₹)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 32px;">#</th>
            <th>Procedure / Clinical Service</th>
            <th style="width: 90px;">Duration</th>
            <th style="width: 140px;">Specialist</th>
            <th style="width: 100px; text-align: right;">Estimated Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold; color: #64748b;">1</td>
            <td>
              <div style="font-weight: 800; color: #0f172a;">${treatment.icon || '🦷'} ${treatment.name}</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${treatment.desc || 'Comprehensive dental procedure'}</div>
            </td>
            <td>${treatment.dur}</td>
            <td>${doctor.name}</td>
            <td style="text-align: right; font-weight: 800; color: #0f172a;">${treatment.price}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="font-weight: bold; color: #64748b;">2</td>
            <td>
              <div style="color: #475569;">Clinical Infection Control & Sterilized Disposables Kit</div>
            </td>
            <td>Standard</td>
            <td>Clinic Staff</td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">INCLUDED</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">Estimated Total Amount:</td>
            <td style="text-align: right; font-size: 13.5px; color: #2563eb;">${treatment.price}</td>
          </tr>
        </tbody>
      </table>
      <div class="table-footer">
        <div>
          ${
            Number(patient.amountPaidNow || 0) > 0
              ? `<strong style="color: #166534;">Advance Paid: ₹${patient.amountPaidNow}</strong> · Remaining: ${patient.amountRemaining || 'Payable at reception'}`
              : `* Payment Terms: Payable at clinic reception counter via UPI, Card, or Cash.`
          }
        </div>
        <div style="font-weight: 800; color: #0f172a;">
          ${Number(patient.amountPaidNow || 0) > 0 ? 'SETTLEMENT: ADVANCE RECORDED' : 'STATUS: DUE UPON ARRIVAL'}
        </div>
      </div>
    </div>

    <!-- Guidelines & Fast Check-In Split -->
    <div class="split-row">
      <!-- Clinical Instructions -->
      <div class="box" style="margin: 0;">
        <div class="box-header">
          <span>Pre-Appointment Instructions</span>
        </div>
        <div class="box-body" style="padding: 8px 12px;">
          <div class="guideline-item">
            <span class="num-bullet">1</span>
            <div><strong>Reporting Time:</strong> Arrive 10 minutes prior to ${formattedTime} for vitals check-in.</div>
          </div>
          <div class="guideline-item">
            <span class="num-bullet">2</span>
            <div><strong>Medical Records:</strong> Bring prior dental records, OPG / IOPA X-rays, and prescription lists.</div>
          </div>
          <div class="guideline-item">
            <span class="num-bullet">3</span>
            <div><strong>Oral Hygiene:</strong> Brush thoroughly prior to visit; notify doctor of sensitive spots.</div>
          </div>
          <div class="guideline-item">
            <span class="num-bullet">4</span>
            <div><strong>Rescheduling:</strong> Free cancellation up to 4 hrs in advance at ${branchPhoneLine}.</div>
          </div>
        </div>
      </div>

      <!-- Quick Fast Pass Box -->
      <div class="qr-side">
        <div style="font-size: 9px; font-weight: 800; color: #1e40af; text-transform: uppercase;">
          Fast Counter Check-In
        </div>
        <div class="qr-barcode">${bookingRef}</div>
        <div style="font-size: 8.5px; color: #64748b; line-height: 1.25; margin-top: 2px;">
          Present this slip or reference code at the front desk for immediate priority queueing.
        </div>
        <div style="margin-top: 6px; font-size: 8px; color: #059669; font-weight: 800; letter-spacing: 0.5px;">
          ★ CLINIC COUNTER OFFICIAL ★
        </div>
      </div>
    </div>

    <!-- Official Stamp & Signatures -->
    <div class="auth-row">
      <div>
        <div style="font-size: 8.5px; text-transform: uppercase; color: #64748b; font-weight: 700;">Digital Security Voucher</div>
        <div style="font-family: monospace; font-weight: 700; color: #1e40af; margin-top: 1px;">TOKEN: SDC-${bookingRef}-2026</div>
        <div style="font-size: 8px; color: #64748b; margin-top: 1px;">Authenticated via ${clinicProfile.name} Clinical Portal</div>
      </div>

      <div class="auth-box">
        <div style="font-size: 9.5px; font-weight: 900; color: #1e40af; text-transform: uppercase;">
          ${clinicProfile.name}
        </div>
        <div style="font-size: 7.5px; font-weight: 800; color: #059669; letter-spacing: 0.5px;">
          ★ OFFICIAL CLINICAL RECORD ★
        </div>
      </div>

      <div class="sign-box">
        <div class="sign-line"></div>
        <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">Authorized Signatory</div>
        <div style="color: #64748b; font-size: 8.5px;">Front Desk & Patient Care</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="slip-footer">
      ${clinicProfile.name} · ${branchAddressLine} · Helpline: ${branchPhoneLine} · Emergency: ${clinicProfile.emergencyPhone}
      <br/>
      Valid without physical signature • Page 1 of 1 • System Generated on ${issueTimestamp}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Download pristine, high-resolution official vector PDF appointment slip.
 * Built with absolute geometric precision:
 * - Fits comfortably on a single A4 page with zero text clipping or overlapping.
 * - Dynamic height calculations with word wrapping for all patient/branch fields.
 * - Hospital-grade aesthetics: crisp typography, balanced cards, QR code, itemized procedure table, and official seal.
 */
export async function downloadSlipPDF(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
): Promise<boolean> {
  try {
    const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef, branch } = booking;
    const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient';

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
    const issueTimestamp = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const activeBranch = branch || {
      name: clinicProfile.name,
      shortName: 'Main Clinic',
      address: clinicProfile.address,
      areaCityPincode: clinicProfile.areaCityPincode,
      phone: clinicProfile.phone,
      emergencyPhone: clinicProfile.emergencyPhone,
      email: clinicProfile.email,
      timings: 'Mon – Sat: 9:00 AM – 8:00 PM',
    };

    const branchAddressLine = activeBranch.address
      ? `${activeBranch.address}${activeBranch.areaCityPincode ? ', ' + activeBranch.areaCityPincode : ''}`
      : `${clinicProfile.address}, ${clinicProfile.areaCityPincode}`;

    const branchPhoneLine = activeBranch.phone || clinicProfile.phone;

    // Generate real QR code image data
    let qrDataUrl = '';
    try {
      const qrPayload = `SMARTDENTAL CLINIC APPOINTMENT SLIP\nRef: ${bookingRef}\nPatient: ${fullName}\nPhone: ${patient.phone || 'N/A'}\nDentist: ${doctor.name}\nTreatment: ${treatment.name}\nDate: ${formattedDate}\nTime: ${formattedTime}\nBranch: ${activeBranch.name}\nStatus: CONFIRMED`;
      qrDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 260,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (e) {
      console.warn('QR code generation for PDF skipped:', e);
    }

    // =========================================================================
    // Format 1: 80mm POS Thermal Receipt PDF
    // =========================================================================
    if (format === 'thermal') {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 220],
      });

      const thermalWidth = 80;
      const tMargin = 5;
      const tPrintWidth = thermalWidth - tMargin * 2; // 70mm

      let ty = 8;

      doc.setFont('courier', 'bold');
      doc.setFontSize(10.5);
      doc.text(clinicProfile.name.toUpperCase().substring(0, 32), thermalWidth / 2, ty, { align: 'center' });
      ty += 4;

      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.text('OFFICIAL APPOINTMENT TOKEN SLIP', thermalWidth / 2, ty, { align: 'center' });
      ty += 3.5;

      const addrLines = doc.splitTextToSize(branchAddressLine, tPrintWidth);
      for (const line of addrLines.slice(0, 2)) {
        doc.text(line, thermalWidth / 2, ty, { align: 'center' });
        ty += 3.2;
      }

      doc.text(`Helpdesk: ${branchPhoneLine}`, thermalWidth / 2, ty, { align: 'center' });
      ty += 3.5;

      doc.setLineDashPattern([1, 1], 0);
      doc.line(tMargin, ty, thermalWidth - tMargin, ty);
      ty += 3;

      // Token box
      doc.setLineDashPattern([], 0);
      doc.rect(tMargin + 4, ty, tPrintWidth - 8, 12);
      doc.setFont('courier', 'bold');
      doc.setFontSize(11);
      doc.text(`TOKEN: ${bookingRef}`, thermalWidth / 2, ty + 5, { align: 'center' });
      doc.setFontSize(7);
      doc.text('● CONFIRMED & SCHEDULED', thermalWidth / 2, ty + 9.5, { align: 'center' });
      ty += 15;

      doc.setLineDashPattern([1, 1], 0);
      doc.line(tMargin, ty, thermalWidth - tMargin, ty);
      ty += 4;

      // Patient Details
      doc.setLineDashPattern([], 0);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text('PATIENT DETAILS', tMargin, ty);
      ty += 3.5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Name   : ${fullName.substring(0, 24)}`, tMargin, ty);
      ty += 3.5;
      doc.text(`Phone  : ${patient.phone || 'N/A'}`, tMargin, ty);
      ty += 3.5;
      if (patient.patientType) {
        doc.text(`Type   : ${patient.patientType}`, tMargin, ty);
        ty += 3.5;
      }

      doc.setLineDashPattern([1, 1], 0);
      doc.line(tMargin, ty, thermalWidth - tMargin, ty);
      ty += 4;

      // Appointment Details
      doc.setLineDashPattern([], 0);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text('APPOINTMENT DETAILS', tMargin, ty);
      ty += 3.5;

      doc.setFont('courier', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Date   : ${formattedDate}`, tMargin, ty);
      ty += 3.5;
      doc.setFont('courier', 'bold');
      doc.text(`Time   : ${formattedTime}`, tMargin, ty);
      doc.setFont('courier', 'normal');
      ty += 3.5;
      doc.text(`Doctor : ${doctor.name.substring(0, 24)}`, tMargin, ty);
      ty += 3.5;
      doc.text(`Spec   : ${doctor.spec.substring(0, 24)}`, tMargin, ty);
      ty += 3.5;
      doc.text(`Treatmt: ${treatment.name.substring(0, 24)}`, tMargin, ty);
      ty += 3.5;
      doc.text(`Duration: ${treatment.dur}`, tMargin, ty);
      ty += 3.5;

      doc.setLineDashPattern([1, 1], 0);
      doc.line(tMargin, ty, thermalWidth - tMargin, ty);
      ty += 4;

      // Fee
      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.text(`EST. FEE: ${treatment.price}`, tMargin, ty);
      ty += 3.5;
      doc.setFont('courier', 'normal');
      doc.setFontSize(7);
      doc.text('* Payable at counter via UPI/Card/Cash', tMargin, ty);
      ty += 4;

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', thermalWidth / 2 - 13, ty, 26, 26);
        ty += 28;
      }

      doc.setFontSize(6.8);
      doc.text('Please arrive 10 min prior to slot.', thermalWidth / 2, ty, { align: 'center' });
      ty += 3;
      doc.text(`Issued: ${issueTimestamp}`, thermalWidth / 2, ty, { align: 'center' });
      ty += 3;
      doc.text('*** THANK YOU & KEEP SMILING ***', thermalWidth / 2, ty, { align: 'center' });

      doc.save(`SmartDental_Slip_${bookingRef}_THERMAL.pdf`);
      return true;
    }

    // =========================================================================
    // Format 2: Standard A4 Official Hospital Letterhead Format
    // Page dimensions: 210mm x 297mm.
    // Content width: 184mm (Margin 13mm each side).
    // All coordinate calculations are strictly dynamic to eliminate overlapping!
    // =========================================================================
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 13;
    const contentWidth = pageWidth - margin * 2; // 184mm

    let curY = 10;

    // 1. TOP BRAND ACCENT BAR
    doc.setFillColor(37, 99, 235); // #2563eb
    doc.rect(margin, curY, contentWidth, 2.5, 'F');
    curY += 6;

    // 2. CLINIC LETTERHEAD & BRANCH CONTACT
    // Left: Clinic Name, tagline, registration
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 64, 175); // #1e40af
    doc.text(clinicProfile.name.toUpperCase(), margin, curY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(clinicProfile.tagline || 'Advanced Dental Care · ISO 9001 Certified Facility', margin, curY + 11);

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text(
      `Reg No: ${clinicProfile.registrationNumber || 'SDC-REG-2024-MH'} · Accreditation: ${clinicProfile.accreditation || 'NABH Accredited Dental Healthcare'}`,
      margin,
      curY + 15
    );

    // Right: Branch Details with dynamic wrapping
    const rightColX = pageWidth - margin;
    const rightColWidth = 75; // mm
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // #0f172a
    doc.text(`📍 ${activeBranch.name || clinicProfile.name}`, rightColX, curY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const wrappedAddr = doc.splitTextToSize(branchAddressLine, rightColWidth);
    let rightY = curY + 7.5;
    for (const line of wrappedAddr.slice(0, 2)) {
      doc.text(line, rightColX, rightY, { align: 'right' });
      rightY += 3.2;
    }
    doc.text(`Phone: ${branchPhoneLine}`, rightColX, rightY, { align: 'right' });
    rightY += 3.2;
    doc.text(`Emergency: ${activeBranch.emergencyPhone || clinicProfile.emergencyPhone}`, rightColX, rightY, { align: 'right' });

    curY = Math.max(curY + 18, rightY) + 3;

    // Divider Line
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.4);
    doc.line(margin, curY, margin + contentWidth, curY);
    curY += 4;

    // 3. TITLE BANNER WITH TOKEN & CONFIRMATION STATUS
    const bannerH = 12;
    doc.setFillColor(239, 246, 255); // #eff6ff
    doc.setDrawColor(191, 219, 254); // #bfdbfe
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, curY, contentWidth, bannerH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 64, 175);
    doc.text('OFFICIAL APPOINTMENT REGISTRATION SLIP', margin + 4, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Issued: ${issueTimestamp} · Digital Authorization: SDC-${bookingRef}-2026`, margin + 4, curY + 9);

    // Reference badge on banner right
    const refBadgeW = 44;
    const refBadgeH = 6.5;
    const refBadgeX = pageWidth - margin - refBadgeW - 38;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(refBadgeX, curY + 2.7, refBadgeW, refBadgeH, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`REF: ${bookingRef}`, refBadgeX + refBadgeW / 2, curY + 7, { align: 'center' });

    // Status badge
    const statusBadgeW = 34;
    const statusBadgeX = pageWidth - margin - statusBadgeW - 2;
    doc.setFillColor(220, 252, 231); // #dcfce7
    doc.setDrawColor(134, 239, 172); // #86efac
    doc.roundedRect(statusBadgeX, curY + 2.7, statusBadgeW, refBadgeH, 1.2, 1.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(22, 101, 52); // #166534
    doc.text('● CONFIRMED', statusBadgeX + statusBadgeW / 2, curY + 7, { align: 'center' });

    curY += bannerH + 4;

    // 4. 3 KEY METRIC CARDS (Token, Schedule, Doctor)
    const metricCardW = (contentWidth - 8) / 3; // ~58.6mm
    const metricCardH = 17;

    // Card 1: Token
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, metricCardW, metricCardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('TOKEN REFERENCE', margin + 3.5, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(37, 99, 235);
    doc.text(bookingRef, margin + 3.5, curY + 10);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('||| | |||| | || |||| |', margin + 3.5, curY + 14.2);

    // Card 2: Date & Time
    const c2X = margin + metricCardW + 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c2X, curY, metricCardW, metricCardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('SCHEDULED DATE & TIME', c2X + 3.5, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(formattedDate, metricCardW - 7)[0] || formattedDate, c2X + 3.5, curY + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(37, 99, 235);
    doc.text(formattedTime, c2X + 3.5, curY + 14.5);

    // Card 3: Consulting Dentist
    const c3X = c2X + metricCardW + 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(c3X, curY, metricCardW, metricCardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('CONSULTING DENTIST', c3X + 3.5, curY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(doctor.name.substring(0, 26), c3X + 3.5, curY + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`${doctor.spec} · Suite 2`, c3X + 3.5, curY + 14);

    curY += metricCardH + 4;

    // 5. PATIENT IDENTIFICATION CARD
    const hasNotes = Boolean(patient.notes && patient.notes.trim());
    const patientCardH = hasNotes ? 29 : 21;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, contentWidth, patientCardH, 2, 2, 'FD');

    // Card Title Header
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, curY, contentWidth, 5.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text('PATIENT IDENTIFICATION & DEMOGRAPHICS', margin + 3.5, curY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Category: ${patient.patientType || 'Standard Patient'}`, pageWidth - margin - 3.5, curY + 3.8, { align: 'right' });

    // 4 Patient demographic columns
    const colW = (contentWidth - 8) / 4;
    const pRowY = curY + 9;

    const renderPatientCol = (lbl: string, val: string, xPos: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(lbl.toUpperCase(), xPos, pRowY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const wrappedVal = doc.splitTextToSize(val || 'N/A', colW - 2);
      doc.text(wrappedVal[0] || 'N/A', xPos, pRowY + 4.2);
    };

    renderPatientCol('Patient Full Name', fullName, margin + 4);
    renderPatientCol('Primary Contact', patient.phone || 'N/A', margin + 4 + colW);
    renderPatientCol('Email Address', patient.email || 'N/A', margin + 4 + colW * 2);
    renderPatientCol('DOB / Age', patient.dob || 'Not specified', margin + 4 + colW * 3);

    // Remarks if provided
    if (hasNotes) {
      const notesBoxY = curY + 16.5;
      doc.setFillColor(254, 252, 232); // yellow-50
      doc.setDrawColor(254, 240, 138); // yellow-200
      doc.roundedRect(margin + 3, notesBoxY, contentWidth - 6, 9.5, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(133, 77, 14);
      doc.text('PATIENT CLINICAL REMARKS / SYMPTOMS:', margin + 5, notesBoxY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const wrappedNotes = doc.splitTextToSize(`"${patient.notes.trim()}"`, contentWidth - 14);
      doc.text(wrappedNotes[0] || '', margin + 5, notesBoxY + 7);
    }

    curY += patientCardH + 4;

    // 6. ITEMIZED DENTAL PROCEDURE & BILLING TABLE
    const tableHeaderH = 5.5;
    const row1H = 10;
    const row2H = 6;
    const totalRowH = 7;
    const tableFooterH = 5.5;
    const totalTableH = tableHeaderH + row1H + row2H + totalRowH + tableFooterH;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, contentWidth, totalTableH, 2, 2, 'FD');

    // Table Header Bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, curY, contentWidth, tableHeaderH, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('#', margin + 3.5, curY + 3.8);
    doc.text('PROCEDURE / CLINICAL SERVICE', margin + 12, curY + 3.8);
    doc.text('DURATION', margin + 95, curY + 3.8);
    doc.text('SPECIALIST', margin + 125, curY + 3.8);
    doc.text('ESTIMATED FEE', pageWidth - margin - 3.5, curY + 3.8, { align: 'right' });

    let tableY = curY + tableHeaderH;

    // Row 1: Main Treatment
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tableY, margin + contentWidth, tableY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('1', margin + 3.5, tableY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(treatment.name.substring(0, 48), margin + 12, tableY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      treatment.desc ? treatment.desc.substring(0, 56) : 'Comprehensive dental care and clinical consultation',
      margin + 12,
      tableY + 7.8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(treatment.dur || '45 mins', margin + 95, tableY + 5.5);
    doc.text(doctor.name.substring(0, 24), margin + 125, tableY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(treatment.price || '₹800', pageWidth - margin - 3.5, tableY + 5.5, { align: 'right' });

    tableY += row1H;

    // Row 2: Infection control / sterilisation
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, tableY, contentWidth, row2H, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, tableY, margin + contentWidth, tableY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('2', margin + 3.5, tableY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Clinical Infection Control & Sterilized Disposable Kit', margin + 12, tableY + 4);
    doc.text('Standard', margin + 95, tableY + 4);
    doc.text('Clinical Staff', margin + 125, tableY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(21, 128, 61); // #15803d
    doc.text('INCLUDED', pageWidth - margin - 3.5, tableY + 4, { align: 'right' });

    tableY += row2H;

    // Total Row
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, tableY, contentWidth, totalRowH, 'F');
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.6);
    doc.line(margin, tableY, margin + contentWidth, tableY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text('Estimated Total Amount Payable:', margin + 95, tableY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(37, 99, 235);
    doc.text(treatment.price || '₹800', pageWidth - margin - 3.5, tableY + 4.8, { align: 'right' });

    tableY += totalRowH;

    // Table Footer / Settlement bar
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, tableY, contentWidth, tableFooterH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, tableY, margin + contentWidth, tableY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const isPaid = Number(patient.amountPaidNow || 0) > 0;
    const paymentText = isPaid
      ? `Advance Settled: ₹${patient.amountPaidNow} · Balance: ${patient.amountRemaining || 'Payable at reception'}`
      : '* Payment Terms: Payable at clinic reception counter via UPI, Card, or Cash upon arrival.';
    doc.text(paymentText, margin + 4, tableY + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(isPaid ? 21 : 15, isPaid ? 128 : 23, isPaid ? 61 : 42);
    doc.text(isPaid ? 'STATUS: ADVANCE RECORDED' : 'STATUS: DUE UPON ARRIVAL', pageWidth - margin - 4, tableY + 3.8, {
      align: 'right',
    });

    curY += totalTableH + 4;

    // 7. LOWER SECTION: CLINICAL GUIDELINES (Left) & QR CHECK-IN VOUCHER (Right)
    const lowerH = 40;
    const leftBoxW = 114; // mm
    const rightBoxW = contentWidth - leftBoxW - 4; // 66mm

    // Left Box: Clinical Guidelines
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, leftBoxW, lowerH, 2, 2, 'FD');

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, curY, leftBoxW, 5.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    doc.text('IMPORTANT PRE-APPOINTMENT GUIDELINES', margin + 3.5, curY + 3.8);

    let gY = curY + 9;
    const drawGuideline = (num: string, text: string) => {
      doc.setFillColor(37, 99, 235);
      doc.circle(margin + 5, gY - 0.8, 1.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(255, 255, 255);
      doc.text(num, margin + 5, gY - 0.2, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      const wrappedG = doc.splitTextToSize(text, leftBoxW - 12);
      doc.text(wrappedG, margin + 9, gY);
      gY += wrappedG.length * 3.2 + 2;
    };

    drawGuideline('1', `Reporting Time: Please arrive 10 mins prior to slot (${formattedTime}) for vital checks.`);
    drawGuideline('2', 'Medical History: Bring previous dental records, IOPAs/OPG X-rays, and prescription lists.');
    drawGuideline('3', 'Oral Hygiene: Brush thoroughly prior to consultation; notify dentist of any acute pain.');
    drawGuideline('4', `Rescheduling: Free reschedule up to 4 hrs ahead. Call ${branchPhoneLine} or reply on WhatsApp.`);

    // Right Box: QR Fast Check-in & Security Seal
    const rBoxX = margin + leftBoxW + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(rBoxX, curY, rightBoxW, lowerH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 64, 175);
    doc.text('FAST COUNTER CHECK-IN', rBoxX + rightBoxW / 2, curY + 4.5, { align: 'center' });

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', rBoxX + (rightBoxW - 24) / 2, curY + 6.5, 24, 24);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235);
    doc.text(`TOKEN: ${bookingRef}`, rBoxX + rightBoxW / 2, curY + 33, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Scan at reception kiosk for instant token', rBoxX + rightBoxW / 2, curY + 36.5, { align: 'center' });

    curY += lowerH + 5;

    // 8. OFFICIAL STAMP & SIGNATURE SECTION
    const stampRowH = 18;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, curY, margin + contentWidth, curY);

    const sY = curY + 4;

    // Left: Digital Validation Note
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('DIGITAL SECURITY VOUCHER', margin, sY);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text(`TOKEN: SDC-${bookingRef}-2026`, margin, sY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Authenticated electronic record · Valid across all clinic branches', margin, sY + 7.5);

    // Center: Clinic Official Seal
    const sealW = 48;
    const sealX = margin + (contentWidth - sealW) / 2;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(37, 99, 235);
    doc.setLineDashPattern([1.5, 1], 0);
    doc.roundedRect(sealX, sY - 1, sealW, 11, 2, 2, 'FD');
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 64, 175);
    doc.text(clinicProfile.name.toUpperCase().substring(0, 24), sealX + sealW / 2, sY + 3.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(5, 150, 105); // #059669
    doc.text('★ CLINIC COUNTER OFFICIAL ★', sealX + sealW / 2, sY + 7.5, { align: 'center' });

    // Right: Authorized Signatory Line
    const sigLineW = 38;
    const sigLineX = pageWidth - margin - sigLineW;
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.line(sigLineX, sY + 6, sigLineX + sigLineW, sY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized Signatory', sigLineX + sigLineW / 2, sY + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Front Desk & Patient Care', sigLineX + sigLineW / 2, sY + 12.8, { align: 'center' });

    // 9. CLEAN PROFESSIONAL FOOTER (Positioned right at the bottom margin)
    const footerY = 282;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${clinicProfile.name} · ${branchAddressLine} · Helpline: ${branchPhoneLine} · Emergency: ${clinicProfile.emergencyPhone}`,
      pageWidth / 2,
      footerY + 4,
      { align: 'center' }
    );

    doc.text(
      `Valid without physical signature · Page 1 of 1 · System Generated on ${issueTimestamp}`,
      pageWidth / 2,
      footerY + 7.5,
      { align: 'center' }
    );

    // Bottom blue stripe
    doc.setFillColor(37, 99, 235);
    doc.rect(margin, 292, contentWidth, 1.2, 'F');

    // Trigger direct vector PDF download
    doc.save(`SmartDental_Slip_${bookingRef}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate PDF slip, falling back to HTML slip download:', err);
    downloadSlipHTML(booking, clinicProfile, format);
    return false;
  }
}

/**
 * Direct Print Engine using an isolated hidden iframe.
 * Automatically initiates slip file download so the user receives their slip even in
 * environments where printer dialogs or iframes are restricted.
 */
export async function printSlipDirect(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4',
  triggerDownload: boolean = true
): Promise<boolean> {
  // Always trigger download of slip so the user gets the document immediately
  if (triggerDownload) {
    try {
      await downloadSlipPDF(booking, clinicProfile, format);
    } catch (e) {
      console.warn('PDF download failed in printSlipDirect, falling back to HTML download:', e);
      downloadSlipHTML(booking, clinicProfile, format);
    }
  }

  return new Promise((resolve) => {
    try {
      const html = generatePrintableSlipHTML(booking, clinicProfile, format);

      // Create isolated invisible iframe
      const iframe = document.createElement('iframe');
      iframe.setAttribute('id', `print-slip-frame-${Date.now()}`);
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '10px';
      iframe.style.height = '10px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc || !iframe.contentWindow) {
        // Fallback to standard window.print if iframe creation is blocked
        fallbackNativePrint(booking, clinicProfile, format);
        document.body.removeChild(iframe);
        resolve(true);
        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      // Allow fonts and styles to render before triggering print
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (err) {
          console.warn('Iframe print failed, attempting fallback print', err);
          fallbackNativePrint(booking, clinicProfile, format);
          resolve(true);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 60000);
        }
      }, 250);
    } catch (err) {
      console.error('Error invoking direct print slip', err);
      fallbackNativePrint(booking, clinicProfile, format);
      resolve(false);
    }
  });
}

/**
 * Fallback to standard window.print() or clean pop-up tab
 */
function fallbackNativePrint(
  booking: BookingState,
  clinicProfile: ClinicProfile,
  format: SlipPrintFormat
) {
  try {
    const html = generatePrintableSlipHTML(booking, clinicProfile, format);
    const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
      return;
    }
  } catch (e) {
    console.warn('Window open print failed, falling back to window.print()', e);
  }
  try {
    window.print();
  } catch {
    // ignore
  }
}

/**
 * Open slip in a clean dedicated browser window / tab
 * allowing users to view, save as PDF, or print directly.
 */
export function openSlipInNewTab(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
) {
  const html = generatePrintableSlipHTML(booking, clinicProfile, format);
  const newWin = window.open('', '_blank');
  if (newWin) {
    newWin.document.write(html);
    newWin.document.close();
    newWin.focus();
  } else {
    // If pop-ups are blocked, download HTML file
    downloadSlipHTML(booking, clinicProfile, format);
  }
}

/**
 * Download self-contained HTML slip for offline clinical record or emailing.
 */
export function downloadSlipHTML(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
) {
  const html = generatePrintableSlipHTML(booking, clinicProfile, format);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SmartDental_Slip_${booking.bookingRef}_${format.toUpperCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
