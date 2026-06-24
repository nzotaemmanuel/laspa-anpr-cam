import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PlateImageProps {
  anprText: string | null | undefined;
  plateImageUrl: string | null | undefined;
  confidenceMode: number; // 0 = preliminary, 1 = full ANPR
  countryShort?: string | null;
  stateShort?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const formatImageSrc = (src: string | null | undefined): string => {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/') || src.startsWith('data:')) {
    return src;
  }
  return `data:image/jpeg;base64,${src}`;
};

export const PlateImage: React.FC<PlateImageProps> = ({
  anprText,
  plateImageUrl,
  confidenceMode,
  countryShort,
  stateShort,
  size = 'md',
}) => {
  const isHighConfidence = confidenceMode === 1;
  const plateText = anprText ? anprText.toUpperCase() : 'NO PLATE';

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Cropped Plate Image */}
      {plateImageUrl ? (
        <div className="relative rounded overflow-hidden border border-dark-border bg-black/40 flex items-center justify-center">
          <img
            src={formatImageSrc(plateImageUrl)}
            alt={`License Plate cropped image for ${plateText}`}
            className={`object-contain w-full ${
              size === 'sm' ? 'h-10' : size === 'md' ? 'h-14' : 'h-20'
            }`}
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40" viewBox="0 0 100 40"><rect width="100" height="40" fill="%231E1E24"/><text x="50" y="24" font-family="sans-serif" font-size="10" fill="%236B7280" text-anchor="middle">Image Error</text></svg>';
            }}
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-dark-border h-14 bg-black/20 flex items-center justify-center text-xs text-text-muted">
          No crop available
        </div>
      )}

      {/* Styled Physical Plate Badge */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded flex items-center gap-2 font-plate tracking-wider shadow-inner w-full justify-center">
            {countryShort && (
              <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded font-sans font-bold">
                {countryShort.toUpperCase()}
              </span>
            )}
            <span className={`font-mono text-slate-100 ${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-xl'
            }`}>
              {plateText}
            </span>
            {stateShort && (
              <span className="text-[10px] text-slate-400 font-sans">
                {stateShort.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {isHighConfidence ? (
            <span className="flex items-center gap-1 text-[10px] text-status-cleared font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified Read (Mode 1)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-status-disputed font-semibold bg-status-disputed/10 px-2 py-0.5 rounded border border-status-disputed/20 w-full justify-center">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              Preliminary Read — Verify Plate
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
