import React, { useState, useEffect } from 'react';
import { Phone, FileSpreadsheet, ShieldCheck, Server, Database, CheckCircle2, Clock } from 'lucide-react';
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Patient History Lookup Button */}
          {onOpenPatientHistoryModal && (
            <button
              id="btn-open-patient-history"
              type="button"
              onClick={onOpenPatientHistoryModal}
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-8.5 w-8.5 sm:h-10 sm:w-auto sm:px-3.5 rounded-xl border border-indigo-200 bg-indigo-50/90 text-indigo-700 hover:bg-indigo-600 hover:text-white active:scale-95 font-bold text-xs transition-all cursor-pointer shadow-2xs select-none shrink-0"
              title="Patient History & Bookings Lookup"
              aria-label="Look up your booking history by phone number"
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Patient History</span>
            </button>
          )}

          {/* Admin Corner Button */}
          {onOpenAdminModal && (
            <button
              id="btn-open-admin-corner"
              type="button"
              onClick={onOpenAdminModal}
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-8.5 w-8.5 sm:h-10 sm:w-auto sm:px-3.5 rounded-xl border border-slate-700 bg-slate-900 text-white hover:bg-slate-800 active:scale-95 font-bold text-xs transition-all cursor-pointer shadow-xs select-none shrink-0"
              title="Admin Corner - Modify prices, timings & doctors"
              aria-label="Open Admin Corner to change prices, timings & doctors"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
              <span className="hidden sm:inline">Admin Corner</span>
            </button>
          )}

          {/* Patients Excel DB Button */}
          {onOpenExcelModal && (
            <button
              id="btn-open-excel-db"
              type="button"
              onClick={onOpenExcelModal}
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-8.5 w-8.5 sm:h-10 sm:w-auto sm:px-3.5 rounded-xl border border-[#2563eb] bg-[#eff6ff] text-[#2563eb] hover:bg-[#2563eb] hover:text-white active:scale-95 font-bold text-xs transition-all cursor-pointer shadow-xs select-none shrink-0"
              title="Patients Excel Database (View & Export)"
              aria-label="Open backend Excel database"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">Patients Excel DB</span>
            </button>
          )}

          {/* Helpline Call Button */}
          <a
            href={`tel:${clinicProfile.phone.replace(/[^0-9+]/g, '')}`}
            className="flex items-center justify-center h-8.5 w-8.5 sm:h-10 sm:w-auto sm:px-3 rounded-xl border border-slate-200 text-slate-700 hover:text-[#2563eb] hover:border-[#93c5fd] hover:bg-[#eff6ff] transition-all shrink-0 text-xs sm:text-sm font-bold active:scale-95"
            title={`Call Clinic Helpline: ${clinicProfile.phone}`}
            aria-label={`Call Clinic Helpline: ${clinicProfile.phone}`}
          >
            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2563eb] shrink-0" />
            <span className="hidden lg:inline ml-1.5 font-bold">{clinicProfile.phone}</span>
          </a>
        </div>
      </div>
    </header>
  );
};
