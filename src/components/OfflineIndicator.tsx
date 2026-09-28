import React, { useEffect, useState, useRef } from 'react';
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

/**
 * Silent Automatic Background Sync Engine.
 * Automatically synchronizes pending offline bookings and queues in the background
 * without displaying intrusive popups, banners, or toasts on the user's screen.
 */
export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const isSyncingRef = useRef(false);

  // Background auto-sync function
  const autoSyncQueueSilently = async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    const queue = getPendingOfflineQueue();
    if (queue.length === 0) return;

    try {
      isSyncingRef.current = true;
      const res = await syncPendingOfflineBookings();
      if (res.successCount > 0) {
        // Trigger Firestore auto-sync event in background
        window.dispatchEvent(new CustomEvent('sdc_trigger_firebase_auto_sync'));
      }
    } catch (err) {
      console.warn('Background auto-sync queue check:', err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  // 1. Check & automatically sync on mount and periodically in the background
  useEffect(() => {
    autoSyncQueueSilently();
    const interval = setInterval(autoSyncQueueSilently, 5000);
    return () => clearInterval(interval);
  }, []);

  // 2. Automatically sync when coming back online
  useEffect(() => {
    if (isOnline) {
      autoSyncQueueSilently();
    }
  }, [isOnline]);

  // 3. Listen for local queue change events to sync automatically
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sdc_offline_booking_queue') {
        autoSyncQueueSilently();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Return null: Zero intrusive popups or banners on screen; syncing operates completely silently in the background
  return null;
};
