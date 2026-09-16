import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CloudUpload, CheckCircle } from 'lucide-react';
import { getPendingOfflineQueue, syncPendingOfflineBookings } from '../utils/offlineEngine';

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
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');

  // Check pending queue length
  useEffect(() => {
    const updateCount = () => {
      const q = getPendingOfflineQueue();
      setPendingCount(q.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 4000);
    return () => clearInterval(interval);
  }, []);

  // When coming back online, auto-sync pending offline bookings
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg('');
    try {
      const res = await syncPendingOfflineBookings();
      if (res.successCount > 0) {
        setSyncSuccessMsg(`Synced ${res.successCount} offline booking(s) to server!`);
        setTimeout(() => setSyncSuccessMsg(''), 4000);
      }
      const q = getPendingOfflineQueue();
      setPendingCount(q.length);
    } catch (e) {
      console.error('Failed syncing offline queue', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no pending offline queue and no success message, keep unobtrusive
  if (isOnline && pendingCount === 0 && !syncSuccessMsg) {
    return null;
  }

  // If sync succeeded message
  if (isOnline && syncSuccessMsg) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center justify-between gap-3 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{syncSuccessMsg}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 flex items-center justify-between gap-3 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl animate-fade-in">
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span className="truncate">
          {!isOnline
            ? pendingCount > 0
              ? `Offline · ${pendingCount} booking(s) queued locally`
              : 'Offline Mode · Using cached clinic schedules & data'
            : `${pendingCount} offline booking(s) ready to sync`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {pendingCount > 0 && isOnline && (
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1 bg-white text-amber-800 hover:bg-amber-50 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          title="Reload application"
          className="p-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
