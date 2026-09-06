import { BookingState, ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';
import { formatSlotTime } from '../components/ScheduleStep';

export type SlipPrintFormat = 'a4' | 'thermal';

interface PrintableSlipData {
  booking: BookingState;
  clinicProfile?: ClinicProfile;
  format?: SlipPrintFormat;
}

/**
 * Generate full self-contained HTML document for printing official dental clinic slips.
 * Fully compatible with standard A4 desktop printers and 80mm POS Thermal receipt printers.
 */
export function generatePrintableSlipHTML(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
): string {
  const { treatment, doctor, selectedDate, selectedTime, patient, bookingRef, branch } = booking;
  const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Valued Patient';

  const dateObj = selectedDate instanceof Date ? selectedDate : new Date(selectedDate);
  const formattedDate = isNaN(dateObj.getTime())
    ? String(selectedDate)
    : dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

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

  // Format 1: 80mm / 3-inch POS Thermal Receipt
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
      font-family: 'Courier New', Courier, monospace, sans-serif;
      width: 72mm;
      max-width: 72mm;
      margin: 0 auto;
      padding: 4px;
      color: #000;
      background: #fff;
      font-size: 11px;
      line-height: 1.3;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title { font-size: 15px; font-weight: 900; margin: 2px 0; text-transform: uppercase; }
    .subtitle { font-size: 9px; margin-bottom: 4px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin: 3px 0; }
    .ref-box {
      border: 1px solid #000;
      padding: 4px;
      text-align: center;
      margin: 6px 0;
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 2px;
    }
    .barcode {
      letter-spacing: 3px;
      font-size: 12px;
      font-family: monospace;
      margin-top: 2px;
    }
    .notes {
      font-size: 9px;
      padding: 4px;
      border: 1px dotted #444;
      margin: 4px 0;
    }
    .footer {
      font-size: 8px;
      text-align: center;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="title">${clinicProfile.name}</div>
    <div class="subtitle">${clinicProfile.tagline || 'Smile With Us'}</div>
    <div>${activeBranch.name || clinicProfile.name}</div>
    <div style="font-size: 9px;">${branchAddressLine}</div>
    <div>Ph: ${branchPhoneLine}</div>
  </div>

  <div class="divider"></div>

  <div class="center bold" style="font-size: 11px; text-transform: uppercase;">
    APPOINTMENT SLIP / TOKEN
  </div>
  <div class="center" style="font-size: 9px;">Issued: ${issueTimestamp}</div>

  <div class="ref-box">
    ${bookingRef}
    <div class="barcode">||| | |||| | || |||| |</div>
  </div>

  <div class="divider"></div>

  <div class="row"><span class="bold">Patient:</span> <span>${fullName}</span></div>
  <div class="row"><span class="bold">Contact:</span> <span>${patient.phone || 'N/A'}</span></div>
  <div class="row"><span class="bold">Category:</span> <span>${patient.patientType || 'Standard'}</span></div>

  <div class="divider"></div>

  <div class="row"><span class="bold">Date:</span> <span class="bold">${formattedDate}</span></div>
  <div class="row"><span class="bold">Time Slot:</span> <span class="bold" style="font-size: 13px;">${formattedTime}</span></div>
  <div class="row"><span class="bold">Doctor:</span> <span>${doctor.name}</span></div>
  <div class="row"><span>Dept/Spec:</span> <span>${doctor.spec}</span></div>
  <div class="row"><span class="bold">Service:</span> <span>${treatment.name}</span></div>
  <div class="row"><span>Duration:</span> <span>${treatment.dur}</span></div>

  <div class="double-divider"></div>

  <div class="row bold" style="font-size: 12px;">
    <span>ESTIMATED FEE:</span>
    <span>${treatment.price}</span>
  </div>
  <div class="center" style="font-size: 9px; margin-top: 2px;">
    * Payable at reception via Cash, Card, or UPI
  </div>

  ${
    patient.notes
      ? `<div class="notes"><span class="bold">Remarks:</span> "${patient.notes}"</div>`
      : ''
  }

  <div class="divider"></div>

  <div class="bold" style="font-size: 9px;">CLINIC INSTRUCTIONS:</div>
  <div style="font-size: 8px; line-height: 1.25; margin-top: 2px;">
    • Please arrive 10 mins before slot.<br/>
    • Bring past dental records/X-rays.<br/>
    • Rescheduling: Call ${branchPhoneLine} 4h ahead.
  </div>

  <div class="divider"></div>

  <div class="footer">
    *** THANK YOU FOR VISITING ***<br/>
    Authorized Clinical Registration Slip<br/>
    SDC-${bookingRef}-2026
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
      margin: 10mm 12mm 10mm 12mm;
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
      font-size: 12px;
      line-height: 1.45;
    }
    .slip-container {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px 28px;
    }
    @media print {
      body { margin: 0; padding: 0; }
      .slip-container {
        border: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
    /* Letterhead Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .clinic-info {
      max-width: 440px;
    }
    .clinic-name {
      font-size: 24px;
      font-weight: 900;
      color: #1e40af;
      letter-spacing: -0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .clinic-tagline {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }
    .reg-info {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
    }
    .branch-contact {
      text-align: right;
      font-size: 11px;
      color: #334155;
      line-height: 1.4;
    }
    .branch-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12px;
    }
    /* Title Badge Bar */
    .title-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 8px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .doc-title {
      font-size: 12px;
      font-weight: 900;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }
    .status-pill {
      background: #2563eb;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      padding: 3px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    /* Metrics Triplet */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1.2fr 1.4fr 1.4fr;
      gap: 10px;
      margin-bottom: 16px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .metric-label {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-ref {
      font-size: 18px;
      font-family: monospace;
      font-weight: 900;
      color: #2563eb;
      letter-spacing: 1.5px;
    }
    .barcode-line {
      font-family: monospace;
      font-size: 8px;
      color: #64748b;
      letter-spacing: 2px;
      margin-top: 2px;
    }
    .metric-val {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
    }
    .metric-sub {
      font-size: 14px;
      font-weight: 900;
      color: #2563eb;
    }
    /* Tables and Sections */
    .section-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .section-header {
      font-size: 11px;
      font-weight: 900;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px 12px;
      font-size: 11px;
    }
    .pg-label {
      color: #64748b;
      font-size: 10px;
      font-weight: 600;
      display: block;
    }
    .pg-val {
      color: #0f172a;
      font-weight: 700;
    }
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 4px;
    }
    th {
      background: #eff6ff;
      color: #1e40af;
      font-weight: 800;
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #bfdbfe;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .fee-total {
      background: #eff6ff;
      border-top: 2px solid #2563eb;
      font-weight: 900;
      font-size: 13px;
      color: #1e40af;
    }
    /* Guidelines */
    .guidelines-box {
      background: #f8fafc;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 10.5px;
      page-break-inside: avoid;
    }
    .guidelines-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      margin-top: 6px;
      color: #334155;
    }
    /* Signatures and Stamp */
    .auth-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 14px;
      font-size: 10px;
      page-break-inside: avoid;
    }
    .auth-stamp {
      border: 2px dashed #2563eb;
      background: #eff6ff;
      border-radius: 8px;
      padding: 6px 14px;
      text-align: center;
      display: inline-block;
    }
    .sign-box {
      text-align: right;
    }
    .sign-line {
      width: 140px;
      border-bottom: 1px solid #64748b;
      margin-left: auto;
      margin-bottom: 4px;
      height: 24px;
    }
    .slip-footer {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 12px;
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="slip-container" id="printable-appointment-slip">
    <!-- Header -->
    <div class="header-row">
      <div class="clinic-info">
        <h1 class="clinic-name">${clinicProfile.name}</h1>
        <div class="clinic-tagline">${clinicProfile.tagline || 'Advanced Dental Care · ISO 9001 Certified'}</div>
        <div class="reg-info">
          <strong>Reg No:</strong> ${clinicProfile.registrationNumber || 'SDC-REG-2024-MH'} · 
          <strong>Accreditation:</strong> ${clinicProfile.accreditation || 'NABH Accredited Clinic'}
        </div>
      </div>

      <div class="branch-contact">
        <div class="branch-title">📍 ${activeBranch.name || clinicProfile.name}</div>
        <div>${branchAddressLine}</div>
        <div><strong>Phone:</strong> ${branchPhoneLine}</div>
        <div><strong>Emergency:</strong> ${activeBranch.emergencyPhone || clinicProfile.emergencyPhone}</div>
        <div><strong>Email:</strong> ${activeBranch.email || clinicProfile.email}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <div>
        <div class="doc-title">Official Appointment Confirmation Slip</div>
        <div class="doc-meta">Issued: ${issueTimestamp} · Verification Token: ${bookingRef}-V26</div>
      </div>
      <div class="status-pill">✓ Confirmed & Scheduled</div>
    </div>

    <!-- Key Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Booking Reference</div>
        <div class="metric-ref">${bookingRef}</div>
        <div class="barcode-line">||| | |||| | || |||| |</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Date & Time Slot</div>
        <div class="metric-val">${formattedDate}</div>
        <div class="metric-sub">${formattedTime}</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Consulting Specialist</div>
        <div class="metric-val">${doctor.name}</div>
        <div style="font-size: 11px; color: #64748b;">${doctor.spec} · ${doctor.qualifications || 'BDS, MDS'}</div>
      </div>
    </div>

    <!-- Patient Information Section -->
    <div class="section-box">
      <div class="section-header">
        <span>Patient Information</span>
        <span style="font-size: 10px; color: #64748b; font-weight: normal;">Type: <strong>${patient.patientType || 'Standard'}</strong></span>
      </div>
      <div class="patient-grid">
        <div>
          <span class="pg-label">Patient Name:</span>
          <span class="pg-val">${fullName}</span>
        </div>
        <div>
          <span class="pg-label">Contact Number:</span>
          <span class="pg-val">${patient.phone || 'N/A'}</span>
        </div>
        <div>
          <span class="pg-label">Email Address:</span>
          <span class="pg-val">${patient.email || 'N/A'}</span>
        </div>
        <div>
          <span class="pg-label">Date of Birth:</span>
          <span class="pg-val">${patient.dob || 'Not specified'}</span>
        </div>
      </div>
      ${
        patient.notes
          ? `<div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #475569;">
              <strong>Patient Clinical Remarks:</strong> <em>"${patient.notes}"</em>
            </div>`
          : ''
      }
    </div>

    <!-- Treatment & Billing Table -->
    <div class="section-box" style="padding: 0; overflow: hidden;">
      <div style="padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
        <span style="font-weight: 800; color: #1e40af; font-size: 11px; text-transform: uppercase;">Procedure & Billing Estimation</span>
        <span style="font-size: 10px; color: #64748b; font-weight: bold;">Currency: INR (₹)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Dental Service / Procedure</th>
            <th>Duration</th>
            <th>Specialist</th>
            <th style="text-align: right;">Estimated Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>
              <div style="font-weight: 800; color: #0f172a;">${treatment.icon || '🦷'} ${treatment.name}</div>
              <div style="font-size: 10px; color: #64748b;">${treatment.desc || 'Standard clinical procedure'}</div>
            </td>
            <td>${treatment.dur}</td>
            <td>${doctor.name}</td>
            <td style="text-align: right; font-weight: 800; color: #0f172a;">${treatment.price}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td>2</td>
            <td style="color: #475569;">Sterilized Clinical Kit & Safety Disposables</td>
            <td>—</td>
            <td>Clinic Staff</td>
            <td style="text-align: right; font-weight: bold; color: #15803d;">INCLUDED</td>
          </tr>
          <tr class="fee-total">
            <td colspan="4" style="text-align: right; padding: 10px;">Total Amount Payable:</td>
            <td style="text-align: right; padding: 10px; font-size: 14px; color: #2563eb;">${treatment.price}</td>
          </tr>
        </tbody>
      </table>
      <div style="padding: 6px 12px; background: #f8fafc; font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
        <span>* Payment terms: Payable at reception counter via UPI, Card, or Cash upon arrival.</span>
        <strong style="color: #0f172a;">Status: DUE AT CLINIC</strong>
      </div>
    </div>

    <!-- Pre-Appointment Guidelines -->
    <div class="guidelines-box">
      <div style="font-weight: 800; color: #1e40af; font-size: 11px; text-transform: uppercase;">
        Important Patient Guidelines & Instructions
      </div>
      <div class="guidelines-grid">
        <div><strong>1. Reporting Time:</strong> Arrive 10 minutes prior to your slot (${formattedTime}) for queue registration.</div>
        <div><strong>2. Medical History:</strong> Bring previous X-rays, medical records, and list of ongoing medications.</div>
        <div><strong>3. Oral Hygiene:</strong> Please brush thoroughly prior to your appointment. Inform doctor of any sensitivities.</div>
        <div><strong>4. Cancellation:</strong> Free reschedule/cancellation up to 4 hours in advance at ${branchPhoneLine}.</div>
      </div>
    </div>

    <!-- Official Stamp & Signatures -->
    <div class="auth-row">
      <div>
        <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700;">Digital Verification</div>
        <div style="font-family: monospace; font-weight: 700; color: #334155; margin-top: 2px;">AUTH-TOKEN: SDC-${bookingRef}-2026</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Generated via ${clinicProfile.name} System</div>
      </div>

      <div class="auth-stamp">
        <div style="font-size: 10px; font-weight: 900; color: #1e40af; text-transform: uppercase;">
          ${clinicProfile.name}
        </div>
        <div style="font-size: 8px; font-weight: 800; color: #059669; letter-spacing: 1px;">
          ★ CLINIC COUNTER OFFICIAL ★
        </div>
      </div>

      <div class="sign-box">
        <div class="sign-line"></div>
        <div style="font-weight: 800; color: #0f172a;">Authorized Signatory</div>
        <div style="color: #64748b; font-size: 9px;">Reception & Patient Care</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="slip-footer">
      ${clinicProfile.name} · ${branchAddressLine} · Helpline: ${branchPhoneLine} · Emergency: ${clinicProfile.emergencyPhone}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Direct Print Engine using an isolated hidden iframe.
 * This guarantees zero conflicts with modal overlays, background DOM elements, or styles.
 */
export function printSlipDirect(
  booking: BookingState,
  clinicProfile: ClinicProfile = DEFAULT_CLINIC_PROFILE,
  format: SlipPrintFormat = 'a4'
): Promise<boolean> {
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
          // Clean up DOM iframe after 60 seconds (giving print dialog plenty of time)
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
  window.print();
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
