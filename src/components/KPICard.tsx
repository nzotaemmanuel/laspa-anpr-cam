import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  description?: string;
  format?: 'integer' | 'decimal' | 'currency';
  currencySymbol?: string;
  icon?: React.ReactNode;
  watermarkIcon?: React.ComponentType<any>;
  accentHex?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  description,
  format = 'integer',
  currencySymbol = '₦',
  icon,
  watermarkIcon: WatermarkIcon,
  accentHex,
}) => {
  const stroke = accentHex || '#6366F1';

  const formattedValue = () => {
    if (typeof value === 'string') return value;
    if (format === 'currency') {
      return `${currencySymbol}${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
    if (format === 'decimal') {
      return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    }
    return value.toLocaleString();
  };

  return (
    <div
      className="glass-panel rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between text-left transition-all duration-300 group"
      style={{ 
        minHeight: 140, 
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)' 
      }}
    >
      {/* Background Watermark Icon */}
      {WatermarkIcon && (
        <div 
          className="absolute right-4 bottom-2 transition-all duration-300 group-hover:scale-110 pointer-events-none z-0"
          style={{ 
            color: stroke, 
            opacity: 0.05 
          }}
        >
          <WatermarkIcon className="w-24 h-24 stroke-[1.2]" />
        </div>
      )}

      {/* Top Row: Label and Badge Icon */}
      <div className="flex items-start justify-between gap-4 z-10">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>

        {icon && (
          <span
            className="flex items-center justify-center w-8 h-8 rounded-xl border transition-all duration-300"
            style={{
              background: `${stroke}15`,
              borderColor: `${stroke}30`,
              color: stroke,
            }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Middle/Bottom: Value and Description */}
      <div className="mt-4 flex flex-col gap-1 z-10">
        <span
          className="text-3xl font-extrabold font-tabular leading-none tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {formattedValue()}
        </span>
        {description && (
          <span
            className="text-[11px] font-semibold mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

export default KPICard;
