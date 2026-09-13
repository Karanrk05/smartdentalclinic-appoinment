import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGenAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
}

// ============================================================================
// 1. AI Appointment Assistant (Triage & Clinic Concierge)
// ============================================================================

export interface AiAssistantRequest {
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  clinicContext: {
    clinicName: string;
    phone: string;
    treatments: Array<{ id: string; name: string; price: string; dur: string; desc: string }>;
    doctors: Array<{ id: string; name: string; spec: string; qualifications: string; experience: string }>;
    branches: Array<{ id: string; shortName: string; address: string; phone: string }>;
  };
}

export async function handleAppointmentAssistant(req: AiAssistantRequest) {
  const { message, history = [], clinicContext } = req;
  const ai = getGenAi();

  const treatmentsContext = clinicContext.treatments
    .map((t) => `- [ID: ${t.id}] ${t.name} (${t.price}, ${t.dur}): ${t.desc}`)
    .join('\n');

  const doctorsContext = clinicContext.doctors
    .map((d) => `- [ID: ${d.id}] ${d.name} (${d.spec}, ${d.qualifications}, ${d.experience} exp)`)
    .join('\n');

  const branchesContext = clinicContext.branches
    .map((b) => `- [ID: ${b.id}] ${b.shortName}: ${b.address} (Ph: ${b.phone})`)
    .join('\n');

  const systemInstruction = `You are "Dr. Smile AI", the intelligent clinical triage assistant and appointment concierge for ${clinicContext.clinicName}.
Your duties:
1. Provide warm, empathetic, accurate dental triage information to prospective and returning patients.
2. If the user describes symptoms (e.g. sharp pain on chewing, bleeding gums, chipped tooth, stained enamel, crooked teeth), recommend the most appropriate clinical treatment from the available catalog.
3. Suggest the most relevant dental specialist doctor and preferred branch based on the patient's concern.
4. Answer questions regarding pricing, procedure length, pain management, and preparation honestly using the provided clinic catalog.
5. Always maintain patient safety: if they describe severe facial swelling, difficulty breathing or swallowing, or heavy uncontrolled bleeding, advise immediate emergency hospital or urgent clinic visit.

CLINIC INFORMATION:
Treatments Catalog:
${treatmentsContext}

Doctors Available:
${doctorsContext}

Branches:
${branchesContext}

Helpline: ${clinicContext.phone}

RESPONSE GUIDELINES:
- Be welcoming, professional, and clear. Avoid overly dense medical jargon.
- If you identify a specific treatment from our catalog that matches their symptoms, explicitly mention its name and ID in a clear recommendation tag at the bottom of your reply, for example:
RECOMMENDATION: {"treatmentId": "t3", "treatmentName": "Scaling & Polishing", "doctorId": "d1", "actionText": "Book Scaling & Polishing"}
- If no single treatment is certain, recommend a Comprehensive Dental Checkup & Consultation (usually t1).`;

  if (!ai) {
    // Fallback when API key is not configured
    return generateFallbackAssistantResponse(message, clinicContext);
  }

  try {
    const formattedContents: any[] = [];
    
    // Add previous history turns if present
    for (const h of history.slice(-6)) {
      formattedContents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: h.parts.map((p) => ({ text: p.text })),
      });
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 800,
      },
    });

    const text = response.text || '';
    return parseAssistantResponse(text, clinicContext);
  } catch (error) {
    console.error('Error in Gemini Appointment Assistant:', error);
    return generateFallbackAssistantResponse(message, clinicContext);
  }
}

function parseAssistantResponse(rawText: string, clinicContext: any) {
  let cleanText = rawText;
  let recommendation: any = null;

  const recMatch = rawText.match(/RECOMMENDATION:\s*(\{.*?\})/s);
  if (recMatch) {
    try {
      recommendation = JSON.parse(recMatch[1]);
      cleanText = rawText.replace(/RECOMMENDATION:\s*\{.*?\}/s, '').trim();
    } catch {
      // Ignored
    }
  }

  // If no structured recommendation was parsed, check if any treatment name was strongly mentioned
  if (!recommendation && clinicContext.treatments) {
    for (const t of clinicContext.treatments) {
      if (rawText.toLowerCase().includes(t.name.toLowerCase())) {
        recommendation = {
          treatmentId: t.id,
          treatmentName: t.name,
          doctorId: clinicContext.doctors?.[0]?.id || 'd1',
          actionText: `Book ${t.name}`,
        };
        break;
      }
    }
  }

  return {
    reply: cleanText,
    recommendation,
    aiPowered: true,
  };
}

function generateFallbackAssistantResponse(message: string, clinicContext: any) {
  const lower = message.toLowerCase();
  let reply = '';
  let recommendation: any = null;

  if (lower.includes('pain') || lower.includes('hurt') || lower.includes('ache') || lower.includes('cavity') || lower.includes('root canal')) {
    reply = `Hello! I understand you are experiencing dental discomfort. Tooth pain is often caused by enamel decay reaching the pulp, an infection, or cracked tooth structure. 

For persistent or throbbing pain, an in-depth Root Canal Treatment (or Consultation with digital X-Rays) is usually the best step to relieve the nerve and save your natural tooth. Dr. Sarah Jenkins and our Endodontic team specialize in virtually pain-free rotary root canals with local anesthesia.`;
    recommendation = {
      treatmentId: 't9',
      treatmentName: 'Root Canal Treatment (RCT)',
      doctorId: 'd2',
      actionText: 'Book Root Canal Treatment',
    };
  } else if (lower.includes('clean') || lower.includes('stain') || lower.includes('yellow') || lower.includes('tartar') || lower.includes('plaque') || lower.includes('scaling')) {
    reply = `Hello! For yellowing, plaque buildup, or routine oral maintenance, our **Scaling & Polishing (Ultrasonic Deep Cleaning)** is ideal. It removes stubborn tartar and buffs away coffee or food stains in about 45 minutes, leaving teeth smooth and refreshed.

If you're seeking dramatic cosmetic brightening (up to 4–8 shades whiter), we also offer Laser Teeth Whitening.`;
    recommendation = {
      treatmentId: 't3',
      treatmentName: 'Scaling & Polishing',
      doctorId: 'd1',
      actionText: 'Book Scaling & Polishing',
    };
  } else if (lower.includes('brace') || lower.includes('align') || lower.includes('invisalign') || lower.includes('crooked') || lower.includes('gap')) {
    reply = `Hello! If you're looking to straighten your teeth, fix bite alignment, or close spacing gaps, an **Orthodontic & Clear Aligner Consultation** is your best starting point.

Our specialists examine your dental arch, take digital impressions, and discuss options like clear invisible aligners or ceramic braces.`;
    recommendation = {
      treatmentId: 't12',
      treatmentName: 'Orthodontic Braces & Aligners',
      doctorId: 'd4',
      actionText: 'Book Orthodontic Consultation',
    };
  } else if (lower.includes('bleed') || lower.includes('gum') || lower.includes('swollen')) {
    reply = `Hello! Bleeding or tender gums when brushing is typically an early sign of gingivitis or localized inflammation. Catching this early prevents bone loss and tooth mobility.

We recommend our specialized **Gum Care & Gingivitis Therapy**, which cleans beneath the gumline and applies soothing anti-inflammatory rinses.`;
    recommendation = {
      treatmentId: 't7',
      treatmentName: 'Gum Care & Gingivitis Therapy',
      doctorId: 'd1',
      actionText: 'Book Gum Care Therapy',
    };
  } else {
    reply = `Welcome to ${clinicContext.clinicName}! I can assist you with understanding your symptoms, checking treatment pricing, choosing the right dentist, and picking an available slot across our branches.

For a thorough examination with digital X-Rays and a personalized treatment roadmap, our **Dental Checkup & Consultation** is the standard recommended first visit.`;
    recommendation = {
      treatmentId: 't1',
      treatmentName: 'Dental Checkup & Consultation',
      doctorId: 'd1',
      actionText: 'Book Checkup & Consultation',
    };
  }

  return {
    reply,
    recommendation,
    aiPowered: false,
  };
}

// ============================================================================
// 2. Automated Patient Responses (Reception / WhatsApp Desk)
// ============================================================================

export interface AiPatientResponseRequest {
  patientQuery: string;
  patientName?: string;
  channel?: 'whatsapp' | 'sms' | 'email';
  topic?: 'pain_emergency' | 'pricing' | 'post_op_care' | 'cancellation_reschedule' | 'insurance' | 'general';
  clinicContext: {
    clinicName: string;
    phone: string;
    emergencyPhone: string;
    timings: string;
    address: string;
  };
}

export async function handleAutomatedPatientResponse(req: AiPatientResponseRequest) {
  const { patientQuery, patientName = 'Patient', channel = 'whatsapp', topic = 'general', clinicContext } = req;
  const ai = getGenAi();

  const systemInstruction = `You are an expert dental front-desk manager and clinical communication assistant for ${clinicContext.clinicName}.
Your task is to draft an automated, doctor-approved, highly professional, empathetic patient response to an incoming message from a patient.

CLINIC CONTEXT:
Clinic: ${clinicContext.clinicName}
Helpline: ${clinicContext.phone}
Emergency Phone: ${clinicContext.emergencyPhone}
Hours: ${clinicContext.timings}
Address: ${clinicContext.address}

CHANNEL: ${channel.toUpperCase()}
TOPIC CATEGORY: ${topic}
PATIENT NAME: ${patientName}

REQUIREMENTS:
1. Patient Message: Produce a ready-to-send reply tailored to ${channel}. If WhatsApp/SMS, keep it concise, friendly, formatted with clean bullet points and emojis where natural.
2. Clinical Triage Advice: Include a short note for the receptionist explaining what priority this query is (Routine / Urgent / Emergency) and any clinical precautions.
3. Tone: Reassuring, courteous, authoritative yet approachable.

OUTPUT FORMAT (JSON strictly):
{
  "channelReply": "Text formatted ready to send to patient",
  "priority": "Routine" | "Urgent" | "Emergency",
  "receptionistNote": "Internal clinical recommendation for reception staff"
}`;

  if (!ai) {
    return generateFallbackPatientResponse(patientQuery, patientName, channel, topic, clinicContext);
  }

  try {
    const prompt = `Incoming Patient Message from ${patientName}:
"${patientQuery}"

Generate the official clinic response following the JSON schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      channelReply: parsed.channelReply || generateFallbackPatientResponse(patientQuery, patientName, channel, topic, clinicContext).channelReply,
      priority: parsed.priority || 'Routine',
      receptionistNote: parsed.receptionistNote || 'Follow up with patient within 1 hour.',
      aiPowered: true,
    };
  } catch (err) {
    console.error('Error generating automated patient response:', err);
    return generateFallbackPatientResponse(patientQuery, patientName, channel, topic, clinicContext);
  }
}

function generateFallbackPatientResponse(
  query: string,
  patientName: string,
  channel: string,
  topic: string,
  clinicContext: any
) {
  let channelReply = '';
  let priority = 'Routine';
  let receptionistNote = 'Standard inquiry. Verify patient record.';

  switch (topic) {
    case 'pain_emergency':
      priority = 'Urgent';
      receptionistNote = 'Immediate appointment required. Notify on-duty doctor for same-day walk-in slot.';
      channelReply = `Dear ${patientName}, we are sorry to hear you are in discomfort. Your oral health is our priority. 

⚠️ For immediate relief:
• Avoid chewing on the affected side and avoid extremely cold or hot liquids.
• Rinse gently with lukewarm salt water.
• Do not apply aspirin directly onto the gums.

We have emergency slots open today at ${clinicContext.clinicName}. Please reply here or call our emergency desk at ${clinicContext.emergencyPhone} so we can seat you with our doctor right away.`;
      break;

    case 'post_op_care':
      priority = 'Urgent';
      receptionistNote = 'Post-procedure follow-up. Check if bleeding is oozing vs active hemorrhage.';
      channelReply = `Hello ${patientName}, thank you for checking in with us after your procedure. 

🩹 Post-Treatment Care Tips:
• Bite firmly on clean gauze for 30–45 mins if slight oozing occurs.
• Do not spit forcefully or use a drinking straw for 24 hours.
• Stick to soft, cool foods (yogurt, ice cream, smoothies).
• Take prescribed medication as directed by your dentist.

If you experience persistent bleeding, fever, or swelling that increases after 48 hours, please reach our emergency line at ${clinicContext.emergencyPhone} immediately.`;
      break;

    case 'pricing':
      priority = 'Routine';
      receptionistNote = 'Send treatment catalog and explain consultation assessment policy.';
      channelReply = `Hello ${patientName}, thank you for inquiring about treatments at ${clinicContext.clinicName}! 

Our general consultation begins at ₹300–₹800, which includes a comprehensive dental examination. Exact costs for specialized treatments (like root canals, crowns, or teeth whitening) depend on individual tooth condition and material choice, which our doctor will outline transparently before any work starts.

Would you like us to reserve a convenient slot for you this week?`;
      break;

    case 'cancellation_reschedule':
      priority = 'Routine';
      receptionistNote = 'Update appointment schedule in Excel and free up the time slot.';
      channelReply = `Dear ${patientName}, thank you for letting us know in advance. We have received your rescheduling request. 

Could you please share your preferred day and time (Morning or Afternoon) so we can update your appointment with minimal delay? You can also look up and adjust your booking anytime on our online patient portal.`;
      break;

    default:
      channelReply = `Hello ${patientName}, thank you for contacting ${clinicContext.clinicName}! We are open ${clinicContext.timings}. Our team is pleased to assist you with appointments, treatment inquiries, or dental advice. How may we help you today? (Helpline: ${clinicContext.phone})`;
      break;
  }

  return {
    channelReply,
    priority,
    receptionistNote,
    aiPowered: false,
  };
}

// ============================================================================
// 3. Smart Appointment Reminders
// ============================================================================

export interface AiSmartReminderRequest {
  bookingRef: string;
  patientName: string;
  treatmentName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  branchName: string;
  branchAddress: string;
  notes?: string;
  clinicContext: {
    clinicName: string;
    phone: string;
  };
}

export async function handleSmartReminder(req: AiSmartReminderRequest) {
  const {
    bookingRef,
    patientName,
    treatmentName,
    doctorName,
    appointmentDate,
    appointmentTime,
    branchName,
    branchAddress,
    notes = '',
    clinicContext,
  } = req;

  const ai = getGenAi();

  const systemInstruction = `You are an AI patient communications specialist for ${clinicContext.clinicName}.
Draft a smart, personalized, reassuring appointment reminder for a dental visit.
Instead of a generic robotic reminder, tailor the message with procedure-specific preparation tips based on the treatment (e.g. Scaling vs. Root Canal vs. Extraction vs. Teeth Whitening vs. Child Dental Visit).

RULES:
- Include Reference ID, Date, Time, Doctor Name, Branch Location.
- Include 2 specific clinical preparation tips (e.g., eat light food before root canal, avoid staining foods before whitening, bring previous X-rays, arrive 10 minutes early for sanitization).
- Provide two versions:
  1. A WhatsApp version (polished with emojis, clear bullet points, clinic hotline).
  2. An SMS version (concise, under 160 characters if possible or compact).

OUTPUT JSON:
{
  "whatsappReminder": "...",
  "smsReminder": "...",
  "prepTips": ["Tip 1", "Tip 2"]
}`;

  if (!ai) {
    return generateFallbackSmartReminder(req);
  }

  try {
    const prompt = `Appointment Details:
- Reference: ${bookingRef}
- Patient: ${patientName}
- Treatment: ${treatmentName}
- Doctor: ${doctorName}
- Date & Time: ${appointmentDate} at ${appointmentTime}
- Branch: ${branchName} (${branchAddress})
- Patient Notes: ${notes || 'None'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.6,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      whatsappReminder: parsed.whatsappReminder || generateFallbackSmartReminder(req).whatsappReminder,
      smsReminder: parsed.smsReminder || generateFallbackSmartReminder(req).smsReminder,
      prepTips: parsed.prepTips || generateFallbackSmartReminder(req).prepTips,
      aiPowered: true,
    };
  } catch (err) {
    console.error('Error generating smart reminder:', err);
    return generateFallbackSmartReminder(req);
  }
}

function generateFallbackSmartReminder(req: AiSmartReminderRequest) {
  const { bookingRef, patientName, treatmentName, doctorName, appointmentDate, appointmentTime, branchName, branchAddress, clinicContext } = req;
  const isCleaning = treatmentName.toLowerCase().includes('scaling') || treatmentName.toLowerCase().includes('clean');
  const isSurgeryOrRCT = treatmentName.toLowerCase().includes('root canal') || treatmentName.toLowerCase().includes('extraction') || treatmentName.toLowerCase().includes('surgery');
  const isWhitening = treatmentName.toLowerCase().includes('white') || treatmentName.toLowerCase().includes('bleach');

  let prepTip1 = 'Please arrive 10 minutes early for medical history review.';
  let prepTip2 = 'Brush and floss your teeth gently before your visit.';

  if (isSurgeryOrRCT) {
    prepTip1 = 'Have a light meal 1–2 hours before your appointment to keep blood sugar stable.';
    prepTip2 = 'Wear comfortable clothing and arrange for someone to accompany you if preferred.';
  } else if (isWhitening) {
    prepTip1 = 'Avoid coffee, tea, turmeric, and smoking for 24 hours prior to maximize whitening penetration.';
    prepTip2 = 'Ensure teeth are brushed clean before coming in.';
  } else if (isCleaning) {
    prepTip1 = 'Routine ultrasonic cleaning is gentle; inform your dentist if you have tooth sensitivity.';
    prepTip2 = 'Arrive 10 minutes early to complete initial oral vitals.';
  }

  const whatsappReminder = `🦷 *Appointment Reminder · ${clinicContext.clinicName}*

Dear *${patientName}*,
This is a gentle reminder of your upcoming dental appointment:

📋 *Booking Ref:* ${bookingRef}
🩺 *Procedure:* ${treatmentName}
👨‍⚕️ *Doctor:* ${doctorName}
📅 *Date & Time:* ${appointmentDate} at ${appointmentTime}
📍 *Location:* ${branchName} (${branchAddress})

💡 *Personalized Visit Preparation:*
• ${prepTip1}
• ${prepTip2}

Need to reschedule? Call our clinic desk at ${clinicContext.phone}. We look forward to seeing your smile!`;

  const smsReminder = `REMINDER: ${clinicContext.clinicName} appt on ${appointmentDate} at ${appointmentTime} with ${doctorName} for ${treatmentName} (Ref: ${bookingRef}). Please arrive 10m early. Help: ${clinicContext.phone}`;

  return {
    whatsappReminder,
    smsReminder,
    prepTips: [prepTip1, prepTip2],
    aiPowered: false,
  };
}

// ============================================================================
// 4. AI-Based Patient & Clinic Insights (Executive Intelligence Hub)
// ============================================================================

export interface AiClinicInsightsRequest {
  records: any[];
  treatments: any[];
  doctors: any[];
  branches: any[];
  clinicProfile: any;
}

export async function handleClinicInsights(req: AiClinicInsightsRequest) {
  const { records = [], treatments = [], doctors = [], branches = [], clinicProfile } = req;
  const ai = getGenAi();

  // Calculate high-level summary statistics
  const total = records.length;
  const confirmed = records.filter((r) => !r.status || r.status.toLowerCase().includes('confirm') || r.status.toLowerCase().includes('scheduled')).length;
  const completed = records.filter((r) => r.status && r.status.toLowerCase().includes('completed')).length;
  const cancelled = records.filter((r) => r.status && (r.status.toLowerCase().includes('cancel') || r.status.toLowerCase().includes('no-show'))).length;

  // Treatment frequency
  const treatmentCounts: Record<string, number> = {};
  records.forEach((r) => {
    const tName = r.treatmentName || 'General Consultation';
    treatmentCounts[tName] = (treatmentCounts[tName] || 0) + 1;
  });

  // Doctor frequency
  const doctorCounts: Record<string, number> = {};
  records.forEach((r) => {
    const dName = r.doctorName || 'Unassigned';
    doctorCounts[dName] = (doctorCounts[dName] || 0) + 1;
  });

  // Branch frequency
  const branchCounts: Record<string, number> = {};
  records.forEach((r) => {
    const bName = r.branchName || 'Downtown Central';
    branchCounts[bName] = (branchCounts[bName] || 0) + 1;
  });

  const systemInstruction = `You are a Chief Clinical Officer and Practice Management AI Consultant for ${clinicProfile.name || 'Smart Dental Clinic'}.
You are analyzing real-world patient records, doctor booking loads, treatment popularity, and cancellation patterns.

Generate an executive clinical and operational intelligence report formatted in JSON:
{
  "healthScore": number (0-100),
  "executiveSummary": "Concise 2-3 sentence overview of clinic trajectory",
  "demandAnalysis": "Key observations on high-margin vs routine treatment mix",
  "noShowRiskAssessment": "Analysis of cancellation rates and mitigation tactics",
  "doctorUtilization": "Insights on doctor workload distribution",
  "strategicActionItems": [
    {
      "priority": "High" | "Medium" | "Low",
      "title": "Action Title",
      "description": "Specific, actionable tactic for the doctor/clinic owner",
      "expectedImpact": "Revenue growth / Patient retention / Time saved"
    }
  ]
}`;

  if (!ai) {
    return generateFallbackClinicInsights(total, confirmed, completed, cancelled, treatmentCounts, doctorCounts, branchCounts, clinicProfile);
  }

  try {
    const dataSummary = {
      totalBookings: total,
      confirmedBookings: confirmed,
      completedBookings: completed,
      cancelledBookings: cancelled,
      cancellationRate: total > 0 ? `${((cancelled / total) * 100).toFixed(1)}%` : '0%',
      treatmentBreakdown: treatmentCounts,
      doctorWorkload: doctorCounts,
      branchDistribution: branchCounts,
      registeredDoctorsCount: doctors.length,
      availableTreatmentsCount: treatments.length,
      branchesCount: branches.length,
    };

    const prompt = `Analyze this clinic booking dataset and generate the executive strategic intelligence report:
${JSON.stringify(dataSummary, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      stats: {
        total,
        confirmed,
        completed,
        cancelled,
        cancellationRate: total > 0 ? `${((cancelled / total) * 100).toFixed(1)}%` : '0%',
        treatmentCounts,
        doctorCounts,
        branchCounts,
      },
      ...parsed,
      aiPowered: true,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error generating clinic insights:', err);
    return generateFallbackClinicInsights(total, confirmed, completed, cancelled, treatmentCounts, doctorCounts, branchCounts, clinicProfile);
  }
}

function generateFallbackClinicInsights(
  total: number,
  confirmed: number,
  completed: number,
  cancelled: number,
  treatmentCounts: Record<string, number>,
  doctorCounts: Record<string, number>,
  branchCounts: Record<string, number>,
  clinicProfile: any
) {
  const isFreshClinic = total === 0;
  const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';
  const score = isFreshClinic ? 100 : Math.max(70, Math.min(98, 95 - Number(cancellationRate) * 1.5));

  return {
    stats: {
      total,
      confirmed,
      completed,
      cancelled,
      cancellationRate: `${cancellationRate}%`,
      treatmentCounts,
      doctorCounts,
      branchCounts,
    },
    healthScore: Math.round(score),
    executiveSummary: isFreshClinic
      ? `${clinicProfile.name || 'Smart Dental Clinic'} is fully set up and ready for patient bookings. All doctor schedules, treatments, and branch chairs are primed for live intake.`
      : `${clinicProfile.name || 'Smart Dental Clinic'} maintains a robust patient appointment volume with steady demand across preventive scaling and restorative procedures. Branch load is well-distributed, with high patient retention indicators.`,
    demandAnalysis: isFreshClinic
      ? `Ready to track real patient appointments. Detailed procedure breakdown and demand curves will update automatically as bookings occur.`
      : `Preventive cleaning and comprehensive checkups form the primary patient acquisition funnel (~40-50% of intake), while specialized procedures like Root Canals and Orthodontic Aligners drive the majority of clinic revenue margins.`,
    noShowRiskAssessment: isFreshClinic
      ? `Zero cancellations recorded. Automated 24-hour WhatsApp reminders and prep slips are configured to safeguard attendance from day one.`
      : `Cancellation rate is estimated at ${cancellationRate}%. Automated WhatsApp 24-hour reminders and procedure-specific preparation tips can reduce last-minute cancellations by up to 35%.`,
    doctorUtilization: isFreshClinic
      ? `All registered doctors and branch operatories are ready to accept appointments.`
      : `Appointment distributions show solid patient trust in senior clinicians. Evening and weekend slots experience highest density. Expanding early afternoon hygiene slots can increase throughput.`,
    strategicActionItems: [
      {
        priority: 'High',
        title: 'Activate Automated 24h WhatsApp Reminders',
        description: 'Ensure every patient receives the automated prep slip with pre-procedure tips to minimize no-shows.',
        expectedImpact: 'Reduce unannounced cancellations by 30%+',
      },
      {
        priority: 'Medium',
        title: 'Promote Cosmetic Whitening Post-Cleaning',
        description: 'Train hygienists to offer cosmetic shade evaluations during Scaling & Polishing appointments.',
        expectedImpact: '+18% average revenue per hygiene chair',
      },
      {
        priority: 'Medium',
        title: 'Balance Afternoon Off-Peak Shifts',
        description: 'Introduce promotional booking incentives or priority slots between 2:00 PM – 4:00 PM.',
        expectedImpact: 'Higher doctor utilization and smoother clinic flow',
      },
      {
        priority: 'Low',
        title: 'Multi-Branch Schedule Cross-Referral',
        description: 'Offer patients flexibility to visit sister branches if their primary doctor is fully booked.',
        expectedImpact: 'Faster appointment turnarounds and improved patient loyalty',
      },
    ],
    aiPowered: false,
    timestamp: new Date().toISOString(),
  };
}

