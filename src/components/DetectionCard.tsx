import React from 'react';
import { 
  Navigation as NavigationIcon, 
  MapPin, 
  Clock, 
  Car,
  AlertTriangle,
  Tag
} from 'lucide-react';
import type { DetectionEvent } from '../types';
import { PlateImage } from './PlateImage';
import { VehicleImage } from './VehicleImage';
import { StatusBadge } from './StatusBadge';
import { formatTimeShort } from '../utils/time';

interface DetectionCardProps {
  event: DetectionEvent;
  repeatTimeAgo?: number; // In seconds, if scanned within 60s
  onActionClick: (action: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED') => void;
  onCorrectPlate: (correctedText: string) => void;
  userRole?: 'OFFICER' | 'SUPERVISOR' | 'ADMIN' | null;
}

export const DetectionCard: React.FC<DetectionCardProps> = ({
  event,
  repeatTimeAgo,
  onActionClick,
  onCorrectPlate,
  userRole: _userRole = 'OFFICER',
}) => {
  const isPending = event.status === 'SCANNED';
  const isLowConfidence = event.plate_confidence_mode === 0;

  const handleCorrectPlate = () => {
    const newPlate = prompt('Enter corrected license plate number:', event.anpr_text);
    if (newPlate !== null && newPlate.trim() !== '' && newPlate.trim() !== event.anpr_text) {
      onCorrectPlate(newPlate.trim().toUpperCase());
    }
  };


  return (
    <div className={`glass-panel rounded-xl overflow-hidden shadow-lg transition-all duration-200 border-l-4 ${
      isPending 
        ? isLowConfidence 
          ? 'border-l-status-disputed' 
          : 'border-l-status-scanned' 
        : 'border-l-status-cleared'
    } flex flex-col gap-3 relative animate-slide-up`}>
      
      {/* Repeat warning banner */}
      {repeatTimeAgo !== undefined && repeatTimeAgo < 60 && (
        <div className="bg-status-disputed/25 text-status-disputed border-b border-dark-border px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Possible repeat — last seen {repeatTimeAgo}s ago</span>
        </div>
      )}

      {/* Main card grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Section A: Full Vehicle Image */}
        <div className="md:col-span-4 flex flex-col gap-2">
          <div className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
            <Car className="w-3 h-3" />
            Capture Evidence
          </div>
          <VehicleImage
            imageUrl={event.vehicle_image_url}
            altText={`Vehicle scan for ${event.anpr_text}`}
            className="h-32 md:h-36 w-full rounded-lg"
          />
        </div>

        {/* Section B: Plate Crop and Plate Details */}
        <div className="md:col-span-3 flex flex-col gap-2">
          <div className="text-[10px] uppercase font-bold text-text-muted flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Resolved Plate
          </div>
          <PlateImage
            anprText={event.anpr_text}
            plateImageUrl={event.plate_image_url}
            confidenceMode={event.plate_confidence_mode}
            countryShort={event.country_short}
            stateShort={event.state_short}
            size="sm"
          />
          {isPending && (
            <button
              onClick={handleCorrectPlate}
              className="text-left text-[11px] text-brand-accent hover:text-brand-accent-hover font-semibold mt-1 inline-flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              ✎ Correct Plate Number
            </button>
          )}
          {event.corrected_plate_text && (
            <div className="text-[10px] text-status-disputed mt-1 italic font-semibold">
              Corrected: {event.corrected_plate_text}
            </div>
          )}
        </div>

        {/* Section C: Vehicle & Camera Specs */}
        <div className="md:col-span-5 flex flex-col justify-between gap-3 text-left">
          <div className="flex items-start justify-between gap-2 border-b border-dark-border/40 pb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-100">
                {event.vehicle_colour || 'Unknown Color'} {event.vehicle_make || ''} {event.vehicle_model || ''}
              </h4>
              <span className="text-[10px] text-text-muted font-semibold bg-slate-900 px-2 py-0.5 rounded border border-dark-border mt-1 inline-block">
                Category: {event.vehicle_category || 'N/A'}
              </span>
            </div>
            
            <div className="flex flex-col items-end">
              <StatusBadge status={event.status === 'SCANNED' ? (event.enforcement_status || 'PENDING') : event.status} />
              {event.speed_kmh && (
                <span className="text-xs text-status-fined font-bold mt-1 font-tabular">
                  {event.speed_kmh} km/h
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 text-text-muted">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate" title={event.camera_location}>
                {event.camera_location}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted justify-end">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-tabular">
                {formatTimeShort(event.captured_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted">
              <NavigationIcon className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-200">
                Direction: {event.direction === 'IN' ? 'Approaching (IN)' : event.direction === 'OUT' ? 'Leaving (OUT)' : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-text-muted justify-end">
              <span className="text-[10px] text-text-muted font-mono font-semibold">
                ID: {event.event_id.slice(-6)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section D: Quick Actions (Only for pending scans) */}
      {isPending && (
        <div className="bg-slate-900/40 border-t border-dark-border/40 p-3 flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={() => onActionClick('FINED')}
            disabled={isLowConfidence}
            className={`px-3 py-1.5 bg-status-fined text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isLowConfidence ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={isLowConfidence ? 'Verify preliminary plate before fining' : 'Issue citation fine'}
          >
            Fine
          </button>
          
          <button
            onClick={() => onActionClick('CLAMPED')}
            disabled={isLowConfidence}
            className={`px-3 py-1.5 bg-status-clamped text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isLowConfidence ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            title={isLowConfidence ? 'Verify preliminary plate before clamping' : 'Confirm clamping'}
          >
            Clamp
          </button>
          
          <button
            onClick={() => onActionClick('TOWED')}
            disabled={isLowConfidence}
            className={`px-3 py-1.5 bg-status-towed text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isLowConfidence ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            Tow
          </button>

          <button
            onClick={() => onActionClick('IMPOUNDED')}
            disabled={isLowConfidence}
            className={`px-3 py-1.5 bg-status-impounded text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isLowConfidence ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            Impound
          </button>

          <button
            onClick={() => onActionClick('BOOKED')}
            className="px-3 py-1.5 bg-status-booked text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            Book Parking
          </button>

          <button
            onClick={() => onActionClick('CLEARED')}
            className="px-3 py-1.5 bg-status-cleared text-white hover:opacity-85 rounded-lg text-xs font-semibold transition-all cursor-pointer ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Officer actions readout if already actioned */}
      {!isPending && event.officer_id && (
        <div className="bg-slate-900/30 border-t border-dark-border/40 px-4 py-2.5 text-xs text-text-muted flex justify-between gap-4">
          <span>Actioned by: <strong className="text-slate-300">{event.officer_id}</strong></span>
          {event.notes && (
            <span className="truncate max-w-[70%]" title={event.notes}>
              Remarks: <em className="text-slate-300">"{event.notes}"</em>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
