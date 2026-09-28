import React, { useState, useEffect } from 'react';
import {
  Zap,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Eye,
  Copy,
  Check,
  X,
  Search,
  Sliders,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  Clock,
  ExternalLink,
  Star,
  Ban,
  Calendar,
  Bell,
  Sun,
  Key,
  Lock,
  CheckCheck,
  Workflow,
  Download,
  Code2,
  BellRing,
} from 'lucide-react';
import { InstantNotificationItem, MessagingGatewayConfig, Doctor } from '../types';

interface AdminNotificationsTabProps {
  doctors: Doctor[];
  onUpdateDoctorPhone?: (doctorId: string, phone: string) => void;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  doctors,
}) => {
  const [notifications, setNotifications] = useState<InstantNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'PATIENT' | 'DOCTOR'>('ALL');
  const [filterChannel, setFilterChannel] = useState<'ALL' | 'WHATSAPP' | 'SMS'>('ALL');
  const [filterEventType, setFilterEventType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePreview, setActivePreview] = useState<InstantNotificationItem | null>(null);
  const [copied, setCopied] = useState(false);

  // Gateway config
  const [config, setConfig] = useState<MessagingGatewayConfig>({
    autoDispatchEnabled: true,
    zeroTouchAutoSendEnabled: true,
    patientWhatsAppEnabled: true,
    patientSmsEnabled: true,
    doctorWhatsAppEnabled: true,
    doctorSmsEnabled: true,
    cancellationWhatsAppEnabled: true,
    dailyDoctorAgendaEnabled: true,
    dailyDoctorAgendaTime: '08:00',
    patientReminder24hEnabled: true,
    patientReminder2hEnabled: true,
    reviewRequestEnabled: true,
    googleReviewLink: 'https://g.page/r/smart-dental-clinic/review',
    clinicWhatsAppNumber: '+91 98765 00000',
    clinicHelplineNumber: '+91 98765 00000',
    defaultDoctorPhone: '+91 98201 55441',
    smsGatewayProvider: 'Fast2SMS',
    whatsappGatewayProvider: 'Meta Cloud API',
    metaPhoneNumberId: '',
    metaAccessToken: '',
    metaTemplateName: '',
    customWebhookUrl: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    callMeBotApiKey: '',
    n8nEnabled: true,
    n8nWebhookUrl: '',
    n8nMorningAgendaWebhookUrl: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState<string | null>(null);
  const [showAdvancedCredentials, setShowAdvancedCredentials] = useState(false);

  // n8n Webhook testing & bridge state
  const [testingN8n, setTestingN8n] = useState(false);
  const [n8nTestResult, setN8nTestResult] = useState<{ success: boolean; message: string; statusCode?: number; responsePreview?: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleTestN8nWebhook = async () => {
    if (!config.n8nWebhookUrl) {
      alert('Please enter your n8n Webhook URL before running a test.');
      return;
    }
    try {
      setTestingN8n(true);
      setN8nTestResult(null);
      const res = await fetch('/api/n8n/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: config.n8nWebhookUrl }),
      });
      const data = await res.json();
      setN8nTestResult({
        success: data.success,
        message: data.message || (data.success ? 'n8n workflow triggered successfully!' : data.error || 'Connection failed'),
        statusCode: data.statusCode,
        responsePreview: data.n8nResponse,
      });
    } catch (err: any) {
      setN8nTestResult({
        success: false,
        message: err.message || 'Network error triggering n8n webhook',
      });
    } finally {
      setTestingN8n(false);
    }
  };

  // Automation triggers and retry state
  const [triggeringAgenda, setTriggeringAgenda] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [automationActionStatus, setAutomationActionStatus] = useState<string | null>(null);

  // Zero-Touch Dual Automated Test State
  const [dualPatientPhone, setDualPatientPhone] = useState('+91 98765 43210');
  const [dualPatientName, setDualPatientName] = useState('Rahul Sharma');
  const [dualDoctorPhone, setDualDoctorPhone] = useState('+91 98201 55441');
  const [dualDoctorName, setDualDoctorName] = useState('Dr. Vikram Shah');
  const [triggeringDualTest, setTriggeringDualTest] = useState(false);
  const [dualTestResult, setDualTestResult] = useState<any>(null);

  // Live Test Dispatch State
  const [testPhone, setTestPhone] = useState('+91 98201 55441');
  const [testName, setTestName] = useState('Dr. Vikram Shah');
  const [testType, setTestType] = useState<'PATIENT' | 'DOCTOR'>('DOCTOR');
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [customMsg, setCustomMsg] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  // Priority Waitlist State
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [triggeringWaitlistId, setTriggeringWaitlistId] = useState<string | null>(null);
  const [waitlistStatusNotice, setWaitlistStatusNotice] = useState<string | null>(null);

  // Live Carrier & Telecom Health State
  const [healthData, setHealthData] = useState<{
    twilio?: {
      configured: boolean;
      authenticated: boolean;
      accountType: string;
      friendlyName: string;
      hasIncomingPhoneNumbers: boolean;
      incomingPhoneNumbers: string[];
      verifiedRecipients: string[];
      diagnosticMessage: string;
    };
    fast2sms?: {
      configured: boolean;
      active: boolean;
      diagnosticMessage: string;
    };
    directMessaging?: {
      active: boolean;
      diagnosticMessage: string;
    };
  } | null>(null);

  const fetchLogsAndConfig = async () => {
    try {
      setLoading(true);
      const [notifsRes, configRes, healthRes, waitlistRes] = await Promise.all([
        fetch('/api/notifications/instant'),
        fetch('/api/notifications/gateway-config'),
        fetch('/api/notifications/health-check'),
        fetch('/api/waitlist').catch(() => null),
      ]);

      const notifsData = await notifsRes.json();
      if (notifsData.success && Array.isArray(notifsData.notifications)) {
        setNotifications(notifsData.notifications);
      }

      const configData = await configRes.json();
      if (configData.success && configData.config) {
        setConfig(configData.config);
      }

      const health = await healthRes.json();
      if (health.success) {
        setHealthData(health);
      }

      if (waitlistRes && waitlistRes.ok) {
        const wlData = await waitlistRes.json();
        if (wlData.success && Array.isArray(wlData.data)) {
          setWaitlistEntries(wlData.data);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications or config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndConfig();
  }, []);

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      setConfigStatus(null);
      const res = await fetch('/api/notifications/gateway-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfigStatus('Gateway configuration saved and active!');
        setTimeout(() => setConfigStatus(null), 3500);
      } else {
        setConfigStatus(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setConfigStatus('Network error saving gateway configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await fetch('/api/notifications/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          recipientName: testName,
          recipientType: testType,
          channel: testChannel,
          testMessage: customMsg.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          notification: data.notification,
        });
        // refresh list
        fetchLogsAndConfig();
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to dispatch test' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'Network error sending test' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendDualAutomatedTest = async () => {
    try {
      setTriggeringDualTest(true);
      setDualTestResult(null);
      const res = await fetch('/api/notifications/test-dual-automated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientPhone: dualPatientPhone,
          patientName: dualPatientName,
          doctorPhone: dualDoctorPhone,
          doctorName: dualDoctorName,
          treatmentName: 'Complete Oral Examination & Cleaning',
        }),
      });
      const data = await res.json();
      setDualTestResult(data);
      if (data.success) {
        setAutomationActionStatus(data.message);
        setTimeout(() => setAutomationActionStatus(null), 6000);
        fetchLogsAndConfig();
      }
    } catch (err: any) {
      setDualTestResult({ success: false, error: err.message || 'Failed to dispatch dual automated test' });
    } finally {
      setTriggeringDualTest(false);
    }
  };

  const handleTriggerDailyAgenda = async () => {
    try {
      setTriggeringAgenda(true);
      setAutomationActionStatus(null);
      const res = await fetch('/api/notifications/trigger-daily-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setAutomationActionStatus(data.message || "Daily Doctor Agenda WhatsApp summary sent!");
        fetchLogsAndConfig();
      } else {
        setAutomationActionStatus(data.error || 'Failed to dispatch daily agenda');
      }
    } catch (err) {
      setAutomationActionStatus('Error dispatching daily doctor agenda');
    } finally {
      setTriggeringAgenda(false);
      setTimeout(() => setAutomationActionStatus(null), 5000);
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setTriggeringReminders(true);
      setAutomationActionStatus(null);
      const res = await fetch('/api/notifications/trigger-reminders', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setAutomationActionStatus('Checked and dispatched upcoming appointment reminders.');
        fetchLogsAndConfig();
      } else {
        setAutomationActionStatus(data.error || 'Failed to dispatch reminders');
      }
    } catch (err) {
      setAutomationActionStatus('Error triggering reminders');
    } finally {
      setTriggeringReminders(false);
      setTimeout(() => setAutomationActionStatus(null), 5000);
    }
  };

  const handleRetryNotification = async (id: string) => {
    try {
      setRetryingId(id);
      const res = await fetch(`/api/notifications/retry/${encodeURIComponent(id)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchLogsAndConfig();
      } else {
        alert(data.error || 'Failed to retry notification');
      }
    } catch (err) {
      alert('Network error while retrying notification');
    } finally {
      setRetryingId(null);
    }
  };

  const handleTriggerWaitlistAlert = async (item: any) => {
    try {
      setTriggeringWaitlistId(item.id);
      setWaitlistStatusNotice(null);
      const res = await fetch('/api/waitlist/trigger-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: item.date,
          time: item.timeSlot,
          doctorName: item.doctorName,
          branchId: item.branchId,
          reason: 'Slot opened / manual dispatch from Admin Notifications Tab',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWaitlistStatusNotice(`Alert dispatched! WhatsApp sent to ${data.notifiedCount} waitlisted patient(s).`);
        fetchLogsAndConfig();
      } else {
        setWaitlistStatusNotice(data.error || 'Failed to dispatch alert');
      }
    } catch (err: any) {
      setWaitlistStatusNotice(err.message || 'Error triggering waitlist alert');
    } finally {
      setTriggeringWaitlistId(null);
      setTimeout(() => setWaitlistStatusNotice(null), 5000);
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filterType !== 'ALL' && item.recipientType !== filterType) return false;
    if (filterChannel !== 'ALL' && item.channel !== filterChannel) return false;
    if (filterEventType !== 'ALL' && item.eventType !== filterEventType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = (item.bookingRef || '').toLowerCase().includes(q);
      const matchName = (item.recipientName || '').toLowerCase().includes(q);
      const matchPhone = (item.recipientPhone || '').toLowerCase().includes(q);
      const matchContent = (item.messageContent || '').toLowerCase().includes(q);
      if (!matchRef && !matchName && !matchPhone && !matchContent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Instant Dual-Channel Engine
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Automated WhatsApp & SMS Notifications
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              Every confirmed booking instantly triggers <strong>4 parallel dispatches</strong>: WhatsApp & SMS to the patient with full confirmation details, and WhatsApp & SMS to the assigned doctor with patient notes & clinic chair alert.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchLogsAndConfig}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Logs
            </button>
            <div className="text-[11px] text-emerald-300/80 font-mono">
              Total Logged: <strong>{notifications.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Carrier & Telecom Live Gateway Diagnostics */}
      {healthData && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Live Telecom Carrier Diagnostics
              </h3>
              <p className="text-xs text-slate-500">
                Real-time connection status of your Twilio, Fast2SMS, and Direct Messaging routes
              </p>
            </div>
            <button
              type="button"
              onClick={fetchLogsAndConfig}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Re-test Carriers
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 100% Free Open Push Protocol (ntfy.sh) */}
            <div className="p-3.5 rounded-xl border border-blue-300 bg-blue-50/60 text-xs space-y-1.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    Free Push (ntfy.sh)
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                    100% Free Live
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-blue-900">
                  Broadcasts instant lockscreen push notifications with sound & vibration to <code className="font-mono font-bold bg-white px-1 py-0.5 rounded text-[10px]">ntfy.sh/smartdental_live_alerts</code>. Zero fees, zero registration!
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1.5">
                <a
                  href="https://ntfy.sh/smartdental_live_alerts"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-2 py-1 rounded-md text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  View Feed
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/notifications/free-push-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Admin Diagnostics Test',
                          message: 'Real-time test ping from Admin Panel to subscribed mobile devices.',
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert('Push notification fired to ntfy.sh/smartdental_live_alerts!');
                      }
                    } catch {}
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold text-blue-900 bg-white hover:bg-blue-100 border border-blue-300 transition-colors cursor-pointer"
                >
                  Ping Test
                </button>
              </div>
            </div>

            {/* Twilio Status */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              healthData.twilio?.authenticated
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : healthData.twilio?.configured
                ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Twilio (WhatsApp & SMS)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  healthData.twilio?.authenticated
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {healthData.twilio?.authenticated ? `Active (${healthData.twilio.accountType})` : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {healthData.twilio?.diagnosticMessage}
              </p>
              {healthData.twilio?.authenticated && (
                <div className="pt-1 text-[10px] text-slate-500 border-t border-emerald-200/50 flex flex-col gap-0.5">
                  <span>Account: <strong>{healthData.twilio.friendlyName}</strong></span>
                  <span>Twilio Phone: <strong>{healthData.twilio.hasIncomingPhoneNumbers ? healthData.twilio.incomingPhoneNumbers.join(', ') : 'None assigned yet'}</strong></span>
                </div>
              )}
            </div>

            {/* Fast2SMS Status */}
            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              healthData.fast2sms?.active
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : healthData.fast2sms?.configured
                ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Fast2SMS (Indian SMS)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  healthData.fast2sms?.active
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : healthData.fast2sms?.configured
                    ? 'bg-amber-200/70 text-amber-900'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {healthData.fast2sms?.active ? 'Active' : healthData.fast2sms?.configured ? 'Recharge Needed' : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                {healthData.fast2sms?.diagnosticMessage}
              </p>
            </div>

            {/* Direct 1-Click WhatsApp & SMS */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-1.5 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Direct & Zero-Touch
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Ready & 100% Free
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Auto-dispatches WhatsApp messages instantly, logs transmission proofs, and fires native device notifications silently.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Configuration & Quick Toggles */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Gateway Channels & Auto-Dispatch Controls
            </h3>
            <p className="text-xs text-slate-500">
              Configure real-time dispatch routes, providers, and auto-dispatch rules
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {savingConfig ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {configStatus && (
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{configStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Zero-Touch Hands-Free Master */}
          <div className="p-3.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/80 space-y-2 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                Zero-Touch Autonomous
              </span>
              <input
                type="checkbox"
                checked={config.zeroTouchAutoSendEnabled ?? true}
                onChange={(e) => setConfig({ ...config, zeroTouchAutoSendEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Zero human touch: auto-dispatches to both doctor and patient on submission
            </p>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block self-start ${(config.zeroTouchAutoSendEnabled ?? true) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {(config.zeroTouchAutoSendEnabled ?? true) ? 'ACTIVE (NO HUMAN TOUCH)' : 'MANUAL REVIEW'}
            </span>
          </div>

          {/* Master Switch */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Master Auto-Dispatch</span>
              <input
                type="checkbox"
                checked={config.autoDispatchEnabled}
                onChange={(e) => setConfig({ ...config, autoDispatchEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Automatically trigger dispatch pipeline upon booking submission
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block self-start ${config.autoDispatchEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {config.autoDispatchEnabled ? 'ENABLED' : 'PAUSED'}
            </span>
          </div>

          {/* Patient WhatsApp */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                Patient WhatsApp
              </span>
              <input
                type="checkbox"
                checked={config.patientWhatsAppEnabled}
                onChange={(e) => setConfig({ ...config, patientWhatsAppEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Sends receipt, directions, and slot prep guidelines
            </p>
            <span className="text-[10px] font-mono text-emerald-700">Provider: {config.whatsappGatewayProvider}</span>
          </div>

          {/* Patient SMS */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                Patient SMS
              </span>
              <input
                type="checkbox"
                checked={config.patientSmsEnabled}
                onChange={(e) => setConfig({ ...config, patientSmsEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              DLT-compliant flash transactional SMS alert
            </p>
            <span className="text-[10px] font-mono text-blue-700">Provider: {config.smsGatewayProvider}</span>
          </div>

          {/* Doctor Dual Alert */}
          <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                Doctor Alerts (WA & SMS)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  title="Doctor WhatsApp"
                  checked={config.doctorWhatsAppEnabled}
                  onChange={(e) => setConfig({ ...config, doctorWhatsAppEnabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <input
                  type="checkbox"
                  title="Doctor SMS"
                  checked={config.doctorSmsEnabled}
                  onChange={(e) => setConfig({ ...config, doctorSmsEnabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Instant alerts sent to assigned doctor mobile
            </p>
            <span className="text-[10px] font-mono text-purple-700">WA: {config.doctorWhatsAppEnabled ? 'ON' : 'OFF'} • SMS: {config.doctorSmsEnabled ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* Gateway Selectors & Contact Fallbacks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              WhatsApp Gateway Provider
            </label>
            <select
              value={config.whatsappGatewayProvider}
              onChange={(e) => setConfig({ ...config, whatsappGatewayProvider: e.target.value as any })}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Meta Cloud API">Meta Cloud API (Official Cloud)</option>
              <option value="Twilio">Twilio WhatsApp Messaging</option>
              <option value="Gupshup">Gupshup Enterprise Route</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              SMS Gateway Provider
            </label>
            <select
              value={config.smsGatewayProvider}
              onChange={(e) => setConfig({ ...config, smsGatewayProvider: e.target.value as any })}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="Fast2SMS">Fast2SMS (Indian DLT Flash Route)</option>
              <option value="Twilio">Twilio Programmable SMS</option>
              <option value="MSG91">MSG91 Priority DLT Route</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Default Doctor Mobile (Fallback)
            </label>
            <input
              type="text"
              value={config.defaultDoctorPhone}
              onChange={(e) => setConfig({ ...config, defaultDoctorPhone: e.target.value })}
              placeholder="+91 98201 55441"
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Clinic Helpline in Messages
            </label>
            <input
              type="text"
              value={config.clinicHelplineNumber}
              onChange={(e) => setConfig({ ...config, clinicHelplineNumber: e.target.value })}
              placeholder="+91 98765 00000"
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Advanced Zero-Touch Direct Gateway Credentials */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvancedCredentials(!showAdvancedCredentials)}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-2 py-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-600" />
            <span>{showAdvancedCredentials ? 'Hide Direct Gateway API Credentials' : 'Configure Direct WhatsApp & SMS API Credentials (Meta Cloud API, Webhooks, Twilio)'}</span>
            <span className="text-[10px] font-normal text-slate-400">({showAdvancedCredentials ? 'Click to collapse' : 'Click to expand'})</span>
          </button>

          {showAdvancedCredentials && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">Zero-Touch Live Gateway Configuration</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                When credentials are provided below, the server calls the official WhatsApp/SMS APIs directly in the background. If left blank, the system dispatches via direct webhook and high-priority instant background routes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Phone Number ID (WhatsApp Cloud API)
                  </label>
                  <input
                    type="text"
                    value={config.metaPhoneNumberId || ''}
                    onChange={(e) => setConfig({ ...config, metaPhoneNumberId: e.target.value })}
                    placeholder="e.g. 104857205849302"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Meta Permanent Access Token
                  </label>
                  <input
                    type="password"
                    value={config.metaAccessToken || ''}
                    onChange={(e) => setConfig({ ...config, metaAccessToken: e.target.value })}
                    placeholder="EAAGm0PX4ZC... (System User Token)"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Custom Webhook URL (UltraMsg / WATI / Zapier)
                  </label>
                  <input
                    type="text"
                    value={config.customWebhookUrl || ''}
                    onChange={(e) => setConfig({ ...config, customWebhookUrl: e.target.value })}
                    placeholder="https://api.ultramsg.com/instance.../messages/chat"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Twilio Account SID (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.twilioAccountSid || ''}
                    onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value })}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Twilio Auth Token (Optional)
                  </label>
                  <input
                    type="password"
                    value={config.twilioAuthToken || ''}
                    onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value })}
                    placeholder="Auth Token"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    CallMeBot WhatsApp API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={config.callMeBotApiKey || ''}
                    onChange={(e) => setConfig({ ...config, callMeBotApiKey: e.target.value })}
                    placeholder="e.g. 123456"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automated WhatsApp Flows & Schedulers */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Automated WhatsApp Flows & Trigger Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Autonomous background triggers for daily doctor schedules, booking confirmations, cancellations, reminders, and Google reviews
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {savingConfig ? 'Saving...' : 'Save Automation Rules'}
          </button>
        </div>

        {automationActionStatus && (
          <div className="p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{automationActionStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flow 1: Daily Doctor WhatsApp Reminder */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Daily Doctor WhatsApp Reminder
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.dailyDoctorAgendaEnabled}
                    onChange={(e) => setConfig({ ...config, dailyDoctorAgendaEnabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Every morning at the scheduled time, the server automatically checks today's appointments and dispatches a clean WhatsApp agenda to each doctor (or notice if no appointments are scheduled).
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-purple-100 text-[11px] text-slate-700 font-mono space-y-1">
                <div className="text-purple-900 font-bold">Preview message format:</div>
                <div className="text-slate-600 italic">
                  "Good morning Dr. [Name]. Today's appointments: 3<br />
                  10:00 AM – Rahul Sharma (Root Canal)<br />
                  11:30 AM – Priya Patil (Teeth Whitening)..."
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-purple-200/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700">Daily Schedule Time:</label>
                <input
                  type="time"
                  value={config.dailyDoctorAgendaTime || '08:00'}
                  onChange={(e) => setConfig({ ...config, dailyDoctorAgendaTime: e.target.value })}
                  className="text-xs p-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={handleTriggerDailyAgenda}
                disabled={triggeringAgenda}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sun className={`w-3.5 h-3.5 ${triggeringAgenda ? 'animate-spin' : ''}`} />
                {triggeringAgenda ? 'Sending Agenda...' : "Send Today's Agenda Now"}
              </button>
            </div>
          </div>

          {/* Flow 2: Automatic WhatsApp Cancellation */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-600" />
                  Automatic WhatsApp Cancellation
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.cancellationWhatsAppEnabled}
                    onChange={(e) => setConfig({ ...config, cancellationWhatsAppEnabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                When patient or clinic cancels an appointment, the system automatically sets appointment status to Cancelled and sends instant cancellation WhatsApp messages to both patient and assigned doctor.
              </p>

              <div className="bg-white p-2.5 rounded-lg border border-rose-100 text-[11px] text-slate-700 font-mono space-y-1">
                <div className="text-rose-900 font-bold">Automated behavior:</div>
                <div className="text-slate-600">
                  • Patient gets official cancellation receipt with reschedule helpline.<br />
                  • Doctor gets immediate slot-freed notification on WhatsApp.
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span>Status: <strong className={config.cancellationWhatsAppEnabled ? 'text-rose-700' : 'text-slate-400'}>{config.cancellationWhatsAppEnabled ? 'ACTIVE (Dual WhatsApp Dispatch)' : 'DISABLED'}</strong></span>
              <span className="text-slate-400">Triggers on Cancel button in database</span>
            </div>
          </div>

          {/* Flow 3: Patient Appointment Reminders */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  Patient Automatic Reminders
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  30s Background Scheduler
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Sends automated WhatsApp reminders to patients before their appointment with clinic directions and preparation guidelines.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.patientReminder24hEnabled}
                    onChange={(e) => setConfig({ ...config, patientReminder24hEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">24-Hour Reminder</div>
                    <div className="text-[10px] text-slate-500">Day before slot</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.patientReminder2hEnabled}
                    onChange={(e) => setConfig({ ...config, patientReminder2hEnabled: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">2-Hour Reminder</div>
                    <div className="text-[10px] text-slate-500">Immediate prep</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">Auto-dispatches via background scheduler</span>
              <button
                type="button"
                onClick={handleTriggerReminders}
                disabled={triggeringReminders}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${triggeringReminders ? 'animate-spin' : ''}`} />
                {triggeringReminders ? 'Checking...' : 'Run Reminders Check Now'}
              </button>
            </div>
          </div>

          {/* Flow 4: Post-Appointment Review System */}
          <div className="p-4 rounded-xl border border-yellow-200 bg-yellow-50/30 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  Post-Appointment Review System
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.reviewRequestEnabled}
                    onChange={(e) => setConfig({ ...config, reviewRequestEnabled: e.target.checked })}
                    className="w-4 h-4 text-yellow-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Triggered automatically when an appointment status is marked Completed. Sends a warm review WhatsApp with 5-star rating request and your Google review link.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Google Review / Feedback URL:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={config.googleReviewLink || ''}
                    onChange={(e) => setConfig({ ...config, googleReviewLink: e.target.value })}
                    placeholder="https://g.page/r/smart-dental-clinic/review"
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 bg-white text-slate-800"
                  />
                  {config.googleReviewLink && (
                    <a
                      href={config.googleReviewLink}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="p-2 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 shrink-0"
                      title="Open Google Review Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-yellow-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Status: <strong className={config.reviewRequestEnabled ? 'text-emerald-700' : 'text-slate-400'}>{config.reviewRequestEnabled ? 'ACTIVE (Auto-Send on Completion)' : 'DISABLED'}</strong>
              </span>
              <span className="text-amber-800 font-bold">⭐ ⭐ ⭐ ⭐ ⭐ 5-Star Format</span>
            </div>
          </div>
        </div>

        {/* Contact Numbers for WhatsApp Messages */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Official Clinic WhatsApp Number
            </label>
            <input
              type="text"
              value={config.clinicWhatsAppNumber || ''}
              onChange={(e) => setConfig({ ...config, clinicWhatsAppNumber: e.target.value })}
              placeholder="+91 98765 00000"
              className="w-full text-xs font-mono font-medium p-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Clinic Helpline Number
            </label>
            <input
              type="text"
              value={config.clinicHelplineNumber || ''}
              onChange={(e) => setConfig({ ...config, clinicHelplineNumber: e.target.value })}
              placeholder="+91 98765 00000"
              className="w-full text-xs font-mono font-medium p-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Default Doctor Phone (Fallback)
            </label>
            <input
              type="text"
              value={config.defaultDoctorPhone || ''}
              onChange={(e) => setConfig({ ...config, defaultDoctorPhone: e.target.value })}
              placeholder="+91 98201 55441"
              className="w-full text-xs font-mono font-medium p-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>
      </div>

      {/* n8n Workflow Automation Bridge */}
      <div className="bg-gradient-to-br from-white via-rose-50/30 to-orange-50/20 rounded-2xl p-5 border-2 border-rose-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rose-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                <Workflow className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                n8n Workflow Automation & WhatsApp Notifier Bridge
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                Connected & Active
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Directly connected to your custom <strong>Doctor-Patient WhatsApp Appointment Notifier</strong> n8n workflow.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/api/n8n/workflow"
              download="smartdental-n8n-workflow.json"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-900 bg-white hover:bg-rose-100/70 border border-rose-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Download pre-configured n8n JSON file with API endpoints connected"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              Download Connected Workflow (.json)
            </a>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Save n8n Settings
            </button>
          </div>
        </div>

        {/* Live REST API for n8n (replaces Google Sheets) */}
        <div className="p-4 rounded-xl bg-white border border-rose-200/80 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-rose-600" />
              Direct Live REST API for n8n (HTTP Request Node)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Drop-in Google Sheets Alternative
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            In your n8n workflow, the <strong>HTTP Request</strong> node fetches today's live appointments with the exact column keys required:
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">PatientName</code>,
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">AppointmentTime</code>,
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">PatientPhone</code>,
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">DoctorPhone</code>,
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">Reason</code>, and
            <code className="text-[10px] font-mono bg-slate-100 px-1 py-0.5 rounded mx-1 text-slate-800">ClinicAddress</code>.
          </p>

          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs bg-slate-900 text-emerald-400 p-2.5 rounded-xl border border-slate-800 truncate select-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/n8n/appointments/today` : '/api/n8n/appointments/today'}
            </div>
            <button
              type="button"
              onClick={() => {
                const url = typeof window !== 'undefined' ? `${window.location.origin}/api/n8n/appointments/today` : '/api/n8n/appointments/today';
                navigator.clipboard.writeText(url);
                setCopiedUrl('n8n_today');
                setTimeout(() => setCopiedUrl(null), 2500);
              }}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedUrl === 'n8n_today' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedUrl === 'n8n_today' ? 'Copied!' : 'Copy API URL'}
            </button>
          </div>
        </div>

        {/* Webhook Triggers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Webhook 1: Instant Booking Event */}
          <div className="p-4 rounded-xl bg-white border border-rose-200 space-y-3 flex flex-col justify-between shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-rose-600" />
                  Instant Booking Webhook URL
                </span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.n8nEnabled ?? true}
                    onChange={(e) => setConfig({ ...config, n8nEnabled: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                  />
                  <span>Active</span>
                </label>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                When a patient completes a booking on this website, our server instantly calls this n8n webhook with the full booking payload.
              </p>

              <div>
                <input
                  type="url"
                  value={config.n8nWebhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, n8nWebhookUrl: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/dental-appointment"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-rose-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTestN8nWebhook}
                disabled={testingN8n || !config.n8nWebhookUrl}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {testingN8n ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {testingN8n ? 'Testing Ping...' : 'Test Webhook Ping'}
              </button>
              <span className="text-[11px] text-slate-500 font-medium">Event: APPOINTMENT_CONFIRMED</span>
            </div>
          </div>

          {/* Webhook 2: Morning Agenda 8 AM Webhook */}
          <div className="p-4 rounded-xl bg-white border border-rose-200 space-y-3 flex flex-col justify-between shadow-2xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  Morning 8:00 AM Agenda Webhook URL
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Daily Cron Trigger
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Sends today's aggregated schedule and patient list to your n8n workflow at 8:00 AM every morning (or on demand).
              </p>

              <div>
                <input
                  type="url"
                  value={config.n8nMorningAgendaWebhookUrl || ''}
                  onChange={(e) => setConfig({ ...config, n8nMorningAgendaWebhookUrl: e.target.value })}
                  placeholder="https://your-n8n-instance.com/webhook/morning-agenda"
                  className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-rose-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTriggerDailyAgenda}
                disabled={triggeringAgenda}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {triggeringAgenda ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sun className="w-3.5 h-3.5" />}
                {triggeringAgenda ? 'Sending Agenda...' : 'Trigger Morning Run Now'}
              </button>
              <span className="text-[11px] text-slate-500 font-medium">8:00 AM Daily</span>
            </div>
          </div>
        </div>

        {/* n8n Live Test Result Banner */}
        {n8nTestResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
            n8nTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {n8nTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              <span>{n8nTestResult.message}</span>
              {n8nTestResult.statusCode && (
                <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border">
                  HTTP {n8nTestResult.statusCode}
                </span>
              )}
            </div>
            {n8nTestResult.responsePreview && (
              <div className="font-mono text-[11px] bg-white/80 p-2 rounded border mt-1">
                Response: {n8nTestResult.responsePreview}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Live Test Dispatch Sandbox */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              Live Test Dispatch Sandbox
            </h3>
            <p className="text-xs text-slate-500">
              Verify your WhatsApp and SMS delivery to any mobile number in real time
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Simulated & Live Gateways Ready
          </span>
        </div>

        {/* Zero-Touch Dual Automated Test Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Zero-Touch Dual Automated Dispatch Test (Doctor + Patient)
                </h4>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  HANDS-FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Simultaneously test the autonomous zero-human-touch dispatch for both the patient receipt and doctor clinical notification.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendDualAutomatedTest}
              disabled={triggeringDualTest}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-50"
            >
              {triggeringDualTest ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching to Both...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Run Dual Auto-Dispatch Test</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                Patient Mobile
              </label>
              <input
                type="text"
                value={dualPatientPhone}
                onChange={(e) => setDualPatientPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs font-mono p-2 rounded-lg border border-emerald-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                Patient Name
              </label>
              <input
                type="text"
                value={dualPatientName}
                onChange={(e) => setDualPatientName(e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full text-xs p-2 rounded-lg border border-emerald-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                Assigned Doctor Mobile
              </label>
              <input
                type="text"
                value={dualDoctorPhone}
                onChange={(e) => setDualDoctorPhone(e.target.value)}
                placeholder="+91 98201 55441"
                className="w-full text-xs font-mono p-2 rounded-lg border border-teal-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                value={dualDoctorName}
                onChange={(e) => setDualDoctorName(e.target.value)}
                placeholder="Dr. Vikram Shah"
                className="w-full text-xs p-2 rounded-lg border border-teal-200 bg-white"
              />
            </div>
          </div>

          {dualTestResult && (
            <div className={`p-3 rounded-xl border text-xs ${dualTestResult.success ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'}`}>
              <div className="font-bold flex items-center justify-between">
                <span>{dualTestResult.success ? '✅ Zero-Touch Dual Dispatch Delivered' : '❌ Test Failed'}</span>
                <span className="text-[10px] font-mono">{new Date().toLocaleTimeString()}</span>
              </div>
              <p className="text-[11px] mt-1">{dualTestResult.message || dualTestResult.error}</p>
              {dualTestResult.dispatched && (
                <div className="mt-2 pt-2 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-lg">
                    <span className="font-bold text-emerald-900 block">👤 Patient Slip:</span>
                    <span className="text-slate-600 font-mono text-[10px]">{dualTestResult.dispatched.patient?.phone}</span>
                    <span className="text-emerald-700 font-bold ml-2">✓ Transmitted</span>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg">
                    <span className="font-bold text-teal-900 block">🩺 Doctor Alert:</span>
                    <span className="text-slate-600 font-mono text-[10px]">{dualTestResult.dispatched.doctor?.phone}</span>
                    <span className="text-teal-700 font-bold ml-2">✓ Transmitted</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSendTest} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Recipient Target
              </label>
              <select
                value={testType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setTestType(val);
                  if (val === 'DOCTOR') {
                    setTestName('Dr. Vikram Shah');
                    setTestPhone(doctors[0]?.phone || '+91 98201 55441');
                  } else {
                    setTestName('Patient Test User');
                    setTestPhone('+91 98765 43210');
                  }
                }}
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DOCTOR">Doctor (Medical Alert Route)</option>
                <option value="PATIENT">Patient (Booking Slip Route)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTestChannel('WHATSAPP')}
                  className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    testChannel === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setTestChannel('SMS')}
                  className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    testChannel === 'SMS'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  SMS
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Recipient Name
              </label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Dr. Vikram Shah"
                className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+91 98201 55441"
                className="w-full text-xs font-mono font-medium p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="Optional custom message text (leave blank for standard clinic confirmation template)..."
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={sendingTest}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {sendingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingTest ? 'Sending...' : `Server ${testChannel} Gateway`}
            </button>

            {testChannel === 'WHATSAPP' ? (
              <a
                href={`https://wa.me/${testPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(customMsg.trim() || `[Smart Dental Clinic Test Alert] Hello ${testName}, this is a live test notification for your appointment booking.`)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#20bd5a] flex items-center justify-center gap-2 shrink-0 shadow-xs transition-colors cursor-pointer"
                title="Send real WhatsApp message to this number right now"
              >
                <MessageSquare className="w-4 h-4" />
                Direct Real WhatsApp
              </a>
            ) : (
              <a
                href={`sms:${testPhone.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(customMsg.trim() || `[Smart Dental Clinic Test Alert] Hello ${testName}, this is a test SMS alert for your appointment booking.`)}`}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 shrink-0 shadow-xs transition-colors cursor-pointer"
                title="Open native SMS app on device with this message"
              >
                <Smartphone className="w-4 h-4" />
                Direct Real SMS
              </a>
            )}
          </div>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : 'bg-rose-50 text-rose-950 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold flex items-center gap-2">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {testResult.message}
              </span>
              {testResult.notification && (
                <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Delivered in {testResult.notification.deliveredInMs}ms via {testResult.notification.gateway}
                </span>
              )}
            </div>
            {testResult.notification && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-[11px] whitespace-pre-wrap">
                {testResult.notification.messageContent}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Doctor Phone Directory */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-purple-600" />
              Doctor Alert Mobile Directory
            </h3>
            <p className="text-xs text-slate-500">
              These mobile phone numbers receive the instant Doctor WhatsApp & SMS alerts upon patient booking
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {doctors.map((doc) => (
            <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{doc.avatarIcon}</span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{doc.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{doc.spec}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/70 text-[11px] flex items-center justify-between">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-mono font-bold text-emerald-700">{doc.phone || '+91 98201 55441'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Waitlist & Slot Automation Queue Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Live Waitlist Automation
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                {waitlistEntries.filter((w) => w.status === 'WAITING').length} Waiting · {waitlistEntries.filter((w) => w.status === 'NOTIFIED').length} Notified
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-base mt-0.5 flex items-center gap-2">
              <BellRing className="w-4 h-4 text-amber-600" />
              Priority Waitlist & Slot Queue
            </h3>
            <p className="text-xs text-slate-500">
              Patients waiting for fully booked slots. When an appointment is cancelled or rescheduled, our engine automatically triggers an urgent WhatsApp alert.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchLogsAndConfig}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {waitlistStatusNotice && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{waitlistStatusNotice}</span>
          </div>
        )}

        {waitlistEntries.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <BellRing className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-600">No patients currently on the waitlist.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              When patients click <strong>"Join Waitlist"</strong> on booked time slots in the Schedule step, they will queue here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Requested Slot</th>
                  <th className="py-2.5 px-3">Doctor & Branch</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitlistEntries.map((w) => {
                  const isWaiting = w.status === 'WAITING';
                  const isNotified = w.status === 'NOTIFIED';
                  const isTriggering = triggeringWaitlistId === w.id;

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{w.patientName}</div>
                        <div className="font-mono text-[10px] text-emerald-700">{w.patientPhone}</div>
                        {w.notes && (
                          <div className="text-[10px] text-slate-500 italic mt-0.5">"{w.notes}"</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-extrabold text-blue-700">{w.timeSlot}</div>
                        <div className="text-[10px] text-slate-500">{w.dateFormatted || w.date}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{w.doctorName || 'Any Specialist'}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                          {w.treatmentName || 'Dental Care'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {isWaiting && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            Waiting for opening
                          </span>
                        )}
                        {isNotified && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              WhatsApp Alert Dispatched
                            </span>
                            {w.notifiedAtFormatted && (
                              <span className="text-[9px] text-slate-400">{w.notifiedAtFormatted}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {w.notificationDirectUrl && (
                            <a
                              href={w.notificationDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="Open direct WhatsApp alert"
                            >
                              <ExternalLink className="w-3 h-3 text-[#25D366]" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTriggerWaitlistAlert(w)}
                            disabled={isTriggering}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Simulate slot freed up and trigger immediate WhatsApp alert to this patient"
                          >
                            <Zap className={`w-3 h-3 text-amber-300 ${isTriggering ? 'animate-spin' : ''}`} />
                            <span>{isTriggering ? 'Alerting...' : 'Dispatch WhatsApp Alert'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Dispatches Log Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Real-Time Instant Dispatches Stream
            </h3>
            <p className="text-xs text-slate-500">
              Audit log of instant WhatsApp and SMS messages dispatched across patients & doctors
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, name, phone..."
                className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white w-44 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs p-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="ALL">All Targets</option>
              <option value="PATIENT">Patient Only</option>
              <option value="DOCTOR">Doctor Only</option>
            </select>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value as any)}
              className="text-xs p-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="ALL">All Channels</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>

            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="text-xs p-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="ALL">All Event Types</option>
              <option value="WAITLIST_ALERT">Waitlist Slot Alerts (WhatsApp)</option>
              <option value="WAITLIST_REGISTRATION">Waitlist Registrations</option>
              <option value="BOOKING_CONFIRMATION">Booking Confirmations</option>
              <option value="CANCELLATION">Cancellations</option>
              <option value="DAILY_DOCTOR_AGENDA">Doctor Daily Agenda</option>
              <option value="PATIENT_24H_REMINDER">24h Reminders</option>
              <option value="PATIENT_2H_REMINDER">2h Reminders</option>
              <option value="REVIEW_REQUEST">Review Requests</option>
              <option value="MANUAL_TEST">Manual Tests</option>
            </select>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Time & Event</th>
                <th className="py-2.5 px-3">Recipient</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Gateway & Speed</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No notification dispatches found matching filters
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notif) => (
                  <tr key={notif.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-blue-600">{notif.bookingRef}</div>
                      <div className="text-[10px] text-slate-400">{notif.timestampFormatted || 'Recently'}</div>
                      <div className="mt-1">
                        {notif.eventType === 'CANCELLATION' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-0.5">
                            <Ban className="w-2.5 h-2.5" /> Cancellation
                          </span>
                        )}
                        {notif.eventType === 'DAILY_DOCTOR_AGENDA' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-0.5">
                            <Sun className="w-2.5 h-2.5" /> Doctor Daily Agenda
                          </span>
                        )}
                        {notif.eventType === 'PATIENT_24H_REMINDER' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                            <Bell className="w-2.5 h-2.5" /> 24h Reminder
                          </span>
                        )}
                        {notif.eventType === 'PATIENT_2H_REMINDER' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> 2h Reminder
                          </span>
                        )}
                        {notif.eventType === 'REVIEW_REQUEST' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 inline-flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" /> Review Request
                          </span>
                        )}
                        {(!notif.eventType || notif.eventType === 'BOOKING_CONFIRMATION') && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Booking Confirmed
                          </span>
                        )}
                        {notif.eventType === 'WAITLIST_ALERT' && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-0.5">
                            <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> Waitlist Slot Alert
                          </span>
                        )}
                        {notif.eventType === 'WAITLIST_REGISTRATION' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" /> Waitlist Joined
                          </span>
                        )}
                        {notif.eventType === 'MANUAL_TEST' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-0.5">
                            <Send className="w-2.5 h-2.5" /> Test Dispatch
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        {notif.recipientType === 'DOCTOR' ? (
                          <span className="p-0.5 rounded bg-purple-100 text-purple-700 text-[10px]">DR</span>
                        ) : (
                          <span className="p-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px]">PT</span>
                        )}
                        {notif.recipientName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">{notif.recipientPhone}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {notif.channel === 'WHATSAPP' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                          <MessageSquare className="w-3 h-3 text-[#25D366]" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px]">
                          <Smartphone className="w-3 h-3 text-blue-600" />
                          SMS
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-[11px] text-slate-700 font-medium truncate max-w-[180px]">{notif.gateway}</div>
                      <div className="font-mono text-[10px] text-emerald-700 font-bold">⚡ {notif.deliveredInMs || 125}ms</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {notif.status === 'FAILED' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-bold text-[10px] text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                            FAILED
                          </span>
                          {notif.failureReason && (
                            <div className="text-[9px] text-rose-600 max-w-[140px] truncate" title={notif.failureReason}>
                              {notif.failureReason}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => handleRetryNotification(notif.id)}
                              disabled={retryingId === notif.id}
                              className="text-[10px] px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                              <RefreshCw className={`w-2.5 h-2.5 ${retryingId === notif.id ? 'animate-spin' : ''}`} />
                              Retry
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          {notif.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActivePreview(notif)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Message Modal */}
      {activePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  {activePreview.channel === 'WHATSAPP' ? 'WA' : 'SMS'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {activePreview.recipientType} {activePreview.channel} Payload
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    To: {activePreview.recipientName} ({activePreview.recipientPhone}) • Ref: {activePreview.bookingRef}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
                <div>Gateway: <strong>{activePreview.gateway}</strong></div>
                <div>Message ID: <strong>{activePreview.gatewayMessageId}</strong></div>
                <div>Status: <strong className="text-emerald-600">{activePreview.status}</strong></div>
                <div>Latency: <strong>{activePreview.deliveredInMs}ms</strong></div>
              </div>

              <div className="p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed border bg-white text-slate-900 border-slate-200 shadow-inner">
                {activePreview.messageContent}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
              <button
                type="button"
                onClick={() => handleCopyMessage(activePreview.messageContent)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Message'}
              </button>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
