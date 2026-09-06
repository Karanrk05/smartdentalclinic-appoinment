import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SmartDentalLogo } from './SmartDentalLogo';

export const Hero: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#3b82f6] text-white px-4 py-7 sm:px-10 sm:py-12">
      <div
        className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-white/10 pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative z-10">
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[11px] sm:text-xs font-extrabold uppercase tracking-wider mb-2 text-blue-100">
            <SmartDentalLogo className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm shrink-0" />
            <span>Smart Dental Clinic · Multi-Branch Network</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white mb-2 sm:mb-3">
            Book your appointment at Smart Dental Clinic
          </h1>
          <p className="text-xs sm:text-base text-blue-50 leading-relaxed font-medium">
            Routine checkups, digital X-rays, scaling, polishing, and preventive care with clear, transparent pricing across all branches.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4 sm:mt-5">
            <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-bold text-white shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span>BDS Certified Dentists</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-2.5 sm:px-3.5 py-1 text-[11px] sm:text-xs font-bold text-white shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span>Transparent Pricing</span>
            </span>
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 items-center justify-center p-2 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 shadow-xl" aria-hidden="true">
          <SmartDentalLogo className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 drop-shadow-lg animate-pop-in" />
        </div>
      </div>
    </div>
  );
};

