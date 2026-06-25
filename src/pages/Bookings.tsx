import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import type { Booking } from '../types';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { Plus, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { formatDateTime } from '../utils/time';


export const Bookings: React.FC = () => {
  const {
    bookings,
    bookingsLoading,
    bookingsError,
    fetchBookings,
    createBooking,
    zones,
    fetchZones,
    currentUser,
  } = useAppStore();

  const [showNewForm, setShowNewForm] = useState(false);
  const [plate, setPlate] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [bayNumber, setBayNumber] = useState('');
  const [duration, setDuration] = useState(2); // hours default
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16)); // YYYY-MM-DDTHH:MM
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortKey, setSortKey] = useState<string>('start_time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchBookings();
    fetchZones();
  }, []);

  // Sort bookings client-side
  const sortedBookings = React.useMemo(() => {
    return [...bookings].sort((a, b) => {
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
  }, [bookings, sortKey, sortDirection]);

  // Paginated bookings
  const totalItems = sortedBookings.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const paginatedBookings = React.useMemo(() => {
    const startIdx = (currentPage - 1) * limit;
    return sortedBookings.slice(startIdx, startIdx + limit);
  }, [sortedBookings, currentPage, limit]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Update zoneId default when zones load
  useEffect(() => {
    if (zones.length > 0 && !zoneId) {
      setZoneId(zones[0].zone_id);
    }
  }, [zones]);

  // Compute live end time based on start time + duration
  const getLiveEndTime = () => {
    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
      return formatDateTime(end.toISOString());
    } catch {
      return '-';
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!plate.trim()) {
      setFormError('License plate is required.');
      return;
    }
    if (!bayNumber.trim()) {
      setFormError('Bay number is required.');
      return;
    }
    if (duration <= 0) {
      setFormError('Duration must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const calculatedEnd = new Date(new Date(startTime).getTime() + duration * 60 * 60 * 1000).toISOString();
      const success = await createBooking({
        plate_number: plate.trim().toUpperCase(),
        zone_id: zoneId,
        bay_number: bayNumber.trim().toUpperCase(),
        start_time: new Date(startTime).toISOString(),
        duration_hours: duration,
        end_time: calculatedEnd,
        officer_id: currentUser?.officer_id || 'officer.default',
        notes: notes.trim() || undefined,
      });

      if (success) {
        setSuccessMsg('Parking booking successfully registered!');
        // Reset form
        setPlate('');
        setBayNumber('');
        setDuration(2);
        setStartTime(new Date().toISOString().slice(0, 16));
        setNotes('');
        
        // Hide form after delay
        setTimeout(() => {
          setShowNewForm(false);
          setSuccessMsg(null);
        }, 1500);
        
        // Reload list
        fetchBookings();
        setCurrentPage(1);
      } else {
        setFormError('Failed to register booking. Check API status.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (statusStr: string) => {
    switch (statusStr.toUpperCase()) {
      case 'ACTIVE': return 'bg-status-cleared/15 text-status-cleared border border-status-cleared/20';
      case 'COMPLETED': return 'bg-zinc-800 text-zinc-400';
      case 'OVERSTAYED': return 'bg-status-disputed/15 text-status-disputed border border-status-disputed/25';
      case 'CANCELLED': return 'bg-status-fined/15 text-status-fined';
      default: return 'bg-zinc-850 text-slate-300';
    }
  };

  const columns: Column<Booking>[] = [
    {
      key: 'plate_number',
      label: 'Plate Number',
      sortable: true,
      cellClassName: 'font-plate text-slate-100 uppercase tracking-wider',
    },
    {
      key: 'bay_number',
      label: 'Location',
      sortable: true,
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      render: (row) => (
        <span className="text-xs text-slate-300 font-semibold">
          Bay {row.bay_number} ({row.zone_id})
        </span>
      ),
    },
    {
      key: 'start_time',
      label: 'Start Time',
      sortable: true,
      cellClassName: 'font-tabular text-xs',
      render: (row) => formatDateTime(row.start_time),
    },
    {
      key: 'duration_hours',
      label: 'Duration',
      sortable: true,
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell font-tabular text-xs',
      render: (row) => `${row.duration_hours} hrs`,
    },
    {
      key: 'end_time',
      label: 'End Time',
      sortable: true,
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell font-tabular text-xs',
      render: (row) => formatDateTime(row.end_time),
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
      key: 'revenue',
      label: 'Paid (₦)',
      sortable: true,
      cellClassName: 'font-tabular font-semibold text-status-cleared',
      render: (row) => `₦${row.revenue.toLocaleString()}`,
    },
    {
      key: 'officer_id',
      label: 'Officer',
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell text-xs text-text-muted',
      render: (row) => <span>{row.officer_id}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div className="text-left">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Parking Bookings Management
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Create parking reservations, monitor overstayed bays, and collect revenue
          </p>
        </div>

        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-brand-accent/15 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {showNewForm ? 'Back to Reservations' : 'New Parking Booking'}
        </button>
      </div>

      {showNewForm ? (
        /* New Booking Form View */
        <div className="glass-panel max-w-xl mx-auto w-full rounded-2xl p-6 text-left animate-slide-up">
          <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-3 mb-4">
            Register New Parking Booking
          </h3>

          {formError && (
            <div className="flex items-center gap-2 bg-status-fined/10 text-status-fined border border-status-fined/20 p-3 rounded-lg text-xs font-semibold mb-4">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 bg-status-cleared/10 text-status-cleared border border-status-cleared/20 p-3 rounded-lg text-xs font-semibold mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
            {/* Plate Number */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Vehicle License Plate</label>
              <input
                type="text"
                placeholder="e.g. ABC123XY"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors uppercase font-plate tracking-wider"
              />
            </div>

            {/* Zone & Bay */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Zone Location</label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
                >
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Bay Number</label>
                <input
                  type="text"
                  placeholder="e.g. A-12"
                  value={bayNumber}
                  onChange={(e) => setBayNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors uppercase"
                />
              </div>
            </div>

            {/* Start Time & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Duration (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Live End Time Readout */}
            <div className="bg-slate-900/60 border border-dark-border p-3.5 rounded-lg text-xs flex justify-between items-center">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Estimated End Time</span>
                <span className="font-semibold text-slate-200 mt-0.5 block font-tabular">{getLiveEndTime()}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Estimated Cost</span>
                <span className="font-bold text-status-cleared text-sm mt-0.5 block font-tabular">
                  ₦{(duration * 1000).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Reservation Notes</label>
              <textarea
                rows={3}
                placeholder="Add special instructions or parking pass codes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3.5 py-2 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 border-t border-dark-border/40 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 border border-dark-border text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-brand-accent hover:bg-brand-accent-hover text-white rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Registering...' : 'Register Reservation'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Booking list view */
        <div className="flex flex-col gap-6">
          {bookingsError && (
            <div className="flex items-center gap-2 bg-status-fined/10 text-status-fined border border-status-fined/20 p-4 rounded-xl text-sm font-semibold text-left">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Failed to fetch active reservations: {bookingsError}.</span>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginatedBookings}
            loading={bookingsLoading}
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
      )}
    </div>
  );
};
export default Bookings;
