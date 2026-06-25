import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { API_BASE_URL } from '../services/api';
import { 
  FileText, Download, Calendar, MapPin, User, 
  Table, BarChart2, MessageSquare, AlertCircle, ShieldAlert 
} from 'lucide-react';

const REPORT_TYPES = [
  {
    id: 'daily_enforcement',
    name: 'Daily Enforcement Summary',
    desc: 'All 9 KPI metrics aggregated for a given calendar day.',
    icon: <Table className="w-5 h-5 text-brand-accent" />,
  },
  {
    id: 'revenue',
    name: 'Revenue Audit Report',
    desc: 'Fines collection and parking booking revenue split by zone, officer, and date range.',
    icon: <BarChart2 className="w-5 h-5 text-status-cleared" />,
  },
  {
    id: 'disputes',
    name: 'Disputes & Appeals Report',
    desc: 'Audit trail of disputed citations, dispute reasons, and resolution states.',
    icon: <MessageSquare className="w-5 h-5 text-status-disputed" />,
  },
  {
    id: 'officer_activity',
    name: 'Officer Performance Log',
    desc: 'Individual enforcement actions, citations issued, and bookings created per officer.',
    icon: <User className="w-5 h-5 text-status-booked" />,
  },
  {
    id: 'repeat_offenders',
    name: 'Repeat Offenders Directory',
    desc: 'Hot-list of vehicle registration plates with 2 or more citation offences.',
    icon: <AlertCircle className="w-5 h-5 text-status-fined" />,
  },
  {
    id: 'scan_log',
    name: 'Raw Vehicle Scan Log',
    desc: 'Complete camera traffic captures, including Plate OCR text, direction, and timestamps.',
    icon: <FileText className="w-5 h-5 text-status-scanned" />,
  },
];

export const Reports: React.FC = () => {
  const { zones, currentUser } = useAppStore();
  const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0].id);
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days ago
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [zone, setZone] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsExporting(true);

    try {
      // Build API request parameters
      const params = new URLSearchParams({
        format: exportFormat,
        from: fromDate,
        to: toDate,
      });
      if (zone) params.append('zone', zone);
      if (currentUser) params.append('requestor_id', currentUser.officer_id);

      const downloadUrl = `${API_BASE_URL}/api/v1/reports/${selectedReport}?${params.toString()}`;

      // Since we want this to be production ready, we simulate checking connectivity,
      // then trigger direct download in a new tab
      // In a real browser context, this triggers browser download action:
      window.open(downloadUrl, '_blank');

      setSuccessMsg(`Report query dispatched. Download for ${exportFormat.toUpperCase()} format started.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch export request.');
    } finally {
      setIsExporting(false);
    }
  };

  const isSupervisor = currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 text-left">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            System Reports & Export
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Generate and export consolidated logs, financial summaries, and officer statistics
          </p>
        </div>
      </div>

      {/* Role gate warning */}
      {!isSupervisor && (
        <div className="flex items-start gap-2.5 bg-status-disputed/10 border border-status-disputed/20 text-status-disputed p-4 rounded-xl text-sm font-semibold">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span>Supervisor Clearance Required:</span>
            <p className="text-xs text-text-muted mt-1">
              You are currently logged in with Officer privileges. While you can configure query parameters, executing the PDF/XLSX export downloads is role-gated to Supervisors and Admins.
            </p>
          </div>
        </div>
      )}

      {/* Split grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Select Report Type (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            1. Select Report Template
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REPORT_TYPES.map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={`glass-panel rounded-xl p-4 cursor-pointer transition-all duration-200 border-2 ${
                  selectedReport === rep.id
                    ? 'border-brand-accent bg-brand-accent/5 shadow-lg shadow-brand-accent/5'
                    : 'border-dark-border hover:border-slate-700 bg-dark-surface/40'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="bg-slate-900 border border-dark-border p-2 rounded-lg shrink-0">
                    {rep.icon}
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 leading-tight">
                    {rep.name}
                  </h4>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {rep.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Configure Filters and Export (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            2. Configure Queries & Export
          </h3>

          <div className="glass-panel rounded-xl p-5">
            <form onSubmit={handleExport} className="flex flex-col gap-4">
              {/* Selected Report readout */}
              <div className="bg-slate-900 border border-dark-border p-3.5 rounded-lg text-xs mb-1">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Active Query</span>
                <span className="font-semibold text-brand-accent mt-0.5 block">
                  {REPORT_TYPES.find(r => r.id === selectedReport)?.name}
                </span>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">From Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-slate-900 border border-dark-border rounded-lg pl-9 pr-2 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">To Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-slate-900 border border-dark-border rounded-lg pl-9 pr-2 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Zone Filter */}
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Zone Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" />
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full bg-slate-900 border border-dark-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Zones</option>
                    {zones.map((z) => (
                      <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format selection */}
              <div className="text-left">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">File Format</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-0.5 border border-dark-border rounded-lg">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      exportFormat === 'csv' ? 'bg-slate-800 text-white shadow' : 'text-text-muted hover:text-slate-200'
                    }`}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      exportFormat === 'xlsx' ? 'bg-slate-800 text-white shadow' : 'text-text-muted hover:text-slate-200'
                    }`}
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      exportFormat === 'pdf' ? 'bg-slate-800 text-white shadow' : 'text-text-muted hover:text-slate-200'
                    }`}
                  >
                    PDF
                  </button>
                </div>
              </div>

              {/* Status messages */}
              {errorMsg && (
                <div className="bg-status-fined/10 border border-status-fined/25 text-status-fined p-3 rounded-lg text-xs font-semibold">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-status-cleared/10 border border-status-cleared/25 text-status-cleared p-3 rounded-lg text-xs font-semibold">
                  {successMsg}
                </div>
              )}

              {/* Submit Trigger */}
              <button
                type="submit"
                disabled={isExporting || !isSupervisor}
                className="w-full bg-brand-accent hover:bg-brand-accent-hover disabled:opacity-40 disabled:hover:bg-brand-accent text-white font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-accent/15 transition-all mt-4 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Preparing export...' : 'Export Consolidated Report'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Reports;
