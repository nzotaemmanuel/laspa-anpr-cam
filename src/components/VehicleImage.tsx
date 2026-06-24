import React, { useState } from 'react';
import { Camera, X, Maximize2 } from 'lucide-react';
import { formatImageSrc } from './PlateImage';

interface VehicleImageProps {
  imageUrl: string | null | undefined;
  altText: string;
  className?: string;
}

export const VehicleImage: React.FC<VehicleImageProps> = ({
  imageUrl,
  altText,
  className = 'h-48 w-full',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleImageError = () => {
    setHasError(true);
  };

  if (!imageUrl || hasError) {
    return (
      <div className={`rounded bg-zinc-800/40 border border-dark-border flex flex-col items-center justify-center text-text-muted gap-2 p-4 ${className}`}>
        <Camera className="w-8 h-8 stroke-1" />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <>
      <div 
        className={`group relative rounded overflow-hidden border border-dark-border bg-black/20 cursor-pointer ${className}`}
        onClick={() => setIsOpen(true)}
      >
        <img
          src={formatImageSrc(imageUrl)}
          alt={altText}
          onError={handleImageError}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Hover overlay with zoom icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="bg-slate-900/80 p-2 rounded-full border border-slate-700 text-slate-100 flex items-center gap-1.5 text-xs font-medium">
            <Maximize2 className="w-4 h-4" />
            Expand Image
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 z-[110] bg-zinc-900/80 hover:bg-zinc-850 p-2.5 rounded-full border border-slate-800 text-slate-100 hover:text-white transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-label="Close image details"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Lightbox Image */}
          <div 
            className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={formatImageSrc(imageUrl)}
              alt={`${altText} Full Resolution`}
              className="object-contain max-w-full max-h-full rounded-lg shadow-2xl border border-dark-border"
            />
          </div>
          
          {/* Title bar at bottom */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/85 border border-slate-800 rounded-full text-sm text-slate-200">
            {altText}
          </div>
        </div>
      )}
    </>
  );
};
