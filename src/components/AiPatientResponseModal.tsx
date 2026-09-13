import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  MessageSquare,
  Copy,
  Check,
  Share2,
  AlertTriangle,
  Send,
  Phone,
  HelpCircle,
  FileText,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { ClinicProfile } from '../types';

interface AiPatientResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicProfile: ClinicProfile;
  initialQuery?: string;
  initialPatientName?: string;
  initialPatientPhone?: string;
  patientName?: string;
  patientPhone?: string;
  treatmentName?: string;
  doctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
}

const COMMON_SCENARIOS = [
  {
    id: 'pain_emergency',
    title: 'Severe Toothache / Swelling',
    badge: 'Emergency',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-200',
    sample: 'Doctor, my lower jaw is swollen and I have extreme throbbing tooth pain since yesterday night. Can I walk in now?',
  },
  {
    id: 'post_op_care',
    title: 'Post-Extraction Bleeding & Care',
    badge: 'Post-Op',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    sample: 'Hi, I got my wisdom tooth pulled 4 hours ago. There is still pink saliva and light bleeding. What should I do?',
  },
  {
    id: 'pricing',
    title: 'Pricing & Treatment Cost Inquiry',
    badge: 'Pricing',
    badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    sample: 'Hello, how much do you charge for a full root canal with zirconia crown? Do you provide EMI or installments?',
  },
  {
    id: 'cancellation_reschedule',
    title: 'Rescheduling / Cancellation',
    badge: 'Scheduling',
    badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    sample: 'I have an appointment tomorrow at 11 AM, but I have an urgent office meeting. Can I shift it to Saturday afternoon?',
  },
  {
    id: 'insurance',
    title: 'Insurance & Cashless Coverage',
    badge: 'Billing',
    badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    sample: 'Does Smart Dental Clinic accept private health insurance or dental corporate discount cards for dental cleaning and fillings?',
  },
];

export const AiPatientResponseModal: React.FC<AiPatientResponseModalProps> = ({
  isOpen,
  onClose,
  clinicProfile,
  initialQuery = '',
  initialPatientName = '',
  initialPatientPhone = '',
  patientName: propPatientName,
  patientPhone: propPatientPhone,
  treatmentName,
  doctorName,
  appointmentDate,
  appointmentTime,
}) => {
  const effectiveName = propPatientName || initialPatientName || 'Patient';
  const effectivePhone = propPatientPhone || initialPatientPhone || '';
  const defaultQuery =
    initialQuery ||
    (treatmentName && appointmentDate
      ? `Hello, I had a question regarding my upcoming appointment for ${treatmentName} with ${doctorName || 'the doctor'} on ${appointmentDate} at ${appointmentTime || ''}.`
      : COMMON_SCENARIOS[0].sample);

  const [patientQuery, setPatientQuery] = useState(defaultQuery);
  const [patientName, setPatientName] = useState(effectiveName);
  const [patientPhone, setPatientPhone] = useState(effectivePhone);
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [topic, setTopic] = useState<string>('pain_emergency');

  // Sync state if props change when opening modal
  useEffect(() => {
    if (propPatientName) setPatientName(propPatientName);
    if (propPatientPhone) setPatientPhone(propPatientPhone);
    if (treatmentName && appointmentDate) {
      setPatientQuery(
        `Hello, I had a question regarding my upcoming appointment for ${treatmentName} with ${doctorName || 'the doctor'} on ${appointmentDate} at ${appointmentTime || ''}.`
      );
    }
  }, [propPatientName, propPatientPhone, treatmentName, doctorName, appointmentDate, appointmentTime]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedReply, setGeneratedReply] = useState<string>('');
  const [priority, setPriority] = useState<string>('Routine');
  const [receptionistNote, setReceptionistNote] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!patientQuery.trim() || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/patient-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientQuery,
          patientName: patientName.trim() || 'Patient',
          channel,
          topic,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedReply(data.channelReply);
        setPriority(data.priority || 'Routine');
        setReceptionistNote(data.receptionistNote || '');
      } else {
        throw new Error(data.error || 'Failed to generate reply');
      }
    } catch (err) {
      console.error('Error generating AI response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedReply) return;
    navigator.clipboard.writeText(generatedReply);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!generatedReply) return;
    const cleanPhone = patientPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(generatedReply);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const selectScenario = (sc: typeof COMMON_SCENARIOS[0]) => {
    setTopic(sc.id);
    setPatientQuery(sc.sample);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                  Automated Patient Response Desk
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/40 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium truncate">
                Instantly draft doctor-approved replies for WhatsApp, SMS, and front-desk chats
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Preset Clinical Scenarios */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Common Reception Inquiries (Click to prefill)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {COMMON_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => selectScenario(sc)}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    topic === sc.id
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800 truncate">{sc.title}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${sc.badgeColor}`}>
                      {sc.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{sc.sample}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Patient Name</label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Patient WhatsApp / Phone</label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Channel</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-200/80 p-1 rounded-xl">
                {(['whatsapp', 'sms', 'email'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all cursor-pointer ${
                      channel === ch ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Patient Message Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Patient's Message / Question
            </label>
            <textarea
              rows={3}
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="Paste patient's WhatsApp message or type their question..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Trigger */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!patientQuery.trim() || isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'AI is drafting response...' : 'Generate Doctor-Approved Reply'}</span>
          </button>

          {/* Generated Result Display */}
          {generatedReply && (
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Drafted Clinic Response ({channel.toUpperCase()})
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      priority === 'Emergency'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : priority === 'Urgent'
                        ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Priority: {priority}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Message Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans select-text">
                {generatedReply}
              </div>

              {/* Internal Receptionist Note */}
              {receptionistNote && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Receptionist Clinical Protocol: </span>
                    <span>{receptionistNote}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
