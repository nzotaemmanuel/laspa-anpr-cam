import React, { useState, useEffect } from 'react';
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
  const [pageInput, setPageInput] = useState(currentPage.toString());

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

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
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange?.(pageNum);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Table Container */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          minHeight: 200,
        }}
      >
        {/* Loading Overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(8,12,24,0.55)', backdropFilter: 'blur(6px)' }}
          >
            <div
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-muted)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#6366F1' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Querying records…
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="table-header">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    className={`px-4 py-3.5 select-none whitespace-nowrap ${
                      col.sortable ? 'cursor-pointer' : ''
                    } ${col.headerClassName || ''}`}
                    style={{
                      transition: 'color 0.15s',
                      color: sortKey === col.key ? '#A5B4FC' : 'var(--text-muted)',
                    }}
                    onMouseEnter={e => col.sortable && ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
                    onMouseLeave={e => col.sortable && ((e.currentTarget as HTMLElement).style.color = sortKey === col.key ? '#A5B4FC' : 'var(--text-muted)')}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && onSortChange && (
                        <ArrowUpDown
                          className="w-3 h-3 transition-colors"
                          style={{ color: sortKey === col.key ? '#6366F1' : 'var(--text-muted)', opacity: sortKey === col.key ? 1 : 0.45 }}
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm italic"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    No matching records found.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIdx) => (
                  <tr key={rowIdx} className="table-row">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 align-middle text-sm ${col.cellClassName || ''}`}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {col.render ? col.render(row) : (row as any)[col.key]?.toString() || (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages >= 1 && onPageChange && (
        <div
          className="flex flex-col lg:flex-row items-center justify-between gap-4 px-4 py-3 rounded-xl"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Status count */}
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
            Showing{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{data.length}</span>
            {' '}of{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{totalItems}</span>
            {' '}entries
          </span>

          {/* Page navigation and search */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {[
                { icon: <ChevronsLeft className="w-3.5 h-3.5" />, onClick: () => onPageChange(1), disabled: currentPage === 1 },
                { icon: <ChevronLeft className="w-3.5 h-3.5" />, onClick: () => onPageChange(currentPage - 1), disabled: currentPage === 1 },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className="p-1.5 rounded-lg cursor-pointer disabled:opacity-30"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                >
                  {btn.icon}
                </button>
              ))}

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className="w-8 h-8 rounded-lg text-xs font-bold cursor-pointer transition-all"
                  style={
                    currentPage === pageNum
                      ? {
                          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          color: '#fff',
                          boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
                          border: 'none',
                        }
                      : {
                          background: 'var(--bg-surface-2)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  {pageNum}
                </button>
              ))}

              {[
                { icon: <ChevronRight className="w-3.5 h-3.5" />, onClick: () => onPageChange(currentPage + 1), disabled: currentPage === totalPages || totalPages === 0 },
                { icon: <ChevronsRight className="w-3.5 h-3.5" />, onClick: () => onPageChange(totalPages), disabled: currentPage === totalPages || totalPages === 0 },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  className="p-1.5 rounded-lg cursor-pointer disabled:opacity-30"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {btn.icon}
                </button>
              ))}
            </div>

            {/* Go to page form */}
            <form onSubmit={handleGoToPage} className="flex items-center gap-1.5 border-l border-dark-border/40 pl-3">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages || 1}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="w-12 h-8 rounded-lg text-xs font-bold text-center px-1"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  outline: 'none',
                }}
                placeholder="Page"
              />
              <button
                type="submit"
                className="h-8 px-2.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                Go
              </button>
            </form>
          </div>

          {/* Limit selector */}
          {onLimitChange && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Show:</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(parseInt(e.target.value))}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer"
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-secondary)',
                }}
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
