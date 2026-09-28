/**
 * Automated 1-Month Excel Database Archive & Auto-Download Utility
 * Ensures the clinic's Excel database maintains data for exactly one month.
 * Automatically downloads the completed month's Excel sheet to the device
 * before reloading/transitioning to the new month's sheet.
 */

export interface MonthArchiveItem {
  monthKey: string;
  monthLabel: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

export interface MonthLedgerStatusResponse {
  success: boolean;
  activeMonthKey: string;
  activeMonthLabel: string;
  retentionPolicy: string;
  recordsInActiveMonth: number;
  pendingAutoDownload: {
    monthKey: string;
    monthLabel: string;
    recordsCount: number;
    fileName: string;
    downloadUrl: string;
    createdAt: string;
  } | null;
  archives: MonthArchiveItem[];
}

/**
 * Fetch the current 1-month ledger status and archive list
 */
export async function fetchMonthLedgerStatus(): Promise<MonthLedgerStatusResponse | null> {
  try {
    const res = await fetch('/api/excel-db/month-status', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch Excel month ledger status:', err);
    return null;
  }
}

/**
 * Checks for any completed month sheet pending auto-download and triggers
 * direct browser download without intrusive popups.
 */
export async function checkAndTriggerExcelMonthAutoDownload(): Promise<boolean> {
  try {
    const status = await fetchMonthLedgerStatus();
    if (!status || !status.pendingAutoDownload) {
      return false;
    }

    const { downloadUrl, fileName, monthKey, monthLabel } = status.pendingAutoDownload;

    // Trigger direct silent download to user's device
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Acknowledge receipt to backend
    await fetch('/api/excel-db/acknowledge-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthKey }),
    });

    console.log(`[Excel 1-Month DB] Auto-downloaded previous month sheet: ${fileName} (${monthLabel})`);

    window.dispatchEvent(
      new CustomEvent('sdc_excel_month_auto_downloaded', {
        detail: { monthKey, monthLabel, fileName },
      })
    );

    return true;
  } catch (err) {
    console.error('Error during Excel month auto-download:', err);
    return false;
  }
}

/**
 * Manually trigger archiving the current month's Excel sheet and reloading to a fresh sheet.
 * Automatically downloads the archived month sheet immediately.
 */
export async function archiveCurrentMonthNow(): Promise<{
  success: boolean;
  fileName?: string;
  downloadUrl?: string;
  recordsArchived?: number;
  newMonthLabel?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/excel-db/archive-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();

    if (data.success && data.downloadUrl) {
      // Direct browser download of the archived month
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName || 'SmartDental_Archived_Month.xlsx';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Acknowledge download
      if (data.archivedMonthKey) {
        fetch('/api/excel-db/acknowledge-download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthKey: data.archivedMonthKey }),
        }).catch(() => {});
      }
    }

    return data;
  } catch (err: any) {
    console.error('Failed to archive current month now:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}
