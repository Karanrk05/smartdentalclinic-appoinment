import React from 'react';
import { Calendar, Clock, FileSpreadsheet, ShieldCheck } from 'lucide-react';

interface MobileAppTabBarProps {
  currentStep: number;
  onGoToBooking: () => void;
  onOpenHistory: () => void;
  onOpenExcel: () => void;
  onOpenAdmin: () => void;
}

export const MobileAppTabBar: React.FC<MobileAppTabBarProps> = ({
  currentStep,
  onGoToBooking,
  onOpenHistory,
  onOpenExcel,
  onOpenAdmin,
}) => {
  return (
    <nav
      aria-label="Mobile App Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:hidden flex items-center justify-around"
    >
      {/* Tab 1: Book */}
      <button
        type="button"
        onClick={onGoToBooking}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all cursor-pointer ${
          currentStep >= 1 && currentStep <= 5
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-lg ${currentStep >= 1 && currentStep <= 5 ? 'bg-blue-50' : ''}`}>
          <Calendar className="w-4 h-4" />
        </div>
        <span className="text-[10px] leading-tight">Book</span>
      </button>

      {/* Tab 2: History / Slips */}
      <button
        type="button"
        onClick={onOpenHistory}
        className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <Clock className="w-4 h-4" />
        </div>
        <span className="text-[10px] leading-tight">My Slips</span>
      </button>

      {/* Tab 3: Excel Ledger */}
      <button
        type="button"
        onClick={onOpenExcel}
        className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-slate-500 hover:text-emerald-700 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <span className="text-[10px] leading-tight">Records</span>
      </button>

      {/* Tab 4: Admin */}
      <button
        type="button"
        onClick={onOpenAdmin}
        className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <span className="text-[10px] leading-tight">Admin</span>
      </button>
    </nav>
  );
};
