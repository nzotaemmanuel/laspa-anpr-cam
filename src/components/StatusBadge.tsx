import React from 'react';
import { 
  Eye, 
  FileText, 
  AlertTriangle, 
  Lock, 
  Truck, 
  Warehouse, 
  BookOpen, 
  CheckCircle,
  Clock
} from 'lucide-react';

interface StatusBadgeProps {
  status?: string | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = status?.toUpperCase();

  const config: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    SCANNED: {
      label: 'Scanned',
      bg: 'bg-status-scanned/15',
      text: 'text-status-scanned',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
    PENDING: {
      label: 'Pending',
      bg: 'bg-yellow-500/15',
      text: 'text-yellow-500',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    FINED: {
      label: 'Fined',
      bg: 'bg-status-fined/15',
      text: 'text-status-fined',
      icon: <FileText className="w-3.5 h-3.5" />,
    },
    DISPUTED: {
      label: 'Disputed',
      bg: 'bg-status-disputed/15',
      text: 'text-status-disputed',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
    CLAMPED: {
      label: 'Clamped',
      bg: 'bg-status-clamped/15',
      text: 'text-status-clamped',
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    TOWED: {
      label: 'Towed',
      bg: 'bg-status-towed/15',
      text: 'text-status-towed',
      icon: <Truck className="w-3.5 h-3.5" />,
    },
    IMPOUNDED: {
      label: 'Impounded',
      bg: 'bg-status-impounded/15',
      text: 'text-status-impounded',
      icon: <Warehouse className="w-3.5 h-3.5" />,
    },
    BOOKED: {
      label: 'Booked',
      bg: 'bg-status-booked/15',
      text: 'text-status-booked',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
    CLEARED: {
      label: 'Cleared',
      bg: 'bg-status-cleared/15',
      text: 'text-status-cleared',
      icon: <CheckCircle className="w-3.5 h-3.5" />,
    },
  };

  const current = (normalizedStatus && config[normalizedStatus]) || {
    label: status,
    bg: 'bg-zinc-800',
    text: 'text-zinc-400',
    icon: <Eye className="w-3.5 h-3.5" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${current.bg} ${current.text}`}>
      {current.icon}
      {current.label}
    </span>
  );
};
