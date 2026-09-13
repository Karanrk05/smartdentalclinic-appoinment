import React, { useState, useEffect } from 'react';
import { Phone, FileSpreadsheet, ShieldCheck, Server, Database, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { SmartDentalLogo } from './SmartDentalLogo';
import { ClinicProfile, DEFAULT_CLINIC_PROFILE } from '../types';

interface HeaderProps {
  clinicProfile?: ClinicProfile;
  onOpenExcelModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenPatientHistoryModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  clinicProfile = DEFAULT_CLINIC_PROFILE,
  onOpenExcelModal,
  onOpenAdminModal,
  onOpenPatientHistoryModal,
}) => {
  const [dbCount, setDbCount] = useState<number>(0);
  const [serverOnline, setServerOnline] = useState<boolean>(true);

  useEffect(() => {
    const checkStatus = () => {
      fetch('/api/system/health')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.success) {
            setServerOnline(true);
            setDbCount(data.database?.totalRecords || 0);
          }
        })
        .catch(() => {
          setServerOnline(false);
        });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#dbeafe] shadow-xs select-none">
      <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center min-w-0 flex-1 sm:flex-initial">
          <SmartDentalLogo
            className="w-7 h-7 sm:w-10 sm:h-10 hover:scale-105 transition-transform shrink-0"
            showWordmark={true}
            containerClassName="min-w-0"
            wordmarkClassName="text-[#1e40af] font-black text-xs sm:text-base md:text-lg tracking-tight leading-tight truncate"
            subtextClassName="text-[10px] sm:text-xs font-bold text-[#64748b] tracking-wider uppercase hidden md:block"
            wordmarkText={
              <span className="truncate">
                Smart Dental<span className="hidden sm:inline"> Clinic</span>
              </span>
            }
          />
        </div>

        {/* Right: Action Buttons Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Patient History Lookup Button */}
          {onOpenPatientHistoryModal && (
            <button
              id="btn-open-patient-history"
              type="button"
              onClick={onOpenPatientHistoryModal}
              className="flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 font-medium text-xs transition-all cursor-pointer select-none shrink-0"
              title="Patient History & Bookings Lookup"
              aria-label="Look up your booking history by phone number"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden md:inline">History</span>
            </button>
          )}

          {/* Patients Excel DB Button */}
          {onOpenExcelModal && (
            <button
              id="btn-open-excel-db"
              type="button"
              onClick={onOpenExcelModal}
              className="flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 font-medium text-xs transition-all cursor-pointer select-none shrink-0"
              title="Patients Excel Database (View & Export)"
              aria-label="Open backend Excel database"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden md:inline">Excel DB</span>
            </button>
          )}

          {/* Admin Corner Button */}
          {onOpenAdminModal && (
            <button
              id="btn-open-admin-corner"
              type="button"
              onClick={onOpenAdminModal}
              className="flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-95 font-medium text-xs transition-all cursor-pointer select-none shrink-0"
              title="Admin Corner - Manage clinic settings"
              aria-label="Open Admin Corner"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="hidden md:inline">Admin</span>
            </button>
          )}

          {/* Helpline Call Button */}
          <a
            href={`tel:${clinicProfile.phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center justify-center h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-200 transition-all shrink-0 text-xs font-semibold active:scale-95"
            title={`Call Clinic Helpline: ${clinicProfile.phone}`}
            aria-label={`Call Clinic Helpline: ${clinicProfile.phone}`}
          >
            <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden lg:inline ml-1">{clinicProfile.phone}</span>
          </a>
        </div>
      </div>
    </header>
  );
};
