import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { Fine } from '../types';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { Search, ShieldAlert, Eye, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../utils/time';


export const Fines: React.FC = () => {
  const { fines, finesLoading, finesError, fetchFines } = useAppStore();
  const [plate, setPlate] = useState('');
  const [status, setStatus] = useState<string>('');

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortKey, setSortKey] = useState<string>('issued_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchFines();
  }, []);

  // Sort fines client-side
  const sortedFines = React.useMemo(() => {
    return [...fines].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = aVal > bVal ? 1 : -1;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [fines, sortKey, sortDirection]);

  // Paginated fines
  const totalItems = sortedFines.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedFines = React.useMemo(() => {
    const startIdx = (currentPage - 1) * limit;
    return sortedFines.slice(startIdx, startIdx + limit);
  }, [sortedFines, currentPage, limit]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFines({
      plate: plate.trim() || undefined,
      status: status ? [status] : undefined,
    });
    setCurrentPage(1);
  };

  const getStatusStyle = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case 'PAID': return 'bg-status-cleared/15 text-status-cleared';
      case 'ISSUED': return 'bg-status-scanned/15 text-status-scanned';
      case 'DISPUTED': return 'bg-status-disputed/15 text-status-disputed';
      case 'WAIVED': return 'bg-zinc-800 text-zinc-400';
      case 'OVERDUE': return 'bg-status-fined/15 text-status-fined';
      default: return 'bg-zinc-850 text-slate-300';
    }
  };

  const columns: Column<Fine>[] = [
    {
      key: 'plate_number',
      label: 'Plate Number',
      sortable: true,
      cellClassName: 'font-plate text-slate-100 uppercase tracking-wider',
      render: (row) => (
        <Link to={`/fines/${row.fine_id}`} className="hover:text-brand-accent hover:underline">
          {row.plate_number}
        </Link>
      ),
    },
    {
      key: 'offence_code',
      label: 'Offence Code',
      sortable: true,
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      render: (row) => (
        <span className="text-xs font-semibold text-slate-300" title={row.offence_description}>
          {row.offence_code}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount (₦)',
      sortable: true,
      cellClassName: 'font-tabular font-bold text-status-fined',
      render: (row) => `₦${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    },
    {
      key: 'issued_date',
      label: 'Issued Date',
      sortable: true,
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell font-tabular text-xs',
      render: (row) => formatDate(row.issued_date),
    },
    {
      key: 'due_date',
      label: 'Due Date',
      sortable: true,
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell font-tabular text-xs',
      render: (row) => formatDate(row.due_date),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(row.status)}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'officer_id',
      label: 'Issued By',
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell text-xs text-text-muted',
      render: (row) => <span>{row.officer_id}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (row) => (
        <Link
          to={`/fines/${row.fine_id}`}
          className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent-hover font-semibold hover:underline cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Review
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div className="text-left">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Fine Citation Management
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Review citation payments, waived infractions, and disputed fines
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel rounded-xl p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-12 gap-4 items-end">
          {/* Plate Search input */}
          <div className="lg:col-span-5 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Search License Plate</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="e.g. ABC123XY"
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Status Selector */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Fine Status</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Settings2 className="w-4 h-4" />
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="ISSUED">Issued (Unpaid)</option>
                <option value="PAID">Paid</option>
                <option value="DISPUTED">Disputed</option>
                <option value="WAIVED">Waived</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          {/* Submit button */}
          <div className="lg:col-span-3">
            <button
              type="submit"
              className="w-full h-10 bg-slate-900 hover:bg-slate-850 border border-dark-border hover:border-slate-600 text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Filter Fines
            </button>
          </div>
        </form>
      </div>

      {/* Error alert */}
      {finesError && (
        <div className="flex items-center gap-2 bg-status-fined/10 text-status-fined border border-status-fined/20 p-4 rounded-xl text-sm font-semibold text-left">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>Failed to query fines database: {finesError}.</span>
        </div>
      )}

      {/* Table grid */}
      <DataTable
        columns={columns}
        data={paginatedFines}
        loading={finesLoading}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setCurrentPage(1);
        }}
        onSortChange={(key, direction) => {
          setSortKey(key);
          setSortDirection(direction);
        }}
        sortKey={sortKey}
        sortDirection={sortDirection}
        limit={limit}
      />
    </div>
  );
};
export default Fines;
