import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { KPICard } from '../components/KPICard';
import type { Fine, Booking } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend 
} from 'recharts';
import { 
  Calendar, AlertCircle, RotateCcw, Eye,
  Car, AlertTriangle, Scale, Lock, Truck, FileText, CheckCircle2, Clock, Coins
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/time';

export const Dashboard: React.FC = () => {
  const {
    summary,
    summaryFilters,
    summaryError,
    fetchSummary,
    setSummaryFilters,
    vehicles,
    fetchVehicles,
    fetchCameras,
    fetchZones,
  } = useAppStore();

  const [dateRangeType, setDateRangeType] = useState<'today' | 'week' | 'month' | 'custom'>('month');

  // Trigger initial loads
  useEffect(() => {
    fetchSummary();
    fetchCameras();
    fetchZones();
    
    // Fetch recent 20 vehicles for recent activity
    fetchVehicles();
  }, [summaryFilters]);

  // Handle preset date filters
  const handleDatePresetChange = (preset: 'today' | 'week' | 'month') => {
    setDateRangeType(preset);
    const today = new Date();
    let fromDate = new Date();
    
    if (preset === 'today') {
      fromDate = today;
    } else if (preset === 'week') {
      fromDate.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      fromDate.setMonth(today.getMonth() - 1);
    }

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = today.toISOString().split('T')[0];

    setSummaryFilters({ from: fromStr, to: toStr });
  };

  // Calculate scans over time dynamically from received events list
  const getScannedTrendData = () => {
    const hourlyData: Record<string, { scans: number; violations: number }> = {};
    
    // Initialize 24 hours slots
    for (let i = 0; i < 24; i += 4) {
      const label = `${i.toString().padStart(2, '0')}:00`;
      hourlyData[label] = { scans: 0, violations: 0 };
    }

    vehicles.forEach(v => {
      try {
        const date = new Date(v.captured_at);
        const hour = date.getHours();
        const slotHour = Math.floor(hour / 4) * 4;
        const label = `${slotHour.toString().padStart(2, '0')}:00`;
        
        if (hourlyData[label]) {
          hourlyData[label].scans += 1;
          if (v.status === 'ACTIONED' && v.enforcement_status) {
            hourlyData[label].violations += 1;
          }
        }
      } catch (e) {
        // Ignore date parsing errors
      }
    });

    return Object.entries(hourlyData).map(([name, data]) => ({
      name,
      ...data
    }));
  };

  const scannedTrendData = getScannedTrendData();

  const enforcementPieData = summary ? [
    { name: 'Fined', value: summary.total_fined, color: '#EF4444' },
    { name: 'Clamped', value: summary.total_clamped, color: '#F97316' },
    { name: 'Towed', value: summary.total_towed, color: '#A855F7' },
    { name: 'Impounded', value: summary.total_impounded, color: '#991B1B' },
  ].filter(item => item.value > 0) : [];

  // Calculate top violation zones dynamically from received events list
  const getZoneViolationData = () => {
    const zoneCounts: Record<string, number> = {};
    
    vehicles.forEach(v => {
      if (v.status === 'ACTIONED' && v.enforcement_status) {
        const zone = v.camera_name?.split('-')[0].trim() || v.camera_location || 'Unknown';
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
      }
    });

    return Object.entries(zoneCounts)
      .map(([name, violations]) => ({ name, violations }))
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 5);
  };

  const zoneViolationData = getZoneViolationData();

  // Calculate revenue trends dynamically from local bookings/fines
  const getRevenueTrendData = () => {
    const dailyRevenue: Record<string, number> = {};
    const today = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dailyRevenue[label] = 0;
    }

    try {
      const savedFines = localStorage.getItem('anpr_local_fines');
      const localFines: Fine[] = savedFines ? JSON.parse(savedFines) : [];
      localFines.forEach(f => {
        const label = new Date(f.issued_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dailyRevenue[label] !== undefined) {
          dailyRevenue[label] += f.amount;
        }
      });

      const savedBookings = localStorage.getItem('anpr_local_bookings');
      const localBookings: Booking[] = savedBookings ? JSON.parse(savedBookings) : [];
      localBookings.forEach(b => {
        const label = new Date(b.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (dailyRevenue[label] !== undefined) {
          dailyRevenue[label] += b.revenue;
        }
      });
    } catch (e) {
      // Ignore parsing errors
    }

    return Object.entries(dailyRevenue).map(([name, revenue]) => ({
      name,
      revenue
    }));
  };

  const revenueTrendData = getRevenueTrendData();

  // Helper format currency
  const formatNaira = (val: number) => {
    return `₦${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Dashboard Welcome Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden glass-panel border border-dark-border/50 shadow-2xl p-6 md:p-8 text-left animate-slide-up flex flex-col md:flex-row items-center justify-between gap-6 min-h-[180px]">
        {/* Background Image with overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#080C18]/95 via-[#080C18]/70 to-[#080C18]/40 z-10" />
          <img
            src="/assets/lagos_smart_parking.png"
            alt="Lagos Smart Parking"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Banner Content */}
        <div className="relative z-10 flex-1">
          <span className="bg-brand-accent/80 border border-brand-accent/35 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full text-white">
            System Operations Dashboard
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-3.5 tracking-tight leading-tight">
            Lagos State Parking Authority (LASPA)
          </h1>
          <p className="text-xs mt-2 max-w-xl leading-relaxed font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
            Monitor real-time ANPR camera ingestion feeds, penalty violations log, parking reservations bookings, and dynamic revenue metrics across Lagos metropolitan zones.
          </p>
        </div>
      </div>

      {/* Top Action Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Management Analytics
          </h2>
          <p className="text-xs text-text-muted font-semibold mt-1">
            Real-time enforcement stats for LASPA ANPR Cameras
          </p>
        </div>

        {/* Global Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Preset Date Toggles */}
          <div className="inline-flex rounded-lg border border-dark-border bg-slate-900/60 p-0.5 shadow-inner">
            <button
              onClick={() => handleDatePresetChange('today')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                dateRangeType === 'today' ? 'bg-brand-accent text-white shadow' : 'text-text-muted hover:text-slate-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePresetChange('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                dateRangeType === 'week' ? 'bg-brand-accent text-white shadow' : 'text-text-muted hover:text-slate-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handleDatePresetChange('month')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                dateRangeType === 'month' ? 'bg-brand-accent text-white shadow' : 'text-text-muted hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2 bg-slate-900 border border-dark-border rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-text-muted" />
            <input
              type="date"
              value={summaryFilters.from || ''}
              onChange={(e) => {
                setDateRangeType('custom');
                setSummaryFilters({ from: e.target.value });
              }}
              className="bg-transparent border-none text-slate-300 focus:outline-none w-28 cursor-pointer"
            />
            <span className="text-text-muted font-bold">to</span>
            <input
              type="date"
              value={summaryFilters.to || ''}
              onChange={(e) => {
                setDateRangeType('custom');
                setSummaryFilters({ to: e.target.value });
              }}
              className="bg-transparent border-none text-slate-300 focus:outline-none w-28 cursor-pointer"
            />
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setDateRangeType('month');
              const fromStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              const toStr = new Date().toISOString().split('T')[0];
              setSummaryFilters({
                from: fromStr,
                to: toStr,
                zone: undefined,
                camera_id: undefined,
                officer_id: undefined
              });
            }}
            className="p-2 border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {summaryError && (
        <div className="flex items-center gap-2.5 bg-status-fined/10 border border-status-fined/25 text-status-fined p-4 rounded-xl text-sm font-semibold text-left">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Error loading KPI metrics: {summaryError}.</span>
        </div>
      )}

      {/* KPI 9-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          label="Total Scanned Vehicles"
          value={summary?.total_scanned || 0}
          description="Total scanned plates count"
          accentHex="#60A5FA"
          icon={<Car className="w-4 h-4" />}
          watermarkIcon={Car}
        />
        <KPICard
          label="Vehicles Fined"
          value={summary?.total_fined || 0}
          description="Vehicles flagged with active fines"
          accentHex="#F87171"
          icon={<AlertTriangle className="w-4 h-4" />}
          watermarkIcon={AlertTriangle}
        />
        <KPICard
          label="Disputed Fines"
          value={summary?.total_disputed || 0}
          description="Fines currently under dispute"
          accentHex="#FBBF24"
          icon={<Scale className="w-4 h-4" />}
          watermarkIcon={Scale}
        />
        <KPICard
          label="Clamped Vehicles"
          value={summary?.total_clamped || 0}
          description="Vehicles clamped for violations"
          accentHex="#FB923C"
          icon={<Lock className="w-4 h-4" />}
          watermarkIcon={Lock}
        />
        <KPICard
          label="Towed Vehicles"
          value={summary?.total_towed || 0}
          description="Vehicles towed from restriction zones"
          accentHex="#C084FC"
          icon={<Truck className="w-4 h-4" />}
          watermarkIcon={Truck}
        />
        <KPICard
          label="Impounded Vehicles"
          value={summary?.total_impounded || 0}
          description="Vehicles impounded in depots"
          accentHex="#F43F5E"
          icon={<FileText className="w-4 h-4" />}
          watermarkIcon={FileText}
        />
        <KPICard
          label="Total Bookings"
          value={summary?.total_bookings || 0}
          description="Approved parking bookings count"
          accentHex="#34D399"
          icon={<CheckCircle2 className="w-4 h-4" />}
          watermarkIcon={CheckCircle2}
        />
        <KPICard
          label="Total Booking Hours"
          value={summary?.total_booking_hours || 0}
          description="Aggregated parking hours"
          format="decimal"
          accentHex="#60A5FA"
          icon={<Clock className="w-4 h-4" />}
          watermarkIcon={Clock}
        />
        <KPICard
          label="Total Revenue"
          value={summary?.total_revenue || 0}
          description="Fines and bookings collection"
          format="currency"
          accentHex="#EAB308"
          icon={<Coins className="w-4 h-4" />}
          watermarkIcon={Coins}
        />
      </div>

      {/* Analytical Charts Row (Bento Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        {/* Scans Over Time (8 Columns) */}
        <div className="lg:col-span-8 glass-panel rounded-xl p-5 flex flex-col justify-between text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Scans & Infractions over Time</h3>
              <p className="text-[11px] text-text-muted">Hourly traffic density across gates</p>
            </div>
            <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider bg-brand-accent/10 px-2 py-0.5 rounded border border-brand-accent/20">
              Live Feed Connected
            </span>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scannedTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2F3E" />
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: 10 }} />
                <YAxis stroke="#6B7280" style={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2C2F3E', borderRadius: 8 }}
                  labelStyle={{ color: '#E8EAF0', fontWeight: 'bold' }}
                />
                <Legend style={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="scans" stroke="#3B82F6" strokeWidth={2} name="Total Scans" activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={2} name="Citations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enforcement Breakdown (4 Columns) */}
        <div className="lg:col-span-4 glass-panel rounded-xl p-5 flex flex-col justify-between text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Enforcement Breakdown</h3>
            <p className="text-[11px] text-text-muted">Distribution of manual citations</p>
          </div>

          <div className="h-48 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enforcementPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {enforcementPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2C2F3E', borderRadius: 8 }}
                  itemStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[10px] text-text-muted font-bold uppercase">Citations</span>
              <span className="text-2xl font-bold text-slate-100 font-tabular">
                {enforcementPieData.reduce((sum, item) => sum + item.value, 0)}
              </span>
            </div>
          </div>

          {/* Custom Legends list */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {enforcementPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="truncate">{item.name}:</span>
                <span className="font-tabular font-bold text-slate-100 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trends (6 Columns) */}
        <div className="lg:col-span-6 glass-panel rounded-xl p-5 flex flex-col justify-between text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Revenue Yield Trend</h3>
            <p className="text-[11px] text-text-muted">Total fines and booking fees daily volume</p>
          </div>

          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2F3E" />
                <XAxis dataKey="name" stroke="#6B7280" style={{ fontSize: 10 }} />
                <YAxis stroke="#6B7280" tickFormatter={(val) => `₦${val/1000}k`} style={{ fontSize: 10 }} />
                <Tooltip 
                  formatter={(val) => [formatNaira(val as number), 'Revenue']}
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2C2F3E', borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Infraction Zones (6 Columns) */}
        <div className="lg:col-span-6 glass-panel rounded-xl p-5 flex flex-col justify-between text-left">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Top Violation Zones</h3>
            <p className="text-[11px] text-text-muted">Infraction incidents grouped by location area</p>
          </div>

          <div className="h-60 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={zoneViolationData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2C2F3E" />
                <XAxis type="number" stroke="#6B7280" style={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" stroke="#6B7280" style={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2C2F3E', borderRadius: 8 }}
                />
                <Bar dataKey="violations" fill="#F97316" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="glass-panel rounded-xl p-5 text-left">
        <div className="flex items-center justify-between mb-4 border-b border-dark-border/40 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Recent Activity Log</h3>
            <p className="text-[11px] text-text-muted">Last scans captured by enforcement cameras</p>
          </div>
          <Link 
            to="/vehicles" 
            className="text-xs text-brand-accent hover:text-brand-accent-hover font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            View Full Log
          </Link>
        </div>

        {/* Simple Activity Feed list */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-dark-border/60 text-text-muted font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Plate</th>
                <th className="py-2.5 px-3">Capture Time</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Location</th>
                <th className="py-2.5 px-3 hidden md:table-cell">Category / Details</th>
                <th className="py-2.5 px-3">Enforcement</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/30 text-slate-300">
              {vehicles.slice(0, 10).map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/25 transition-colors">
                  <td className="py-2.5 px-3 font-plate tracking-wider text-slate-200 uppercase">
                    {item.anpr_text}
                  </td>
                  <td className="py-2.5 px-3 font-tabular">
                    {formatDateTime(item.captured_at)}
                  </td>
                  <td className="py-2.5 px-3 hidden sm:table-cell">
                    {item.camera_location}
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-text-muted">
                    {item.vehicle_colour} {item.vehicle_make} {item.vehicle_model}
                  </td>
                  <td className="py-2.5 px-3">
                    <StatusBadge status={item.status === 'SCANNED' ? (item.enforcement_status || 'PENDING') : item.status} />
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      to={`/vehicles/${item.event_id}`}
                      className="text-brand-accent hover:text-brand-accent-hover font-bold hover:underline cursor-pointer"
                    >
                      Audit Details
                    </Link>
                  </td>
                </tr>
              ))}
              {vehicles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-muted italic">
                    No recent activity logs parsed from endpoints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
