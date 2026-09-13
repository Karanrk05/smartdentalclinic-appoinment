import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  DollarSign,
  RefreshCw,
  Award,
  Zap,
  Clock,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { ClinicProfile } from '../types';

interface ActionItem {
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  expectedImpact: string;
}

interface ClinicInsightsData {
  stats: {
    total: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    cancellationRate: string;
    treatmentCounts: Record<string, number>;
    doctorCounts: Record<string, number>;
    branchCounts: Record<string, number>;
  };
  healthScore: number;
  executiveSummary: string;
  demandAnalysis: string;
  noShowRiskAssessment: string;
  doctorUtilization: string;
  strategicActionItems: ActionItem[];
  aiPowered?: boolean;
  timestamp?: string;
}

interface AiClinicInsightsViewProps {
  clinicProfile: ClinicProfile;
}

export const AiClinicInsightsView: React.FC<AiClinicInsightsViewProps> = ({ clinicProfile }) => {
  const [data, setData] = useState<ClinicInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/clinic-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || 'Failed to fetch insights');
      }
    } catch (err: any) {
      console.error('Error loading AI insights:', err);
      setError(err.message || 'Failed to generate clinic insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  if (isLoading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
        <div className="text-sm font-bold text-slate-800">Generating AI Clinic Intelligence...</div>
        <p className="text-xs text-slate-500 max-w-sm">
          Gemini 3.8 is analyzing live Excel records, cancellation rates, doctor schedules, and treatment demand.
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <div className="text-sm font-bold text-slate-800">{error}</div>
        <button
          type="button"
          onClick={fetchInsights}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor =
    data.healthScore >= 85
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : data.healthScore >= 70
      ? 'text-blue-600 bg-blue-50 border-blue-200'
      : 'text-amber-600 bg-amber-50 border-amber-200';

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Top Banner with Health Score */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-300/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-300" />
              Gemini 3.8 Intelligence
            </span>
            <span className="text-xs text-blue-200/80">
              Live Database Evaluation
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight">
            Clinic Operational & Patient Insights
          </h3>
          <p className="text-xs text-blue-100/80 leading-relaxed">
            {data.executiveSummary}
          </p>
        </div>

        {/* Health Score Pill */}
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/15 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="text-right">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
              Operational Health Score
            </div>
            <div className="text-xs text-emerald-300 font-bold">
              {data.healthScore >= 85 ? 'Optimal Efficiency' : 'Good Trajectory'}
            </div>
          </div>
          <div className="w-14 h-14 rounded-xl bg-white text-slate-900 font-black text-2xl flex items-center justify-center shadow-lg border border-slate-100">
            {data.healthScore}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Bookings</div>
          <div className="text-xl font-black text-slate-900 mt-1">{data.stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded in Excel Database</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Confirmed Active</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{data.stats.confirmed}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Scheduled on Calendar</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Completed Visits</div>
          <div className="text-xl font-black text-blue-700 mt-1">{data.stats.completed}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">Discharged Patients</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Cancellation Rate</div>
          <div className="text-xl font-black text-amber-700 mt-1">{data.stats.cancellationRate}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Target: under 12%</div>
        </div>
      </div>

      {/* Deep Dive Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Demand Analysis */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>Demand & Procedure Mix</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {data.demandAnalysis}
          </p>
        </div>

        {/* No-Show Risk */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-amber-600" />
            <span>Retention & No-Show Risk</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {data.noShowRiskAssessment}
          </p>
        </div>

        {/* Doctor Utilization */}
        <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Doctor Schedule Utilization</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {data.doctorUtilization}
          </p>
        </div>
      </div>

      {/* Strategic AI Action Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Doctor & Practice Management Action Plan
          </h4>
          <button
            type="button"
            onClick={fetchInsights}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Analysis</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.strategicActionItems.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 truncate">{item.title}</span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    item.priority === 'High'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : item.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {item.priority} Priority
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">{item.description}</p>
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Expected Impact: {item.expectedImpact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
