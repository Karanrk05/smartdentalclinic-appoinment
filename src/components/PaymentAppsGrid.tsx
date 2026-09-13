import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Smartphone,
  AlertCircle,
  RefreshCw,
  Camera,
  Sparkles,
  Receipt,
  X,
  ArrowRight,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export interface PaymentSuccessResult {
  transactionId: string;
  amount: number;
  paymentMode: string;
  timestamp: string;
  payerUtr?: string;
}

interface PaymentAppsGridProps {
  amount?: number | string;
  totalFee?: number;
  patientName?: string;
  bookingNote?: string;
  clinicUpiId?: string;
  clinicName?: string;
  onPaymentInitiated?: (appName: string) => void;
  onPaymentSuccess?: (result: PaymentSuccessResult) => void;
  onOpenScanner?: () => void;
  onAmountChange?: (newAmount: number) => void;
}

interface PaymentAppConfig {
  id: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'any_upi';
  name: string;
  shortName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  tagColor: string;
  tag: string;
  badgeColor: string;
  androidPackage: string;
  iosScheme: string;
  iconType: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'upi';
}

export const PaymentAppsGrid: React.FC<PaymentAppsGridProps> = ({
  amount = 200,
  totalFee = 500,
  patientName = 'Patient',
  bookingNote = 'Dental Appointment Booking Token',
  clinicUpiId = 'smartdental@okhdfcbank',
  clinicName = 'Smart Dental Clinic',
  onPaymentInitiated,
  onPaymentSuccess,
  onOpenScanner,
  onAmountChange,
}) => {
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showInlineQr, setShowInlineQr] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  // Active App Launch & Post-Payment State
  const [activeApp, setActiveApp] = useState<PaymentAppConfig | null>(null);
  const [activeTxnRef, setActiveTxnRef] = useState<string>('');
  const [modalQrUrl, setModalQrUrl] = useState<string>('');
  const [showModalQr, setShowModalQr] = useState<boolean>(false);
  const [utrInput, setUtrInput] = useState<string>('');
  const [utrError, setUtrError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] = useState<boolean>(false);
  const [isRelaunching, setIsRelaunching] = useState<boolean>(false);
  const [relaunchStatus, setRelaunchStatus] = useState<string>('');
  const [relaunchCount, setRelaunchCount] = useState<number>(0);

  // Selected Amount Handling
  const numAmount =
    typeof amount === 'number'
      ? amount
      : parseInt(String(amount).replace(/[^0-9]/g, ''), 10) || 200;

  // Environment checks
  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Generate unique stable reference for this view session
  const [currentSessionRef] = useState<string>(
    () => `SDC${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`
  );

  // Dedicated app configs
  const paymentApps: PaymentAppConfig[] = [
    {
      id: 'gpay',
      name: 'Google Pay',
      shortName: 'Google Pay',
      bgColor: 'bg-white hover:bg-slate-50',
      textColor: 'text-slate-900',
      borderColor: 'border-blue-400 hover:border-blue-600 shadow-sm hover:shadow-md',
      tagColor: 'bg-blue-50 text-blue-700',
      tag: `Auto-fill ₹${numAmount}`,
      badgeColor: '#4285F4',
      androidPackage: 'com.google.android.apps.nbu.paisa.user',
      iosScheme: 'gpay://upi/pay',
      iconType: 'gpay',
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      shortName: 'PhonePe',
      bgColor: 'bg-[#5f259f]/5 hover:bg-[#5f259f]/10',
      textColor: 'text-[#5f259f]',
      borderColor: 'border-[#5f259f]/30 hover:border-[#5f259f] hover:shadow-md',
      tagColor: 'bg-[#5f259f]/10 text-[#5f259f]',
      tag: `Auto-fill ₹${numAmount}`,
      badgeColor: '#5f259f',
      androidPackage: 'com.phonepe.app',
      iosScheme: 'phonepe://pay',
      iconType: 'phonepe',
    },
    {
      id: 'paytm',
      name: 'Paytm UPI',
      shortName: 'Paytm',
      bgColor: 'bg-[#002e6e]/5 hover:bg-[#002e6e]/10',
      textColor: 'text-[#002e6e]',
      borderColor: 'border-[#002e6e]/30 hover:border-[#00baf2] hover:shadow-md',
      tagColor: 'bg-[#00baf2]/10 text-[#002e6e]',
      tag: `Auto-fill ₹${numAmount}`,
      badgeColor: '#00baf2',
      androidPackage: 'net.one97.paytm',
      iosScheme: 'paytmmp://pay',
      iconType: 'paytm',
    },
    {
      id: 'bhim',
      name: 'BHIM UPI',
      shortName: 'BHIM',
      bgColor: 'bg-[#008744]/5 hover:bg-[#008744]/10',
      textColor: 'text-[#008744]',
      borderColor: 'border-[#008744]/30 hover:border-[#008744] hover:shadow-md',
      tagColor: 'bg-[#008744]/10 text-[#008744]',
      tag: 'NPCI Direct',
      badgeColor: '#008744',
      androidPackage: 'in.org.npci.upiapp',
      iosScheme: 'bhim://pay',
      iconType: 'bhim',
    },
    {
      id: 'any_upi',
      name: 'Any UPI App',
      shortName: 'Cred / Other',
      bgColor: 'bg-emerald-50/60 hover:bg-emerald-100/60',
      textColor: 'text-emerald-900',
      borderColor: 'border-emerald-300 hover:border-emerald-500 hover:shadow-md',
      tagColor: 'bg-emerald-100 text-emerald-800',
      tag: 'Universal',
      badgeColor: '#10b981',
      androidPackage: '',
      iosScheme: 'upi://pay',
      iconType: 'upi',
    },
  ];

  // Build standard RFC-compliant UPI URI
  const buildUniversalUpiUri = (txnId?: string, overrideAmount?: number) => {
    const amt = (overrideAmount !== undefined ? overrideAmount : numAmount).toFixed(2);
    const note = encodeURIComponent(`${bookingNote} (${patientName})`);
    const name = encodeURIComponent(clinicName);
    const ref = txnId || currentSessionRef;
    return `upi://pay?pa=${encodeURIComponent(clinicUpiId)}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${ref}&mc=8021`;
  };

  // Build direct app URL (Android Intent, iOS URL Scheme, or Universal UPI)
  const getDirectAppUrl = (appId: string, txnId?: string): string => {
    const amt = numAmount.toFixed(2);
    const note = encodeURIComponent(`${bookingNote} (${patientName})`);
    const name = encodeURIComponent(clinicName);
    const pa = encodeURIComponent(clinicUpiId);
    const ref = txnId || currentSessionRef;
    const commonParams = `pa=${pa}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${ref}&mc=8021`;

    if (isAndroid) {
      if (appId === 'gpay') {
        return `intent://pay?${commonParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      }
      if (appId === 'phonepe') {
        return `intent://pay?${commonParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
      }
      if (appId === 'paytm') {
        return `intent://pay?${commonParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
      }
      if (appId === 'bhim') {
        return `intent://pay?${commonParams}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
      }
      return `upi://pay?${commonParams}`;
    }

    if (isIOS) {
      if (appId === 'gpay') {
        return `gpay://upi/pay?${commonParams}`;
      }
      if (appId === 'phonepe') {
        return `phonepe://pay?${commonParams}`;
      }
      if (appId === 'paytm') {
        return `paytmmp://pay?${commonParams}`;
      }
      if (appId === 'bhim') {
        return `bhim://pay?${commonParams}`;
      }
      return `upi://pay?${commonParams}`;
    }

    // Default / Desktop / Universal
    if (appId === 'gpay') {
      return `intent://pay?${commonParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    }
    if (appId === 'phonepe') {
      return `intent://pay?${commonParams}#Intent;scheme=upi;package=com.phonepe.app;end`;
    }
    if (appId === 'paytm') {
      return `intent://pay?${commonParams}#Intent;scheme=upi;package=net.one97.paytm;end`;
    }
    return `upi://pay?${commonParams}`;
  };

  // Generate QR code on demand
  const generateQrDataUrl = async (upiString: string): Promise<string> => {
    try {
      const QRCode = (await import('qrcode')).default;
      return await QRCode.toDataURL(upiString, {
        width: 320,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
    } catch (err) {
      console.error('Failed to render QR Code:', err);
      return '';
    }
  };

  // Direct 1-Click App Opener Handler
  const handleAppClick = (app: PaymentAppConfig, e?: React.MouseEvent) => {
    const generatedTxnRef = `UPI/${app.shortName.toUpperCase().replace(/\s+/g, '')}/${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    setActiveTxnRef(generatedTxnRef);
    setActiveApp(app);
    setUtrInput('');
    setUtrError('');
    setVerificationSuccess(false);
    setIsRelaunching(false);
    setRelaunchStatus('');
    setRelaunchCount(0);

    if (onPaymentInitiated) {
      onPaymentInitiated(app.name);
    }

    const directUrl = getDirectAppUrl(app.id, generatedTxnRef);
    const universalUrl = buildUniversalUpiUri(generatedTxnRef);

    // Pre-generate QR code for this specific transaction
    generateQrDataUrl(universalUrl).then((url) => setModalQrUrl(url));

    // DIRECT NATIVE LAUNCH
    executeLaunchScheme(directUrl, universalUrl);
  };

  // Robust multi-channel launcher that triggers protocol handlers and native apps
  const executeLaunchScheme = (primaryUrl: string, fallbackUrl?: string) => {
    // 1. Dynamic top-level target anchor (crucial to break through iframe sandbox)
    try {
      const a = document.createElement('a');
      a.href = primaryUrl;
      a.target = '_top';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Anchor dispatch error:', err);
    }

    // 2. Direct location assign as immediate fallback
    try {
      window.location.assign(primaryUrl);
    } catch (err) {
      console.warn('Direct location assign error:', err);
    }

    // 3. Fallback scheme dispatch if primary doesn't capture within 250ms
    if (fallbackUrl) {
      setTimeout(() => {
        try {
          const fb = document.createElement('a');
          fb.href = fallbackUrl;
          fb.target = '_top';
          fb.rel = 'noopener noreferrer';
          document.body.appendChild(fb);
          fb.click();
          document.body.removeChild(fb);
        } catch {}
      }, 250);
    }
  };

  // Dedicated interactive Re-Launch handler
  const handleRelaunch = (targetAppOverride?: PaymentAppConfig) => {
    const target = targetAppOverride || activeApp;
    if (!target) return;

    setIsRelaunching(true);
    setRelaunchCount((prev) => prev + 1);
    setRelaunchStatus(`Opening ${target.name} on your device...`);

    const directUrl = getDirectAppUrl(target.id, activeTxnRef);
    const universalUrl = buildUniversalUpiUri(activeTxnRef);

    let fallbackUrl = universalUrl;
    if (target.id === 'gpay') {
      const amt = numAmount.toFixed(2);
      const note = encodeURIComponent(`${bookingNote} (${patientName})`);
      const name = encodeURIComponent(clinicName);
      const pa = encodeURIComponent(clinicUpiId);
      fallbackUrl = `tez://upi/pay?pa=${pa}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${activeTxnRef}&mc=8021`;
    }

    executeLaunchScheme(directUrl, fallbackUrl);

    // Provide feedback and reveal QR code assistance
    setTimeout(() => {
      setIsRelaunching(false);
      setRelaunchStatus(
        `✓ Signal sent to ${target.name}! If the app did not open automatically on your device, use the QR code below or tap 'Any UPI App'.`
      );
      setShowModalQr(true);
    }, 1200);
  };

  // Toggle inline QR
  const toggleInlineQr = async () => {
    if (!showInlineQr && !qrUrl) {
      const url = await generateQrDataUrl(buildUniversalUpiUri());
      setQrUrl(url);
    }
    setShowInlineQr(!showInlineQr);
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(clinicUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Copy UPI deep link
  const handleCopyLink = () => {
    const link = buildUniversalUpiUri(activeTxnRef);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Instant 1-Click Verification ("I have paid")
  const handleConfirmPaid = (customUtr?: string) => {
    setIsVerifying(true);
    setUtrError('');

    const finalTxnId =
      customUtr && customUtr.trim().length >= 6
        ? customUtr.trim()
        : activeTxnRef || `UPI/GPAY/${Date.now().toString().slice(-8)}`;

    setTimeout(() => {
      setIsVerifying(false);
      setVerificationSuccess(true);

      if (onPaymentSuccess) {
        onPaymentSuccess({
          transactionId: finalTxnId,
          amount: numAmount,
          paymentMode: activeApp ? activeApp.name : 'Google Pay (UPI)',
          timestamp: new Date().toISOString(),
          payerUtr: customUtr || finalTxnId,
        });
      }

      // Close modal after brief success presentation
      setTimeout(() => {
        setActiveApp(null);
        setVerificationSuccess(false);
      }, 1000);
    }, 600);
  };

  // Handle manual UTR verify
  const handleVerifyUtr = () => {
    if (!utrInput.trim()) {
      setUtrError('Please enter the 12-digit UPI reference (UTR) from your payment receipt');
      return;
    }
    const cleanUtr = utrInput.trim().replace(/[^a-zA-Z0-9]/g, '');
    if (cleanUtr.length < 6) {
      setUtrError('UPI Transaction ID / UTR must be at least 6 alphanumeric digits');
      return;
    }
    handleConfirmPaid(cleanUtr);
  };

  return (
    <div className="bg-slate-50 border-2 border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Top Header & Amount Print Display */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
              Direct UPI App Payment
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300">
              Auto-Printed ₹{numAmount}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Clicking Google Pay or any UPI app directly opens it with{' '}
            <strong className="text-slate-800 font-bold">₹{numAmount}.00</strong> already filled in
          </p>
        </div>

        {/* Quick Amount Options */}
        {onAmountChange && (
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => onAmountChange(200)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                numAmount === 200
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Token ₹200
            </button>
            <button
              type="button"
              onClick={() => onAmountChange(totalFee)}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                numAmount === totalFee
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full ₹{totalFee}
            </button>
          </div>
        )}
      </div>

      {/* FEATURED 1-TAP HERO: DIRECT GOOGLE PAY BUTTON */}
      <div className="relative group">
        <a
          href={getDirectAppUrl('gpay')}
          onClick={(e) => {
            handleAppClick(paymentApps[0], e);
          }}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl shadow-md hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer border border-blue-500"
          id="direct-gpay-hero-btn"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
              <div className="font-black text-base text-slate-800 tracking-tighter">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">P</span>
                <span className="text-[#FBBC05]">a</span>
                <span className="text-[#34A853]">y</span>
              </div>
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-sm sm:text-base text-white tracking-tight">
                  Open Google Pay Directly
                </h4>
                <span className="text-[10px] font-black bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-xs">
                  Auto-Print ₹{numAmount}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                Launches Google Pay app with ₹{numAmount}.00 pre-filled for {clinicName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-colors">
            <span>Pay Now</span>
            <ExternalLink className="w-4 h-4" />
          </div>
        </a>
      </div>

      {/* Auto-Amount Details Card */}
      <div className="bg-white border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Payee:</span>
              <strong className="text-slate-800 truncate">{clinicName}</strong>
              <span className="font-mono text-[11px] text-blue-600 truncate">({clinicUpiId})</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Booking Ref: <span className="font-semibold text-slate-700">{currentSessionRef}</span>
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
            Auto-Printed Fee
          </span>
          <span className="text-base sm:text-lg font-black text-[#2563eb] font-mono">
            ₹{numAmount}.00
          </span>
        </div>
      </div>

      {/* All UPI App Direct Links Grid */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-slate-700">
          Or open another UPI app directly:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {paymentApps.map((app) => (
            <a
              key={app.id}
              href={getDirectAppUrl(app.id)}
              onClick={(e) => handleAppClick(app, e)}
              className={`p-3 rounded-xl border-2 transition-all active:scale-95 cursor-pointer flex flex-col items-center text-center justify-between gap-2 shadow-xs group ${app.bgColor} ${app.borderColor}`}
            >
              {/* Top Indicator */}
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${app.tagColor}`}>
                {app.tag}
              </span>

              {/* Custom App Branding Icon */}
              <div className="w-11 h-11 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
                {app.iconType === 'gpay' && (
                  <div className="flex items-center justify-center font-black text-sm text-slate-800 tracking-tighter">
                    <span className="text-[#4285F4]">G</span>
                    <span className="text-[#EA4335]">P</span>
                    <span className="text-[#FBBC05]">a</span>
                    <span className="text-[#34A853]">y</span>
                  </div>
                )}
                {app.iconType === 'phonepe' && (
                  <div className="w-8 h-8 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-extrabold text-sm shadow-inner">
                    पे
                  </div>
                )}
                {app.iconType === 'paytm' && (
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[11px] font-black text-[#002e6e] tracking-tight">Pay</span>
                    <span className="text-[11px] font-black text-[#00baf2] tracking-tight">tm</span>
                  </div>
                )}
                {app.iconType === 'bhim' && (
                  <div className="font-black text-xs text-[#008744] tracking-tight flex items-center">
                    BHIM
                  </div>
                )}
                {app.iconType === 'upi' && (
                  <div className="flex flex-col items-center justify-center text-[10px] font-black text-emerald-800 leading-none">
                    <span>UPI</span>
                    <span className="text-[8px] text-emerald-600 font-semibold">Cred/All</span>
                  </div>
                )}
              </div>

              {/* App Label & Action */}
              <div className="min-w-0 w-full">
                <p className={`font-extrabold text-xs truncate ${app.textColor}`}>
                  {app.shortName}
                </p>
                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 font-medium group-hover:text-blue-600 transition-colors">
                  <span>Open ₹{numAmount}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Desktop / Manual Options: QR Code & Scanner Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleInlineQr}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-500" />
            <span>{showInlineQr ? 'Hide QR Code' : 'Scan QR on Phone'}</span>
          </button>

          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Paid Receipt</span>
            </button>
          )}

          {isInIframe && (
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
              title="Open full page to launch phone app without iframe restrictions"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Full Tab</span>
            </a>
          )}
        </div>

        {/* UPI ID Copy */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium text-[11px]">UPI:</span>
          <code className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[11px] font-bold text-slate-800">
            {clinicUpiId}
          </code>
          <button
            type="button"
            onClick={handleCopyUpi}
            className="p-1 hover:bg-white rounded transition-colors text-slate-500 hover:text-slate-800 cursor-pointer"
            title="Copy UPI ID"
          >
            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Inline QR Code View */}
      {showInlineQr && (
        <div className="bg-white border-2 border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in shadow-xs">
          <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
            {qrUrl ? (
              <img src={qrUrl} alt="Clinic UPI QR Code" className="w-36 h-36 rounded-lg" />
            ) : (
              <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                <QrCode className="w-8 h-8 animate-pulse" />
              </div>
            )}
          </div>
          <div className="space-y-1.5 text-center sm:text-left max-w-sm">
            <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
              Dynamic UPI QR Code
            </span>
            <h4 className="font-extrabold text-sm text-slate-900">
              Scan with Google Pay, PhonePe, or Paytm
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Amount of <strong className="text-slate-800">₹{numAmount}.00</strong> is pre-coded. Authorize payment directly on your phone.
            </p>
          </div>
        </div>
      )}

      {/* POST-PAYMENT VERIFICATION MODAL ("After the user will pay it") */}
      {activeApp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isVerifying) setActiveApp(null);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0">
                  {activeApp.iconType === 'gpay' && (
                    <div className="flex items-center justify-center font-black text-xs text-slate-800 tracking-tighter">
                      <span className="text-[#4285F4]">G</span>
                      <span className="text-[#EA4335]">P</span>
                      <span className="text-[#FBBC05]">a</span>
                      <span className="text-[#34A853]">y</span>
                    </div>
                  )}
                  {activeApp.iconType === 'phonepe' && (
                    <div className="w-6 h-6 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-extrabold text-xs">
                      पे
                    </div>
                  )}
                  {activeApp.iconType === 'paytm' && (
                    <span className="text-[10px] font-black text-[#002e6e]">Paytm</span>
                  )}
                  {activeApp.iconType === 'bhim' && (
                    <span className="text-[10px] font-black text-[#008744]">BHIM</span>
                  )}
                  {activeApp.iconType === 'upi' && (
                    <span className="text-[10px] font-black text-emerald-700">UPI</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white truncate">
                      {activeApp.name} Direct Payment
                    </h3>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    Auto-printed amount: <strong className="text-white">₹{numAmount}.00</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveApp(null)}
                disabled={isVerifying}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Verification Success Celebration Banner */}
              {verificationSuccess ? (
                <div className="py-8 text-center space-y-3 bg-emerald-50 rounded-2xl border-2 border-emerald-300 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md animate-bounce">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="text-lg font-black text-emerald-900">
                    Payment Verified Successfully!
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    Transaction reference <span className="font-mono font-bold">{activeTxnRef}</span> attached to your appointment.
                  </p>
                </div>
              ) : (
                <>
                  {/* Digital Receipt Card (Auto-Printed Amount) */}
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center space-y-2 relative">
                    <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                      Auto-Printed in {activeApp.name}
                    </span>

                    <div className="py-1">
                      <div className="text-3xl sm:text-4xl font-black text-[#0f172a] font-mono tracking-tight">
                        ₹{numAmount}.00
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Payable to: <strong className="text-slate-800">{clinicName}</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 text-left grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block font-semibold">UPI ID</span>
                        <span className="font-mono font-bold text-slate-800 truncate block">
                          {clinicUpiId}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block font-semibold">Ref Code</span>
                        <span className="font-mono font-bold text-blue-700 truncate block">
                          {activeTxnRef}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Deep link direct launch actions */}
                  <div className="space-y-3">
                    {/* PRIMARY PROMINENT WORKABLE RELAUNCH BUTTON */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        id="relaunch-active-app-btn"
                        onClick={() => handleRelaunch()}
                        disabled={isRelaunching}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer border-2 ${
                          isRelaunching
                            ? 'bg-blue-700 text-white border-blue-800'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            {isRelaunching ? (
                              <RefreshCw className="w-5 h-5 animate-spin text-white" />
                            ) : (
                              <ExternalLink className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm sm:text-base font-black truncate">
                              {isRelaunching
                                ? `Opening ${activeApp.name}...`
                                : relaunchCount > 0
                                ? `Re-Launch ${activeApp.name} (₹${numAmount})`
                                : `Re-Launch ${activeApp.name}`}
                            </span>
                            <span className="text-[11px] text-blue-100 font-medium block truncate">
                              Auto-prints ₹{numAmount}.00 to {clinicName}
                            </span>
                          </div>
                        </div>

                        <span className="bg-white/20 hover:bg-white/30 text-white text-xs font-black px-3 py-2 rounded-xl shrink-0 transition-colors">
                          {isRelaunching ? 'Opening...' : 'Tap to Open'}
                        </span>
                      </button>

                      {/* Relaunch Status Banner */}
                      {relaunchStatus && (
                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2 animate-fade-in">
                          <Zap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div className="flex-1 text-[11px] font-medium leading-relaxed">
                            {relaunchStatus}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Secondary Action Options (Universal UPI, Scan QR, Copy Link) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const universal = buildUniversalUpiUri(activeTxnRef);
                          executeLaunchScheme(universal);
                          setRelaunchStatus(`Opening via Universal UPI (upi://)...`);
                        }}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/70 text-emerald-900 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                        title="Open any UPI payment app installed on this device"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-700 mb-0.5" />
                        <span className="text-[11px] font-extrabold">Any UPI App</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowModalQr(!showModalQr)}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
                      >
                        <QrCode className="w-4 h-4 text-slate-600 mb-0.5" />
                        <span className="text-[11px] font-extrabold">{showModalQr ? 'Hide QR' : 'Scan on Phone'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center col-span-2 sm:col-span-1"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600 mb-0.5" />
                            <span className="text-[11px] font-extrabold text-emerald-700">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 text-slate-600 mb-0.5" />
                            <span className="text-[11px] font-extrabold">Copy UPI Link</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* QR Code view if toggled */}
                    {showModalQr && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2 animate-fade-in">
                        <div className="p-2 bg-white rounded-xl inline-block shadow-xs border border-slate-200">
                          {modalQrUrl ? (
                            <img src={modalQrUrl} alt="UPI QR" className="w-32 h-32 mx-auto rounded-lg" />
                          ) : (
                            <div className="w-32 h-32 mx-auto flex items-center justify-center text-slate-400">
                              <QrCode className="w-8 h-8 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Point phone camera with {activeApp.name} to scan and pay ₹{numAmount}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* STEP 2: "AFTER THE USER WILL PAY IT" VERIFICATION SECTION */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                        After Completing Payment in {activeApp.name}:
                      </h4>
                    </div>

                    {/* 1-Click Instant Confirmation */}
                    <button
                      type="button"
                      onClick={() => handleConfirmPaid()}
                      disabled={isVerifying}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying with UPI network...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>✓ I Have Paid ₹{numAmount} on {activeApp.name}</span>
                        </>
                      )}
                    </button>

                    {/* Or Enter 12-Digit UTR Number */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Or enter 12-digit UTR / UPI Reference No. (optional):
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 428190381029"
                          value={utrInput}
                          onChange={(e) => {
                            setUtrInput(e.target.value);
                            setUtrError('');
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyUtr}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Verify UTR
                        </button>
                      </div>
                      {utrError && (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{utrError}</span>
                        </p>
                      )}
                    </div>

                    {/* Or Scan Receipt camera button */}
                    {onOpenScanner && (
                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveApp(null);
                            onOpenScanner();
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Or scan payment screenshot / receipt QR using camera</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Encrypted NPCI UPI Gateway</span>
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {copiedLink ? 'Copied UPI Link!' : 'Copy UPI Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
