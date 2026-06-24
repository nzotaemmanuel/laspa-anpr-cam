import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { DetectionCard } from '../components/DetectionCard';
import { LiveIndicator } from '../components/LiveIndicator';
import { ActionModal } from '../components/ActionModal';
import { Volume2, VolumeX, ArrowUp, RefreshCw } from 'lucide-react';

export const LiveFeed: React.FC = () => {
  const {
    liveEvents,
    feedConnectionState,
    newEventCount,
    soundEnabled,
    setSoundEnabled,
    clearNewEventCount,
    initWebSocket,
    cleanupWebSocket,
    actionVehicle,
    correctPlateText,
    currentUser,
  } = useAppStore();

  const [activeAction, setActiveAction] = useState<'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED' | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isScrolledDown, setIsScrolledDown] = useState(false);

  const feedContainerRef = useRef<HTMLDivElement>(null);
  const topAnchorRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection on mount and cleanup on unmount
  useEffect(() => {
    initWebSocket();
    return () => {
      cleanupWebSocket();
    };
  }, []);

  // Monitor scroll positioning to determine if we should auto-scroll or display the scroll banner
  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If the scroll is greater than 100px from top, flag as scrolled down
      setIsScrolledDown(container.scrollTop > 100);
      
      if (container.scrollTop === 0) {
        clearNewEventCount();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [clearNewEventCount]);

  // Auto-scroll logic when new events arrive
  useEffect(() => {
    if (liveEvents.length > 0 && !isScrolledDown) {
      scrollToTop();
    }
  }, [liveEvents]);

  const scrollToTop = () => {
    topAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
    clearNewEventCount();
    setIsScrolledDown(false);
  };

  const handleActionTrigger = (
    event: any,
    action: 'FINED' | 'CLAMPED' | 'TOWED' | 'IMPOUNDED' | 'BOOKED' | 'CLEARED'
  ) => {
    setSelectedEvent(event);
    setActiveAction(action);
  };

  const handleActionSubmit = async (details: Record<string, any>) => {
    if (!selectedEvent || !activeAction) return;

    const success = await actionVehicle(selectedEvent.event_id, activeAction, details);
    if (success) {
      setActiveAction(null);
      setSelectedEvent(null);
    } else {
      alert('Failed to submit enforcement action. Please check API connectivity.');
    }
  };

  // Compute repeat scanning times
  const getRepeatTimeAgo = (currentIdx: number) => {
    const currentEvent = liveEvents[currentIdx];
    if (!currentEvent.anpr_text) return undefined;

    // Search for previous events with same plate in the remaining of the list
    for (let i = currentIdx + 1; i < liveEvents.length; i++) {
      const prevEvent = liveEvents[i];
      if (prevEvent.anpr_text.toUpperCase() === currentEvent.anpr_text.toUpperCase()) {
        const timeDiff = Math.floor(
          (new Date(currentEvent.captured_at).getTime() - new Date(prevEvent.captured_at).getTime()) / 1000
        );
        return timeDiff;
      }
    }
    return undefined;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-dark-border/40 p-4 bg-slate-900/20 shrink-0">
        <div className="text-left">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            Live Stream Feed
          </h2>
          <p className="text-xs text-text-muted">
            Incoming scans from connected Carmen ANPR cameras
          </p>
        </div>

        {/* Status Indicators Toolbar */}
        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 border border-dark-border rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer ${
              soundEnabled 
                ? 'bg-brand-accent/15 border-brand-accent/30 text-brand-accent hover:bg-brand-accent/25' 
                : 'text-text-muted hover:text-slate-200 bg-slate-900'
            }`}
            title={soundEnabled ? 'Disable alert sound' : 'Enable alert sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>Audible Alert</span>
          </button>

          {/* Reconnect button */}
          <button
            onClick={() => initWebSocket()}
            className="p-2 border border-dark-border text-text-muted hover:text-slate-100 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Force Reconnect Websocket"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Connection badge */}
          <LiveIndicator connectionState={feedConnectionState} />
        </div>
      </div>

      {/* Main split viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Live Feed Stream Scrollbox (8 Columns equivalent) */}
        <div className="flex-1 flex flex-col min-h-0 relative border-r border-dark-border/40">
          
          {/* Scroll-to-top sticky warning */}
          {isScrolledDown && newEventCount > 0 && (
            <button
              onClick={scrollToTop}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-brand-accent hover:bg-brand-accent-hover text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer border border-brand-accent-hover"
            >
              <ArrowUp className="w-4 h-4 animate-bounce" />
              <span>{newEventCount} new vehicle scans — Scroll to top</span>
            </button>
          )}

          {/* Feed scroll container */}
          <div 
            ref={feedContainerRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4"
          >
            {/* Scroll Anchor */}
            <div ref={topAnchorRef} />

            {liveEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-text-muted py-24 gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-900/60 border border-dark-border flex items-center justify-center animate-pulse">
                  <span className="w-3 h-3 rounded-full bg-brand-accent" />
                </div>
                <div className="text-center">
                  <h4 className="text-sm font-semibold text-slate-300">Awaiting Plate Captures</h4>
                  <p className="text-xs text-text-muted mt-1 max-w-[280px]">
                    The WebSocket is active. Once the XCW-MICROCAM-02 reports a scan, it will pop up here instantly.
                  </p>
                </div>
              </div>
            ) : (
              liveEvents.map((evt, idx) => (
                <DetectionCard
                  key={evt.event_id + '-' + idx}
                  event={evt}
                  repeatTimeAgo={getRepeatTimeAgo(idx)}
                  onActionClick={(action) => handleActionTrigger(evt, action)}
                  onCorrectPlate={(text) => correctPlateText(evt.event_id, text)}
                  userRole={currentUser?.role}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Focus Highlight Panel (4 Columns equivalent) */}
        <div className="w-full md:w-[320px] bg-slate-950/20 p-4 overflow-y-auto hidden lg:block text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3.5">
            Console Live Statistics
          </h3>
          
          {/* Small metrics widget list */}
          <div className="flex flex-col gap-3">
            <div className="bg-slate-900/40 border border-dark-border/60 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Session Total Scans</span>
              <span className="text-2xl font-bold font-tabular text-slate-100">{liveEvents.length}</span>
              <span className="text-[9px] text-text-muted mt-0.5">Captures cached in browser tab memory</span>
            </div>
            
            <div className="bg-slate-900/40 border border-dark-border/60 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">High Confidence Read Ratio</span>
              <span className="text-2xl font-bold font-tabular text-status-cleared">
                {liveEvents.length > 0 
                  ? Math.round((liveEvents.filter(e => e.plate_confidence_mode === 1).length / liveEvents.length) * 100)
                  : 0}%
              </span>
              <span className="text-[9px] text-text-muted mt-0.5">Percentage of Carmen Engine mode-1 scans</span>
            </div>

            <div className="bg-slate-900/40 border border-dark-border/60 rounded-xl p-3.5 flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Active Patrol Officer</span>
              <span className="text-sm font-bold text-slate-200">{currentUser?.name || 'Authorized Patrol'}</span>
              <span className="text-[9px] text-brand-accent uppercase font-bold mt-0.5 tracking-wider">Role: {currentUser?.role || 'OFFICER'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enforcement Citation Modal */}
      <ActionModal
        isOpen={activeAction !== null}
        onClose={() => {
          setActiveAction(null);
          setSelectedEvent(null);
        }}
        onSubmit={handleActionSubmit}
        actionType={activeAction}
        event={selectedEvent}
      />
    </div>
  );
};
export default LiveFeed;
