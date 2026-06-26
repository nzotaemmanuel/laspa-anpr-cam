import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { formatImageSrc } from '../components/PlateImage';
import { Search, MapPin, ShieldAlert, Eye, Settings2, Calendar, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DetectionEvent } from '../types';
import { formatDateTime } from '../utils/time';

export const Vehicles: React.FC = () => {
  const {
    vehicles,
    vehiclesTotal,
    vehiclesPage,
    vehiclesPages,
    vehiclesFilters,
    vehiclesLoading,
    vehiclesError,
    fetchVehicles,
    setVehiclesFilters,
    zones,
    fetchZones,
    fetchCameras,
  } = useAppStore();


  const [searchPlate, setSearchPlate] = useState(vehiclesFilters.plate || '');
  const [filterZone, setFilterZone] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterFrom, setFilterFrom] = useState<string>(vehiclesFilters.from || '');
  const [filterTo, setFilterTo] = useState<string>(vehiclesFilters.to || '');

  // Initial load
  useEffect(() => {
    fetchZones();
    fetchCameras();
    fetchVehicles();
  }, []);

  // Fetch when filters or page changes
  useEffect(() => {
    fetchVehicles();
  }, [
    vehiclesFilters.page, 
    vehiclesFilters.limit, 
    vehiclesFilters.zone, 
    vehiclesFilters.status, 
    vehiclesFilters.from, 
    vehiclesFilters.to
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVehiclesFilters({ 
      plate: searchPlate.trim() || undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      page: 1 // Reset to page 1 on new search
    });
    fetchVehicles();
  };

  const handleFilterChange = (key: 'zone' | 'status', value: string) => {
    if (key === 'zone') {
      setFilterZone(value);
      setVehiclesFilters({ 
        zone: value ? [value] : undefined,
        page: 1
      });
    } else {
      setFilterStatus(value);
      setVehiclesFilters({ 
        status: value ? [value] : undefined,
        page: 1
      });
    }
  };

  const handleDateChange = (key: 'from' | 'to', value: string) => {
    if (key === 'from') {
      setFilterFrom(value);
      setVehiclesFilters({ 
        from: value || undefined,
        page: 1
      });
    } else {
      setFilterTo(value);
      setVehiclesFilters({ 
        to: value || undefined,
        page: 1
      });
    }
  };

  // Define Columns for DataTable
  const columns: Column<DetectionEvent>[] = [
    {
      key: 'anpr_text',
      label: 'Plate Number',
      sortable: true,
      cellClassName: 'font-plate text-slate-100 uppercase tracking-wider',
      render: (row) => (
        <Link 
          to={`/vehicles/${row.event_id}`} 
          className="hover:text-brand-accent hover:underline flex items-center gap-1.5"
        >
          {row.anpr_text}
        </Link>
      ),
    },
    {
      key: 'plate_image_url',
      label: 'Plate Crop',
      render: (row) => (
        row.plate_image_url ? (
          <div className="w-16 h-7 rounded border border-dark-border bg-black/40 overflow-hidden flex items-center justify-center">
            <img 
              src={formatImageSrc(row.plate_image_url)} 
              alt="Plate Crop" 
              className="object-contain w-full h-full"
            />
          </div>
        ) : (
          <span className="text-xs text-text-muted italic">N/A</span>
        )
      ),
    },
    {
      key: 'vehicle_image_url',
      label: 'Vehicle Preview',
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell',
      render: (row) => (
        row.vehicle_image_url ? (
          <div className="w-16 h-10 rounded border border-dark-border bg-black/40 overflow-hidden relative group">
            <img 
              src={formatImageSrc(row.vehicle_image_url)} 
              alt="Vehicle preview" 
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <span className="text-xs text-text-muted italic">N/A</span>
        )
      ),
    },
    {
      key: 'captured_at',
      label: 'Date & Time',
      sortable: true,
      cellClassName: 'font-tabular text-xs',
      render: (row) => formatDateTime(row.captured_at),
    },
    {
      key: 'camera_location',
      label: 'Zone Location',
      sortable: true,
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      render: (row) => (
        <span className="text-xs text-slate-300">
          {row.camera_location}
        </span>
      ),
    },


    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge status={row.status === 'SCANNED' ? (row.enforcement_status || 'PENDING') : row.status} />
      ),
    },
    {
      key: 'officer_id',
      label: 'Officer',
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
      render: (row) => (
        <span className="text-xs text-slate-400 truncate max-w-[80px]" title={row.officer_id || ''}>
          {row.officer_id || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      cellClassName: 'text-right',
      render: (row) => (
        <Link
          to={`/vehicles/${row.event_id}`}
          className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent-hover font-semibold hover:underline cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          Audit
        </Link>
      ),
    },
  ];

  const handlePageChange = (page: number) => {
    setVehiclesFilters({ page });
  };

  const handleLimitChange = (limit: number) => {
    setVehiclesFilters({ limit, page: 1 });
  };

  const handleSortChange = (_key: string, _direction: 'asc' | 'desc') => {
    // Standard client side sorting for rendering (or trigger reload with sort query)
    // We update the filters if the API supports it
    setVehiclesFilters({ page: 1 }); // reset page
    fetchVehicles();
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div className="text-left">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Vehicle Scans Log
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Searchable historical database of all number plate recognition events
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-panel rounded-xl p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* Plate Search input (4 Cols) */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Search License Plate</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchPlate}
                onChange={(e) => setSearchPlate(e.target.value)}
                placeholder="e.g. ABC123XY (partial matches)"
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Zone Selector (4 Cols) */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Zone Location</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <MapPin className="w-4 h-4" />
              </span>
              <select
                value={filterZone}
                onChange={(e) => handleFilterChange('zone', e.target.value)}
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">All Zones</option>
                {zones.map((z) => (
                  <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Selector (4 Cols) */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">Enforcement Status</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Settings2 className="w-4 h-4" />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="SCANNED">Pending (Scanned)</option>
                <option value="FINED">Fined</option>
                <option value="CLAMPED">Clamped</option>
                <option value="TOWED">Towed</option>
                <option value="IMPOUNDED">Impounded</option>
                <option value="BOOKED">Booked</option>
                <option value="CLEARED">Cleared</option>
              </select>
            </div>
          </div>

          {/* From Date (4 Cols) */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">From Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* To Date (4 Cols) */}
          <div className="lg:col-span-4 text-left">
            <label className="block text-xs font-bold text-text-muted uppercase mb-1.5">To Date</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={filterTo}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="w-full h-10 bg-slate-900 border border-dark-border rounded-lg pl-10 pr-3.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Submit Search Button (4 Cols) */}
          <div className="lg:col-span-4">
            <button
              type="submit"
              className="group w-full h-12 btn-filter-animated text-white border-none rounded-xl text-sm font-bold cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Filter className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
              Filter Records
            </button>
          </div>
        </form>
      </div>

      {/* Error display */}
      {vehiclesError && (
        <div className="flex items-center gap-2 bg-status-fined/10 text-status-fined border border-status-fined/20 p-4 rounded-xl text-sm font-semibold text-left">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>Failed to load log entries: {vehiclesError}. Ensure endpoints are accessible.</span>
        </div>
      )}

      {/* Main records table */}
      <DataTable
        columns={columns}
        data={vehicles}
        loading={vehiclesLoading}
        totalItems={vehiclesTotal}
        currentPage={vehiclesPage}
        totalPages={vehiclesPages}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onSortChange={handleSortChange}
        limit={vehiclesFilters.limit}
      />
    </div>
  );
};
export default Vehicles;
