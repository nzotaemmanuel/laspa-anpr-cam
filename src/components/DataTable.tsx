import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onSortChange?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  onLimitChange?: (limit: number) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onSortChange,
  sortKey,
  sortDirection,
  limit = 50,
  onLimitChange,
}: DataTableProps<T>) {
  const handleHeaderClick = (column: Column<T>) => {
    if (!column.sortable || !onSortChange) return;
    const isCurrent = sortKey === column.key;
    const direction = isCurrent && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column.key, direction);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Table Container */}
      <div className="relative rounded-xl overflow-hidden border border-dark-border bg-dark-surface/40 shadow-lg min-h-[200px]">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-dark-bg/60 backdrop-blur-xs z-10 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-5 py-3 rounded-xl shadow-xl">
              <Loader2 className="w-5 h-5 text-brand-accent animate-spin" />
              <span className="text-sm font-semibold text-slate-200">Querying records...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-dark-border text-xs font-bold text-text-muted uppercase tracking-wider">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={`px-4 py-3.5 select-none ${col.sortable ? 'cursor-pointer hover:text-slate-100 transition-colors' : ''} ${col.headerClassName || ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && onSortChange && (
                        <ArrowUpDown className={`w-3.5 h-3.5 transition-colors ${sortKey === col.key ? 'text-brand-accent' : 'text-text-muted/40'}`} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/40 text-sm text-slate-300">
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-text-muted italic">
                    No matching records found.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-800/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3.5 align-middle ${col.cellClassName || ''}`}>
                        {col.render ? col.render(row) : (row as any)[col.key]?.toString() || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-1 border border-dark-border bg-slate-900/20 rounded-xl">
          {/* Status count */}
          <div className="text-xs text-text-muted font-semibold">
            Showing <span className="text-slate-300 font-bold">{data.length}</span> of{' '}
            <span className="text-slate-300 font-bold">{totalItems}</span> total entries
          </div>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
                    : 'border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-800'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Page limit selector */}
          {onLimitChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-semibold">Show:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(parseInt(e.target.value))}
                className="bg-slate-900 border border-dark-border rounded-lg text-xs font-bold text-slate-300 px-2.5 py-1 focus:border-brand-accent focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
