import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  Heart,
  Download,
  Smartphone
} from 'lucide-react';
import { SmartDentalLogo } from './SmartDentalLogo';
import { ClinicProfile } from '../types';

interface FooterProps {
  clinicProfile: ClinicProfile;
  onOpenExcelModal?: () => void;
  onOpenAdminModal?: () => void;
  onOpenPatientHistory?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  clinicProfile,
  onOpenExcelModal,
  onOpenAdminModal,
  onOpenPatientHistory,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white text-slate-600 text-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <SmartDentalLogo className="w-7 h-7" />
              <span className="font-bold text-sm text-slate-900 tracking-tight">
                {clinicProfile.name || 'Smart Dental Clinic'}
              </span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Modern multispecialty dental care with certified dentists, transparent pricing, and instant digital booking confirmation.
            </p>
            <div className="flex items-center gap-2 pt-1 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <a
                href={`tel:${clinicProfile.phone.replace(/[^0-9+]/g, '')}`}
                className="font-semibold hover:text-blue-600 transition-colors"
              >
                {clinicProfile.phone}
              </a>
            </div>
          </div>

          {/* Col 2: Clinic Hours */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Clinic Hours</span>
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Mon – Fri:</span>
                <span>9:00 AM – 8:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Saturday:</span>
                <span>9:00 AM – 6:00 PM</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sunday:</span>
                <span>Emergency only</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium pt-1">
                ✓ Walk-ins & appointments welcome
              </p>
            </div>
          </div>

          {/* Col 3: Location */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Location</span>
            </h4>
            <div className="space-y-1 text-[11px] text-slate-600">
              <p className="font-semibold text-slate-800">{clinicProfile.address}</p>
              <p>{clinicProfile.areaCityPincode}</p>
              {clinicProfile.landmark && (
                <p className="text-slate-400 text-[10px]">Landmark: {clinicProfile.landmark}</p>
              )}
            </div>
          </div>

          {/* Col 4: Quick Portals */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Clinic Portals
            </h4>
            <div className="flex flex-col gap-1.5 text-[11px]">
              {onOpenPatientHistory && (
                <button
                  type="button"
                  onClick={onOpenPatientHistory}
                  className="flex items-center gap-1.5 text-left text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-indigo-500" />
                  <span>Patient Appointment History</span>
                </button>
              )}
              {onOpenExcelModal && (
                <button
                  type="button"
                  onClick={onOpenExcelModal}
                  className="flex items-center gap-1.5 text-left text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                  <span>Backend Excel Records</span>
                </button>
              )}
              {onOpenAdminModal && (
                <button
                  type="button"
                  onClick={onOpenAdminModal}
                  className="flex items-center gap-1.5 text-left text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3 text-slate-500" />
                  <span>Admin Management Corner</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
          <p>© {currentYear} {clinicProfile.name || 'Smart Dental Clinic'}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>100% Sterile & ISO Compliant</span>
            <span>•</span>
            <span>Digital Appointment Management</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
