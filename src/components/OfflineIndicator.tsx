import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center justify-between gap-3 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>Offline Mode — Cached clinic data & slips are accessible.</span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold shrink-0 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
      </button>
    </div>
  );
};
