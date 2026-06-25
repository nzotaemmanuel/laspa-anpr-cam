import React from 'react';
import { 
  Eye, FileText, AlertTriangle, Lock, Truck, Warehouse, BookOpen, CheckCircle, Clock
} from 'lucide-react';

interface StatusBadgeProps {
  status?: string | null;
}

const config: Record<string, {
  label: string;
  style: React.CSSProperties;
  icon: React.ReactNode;
}> = {
  SCANNED: {
    label: 'Scanned',
    style: { background: 'rgba(96,165,250,0.12)', color: '#93C5FD', border: '1px solid rgba(96,165,250,0.25)', boxShadow: '0 0 10px rgba(96,165,250,0.15)' },
    icon: <Eye className="w-3 h-3" />,
  },
  PENDING: {
    label: 'Pending',
    style: { background: 'rgba(251,191,36,0.12)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 0 10px rgba(251,191,36,0.15)' },
    icon: <Clock className="w-3 h-3" />,
  },
  FINED: {
    label: 'Fined',
    style: { background: 'rgba(248,113,113,0.12)', color: '#FCA5A5', border: '1px solid rgba(248,113,113,0.25)', boxShadow: '0 0 10px rgba(248,113,113,0.15)' },
    icon: <FileText className="w-3 h-3" />,
  },
  DISPUTED: {
    label: 'Disputed',
    style: { background: 'rgba(251,191,36,0.12)', color: '#FCD34D', border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 0 10px rgba(251,191,36,0.15)' },
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  CLAMPED: {
    label: 'Clamped',
    style: { background: 'rgba(251,146,60,0.12)', color: '#FDBA74', border: '1px solid rgba(251,146,60,0.25)', boxShadow: '0 0 10px rgba(251,146,60,0.15)' },
    icon: <Lock className="w-3 h-3" />,
  },
  TOWED: {
    label: 'Towed',
    style: { background: 'rgba(192,132,252,0.12)', color: '#D8B4FE', border: '1px solid rgba(192,132,252,0.25)', boxShadow: '0 0 10px rgba(192,132,252,0.15)' },
    icon: <Truck className="w-3 h-3" />,
  },
  IMPOUNDED: {
    label: 'Impounded',
    style: { background: 'rgba(244,63,94,0.12)', color: '#FDA4AF', border: '1px solid rgba(244,63,94,0.25)', boxShadow: '0 0 10px rgba(244,63,94,0.15)' },
    icon: <Warehouse className="w-3 h-3" />,
  },
  BOOKED: {
    label: 'Booked',
    style: { background: 'rgba(52,211,153,0.12)', color: '#6EE7B7', border: '1px solid rgba(52,211,153,0.25)', boxShadow: '0 0 10px rgba(52,211,153,0.15)' },
    icon: <BookOpen className="w-3 h-3" />,
  },
  CLEARED: {
    label: 'Cleared',
    style: { background: 'rgba(74,222,128,0.12)', color: '#86EFAC', border: '1px solid rgba(74,222,128,0.25)', boxShadow: '0 0 10px rgba(74,222,128,0.15)' },
    icon: <CheckCircle className="w-3 h-3" />,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = status?.toUpperCase();
  const current = (normalizedStatus && config[normalizedStatus]) || {
    label: status || 'Unknown',
    style: { background: 'rgba(100,116,139,0.12)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.2)' },
    icon: <Eye className="w-3 h-3" />,
  };

  return (
    <span
      style={current.style}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
    >
      {current.icon}
      {current.label}
    </span>
  );
};
