import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { api } from '../services/api';
import type { Fine, DetectionEvent } from '../types';
import { 
  ArrowLeft, ShieldAlert, CheckCircle2, ChevronRight, 
  FileText, AlertCircle, AlertTriangle, MapPin, Clock, Navigation as NavigationIcon
} from 'lucide-react';

export const FineDetail: React.FC = () => {
  const { fine_id } = useParams<{ fine_id: string }>();
  const { currentUser, updateFineState } = useAppStore();

  const [fine, setFine] = useState<Fine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [associatedEvent, setAssociatedEvent] = useState<DetectionEvent | null>(null);


  const loadFineDetails = async () => {
    if (!fine_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFineById(fine_id);
      setFine(data);

      // Load associated capture event
      try {
        const eventData = await api.getVehicleById(data.event_id);
        setAssociatedEvent(eventData);
      } catch (evtErr) {
        console.error('Failed to load associated scan event details', evtErr);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve citation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFineDetails();
  }, [fine_id]);

  const handleDisputeResolution = async (resolution: 'UPHELD' | 'WAIVED') => {
    if (!fine) return;
    
    setProcessingAction(true);
    try {
      const newStatus = resolution === 'UPHELD' ? 'ISSUED' : 'WAIVED'; // Upheld stays unpaid, waived marks released
      const success = await updateFineState(
        fine.fine_id,
        newStatus,
        fine.dispute_reason || undefined,
        resolution === 'UPHELD' ? 'RESOLVED_UPHELD' : 'RESOLVED_WAIVED'
      );
      if (success) {
        // Refresh details
        loadFineDetails();
      } else {
        alert('Failed to resolve dispute. Check backend logs.');
      }
    } catch (err) {
      console.error('Dispute resolution error', err);
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <span className="animate-pulse">Loading citation detail log...</span>
      </div>
    );
  }

  if (error || !fine) {
    return (
      <div className="p-6 text-left">
        <Link to="/fines" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Citations list
        </Link>
        <div className="bg-status-fined/10 border border-status-fined/25 text-status-fined p-4 rounded-xl text-sm font-semibold max-w-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 inline mr-2" />
          {error || 'Fine citation not found.'}
        </div>
      </div>
    );
  }

  const isDisputed = fine.status === 'DISPUTED';
  const isAuthorized = currentUser?.role === 'SUPERVISOR' || currentUser?.role === 'ADMIN';

  return (
    <div className="flex flex-col gap-6 p-6 text-left">
      {/* Header breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Link 
            to="/fines" 
            className="p-2 border border-dark-border hover:bg-slate-900 rounded-lg text-text-muted hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span>Fines</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span>Citations</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-300 font-bold">Citation Details</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">
              Citation Reference #{fine.fine_id.toUpperCase()}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/60 border border-dark-border p-2 rounded-xl">
          <span className="text-xs text-text-muted font-semibold px-2">Payment Status:</span>
          <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
            fine.status === 'PAID' ? 'bg-status-cleared/15 text-status-cleared' :
            fine.status === 'ISSUED' ? 'bg-status-scanned/15 text-status-scanned' :
            fine.status === 'DISPUTED' ? 'bg-status-disputed/15 text-status-disputed' :
            'bg-zinc-800 text-zinc-400'
          }`}>
            {fine.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Fine Metadata & Event Details (7 Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-brand-accent" />
              Infraction Metadata
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">License Plate</span>
                <span className="font-plate text-slate-200 mt-1 block">{fine.plate_number}</span>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Fine Amount</span>
                <span className="font-tabular font-bold text-status-fined text-sm mt-1 block">
                  ₦{fine.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Offence Classification</span>
                <span className="font-semibold text-slate-300 mt-1 block">{fine.offence_code}</span>
                <span className="text-[10px] text-text-muted block mt-0.5">{fine.offence_description || 'No description logged'}</span>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Issuing Officer</span>
                <span className="font-semibold text-slate-300 mt-1 block">{fine.officer_id}</span>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Date Issued</span>
                <span className="font-tabular text-slate-300 mt-1 block">{new Date(fine.issued_date).toLocaleDateString()}</span>
              </div>
              <div className="bg-slate-900/30 p-3 rounded-lg border border-dark-border/40">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] block">Payment Deadline</span>
                <span className="font-tabular text-slate-300 mt-1 block">{new Date(fine.due_date).toLocaleDateString()}</span>
              </div>
            </div>

            {fine.notes && (
              <div className="bg-slate-900/20 border border-dark-border p-3.5 rounded-lg">
                <span className="text-[9px] text-text-muted uppercase font-bold tracking-wider block">Officer Case Remarks</span>
                <p className="text-xs text-slate-300 italic mt-1.5">"{fine.notes}"</p>
              </div>
            )}
          </div>

          {/* Associated Capture Details */}
          {associatedEvent && (
            <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
                Camera Capture Evidence
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-48 h-32 rounded-lg border border-dark-border bg-black/40 overflow-hidden shrink-0">
                  <img 
                    src={associatedEvent.vehicle_image_url} 
                    alt="Scan Evidence" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-xs text-slate-300 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>Location: <strong>{associatedEvent.camera_location}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Timestamp: <strong>{new Date(associatedEvent.captured_at).toLocaleString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted">
                    <NavigationIcon className="w-4 h-4 shrink-0" />
                    <span>Direction: <strong>{associatedEvent.direction}</strong></span>
                  </div>
                  <div className="mt-2">
                    <Link
                      to={`/vehicles/${associatedEvent.event_id}`}
                      className="text-brand-accent hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      View Original Full Event Audit Log →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Dispute Resolution & Timeline (5 Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Dispute Resolution Section */}
          {isDisputed && (
            <div className="glass-panel rounded-xl p-5 border border-status-disputed/40 bg-status-disputed/5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-200 border-b border-status-disputed/20 pb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-status-disputed" />
                Disputed Infraction Claim
              </h3>
              
              <div className="text-xs flex flex-col gap-1">
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px]">Date Filed</span>
                <span className="text-slate-200 font-tabular font-semibold">
                  {fine.dispute_date ? new Date(fine.dispute_date).toLocaleDateString() : 'N/A'}
                </span>
                <span className="text-text-muted uppercase font-bold tracking-wider text-[9px] mt-2">Dispute Cause</span>
                <p className="text-slate-200 italic bg-slate-900/60 p-3 rounded-lg border border-dark-border/40 mt-1">
                  "{fine.dispute_reason || 'No written cause provided'}"
                </p>
              </div>

              {/* Resolution Controls */}
              <div className="border-t border-dark-border/40 pt-4 mt-1 flex flex-col gap-2.5">
                {!isAuthorized ? (
                  <div className="flex items-start gap-2 bg-slate-900/40 border border-dark-border p-3 rounded-lg text-[10px] text-text-muted">
                    <ShieldAlert className="w-4 h-4 text-status-disputed shrink-0" />
                    <span>
                      Dispute resolution controls are gated. Only authorized Supervisors or Admins can Waive/Uphold citations.
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-slate-300">Supervisor Decision:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDisputeResolution('UPHELD')}
                        disabled={processingAction}
                        className="flex-1 py-2 bg-status-fined text-white hover:bg-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        Uphold Citation
                      </button>
                      <button
                        onClick={() => handleDisputeResolution('WAIVED')}
                        disabled={processingAction}
                        className="flex-1 py-2 bg-status-cleared text-white hover:bg-green-600 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                      >
                        Waive / Cancel Fine
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Waived banner */}
          {fine.status === 'WAIVED' && (
            <div className="glass-panel rounded-xl p-5 border border-dark-border bg-slate-900/20 text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-status-cleared mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-200">Citation Waived</h4>
              <p className="text-xs text-text-muted mt-1 max-w-[240px] mx-auto">
                This fine has been cancelled and is removed from enforcement collection pools.
              </p>
            </div>
          )}

          {/* Payment Timeline */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-dark-border/40 pb-2">
              Payment Status Timeline
            </h3>

            <div className="flex flex-col gap-5 relative pl-4 border-l border-dark-border/60 text-xs">
              {/* Event 1 */}
              <div className="relative flex flex-col gap-1 text-left">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-status-cleared" />
                <span className="font-bold text-slate-200">ANPR Detection Scanned</span>
                <span className="text-[10px] text-text-muted">
                  {associatedEvent ? new Date(associatedEvent.captured_at).toLocaleString() : 'Date unavailable'}
                </span>
              </div>
              {/* Event 2 */}
              <div className="relative flex flex-col gap-1 text-left">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-status-cleared" />
                <span className="font-bold text-slate-200">Fine Citation Issued</span>
                <span className="text-[10px] text-text-muted">
                  {new Date(fine.issued_date).toLocaleString()}
                </span>
              </div>
              {/* Conditional Event 3 */}
              {fine.dispute_date && (
                <div className="relative flex flex-col gap-1 text-left">
                  <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                    fine.status === 'WAIVED' || fine.dispute_status?.includes('RESOLVED') ? 'bg-status-cleared' : 'bg-status-disputed'
                  }`} />
                  <span className="font-bold text-slate-200">Dispute Claim Filed</span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(fine.dispute_date).toLocaleString()}
                  </span>
                </div>
              )}
              {/* Status resolved */}
              {fine.status === 'WAIVED' && (
                <div className="relative flex flex-col gap-1 text-left">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-status-cleared" />
                  <span className="font-bold text-status-cleared">Citation Waived (Supervisor Decision)</span>
                  <span className="text-[10px] text-text-muted">
                    Dispute resolved, liability dismissed.
                  </span>
                </div>
              )}
              {fine.status === 'PAID' && (
                <div className="relative flex flex-col gap-1 text-left">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-status-cleared" />
                  <span className="font-bold text-status-cleared">Payment Completed</span>
                  <span className="text-[10px] text-text-muted">
                    Naira ₦{fine.amount} cleared.
                  </span>
                </div>
              )}
              {fine.status === 'ISSUED' && !fine.dispute_date && (
                <div className="relative flex flex-col gap-1 text-left">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-status-scanned" />
                  <span className="font-bold text-slate-300">Awaiting Settlement</span>
                  <span className="text-[10px] text-text-muted">
                    Citation remains outstanding and unpaid.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default FineDetail;
