import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  Building2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpDown,
  Sparkles,
  Info,
  DollarSign,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { PatientRecord, Treatment, ClinicBranch } from '../types';
import { getLocalCachedPatientRecords } from '../utils/offlineEngine';

interface AdminSummaryDashboardProps {
  treatments: Treatment[];
  branches: ClinicBranch[];
  onNavigateToTreatments?: () => void;
}

const PALETTE = [
  '#2563eb', // Blue
  '#0284c7', // Sky
  '#0d9488', // Teal
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#14b8a6', // Cyan-teal
  '#3b82f6', // Bright blue
  '#059669', // Dark emerald
];

export const AdminSummaryDashboard: React.FC<AdminSummaryDashboardProps> = ({
  treatments,
  branches,
  onNavigateToTreatments,
}) => {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'count_desc' | 'count_asc' | 'name_asc'>('count_desc');
  const [activeViewMode, setActiveViewMode] = useState<'both' | 'chart' | 'table'>('both');

  // Fetch patient records from backend Excel storage (with offline cache fallback)
  const fetchRecords = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/patients?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load patient records');
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setRecords(json.data);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      console.warn('Network offline or error fetching records for dashboard. Using local cache:', err);
      const cached = getLocalCachedPatientRecords();
      if (cached.length > 0) {
        setRecords(cached);
        setError('');
      } else {
        setError('Unable to load latest booking records from server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filter records based on selected branch and status
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Branch filter
      if (selectedBranchId !== 'all') {
        if (r.branchId && r.branchId !== selectedBranchId) return false;
      }

      // Status filter
      const isCancelled = r.status && r.status.toLowerCase().includes('cancel');
      if (statusFilter === 'confirmed' && isCancelled) return false;
      if (statusFilter === 'cancelled' && !isCancelled) return false;

      return true;
    });
  }, [records, selectedBranchId, statusFilter]);

  // Aggregate bookings per treatment
  const treatmentStats = useMemo(() => {
    const map = new Map<string, {
      fullName: string;
      bookings: number;
      confirmed: number;
      cancelled: number;
      treatmentObj?: Treatment;
      price?: string;
    }>();

    // Initialize map with known clinic treatments
    treatments.forEach((t) => {
      map.set(t.name.trim().toLowerCase(), {
        fullName: t.name,
        bookings: 0,
        confirmed: 0,
        cancelled: 0,
        treatmentObj: t,
        price: t.price,
      });
    });

    // Populate with filtered records
    filteredRecords.forEach((r) => {
      const rawName = (r.treatmentName || 'General Consultation').trim();
      const key = rawName.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          fullName: rawName,
          bookings: 0,
          confirmed: 0,
          cancelled: 0,
          price: r.estimatedFee,
        });
      }

      const item = map.get(key)!;
      item.bookings += 1;
      const isCancelled = r.status && r.status.toLowerCase().includes('cancel');
      if (isCancelled) {
        item.cancelled += 1;
      } else {
        item.confirmed += 1;
      }
    });

    // Convert map to array
    let list = Array.from(map.values()).map((item, idx) => {
      const shortName = item.fullName.length > 22
        ? `${item.fullName.substring(0, 20)}…`
        : item.fullName;
      return {
        ...item,
        name: item.fullName,
        shortName,
        color: PALETTE[idx % PALETTE.length],
      };
    });

    // Apply sorting
    if (sortBy === 'count_desc') {
      list.sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name));
    } else if (sortBy === 'count_asc') {
      list.sort((a, b) => a.bookings - b.bookings || a.name.localeCompare(b.name));
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [treatments, filteredRecords, sortBy]);

  // Prepare chart data (filter to treatments that have at least 1 booking or top treatments if all are 0)
  const chartData = useMemo(() => {
    const withBookings = treatmentStats.filter((t) => t.bookings > 0);
    // If no treatments have bookings yet, show all active clinic treatments with 0 count
    if (withBookings.length === 0) {
      return treatmentStats.slice(0, 10);
    }
    return withBookings;
  }, [treatmentStats]);

  // Key KPI metrics
  const totalBookingsCount = filteredRecords.length;
  const confirmedCount = filteredRecords.filter(
    (r) => !r.status || !r.status.toLowerCase().includes('cancel')
  ).length;
  const activeTreatmentsCount = treatmentStats.filter((t) => t.bookings > 0).length;
  const topTreatment = chartData.length > 0 && chartData[0].bookings > 0 ? chartData[0] : null;

  // Custom Chart Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalBookingsCount > 0
        ? Math.round((data.bookings / totalBookingsCount) * 100)
        : 0;

      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 text-xs min-w-[200px] z-50 animate-fadeIn">
          <div className="font-bold text-sm text-blue-300 pb-1.5 border-b border-slate-700 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.fullName}</span>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-slate-300">
              <span>Total Bookings:</span>
              <span className="font-extrabold text-white text-sm">{data.bookings}</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span>Share of All Bookings:</span>
              <span className="font-semibold text-emerald-400">{pct}%</span>
            </div>

            <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              <span className="text-emerald-300">✓ Confirmed: {data.confirmed}</span>
              <span className="text-rose-300">✕ Cancelled: {data.cancelled}</span>
            </div>

            {data.price && (
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                <span>Fee Range:</span>
                <span className="font-medium text-slate-200">{data.price}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-4 sm:p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight">
              Bookings Summary Dashboard
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl font-medium">
            Visual breakdown of appointments per dental treatment type, powered by live Excel database records.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchRecords}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/25 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchRecords}
            className="underline font-bold hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Bookings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Total Bookings</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : totalBookingsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Across all recorded treatments
            </p>
          </div>
        </div>

        {/* Confirmed / Active */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Active / Confirmed</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {isLoading ? '...' : confirmedCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {totalBookingsCount > 0
                ? `${Math.round((confirmedCount / totalBookingsCount) * 100)}% confirmation rate`
                : 'No active cancellations'}
            </p>
          </div>
        </div>

        {/* Most Popular Treatment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Top Treatment</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
              {isLoading ? '...' : topTreatment ? topTreatment.name : 'None yet'}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {topTreatment
                ? `${topTreatment.bookings} booking${topTreatment.bookings === 1 ? '' : 's'} (${Math.round((topTreatment.bookings / totalBookingsCount) * 100)}% share)`
                : 'Awaiting patient appointments'}
            </p>
          </div>
        </div>

        {/* Treatments Represented */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Active Services</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
              {isLoading ? '...' : `${activeTreatmentsCount} / ${treatments.length}`}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Treatments with at least 1 booking
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-800">
              Filter & Sort Dashboard
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Branch Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                id="filter-dashboard-branch"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.shortName || b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
              <select
                id="filter-dashboard-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed Only</option>
                <option value="cancelled">Cancelled Only</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                id="sort-dashboard-order"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value="count_desc">Most Bookings</option>
                <option value="count_asc">Least Bookings</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-300 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveViewMode('both')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeViewMode === 'both'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('chart')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeViewMode === 'chart'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chart
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('table')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeViewMode === 'table'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BAR CHART VISUALIZER */}
      {(activeViewMode === 'both' || activeViewMode === 'chart') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Bookings per Treatment Type</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Bar Chart
                </span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total count of appointments booked for each dental service
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-blue-600" />
                <span className="font-semibold text-slate-700">Total Bookings</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Loading chart data...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
              <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
              <h5 className="font-bold text-slate-700 text-sm">No Bookings Recorded</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                When patients confirm appointments, they will automatically appear here grouped by treatment type.
              </p>
            </div>
          ) : (
            <div className="w-full h-80 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="shortName"
                    interval={0}
                    angle={-32}
                    textAnchor="end"
                    height={75}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#64748B' }}
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="bookings"
                    name="Bookings"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    animationDuration={600}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color || PALETTE[index % PALETTE.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* DETAILED TREATMENT BREAKDOWN TABLE */}
      {(activeViewMode === 'both' || activeViewMode === 'table') && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>Detailed Treatment Breakdown</span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {treatmentStats.length} Services
                </span>
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Full list of all treatments sorted by booking volume and confirmation rates
              </p>
            </div>

            {onNavigateToTreatments && (
              <button
                type="button"
                onClick={onNavigateToTreatments}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Treatments</span>
                <span>→</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Treatment Name</th>
                  <th className="py-3 px-4">Price / Fee</th>
                  <th className="py-3 px-4 text-center">Total Bookings</th>
                  <th className="py-3 px-4">Volume Share</th>
                  <th className="py-3 px-4 text-right">Confirmed / Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {treatmentStats.map((item, index) => {
                  const sharePct = totalBookingsCount > 0
                    ? Math.round((item.bookings / totalBookingsCount) * 100)
                    : 0;

                  return (
                    <tr
                      key={item.name}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-bold text-slate-900">
                            {item.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {item.price || '—'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full font-black text-xs ${
                          item.bookings > 0
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.bookings}
                        </span>
                      </td>

                      <td className="py-3 px-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.max(sharePct, item.bookings > 0 ? 5 : 0)}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 shrink-0 w-8">
                            {sharePct}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-700 font-bold">
                          {item.confirmed} confirmed
                        </span>
                        {item.cancelled > 0 && (
                          <span className="text-rose-600 font-medium ml-1.5 text-[11px]">
                            ({item.cancelled} cancelled)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
