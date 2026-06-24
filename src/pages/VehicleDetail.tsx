import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { DetectionEvent } from '../types';
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, ChevronRight, AlertTriangle
} from 'lucide-react';
import { PlateImage } from '../components/PlateImage';
import { VehicleImage } from '../components/VehicleImage';
import { formatTime, formatDate } from '../utils/time';
import { StatusBadge } from '../components/StatusBadge';
import { ActionModal } from '../components/ActionModal';

export const VehicleDetail: React.FC = () => {
  const { event_id } = useParams<{ event_id: string }>();
  const { currentUser, actionVehicle, correctPlateText, updateVehicleNotes } = useAppStore();

  const [event, setEvent] = useState<DetectionEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [activeAction, setActiveAction] = useState<'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED' | null>(null);
  const [historicalEvents, setHistoricalEvents] = useState<DetectionEvent[]>([]);

  const handleActionTrigger = (action: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED') => {
    setActiveAction(action);
  };

  // Load single event details
  const loadEventDetails = async () => {
    if (!event_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getVehicleById(event_id);
      setEvent(data);
      setNotes(data.notes || '');

      // Load history for this license plate
      if (data.anpr_text) {
        const history = await api.getVehicles({ plate: data.anpr_text, limit: 10 });
        setHistoricalEvents(history.items.filter(item => item.event_id !== event_id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve vehicle audit details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventDetails();
  }, [event_id]);

  const handleNotesBlur = async () => {
    if (!event || notes.trim() === (event.notes || '').trim() || !currentUser) return;
    
    setSavingNotes(true);
    setSaveSuccess(false);
    try {
      const success = await updateVehicleNotes(event.event_id, notes.trim());
      if (success) {
        setEvent(prev => prev ? { ...prev, notes: notes.trim() } : null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Failed to auto-save notes', e);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCorrectPlate = async () => {
    if (!event) return;
    const newPlate = prompt('Enter corrected plate text:', event.anpr_text);
    if (newPlate !== null && newPlate.trim() !== '' && newPlate.trim() !== event.anpr_text) {
      const updatedPlate = newPlate.trim().toUpperCase();
      const success = await correctPlateText(event.event_id, updatedPlate);
      if (success) {
        setEvent(prev => prev ? { ...prev, anpr_text: updatedPlate, corrected_plate_text: updatedPlate } : null);
        // Refresh history with new plate
        const history = await api.getVehicles({ plate: updatedPlate, limit: 10 });
        setHistoricalEvents(history.items.filter(item => item.event_id !== event.event_id));
      }
    }
  };

  const handleActionSubmit = async (details: Record<string, any>) => {
    if (!event || !activeAction) return;

    const success = await actionVehicle(event.event_id, activeAction, details);
    if (success) {
      setActiveAction(null);
      // Reload event data to show updated state
      loadEventDetails();
    } else {
      alert('Failed to process citation action.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <span className="animate-pulse">Loading vehicle audit record...</span>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6 text-left">
        <Link to="/vehicles" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Vehicles Log
        </Link>
        <div className="bg-status-fined/10 border border-status-fined/25 text-status-fined p-4 rounded-xl text-sm font-semibold max-w-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 inline mr-2" />
          {error || 'Vehicle event not found.'}
        </div>
      </div>
    );
  }

  const isPending = event.status === 'SCANNED';
  const isLowConfidence = event.plate_confidence_mode === 0;
  const ocrConfidenceScore = isLowConfidence ? 65 : 95; // Represented percentage mapping

  return (
    <div className="flex flex-col gap-6 p-6 text-left">
      {/* Breadcrumbs / Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Link 
            to="/vehicles" 
            className="p-2 border border-dark-border hover:bg-slate-900 rounded-lg text-text-muted hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span>Vehicles</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Scans Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-300 font-bold">Event Audit</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1 flex items-center gap-2">
              Event #{event.event_id.slice(-8).toUpperCase()}
            </h2>
          </div>
        </div>

        {/* Action Panel Header */}
        <div className="flex items-center gap-2 bg-slate-900/60 border border-dark-border p-2 rounded-xl">
          <span className="text-xs text-text-muted font-semibold px-2">Current Status:</span>
          <StatusBadge status={event.status === 'SCANNED' ? (event.enforcement_status || 'PENDING') : event.status} />
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Evidence & Specs (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Section A: Capture Evidence */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
              Section A: Capture Evidence
            </h3>

            {/* Evidence Image */}
            <div className="relative">
              <VehicleImage 
                imageUrl={event.vehicle_image_url} 
                altText={`Evidence Vehicle Capture ${event.anpr_text}`} 
                className="h-64 sm:h-80 w-full rounded-xl"
              />
            </div>

            {/* Crops and Confidence details */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-4">
                <PlateImage
                  anprText={event.anpr_text}
                  plateImageUrl={event.plate_image_url}
                  confidenceMode={event.plate_confidence_mode}
                  countryShort={event.country_short}
                  stateShort={event.state_short}
                  size="md"
                />
              </div>

              {/* Confidence Meter */}
              <div className="sm:col-span-8 bg-slate-900/40 border border-dark-border p-4 rounded-xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-text-muted">OCR Recognition Confidence:</span>
                  <span className={ocrConfidenceScore >= 90 ? 'text-status-cleared' : 'text-status-disputed'}>
                    {ocrConfidenceScore}%
                  </span>
                </div>
                {/* Visual Bar meter */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-dark-border">
                  <div 
                    className={`h-full rounded-full ${
                      ocrConfidenceScore >= 90 ? 'bg-status-cleared' : 'bg-status-disputed'
                    }`} 
                    style={{ width: `${ocrConfidenceScore}%` }} 
                  />
                </div>
                <div className="text-[10px] text-text-muted font-semibold mt-1">
                  {isLowConfidence 
                    ? 'Carmen Engine triggered Preselection fast-read. Plate verification is required before citation.'
                    : 'Carmen Engine complete ANPR read. High confidence OCR match.'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Vehicle & Camera Details */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-2">
              <h3 className="text-sm font-bold text-slate-200">
                Section B: Vehicle & Camera Parameters
              </h3>
              {isPending && (
                <button
                  onClick={handleCorrectPlate}
                  className="text-xs text-brand-accent hover:text-brand-accent-hover font-semibold cursor-pointer"
                >
                  ✎ Correct License Plate
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">License Plate</span>
                <span className="font-plate text-slate-200 uppercase mt-1 block">{event.anpr_text}</span>
                {event.corrected_plate_text && (
                  <span className="text-[9px] text-status-disputed block mt-0.5">Original: {event.anpr_text}</span>
                )}
              </div>

              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Make & Model</span>
                <span className="font-semibold text-slate-200 mt-1 block">
                  {event.vehicle_make || '-'} {event.vehicle_model || ''}
                </span>
              </div>

              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Vehicle Color</span>
                <span className="font-semibold text-slate-200 mt-1 block">{event.vehicle_colour || '-'}</span>
              </div>

              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Camera / Location</span>
                <span className="font-semibold text-slate-200 mt-1 block">{event.camera_name || event.camera_id}</span>
                <span className="text-[9px] text-text-muted block mt-0.5">{event.camera_location}</span>
              </div>

              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Direction</span>
                <span className="font-semibold text-slate-200 mt-1 block">
                  {event.direction === 'IN' ? 'Approaching (IN)' : event.direction === 'OUT' ? 'Leaving (OUT)' : 'Unknown'}
                </span>
              </div>

              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Timestamp</span>
                <span className="font-semibold text-slate-200 mt-1 block">{formatTime(event.captured_at)}</span>
                <span className="text-[9px] text-text-muted block mt-0.5">{formatDate(event.captured_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Actions & History (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Section D: Citation Action Panel */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
              Section D: Citation Actions
            </h3>

            {isPending ? (
              <div className="flex flex-col gap-3">
                {isLowConfidence && (
                  <div className="bg-status-disputed/15 text-status-disputed border border-status-disputed/35 p-3 rounded-lg text-xs font-semibold flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      OCR confidence is below 85%. You must confirm or edit the plate details before you can issue fines, clamps, or towing dispatches.
                    </span>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleActionTrigger('FINED')}
                    disabled={isLowConfidence}
                    className="py-2.5 bg-status-fined text-white disabled:opacity-40 rounded-lg text-xs font-bold hover:bg-red-600 transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    Issue Fine
                  </button>
                  <button
                    onClick={() => handleActionTrigger('CLAMPED')}
                    disabled={isLowConfidence}
                    className="py-2.5 bg-status-clamped text-white disabled:opacity-40 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    Clamp Vehicle
                  </button>
                  <button
                    onClick={() => handleActionTrigger('TOWED')}
                    disabled={isLowConfidence}
                    className="py-2.5 bg-status-towed text-white disabled:opacity-40 rounded-lg text-xs font-bold hover:bg-purple-650 transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    Dispatch Tow
                  </button>
                  <button
                    onClick={() => handleActionTrigger('IMPOUNDED')}
                    disabled={isLowConfidence}
                    className="py-2.5 bg-status-impounded text-white disabled:opacity-40 rounded-lg text-xs font-bold hover:bg-red-950 transition-colors shadow-md cursor-pointer disabled:cursor-not-allowed"
                  >
                    Impound Vehicle
                  </button>
                </div>
                
                <div className="border-t border-dark-border/40 pt-3 flex gap-3">
                  <button
                    onClick={() => handleActionTrigger('BOOKED')}
                    className="flex-1 py-2 bg-slate-900 border border-dark-border hover:bg-slate-800 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Book Parking
                  </button>
                  <button
                    onClick={() => handleActionTrigger('CLEARED')}
                    className="flex-1 py-2 bg-status-cleared text-white hover:bg-green-600 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Clear Vehicle
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 text-xs bg-slate-900/60 p-4 rounded-xl border border-dark-border text-center py-6">
                <span className="text-text-muted font-semibold uppercase block">This capture event has been processed</span>
                <span className="text-base font-bold text-slate-100 mt-1 block">
                  Status: {event.enforcement_status || event.status}
                </span>
                {event.officer_id && (
                  <span className="text-xs text-text-muted mt-1 block">Actioned by: <strong>{event.officer_id}</strong></span>
                )}
              </div>
            )}
          </div>

          {/* Section E: Officer Remarks (Auto-save on blur) */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-dark-border/40 pb-2">
              <h3 className="text-sm font-bold text-slate-200">
                Section E: Officer Notes
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                {savingNotes ? (
                  <span className="animate-pulse">Saving remarks...</span>
                ) : saveSuccess ? (
                  <span className="text-status-cleared flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Saved</span>
                ) : (
                  <span>Auto-saved on blur</span>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Enter audit logs, case numbers, or notes for supervisors..."
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:border-brand-accent focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Section C: Enforcement History Timeline */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
              Section C: Enforcement History (Plate Detections)
            </h3>

            {historicalEvents.length === 0 ? (
              <div className="text-xs text-text-muted italic py-4">
                No past detections recorded for this license plate.
              </div>
            ) : (
              <div className="flex flex-col gap-4 relative pl-4 border-l border-dark-border/60 text-xs">
                {historicalEvents.map((hEvent, idx) => (
                  <div key={idx} className="relative flex flex-col gap-1.5 text-left">
                    {/* Circle Node */}
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-slate-600" />
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-300">
                        {formatDate(hEvent.captured_at)}
                      </span>
                      <StatusBadge status={hEvent.status === 'SCANNED' ? (hEvent.enforcement_status || 'PENDING') : hEvent.status} />
                    </div>
                    
                    <span className="text-text-muted">
                      Scanned at {hEvent.camera_location} ({formatTime(hEvent.captured_at)})
                    </span>

                    {hEvent.notes && (
                      <span className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded border border-dark-border/20 italic">
                        "{hEvent.notes}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action modal */}
      <ActionModal
        isOpen={activeAction !== null}
        onClose={() => setActiveAction(null)}
        onSubmit={handleActionSubmit}
        actionType={activeAction}
        event={event}
      />
    </div>
  );
};
export default VehicleDetail;
