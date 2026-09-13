import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle, ExternalLink, Monitor, Sparkles, ShieldCheck, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios' | 'desktop'>('auto');

  // If already running in standalone mode (installed), don't show install buttons
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // Determine active tab default
  const defaultTab = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  const effectiveTab = activeTab === 'auto' ? defaultTab : activeTab;

  return (
    <>
      {/* 1. Header Button */}
      {variant === 'header' && (
        <button
          id="btn-pwa-install-header"
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs transition-all cursor-pointer shadow-sm shadow-blue-500/25 shrink-0 select-none border border-white/20"
          title="Install Smart Dental App on your phone, tablet, or desktop"
          aria-label="Install App"
        >
          <Download className="w-3.5 h-3.5 shrink-0 animate-bounce" />
          <span className="hidden sm:inline">Install App</span>
          <span className="sm:hidden">Install</span>
        </button>
      )}

      {/* 2. Top Banner */}
      {variant === 'banner' && !isBannerDismissed && (
        <aside
          aria-label="Install App Banner"
          className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between gap-2 shadow-sm border-b border-blue-600/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold truncate text-[11px] sm:text-xs flex items-center gap-1.5">
                <span>Install Smart Dental App</span>
                <span className="bg-emerald-400 text-slate-900 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Mobile & PC
                </span>
              </p>
              <p className="text-[10px] text-blue-100/90 hidden sm:block">
                Install directly to your home screen or desktop for 1-tap bookings & offline dental slips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-pwa-install-banner"
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-extrabold rounded-lg text-[11px] transition-all cursor-pointer shadow-xs flex items-center gap-1"
            >
              <Download className="w-3 h-3 text-blue-600" />
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-1 text-white/70 hover:text-white rounded-md transition-colors cursor-pointer"
              aria-label="Dismiss banner"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* 3. Comprehensive Multi-Device Install Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 sm:px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install Smart Dental App</h3>
                  <p className="text-xs text-blue-100">Progressive Web App for Mobile & Desktop</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If inside an iframe (like AI Studio preview), provide 1-tap open in new tab */}
            {isInIframe && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Preview Window Detected</p>
                  <p className="text-[11px] text-amber-800">
                    Browser security blocks native install prompts inside preview frames. Open in a full browser tab to trigger 1-click install:
                  </p>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Browser Tab</span>
                  </button>
                </div>
              </div>
            )}

            {/* Device Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
                  effectiveTab === 'android'
                    ? 'bg-white text-blue-600 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
                  effectiveTab === 'ios'
                    ? 'bg-white text-blue-600 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Share className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
                  effectiveTab === 'desktop'
                    ? 'bg-white text-blue-600 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 border-transparent'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop / PC</span>
              </button>
            </div>

            {/* Tab Instructions */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-700">
              {/* Native Prompt Trigger Button if browser supports it */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowModal(false);
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tap Here to Trigger Direct Install</span>
                </button>
              )}

              {/* Android Guide */}
              {effectiveTab === 'android' && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-900 text-xs">How to install on Android (Chrome, Edge, Samsung):</p>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900">Tap the browser menu button</p>
                      <p className="text-[11px] text-slate-500">Tap the <strong>three dots (⋮)</strong> in the top-right corner of Google Chrome or Samsung Internet.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900">Select "Install app" or "Add to Home screen"</p>
                      <p className="text-[11px] text-slate-500">Tap <strong>Install app</strong> or <strong>Add to Home screen</strong> and confirm.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>The app will appear in your Android app drawer with full offline access!</span>
                  </div>
                </div>
              )}

              {/* iOS Guide */}
              {effectiveTab === 'ios' && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-900 text-xs">How to install on iPhone & iPad (Safari):</p>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>Tap the Safari Share button</span>
                        <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                      </p>
                      <p className="text-[11px] text-slate-500">Located at the bottom of your Safari browser bar on iPhone (or top bar on iPad).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>Tap</span>
                        <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                        <strong className="text-blue-700">"Add to Home Screen"</strong>
                      </p>
                      <p className="text-[11px] text-slate-500">Scroll down in the share sheet, tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Launches in full-screen standalone mode with no Safari address bar!</span>
                  </div>
                </div>
              )}

              {/* Desktop Guide */}
              {effectiveTab === 'desktop' && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-900 text-xs">How to install on Windows, Mac, or Chromebook:</p>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900">Look at your Browser Address Bar</p>
                      <p className="text-[11px] text-slate-500">In Google Chrome, Microsoft Edge, or Brave, look at the right end of the URL address bar for the <strong>Install icon (⊕ or computer with arrow)</strong>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-900">Or use Browser Menu (⋮)</p>
                      <p className="text-[11px] text-slate-500">Click the <strong>three dots menu (⋮)</strong> at top right ➔ click <strong>"Install Smart Dental Clinic..."</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Runs in its own clean desktop window with Start Menu / Dock icon!</span>
                  </div>
                </div>
              )}

              {/* PWA Benefits */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-800 text-[11px]">Instant Launch</p>
                  <p className="text-[10px] text-slate-500">Zero App Store delay</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-800 text-[11px]">Lightweight</p>
                  <p className="text-[10px] text-slate-500">&lt; 1MB storage</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-800 text-[11px]">Offline Safe</p>
                  <p className="text-[10px] text-slate-500">Cached appointments</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in new tab</span>
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
