import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change, e.g. +12.5 or -5.2
  trendData?: number[]; // array of numbers representing recent history
  accentColor?: string; // Tailwind border/text tint class
  format?: 'integer' | 'decimal' | 'currency';
  currencySymbol?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  delta,
  trendData = [30, 45, 35, 50, 40, 60, 55, 70], // default sparkline data
  accentColor = 'text-brand-accent',
  format = 'integer',
  currencySymbol = '₦',
}) => {
  const isPositiveDelta = delta ? delta >= 0 : true;

  // Format value
  const formattedValue = () => {
    if (typeof value === 'string') return value;
    if (format === 'currency') {
      return `${currencySymbol}${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    if (format === 'decimal') {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    }
    return value.toLocaleString();
  };

  // Prepare recharts format
  const chartData = trendData.map((val, idx) => ({ id: idx, val }));

  // Map colors
  const getGradientColor = () => {
    if (accentColor.includes('fined') || accentColor.includes('impounded')) return '#EF4444';
    if (accentColor.includes('cleared')) return '#22C55E';
    if (accentColor.includes('clamped') || accentColor.includes('disputed')) return '#F97316';
    if (accentColor.includes('booked')) return '#0EA5E9';
    return '#3B82F6'; // Default brand accent
  };

  const strokeColor = getGradientColor();

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col justify-between min-h-[140px] text-left">
      {/* Label and Delta */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider line-clamp-1">
          {label}
        </span>
        
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPositiveDelta 
              ? 'bg-status-cleared/15 text-status-cleared' 
              : 'bg-status-fined/15 text-status-fined'
          }`}>
            {isPositiveDelta ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isPositiveDelta ? '+' : ''}{delta}%
          </span>
        )}
      </div>

      {/* Main Value and Sparkline */}
      <div className="flex items-end justify-between mt-3 gap-4">
        <div className={`text-2xl lg:text-3xl font-bold font-tabular leading-none text-slate-100 ${accentColor}`}>
          {formattedValue()}
        </div>

        {/* Sparkline chart */}
        <div className="w-24 h-10 overflow-hidden shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <defs>
                <linearGradient id={`gradient-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="val"
                stroke={strokeColor}
                strokeWidth={1.5}
                fill={`url(#gradient-${label.replace(/\s+/g, '')})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
