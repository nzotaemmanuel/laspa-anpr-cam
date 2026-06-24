import React from 'react';

interface LiveIndicatorProps {
  connectionState: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ connectionState }) => {
  const config = {
    CONNECTED: {
      color: 'bg-status-cleared',
      pulse: 'live-pulse-active',
      text: 'Live Connection Active',
      subText: 'Listening for live camera feeds',
      textColor: 'text-status-cleared',
    },
    RECONNECTING: {
      color: 'bg-status-disputed',
      pulse: 'animate-pulse',
      text: 'Reconnecting…',
      subText: 'Attempting to re-establish link',
      textColor: 'text-status-disputed',
    },
    DISCONNECTED: {
      color: 'bg-status-fined',
      pulse: '',
      text: 'WebSocket Link Down',
      subText: 'Failing over to SSE / Auto-polling',
      textColor: 'text-status-fined',
    },
  };

  const current = config[connectionState] || config.DISCONNECTED;

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-dark-border bg-slate-900/60 shadow-inner">
      <div className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${current.color} ${current.pulse}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${current.color}`} />
      </div>
      <div className="flex flex-col text-left">
        <span className={`text-xs font-bold ${current.textColor} leading-none`}>
          {current.text}
        </span>
        <span className="text-[9px] text-text-muted leading-none mt-0.5">
          {current.subText}
        </span>
      </div>
    </div>
  );
};
