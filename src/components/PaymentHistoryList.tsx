import React, { useState } from 'react';
import {
  CreditCard,
  Calendar,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Wallet,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { PaymentTransaction } from '../types';

interface PaymentHistoryListProps {
  transactions: PaymentTransaction[];
  isLoading?: boolean;
  patientName?: string;
  patientPhone?: string;
  emptyMessage?: string;
  compact?: boolean;
  onRefresh?: () => void;
  showHeading?: boolean;
  title?: string;
}

export const PaymentHistoryList: React.FC<PaymentHistoryListProps> = ({
  transactions,
  isLoading = false,
  patientName,
  patientPhone,
  emptyMessage = 'No previous transactions found for this patient.',
  compact = false,
  onRefresh,
  showHeading = true,
  title = 'Payment History',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate total paid across valid transactions
  const totalPaidNumber = transactions.reduce((acc, txn) => {
    const rawNum = parseInt(txn.amount.replace(/[^0-9]/g, ''), 10);
    return acc + (isNaN(rawNum) ? 0 : rawNum);
  }, 0);

  const formattedTotalPaid = `₹${totalPaidNumber.toLocaleString('en-IN')}`;

  const formatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getModeBadge = (mode?: string) => {
    const m = (mode || '').toLowerCase();
    if (m.includes('upi') || m.includes('qr') || m.includes('gpay') || m.includes('phonepe')) {
      return {
        label: mode || 'UPI Pay',
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Sparkles,
      };
    }
    if (m.includes('card') || m.includes('visa') || m.includes('mastercard')) {
      return {
        label: mode || 'Card',
        bg: 'bg-sky-50 text-sky-700 border-sky-200',
        icon: CreditCard,
      };
    }
    if (m.includes('net') || m.includes('bank')) {
      return {
        label: mode || 'NetBanking',
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: Building2,
      };
    }
    return {
      label: mode || 'Clinic Counter',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: Wallet,
    };
  };

  return (
    <div className="rounded-xl border border-blue-200/80 bg-white shadow-xs overflow-hidden transition-all">
      {/* Header bar */}
      {showHeading && (
        <div
          onClick={() => compact && setIsExpanded(!isExpanded)}
          className={`flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-blue-50/90 via-slate-50 to-indigo-50/70 border-b border-blue-100 ${
            compact ? 'cursor-pointer hover:bg-blue-100/40 select-none' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Receipt className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                  {title}
                </span>
                {transactions.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                    {transactions.length} {transactions.length === 1 ? 'record' : 'records'}
                  </span>
                )}
                {transactions.length > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                    Total: {formattedTotalPaid}
                  </span>
                )}
              </div>
              {patientName && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  Transactions for <strong className="text-slate-700">{patientName}</strong>
                  {patientPhone ? ` (${patientPhone})` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isLoading}
                title="Refresh payment history"
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            {compact && (
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content body */}
      {(!compact || isExpanded) && (
        <div className="p-3 sm:p-4 space-y-2.5">
          {isLoading ? (
            <div className="py-4 text-center space-y-2">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Fetching patient payment history…
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-3 px-3 rounded-lg bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-1">
              <p className="text-xs text-slate-600 font-medium">{emptyMessage}</p>
              <p className="text-[11px] text-slate-400">
                Prior payments and counter receipts will be cataloged here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((txn, index) => {
                const badge = getModeBadge(txn.paymentMode);
                const BadgeIcon = badge.icon;
                const isVerified =
                  txn.paymentStatus?.toLowerCase().includes('verified') ||
                  txn.paymentStatus?.toLowerCase().includes('completed');

                return (
                  <div
                    key={txn.id || `${txn.bookingRef}-${index}`}
                    className="p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 transition-all text-xs space-y-1.5"
                  >
                    {/* Upper row: Txn Ref / Booking Ref + Amount */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[11px]">
                          {txn.paymentRef || txn.bookingRef}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(txn.paymentRef || txn.bookingRef, e)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                          title="Copy Transaction Reference"
                        >
                          {copiedId === (txn.paymentRef || txn.bookingRef) ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {txn.bookingRef && txn.bookingRef !== txn.paymentRef && (
                          <span className="text-[10px] text-slate-400">
                            (Ref: {txn.bookingRef})
                          </span>
                        )}
                      </div>

                      {/* Transaction Amount */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm sm:text-base font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                          {txn.amount}
                        </span>
                      </div>
                    </div>

                    {/* Middle details: Date, Treatment, Doctor */}
                    <div className="flex items-center justify-between gap-2 text-slate-600 flex-wrap pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{formatDate(txn.date)}</span>
                        </span>
                        <span className="text-slate-300 hidden sm:inline">·</span>
                        <span className="font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-[260px]">
                          {txn.treatmentName || 'Dental Care'}
                        </span>
                      </div>

                      {/* Payment mode badge & status */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                        >
                          <BadgeIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[90px]">{badge.label}</span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                            isVerified
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                          )}
                          <span>{txn.paymentStatus || 'Recorded'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
